/**
 * Related Tasks API
 *
 * GET /api/tasks/[id]/related - List tasks related to this task
 * POST /api/tasks/[id]/related - Link a related task
 * DELETE /api/tasks/[id]/related?targetTaskId= - Unlink a related task
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';
import type { TaskRelationshipType } from '$lib/types/tasks';

/**
 * GET /api/tasks/[id]/related
 * List all tasks related to this task (both outgoing and incoming relationships)
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const { id: taskId } = params;

		// Verify task exists
		const task = await postgresTaskRepository.findById(taskId, userId);
		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		const relatedTasks = await postgresTaskRepository.getRelatedTasks(taskId, userId);

		// Return with task summaries
		const summaries = relatedTasks.map((rt) => ({
			id: rt.task.id,
			title: rt.task.title,
			status: rt.task.status,
			priority: rt.task.priority,
			color: rt.task.color,
			contextSummary: rt.task.contextSummary,
			relationshipType: rt.relationshipType,
			direction: rt.direction
		}));

		return json({ relatedTasks: summaries });
	} catch (error) {
		console.error('Failed to fetch related tasks:', error);
		return json(
			{
				error: 'Failed to fetch related tasks',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/tasks/[id]/related
 * Link a task as related to this task
 * Body: { targetTaskId, relationshipType? }
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const { id: sourceTaskId } = params;
		const body = await request.json();

		const { targetTaskId, relationshipType } = body;

		if (!targetTaskId) {
			return json({ error: 'targetTaskId is required' }, { status: 400 });
		}

		// Validate relationshipType if provided
		const validTypes: TaskRelationshipType[] = ['related', 'blocks', 'depends_on', 'informs'];
		if (relationshipType && !validTypes.includes(relationshipType)) {
			return json(
				{ error: `Invalid relationshipType. Must be one of: ${validTypes.join(', ')}` },
				{ status: 400 }
			);
		}

		// Cannot relate task to itself
		if (sourceTaskId === targetTaskId) {
			return json({ error: 'Cannot relate a task to itself' }, { status: 400 });
		}

		await postgresTaskRepository.linkRelatedTask(
			sourceTaskId,
			targetTaskId,
			relationshipType ?? 'related',
			userId
		);

		return json({ success: true }, { status: 201 });
	} catch (error) {
		console.error('Failed to link related task:', error);

		// Handle specific errors
		if (error instanceof Error && error.message.includes('not found')) {
			return json({ error: error.message }, { status: 404 });
		}

		return json(
			{
				error: 'Failed to link related task',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/tasks/[id]/related?targetTaskId=
 * Unlink a related task
 */
export const DELETE: RequestHandler = async ({ params, url, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const { id: sourceTaskId } = params;
		const targetTaskId = url.searchParams.get('targetTaskId');

		if (!targetTaskId) {
			return json({ error: 'targetTaskId query parameter is required' }, { status: 400 });
		}

		await postgresTaskRepository.unlinkRelatedTask(sourceTaskId, targetTaskId, userId);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to unlink related task:', error);

		// Handle specific errors
		if (error instanceof Error && error.message.includes('not found')) {
			return json({ error: error.message }, { status: 404 });
		}

		return json(
			{
				error: 'Failed to unlink related task',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
