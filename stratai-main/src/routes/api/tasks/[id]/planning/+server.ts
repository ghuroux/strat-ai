/**
 * Planning Data API - Update plan mode state for a task
 *
 * PATCH /api/tasks/[id]/planning - Update planning data (phase, proposed subtasks)
 *
 * This endpoint persists Plan Mode state to survive page refreshes.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';
import type { PlanningData, PlanModePhase } from '$lib/types/tasks';

/**
 * PATCH /api/tasks/[id]/planning
 * Update planning data for a task
 * Body: { planningData: PlanningData | null }
 * - Pass PlanningData to update the planning state
 * - Pass null to clear planning data (when completing or canceling plan mode)
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const body = await request.json();

		// Debug logging
		console.log(`\n[Planning API] PATCH /api/tasks/${params.id}/planning`);
		console.log('[Planning API] Body planningData:', body.planningData ? `phase=${body.planningData.phase}` : 'NULL');

		// Validate body structure
		if (!('planningData' in body)) {
			return json({ error: 'planningData field is required' }, { status: 400 });
		}

		const { planningData } = body as { planningData: PlanningData | null };

		// If planningData is provided (not null), validate its structure
		if (planningData !== null) {
			// Validate phase
			const validPhases: PlanModePhase[] = ['eliciting', 'proposing', 'confirming'];
			if (!validPhases.includes(planningData.phase)) {
				return json(
					{ error: `Invalid phase. Must be one of: ${validPhases.join(', ')}` },
					{ status: 400 }
				);
			}

			// Validate proposedSubtasks is an array
			if (!Array.isArray(planningData.proposedSubtasks)) {
				return json({ error: 'proposedSubtasks must be an array' }, { status: 400 });
			}

			// Validate each proposed subtask
			for (const subtask of planningData.proposedSubtasks) {
				if (!subtask.id || !subtask.title || !subtask.type) {
					return json(
						{ error: 'Each proposed subtask must have id, title, and type' },
						{ status: 400 }
					);
				}
				if (!['conversation', 'action'].includes(subtask.type)) {
					return json(
						{ error: 'Subtask type must be "conversation" or "action"' },
						{ status: 400 }
					);
				}
			}

			// Validate startedAt is a valid ISO string if provided
			if (planningData.startedAt && isNaN(Date.parse(planningData.startedAt))) {
				return json({ error: 'startedAt must be a valid ISO date string' }, { status: 400 });
			}
		}

		// Verify task exists
		const existingTask = await postgresTaskRepository.findById(params.id, userId);
		if (!existingTask) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		// Cannot update planning data on a subtask
		if (existingTask.parentTaskId) {
			return json({ error: 'Cannot use plan mode on a subtask' }, { status: 400 });
		}

		// Update planning data
		const task = await postgresTaskRepository.updatePlanningData(
			params.id,
			planningData,
			userId
		);

		if (!task) {
			return json({ error: 'Failed to update planning data' }, { status: 500 });
		}

		return json({ task });
	} catch (error) {
		console.error('Failed to update planning data:', error);
		return json(
			{
				error: 'Failed to update planning data',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * GET /api/tasks/[id]/planning
 * Get current planning data for a task (convenience endpoint)
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const task = await postgresTaskRepository.findById(params.id, userId);

		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		return json({
			planningData: task.planningData ?? null,
			taskId: task.id,
			taskTitle: task.title,
			status: task.status
		});
	} catch (error) {
		console.error('Failed to get planning data:', error);
		return json(
			{
				error: 'Failed to get planning data',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
