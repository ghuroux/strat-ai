/**
 * Tasks API - Conversation Linking
 *
 * POST /api/tasks/[id]/link - Link a conversation to a task
 * DELETE /api/tasks/[id]/link - Unlink a conversation from a task
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';

// Default user ID for POC (will be replaced with auth in Phase 0.4)
const DEFAULT_USER_ID = 'admin';

/**
 * POST /api/tasks/[id]/link
 * Link a conversation to a task
 * Body: { conversationId: string }
 */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const { conversationId } = body;

		if (!conversationId) {
			return json({ error: 'conversationId is required' }, { status: 400 });
		}

		// Check if task exists
		const task = await postgresTaskRepository.findById(params.id, DEFAULT_USER_ID);
		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		// Link the conversation
		await postgresTaskRepository.linkConversation(params.id, conversationId, DEFAULT_USER_ID);

		// Return updated task
		const updatedTask = await postgresTaskRepository.findById(params.id, DEFAULT_USER_ID);

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
export const DELETE: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();
		const { conversationId } = body;

		if (!conversationId) {
			return json({ error: 'conversationId is required' }, { status: 400 });
		}

		// Check if task exists
		const task = await postgresTaskRepository.findById(params.id, DEFAULT_USER_ID);
		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		// Unlink the conversation
		await postgresTaskRepository.unlinkConversation(params.id, conversationId, DEFAULT_USER_ID);

		// Return updated task
		const updatedTask = await postgresTaskRepository.findById(params.id, DEFAULT_USER_ID);

		return json({ task: updatedTask });
	} catch (error) {
		console.error('Failed to unlink conversation:', error);
		return json(
			{ error: 'Failed to unlink conversation', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
