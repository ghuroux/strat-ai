/**
 * PostgreSQL Organization Memberships Repository
 *
 * Handles CRUD operations for user roles within organizations.
 * Uses UUID primary keys for enterprise-grade identity management.
 */

import { sql } from './db';
import type { OrgMembershipRepository, OrgMembership } from './types';

/**
 * Database row type for org_memberships table
 */
interface OrgMembershipRow {
	id: string;
	organizationId: string;
	userId: string;
	role: 'owner' | 'admin' | 'member';
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Convert database row to OrgMembership entity
 */
function rowToOrgMembership(row: OrgMembershipRow): OrgMembership {
	return {
		id: row.id,
		organizationId: row.organizationId,
		userId: row.userId,
		role: row.role,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

export const postgresOrgMembershipRepository: OrgMembershipRepository = {
	/**
	 * Find all memberships for a user (across all organizations)
	 */
	async findByUserId(userId: string): Promise<OrgMembership[]> {
		const rows = await sql<OrgMembershipRow[]>`
			SELECT * FROM org_memberships
			WHERE user_id = ${userId}
			ORDER BY created_at ASC
		`;
		return rows.map(rowToOrgMembership);
	},

	/**
	 * Find all memberships in an organization
	 */
	async findByOrgId(organizationId: string): Promise<OrgMembership[]> {
		const rows = await sql<OrgMembershipRow[]>`
			SELECT * FROM org_memberships
			WHERE organization_id = ${organizationId}
			ORDER BY role ASC, created_at ASC
		`;
		return rows.map(rowToOrgMembership);
	},

	/**
	 * Find a specific membership
	 */
	async findByUserAndOrg(userId: string, organizationId: string): Promise<OrgMembership | null> {
		const rows = await sql<OrgMembershipRow[]>`
			SELECT * FROM org_memberships
			WHERE user_id = ${userId}
			  AND organization_id = ${organizationId}
		`;
		return rows.length > 0 ? rowToOrgMembership(rows[0]) : null;
	},

	/**
	 * Find membership by ID
	 */
	async findById(id: string): Promise<OrgMembership | null> {
		const rows = await sql<OrgMembershipRow[]>`
			SELECT * FROM org_memberships
			WHERE id = ${id}
		`;
		return rows.length > 0 ? rowToOrgMembership(rows[0]) : null;
	},

	/**
	 * Create a new membership
	 */
	async create(input: {
		organizationId: string;
		userId: string;
		role?: 'owner' | 'admin' | 'member';
	}): Promise<OrgMembership> {
		const rows = await sql<OrgMembershipRow[]>`
			INSERT INTO org_memberships (organization_id, user_id, role)
			VALUES (${input.organizationId}, ${input.userId}, ${input.role || 'member'})
			RETURNING *
		`;
		return rowToOrgMembership(rows[0]);
	},

	/**
	 * Update a membership role
	 */
	async update(
		id: string,
		updates: { role?: 'owner' | 'admin' | 'member' }
	): Promise<OrgMembership | null> {
		if (updates.role !== undefined) {
			await sql`
				UPDATE org_memberships
				SET role = ${updates.role}
				WHERE id = ${id}
			`;
		}
		return this.findById(id);
	},

	/**
	 * Delete a membership
	 */
	async delete(id: string): Promise<boolean> {
		const result = await sql`
			DELETE FROM org_memberships
			WHERE id = ${id}
		`;
		return result.count > 0;
	},

	/**
	 * Check if user has a specific role (or higher) in an organization
	 */
	async hasRole(
		userId: string,
		organizationId: string,
		minRole: 'owner' | 'admin' | 'member'
	): Promise<boolean> {
		const roleHierarchy = { owner: 3, admin: 2, member: 1 };
		const minLevel = roleHierarchy[minRole];

		const rows = await sql<OrgMembershipRow[]>`
			SELECT * FROM org_memberships
			WHERE user_id = ${userId}
			  AND organization_id = ${organizationId}
		`;

		if (rows.length === 0) return false;

		const userLevel = roleHierarchy[rows[0].role];
		return userLevel >= minLevel;
	},

	/**
	 * Get all owners of an organization
	 */
	async getOwners(organizationId: string): Promise<OrgMembership[]> {
		const rows = await sql<OrgMembershipRow[]>`
			SELECT * FROM org_memberships
			WHERE organization_id = ${organizationId}
			  AND role = 'owner'
			ORDER BY created_at ASC
		`;
		return rows.map(rowToOrgMembership);
	}
};
