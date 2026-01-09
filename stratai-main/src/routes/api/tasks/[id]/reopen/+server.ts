/**
 * Tasks API - Reopen Task
 *
 * POST /api/tasks/[id]/reopen - Reopen a completed task
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';

/**
 * POST /api/tasks/[id]/reopen
 * Reopen a completed task (set status back to active)
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;

		// Check if task exists first
		const existing = await postgresTaskRepository.findById(params.id, userId);

		if (!existing) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		if (existing.status !== 'completed') {
			return json({ error: 'Task is not completed' }, { status: 400 });
		}

		const task = await postgresTaskRepository.reopen(params.id, userId);

		if (!task) {
			return json({ error: 'Failed to reopen task' }, { status: 500 });
		}

		return json({ task });
	} catch (error) {
		console.error('Failed to reopen task:', error);
		return json(
			{ error: 'Failed to reopen task', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
