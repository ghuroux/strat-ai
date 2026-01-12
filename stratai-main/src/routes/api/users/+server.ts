/**
 * Users API - List users
 *
 * GET /api/users - List users in the organization
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresUserRepository } from '$lib/server/persistence/users-postgres';

/**
 * GET /api/users
 * Returns list of users for display (id, displayName, username)
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	try {
		// Get organization ID from session (use default for now)
		const orgId = locals.session.organizationId || '10000000-0000-0000-0000-000000000001';

		const users = await postgresUserRepository.findByOrgId(orgId);

		// Return minimal user info for UI
		const userList = users.map((user) => ({
			id: user.id,
			name: user.displayName || user.username,
			email: user.email
		}));

		return json({ users: userList });
	} catch (error) {
		console.error('Failed to fetch users:', error);
		return json(
			{
				error: 'Failed to fetch users',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
