/**
 * Admin Members Page Server
 *
 * Handles user management: listing, creating, updating, and password resets.
 * User creation sends a welcome email with a secure set-password link.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
	postgresUserRepository,
	postgresOrgMembershipRepository,
	postgresOrganizationRepository
} from '$lib/server/persistence';
import { postgresGroupsRepository } from '$lib/server/persistence/groups-postgres';
import { postgresPasswordResetTokenRepository } from '$lib/server/persistence/password-reset-tokens-postgres';
import { hashPassword, generateTempPassword } from '$lib/server/auth';
import { sql } from '$lib/server/persistence/db';
import { sendEmail } from '$lib/server/email/sendgrid';
import { getWelcomeEmail, createSetPasswordLink } from '$lib/server/email/templates';

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
			firstName: u.firstName,
			lastName: u.lastName,
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
	 * Create a new user and send welcome email
	 *
	 * User is created with a placeholder password hash (cannot login).
	 * A welcome email is sent with a secure link to set their password.
	 * If email fails, user creation is rolled back.
	 */
	create: async ({ request, locals }) => {
		if (!locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim();
		const username = formData.get('username')?.toString().trim();
		const firstName = formData.get('firstName')?.toString().trim() || null;
		const lastName = formData.get('lastName')?.toString().trim() || null;
		const role = formData.get('role')?.toString() as 'owner' | 'admin' | 'member';

		// Validation - password no longer required, welcome email handles it
		if (!email || !username) {
			return fail(400, { error: 'Email and username are required' });
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

		// Get organization name for welcome email
		const org = await postgresOrganizationRepository.findById(orgId);
		const organizationName = org?.name ?? 'your organization';

		let user;

		try {
			// Create a random placeholder password hash that cannot be used to login
			// This is a hash of a random 64-byte string - virtually impossible to guess
			const placeholderPassword = generateTempPassword() + generateTempPassword() + Date.now();
			const passwordHash = hashPassword(placeholderPassword);

			// Create user with placeholder password
			user = await postgresUserRepository.create({
				organizationId: orgId,
				email,
				username,
				firstName: firstName || undefined,
				lastName: lastName || undefined,
				passwordHash,
				status: 'active'
			});

			// Create membership with role
			await postgresOrgMembershipRepository.create({
				organizationId: orgId,
				userId: user.id,
				role
			});

			// Create welcome token (7 days expiry)
			const token = await postgresPasswordResetTokenRepository.createByEmail(email, 'welcome');

			if (!token) {
				// Token creation failed - shouldn't happen since we just created the user
				throw new Error('Failed to create welcome token');
			}

			// Build welcome email
			const setPasswordLink = createSetPasswordLink(token);
			const welcomeEmail = getWelcomeEmail({
				firstName: firstName || username,
				organizationName,
				setPasswordLink,
				email,
				expiresInDays: 7
			});

			// Send welcome email
			const emailResult = await sendEmail({
				to: email,
				subject: welcomeEmail.subject,
				html: welcomeEmail.html,
				text: welcomeEmail.text,
				orgId,
				userId: user.id,
				emailType: 'welcome',
				metadata: { role, invitedBy: locals.session.userId }
			});

			if (!emailResult.success) {
				// Email failed - roll back user creation
				console.error('Failed to send welcome email, rolling back user creation:', emailResult.error);
				await postgresUserRepository.delete(user.id);
				return fail(500, { error: 'Failed to send welcome email. Please try again or check email configuration.' });
			}

			return { success: true, userId: user.id, welcomeEmailSent: true, email };
		} catch (error) {
			console.error('Failed to create user:', error);

			// If user was created but something else failed, clean up
			if (user) {
				try {
					await postgresUserRepository.delete(user.id);
				} catch (cleanupError) {
					console.error('Failed to clean up user after error:', cleanupError);
				}
			}

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
		const firstName = formData.get('firstName')?.toString().trim();
		const lastName = formData.get('lastName')?.toString().trim();
		const role = formData.get('role')?.toString() as 'owner' | 'admin' | 'member';

		if (!userId) {
			return fail(400, { error: 'User ID is required' });
		}

		try {
			// Update user details
			const updates: Parameters<typeof postgresUserRepository.update>[1] = {};
			if (email) updates.email = email;
			if (username) updates.username = username;
			if (firstName !== undefined) updates.firstName = firstName || null;
			if (lastName !== undefined) updates.lastName = lastName || null;

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
