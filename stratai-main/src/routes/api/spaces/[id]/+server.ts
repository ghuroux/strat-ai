/**
 * Spaces API - Individual Operations
 *
 * GET /api/spaces/[id] - Get a specific space
 * PATCH /api/spaces/[id] - Update a space
 * DELETE /api/spaces/[id] - Delete a custom space
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresSpaceRepository } from '$lib/server/persistence/spaces-postgres';
import type { UpdateSpaceInput } from '$lib/types/spaces';

// Default user ID for POC (will be replaced with auth in Phase 0.4)
const DEFAULT_USER_ID = 'admin';

/**
 * GET /api/spaces/[id]
 * Returns the space
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const space = await postgresSpaceRepository.findById(params.id, DEFAULT_USER_ID);

		if (!space) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		return json({ space });
	} catch (error) {
		console.error('Failed to fetch space:', error);
		return json(
			{
				error: 'Failed to fetch space',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/spaces/[id]
 * Body: { name?, context?, contextDocumentIds?, color?, icon?, orderIndex? }
 *
 * Note: System spaces only allow context and contextDocumentIds updates
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();

		// Validate name if provided
		if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
			return json({ error: 'name must be a non-empty string' }, { status: 400 });
		}

		const updates: UpdateSpaceInput = {};

		if (body.name !== undefined) updates.name = body.name.trim();
		if (body.context !== undefined) updates.context = body.context;
		if (body.contextDocumentIds !== undefined) updates.contextDocumentIds = body.contextDocumentIds;
		if (body.color !== undefined) updates.color = body.color;
		if (body.icon !== undefined) updates.icon = body.icon;
		if (body.orderIndex !== undefined) updates.orderIndex = body.orderIndex;

		const space = await postgresSpaceRepository.update(params.id, updates, DEFAULT_USER_ID);

		if (!space) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		return json({ space });
	} catch (error) {
		console.error('Failed to update space:', error);

		// Handle specific errors
		if (error instanceof Error) {
			if (error.message.includes('already exists')) {
				return json({ error: error.message }, { status: 409 });
			}
			if (
				error.message.includes('Cannot modify') ||
				error.message.includes('Cannot use reserved')
			) {
				return json({ error: error.message }, { status: 400 });
			}
		}

		return json(
			{
				error: 'Failed to update space',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/spaces/[id]
 * Soft deletes a custom space. System spaces cannot be deleted.
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const deleted = await postgresSpaceRepository.delete(params.id, DEFAULT_USER_ID);

		if (!deleted) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete space:', error);

		// Handle cannot delete system space
		if (error instanceof Error && error.message.includes('Cannot delete system')) {
			return json({ error: error.message }, { status: 400 });
		}

		return json(
			{
				error: 'Failed to delete space',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
