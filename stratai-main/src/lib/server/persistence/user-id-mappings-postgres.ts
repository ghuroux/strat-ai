/**
 * PostgreSQL User ID Mappings Repository
 *
 * Handles backward compatibility mapping from legacy TEXT user_ids to UUIDs.
 * This enables gradual migration from the POC TEXT-based user system.
 */

import { sql } from './db';
import type { UserIdMappingRepository, UserIdMapping } from './types';

/**
 * Database row type for user_id_mappings table
 */
interface UserIdMappingRow {
	legacyId: string;
	userId: string;
	createdAt: Date;
}

/**
 * Convert database row to UserIdMapping entity
 */
function rowToUserIdMapping(row: UserIdMappingRow): UserIdMapping {
	return {
		legacyId: row.legacyId,
		userId: row.userId,
		createdAt: row.createdAt
	};
}

export const postgresUserIdMappingRepository: UserIdMappingRepository = {
	/**
	 * Find UUID user_id by legacy TEXT id
	 * This is the primary use case - resolving old IDs to new UUIDs
	 */
	async findByLegacyId(legacyId: string): Promise<UserIdMapping | null> {
		const rows = await sql<UserIdMappingRow[]>`
			SELECT * FROM user_id_mappings
			WHERE legacy_id = ${legacyId}
		`;
		return rows.length > 0 ? rowToUserIdMapping(rows[0]) : null;
	},

	/**
	 * Find legacy ID by UUID user_id (reverse lookup)
	 */
	async findByUserId(userId: string): Promise<UserIdMapping | null> {
		const rows = await sql<UserIdMappingRow[]>`
			SELECT * FROM user_id_mappings
			WHERE user_id = ${userId}
		`;
		return rows.length > 0 ? rowToUserIdMapping(rows[0]) : null;
	},

	/**
	 * Get all mappings (admin use)
	 */
	async findAll(): Promise<UserIdMapping[]> {
		const rows = await sql<UserIdMappingRow[]>`
			SELECT * FROM user_id_mappings
			ORDER BY created_at ASC
		`;
		return rows.map(rowToUserIdMapping);
	},

	/**
	 * Create a new mapping
	 */
	async create(legacyId: string, userId: string): Promise<UserIdMapping> {
		const rows = await sql<UserIdMappingRow[]>`
			INSERT INTO user_id_mappings (legacy_id, user_id)
			VALUES (${legacyId}, ${userId})
			RETURNING *
		`;
		return rowToUserIdMapping(rows[0]);
	},

	/**
	 * Delete a mapping
	 */
	async delete(legacyId: string): Promise<boolean> {
		const result = await sql`
			DELETE FROM user_id_mappings
			WHERE legacy_id = ${legacyId}
		`;
		return result.count > 0;
	},

	/**
	 * Resolve a user ID - returns UUID if input is legacy, or validates UUID exists
	 * This is the main helper for transitioning code from TEXT to UUID user_ids
	 *
	 * @param id - Either a legacy TEXT id (e.g., 'admin') or a UUID
	 * @returns The UUID user_id, or null if not found
	 */
	async resolveUserId(id: string): Promise<string | null> {
		// Check if it looks like a UUID (36 chars with dashes)
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

		if (uuidRegex.test(id)) {
			// It's already a UUID - verify it exists in users table
			const rows = await sql<{ id: string }[]>`
				SELECT id FROM users
				WHERE id = ${id}
				  AND deleted_at IS NULL
			`;
			return rows.length > 0 ? id : null;
		}

		// It's a legacy ID - look up in mappings
		const mapping = await this.findByLegacyId(id);
		return mapping?.userId ?? null;
	}
};
