/**
 * PostgreSQL Organization Memberships Repository
 *
 * Handles CRUD operations for user roles within organizations.
 * Uses UUID primary keys for enterprise-grade identity management.
 *
 * Phase 4: Auto-syncs with organization space memberships.
 */

import { sql } from './db';
import type { OrgMembershipRepository, OrgMembership } from './types';
import { findOrgSpace, mapOrgRoleToSpaceRole } from './organizations-postgres';

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
	 * Also auto-invites user to the organization's space
	 */
	async create(input: {
		organizationId: string;
		userId: string;
		role?: 'owner' | 'admin' | 'member';
		invitedBy?: string;
	}): Promise<OrgMembership> {
		const rows = await sql<OrgMembershipRow[]>`
			INSERT INTO org_memberships (organization_id, user_id, role)
			VALUES (${input.organizationId}, ${input.userId}, ${input.role || 'member'})
			RETURNING *
		`;
		const membership = rowToOrgMembership(rows[0]);

		// Auto-invite to organization space
		try {
			const orgSpaceId = await findOrgSpace(input.organizationId);
			if (orgSpaceId) {
				const spaceRole = mapOrgRoleToSpaceRole(input.role || 'member');
				await sql`
					INSERT INTO space_memberships (id, space_id, user_id, role, invited_by, created_at, updated_at)
					VALUES (
						${'sm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)},
						${orgSpaceId},
						${input.userId}::uuid,
						${spaceRole},
						${input.invitedBy ? sql`${input.invitedBy}::uuid` : sql`NULL`},
						NOW(),
						NOW()
					)
					ON CONFLICT (space_id, user_id) WHERE user_id IS NOT NULL
					DO UPDATE SET role = ${spaceRole}, updated_at = NOW()
				`;
			}
		} catch (error) {
			console.error('Failed to auto-invite to org space:', error);
			// Don't fail membership creation
		}

		return membership;
	},

	/**
	 * Update a membership role
	 * Also syncs the role to the organization's space
	 */
	async update(
		id: string,
		updates: { role?: 'owner' | 'admin' | 'member' }
	): Promise<OrgMembership | null> {
		// First get the current membership to find org and user
		const currentMembership = await this.findById(id);
		if (!currentMembership) return null;

		if (updates.role !== undefined) {
			await sql`
				UPDATE org_memberships
				SET role = ${updates.role}
				WHERE id = ${id}
			`;

			// Sync role to organization space
			try {
				const orgSpaceId = await findOrgSpace(currentMembership.organizationId);
				if (orgSpaceId) {
					const spaceRole = mapOrgRoleToSpaceRole(updates.role);
					await sql`
						UPDATE space_memberships
						SET role = ${spaceRole}, updated_at = NOW()
						WHERE space_id = ${orgSpaceId}
							AND user_id = ${currentMembership.userId}::uuid
					`;
				}
			} catch (error) {
				console.error('Failed to sync role to org space:', error);
				// Don't fail the update
			}
		}
		return this.findById(id);
	},

	/**
	 * Delete a membership
	 * Also removes user from the organization's space
	 */
	async delete(id: string): Promise<boolean> {
		// First get the membership to find org and user
		const membership = await this.findById(id);
		if (!membership) return false;

		const result = await sql`
			DELETE FROM org_memberships
			WHERE id = ${id}
		`;

		if (result.count > 0) {
			// Remove from organization space
			try {
				const orgSpaceId = await findOrgSpace(membership.organizationId);
				if (orgSpaceId) {
					await sql`
						DELETE FROM space_memberships
						WHERE space_id = ${orgSpaceId}
							AND user_id = ${membership.userId}::uuid
					`;
				}
			} catch (error) {
				console.error('Failed to remove from org space:', error);
				// Don't fail the delete
			}
		}

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
