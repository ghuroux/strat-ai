/**
 * PostgreSQL Groups Repository
 *
 * Handles CRUD operations for groups (teams/departments) within organizations.
 */

import { sql } from './db';

/**
 * Group entity
 */
export interface Group {
	id: string;
	organizationId: string;
	name: string;
	description: string | null;
	systemPrompt: string | null;
	litellmTeamId: string | null;
	allowedTiers: string[] | null;
	monthlyBudget: number | null;
	settings: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Group membership entity
 */
export interface GroupMembership {
	groupId: string;
	userId: string;
	role: 'lead' | 'member';
	joinedAt: Date;
}

/**
 * Group with member count
 */
export interface GroupWithCount extends Group {
	memberCount: number;
}

/**
 * Group member with user details
 */
export interface GroupMemberWithUser {
	groupId: string;
	userId: string;
	role: 'lead' | 'member';
	joinedAt: Date;
	userName: string | null;
	userEmail: string;
}

/**
 * Database row types
 */
interface GroupRow {
	id: string;
	organizationId: string;
	name: string;
	description: string | null;
	systemPrompt: string | null;
	litellmTeamId: string | null;
	allowedTiers: string[] | null;
	monthlyBudget: string | null;
	settings: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

interface GroupWithCountRow extends GroupRow {
	memberCount: string;
}

interface GroupMembershipRow {
	groupId: string;
	userId: string;
	role: 'lead' | 'member';
	joinedAt: Date;
}

interface GroupMemberWithUserRow extends GroupMembershipRow {
	userName: string | null;
	userEmail: string;
}

/**
 * Convert database row to Group entity
 */
function rowToGroup(row: GroupRow): Group {
	return {
		id: row.id,
		organizationId: row.organizationId,
		name: row.name,
		description: row.description,
		systemPrompt: row.systemPrompt,
		litellmTeamId: row.litellmTeamId,
		allowedTiers: row.allowedTiers,
		monthlyBudget: row.monthlyBudget ? parseFloat(row.monthlyBudget) : null,
		settings: row.settings || {},
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

function rowToGroupWithCount(row: GroupWithCountRow): GroupWithCount {
	return {
		...rowToGroup(row),
		memberCount: parseInt(row.memberCount, 10)
	};
}

function rowToGroupMembership(row: GroupMembershipRow): GroupMembership {
	return {
		groupId: row.groupId,
		userId: row.userId,
		role: row.role,
		joinedAt: row.joinedAt
	};
}

function rowToGroupMemberWithUser(row: GroupMemberWithUserRow): GroupMemberWithUser {
	return {
		...rowToGroupMembership(row),
		userName: row.userName,
		userEmail: row.userEmail
	};
}

export const postgresGroupsRepository = {
	/**
	 * Find all groups in an organization
	 */
	async findByOrgId(organizationId: string): Promise<GroupWithCount[]> {
		const rows = await sql<GroupWithCountRow[]>`
			SELECT g.*,
				   COALESCE(COUNT(gm.user_id), 0)::text as member_count
			FROM groups g
			LEFT JOIN group_memberships gm ON g.id = gm.group_id
			WHERE g.organization_id = ${organizationId}
			GROUP BY g.id
			ORDER BY g.name ASC
		`;
		return rows.map(rowToGroupWithCount);
	},

	/**
	 * Find a group by ID
	 */
	async findById(id: string): Promise<Group | null> {
		const rows = await sql<GroupRow[]>`
			SELECT * FROM groups
			WHERE id = ${id}
		`;
		return rows.length > 0 ? rowToGroup(rows[0]) : null;
	},

	/**
	 * Find a group by ID with member count
	 */
	async findByIdWithCount(id: string): Promise<GroupWithCount | null> {
		const rows = await sql<GroupWithCountRow[]>`
			SELECT g.*,
				   COALESCE(COUNT(gm.user_id), 0)::text as member_count
			FROM groups g
			LEFT JOIN group_memberships gm ON g.id = gm.group_id
			WHERE g.id = ${id}
			GROUP BY g.id
		`;
		return rows.length > 0 ? rowToGroupWithCount(rows[0]) : null;
	},

	/**
	 * Create a new group
	 */
	async create(input: {
		organizationId: string;
		name: string;
		description?: string | null;
		systemPrompt?: string | null;
		allowedTiers?: string[] | null;
		monthlyBudget?: number | null;
	}): Promise<Group> {
		const rows = await sql<GroupRow[]>`
			INSERT INTO groups (organization_id, name, description, system_prompt, allowed_tiers, monthly_budget)
			VALUES (
				${input.organizationId},
				${input.name},
				${input.description || null},
				${input.systemPrompt || null},
				${input.allowedTiers || null},
				${input.monthlyBudget || null}
			)
			RETURNING *
		`;
		return rowToGroup(rows[0]);
	},

	/**
	 * Update a group
	 */
	async update(
		id: string,
		updates: {
			name?: string;
			description?: string | null;
			systemPrompt?: string | null;
			allowedTiers?: string[] | null;
			monthlyBudget?: number | null;
		}
	): Promise<Group | null> {
		const group = await this.findById(id);
		if (!group) return null;

		await sql`
			UPDATE groups
			SET name = ${updates.name ?? group.name},
				description = ${updates.description !== undefined ? updates.description : group.description},
				system_prompt = ${updates.systemPrompt !== undefined ? updates.systemPrompt : group.systemPrompt},
				allowed_tiers = ${updates.allowedTiers !== undefined ? updates.allowedTiers : group.allowedTiers},
				monthly_budget = ${updates.monthlyBudget !== undefined ? updates.monthlyBudget : group.monthlyBudget},
				updated_at = NOW()
			WHERE id = ${id}
		`;

		return this.findById(id);
	},

	/**
	 * Delete a group
	 */
	async delete(id: string): Promise<boolean> {
		const result = await sql`
			DELETE FROM groups
			WHERE id = ${id}
		`;
		return result.count > 0;
	},

	/**
	 * Get all members of a group with user details
	 */
	async getMembers(groupId: string): Promise<GroupMemberWithUser[]> {
		const rows = await sql<GroupMemberWithUserRow[]>`
			SELECT gm.group_id, gm.user_id, gm.role, gm.joined_at,
				   u.name as user_name, u.email as user_email
			FROM group_memberships gm
			JOIN users u ON gm.user_id = u.id
			WHERE gm.group_id = ${groupId}
			ORDER BY gm.role ASC, u.name ASC
		`;
		return rows.map(rowToGroupMemberWithUser);
	},

	/**
	 * Add a member to a group
	 */
	async addMember(groupId: string, userId: string, role: 'lead' | 'member' = 'member'): Promise<GroupMembership> {
		const rows = await sql<GroupMembershipRow[]>`
			INSERT INTO group_memberships (group_id, user_id, role)
			VALUES (${groupId}, ${userId}, ${role})
			ON CONFLICT (group_id, user_id) DO UPDATE SET role = ${role}
			RETURNING *
		`;
		return rowToGroupMembership(rows[0]);
	},

	/**
	 * Remove a member from a group
	 */
	async removeMember(groupId: string, userId: string): Promise<boolean> {
		const result = await sql`
			DELETE FROM group_memberships
			WHERE group_id = ${groupId}
			  AND user_id = ${userId}
		`;
		return result.count > 0;
	},

	/**
	 * Update a member's role in a group
	 */
	async updateMemberRole(groupId: string, userId: string, role: 'lead' | 'member'): Promise<boolean> {
		const result = await sql`
			UPDATE group_memberships
			SET role = ${role}
			WHERE group_id = ${groupId}
			  AND user_id = ${userId}
		`;
		return result.count > 0;
	},

	/**
	 * Find groups a user belongs to
	 */
	async findByUserId(userId: string): Promise<Group[]> {
		const rows = await sql<GroupRow[]>`
			SELECT g.*
			FROM groups g
			JOIN group_memberships gm ON g.id = gm.group_id
			WHERE gm.user_id = ${userId}
			ORDER BY g.name ASC
		`;
		return rows.map(rowToGroup);
	},

	/**
	 * Check if a user is a member of a group
	 */
	async isMember(groupId: string, userId: string): Promise<boolean> {
		const rows = await sql`
			SELECT 1 FROM group_memberships
			WHERE group_id = ${groupId}
			  AND user_id = ${userId}
		`;
		return rows.length > 0;
	},

	/**
	 * Check if a user is a lead of a group
	 */
	async isLead(groupId: string, userId: string): Promise<boolean> {
		const rows = await sql`
			SELECT 1 FROM group_memberships
			WHERE group_id = ${groupId}
			  AND user_id = ${userId}
			  AND role = 'lead'
		`;
		return rows.length > 0;
	}
};
