/**
 * PostgreSQL Area Memberships Repository
 *
 * Handles access control and membership operations for areas.
 * Implements ENTITY_MODEL.md Section 6.5 (area_memberships) and
 * Section 9.2 (CanAccessArea algorithm).
 *
 * Key features:
 * - XOR constraint: membership is either user OR group, never both
 * - 4-tier roles: owner, admin, member, viewer
 * - Space fallthrough: non-restricted areas inherit from space access
 */

import { sql } from './db';

// =====================================================
// Types
// =====================================================

export type AreaMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Area membership entity
 */
export interface AreaMembership {
	id: string;
	areaId: string;
	userId: string | null;
	groupId: string | null;
	role: AreaMemberRole;
	invitedBy: string | null;
	createdAt: Date;
}

/**
 * Area member with user/group details for display
 */
export interface AreaMemberWithDetails extends AreaMembership {
	// For user memberships
	userName: string | null;
	userEmail: string | null;
	// For group memberships
	groupName: string | null;
}

/**
 * Result of access check
 */
export interface AreaAccessResult {
	hasAccess: boolean;
	role: AreaMemberRole | 'inherited';
	source: 'owner' | 'membership' | 'group' | 'space';
}

// =====================================================
// Row Types (database representation)
// =====================================================

interface AreaMembershipRow {
	id: string;
	areaId: string;
	userId: string | null;
	groupId: string | null;
	role: AreaMemberRole;
	invitedBy: string | null;
	createdAt: Date;
}

interface AreaMemberWithDetailsRow extends AreaMembershipRow {
	userName: string | null;
	userEmail: string | null;
	groupName: string | null;
}

interface AccessCheckRow {
	isCreator: boolean;
	isRestricted: boolean;
	membershipRole: AreaMemberRole | null;
	groupRole: AreaMemberRole | null;
	hasSpaceAccess: boolean;
	spaceRole: 'owner' | 'admin' | 'member' | 'guest' | null;
}

// =====================================================
// Row Converters
// =====================================================

function rowToMembership(row: AreaMembershipRow): AreaMembership {
	return {
		id: row.id,
		areaId: row.areaId,
		userId: row.userId,
		groupId: row.groupId,
		role: row.role,
		invitedBy: row.invitedBy,
		createdAt: row.createdAt
	};
}

function rowToMemberWithDetails(row: AreaMemberWithDetailsRow): AreaMemberWithDetails {
	return {
		...rowToMembership(row),
		userName: row.userName,
		userEmail: row.userEmail,
		groupName: row.groupName
	};
}

// =====================================================
// ID Generation
// =====================================================

function generateMembershipId(): string {
	return `am_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// =====================================================
// Repository
// =====================================================

export const postgresAreaMembershipsRepository = {
	// -------------------------------------------------
	// Access Control (Core)
	// -------------------------------------------------

	/**
	 * Check if a user can access an area
	 * Implements CanAccessArea algorithm from ENTITY_MODEL.md Section 9.2
	 *
	 * Access resolution order:
	 * 1. Creator always has owner access
	 * 2. Direct user membership
	 * 3. Group membership (best role)
	 * 4. Space access (if area not restricted)
	 */
	async canAccessArea(userId: string, areaId: string): Promise<AreaAccessResult> {
		try {
		const rows = await sql<AccessCheckRow[]>`
			WITH area_info AS (
				SELECT
					a.id,
					a.space_id,
					a.is_restricted,
					a.created_by,
					a.user_id
				FROM areas a
				WHERE a.id = ${areaId}
				  AND a.deleted_at IS NULL
			),
			direct_membership AS (
				SELECT am.role
				FROM area_memberships am
				WHERE am.area_id = ${areaId}
				  AND am.user_id = ${userId}
			),
			group_membership AS (
				SELECT am.role
				FROM area_memberships am
				JOIN group_memberships gm ON am.group_id = gm.group_id
				WHERE am.area_id = ${areaId}
				  AND gm.user_id = ${userId}::uuid
				ORDER BY
					CASE am.role
						WHEN 'owner' THEN 1
						WHEN 'admin' THEN 2
						WHEN 'member' THEN 3
						WHEN 'viewer' THEN 4
					END
				LIMIT 1
			),
			space_access AS (
				SELECT
					CASE
						-- Space owner always has access
						WHEN s.user_id = ${userId} THEN true
						-- Space member has access
						WHEN sm.user_id IS NOT NULL THEN true
						ELSE false
					END as has_access,
					CASE
						-- Space owner gets 'owner' role
						WHEN s.user_id = ${userId} THEN 'owner'
						-- Otherwise use membership role
						ELSE sm.role
					END as space_role
				FROM spaces s
				LEFT JOIN space_memberships sm ON s.id = sm.space_id AND sm.user_id = ${userId}
				WHERE s.id = (SELECT space_id FROM area_info)
				  AND s.deleted_at IS NULL
			)
			SELECT
				(ai.created_by = ${userId} OR ai.user_id = ${userId}) as is_creator,
				COALESCE(ai.is_restricted, false) as is_restricted,
				dm.role as membership_role,
				gm.role as group_role,
				sa.has_access as has_space_access,
				sa.space_role as space_role
			FROM area_info ai
			CROSS JOIN space_access sa
			LEFT JOIN direct_membership dm ON true
			LEFT JOIN group_membership gm ON true
		`;

		// Area not found
		if (rows.length === 0) {
			return { hasAccess: false, role: 'viewer', source: 'space' };
		}

		const row = rows[0];

		// 1. Creator always has owner access
		if (row.isCreator) {
			return { hasAccess: true, role: 'owner', source: 'owner' };
		}

		// 2. Check direct membership
		if (row.membershipRole) {
			return {
				hasAccess: true,
				role: row.membershipRole,
				source: 'membership'
			};
		}

		// 3. Check group membership
		if (row.groupRole) {
			return {
				hasAccess: true,
				role: row.groupRole,
				source: 'group'
			};
		}

		// 4. If not restricted, space access grants area access
		// Phase 7: Guests only see explicitly shared areas, NOT open areas
		if (!row.isRestricted && row.hasSpaceAccess && row.spaceRole !== 'guest') {
			return {
				hasAccess: true,
				role: 'inherited',
				source: 'space'
			};
		}

		return { hasAccess: false, role: 'viewer', source: 'space' };
		} catch (err) {
			// Log detailed error context for debugging
			console.error(`[canAccessArea] Error checking access: areaId=${areaId}, userId=${userId}`, err);
			console.error('[canAccessArea] Error details:', {
				name: err instanceof Error ? err.name : 'Unknown',
				message: err instanceof Error ? err.message : String(err),
				userIdType: typeof userId,
				userIdLength: userId?.length,
				// Check if userId looks like a valid UUID (basic pattern check)
				userIdPattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || '')
			});
			throw err; // Re-throw to propagate the error
		}
	},

	/**
	 * Get user's role in an area (convenience method)
	 * Returns null if no access
	 */
	async getUserRole(userId: string, areaId: string): Promise<AreaMemberRole | 'inherited' | null> {
		const access = await this.canAccessArea(userId, areaId);
		if (!access.hasAccess) return null;
		return access.role;
	},

	// -------------------------------------------------
	// Membership CRUD
	// -------------------------------------------------

	/**
	 * Get all members of an area (users + groups with details)
	 */
	async getMembers(areaId: string): Promise<AreaMemberWithDetails[]> {
		const rows = await sql<AreaMemberWithDetailsRow[]>`
			SELECT
				am.id, am.area_id, am.user_id, am.group_id,
				am.role, am.invited_by, am.created_at,
				COALESCE(u.display_name, CONCAT_WS(' ', u.first_name, u.last_name)) as user_name,
				u.email as user_email,
				g.name as group_name
			FROM area_memberships am
			LEFT JOIN users u ON am.user_id = u.id::text
			LEFT JOIN groups g ON am.group_id = g.id
			WHERE am.area_id = ${areaId}
			ORDER BY
				CASE am.role
					WHEN 'owner' THEN 1
					WHEN 'admin' THEN 2
					WHEN 'member' THEN 3
					WHEN 'viewer' THEN 4
				END,
				am.created_at ASC
		`;
		return rows.map(rowToMemberWithDetails);
	},

	/**
	 * Add a user to an area
	 * Uses ON CONFLICT to upsert (update role if already exists)
	 */
	async addUserMember(
		areaId: string,
		userId: string,
		role: AreaMemberRole = 'member',
		invitedBy?: string
	): Promise<AreaMembership> {
		const id = generateMembershipId();
		const rows = await sql<AreaMembershipRow[]>`
			INSERT INTO area_memberships (id, area_id, user_id, role, invited_by)
			VALUES (${id}, ${areaId}, ${userId}, ${role}, ${invitedBy || null})
			ON CONFLICT (area_id, user_id) WHERE user_id IS NOT NULL
			DO UPDATE SET role = ${role}
			RETURNING *
		`;
		return rowToMembership(rows[0]);
	},

	/**
	 * Add a group to an area
	 * Uses ON CONFLICT to upsert (update role if already exists)
	 */
	async addGroupMember(
		areaId: string,
		groupId: string,
		role: AreaMemberRole = 'member',
		invitedBy?: string
	): Promise<AreaMembership> {
		const id = generateMembershipId();
		const rows = await sql<AreaMembershipRow[]>`
			INSERT INTO area_memberships (id, area_id, group_id, role, invited_by)
			VALUES (${id}, ${areaId}, ${groupId}::uuid, ${role}, ${invitedBy || null})
			ON CONFLICT (area_id, group_id) WHERE group_id IS NOT NULL
			DO UPDATE SET role = ${role}
			RETURNING *
		`;
		return rowToMembership(rows[0]);
	},

	/**
	 * Remove a user from an area
	 */
	async removeUserMember(areaId: string, userId: string): Promise<boolean> {
		const result = await sql`
			DELETE FROM area_memberships
			WHERE area_id = ${areaId}
			  AND user_id = ${userId}
		`;
		return result.count > 0;
	},

	/**
	 * Remove a group from an area
	 */
	async removeGroupMember(areaId: string, groupId: string): Promise<boolean> {
		const result = await sql`
			DELETE FROM area_memberships
			WHERE area_id = ${areaId}
			  AND group_id = ${groupId}::uuid
		`;
		return result.count > 0;
	},

	/**
	 * Update a member's role by membership ID
	 */
	async updateMemberRole(membershipId: string, role: AreaMemberRole): Promise<boolean> {
		const result = await sql`
			UPDATE area_memberships
			SET role = ${role}
			WHERE id = ${membershipId}
		`;
		return result.count > 0;
	},

	// -------------------------------------------------
	// Query Methods
	// -------------------------------------------------

	/**
	 * Find a membership by ID
	 */
	async findById(id: string): Promise<AreaMembership | null> {
		const rows = await sql<AreaMembershipRow[]>`
			SELECT * FROM area_memberships WHERE id = ${id}
		`;
		return rows.length > 0 ? rowToMembership(rows[0]) : null;
	},

	/**
	 * Find areas where user has explicit membership
	 * (Does not include space-inherited access)
	 */
	async findAreasForUser(userId: string): Promise<string[]> {
		const rows = await sql<{ areaId: string }[]>`
			SELECT DISTINCT am.area_id
			FROM area_memberships am
			WHERE am.user_id = ${userId}
			UNION
			SELECT DISTINCT am.area_id
			FROM area_memberships am
			JOIN group_memberships gm ON am.group_id = gm.group_id
			WHERE gm.user_id = ${userId}::uuid
		`;
		return rows.map((r) => r.areaId);
	},

	/**
	 * Check if user is owner of area
	 */
	async isOwner(areaId: string, userId: string): Promise<boolean> {
		const rows = await sql`
			SELECT 1 FROM area_memberships
			WHERE area_id = ${areaId}
			  AND user_id = ${userId}
			  AND role = 'owner'
		`;
		return rows.length > 0;
	},

	/**
	 * Get count of owners for an area
	 * Used to prevent removing last owner
	 */
	async getOwnerCount(areaId: string): Promise<number> {
		const result = await sql<{ count: string }[]>`
			SELECT COUNT(*) as count
			FROM area_memberships
			WHERE area_id = ${areaId}
			  AND role = 'owner'
		`;
		return parseInt(result[0]?.count ?? '0', 10);
	},

	/**
	 * Check if user has admin+ access (owner or admin)
	 */
	async canManageArea(userId: string, areaId: string): Promise<boolean> {
		const access = await this.canAccessArea(userId, areaId);
		return access.hasAccess && ['owner', 'admin'].includes(access.role);
	},

	/**
	 * Check if user can invite members (owner or admin)
	 */
	async canInviteMembers(userId: string, areaId: string): Promise<boolean> {
		return this.canManageArea(userId, areaId);
	}
};
