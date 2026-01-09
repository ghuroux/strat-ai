/**
 * Tasks API - Conversation Linking
 *
 * POST /api/tasks/[id]/link - Link a conversation to a task
 * DELETE /api/tasks/[id]/link - Unlink a conversation from a task
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';

/**
 * POST /api/tasks/[id]/link
 * Link a conversation to a task
 * Body: { conversationId: string }
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const body = await request.json();
		const { conversationId } = body;

		if (!conversationId) {
			return json({ error: 'conversationId is required' }, { status: 400 });
		}

		// Check if task exists
		const task = await postgresTaskRepository.findById(params.id, userId);
		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		// Link the conversation
		await postgresTaskRepository.linkConversation(params.id, conversationId, userId);

		// Return updated task
		const updatedTask = await postgresTaskRepository.findById(params.id, userId);

		return json({ task: updatedTask });
	} catch (error) {
		console.error('Failed to link conversation:', error);
		return json(
			{ error: 'Failed to link conversation', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/tasks/[id]/link
 * Unlink a conversation from a task
 * Body: { conversationId: string }
 */
export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const body = await request.json();
		const { conversationId } = body;

		if (!conversationId) {
			return json({ error: 'conversationId is required' }, { status: 400 });
		}

		// Check if task exists
		const task = await postgresTaskRepository.findById(params.id, userId);
		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		// Unlink the conversation
		await postgresTaskRepository.unlinkConversation(params.id, conversationId, userId);

		// Return updated task
		const updatedTask = await postgresTaskRepository.findById(params.id, userId);

		return json({ task: updatedTask });
	} catch (error) {
		console.error('Failed to unlink conversation:', error);
		return json(
			{ error: 'Failed to unlink conversation', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
