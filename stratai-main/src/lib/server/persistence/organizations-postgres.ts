/**
 * PostgreSQL Organizations Repository
 *
 * Handles CRUD operations for organizations (multi-tenant root entity).
 * Uses UUID primary keys for enterprise-grade identity management.
 */

import { sql } from './db';
import type { OrganizationRepository, Organization } from './types';

/**
 * Database row type for organizations table
 */
interface OrganizationRow {
	id: string;
	name: string;
	slug: string;
	settings: Record<string, unknown> | string;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
}

/**
 * Convert database row to Organization entity
 */
function rowToOrganization(row: OrganizationRow): Organization {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings || {},
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

export const postgresOrganizationRepository: OrganizationRepository = {
	/**
	 * Find all organizations (admin use)
	 */
	async findAll(): Promise<Organization[]> {
		const rows = await sql<OrganizationRow[]>`
			SELECT * FROM organizations
			WHERE deleted_at IS NULL
			ORDER BY name ASC
		`;
		return rows.map(rowToOrganization);
	},

	/**
	 * Find organization by ID
	 */
	async findById(id: string): Promise<Organization | null> {
		const rows = await sql<OrganizationRow[]>`
			SELECT * FROM organizations
			WHERE id = ${id}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToOrganization(rows[0]) : null;
	},

	/**
	 * Find organization by slug
	 */
	async findBySlug(slug: string): Promise<Organization | null> {
		const rows = await sql<OrganizationRow[]>`
			SELECT * FROM organizations
			WHERE slug = ${slug}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToOrganization(rows[0]) : null;
	},

	/**
	 * Create a new organization
	 */
	async create(input: {
		name: string;
		slug: string;
		settings?: Record<string, unknown>;
	}): Promise<Organization> {
		const rows = await sql<OrganizationRow[]>`
			INSERT INTO organizations (name, slug, settings)
			VALUES (${input.name}, ${input.slug}, ${JSON.stringify(input.settings || {})})
			RETURNING *
		`;
		return rowToOrganization(rows[0]);
	},

	/**
	 * Update an organization
	 */
	async update(
		id: string,
		updates: {
			name?: string;
			slug?: string;
			settings?: Record<string, unknown>;
		}
	): Promise<Organization | null> {
		const setClauses: string[] = [];
		const values: unknown[] = [];

		if (updates.name !== undefined) {
			setClauses.push('name = $' + (values.length + 1));
			values.push(updates.name);
		}
		if (updates.slug !== undefined) {
			setClauses.push('slug = $' + (values.length + 1));
			values.push(updates.slug);
		}
		if (updates.settings !== undefined) {
			setClauses.push('settings = $' + (values.length + 1));
			values.push(JSON.stringify(updates.settings));
		}

		if (setClauses.length === 0) {
			return this.findById(id);
		}

		// Use a simpler approach with individual updates
		if (updates.name !== undefined) {
			await sql`UPDATE organizations SET name = ${updates.name} WHERE id = ${id} AND deleted_at IS NULL`;
		}
		if (updates.slug !== undefined) {
			await sql`UPDATE organizations SET slug = ${updates.slug} WHERE id = ${id} AND deleted_at IS NULL`;
		}
		if (updates.settings !== undefined) {
			await sql`UPDATE organizations SET settings = ${JSON.stringify(updates.settings)} WHERE id = ${id} AND deleted_at IS NULL`;
		}

		return this.findById(id);
	},

	/**
	 * Soft delete an organization
	 */
	async delete(id: string): Promise<boolean> {
		const result = await sql`
			UPDATE organizations
			SET deleted_at = NOW()
			WHERE id = ${id}
			  AND deleted_at IS NULL
		`;
		return result.count > 0;
	}
};
