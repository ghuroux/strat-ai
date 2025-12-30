/**
 * Focus Areas API - List and Create
 *
 * GET /api/focus-areas - List focus areas with optional space filter
 * POST /api/focus-areas - Create a new focus area
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresFocusAreaRepository } from '$lib/server/persistence/focus-areas-postgres';
import type { CreateFocusAreaInput } from '$lib/types/focus-areas';

// Default user ID for POC (will be replaced with auth in Phase 0.4)
const DEFAULT_USER_ID = 'admin';

/**
 * GET /api/focus-areas
 * Query params:
 * - spaceId: Filter by space (work, research, etc.)
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const spaceId = url.searchParams.get('spaceId') ?? undefined;

		const focusAreas = await postgresFocusAreaRepository.findAll(DEFAULT_USER_ID, spaceId);

		return json({ focusAreas });
	} catch (error) {
		console.error('Failed to fetch focus areas:', error);
		return json(
			{ error: 'Failed to fetch focus areas', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/focus-areas
 * Body: { spaceId, name, context?, contextDocumentIds?, color?, icon? }
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate required fields
		if (!body.spaceId) {
			return json({ error: 'spaceId is required' }, { status: 400 });
		}
		if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
			return json({ error: 'name is required and must be a non-empty string' }, { status: 400 });
		}

		const input: CreateFocusAreaInput = {
			spaceId: body.spaceId,
			name: body.name.trim(),
			context: body.context,
			contextDocumentIds: body.contextDocumentIds,
			color: body.color,
			icon: body.icon
		};

		const focusArea = await postgresFocusAreaRepository.create(input, DEFAULT_USER_ID);

		return json({ focusArea }, { status: 201 });
	} catch (error) {
		console.error('Failed to create focus area:', error);

		// Handle duplicate name error
		if (error instanceof Error && error.message.includes('already exists')) {
			return json({ error: error.message }, { status: 409 });
		}

		// Handle invalid space error
		if (error instanceof Error && error.message.includes('Invalid space')) {
			return json({ error: error.message }, { status: 400 });
		}

		return json(
			{ error: 'Failed to create focus area', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
