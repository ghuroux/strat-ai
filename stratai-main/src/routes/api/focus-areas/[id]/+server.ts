/**
 * Focus Areas API - Individual Operations
 *
 * GET /api/focus-areas/[id] - Get a specific focus area
 * PATCH /api/focus-areas/[id] - Update a focus area
 * DELETE /api/focus-areas/[id] - Delete a focus area
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresFocusAreaRepository } from '$lib/server/persistence/focus-areas-postgres';
import type { UpdateFocusAreaInput } from '$lib/types/focus-areas';

// Default user ID for POC (will be replaced with auth in Phase 0.4)
const DEFAULT_USER_ID = 'admin';

/**
 * GET /api/focus-areas/[id]
 * Returns focus area with task and conversation counts
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const focusArea = await postgresFocusAreaRepository.findById(params.id, DEFAULT_USER_ID);

		if (!focusArea) {
			return json({ error: 'Focus area not found' }, { status: 404 });
		}

		// Get stats
		const taskCount = await postgresFocusAreaRepository.getTaskCount(params.id, DEFAULT_USER_ID);
		const conversationCount = await postgresFocusAreaRepository.getConversationCount(params.id, DEFAULT_USER_ID);

		return json({
			focusArea: {
				...focusArea,
				taskCount,
				conversationCount
			}
		});
	} catch (error) {
		console.error('Failed to fetch focus area:', error);
		return json(
			{ error: 'Failed to fetch focus area', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/focus-areas/[id]
 * Body: { name?, context?, contextDocumentIds?, color?, icon?, orderIndex? }
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();

		// Validate name if provided
		if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
			return json({ error: 'name must be a non-empty string' }, { status: 400 });
		}

		const updates: UpdateFocusAreaInput = {};

		if (body.name !== undefined) updates.name = body.name.trim();
		if (body.context !== undefined) updates.context = body.context;
		if (body.contextDocumentIds !== undefined) updates.contextDocumentIds = body.contextDocumentIds;
		if (body.color !== undefined) updates.color = body.color;
		if (body.icon !== undefined) updates.icon = body.icon;
		if (body.orderIndex !== undefined) updates.orderIndex = body.orderIndex;

		const focusArea = await postgresFocusAreaRepository.update(params.id, updates, DEFAULT_USER_ID);

		if (!focusArea) {
			return json({ error: 'Focus area not found' }, { status: 404 });
		}

		return json({ focusArea });
	} catch (error) {
		console.error('Failed to update focus area:', error);

		// Handle duplicate name error
		if (error instanceof Error && error.message.includes('already exists')) {
			return json({ error: error.message }, { status: 409 });
		}

		return json(
			{ error: 'Failed to update focus area', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/focus-areas/[id]
 * Soft deletes the focus area. Tasks will have their focus_area_id set to NULL.
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const deleted = await postgresFocusAreaRepository.delete(params.id, DEFAULT_USER_ID);

		if (!deleted) {
			return json({ error: 'Focus area not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete focus area:', error);
		return json(
			{ error: 'Failed to delete focus area', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
