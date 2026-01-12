/**
 * Area Member Search API
 *
 * GET /api/areas/[id]/members/search?q=<query>
 *
 * Search for users and groups to add to an area.
 * Excludes users/groups already in the area.
 * Requires access to the area (owner/admin/member can invite).
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresAreaMembershipsRepository } from '$lib/server/persistence/area-memberships-postgres';
import { sql } from '$lib/server/persistence/db';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userId = locals.session.userId;
		const areaId = params.id;
		const query = url.searchParams.get('q') || '';

		// Check permission - owner/admin/member can invite
		const access = await postgresAreaMembershipsRepository.canAccessArea(userId, areaId);
		if (!access.hasAccess) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		// Viewers cannot invite members
		if (access.role === 'viewer') {
			return json({ error: 'Insufficient permissions. Viewers cannot invite members.' }, { status: 403 });
		}

		// Search users and groups, excluding current members
		const [users, groups] = await Promise.all([
			searchUsers(query, areaId),
			searchGroups(query, areaId)
		]);

		return json({ users, groups });
	} catch (error) {
		console.error('Member search failed:', error);
		return json(
			{ error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * Search users by name, username, or email
 * Excludes users already in the area
 */
async function searchUsers(query: string, areaId: string) {
	if (query.length < 2) return [];

	const pattern = `%${query}%`;
	const results = await sql`
		SELECT DISTINCT u.id, u.display_name, u.username, u.email
		FROM users u
		WHERE (
			u.display_name ILIKE ${pattern}
			OR u.username ILIKE ${pattern}
			OR u.email ILIKE ${pattern}
		)
		AND u.id::text NOT IN (
			SELECT user_id FROM area_memberships
			WHERE area_id = ${areaId} AND user_id IS NOT NULL
		)
		ORDER BY u.display_name ASC
		LIMIT 10
	`;

	return results.map((r) => ({
		id: r.id,
		displayName: r.displayName,
		username: r.username,
		email: r.email
	}));
}

/**
 * Search groups by name
 * Excludes groups already in the area
 */
async function searchGroups(query: string, areaId: string) {
	if (query.length < 2) return [];

	const pattern = `%${query}%`;
	const results = await sql`
		SELECT g.id, g.name, g.description, COUNT(gm.user_id) as member_count
		FROM groups g
		LEFT JOIN group_memberships gm ON g.id = gm.group_id
		WHERE g.name ILIKE ${pattern}
		AND g.id::text NOT IN (
			SELECT group_id::text FROM area_memberships
			WHERE area_id = ${areaId} AND group_id IS NOT NULL
		)
		GROUP BY g.id, g.name, g.description
		ORDER BY g.name ASC
		LIMIT 10
	`;

	return results.map((r) => ({
		id: r.id,
		name: r.name,
		description: r.description,
		memberCount: parseInt(r.memberCount || '0', 10)
	}));
}
