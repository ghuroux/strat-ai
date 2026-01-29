/**
 * Page Version API - Single Version
 *
 * GET /api/pages/[id]/versions/[versionNumber] - Get a specific version
 *
 * Path params:
 * - id: Page ID
 * - versionNumber: Version number (integer >= 1)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';

/**
 * GET /api/pages/:id/versions/:versionNumber
 * Returns a single version snapshot
 */
export const GET: RequestHandler = async ({ params, locals }) => {
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
		const version = await postgresPageRepository.getVersion(id, versionNumber, userId);

		if (!version) {
			return json({ error: 'Version not found' }, { status: 404 });
		}

		return json({ version });
	} catch (error) {
		console.error('Failed to fetch version:', error);
		return json(
			{
				error: 'Failed to fetch version',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
