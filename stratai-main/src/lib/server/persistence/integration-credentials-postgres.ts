/**
 * Integration Credentials Repository
 *
 * Manages encrypted OAuth tokens and API keys for integrations.
 * All values are encrypted with AES-256-GCM before storage.
 *
 * See: docs/features/INTEGRATIONS_ARCHITECTURE.md
 */

import { sql } from './db';
import { encrypt, decrypt } from '$lib/server/integrations/encryption';
import type {
	IntegrationCredential,
	DecryptedCredential,
	CredentialType,
	CreateCredentialInput
} from '$lib/types/integrations';

// ============================================================================
// Row Types (match postgres.js camelCase transformation)
// ============================================================================

interface CredentialRow {
	id: string;
	integrationId: string;
	credentialType: CredentialType;
	encryptedValue: string;
	encryptionIv: string;
	encryptionTag: string;
	expiresAt: Date | null;
	scope: string | null;
	createdAt: Date;
	updatedAt: Date;
}

// ============================================================================
// Row Conversion
// ============================================================================

/**
 * Convert database row to IntegrationCredential entity
 * Note: Does NOT decrypt the value - use decryptCredential for that
 */
function rowToCredential(row: CredentialRow): IntegrationCredential {
	return {
		id: row.id,
		integrationId: row.integrationId,
		credentialType: row.credentialType,
		encryptedValue: row.encryptedValue,
		encryptionIv: row.encryptionIv,
		encryptionTag: row.encryptionTag,
		expiresAt: row.expiresAt,
		scope: row.scope,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

/**
 * Decrypt a credential entity to get the actual value
 */
function decryptCredentialValue(credential: IntegrationCredential): DecryptedCredential {
	const value = decrypt(
		credential.encryptedValue,
		credential.encryptionIv,
		credential.encryptionTag
	);

	return {
		type: credential.credentialType,
		value,
		expiresAt: credential.expiresAt,
		scope: credential.scope
	};
}

// ============================================================================
// Repository
// ============================================================================

export const postgresIntegrationCredentialsRepository = {
	/**
	 * Find credential by ID
	 */
	async findById(id: string): Promise<IntegrationCredential | null> {
		const rows = await sql<CredentialRow[]>`
			SELECT * FROM integration_credentials
			WHERE id = ${id}
		`;
		return rows.length > 0 ? rowToCredential(rows[0]) : null;
	},

	/**
	 * Find all credentials for an integration
	 */
	async findByIntegration(integrationId: string): Promise<IntegrationCredential[]> {
		const rows = await sql<CredentialRow[]>`
			SELECT * FROM integration_credentials
			WHERE integration_id = ${integrationId}
			ORDER BY credential_type
		`;
		return rows.map(rowToCredential);
	},

	/**
	 * Find credential by integration and type
	 */
	async findByIntegrationAndType(
		integrationId: string,
		credentialType: CredentialType
	): Promise<IntegrationCredential | null> {
		const rows = await sql<CredentialRow[]>`
			SELECT * FROM integration_credentials
			WHERE integration_id = ${integrationId}
			AND credential_type = ${credentialType}
		`;
		return rows.length > 0 ? rowToCredential(rows[0]) : null;
	},

	/**
	 * Get decrypted credentials for an integration
	 * Use this when you need to make API calls
	 */
	async getDecryptedCredentials(integrationId: string): Promise<DecryptedCredential[]> {
		const credentials = await this.findByIntegration(integrationId);
		return credentials.map(decryptCredentialValue);
	},

	/**
	 * Get a specific decrypted credential
	 */
	async getDecryptedCredential(
		integrationId: string,
		credentialType: CredentialType
	): Promise<DecryptedCredential | null> {
		const credential = await this.findByIntegrationAndType(integrationId, credentialType);
		return credential ? decryptCredentialValue(credential) : null;
	},

	/**
	 * Create a new credential (encrypts the value)
	 */
	async create(input: CreateCredentialInput): Promise<IntegrationCredential> {
		// Encrypt the credential value
		const encrypted = encrypt(input.value);

		const rows = await sql<CredentialRow[]>`
			INSERT INTO integration_credentials (
				integration_id, credential_type,
				encrypted_value, encryption_iv, encryption_tag,
				expires_at, scope
			) VALUES (
				${input.integrationId},
				${input.credentialType},
				${encrypted.encryptedValue},
				${encrypted.iv},
				${encrypted.tag},
				${input.expiresAt || null},
				${input.scope || null}
			)
			RETURNING *
		`;

		return rowToCredential(rows[0]);
	},

	/**
	 * Update a credential value (re-encrypts)
	 */
	async updateValue(
		id: string,
		value: string,
		expiresAt?: Date | null,
		scope?: string | null
	): Promise<boolean> {
		// Encrypt the new value
		const encrypted = encrypt(value);

		const result = await sql`
			UPDATE integration_credentials
			SET
				encrypted_value = ${encrypted.encryptedValue},
				encryption_iv = ${encrypted.iv},
				encryption_tag = ${encrypted.tag},
				expires_at = COALESCE(${expiresAt ?? null}, expires_at),
				scope = COALESCE(${scope ?? null}, scope),
				updated_at = NOW()
			WHERE id = ${id}
		`;

		return result.count > 0;
	},

	/**
	 * Upsert a credential (create or update)
	 */
	async upsert(input: CreateCredentialInput): Promise<IntegrationCredential> {
		// Check if credential exists
		const existing = await this.findByIntegrationAndType(
			input.integrationId,
			input.credentialType
		);

		if (existing) {
			// Update existing
			await this.updateValue(
				existing.id,
				input.value,
				input.expiresAt,
				input.scope
			);
			// Re-fetch to get updated values
			const updated = await this.findById(existing.id);
			return updated!;
		} else {
			// Create new
			return this.create(input);
		}
	},

	/**
	 * Delete a credential
	 */
	async delete(id: string): Promise<boolean> {
		const result = await sql`
			DELETE FROM integration_credentials
			WHERE id = ${id}
		`;
		return result.count > 0;
	},

	/**
	 * Delete all credentials for an integration
	 */
	async deleteByIntegration(integrationId: string): Promise<number> {
		const result = await sql`
			DELETE FROM integration_credentials
			WHERE integration_id = ${integrationId}
		`;
		return result.count;
	},

	/**
	 * Find credentials expiring soon (for refresh job)
	 */
	async findExpiringSoon(withinMinutes: number = 30): Promise<IntegrationCredential[]> {
		const rows = await sql<CredentialRow[]>`
			SELECT * FROM integration_credentials
			WHERE credential_type = 'access_token'
			AND expires_at IS NOT NULL
			AND expires_at < NOW() + INTERVAL '${sql.unsafe(String(withinMinutes))} minutes'
			AND expires_at > NOW()
			ORDER BY expires_at
		`;
		return rows.map(rowToCredential);
	},

	/**
	 * Check if access token is valid (not expired)
	 */
	async hasValidAccessToken(integrationId: string): Promise<boolean> {
		const rows = await sql<{ count: string }[]>`
			SELECT COUNT(*) as count
			FROM integration_credentials
			WHERE integration_id = ${integrationId}
			AND credential_type = 'access_token'
			AND (expires_at IS NULL OR expires_at > NOW())
		`;
		return parseInt(rows[0].count, 10) > 0;
	},

	/**
	 * Get token expiration time for an integration
	 */
	async getAccessTokenExpiration(integrationId: string): Promise<Date | null> {
		const rows = await sql<{ expiresAt: Date | null }[]>`
			SELECT expires_at
			FROM integration_credentials
			WHERE integration_id = ${integrationId}
			AND credential_type = 'access_token'
		`;
		return rows.length > 0 ? rows[0].expiresAt : null;
	}
};
