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
import { postgresSpaceMembershipsRepository } from '$lib/server/persistence';
import { resolveSpaceId, resolveSpaceIdAccessible } from '$lib/server/persistence/spaces-postgres';
import type { CreateAreaInput } from '$lib/types/areas';

/**
 * GET /api/areas
 * Query params:
 * - spaceId: Filter by space ID or slug (resolved to proper ID)
 *
 * When spaceId is provided, returns all areas the user can access (including shared areas).
 * When no spaceId, returns only areas the user owns (legacy behavior).
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const spaceIdParam = url.searchParams.get('spaceId') ?? undefined;

		// Resolve space identifier (slug or ID) to proper ID
		let resolvedSpaceId: string | undefined;
		if (spaceIdParam) {
			const resolved = await resolveSpaceId(spaceIdParam, userId);
			if (!resolved) {
				return json({ error: `Space not found: ${spaceIdParam}` }, { status: 404 });
			}
			resolvedSpaceId = resolved;
		}

		// Use findAllAccessible when filtering by space (includes shared areas)
		// Use findAll when no spaceId filter (user's own areas only)
		const areas = resolvedSpaceId
			? await postgresAreaRepository.findAllAccessible(userId, resolvedSpaceId)
			: await postgresAreaRepository.findAll(userId);

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
 * Note: spaceId can be a slug or proper ID - it will be resolved
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const body = await request.json();

		// Validate required fields
		if (!body.spaceId) {
			return json({ error: 'spaceId is required' }, { status: 400 });
		}
		if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
			return json({ error: 'name is required and must be a non-empty string' }, { status: 400 });
		}

		// Resolve space identifier to proper ID
		// Use accessible resolver to support both owned and shared spaces
		const resolvedSpaceId = await resolveSpaceIdAccessible(body.spaceId, userId);
		if (!resolvedSpaceId) {
			return json({ error: `Space not found or access denied: ${body.spaceId}` }, { status: 404 });
		}

		// Phase 7: Check user's role in the space (ownership or membership)
		const spaceAccess = await postgresSpaceMembershipsRepository.canAccessSpace(userId, resolvedSpaceId);
		if (!spaceAccess.hasAccess) {
			// This shouldn't happen if resolveSpaceIdAccessible worked, but safety check
			return json({ error: 'Access denied to this space' }, { status: 403 });
		}

		// Guests cannot create areas - they only have precision access to shared areas
		if (spaceAccess.role === 'guest') {
			return json(
				{
					error: 'Guests cannot create areas',
					details: 'Contact a space admin to upgrade your access or ask them to create the area for you.',
					code: 'GUEST_CANNOT_CREATE'
				},
				{ status: 403 }
			);
		}

		const input: CreateAreaInput = {
			spaceId: resolvedSpaceId,
			name: body.name.trim(),
			context: body.context,
			contextDocumentIds: body.contextDocumentIds,
			color: body.color,
			icon: body.icon
		};

		const area = await postgresAreaRepository.create(input, userId);

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
