/**
 * Pages Discussion API
 *
 * POST /api/pages/[id]/discussion - Create or get existing discussion conversation
 *
 * Creates a conversation linked to the page with relationship='discussion'.
 * Returns the existing discussion conversation if one already exists.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';
import { postgresConversationRepository } from '$lib/server/persistence/postgres';
import type { Conversation } from '$lib/types/chat';

/**
 * POST /api/pages/[id]/discussion
 * Creates or retrieves the discussion conversation for a page
 *
 * Returns: { conversationId: string, isNew: boolean }
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { id: pageId } = params;

	try {
		// Verify page exists and user has access
		const page = await postgresPageRepository.findById(pageId, userId);
		if (!page) {
			return json({ error: 'Page not found' }, { status: 404 });
		}

		// Check if a discussion conversation already exists for this page
		const existingConversations = await postgresPageRepository.getConversations(pageId, userId);
		const discussionLink = existingConversations.find(c => c.relationship === 'discussion');

		if (discussionLink) {
			// Return existing discussion conversation
			return json({
				conversationId: discussionLink.conversationId,
				isNew: false
			});
		}

		// Create a new conversation for discussing this page
		const conversationId = crypto.randomUUID();
		const now = Date.now();

		const conversation: Conversation = {
			id: conversationId,
			title: `Discussion: ${page.title}`,
			model: 'claude-sonnet-4-20250514', // Default to Sonnet for discussions
			messages: [],
			pinned: false,
			createdAt: now,
			updatedAt: now,
			spaceId: null, // Page discussions don't need to be in a space/area context
			areaId: null,
			taskId: null,
			tags: ['page-discussion']
		};

		// Create the conversation
		await postgresConversationRepository.create(conversation, userId);

		// Link it to the page with 'discussion' relationship
		await postgresPageRepository.linkConversation(pageId, conversationId, 'discussion', userId);

		return json({
			conversationId,
			isNew: true
		}, { status: 201 });
	} catch (error) {
		console.error('Failed to create/get discussion conversation:', error);
		return json(
			{
				error: 'Failed to create discussion',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * GET /api/pages/[id]/discussion
 * Get the discussion conversation for a page (if exists)
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { id: pageId } = params;

	try {
		// Verify page exists
		const page = await postgresPageRepository.findById(pageId, userId);
		if (!page) {
			return json({ error: 'Page not found' }, { status: 404 });
		}

		// Check if a discussion conversation exists
		const existingConversations = await postgresPageRepository.getConversations(pageId, userId);
		const discussionLink = existingConversations.find(c => c.relationship === 'discussion');

		if (discussionLink) {
			return json({
				conversationId: discussionLink.conversationId,
				exists: true
			});
		}

		return json({
			conversationId: null,
			exists: false
		});
	} catch (error) {
		console.error('Failed to get discussion conversation:', error);
		return json(
			{
				error: 'Failed to get discussion',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
