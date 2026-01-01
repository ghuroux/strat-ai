/**
 * Areas API - List and Create
 *
 * GET /api/areas - List areas with optional space filter
 * POST /api/areas - Create a new area
 *
 * Renamed from focus-areas - see DESIGN-SPACES-AND-FOCUS-AREAS.md
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresAreaRepository } from '$lib/server/persistence/areas-postgres';
import type { CreateAreaInput } from '$lib/types/areas';

// Default user ID for POC (will be replaced with auth in Phase 0.4)
const DEFAULT_USER_ID = 'admin';

/**
 * GET /api/areas
 * Query params:
 * - spaceId: Filter by space (work, research, etc.)
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const spaceId = url.searchParams.get('spaceId') ?? undefined;

		const areas = await postgresAreaRepository.findAll(DEFAULT_USER_ID, spaceId);

		return json({ areas });
	} catch (error) {
		console.error('Failed to fetch areas:', error);
		return json(
			{
				error: 'Failed to fetch areas',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/areas
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

		const input: CreateAreaInput = {
			spaceId: body.spaceId,
			name: body.name.trim(),
			context: body.context,
			contextDocumentIds: body.contextDocumentIds,
			color: body.color,
			icon: body.icon
		};

		const area = await postgresAreaRepository.create(input, DEFAULT_USER_ID);

		return json({ area }, { status: 201 });
	} catch (error) {
		console.error('Failed to create area:', error);

		// Handle duplicate name error
		if (error instanceof Error && error.message.includes('already exists')) {
			return json({ error: error.message }, { status: 409 });
		}

		// Handle invalid space error
		if (error instanceof Error && error.message.includes('Invalid space')) {
			return json({ error: error.message }, { status: 400 });
		}

		return json(
			{
				error: 'Failed to create area',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
