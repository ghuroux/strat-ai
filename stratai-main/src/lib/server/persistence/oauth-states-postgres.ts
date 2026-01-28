/**
 * OAuth States Repository
 *
 * Manages OAuth state tokens for CSRF protection during OAuth flows.
 * States are short-lived and automatically expire.
 *
 * See: docs/features/INTEGRATIONS_ARCHITECTURE.md
 */

import { sql, type JSONValue } from './db';
import type {
	OAuthState,
	ServiceType,
	OAuthStateContext,
	CreateOAuthStateInput
} from '$lib/types/integrations';
import { randomBytes } from 'crypto';

// ============================================================================
// Row Types (match postgres.js camelCase transformation)
// ============================================================================

interface OAuthStateRow {
	id: string;
	state: string;
	userId: string;
	serviceType: ServiceType;
	redirectUri: string | null;
	context: OAuthStateContext | string;
	expiresAt: Date;
	createdAt: Date;
}

// ============================================================================
// Row Conversion
// ============================================================================

/**
 * Convert database row to OAuthState entity
 */
function rowToOAuthState(row: OAuthStateRow): OAuthState {
	return {
		id: row.id,
		state: row.state,
		userId: row.userId,
		serviceType: row.serviceType,
		redirectUri: row.redirectUri,
		context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context || {},
		expiresAt: row.expiresAt,
		createdAt: row.createdAt
	};
}

// ============================================================================
// Repository
// ============================================================================

export const postgresOAuthStatesRepository = {
	/**
	 * Generate a cryptographically secure state token
	 */
	generateState(): string {
		return randomBytes(32).toString('hex');
	},

	/**
	 * Create a new OAuth state for CSRF protection
	 */
	async create(input: CreateOAuthStateInput): Promise<OAuthState> {
		const state = this.generateState();
		const expiresInMinutes = input.expiresInMinutes ?? 10;
		const context = input.context ?? {};

		const rows = await sql<OAuthStateRow[]>`
			INSERT INTO oauth_states (
				state, user_id, service_type, redirect_uri, context, expires_at
			) VALUES (
				${state},
				${input.userId},
				${input.serviceType},
				${input.redirectUri || null},
				${sql.json(context as JSONValue)},
				NOW() + INTERVAL '${sql.unsafe(String(expiresInMinutes))} minutes'
			)
			RETURNING *
		`;

		return rowToOAuthState(rows[0]);
	},

	/**
	 * Find OAuth state by state token
	 * Returns null if not found or expired
	 */
	async findByState(state: string): Promise<OAuthState | null> {
		const rows = await sql<OAuthStateRow[]>`
			SELECT * FROM oauth_states
			WHERE state = ${state}
			AND expires_at > NOW()
		`;

		return rows.length > 0 ? rowToOAuthState(rows[0]) : null;
	},

	/**
	 * Consume (find and delete) an OAuth state
	 * This should be called in the OAuth callback
	 */
	async consume(state: string): Promise<OAuthState | null> {
		// Find the state first
		const oauthState = await this.findByState(state);
		if (!oauthState) return null;

		// Delete it (consumed)
		await sql`
			DELETE FROM oauth_states
			WHERE state = ${state}
		`;

		return oauthState;
	},

	/**
	 * Delete OAuth state by ID
	 */
	async delete(id: string): Promise<boolean> {
		const result = await sql`
			DELETE FROM oauth_states
			WHERE id = ${id}
		`;
		return result.count > 0;
	},

	/**
	 * Clean up expired OAuth states
	 * Should be called periodically (e.g., via cron job)
	 */
	async cleanupExpired(): Promise<number> {
		const result = await sql`
			DELETE FROM oauth_states
			WHERE expires_at < NOW()
		`;
		return result.count;
	},

	/**
	 * Delete all states for a user (e.g., when user is deleted)
	 */
	async deleteByUser(userId: string): Promise<number> {
		const result = await sql`
			DELETE FROM oauth_states
			WHERE user_id = ${userId}
		`;
		return result.count;
	}
};
