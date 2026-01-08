import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markConversationAsViewed } from '$lib/server/persistence/postgres';

/**
 * POST /api/conversations/[id]/viewed
 * Mark a conversation as viewed by the current user
 * Updates last_viewed_at timestamp
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	const conversationId = params.id;

	if (!locals.session?.userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		await markConversationAsViewed(conversationId, locals.session.userId);
		return json({ success: true });
	} catch (error) {
		console.error('Failed to mark conversation as viewed:', error);
		return json({ error: 'Failed to mark as viewed' }, { status: 500 });
	}
};
