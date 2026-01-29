/**
 * Page Version Restore API
 *
 * POST /api/pages/[id]/versions/[versionNumber]/restore - Restore a page to a previous version
 *
 * Path params:
 * - id: Page ID
 * - versionNumber: Version number to restore (integer >= 1)
 *
 * Constraints:
 * - Only page owner can restore
 * - Restoring sets status to 'shared' (auto-unlock) and in_context to false
 * - User must re-finalize to lock and re-add to context
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';

/**
 * POST /api/pages/:id/versions/:versionNumber/restore
 * Restore page content to a previous version
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { id, versionNumber: versionNumberStr } = params;

	const versionNumber = parseInt(versionNumberStr, 10);
	if (isNaN(versionNumber) || versionNumber < 1) {
		return json({ error: 'Invalid version number' }, { status: 400 });
	}

	try {
		const page = await postgresPageRepository.restoreVersion(id, versionNumber, userId);

		if (!page) {
			return json({ error: 'Page or version not found' }, { status: 404 });
		}

		return json({ page });
	} catch (error) {
		console.error('Failed to restore version:', error);
		return json(
			{
				error: 'Failed to restore version',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
