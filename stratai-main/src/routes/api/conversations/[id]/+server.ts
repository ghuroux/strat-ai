import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Conversation } from '$lib/types/chat';
import { postgresConversationRepository } from '$lib/server/persistence';

/**
 * GET /api/conversations/[id]
 * Get a single conversation by ID
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	// Verify session
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const conversation = await postgresConversationRepository.findById(params.id, userId);

		if (!conversation) {
			return json(
				{ error: { message: 'Conversation not found', type: 'not_found' } },
				{ status: 404 }
			);
		}

		return json(conversation);
	} catch (err) {
		console.error('Failed to fetch conversation:', err);
		return json(
			{ error: { message: 'Failed to fetch conversation', type: 'db_error' } },
			{ status: 500 }
		);
	}
};

/**
 * PUT /api/conversations/[id]
 * Update a conversation
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	// Verify session
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const updates: Partial<Conversation> = await request.json();

		// Fetch existing conversation
		const existing = await postgresConversationRepository.findById(params.id, userId);
		if (!existing) {
			return json(
				{ error: { message: 'Conversation not found', type: 'not_found' } },
				{ status: 404 }
			);
		}

		// Merge updates with existing conversation
		const updated: Conversation = {
			...existing,
			...updates,
			id: params.id, // Ensure ID can't be changed
			updatedAt: Date.now()
		};

		await postgresConversationRepository.update(updated, userId);
		return json({ success: true });
	} catch (err) {
		console.error('Failed to update conversation:', err);
		return json(
			{ error: { message: 'Failed to update conversation', type: 'db_error' } },
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/conversations/[id]
 * Partial update - more efficient for updating single fields
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	// Verify session
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const updates: Partial<Conversation> = await request.json();

		// Fetch existing conversation
		const existing = await postgresConversationRepository.findById(params.id, userId);
		if (!existing) {
			return json(
				{ error: { message: 'Conversation not found', type: 'not_found' } },
				{ status: 404 }
			);
		}

		// Merge updates with existing conversation
		const updated: Conversation = {
			...existing,
			...updates,
			id: params.id, // Ensure ID can't be changed
			updatedAt: Date.now()
		};

		await postgresConversationRepository.update(updated, userId);
		return json({ success: true });
	} catch (err) {
		console.error('Failed to update conversation:', err);
		return json(
			{ error: { message: 'Failed to update conversation', type: 'db_error' } },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/conversations/[id]
 * Delete a conversation (soft delete)
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	// Verify session
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		// Verify conversation exists
		const existing = await postgresConversationRepository.findById(params.id, userId);
		if (!existing) {
			return json(
				{ error: { message: 'Conversation not found', type: 'not_found' } },
				{ status: 404 }
			);
		}

		await postgresConversationRepository.delete(params.id, userId);
		return json({ success: true });
	} catch (err) {
		console.error('Failed to delete conversation:', err);
		return json(
			{ error: { message: 'Failed to delete conversation', type: 'db_error' } },
			{ status: 500 }
		);
	}
};
