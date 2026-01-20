/**
 * Space Pages API
 *
 * GET /api/spaces/:spaceSlug/pages - List all pages for a Space with optional filters
 *
 * Query params:
 * - area: Filter by area slug (optional)
 * - type: Filter by page type (optional)
 * - owned: Filter by ownership - "me" | "shared" (optional)
 *
 * Returns pages the user can access across all accessible areas in the Space.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from '$lib/server/persistence/db';
import { resolveSpaceIdAccessible, postgresSpaceRepository } from '$lib/server/persistence/spaces-postgres';
import { postgresSpaceMembershipsRepository } from '$lib/server/persistence';
import { postgresAreaRepository } from '$lib/server/persistence/areas-postgres';
import type { PageRow } from '$lib/types/page';
import { rowToPage } from '$lib/types/page';

interface PageWithMetadata extends PageRow {
	areaName: string;
	areaSlug: string;
	creatorName: string | null;
	isOwnedByUser: boolean;
}

interface PageCounts {
	total: number;
	byArea: Record<string, number>;
	byType: Record<string, number>;
	ownedByMe: number;
	sharedWithMe: number;
}

interface PagesListResponse {
	pages: ReturnType<typeof rowToPage>[];
	recentlyEdited: ReturnType<typeof rowToPage>[];
	counts: PageCounts;
	areas: Array<{ id: string; name: string; slug: string }>;
	space: { id: string; name: string; slug: string };
}

/**
 * GET /api/spaces/:spaceSlug/pages
 * Returns all accessible pages for a Space with filtering support
 */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	// ⚠️ SECURITY: Always check authentication first
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const spaceSlug = params.space;

	try {
		// Resolve space slug/ID to proper space ID
		const spaceId = await resolveSpaceIdAccessible(spaceSlug, userId);
		if (!spaceId) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		// Check if user is a Space member
		const access = await postgresSpaceMembershipsRepository.canAccessSpace(userId, spaceId);
		if (!access.hasAccess) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		// Get space details
		const space = await postgresSpaceRepository.findByIdAccessible(spaceId, userId);
		if (!space) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		// Get accessible areas for this space
		const areas = await postgresAreaRepository.findAllAccessible(userId, spaceId);

		// Extract query parameters
		const areaFilter = url.searchParams.get('area');
		const typeFilter = url.searchParams.get('type');
		const ownedFilter = url.searchParams.get('owned'); // "me" | "shared"

		// Query accessible areas in this Space using CTE
		// This mirrors the logic from areas-postgres.ts
		const pagesWithMetadata = await sql<PageWithMetadata[]>`
			WITH accessible_areas AS (
				-- Areas user can access in this Space
				SELECT a.id, a.name, a.slug
				FROM areas a
				LEFT JOIN area_memberships am ON a.id = am.area_id AND am.user_id = ${userId}
				LEFT JOIN space_memberships sm ON a.space_id = sm.space_id AND sm.user_id = ${userId}
				WHERE a.space_id = ${spaceId}
					AND a.deleted_at IS NULL
					AND (
						-- Non-restricted area (all Space members can see)
						COALESCE(a.is_restricted, false) = false
						OR
						-- Restricted area with explicit membership
						am.user_id IS NOT NULL
					)
			)
			SELECT
				p.id,
				p.user_id,
				p.area_id,
				p.task_id,
				p.title,
				p.content,
				p.content_text,
				p.page_type,
				p.visibility,
				p.source_conversation_id,
				p.word_count,
				p.created_at,
				p.updated_at,
				p.deleted_at,
				a.name as area_name,
				a.slug as area_slug,
				u.display_name as creator_name,
				CASE WHEN p.user_id = ${userId} THEN true ELSE false END as is_owned_by_user
			FROM pages p
			JOIN accessible_areas a ON p.area_id = a.id
			LEFT JOIN users u ON p.user_id = u.id
			WHERE p.deleted_at IS NULL
				${areaFilter ? sql`AND a.slug = ${areaFilter}` : sql``}
				${typeFilter ? sql`AND p.page_type = ${typeFilter}` : sql``}
				${ownedFilter === 'me' ? sql`AND p.user_id = ${userId}` : sql``}
				${ownedFilter === 'shared' ? sql`AND p.user_id != ${userId}` : sql``}
			ORDER BY p.updated_at DESC
		`;

		// Query recently edited pages (pages owned by user, updated in last 30 days, limit 3)
		// Note: pages table doesn't have updated_by column, using user_id (owner) as proxy
		const recentlyEditedRows = await sql<PageRow[]>`
			WITH accessible_areas AS (
				SELECT a.id
				FROM areas a
				LEFT JOIN area_memberships am ON a.id = am.area_id AND am.user_id = ${userId}
				WHERE a.space_id = ${spaceId}
					AND a.deleted_at IS NULL
					AND (
						COALESCE(a.is_restricted, false) = false
						OR am.user_id IS NOT NULL
					)
			)
			SELECT p.*
			FROM pages p
			JOIN accessible_areas a ON p.area_id = a.id
			WHERE p.deleted_at IS NULL
				AND p.user_id = ${userId}
				AND p.updated_at > NOW() - INTERVAL '30 days'
			ORDER BY p.updated_at DESC
			LIMIT 3
		`;

		// Calculate counts
		const counts: PageCounts = {
			total: pagesWithMetadata.length,
			byArea: {},
			byType: {},
			ownedByMe: 0,
			sharedWithMe: 0
		};

		for (const page of pagesWithMetadata) {
			// Count by area
			const areaKey = page.areaSlug ?? 'unknown';
			counts.byArea[areaKey] = (counts.byArea[areaKey] ?? 0) + 1;

			// Count by type
			const typeKey = page.pageType ?? 'general';
			counts.byType[typeKey] = (counts.byType[typeKey] ?? 0) + 1;

			// Count by ownership
			if (page.isOwnedByUser) {
				counts.ownedByMe++;
			} else {
				counts.sharedWithMe++;
			}
		}

		// Convert rows to Page objects using camelCase access
		const pages = pagesWithMetadata.map((row) => {
			const page = rowToPage(row);
			return {
				...page,
				areaName: row.areaName ?? 'Unknown',
				areaSlug: row.areaSlug ?? '',
				creatorName: row.creatorName ?? null,
				isOwnedByUser: row.isOwnedByUser ?? false
			};
		});

		const recentlyEdited = recentlyEditedRows.map(rowToPage);

		const response: PagesListResponse = {
			pages,
			recentlyEdited,
			counts,
			areas: areas.map(a => ({
				id: a.id,
				name: a.name,
				slug: a.slug
			})),
			space: {
				id: space.id,
				name: space.name,
				slug: space.slug
			}
		};

		return json(response);
	} catch (error) {
		console.error('Failed to fetch pages:', error);
		return json(
			{
				error: 'Failed to fetch pages',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
