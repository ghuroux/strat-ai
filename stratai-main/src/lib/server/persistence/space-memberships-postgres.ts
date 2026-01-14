/**
 * Space Memberships Repository
 *
 * Manages space-level access control.
 * Pattern matches area-memberships-postgres.ts
 */

import { sql } from './db';
import type {
	SpaceMembership,
	SpaceMembershipWithUser,
	SpaceMembershipRow,
	SpaceRole
} from '$lib/types/space-memberships';
import { rowToSpaceMembership } from '$lib/types/space-memberships';

// ============================================
// ID GENERATION
// ============================================

function generateMembershipId(): string {
	return `sm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// ACCESS CONTROL
// ============================================

export interface SpaceAccessResult {
	hasAccess: boolean;
	role: SpaceRole | null;
	source: 'owner' | 'membership' | 'group' | null;
}

/**
 * Check if user can access a space and return their role
 *
 * Resolution order:
 * 1. Space owner (spaces.user_id) → 'owner'
 * 2. Direct membership → role from space_memberships
 * 3. Group membership → best role from groups user belongs to
 */
async function canAccessSpace(userId: string, spaceId: string): Promise<SpaceAccessResult> {
	const result = await sql<
		{
			isOwner: boolean;
			membershipRole: SpaceRole | null;
			groupRole: SpaceRole | null;
		}[]
	>`
		WITH space_info AS (
			SELECT id, user_id
			FROM spaces
			WHERE id = ${spaceId}
				AND deleted_at IS NULL
		),
		direct_membership AS (
			SELECT role
			FROM space_memberships
			WHERE space_id = ${spaceId}
				AND user_id = ${userId}::uuid
		),
		group_membership AS (
			SELECT sm.role
			FROM space_memberships sm
			JOIN group_memberships gm ON sm.group_id = gm.group_id
			WHERE sm.space_id = ${spaceId}
				AND gm.user_id = ${userId}::uuid
			ORDER BY
				CASE sm.role
					WHEN 'owner' THEN 1
					WHEN 'admin' THEN 2
					WHEN 'member' THEN 3
					WHEN 'guest' THEN 4
				END
			LIMIT 1
		)
		SELECT
			COALESCE(s.user_id = ${userId}::uuid, false) as is_owner,
			dm.role as membership_role,
			gm.role as group_role
		FROM space_info s
		LEFT JOIN direct_membership dm ON true
		LEFT JOIN group_membership gm ON true
	`;

	if (result.length === 0) {
		return { hasAccess: false, role: null, source: null };
	}

	// postgres.js converts snake_case to camelCase
	const { isOwner, membershipRole, groupRole } = result[0];

	// 1. Space owner check
	if (isOwner) {
		return { hasAccess: true, role: 'owner', source: 'owner' };
	}

	// 2. Direct membership
	if (membershipRole) {
		return { hasAccess: true, role: membershipRole, source: 'membership' };
	}

	// 3. Group membership
	if (groupRole) {
		return { hasAccess: true, role: groupRole, source: 'group' };
	}

	return { hasAccess: false, role: null, source: null };
}

/**
 * Get user's role in a space (convenience method)
 */
async function getUserRole(userId: string, spaceId: string): Promise<SpaceRole | null> {
	const access = await canAccessSpace(userId, spaceId);
	return access.role;
}

// ============================================
// MEMBER MANAGEMENT
// ============================================

/**
 * Add or update a user membership (upsert pattern)
 */
async function addUserMember(
	spaceId: string,
	userId: string,
	role: SpaceRole = 'member',
	invitedBy?: string
): Promise<SpaceMembership> {
	const id = generateMembershipId();

	const rows = await sql<SpaceMembershipRow[]>`
		INSERT INTO space_memberships (id, space_id, user_id, role, invited_by)
		VALUES (
			${id},
			${spaceId},
			${userId}::uuid,
			${role},
			${invitedBy ? sql`${invitedBy}::uuid` : sql`NULL`}
		)
		ON CONFLICT (space_id, user_id) WHERE user_id IS NOT NULL
		DO UPDATE SET
			role = ${role},
			updated_at = NOW()
		RETURNING *
	`;

	return rowToSpaceMembership(rows[0]);
}

/**
 * Add or update a group membership (upsert pattern)
 */
async function addGroupMember(
	spaceId: string,
	groupId: string,
	role: SpaceRole = 'member',
	invitedBy?: string
): Promise<SpaceMembership> {
	const id = generateMembershipId();

	const rows = await sql<SpaceMembershipRow[]>`
		INSERT INTO space_memberships (id, space_id, group_id, role, invited_by)
		VALUES (
			${id},
			${spaceId},
			${groupId}::uuid,
			${role},
			${invitedBy ? sql`${invitedBy}::uuid` : sql`NULL`}
		)
		ON CONFLICT (space_id, group_id) WHERE group_id IS NOT NULL
		DO UPDATE SET
			role = ${role},
			updated_at = NOW()
		RETURNING *
	`;

	return rowToSpaceMembership(rows[0]);
}

/**
 * Remove a user membership
 */
async function removeUserMember(spaceId: string, userId: string): Promise<boolean> {
	const result = await sql`
		DELETE FROM space_memberships
		WHERE space_id = ${spaceId}
			AND user_id = ${userId}::uuid
	`;
	return result.count > 0;
}

/**
 * Remove a group membership
 */
async function removeGroupMember(spaceId: string, groupId: string): Promise<boolean> {
	const result = await sql`
		DELETE FROM space_memberships
		WHERE space_id = ${spaceId}
			AND group_id = ${groupId}::uuid
	`;
	return result.count > 0;
}

/**
 * Update a membership's role
 */
async function updateMemberRole(
	membershipId: string,
	role: SpaceRole
): Promise<SpaceMembership | null> {
	const rows = await sql<SpaceMembershipRow[]>`
		UPDATE space_memberships
		SET role = ${role}, updated_at = NOW()
		WHERE id = ${membershipId}
		RETURNING *
	`;
	return rows.length > 0 ? rowToSpaceMembership(rows[0]) : null;
}

// ============================================
// QUERIES
// ============================================

/**
 * Get all members of a space with user/group details
 */
async function getMembers(spaceId: string): Promise<SpaceMembershipWithUser[]> {
	const rows = await sql<
		(SpaceMembershipRow & {
			user_email: string | null;
			user_display_name: string | null;
			group_name: string | null;
		})[]
	>`
		SELECT
			sm.*,
			u.email as user_email,
			COALESCE(u.display_name, CONCAT_WS(' ', u.first_name, u.last_name)) as user_display_name,
			g.name as group_name
		FROM space_memberships sm
		LEFT JOIN users u ON sm.user_id = u.id
		LEFT JOIN groups g ON sm.group_id = g.id
		WHERE sm.space_id = ${spaceId}
		ORDER BY
			CASE sm.role
				WHEN 'owner' THEN 1
				WHEN 'admin' THEN 2
				WHEN 'member' THEN 3
				WHEN 'guest' THEN 4
			END,
			sm.created_at ASC
	`;

	return rows.map((row) => {
		// postgres.js transforms all columns to camelCase, so we need to use:
		// userId (not user_id), userEmail (not user_email), etc.
		const userId = (row as any).userId;
		const userEmail = (row as any).userEmail;
		const userDisplayName = (row as any).userDisplayName;
		const groupId = (row as any).groupId;
		const groupName = (row as any).groupName;

		return {
			...rowToSpaceMembership(row),
			user: userId
				? {
						id: userId,
						email: userEmail!,
						displayName: userDisplayName,
						avatarUrl: null // avatar_url column not yet in database
					}
				: undefined,
			group: groupId
				? {
						id: groupId,
						name: groupName!
					}
				: undefined
		};
	});
}

/**
 * Find all spaces a user is a member of (excluding owned spaces)
 * Returns both direct and group memberships
 */
async function findSpacesForUser(userId: string): Promise<{ spaceId: string; role: SpaceRole }[]> {
	const rows = await sql<{ space_id: string; role: SpaceRole }[]>`
		SELECT DISTINCT sm.space_id, sm.role
		FROM space_memberships sm
		WHERE sm.user_id = ${userId}::uuid

		UNION

		SELECT DISTINCT sm.space_id, sm.role
		FROM space_memberships sm
		JOIN group_memberships gm ON sm.group_id = gm.group_id
		WHERE gm.user_id = ${userId}::uuid
	`;

	return rows.map((r) => ({ spaceId: r.space_id, role: r.role }));
}

/**
 * Check if user is the last owner (prevent removing)
 */
async function getOwnerCount(spaceId: string): Promise<number> {
	const result = await sql<{ count: string }[]>`
		SELECT COUNT(*) as count
		FROM space_memberships
		WHERE space_id = ${spaceId}
			AND role = 'owner'
	`;
	return parseInt(result[0].count, 10);
}

/**
 * Find a specific membership by ID
 */
async function findById(id: string): Promise<SpaceMembership | null> {
	const rows = await sql<SpaceMembershipRow[]>`
		SELECT * FROM space_memberships WHERE id = ${id}
	`;
	return rows.length > 0 ? rowToSpaceMembership(rows[0]) : null;
}

/**
 * Find membership by space and user
 */
async function findBySpaceAndUser(
	spaceId: string,
	userId: string
): Promise<SpaceMembership | null> {
	const rows = await sql<SpaceMembershipRow[]>`
		SELECT * FROM space_memberships
		WHERE space_id = ${spaceId}
			AND user_id = ${userId}::uuid
	`;
	return rows.length > 0 ? rowToSpaceMembership(rows[0]) : null;
}

// ============================================
// EXPORT
// ============================================

export const postgresSpaceMembershipsRepository = {
	// Access control
	canAccessSpace,
	getUserRole,

	// Member management
	addUserMember,
	addGroupMember,
	removeUserMember,
	removeGroupMember,
	updateMemberRole,

	// Queries
	getMembers,
	findSpacesForUser,
	getOwnerCount,
	findById,
	findBySpaceAndUser
};

export type SpaceMembershipsRepository = typeof postgresSpaceMembershipsRepository;
