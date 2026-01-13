/**
 * PostgreSQL Organizations Repository
 *
 * Handles CRUD operations for organizations (multi-tenant root entity).
 * Uses UUID primary keys for enterprise-grade identity management.
 *
 * Phase 4: Auto-creates organization space when creatorUserId is provided.
 */

import { sql } from './db';
import type { OrganizationRepository, Organization } from './types';
import { postgresAreaRepository } from './areas-postgres';
import type { SpaceRole } from '$lib/types/space-memberships';

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
	 * If creatorUserId is provided, auto-creates an organization space and adds creator as admin
	 */
	async create(input: {
		name: string;
		slug: string;
		settings?: Record<string, unknown>;
		creatorUserId?: string;
	}): Promise<Organization> {
		const rows = await sql<OrganizationRow[]>`
			INSERT INTO organizations (name, slug, settings)
			VALUES (${input.name}, ${input.slug}, ${JSON.stringify(input.settings || {})})
			RETURNING *
		`;
		const org = rowToOrganization(rows[0]);

		// Auto-create organization space if creatorUserId is provided
		if (input.creatorUserId) {
			try {
				await createOrgSpace(org.id, org.name, org.slug, input.creatorUserId);
			} catch (error) {
				console.error('Failed to create org space:', error);
				// Don't fail org creation, the backfill migration will catch this
			}
		}

		return org;
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

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique space ID
 */
function generateSpaceId(): string {
	return `sp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique membership ID
 */
function generateMembershipId(): string {
	return `sm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create an organization space with the creator as admin
 * Also creates a General area for the space
 */
async function createOrgSpace(
	orgId: string,
	orgName: string,
	orgSlug: string,
	creatorUserId: string
): Promise<string> {
	const spaceId = generateSpaceId();
	const now = new Date();

	// Create the organization space
	await sql`
		INSERT INTO spaces (
			id, user_id, name, type, slug, space_type, organization_id,
			color, icon, order_index, created_at, updated_at
		) VALUES (
			${spaceId},
			${creatorUserId},
			${orgName},
			'custom',
			${orgSlug},
			'organization',
			${orgId},
			'#6366f1',
			'building',
			0,
			${now},
			${now}
		)
	`;

	// Add creator as admin in space_memberships
	await sql`
		INSERT INTO space_memberships (id, space_id, user_id, role, invited_by, created_at, updated_at)
		VALUES (
			${generateMembershipId()},
			${spaceId},
			${creatorUserId}::uuid,
			'admin',
			${creatorUserId}::uuid,
			${now},
			${now}
		)
	`;

	// Create General area for the org space
	try {
		await postgresAreaRepository.createGeneral(spaceId, creatorUserId);
	} catch (e) {
		console.error('Failed to create General area for org space:', e);
		// Don't fail - area can be created later
	}

	return spaceId;
}

/**
 * Map organization role to space role
 */
export function mapOrgRoleToSpaceRole(orgRole: string): SpaceRole {
	switch (orgRole) {
		case 'owner':
		case 'admin':
			return 'admin';
		case 'member':
		default:
			return 'member';
	}
}

/**
 * Find the organization space for an org
 */
export async function findOrgSpace(organizationId: string): Promise<string | null> {
	const rows = await sql<{ id: string }[]>`
		SELECT id FROM spaces
		WHERE organization_id = ${organizationId}
			AND space_type = 'organization'
			AND deleted_at IS NULL
		LIMIT 1
	`;
	return rows.length > 0 ? rows[0].id : null;
}
