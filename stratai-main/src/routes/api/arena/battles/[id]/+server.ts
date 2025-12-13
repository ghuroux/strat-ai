import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	postgresBattleRepository,
	postgresRankingsRepository
} from '$lib/server/persistence';

/**
 * GET /api/arena/battles/[id]
 * Get a single battle
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	try {
		const battle = await postgresBattleRepository.findById(params.id, locals.session.userId);
		if (!battle) {
			return json({ error: { message: 'Battle not found', type: 'not_found' } }, { status: 404 });
		}
		return json(battle);
	} catch (err) {
		console.error('Failed to fetch battle:', err);
		return json(
			{ error: { message: 'Failed to fetch battle', type: 'db_error' } },
			{ status: 500 }
		);
	}
};

/**
 * PUT /api/arena/battles/[id]
 * Full update of a battle
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	try {
		const updates = await request.json();
		const existing = await postgresBattleRepository.findById(params.id, locals.session.userId);
		if (!existing) {
			return json({ error: { message: 'Battle not found', type: 'not_found' } }, { status: 404 });
		}

		const updated = { ...existing, ...updates, id: params.id };
		await postgresBattleRepository.update(updated, locals.session.userId);
		return json({ success: true });
	} catch (err) {
		console.error('Failed to update battle:', err);
		return json(
			{ error: { message: 'Failed to update battle', type: 'db_error' } },
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/arena/battles/[id]
 * Partial update - optimized for common operations
 *
 * Body can contain:
 * - status: Update battle status
 * - userVote: Set user's vote (triggers ranking update)
 * - aiJudgment: Set AI judgment (triggers ranking update)
 * - responses: Update responses array
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const updates = await request.json();
		const existing = await postgresBattleRepository.findById(params.id, userId);
		if (!existing) {
			return json({ error: { message: 'Battle not found', type: 'not_found' } }, { status: 404 });
		}

		// Handle status update
		if ('status' in updates) {
			await postgresBattleRepository.updateStatus(params.id, userId, updates.status);
		}

		// Handle user vote update
		if ('userVote' in updates) {
			await postgresBattleRepository.updateUserVote(params.id, userId, updates.userVote);

			// Update rankings if vote is set and we have AI judgment with scores
			if (updates.userVote && existing.aiJudgment?.scores) {
				const scores = existing.aiJudgment.scores;
				const winnerId = updates.userVote;
				// Find the loser (the other model in a 2-model battle)
				const loserId = existing.models.find((m) => m.id !== winnerId)?.id || null;

				if (loserId && scores[winnerId] !== undefined && scores[loserId] !== undefined) {
					await postgresRankingsRepository.recordBattleResult(
						userId,
						winnerId,
						loserId,
						scores,
						'user'
					);
				}
			}
		}

		// Handle AI judgment update
		if ('aiJudgment' in updates && updates.aiJudgment) {
			await postgresBattleRepository.updateAiJudgment(params.id, userId, updates.aiJudgment);

			// Update rankings based on AI judgment
			const judgment = updates.aiJudgment;
			if (judgment.scores && Object.keys(judgment.scores).length >= 2) {
				const modelIds = Object.keys(judgment.scores);
				const winnerId = judgment.winnerId;
				const loserId = winnerId ? modelIds.find((id) => id !== winnerId) || null : null;

				await postgresRankingsRepository.recordBattleResult(
					userId,
					winnerId,
					loserId,
					judgment.scores,
					'ai'
				);
			}
		}

		// Handle responses update (full replacement)
		if ('responses' in updates) {
			const updated = { ...existing, responses: updates.responses };
			await postgresBattleRepository.update(updated, userId);
		}

		// Handle pinned update
		if ('pinned' in updates) {
			await postgresBattleRepository.updatePinned(params.id, userId, updates.pinned);
		}

		// Handle title update
		if ('title' in updates) {
			await postgresBattleRepository.updateTitle(params.id, userId, updates.title);
		}

		return json({ success: true });
	} catch (err) {
		console.error('Failed to update battle:', err);
		return json(
			{ error: { message: 'Failed to update battle', type: 'db_error' } },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/arena/battles/[id]
 * Soft delete a battle
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	try {
		const existing = await postgresBattleRepository.findById(params.id, locals.session.userId);
		if (!existing) {
			return json({ error: { message: 'Battle not found', type: 'not_found' } }, { status: 404 });
		}

		await postgresBattleRepository.delete(params.id, locals.session.userId);
		return json({ success: true });
	} catch (err) {
		console.error('Failed to delete battle:', err);
		return json(
			{ error: { message: 'Failed to delete battle', type: 'db_error' } },
			{ status: 500 }
		);
	}
};
