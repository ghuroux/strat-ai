/**
 * Space Pin API
 *
 * POST /api/spaces/[id]/pin - Pin a space to the user's navigation bar
 *
 * Constraints:
 * - User must have access to the space (owned or invited)
 * - Maximum 6 pinned spaces per user
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresSpaceRepository } from '$lib/server/persistence/spaces-postgres';

const MAX_PINNED_SPACES = 6;

/**
 * POST /api/spaces/[id]/pin
 * Pin a space to the user's navigation bar
 * Returns 400 if user already has max 6 pinned spaces
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const spaceId = params.id;

		// Check if user already has max pinned spaces
		const pinnedCount = await postgresSpaceRepository.getPinnedCount(userId);
		if (pinnedCount >= MAX_PINNED_SPACES) {
			return json(
				{
					error: `Maximum ${MAX_PINNED_SPACES} spaces can be pinned. Please unpin a space first.`,
					code: 'MAX_PINNED_REACHED',
					pinnedCount
				},
				{ status: 400 }
			);
		}

		// Pin the space
		const space = await postgresSpaceRepository.pinSpace(spaceId, userId);

		if (!space) {
			return json({ error: 'Space not found or no access' }, { status: 404 });
		}

		return json({
			space,
			pinnedCount: pinnedCount + 1
		});
	} catch (error) {
		console.error('Failed to pin space:', error);
		return json(
			{
				error: 'Failed to pin space',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
