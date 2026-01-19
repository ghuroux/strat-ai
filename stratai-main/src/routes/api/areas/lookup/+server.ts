/**
 * Area Lookup API - Check area existence and access by slug
 *
 * GET /api/areas/lookup?spaceId=X&slug=Y
 *
 * Returns:
 * - { exists: false } - Area doesn't exist in this space
 * - { exists: true, hasAccess: false, areaName: "..." } - Area exists but user can't access
 * - { exists: true, hasAccess: true, area: {...} } - Area exists and user has access
 *
 * This endpoint is used to distinguish between "not found" and "access denied"
 * when navigating to an area URL.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/persistence/db';
import { postgresAreaMembershipsRepository } from '$lib/server/persistence/area-memberships-postgres';

interface AreaLookupRow {
	id: string;
	name: string;
	isRestricted: boolean;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const spaceId = url.searchParams.get('spaceId');
		const slug = url.searchParams.get('slug');

		if (!spaceId || !slug) {
			return json({ error: 'spaceId and slug are required' }, { status: 400 });
		}

		// Look up area by slug within the space (regardless of access)
		const rows = await sql<AreaLookupRow[]>`
			SELECT id, name, COALESCE(is_restricted, false) as "isRestricted"
			FROM areas
			WHERE space_id = ${spaceId}
			  AND slug = ${slug}
			  AND deleted_at IS NULL
			LIMIT 1
		`;

		if (rows.length === 0) {
			// Area doesn't exist
			return json({ exists: false });
		}

		const areaRow = rows[0];

		// Check if user has access
		const access = await postgresAreaMembershipsRepository.canAccessArea(userId, areaRow.id);

		if (!access.hasAccess) {
			// Area exists but user can't access it
			return json({
				exists: true,
				hasAccess: false,
				areaName: areaRow.name,
				isRestricted: areaRow.isRestricted
			});
		}

		// User has access - return area details
		return json({
			exists: true,
			hasAccess: true,
			areaId: areaRow.id
		});
	} catch (error) {
		console.error('Failed to lookup area:', error);
		return json(
			{ error: 'Failed to lookup area', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
