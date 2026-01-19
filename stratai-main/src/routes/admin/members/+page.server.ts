/**
 * Admin Members Page Server
 *
 * Handles user management: listing, creating, updating, and password resets.
 * User creation sends a welcome email with a secure set-password link.
 * Invitations tab shows pending users who haven't set their password yet.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
	postgresUserRepository,
	postgresOrgMembershipRepository,
	postgresOrganizationRepository,
	postgresEmailLogRepository
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

/**
 * Invitation data for users who haven't set their password yet
 */
interface InvitationRow {
	id: string;
	email: string;
	username: string;
	firstName: string | null;
	lastName: string | null;
	displayName: string | null;
	createdAt: Date;
	tokenExpiresAt: Date | null;
	tokenUsedAt: Date | null;
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

	// Get pending invitations: users with lastLoginAt IS NULL
	// Join with password_reset_tokens to get token status
	const invitationRows = await sql<InvitationRow[]>`
		SELECT
			u.id,
			u.email,
			u.username,
			u.first_name,
			u.last_name,
			u.display_name,
			u.created_at,
			prt.expires_at as token_expires_at,
			prt.used_at as token_used_at
		FROM users u
		LEFT JOIN LATERAL (
			SELECT expires_at, used_at
			FROM password_reset_tokens
			WHERE user_id = u.id
			  AND token_type = 'welcome'
			ORDER BY created_at DESC
			LIMIT 1
		) prt ON true
		WHERE u.organization_id = ${orgId}
		  AND u.last_login_at IS NULL
		  AND u.deleted_at IS NULL
		ORDER BY u.created_at DESC
	`;

	// Track which users are invitations (for filtering members)
	const invitationUserIds = new Set(invitationRows.map(i => i.id));

	// Process invitations with status calculation
	const invitations = invitationRows.map(row => {
		// Determine token status:
		// - 'pending' if token exists, not used, and not expired
		// - 'expired' if token is missing, used, or expired
		let status: 'pending' | 'expired' = 'expired';

		if (row.tokenExpiresAt && !row.tokenUsedAt) {
			const now = new Date();
			if (row.tokenExpiresAt > now) {
				status = 'pending';
			}
		}

		return {
			id: row.id,
			email: row.email,
			username: row.username,
			firstName: row.firstName,
			lastName: row.lastName,
			displayName: row.displayName,
			invitedAt: row.createdAt.toISOString(),
			expiresAt: row.tokenExpiresAt?.toISOString() ?? null,
			status
		};
	});

	// Combine user + role + groups data, excluding users in invitations tab
	const usersWithRoles = users
		.filter(u => !invitationUserIds.has(u.id))
		.map((u) => {
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
		invitations,
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
	},

	/**
	 * Resend welcome email for users who haven't set their password yet
	 *
	 * Only works for users who have never logged in (lastLoginAt IS NULL).
	 * Rate limited to max 3 resends per user per hour.
	 */
	resendWelcome: async ({ request, locals }) => {
		if (!locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();

		if (!userId) {
			return fail(400, { error: 'User ID is required' });
		}

		const orgId = locals.session.organizationId;

		try {
			// Get user details
			const user = await postgresUserRepository.findById(userId);

			if (!user) {
				return fail(404, { error: 'User not found' });
			}

			// Verify user is in the same organization
			if (user.organizationId !== orgId) {
				return fail(403, { error: 'Cannot resend welcome email for users in other organizations' });
			}

			// Verify user has never logged in (hasn't set their password)
			if (user.lastLoginAt !== null) {
				return fail(400, { error: 'User has already set their password and logged in' });
			}

			// Rate limiting: max 3 welcome emails per user per hour
			const recentCount = await postgresEmailLogRepository.countRecentByUserAndType(
				userId,
				'welcome',
				60 // 1 hour window
			);

			if (recentCount >= 3) {
				return fail(429, { error: 'Please wait before resending. Maximum 3 welcome emails per hour.' });
			}

			// Get organization name for welcome email
			const org = await postgresOrganizationRepository.findById(orgId);
			const organizationName = org?.name ?? 'your organization';

			// Create new welcome token (this also invalidates any existing welcome tokens)
			const token = await postgresPasswordResetTokenRepository.createByEmail(user.email, 'welcome');

			if (!token) {
				return fail(500, { error: 'Failed to create welcome token' });
			}

			// Build welcome email
			const setPasswordLink = createSetPasswordLink(token);
			const welcomeEmail = getWelcomeEmail({
				firstName: user.firstName ?? user.username,
				organizationName,
				setPasswordLink,
				email: user.email,
				expiresInDays: 7
			});

			// Send welcome email
			const emailResult = await sendEmail({
				to: user.email,
				subject: welcomeEmail.subject,
				html: welcomeEmail.html,
				text: welcomeEmail.text,
				orgId,
				userId,
				emailType: 'welcome',
				metadata: { resentBy: locals.session.userId, resendCount: recentCount + 1 }
			});

			if (!emailResult.success) {
				console.error('Failed to resend welcome email:', emailResult.error);
				return fail(500, { error: 'Failed to send welcome email. Please try again.' });
			}

			return { success: true, welcomeEmailResent: true, email: user.email };
		} catch (error) {
			console.error('Failed to resend welcome email:', error);
			return fail(500, { error: 'Failed to resend welcome email' });
		}
	},

	/**
	 * Revoke an invitation by deleting the user entirely
	 *
	 * Only works for users who have never logged in (lastLoginAt IS NULL).
	 * This is a destructive action that completely removes the user.
	 */
	revokeInvitation: async ({ request, locals }) => {
		if (!locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();

		if (!userId) {
			return fail(400, { error: 'User ID is required' });
		}

		const orgId = locals.session.organizationId;

		try {
			// Get user details
			const user = await postgresUserRepository.findById(userId);

			if (!user) {
				return fail(404, { error: 'User not found' });
			}

			// Verify user is in the same organization
			if (user.organizationId !== orgId) {
				return fail(403, { error: 'Cannot revoke invitation for users in other organizations' });
			}

			// Verify user has never logged in (is still a pending invitation)
			if (user.lastLoginAt !== null) {
				return fail(400, { error: 'Cannot revoke invitation for a user who has already logged in' });
			}

			// Delete the user (this cascades to password_reset_tokens, org_memberships, etc.)
			await postgresUserRepository.delete(userId);

			return { success: true, invitationRevoked: true, email: user.email };
		} catch (error) {
			console.error('Failed to revoke invitation:', error);
			return fail(500, { error: 'Failed to revoke invitation' });
		}
	}
};
