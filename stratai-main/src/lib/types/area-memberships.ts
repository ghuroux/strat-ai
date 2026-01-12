/**
 * Area Membership Types
 *
 * Client-side types for area sharing and collaboration.
 * Server-side types are in persistence/area-memberships-postgres.ts
 *
 * Implements ENTITY_MODEL.md Section 6.5
 */

/**
 * Role within an area
 * Hierarchy: owner > admin > member > viewer
 */
export type AreaMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Access source - how the user gained access
 */
export type AreaAccessSource = 'owner' | 'membership' | 'group' | 'space';

/**
 * Area membership entity (matches server-side)
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
	source: AreaAccessSource;
}

/**
 * Permissions by role
 * Used for UI to determine what actions are available
 */
export const ROLE_PERMISSIONS = {
	owner: ['delete', 'settings', 'invite', 'manage_members', 'write', 'read'] as const,
	admin: ['settings', 'invite', 'manage_members', 'write', 'read'] as const,
	member: ['write', 'read'] as const,
	viewer: ['read'] as const,
	inherited: ['write', 'read'] as const // Space fallthrough grants member-equivalent access
};

export type RolePermission = (typeof ROLE_PERMISSIONS)[keyof typeof ROLE_PERMISSIONS][number];

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
	role: AreaMemberRole | 'inherited',
	permission: RolePermission
): boolean {
	const perms = ROLE_PERMISSIONS[role];
	return perms.includes(permission as never);
}

/**
 * Get display label for a role
 */
export function getRoleLabel(role: AreaMemberRole | 'inherited'): string {
	switch (role) {
		case 'owner':
			return 'Owner';
		case 'admin':
			return 'Admin';
		case 'member':
			return 'Member';
		case 'viewer':
			return 'Viewer';
		case 'inherited':
			return 'Space Member';
	}
}

/**
 * Get description for a role
 */
export function getRoleDescription(role: AreaMemberRole | 'inherited'): string {
	switch (role) {
		case 'owner':
			return 'Full control including deletion and settings';
		case 'admin':
			return 'Can manage settings and members';
		case 'member':
			return 'Can create and edit content';
		case 'viewer':
			return 'Read-only access';
		case 'inherited':
			return 'Access inherited from space membership';
	}
}

/**
 * Roles available for assignment (excludes owner - use ownership transfer)
 */
export const ASSIGNABLE_ROLES: AreaMemberRole[] = ['admin', 'member', 'viewer'];

/**
 * Input for adding a new member
 */
export interface AddMemberInput {
	userId?: string;
	groupId?: string;
	role?: AreaMemberRole;
}

/**
 * API response for members list
 */
export interface MembersResponse {
	members: AreaMemberWithDetails[];
	userRole: AreaMemberRole | 'inherited';
	accessSource: AreaAccessSource;
}
