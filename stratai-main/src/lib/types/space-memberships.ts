/**
 * Space Membership Types
 *
 * Defines the type system for space-level access control.
 * Pattern matches area-memberships.ts
 */

// ============================================
// ROLE DEFINITIONS
// ============================================

export type SpaceRole = 'owner' | 'admin' | 'member' | 'guest';

export const SPACE_ROLE_HIERARCHY: Record<SpaceRole, number> = {
	owner: 4,
	admin: 3,
	member: 2,
	guest: 1
};

export const SPACE_ROLE_LABELS: Record<SpaceRole, string> = {
	owner: 'Owner',
	admin: 'Admin',
	member: 'Member',
	guest: 'Guest'
};

export const SPACE_ROLE_DESCRIPTIONS: Record<SpaceRole, string> = {
	owner: 'Full control including deletion',
	admin: 'Manage members and settings',
	member: 'Access open areas, can be shared restricted areas',
	guest: 'Only sees explicitly shared areas'
};

// Roles that can be assigned to members (excludes owner)
export const SPACE_ASSIGNABLE_ROLES: SpaceRole[] = ['admin', 'member', 'guest'];

// ============================================
// SPACE MEMBERSHIP ENTITY
// ============================================

export interface SpaceMembership {
	id: string;
	spaceId: string;
	userId?: string;
	groupId?: string;
	role: SpaceRole;
	invitedBy?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface SpaceMembershipWithUser extends SpaceMembership {
	user?: {
		id: string;
		email: string;
		displayName: string | null;
		avatarUrl: string | null;
	};
	group?: {
		id: string;
		name: string;
	};
}

// ============================================
// DATABASE ROW TYPE
// ============================================

export interface SpaceMembershipRow {
	id: string;
	space_id: string;
	user_id: string | null;
	group_id: string | null;
	role: SpaceRole;
	invited_by: string | null;
	created_at: Date;
	updated_at: Date;
}

// ============================================
// CONVERTERS
// ============================================

export function rowToSpaceMembership(row: SpaceMembershipRow): SpaceMembership {
	// postgres.js auto-transforms all columns to camelCase, so access them accordingly
	const r = row as any;
	return {
		id: r.id,
		spaceId: r.spaceId ?? r.space_id, // Try camelCase first, fallback to snake_case
		userId: r.userId ?? r.user_id ?? undefined,
		groupId: r.groupId ?? r.group_id ?? undefined,
		role: r.role,
		invitedBy: r.invitedBy ?? r.invited_by ?? undefined,
		createdAt: r.createdAt ?? r.created_at,
		updatedAt: r.updatedAt ?? r.updated_at
	};
}

// ============================================
// PERMISSION HELPERS
// ============================================

/**
 * Check if a user's role meets or exceeds the required role level
 */
export function hasSpacePermission(userRole: SpaceRole | null, requiredRole: SpaceRole): boolean {
	if (!userRole) return false;
	return SPACE_ROLE_HIERARCHY[userRole] >= SPACE_ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a user can manage space members (add/remove/update roles)
 * Requires admin or higher
 */
export function canManageSpaceMembers(role: SpaceRole | null): boolean {
	return hasSpacePermission(role, 'admin');
}

/**
 * Check if a user can delete a space
 * Only owners can delete
 */
export function canDeleteSpace(role: SpaceRole | null): boolean {
	return role === 'owner';
}

/**
 * Check if a user can edit space settings (name, description, etc.)
 * Requires admin or higher
 */
export function canEditSpaceSettings(role: SpaceRole | null): boolean {
	return hasSpacePermission(role, 'admin');
}

/**
 * Check if a user can see all areas in a space (not just explicitly shared)
 * Guests can only see explicitly shared areas
 */
export function canSeeOpenAreas(role: SpaceRole | null): boolean {
	return hasSpacePermission(role, 'member');
}

/**
 * Check if a user can create new areas in a space
 * Guests cannot create areas
 */
export function canCreateAreas(role: SpaceRole | null): boolean {
	return hasSpacePermission(role, 'member');
}

/**
 * Compare two roles and return the higher one
 */
export function getBestRole(role1: SpaceRole | null, role2: SpaceRole | null): SpaceRole | null {
	if (!role1) return role2;
	if (!role2) return role1;
	return SPACE_ROLE_HIERARCHY[role1] >= SPACE_ROLE_HIERARCHY[role2] ? role1 : role2;
}
