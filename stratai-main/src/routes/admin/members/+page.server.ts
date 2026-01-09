/**
 * Admin Members Page Server
 *
 * Handles user management: listing, creating, updating, and password resets.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
	postgresUserRepository,
	postgresOrgMembershipRepository
} from '$lib/server/persistence';
import { postgresGroupsRepository } from '$lib/server/persistence/groups-postgres';
import { hashPassword, generateTempPassword } from '$lib/server/auth';
import { sql } from '$lib/server/persistence/db';

interface GroupMemberRow {
	userId: string;
	groupId: string;
	groupName: string;
	role: 'lead' | 'member';
}

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.session!.organizationId;

	// Get all users in organization
	const users = await postgresUserRepository.findByOrgId(orgId);

	// Get all memberships to get roles
	const memberships = await postgresOrgMembershipRepository.findByOrgId(orgId);
	const membershipMap = new Map(memberships.map((m) => [m.userId, { role: m.role, id: m.id }]));

	// Get all groups in the organization
	const groups = await postgresGroupsRepository.findByOrgId(orgId);

	// Get all group memberships for all users in the org
	const groupMemberships = await sql<GroupMemberRow[]>`
		SELECT gm.user_id, gm.group_id, g.name as group_name, gm.role
		FROM group_memberships gm
		JOIN groups g ON gm.group_id = g.id
		WHERE g.organization_id = ${orgId}
		ORDER BY g.name ASC
	`;

	// Build a map of userId -> groups[]
	const userGroupsMap = new Map<string, Array<{ id: string; name: string; role: 'lead' | 'member' }>>();
	for (const gm of groupMemberships) {
		if (!userGroupsMap.has(gm.userId)) {
			userGroupsMap.set(gm.userId, []);
		}
		userGroupsMap.get(gm.userId)!.push({
			id: gm.groupId,
			name: gm.groupName,
			role: gm.role
		});
	}

	// Combine user + role + groups data
	const usersWithRoles = users.map((u) => {
		const membership = membershipMap.get(u.id);
		return {
			id: u.id,
			email: u.email,
			username: u.username,
			displayName: u.displayName,
			status: u.status,
			role: membership?.role || 'member',
			membershipId: membership?.id || null,
			groups: userGroupsMap.get(u.id) || [],
			lastLoginAt: u.lastLoginAt?.toISOString() || null,
			createdAt: u.createdAt.toISOString()
		};
	});

	return {
		users: usersWithRoles,
		groups: groups.map(g => ({ id: g.id, name: g.name })),
		currentUserId: locals.session!.userId
	};
};

export const actions: Actions = {
	/**
	 * Create a new user
	 */
	create: async ({ request, locals }) => {
		if (!locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim();
		const username = formData.get('username')?.toString().trim();
		const displayName = formData.get('displayName')?.toString().trim() || null;
		const password = formData.get('password')?.toString();
		const role = formData.get('role')?.toString() as 'owner' | 'admin' | 'member';

		// Validation
		if (!email || !username || !password) {
			return fail(400, { error: 'Email, username, and password are required' });
		}

		if (!['owner', 'admin', 'member'].includes(role)) {
			return fail(400, { error: 'Invalid role' });
		}

		const orgId = locals.session.organizationId;

		// Check for existing email/username
		const existingEmail = await postgresUserRepository.findByEmail(orgId, email);
		if (existingEmail) {
			return fail(400, { error: 'Email already exists in this organization' });
		}

		const existingUsername = await postgresUserRepository.findByUsername(orgId, username);
		if (existingUsername) {
			return fail(400, { error: 'Username already exists in this organization' });
		}

		try {
			// Hash password
			const passwordHash = hashPassword(password);

			// Create user
			const user = await postgresUserRepository.create({
				organizationId: orgId,
				email,
				username,
				displayName: displayName || undefined,
				passwordHash,
				status: 'active'
			});

			// Create membership with role
			await postgresOrgMembershipRepository.create({
				organizationId: orgId,
				userId: user.id,
				role
			});

			return { success: true, userId: user.id };
		} catch (error) {
			console.error('Failed to create user:', error);
			return fail(500, { error: 'Failed to create user' });
		}
	},

	/**
	 * Update a user's details
	 */
	update: async ({ request, locals }) => {
		if (!locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		const membershipId = formData.get('membershipId')?.toString();
		const email = formData.get('email')?.toString().trim();
		const username = formData.get('username')?.toString().trim();
		const displayName = formData.get('displayName')?.toString().trim() || null;
		const role = formData.get('role')?.toString() as 'owner' | 'admin' | 'member';

		if (!userId) {
			return fail(400, { error: 'User ID is required' });
		}

		try {
			// Update user details
			const updates: Parameters<typeof postgresUserRepository.update>[1] = {};
			if (email) updates.email = email;
			if (username) updates.username = username;
			if (displayName !== undefined) updates.displayName = displayName;

			if (Object.keys(updates).length > 0) {
				await postgresUserRepository.update(userId, updates);
			}

			// Update role if membership exists
			if (membershipId && role && ['owner', 'admin', 'member'].includes(role)) {
				await postgresOrgMembershipRepository.update(membershipId, { role });
			}

			return { success: true };
		} catch (error) {
			console.error('Failed to update user:', error);
			return fail(500, { error: 'Failed to update user' });
		}
	},

	/**
	 * Toggle user status (activate/deactivate)
	 */
	toggleStatus: async ({ request, locals }) => {
		if (!locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		const newStatus = formData.get('status')?.toString() as 'active' | 'inactive';

		if (!userId || !newStatus) {
			return fail(400, { error: 'User ID and status are required' });
		}

		// Prevent self-deactivation
		if (userId === locals.session.userId && newStatus === 'inactive') {
			return fail(400, { error: 'Cannot deactivate your own account' });
		}

		try {
			await postgresUserRepository.update(userId, { status: newStatus });
			return { success: true };
		} catch (error) {
			console.error('Failed to toggle user status:', error);
			return fail(500, { error: 'Failed to update user status' });
		}
	},

	/**
	 * Reset a user's password
	 */
	resetPassword: async ({ request, locals }) => {
		if (!locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		const newPassword = formData.get('password')?.toString();

		if (!userId) {
			return fail(400, { error: 'User ID is required' });
		}

		try {
			// Use provided password or generate temp password
			const password = newPassword || generateTempPassword();
			const passwordHash = hashPassword(password);

			await postgresUserRepository.update(userId, { passwordHash });

			return { success: true, tempPassword: newPassword ? null : password };
		} catch (error) {
			console.error('Failed to reset password:', error);
			return fail(500, { error: 'Failed to reset password' });
		}
	}
};
