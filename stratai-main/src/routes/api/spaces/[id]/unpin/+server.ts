/**
 * Space Unpin API
 *
 * POST /api/spaces/[id]/unpin - Unpin a space from the user's navigation bar
 *
 * Constraints:
 * - User must have access to the space (owned or invited)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresSpaceRepository } from '$lib/server/persistence/spaces-postgres';

/**
 * POST /api/spaces/[id]/unpin
 * Unpin a space from the user's navigation bar
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const spaceId = params.id;

		// Unpin the space
		const space = await postgresSpaceRepository.unpinSpace(spaceId, userId);

		if (!space) {
			return json({ error: 'Space not found or no access' }, { status: 404 });
		}

		// Get updated pinned count
		const pinnedCount = await postgresSpaceRepository.getPinnedCount(userId);

		return json({
			space,
			pinnedCount
		});
	} catch (error) {
		console.error('Failed to unpin space:', error);
		return json(
			{
				error: 'Failed to unpin space',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
