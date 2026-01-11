/**
 * Page Search API
 *
 * GET /api/pages/search - Full-text search across pages
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';

/**
 * GET /api/pages/search
 * Query params:
 * - q: Search query (required)
 * - areaId: Optional area filter
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const query = url.searchParams.get('q');
		const areaId = url.searchParams.get('areaId') ?? undefined;

		if (!query || !query.trim()) {
			return json({ error: 'Missing required query parameter: q' }, { status: 400 });
		}

		const results = await postgresPageRepository.search(query.trim(), userId, areaId);

		return json({ results });
	} catch (error) {
		console.error('Failed to search pages:', error);
		return json(
			{
				error: 'Failed to search pages',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
