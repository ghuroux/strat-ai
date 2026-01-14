/**
 * Area Member Search API
 *
 * GET /api/areas/[id]/members/search?q=<query>
 *
 * Search for users and groups to add to an area.
 * Only returns users/groups who are members of the area's space.
 * Excludes users/groups already in the area.
 * Requires access to the area (owner/admin/member can invite).
 *
 * Phase 5: Space membership is required before area membership.
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
			return json(
				{ error: 'Insufficient permissions. Viewers cannot invite members.' },
				{ status: 403 }
			);
		}

		// Get the area's space ID
		const areaRows = await sql<{ spaceId: string }[]>`
			SELECT space_id FROM areas WHERE id = ${areaId} AND deleted_at IS NULL
		`;
		if (areaRows.length === 0) {
			return json({ error: 'Area not found' }, { status: 404 });
		}
		const spaceId = areaRows[0].spaceId;

		// Search users and groups, filtering by space membership
		const [users, groups] = await Promise.all([
			searchSpaceMembers(query, areaId, spaceId),
			searchSpaceGroups(query, areaId, spaceId)
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
 * Search users who are space members
 * Must be: space owner, direct space member, or member via group
 * Excludes users already in the area
 */
async function searchSpaceMembers(query: string, areaId: string, spaceId: string) {
	if (query.length < 2) return [];

	const pattern = `%${query}%`;
	// Use COALESCE to support users with first_name/last_name instead of display_name
	const results = await sql`
		SELECT DISTINCT
			u.id,
			COALESCE(u.display_name, CONCAT_WS(' ', u.first_name, u.last_name)) as display_name,
			u.username,
			u.email
		FROM users u
		WHERE (
			u.display_name ILIKE ${pattern}
			OR u.first_name ILIKE ${pattern}
			OR u.last_name ILIKE ${pattern}
			OR u.username ILIKE ${pattern}
			OR u.email ILIKE ${pattern}
		)
		-- Must be a space member (owner, direct, or via group)
		AND (
			-- Space owner
			u.id = (SELECT user_id FROM spaces WHERE id = ${spaceId})
			-- Direct space membership
			OR EXISTS (
				SELECT 1 FROM space_memberships sm
				WHERE sm.space_id = ${spaceId} AND sm.user_id = u.id
			)
			-- Group-based space membership
			OR EXISTS (
				SELECT 1 FROM space_memberships sm
				JOIN group_memberships gm ON sm.group_id = gm.group_id
				WHERE sm.space_id = ${spaceId} AND gm.user_id = u.id
			)
		)
		-- Not already an area member
		AND u.id::text NOT IN (
			SELECT user_id FROM area_memberships
			WHERE area_id = ${areaId} AND user_id IS NOT NULL
		)
		ORDER BY 2 ASC
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
 * Search groups that are space members
 * Only returns groups that have been added to the space
 * Excludes groups already in the area
 */
async function searchSpaceGroups(query: string, areaId: string, spaceId: string) {
	if (query.length < 2) return [];

	const pattern = `%${query}%`;
	const results = await sql`
		SELECT g.id, g.name, g.description, COUNT(gm.user_id) as member_count
		FROM groups g
		LEFT JOIN group_memberships gm ON g.id = gm.group_id
		WHERE g.name ILIKE ${pattern}
		-- Group must be a space member
		AND EXISTS (
			SELECT 1 FROM space_memberships sm
			WHERE sm.space_id = ${spaceId} AND sm.group_id = g.id
		)
		-- Not already an area member
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
