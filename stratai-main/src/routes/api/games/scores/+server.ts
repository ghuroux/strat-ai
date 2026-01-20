/**
 * Game Scores API
 *
 * POST /api/games/scores - Save a game score
 * GET /api/games/scores?gameType=snake&limit=10 - Get leaderboard
 *
 * Supports org-wide leaderboards and personal best tracking.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresGameScoresRepository, type GameType } from '$lib/server/persistence';

const VALID_GAME_TYPES: GameType[] = ['snake', 'wordle', 'tictactoe'];

/**
 * GET /api/games/scores
 * Get leaderboard and personal best for a game type
 *
 * Query params:
 * - gameType: 'snake' | 'wordle' | 'tictactoe' (required)
 * - limit: number (optional, default 10, max 50)
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	// Authentication check
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;

	try {
		// Parse query params
		const gameType = url.searchParams.get('gameType') as GameType | null;
		const limitParam = url.searchParams.get('limit');
		const limit = Math.min(Math.max(parseInt(limitParam || '10', 10) || 10, 1), 50);

		// Validate game type
		if (!gameType || !VALID_GAME_TYPES.includes(gameType)) {
			return json(
				{
					error: `Invalid gameType. Must be one of: ${VALID_GAME_TYPES.join(', ')}`
				},
				{ status: 400 }
			);
		}

		// Fetch leaderboard, personal best, and rank in parallel
		const [leaderboard, personalBest, personalRank] = await Promise.all([
			postgresGameScoresRepository.getOrgLeaderboard(organizationId, gameType, limit),
			postgresGameScoresRepository.getPersonalBest(userId, gameType),
			postgresGameScoresRepository.getPersonalRank(organizationId, userId, gameType)
		]);

		return json({
			leaderboard,
			personalBest,
			personalRank
		});
	} catch (error) {
		console.error('Failed to fetch game scores:', error);
		return json(
			{
				error: 'Failed to fetch game scores',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/games/scores
 * Save a new game score
 *
 * Body: {
 *   gameType: 'snake' | 'wordle' | 'tictactoe',
 *   score: number,
 *   level?: number,
 *   metadata?: { length?: number, applesEaten?: number, timeMs?: number, ... }
 * }
 *
 * Returns: {
 *   score: GameScore,
 *   isPersonalBest: boolean,
 *   isOrgBest: boolean
 * }
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	// Authentication check
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;

	try {
		const body = await request.json();

		// Validate required fields
		const { gameType, score, level, metadata } = body;

		if (!gameType || !VALID_GAME_TYPES.includes(gameType)) {
			return json(
				{
					error: `gameType is required and must be one of: ${VALID_GAME_TYPES.join(', ')}`
				},
				{ status: 400 }
			);
		}

		if (typeof score !== 'number' || score < 0) {
			return json({ error: 'score is required and must be a non-negative number' }, { status: 400 });
		}

		// Check if this will be a personal or org best BEFORE saving
		const [previousPersonalBest, willBeOrgBest] = await Promise.all([
			postgresGameScoresRepository.getPersonalBest(userId, gameType),
			postgresGameScoresRepository.isOrgBest(organizationId, gameType, score)
		]);

		const isPersonalBest = !previousPersonalBest || score > previousPersonalBest.score;

		// Save the score
		const savedScore = await postgresGameScoresRepository.create({
			userId,
			orgId: organizationId,
			gameType,
			score,
			level: level ?? null,
			metadata: metadata ?? {}
		});

		return json(
			{
				score: savedScore,
				isPersonalBest,
				isOrgBest: willBeOrgBest
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Failed to save game score:', error);
		return json(
			{
				error: 'Failed to save game score',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
