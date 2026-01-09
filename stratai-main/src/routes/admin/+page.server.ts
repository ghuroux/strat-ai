/**
 * Admin Panel - User Management & Usage Dashboard
 *
 * Protected route for owner/admin roles to manage organization users
 * and view usage statistics.
 */

import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import {
	postgresUserRepository,
	postgresOrgMembershipRepository
} from '$lib/server/persistence';
import { postgresUsageRepository } from '$lib/server/persistence/usage-postgres';
import { hashPassword, generateTempPassword } from '$lib/server/auth';
import { formatCost } from '$lib/config/model-pricing';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Route protection handled by hooks.server.ts, but double-check
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	const orgId = locals.session.organizationId;

	// Get period from query params (default 30 days)
	const periodParam = url.searchParams.get('period');
	const daysBack = periodParam === '7' ? 7 : periodParam === '90' ? 90 : 30;

	// Get all users in organization
	const users = await postgresUserRepository.findByOrgId(orgId);

	// Get all memberships to get roles
	const memberships = await postgresOrgMembershipRepository.findByOrgId(orgId);
	const membershipMap = new Map(memberships.map((m) => [m.userId, { role: m.role, id: m.id }]));

	// Combine user + role data
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
			lastLoginAt: u.lastLoginAt?.toISOString() || null,
			createdAt: u.createdAt.toISOString()
		};
	});

	// Get usage statistics
	const [usageStats, modelBreakdown, userBreakdown, dailyUsage] = await Promise.all([
		postgresUsageRepository.getStats(orgId, daysBack),
		postgresUsageRepository.getAggregateByModel(orgId, daysBack),
		postgresUsageRepository.getAggregateByUser(orgId, daysBack),
		postgresUsageRepository.getDailyTotals(orgId, daysBack)
	]);

	return {
		users: usersWithRoles,
		currentUserId: locals.session.userId,
		usage: {
			stats: {
				...usageStats,
				formattedCost: formatCost(usageStats.estimatedCostMillicents)
			},
			modelBreakdown: modelBreakdown.map(m => ({
				...m,
				formattedCost: formatCost(m.estimatedCostMillicents)
			})),
			userBreakdown: userBreakdown.map(u => ({
				...u,
				formattedCost: formatCost(u.estimatedCostMillicents)
			})),
			dailyUsage,
			period: daysBack
		}
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

		const orgId = locals.session.organizationId;

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
