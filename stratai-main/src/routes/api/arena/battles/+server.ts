import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ArenaBattle } from '$lib/stores/arena.svelte';
import { postgresBattleRepository } from '$lib/server/persistence';

/**
 * GET /api/arena/battles
 * List battles with pagination
 *
 * Query params:
 * - limit: Number of battles (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 * - status: Filter by status (optional)
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
		const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));
		const status = url.searchParams.get('status');

		let battles: ArenaBattle[];
		if (status) {
			battles = await postgresBattleRepository.findByStatus(
				userId,
				status as ArenaBattle['status']
			);
		} else {
			battles = await postgresBattleRepository.findAll(userId, limit, offset);
		}

		const total = await postgresBattleRepository.count(userId);

		return json({ battles, total, limit, offset });
	} catch (err) {
		console.error('Failed to fetch battles:', err);
		return json(
			{ error: { message: 'Failed to fetch battles', type: 'db_error' } },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/arena/battles
 * Create a new battle
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const battle: ArenaBattle = await request.json();

		// Validate required fields
		if (!battle.id || !battle.prompt || !battle.models || battle.models.length < 2) {
			return json(
				{
					error: {
						message: 'Missing required fields: id, prompt, models (min 2)',
						type: 'validation_error'
					}
				},
				{ status: 400 }
			);
		}

		// Ensure defaults
		battle.status = battle.status || 'pending';
		battle.createdAt = battle.createdAt || Date.now();
		battle.responses = battle.responses || [];

		await postgresBattleRepository.create(battle, userId);
		return json({ success: true, id: battle.id }, { status: 201 });
	} catch (err) {
		console.error('Failed to create battle:', err);
		return json(
			{ error: { message: 'Failed to create battle', type: 'db_error' } },
			{ status: 500 }
		);
	}
};
