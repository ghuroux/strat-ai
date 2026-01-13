/**
 * Shared Areas API
 *
 * GET /api/areas/shared-with-me - List areas shared with the current user
 *
 * Returns areas where the user has explicit membership but is NOT the creator.
 * Used for "Shared with Me" section on org space dashboard.
 *
 * Implements SPACE_MEMBERSHIPS.md Phase 6
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/persistence/db';
import type { AreaMemberRole } from '$lib/types/area-memberships';

interface SharedAreaRow {
	id: string;
	name: string;
	slug: string;
	color: string | null;
	icon: string | null;
	spaceId: string;
	spaceName: string;
	spaceSlug: string;
	userRole: AreaMemberRole;
	sharedById: string | null;
	sharedByName: string | null;
	createdAt: Date;
}

/**
 * GET /api/areas/shared-with-me
 *
 * Returns areas where user has explicit membership but is NOT the creator.
 * Includes both direct user memberships and group-based memberships.
 */
export const GET: RequestHandler = async ({ locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;

		// Query areas shared with user (direct membership + group membership)
		// Excludes areas the user created
		const rows = await sql<SharedAreaRow[]>`
			SELECT DISTINCT ON (a.id)
				a.id,
				a.name,
				a.slug,
				a.color,
				a.icon,
				s.id as space_id,
				s.name as space_name,
				s.slug as space_slug,
				am.role as user_role,
				COALESCE(am.invited_by, a.created_by) as shared_by_id,
				u.display_name as shared_by_name,
				am.created_at
			FROM areas a
			JOIN spaces s ON a.space_id = s.id
			JOIN area_memberships am ON a.id = am.area_id
			LEFT JOIN users u ON COALESCE(am.invited_by, a.created_by) = u.id::text
			WHERE am.user_id = ${userId}
				AND (a.created_by IS NULL OR a.created_by != ${userId})
				AND a.deleted_at IS NULL
				AND s.deleted_at IS NULL
			ORDER BY a.id, am.created_at DESC
		`;

		// Also get areas via group membership
		const groupRows = await sql<SharedAreaRow[]>`
			SELECT DISTINCT ON (a.id)
				a.id,
				a.name,
				a.slug,
				a.color,
				a.icon,
				s.id as space_id,
				s.name as space_name,
				s.slug as space_slug,
				am.role as user_role,
				COALESCE(am.invited_by, a.created_by) as shared_by_id,
				u.display_name as shared_by_name,
				am.created_at
			FROM areas a
			JOIN spaces s ON a.space_id = s.id
			JOIN area_memberships am ON a.id = am.area_id
			JOIN group_memberships gm ON am.group_id = gm.group_id
			LEFT JOIN users u ON COALESCE(am.invited_by, a.created_by) = u.id::text
			WHERE gm.user_id = ${userId}::uuid
				AND (a.created_by IS NULL OR a.created_by != ${userId})
				AND a.deleted_at IS NULL
				AND s.deleted_at IS NULL
			ORDER BY a.id, am.created_at DESC
		`;

		// Merge and dedupe (prefer direct membership over group membership)
		const areaMap = new Map<string, SharedAreaRow>();
		for (const row of rows) {
			areaMap.set(row.id, row);
		}
		for (const row of groupRows) {
			if (!areaMap.has(row.id)) {
				areaMap.set(row.id, row);
			}
		}

		// Convert to response format
		const areas = Array.from(areaMap.values())
			.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			.map((row) => ({
				id: row.id,
				name: row.name,
				slug: row.slug,
				color: row.color ?? undefined,
				icon: row.icon ?? undefined,
				spaceId: row.spaceId,
				spaceName: row.spaceName,
				spaceSlug: row.spaceSlug,
				userRole: row.userRole,
				sharedBy: {
					id: row.sharedById ?? '',
					name: row.sharedByName ?? 'Unknown'
				}
			}));

		return json({ areas });
	} catch (error) {
		console.error('Failed to fetch shared areas:', error);
		return json(
			{
				error: 'Failed to fetch shared areas',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
