import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Conversation } from '$lib/types/chat';
import {
	postgresConversationRepository,
	getConversationsPaginated,
	searchConversations
} from '$lib/server/persistence';

/**
 * GET /api/conversations
 * List all conversations with optional pagination and search
 *
 * Query params:
 * - q: Search query (optional)
 * - offset: Pagination offset (default: 0)
 * - limit: Pagination limit (default: 50, max: 100)
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// Verify session
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const query = url.searchParams.get('q');
		const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10));
		const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));

		if (query) {
			// Search mode
			const conversations = await searchConversations(userId, query, limit);
			return json({ conversations, total: conversations.length });
		}

		// Paginated list mode
		const result = await getConversationsPaginated(userId, offset, limit);
		return json(result);
	} catch (err) {
		console.error('Failed to fetch conversations:', err);
		return json(
			{ error: { message: 'Failed to fetch conversations', type: 'db_error' } },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/conversations
 * Create a new conversation
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Verify session
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const conversation: Conversation = await request.json();

		// Validate required fields
		if (!conversation.id || !conversation.title || !conversation.model) {
			return json(
				{ error: { message: 'Missing required fields: id, title, model', type: 'validation_error' } },
				{ status: 400 }
			);
		}

		// Ensure timestamps
		const now = Date.now();
		conversation.createdAt = conversation.createdAt || now;
		conversation.updatedAt = conversation.updatedAt || now;
		conversation.messages = conversation.messages || [];

		await postgresConversationRepository.create(conversation, userId);
		return json({ success: true, id: conversation.id }, { status: 201 });
	} catch (err) {
		console.error('Failed to create conversation:', err);
		return json(
			{ error: { message: 'Failed to create conversation', type: 'db_error' } },
			{ status: 500 }
		);
	}
};
