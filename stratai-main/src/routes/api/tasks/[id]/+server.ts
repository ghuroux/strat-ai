/**
 * Tasks API - Individual Task Operations
 *
 * GET /api/tasks/[id] - Get a single task
 * PATCH /api/tasks/[id] - Update a task
 * DELETE /api/tasks/[id] - Soft delete a task
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';
import type { UpdateTaskInput } from '$lib/types/tasks';

// Default user ID for POC (will be replaced with auth in Phase 0.4)
const DEFAULT_USER_ID = 'admin';

/**
 * GET /api/tasks/[id]
 * Get a single task by ID
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const task = await postgresTaskRepository.findById(params.id, DEFAULT_USER_ID);

		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		return json({ task });
	} catch (error) {
		console.error('Failed to fetch task:', error);
		return json(
			{ error: 'Failed to fetch task', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/tasks/[id]
 * Update task fields
 * Body: { title?, status?, priority?, dueDate?, dueDateType?, completionNotes? }
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();

		const updates: UpdateTaskInput = {};

		if (body.title !== undefined) updates.title = body.title;
		if (body.status !== undefined) updates.status = body.status;
		if (body.priority !== undefined) updates.priority = body.priority;
		if (body.dueDate !== undefined) {
			updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
		}
		if (body.dueDateType !== undefined) {
			updates.dueDateType = body.dueDateType || null;
		}
		if (body.completionNotes !== undefined) updates.completionNotes = body.completionNotes;

		const task = await postgresTaskRepository.update(params.id, updates, DEFAULT_USER_ID);

		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		return json({ task });
	} catch (error) {
		console.error('Failed to update task:', error);
		return json(
			{ error: 'Failed to update task', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/tasks/[id]
 * Soft delete a task
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		// Check if task exists first
		const existing = await postgresTaskRepository.findById(params.id, DEFAULT_USER_ID);

		if (!existing) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		await postgresTaskRepository.delete(params.id, DEFAULT_USER_ID);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete task:', error);
		return json(
			{ error: 'Failed to delete task', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
