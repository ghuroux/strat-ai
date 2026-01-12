/**
 * PostgreSQL Users Repository
 *
 * Handles CRUD operations for users within organizations.
 * Uses UUID primary keys for enterprise-grade identity management.
 */

import { sql, type JSONValue } from './db';
import type { UserRepository, User } from './types';

/**
 * Database row type for users table
 */
interface UserRow {
	id: string;
	organizationId: string;
	email: string;
	username: string;
	displayName: string | null;
	passwordHash: string | null;
	status: 'active' | 'inactive' | 'suspended';
	lastLoginAt: Date | null;
	settings: Record<string, unknown> | string;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
}

/**
 * Convert database row to User entity
 */
function rowToUser(row: UserRow): User {
	return {
		id: row.id,
		organizationId: row.organizationId,
		email: row.email,
		username: row.username,
		displayName: row.displayName,
		status: row.status,
		lastLoginAt: row.lastLoginAt,
		settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings || {},
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

export const postgresUserRepository: UserRepository = {
	/**
	 * Find all users in an organization
	 */
	async findByOrgId(organizationId: string): Promise<User[]> {
		const rows = await sql<UserRow[]>`
			SELECT * FROM users
			WHERE organization_id = ${organizationId}
			  AND deleted_at IS NULL
			ORDER BY display_name ASC, username ASC
		`;
		return rows.map(rowToUser);
	},

	/**
	 * Find user by ID
	 */
	async findById(id: string): Promise<User | null> {
		const rows = await sql<UserRow[]>`
			SELECT * FROM users
			WHERE id = ${id}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToUser(rows[0]) : null;
	},

	/**
	 * Find user by email within an organization
	 */
	async findByEmail(organizationId: string, email: string): Promise<User | null> {
		const rows = await sql<UserRow[]>`
			SELECT * FROM users
			WHERE organization_id = ${organizationId}
			  AND email = ${email}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToUser(rows[0]) : null;
	},

	/**
	 * Find user by username within an organization
	 */
	async findByUsername(organizationId: string, username: string): Promise<User | null> {
		const rows = await sql<UserRow[]>`
			SELECT * FROM users
			WHERE organization_id = ${organizationId}
			  AND username = ${username}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToUser(rows[0]) : null;
	},

	/**
	 * Create a new user
	 */
	async create(input: {
		organizationId: string;
		email: string;
		username: string;
		displayName?: string;
		passwordHash?: string;
		status?: 'active' | 'inactive' | 'suspended';
		settings?: Record<string, unknown>;
	}): Promise<User> {
		const rows = await sql<UserRow[]>`
			INSERT INTO users (
				organization_id, email, username, display_name,
				password_hash, status, settings
			)
			VALUES (
				${input.organizationId},
				${input.email},
				${input.username},
				${input.displayName || null},
				${input.passwordHash || null},
				${input.status || 'active'},
				${sql.json((input.settings || {}) as JSONValue)}
			)
			RETURNING *
		`;
		return rowToUser(rows[0]);
	},

	/**
	 * Update a user
	 */
	async update(
		id: string,
		updates: {
			email?: string;
			username?: string;
			displayName?: string | null;
			passwordHash?: string;
			status?: 'active' | 'inactive' | 'suspended';
			settings?: Record<string, unknown>;
		}
	): Promise<User | null> {
		// Apply each update individually for simplicity
		if (updates.email !== undefined) {
			await sql`UPDATE users SET email = ${updates.email} WHERE id = ${id} AND deleted_at IS NULL`;
		}
		if (updates.username !== undefined) {
			await sql`UPDATE users SET username = ${updates.username} WHERE id = ${id} AND deleted_at IS NULL`;
		}
		if (updates.displayName !== undefined) {
			await sql`UPDATE users SET display_name = ${updates.displayName} WHERE id = ${id} AND deleted_at IS NULL`;
		}
		if (updates.passwordHash !== undefined) {
			await sql`UPDATE users SET password_hash = ${updates.passwordHash} WHERE id = ${id} AND deleted_at IS NULL`;
		}
		if (updates.status !== undefined) {
			await sql`UPDATE users SET status = ${updates.status} WHERE id = ${id} AND deleted_at IS NULL`;
		}
		if (updates.settings !== undefined) {
			await sql`UPDATE users SET settings = ${sql.json(updates.settings as JSONValue)} WHERE id = ${id} AND deleted_at IS NULL`;
		}

		return this.findById(id);
	},

	/**
	 * Update last login timestamp
	 */
	async updateLastLogin(id: string): Promise<void> {
		await sql`
			UPDATE users
			SET last_login_at = NOW()
			WHERE id = ${id}
			  AND deleted_at IS NULL
		`;
	},

	/**
	 * Soft delete a user
	 */
	async delete(id: string): Promise<boolean> {
		const result = await sql`
			UPDATE users
			SET deleted_at = NOW()
			WHERE id = ${id}
			  AND deleted_at IS NULL
		`;
		return result.count > 0;
	},

	/**
	 * Get user preferences
	 */
	async getPreferences(id: string): Promise<Record<string, unknown>> {
		const rows = await sql<{ preferences: Record<string, unknown> | null }[]>`
			SELECT preferences FROM users
			WHERE id = ${id}
			  AND deleted_at IS NULL
		`;
		if (rows.length === 0) return {};
		return rows[0].preferences ?? {};
	},

	/**
	 * Update user preferences (merges with existing)
	 */
	async updatePreferences(id: string, preferences: Record<string, unknown>): Promise<Record<string, unknown>> {
		const rows = await sql<{ preferences: Record<string, unknown> }[]>`
			UPDATE users
			SET preferences = COALESCE(preferences, '{}'::jsonb) || ${sql.json(preferences as JSONValue)},
			    updated_at = NOW()
			WHERE id = ${id}
			  AND deleted_at IS NULL
			RETURNING preferences
		`;
		if (rows.length === 0) {
			throw new Error('User not found');
		}
		return rows[0].preferences;
	},

	/**
	 * Get password hash for verification (used for password change)
	 */
	async getPasswordHash(id: string): Promise<string | null> {
		const rows = await sql<{ passwordHash: string | null }[]>`
			SELECT password_hash as "passwordHash"
			FROM users
			WHERE id = ${id}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rows[0].passwordHash : null;
	}
};
