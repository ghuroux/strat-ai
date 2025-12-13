import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresRankingsRepository } from '$lib/server/persistence';

/**
 * GET /api/arena/rankings
 * Get model rankings leaderboard
 *
 * Query params:
 * - limit: Number of models (default: 20, max: 100)
 * - all: If 'true', return all models (not just those with 3+ battles)
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	try {
		const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
		const all = url.searchParams.get('all') === 'true';

		const rankings = all
			? await postgresRankingsRepository.findAll(locals.session.userId)
			: await postgresRankingsRepository.getLeaderboard(locals.session.userId, limit);

		return json({ rankings });
	} catch (err) {
		console.error('Failed to fetch rankings:', err);
		return json(
			{ error: { message: 'Failed to fetch rankings', type: 'db_error' } },
			{ status: 500 }
		);
	}
};
