/**
 * Spaces API - List and Create
 *
 * GET /api/spaces - List all spaces (system + custom)
 * POST /api/spaces - Create a new custom space
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresSpaceRepository } from '$lib/server/persistence/spaces-postgres';
import type { CreateSpaceInput } from '$lib/types/spaces';

// Default user ID for POC (will be replaced with auth in Phase 0.4)
const DEFAULT_USER_ID = 'admin';

/**
 * GET /api/spaces
 * Returns all spaces (system + custom) for the user
 */
export const GET: RequestHandler = async () => {
	try {
		const spaces = await postgresSpaceRepository.findAll(DEFAULT_USER_ID);
		return json({ spaces });
	} catch (error) {
		console.error('Failed to fetch spaces:', error);
		return json(
			{
				error: 'Failed to fetch spaces',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/spaces
 * Body: { name, context?, contextDocumentIds?, color?, icon? }
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate required fields
		if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
			return json({ error: 'name is required and must be a non-empty string' }, { status: 400 });
		}

		const input: CreateSpaceInput = {
			name: body.name.trim(),
			context: body.context,
			contextDocumentIds: body.contextDocumentIds,
			color: body.color,
			icon: body.icon
		};

		const space = await postgresSpaceRepository.create(input, DEFAULT_USER_ID);

		return json({ space }, { status: 201 });
	} catch (error) {
		console.error('Failed to create space:', error);

		// Handle specific errors
		if (error instanceof Error) {
			if (error.message.includes('already exists')) {
				return json({ error: error.message }, { status: 409 });
			}
			if (error.message.includes('Maximum') || error.message.includes('reserved')) {
				return json({ error: error.message }, { status: 400 });
			}
		}

		return json(
			{
				error: 'Failed to create space',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
