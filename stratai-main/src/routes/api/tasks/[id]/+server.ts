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
import { sendTaskAssignmentNotification } from '$lib/server/email/task-notifications';

/**
 * GET /api/tasks/[id]
 * Get a single task by ID
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
 * Body: { title?, status?, priority?, areaId?, dueDate?, dueDateType?, completionNotes? }
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const body = await request.json();

		// Validate: subtasks cannot have 'planning' status
		if (body.status === 'planning') {
			const existingTask = await postgresTaskRepository.findById(params.id, userId);
			if (existingTask?.parentTaskId) {
				return json({ error: 'Subtasks cannot enter planning mode' }, { status: 400 });
			}
		}

		const updates: UpdateTaskInput = {};

		if (body.title !== undefined) updates.title = body.title;
		if (body.status !== undefined) updates.status = body.status;
		if (body.priority !== undefined) updates.priority = body.priority;
		if (body.areaId !== undefined) {
			updates.areaId = body.areaId || null; // empty string becomes null
		}
		if (body.dueDate !== undefined) {
			updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
		}
		if (body.dueDateType !== undefined) {
			updates.dueDateType = body.dueDateType || null;
		}
		if (body.estimatedEffort !== undefined) {
			updates.estimatedEffort = body.estimatedEffort || null;
		}
		if (body.completionNotes !== undefined) updates.completionNotes = body.completionNotes;
		if (body.description !== undefined) updates.description = body.description;
		if (body.staleDismissedAt !== undefined) {
			updates.staleDismissedAt = body.staleDismissedAt ? new Date(body.staleDismissedAt) : null;
		}
		if (body.approachChosenAt !== undefined) {
			updates.approachChosenAt = body.approachChosenAt ? new Date(body.approachChosenAt) : null;
		}
		if (body.assigneeId !== undefined) {
			updates.assigneeId = body.assigneeId || null; // empty string becomes null
		}

		const task = await postgresTaskRepository.update(params.id, updates, userId);

		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		// Fire-and-forget: send assignment notification if assignee changed to someone else
		if (updates.assigneeId && updates.assigneeId !== userId && task.assigneeId) {
			sendTaskAssignmentNotification({
				task, assigneeId: task.assigneeId, assignerId: userId,
				orgId: locals.session.organizationId
			}).catch(console.error);
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
 * Soft delete a task with optional cascade
 * Query params:
 * - deleteConversations: 'true' to also delete linked conversations (default: false)
 *
 * Subtasks are ALWAYS deleted (cascade) - orphaned subtasks make no sense.
 */
export const DELETE: RequestHandler = async ({ params, url, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const deleteConversations = url.searchParams.get('deleteConversations') === 'true';

		// Check if task exists first
		const existing = await postgresTaskRepository.findById(params.id, userId);

		if (!existing) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		// Always cascade delete subtasks (orphaned subtasks have no meaning)
		const deletedSubtaskCount = await postgresTaskRepository.deleteSubtasks(params.id, userId);

		// Optionally delete linked conversations
		let deletedConversationCount = 0;
		if (deleteConversations && existing.linkedConversationIds?.length > 0) {
			// Import conversation repository dynamically to avoid circular deps
			const { postgresConversationRepository } = await import('$lib/server/persistence/postgres');
			for (const convId of existing.linkedConversationIds) {
				await postgresConversationRepository.delete(convId, userId);
				deletedConversationCount++;
			}
		}

		// Delete the task itself
		await postgresTaskRepository.delete(params.id, userId);

		return json({
			success: true,
			deletedSubtasks: deletedSubtaskCount,
			deletedConversations: deletedConversationCount
		});
	} catch (error) {
		console.error('Failed to delete task:', error);
		return json(
			{ error: 'Failed to delete task', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
