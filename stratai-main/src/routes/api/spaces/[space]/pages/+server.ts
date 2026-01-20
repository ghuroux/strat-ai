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
		console.log('[Pages API] Starting request for space:', spaceSlug, 'user:', userId);

		// Resolve space slug/ID to proper space ID
		const spaceId = await resolveSpaceIdAccessible(spaceSlug, userId);
		console.log('[Pages API] Resolved spaceId:', spaceId);
		if (!spaceId) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		// Check if user is a Space member
		const access = await postgresSpaceMembershipsRepository.canAccessSpace(userId, spaceId);
		console.log('[Pages API] Access check result:', access);
		if (!access.hasAccess) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		// Get space details
		const space = await postgresSpaceRepository.findByIdAccessible(spaceId, userId);
		console.log('[Pages API] Space details:', space?.name);
		if (!space) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		// Get accessible areas for this space
		console.log('[Pages API] Fetching accessible areas...');
		const areas = await postgresAreaRepository.findAllAccessible(userId, spaceId);
		console.log('[Pages API] Found', areas.length, 'accessible areas');

		// Extract query parameters
		const areaFilter = url.searchParams.get('area');
		const typeFilter = url.searchParams.get('type');
		const ownedFilter = url.searchParams.get('owned'); // "me" | "shared"

		// Get area IDs from the already-fetched areas
		const areaIds = areas.map(a => a.id);

		// If no areas, return empty
		if (areaIds.length === 0) {
			return json({
				pages: [],
				recentlyEdited: [],
				counts: { total: 0, byArea: {}, byType: {}, ownedByMe: 0, sharedWithMe: 0 },
				areas: [],
				space: { id: space.id, name: space.name, slug: space.slug }
			});
		}

		// Simplified query using pre-fetched area IDs (no complex CTE needed!)
		console.log('[Pages API] Starting main pages query...');
		console.log('[Pages API] Filters - area:', areaFilter, 'type:', typeFilter, 'owned:', ownedFilter);
		console.log('[Pages API] Using', areaIds.length, 'pre-fetched area IDs:', areaIds);
		let pagesWithMetadata: PageWithMetadata[];
		try {
			// Build area lookup map for metadata
			const areaLookup = new Map(areas.map(a => [a.id, { name: a.name, slug: a.slug }]));

			// Simple query - just get pages from accessible areas
			// Note: pages.user_id is TEXT, users.id is UUID - need to cast for the JOIN
			const rows = await sql<(PageRow & { creatorName: string | null })[]>`
				SELECT
					p.*,
					u.display_name as creator_name
				FROM pages p
				LEFT JOIN users u ON p.user_id::uuid = u.id
				LEFT JOIN areas a ON p.area_id = a.id
				WHERE p.deleted_at IS NULL
					AND p.area_id = ANY(${areaIds})
					${areaFilter ? sql`AND a.slug = ${areaFilter}` : sql``}
					${typeFilter ? sql`AND p.page_type = ${typeFilter}` : sql``}
					${ownedFilter === 'me' ? sql`AND p.user_id = ${userId}` : sql``}
					${ownedFilter === 'shared' ? sql`AND p.user_id != ${userId}` : sql``}
				ORDER BY p.updated_at DESC
			`;

			// Add area metadata from lookup
			pagesWithMetadata = rows.map(row => {
				const areaInfo = areaLookup.get(row.areaId) || { name: 'Unknown', slug: '' };
				return {
					...row,
					areaName: areaInfo.name,
					areaSlug: areaInfo.slug,
					creatorName: row.creatorName,
					isOwnedByUser: row.userId === userId
				};
			});
		} catch (queryError) {
			console.error('[Pages API] Main query FAILED:', queryError);
			console.error('[Pages API] Error message:', queryError instanceof Error ? queryError.message : String(queryError));
			console.error('[Pages API] Area IDs were:', areaIds);
			throw queryError;
		}

		console.log('[Pages API] Main query returned', pagesWithMetadata.length, 'pages');

		// Query recently edited pages (pages owned by user, updated in last 30 days, limit 3)
		// Using pre-fetched areaIds (no complex CTE needed!)
		console.log('[Pages API] Executing recently edited query...');
		let recentlyEditedRows: PageRow[];
		try {
			recentlyEditedRows = await sql<PageRow[]>`
				SELECT p.*
				FROM pages p
				WHERE p.deleted_at IS NULL
					AND p.area_id = ANY(${areaIds})
					AND p.user_id = ${userId}
					AND p.updated_at > NOW() - INTERVAL '30 days'
				ORDER BY p.updated_at DESC
				LIMIT 3
			`;
		} catch (recentError) {
			console.error('[Pages API] Recently edited query FAILED:', recentError);
			throw recentError;
		}
		console.log('[Pages API] Recently edited query returned', recentlyEditedRows.length, 'pages');

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
		// Log the full error stack for debugging
		if (error instanceof Error) {
			console.error('Error stack:', error.stack);
		}
		return json(
			{
				error: 'Failed to fetch pages',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
