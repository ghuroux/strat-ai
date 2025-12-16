/**
 * Tasks API - Complete Task
 *
 * POST /api/tasks/[id]/complete - Mark a task as completed with optional notes
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';

// Default user ID for POC (will be replaced with auth in Phase 0.4)
const DEFAULT_USER_ID = 'admin';

/**
 * POST /api/tasks/[id]/complete
 * Mark a task as completed
 * Body: { notes?: string }
 */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		// Check if task exists first
		const existing = await postgresTaskRepository.findById(params.id, DEFAULT_USER_ID);

		if (!existing) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		if (existing.status === 'completed') {
			return json({ error: 'Task is already completed' }, { status: 400 });
		}

		// Parse optional notes from body
		let notes: string | undefined;
		try {
			const body = await request.json();
			notes = body.notes;
		} catch {
			// No body or invalid JSON - that's fine, notes are optional
		}

		const task = await postgresTaskRepository.complete(params.id, DEFAULT_USER_ID, notes);

		if (!task) {
			return json({ error: 'Failed to complete task' }, { status: 500 });
		}

		return json({ task });
	} catch (error) {
		console.error('Failed to complete task:', error);
		return json(
			{ error: 'Failed to complete task', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
