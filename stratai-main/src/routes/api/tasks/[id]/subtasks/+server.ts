/**
 * Subtasks API - Create and List Subtasks
 *
 * GET /api/tasks/[id]/subtasks - Get all subtasks for a parent task
 * POST /api/tasks/[id]/subtasks - Create a new subtask
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';
import type { CreateSubtaskInput, SubtaskType } from '$lib/types/tasks';

// Default user ID for POC (will be replaced with auth in Phase 0.4)
const DEFAULT_USER_ID = 'admin';

/**
 * GET /api/tasks/[id]/subtasks
 * List all subtasks for a parent task
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		// Verify parent task exists
		const parent = await postgresTaskRepository.findById(params.id, DEFAULT_USER_ID);
		if (!parent) {
			return json({ error: 'Parent task not found' }, { status: 404 });
		}

		// Check if parent can have subtasks (not a subtask itself)
		const canHaveSubtasks = await postgresTaskRepository.canHaveSubtasks(params.id, DEFAULT_USER_ID);
		if (!canHaveSubtasks) {
			return json({ error: 'This task cannot have subtasks (it is already a subtask)' }, { status: 400 });
		}

		const subtasks = await postgresTaskRepository.getSubtasks(params.id, DEFAULT_USER_ID);
		const count = await postgresTaskRepository.getSubtaskCount(params.id, DEFAULT_USER_ID);

		return json({ subtasks, count });
	} catch (error) {
		console.error('Failed to fetch subtasks:', error);
		return json(
			{ error: 'Failed to fetch subtasks', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/tasks/[id]/subtasks
 * Create a new subtask
 * Body: { title: string, subtaskType?: 'conversation' | 'action', priority?: 'normal' | 'high' }
 */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();

		// Validate required fields
		if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
			return json({ error: 'Title is required' }, { status: 400 });
		}

		// Validate subtaskType if provided
		if (body.subtaskType && !['conversation', 'action'].includes(body.subtaskType)) {
			return json({ error: 'Invalid subtaskType. Must be "conversation" or "action"' }, { status: 400 });
		}

		// Validate priority if provided
		if (body.priority && !['normal', 'high'].includes(body.priority)) {
			return json({ error: 'Invalid priority. Must be "normal" or "high"' }, { status: 400 });
		}

		// Verify parent task exists
		const parent = await postgresTaskRepository.findById(params.id, DEFAULT_USER_ID);
		if (!parent) {
			return json({ error: 'Parent task not found' }, { status: 404 });
		}

		const input: CreateSubtaskInput = {
			title: body.title.trim(),
			parentTaskId: params.id,
			subtaskType: (body.subtaskType as SubtaskType) ?? 'conversation',
			priority: body.priority ?? 'normal'
		};

		const subtask = await postgresTaskRepository.createSubtask(input, DEFAULT_USER_ID);

		return json({ subtask }, { status: 201 });
	} catch (error) {
		console.error('Failed to create subtask:', error);

		// Handle specific errors
		if (error instanceof Error) {
			if (error.message.includes('Parent task not found')) {
				return json({ error: 'Parent task not found' }, { status: 404 });
			}
			if (error.message.includes('Cannot create subtask of a subtask')) {
				return json({ error: 'Cannot create subtask of a subtask (max 1 level)' }, { status: 400 });
			}
		}

		return json(
			{ error: 'Failed to create subtask', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
