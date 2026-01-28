/**
 * Integrations Repository
 *
 * CRUD operations for integration records (OAuth connections to external services).
 * See: docs/features/INTEGRATIONS_ARCHITECTURE.md
 */

import { sql, type JSONValue } from './db';
import type {
	Integration,
	IntegrationStatus,
	ServiceType,
	IntegrationConfig,
	CreateIntegrationInput,
	UpdateIntegrationInput
} from '$lib/types/integrations';

// ============================================================================
// Row Types (match postgres.js camelCase transformation)
// ============================================================================

interface IntegrationRow {
	id: string;
	userId: string | null;
	spaceId: string | null;
	orgId: string | null;
	serviceType: ServiceType;
	status: IntegrationStatus;
	config: IntegrationConfig | string;
	lastError: string | null;
	lastErrorAt: Date | null;
	connectedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

// ============================================================================
// Row Conversion
// ============================================================================

/**
 * Convert database row to Integration entity
 */
function rowToIntegration(row: IntegrationRow): Integration {
	return {
		id: row.id,
		userId: row.userId,
		spaceId: row.spaceId,
		orgId: row.orgId,
		serviceType: row.serviceType,
		status: row.status,
		config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config || {},
		lastError: row.lastError,
		lastErrorAt: row.lastErrorAt,
		connectedAt: row.connectedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

// ============================================================================
// Repository
// ============================================================================

export const postgresIntegrationsRepository = {
	/**
	 * Find integration by ID
	 */
	async findById(id: string): Promise<Integration | null> {
		const rows = await sql<IntegrationRow[]>`
			SELECT * FROM integrations
			WHERE id = ${id}
		`;
		return rows.length > 0 ? rowToIntegration(rows[0]) : null;
	},

	/**
	 * Find integration by user and service type
	 */
	async findByUserAndService(userId: string, serviceType: ServiceType): Promise<Integration | null> {
		const rows = await sql<IntegrationRow[]>`
			SELECT * FROM integrations
			WHERE user_id = ${userId}
			AND service_type = ${serviceType}
		`;
		return rows.length > 0 ? rowToIntegration(rows[0]) : null;
	},

	/**
	 * Find integration by space and service type
	 */
	async findBySpaceAndService(spaceId: string, serviceType: ServiceType): Promise<Integration | null> {
		const rows = await sql<IntegrationRow[]>`
			SELECT * FROM integrations
			WHERE space_id = ${spaceId}
			AND service_type = ${serviceType}
		`;
		return rows.length > 0 ? rowToIntegration(rows[0]) : null;
	},

	/**
	 * Find all integrations for a user
	 */
	async findAllByUser(userId: string): Promise<Integration[]> {
		const rows = await sql<IntegrationRow[]>`
			SELECT * FROM integrations
			WHERE user_id = ${userId}
			ORDER BY created_at DESC
		`;
		return rows.map(rowToIntegration);
	},

	/**
	 * Find all integrations for a space
	 */
	async findAllBySpace(spaceId: string): Promise<Integration[]> {
		const rows = await sql<IntegrationRow[]>`
			SELECT * FROM integrations
			WHERE space_id = ${spaceId}
			ORDER BY created_at DESC
		`;
		return rows.map(rowToIntegration);
	},

	/**
	 * Find all integrations for an organization
	 */
	async findAllByOrg(orgId: string): Promise<Integration[]> {
		const rows = await sql<IntegrationRow[]>`
			SELECT * FROM integrations
			WHERE org_id = ${orgId}
			ORDER BY created_at DESC
		`;
		return rows.map(rowToIntegration);
	},

	/**
	 * Find all connected integrations for a user (for AI tool injection)
	 */
	async findConnectedByUser(userId: string): Promise<Integration[]> {
		const rows = await sql<IntegrationRow[]>`
			SELECT * FROM integrations
			WHERE user_id = ${userId}
			AND status = 'connected'
			ORDER BY service_type
		`;
		return rows.map(rowToIntegration);
	},

	/**
	 * Create a new integration
	 */
	async create(input: CreateIntegrationInput): Promise<Integration> {
		const config = input.config || {};

		const rows = await sql<IntegrationRow[]>`
			INSERT INTO integrations (
				user_id, space_id, org_id, service_type, status, config
			) VALUES (
				${input.userId || null},
				${input.spaceId || null},
				${input.orgId || null},
				${input.serviceType},
				'disconnected',
				${sql.json(config as JSONValue)}
			)
			RETURNING *
		`;

		return rowToIntegration(rows[0]);
	},

	/**
	 * Update an integration
	 */
	async update(id: string, input: UpdateIntegrationInput): Promise<Integration | null> {
		// Build dynamic update
		const updates: string[] = ['updated_at = NOW()'];
		const values: unknown[] = [];
		let paramIndex = 1;

		if (input.status !== undefined) {
			updates.push(`status = $${paramIndex++}`);
			values.push(input.status);
		}

		if (input.config !== undefined) {
			updates.push(`config = $${paramIndex++}::jsonb`);
			values.push(JSON.stringify(input.config));
		}

		if (input.lastError !== undefined) {
			updates.push(`last_error = $${paramIndex++}`);
			values.push(input.lastError);
		}

		if (input.lastErrorAt !== undefined) {
			updates.push(`last_error_at = $${paramIndex++}`);
			values.push(input.lastErrorAt);
		}

		if (input.connectedAt !== undefined) {
			updates.push(`connected_at = $${paramIndex++}`);
			values.push(input.connectedAt);
		}

		// Use tagged template with dynamic parts
		// Note: We need to construct this carefully for postgres.js
		const rows = await sql<IntegrationRow[]>`
			UPDATE integrations
			SET
				status = COALESCE(${input.status ?? null}, status),
				config = COALESCE(${input.config ? sql.json(input.config as JSONValue) : null}, config),
				last_error = ${input.lastError ?? null},
				last_error_at = ${input.lastErrorAt ?? null},
				connected_at = COALESCE(${input.connectedAt ?? null}, connected_at),
				updated_at = NOW()
			WHERE id = ${id}
			RETURNING *
		`;

		return rows.length > 0 ? rowToIntegration(rows[0]) : null;
	},

	/**
	 * Update integration status
	 */
	async updateStatus(
		id: string,
		status: IntegrationStatus,
		error?: { message: string; at: Date }
	): Promise<boolean> {
		const result = await sql`
			UPDATE integrations
			SET
				status = ${status},
				last_error = ${error?.message ?? null},
				last_error_at = ${error?.at ?? null},
				connected_at = ${status === 'connected' ? sql`NOW()` : sql`connected_at`},
				updated_at = NOW()
			WHERE id = ${id}
		`;

		return result.count > 0;
	},

	/**
	 * Delete an integration (and cascade to credentials)
	 */
	async delete(id: string): Promise<boolean> {
		const result = await sql`
			DELETE FROM integrations
			WHERE id = ${id}
		`;

		return result.count > 0;
	},

	/**
	 * Delete integration by user and service
	 */
	async deleteByUserAndService(userId: string, serviceType: ServiceType): Promise<boolean> {
		const result = await sql`
			DELETE FROM integrations
			WHERE user_id = ${userId}
			AND service_type = ${serviceType}
		`;

		return result.count > 0;
	},

	/**
	 * Check if user has a connected integration for a service
	 */
	async isConnected(userId: string, serviceType: ServiceType): Promise<boolean> {
		const rows = await sql<{ count: string }[]>`
			SELECT COUNT(*) as count
			FROM integrations
			WHERE user_id = ${userId}
			AND service_type = ${serviceType}
			AND status = 'connected'
		`;

		return parseInt(rows[0].count, 10) > 0;
	}
};
