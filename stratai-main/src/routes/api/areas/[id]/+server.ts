/**
 * Areas API - Individual Operations
 *
 * GET /api/areas/[id] - Get a specific area
 * PATCH /api/areas/[id] - Update an area
 * DELETE /api/areas/[id] - Delete an area (General areas cannot be deleted)
 *
 * Renamed from focus-areas - see DESIGN-SPACES-AND-FOCUS-AREAS.md
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresAreaRepository } from '$lib/server/persistence/areas-postgres';
import type { UpdateAreaInput } from '$lib/types/areas';

// Default user ID for POC (will be replaced with auth in Phase 0.4)
const DEFAULT_USER_ID = 'admin';

/**
 * GET /api/areas/[id]
 * Returns area with task and conversation counts
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const area = await postgresAreaRepository.findById(params.id, DEFAULT_USER_ID);

		if (!area) {
			return json({ error: 'Area not found' }, { status: 404 });
		}

		// Get stats
		const taskCount = await postgresAreaRepository.getTaskCount(params.id, DEFAULT_USER_ID);
		const conversationCount = await postgresAreaRepository.getConversationCount(
			params.id,
			DEFAULT_USER_ID
		);

		return json({
			area: {
				...area,
				taskCount,
				conversationCount
			}
		});
	} catch (error) {
		console.error('Failed to fetch area:', error);
		return json(
			{ error: 'Failed to fetch area', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/areas/[id]
 * Body: { name?, context?, contextDocumentIds?, color?, icon?, orderIndex? }
 * Note: General areas cannot have their name changed
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();

		// Validate name if provided
		if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
			return json({ error: 'name must be a non-empty string' }, { status: 400 });
		}

		const updates: UpdateAreaInput = {};

		if (body.name !== undefined) updates.name = body.name.trim();
		if (body.context !== undefined) updates.context = body.context;
		if (body.contextDocumentIds !== undefined) updates.contextDocumentIds = body.contextDocumentIds;
		if (body.color !== undefined) updates.color = body.color;
		if (body.icon !== undefined) updates.icon = body.icon;
		if (body.orderIndex !== undefined) updates.orderIndex = body.orderIndex;

		const area = await postgresAreaRepository.update(params.id, updates, DEFAULT_USER_ID);

		if (!area) {
			return json({ error: 'Area not found' }, { status: 404 });
		}

		return json({ area });
	} catch (error) {
		console.error('Failed to update area:', error);

		// Handle duplicate name error
		if (error instanceof Error && error.message.includes('already exists')) {
			return json({ error: error.message }, { status: 409 });
		}

		// Handle General area rename attempt
		if (error instanceof Error && error.message.includes('Cannot rename the General area')) {
			return json({ error: error.message }, { status: 400 });
		}

		return json(
			{ error: 'Failed to update area', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/areas/[id]
 * Soft deletes the area. General areas cannot be deleted.
 *
 * Query params:
 * - deleteContent=true: Delete all conversations and tasks in this area
 * - deleteContent=false (default): Move conversations to General, unlink tasks
 */
export const DELETE: RequestHandler = async ({ params, url }) => {
	try {
		// Parse deleteContent option from query string
		const deleteContent = url.searchParams.get('deleteContent') === 'true';

		const deleted = await postgresAreaRepository.delete(params.id, DEFAULT_USER_ID, {
			deleteContent
		});

		if (!deleted) {
			return json({ error: 'Area not found' }, { status: 404 });
		}

		return json({ success: true, deleteContent });
	} catch (error) {
		console.error('Failed to delete area:', error);

		// Handle General area delete attempt
		if (error instanceof Error && error.message.includes('Cannot delete the General area')) {
			return json({ error: error.message }, { status: 400 });
		}

		// Handle missing General area
		if (error instanceof Error && error.message.includes('Cannot find General area')) {
			return json({ error: error.message }, { status: 500 });
		}

		return json(
			{ error: 'Failed to delete area', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
