/**
 * Space Member Search API
 *
 * GET /api/spaces/[id]/members/search?q=query - Search users/groups to invite
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/persistence/db';
import { postgresSpaceMembershipsRepository } from '$lib/server/persistence';
import { canManageSpaceMembers } from '$lib/types/space-memberships';

/**
 * GET /api/spaces/[id]/members/search
 * Query: ?q=searchterm (min 2 characters)
 *
 * Returns users and groups that are NOT already members of this space.
 * Requires admin+ permission.
 */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const spaceId = params.id;
	const query = url.searchParams.get('q') || '';

	// Require minimum 2 characters
	if (query.length < 2) {
		return json({ users: [], groups: [] });
	}

	try {
		// Check access and permission
		const access = await postgresSpaceMembershipsRepository.canAccessSpace(userId, spaceId);

		if (!access.hasAccess) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		if (!canManageSpaceMembers(access.role)) {
			return json(
				{ error: 'Insufficient permissions. Admin access required.' },
				{ status: 403 }
			);
		}

		const searchPattern = `%${query}%`;

		// Search users not already members
		// Use COALESCE to support users with first_name/last_name instead of display_name
		const users = await sql<{ id: string; display_name: string | null; email: string }[]>`
			SELECT
				u.id,
				COALESCE(u.display_name, CONCAT_WS(' ', u.first_name, u.last_name)) as display_name,
				u.email
			FROM users u
			WHERE (
				u.display_name ILIKE ${searchPattern}
				OR u.first_name ILIKE ${searchPattern}
				OR u.last_name ILIKE ${searchPattern}
				OR u.email ILIKE ${searchPattern}
			)
				AND NOT EXISTS (
					SELECT 1 FROM space_memberships sm
					WHERE sm.space_id = ${spaceId} AND sm.user_id = u.id
				)
			LIMIT 10
		`;

		// Search groups not already members
		const groups = await sql<{ id: string; name: string; description: string | null }[]>`
			SELECT g.id, g.name, g.description
			FROM groups g
			WHERE g.name ILIKE ${searchPattern}
				AND NOT EXISTS (
					SELECT 1 FROM space_memberships sm
					WHERE sm.space_id = ${spaceId} AND sm.group_id = g.id
				)
			LIMIT 10
		`;

		return json({
			users: users.map((u) => ({
				id: u.id,
				displayName: u.display_name,
				email: u.email
			})),
			groups: groups.map((g) => ({
				id: g.id,
				name: g.name,
				description: g.description
			}))
		});
	} catch (error) {
		console.error('Failed to search for members:', error);
		return json(
			{
				error: 'Failed to search',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
