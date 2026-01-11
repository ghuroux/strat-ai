/**
 * Page Versions API
 *
 * GET /api/pages/[id]/versions - List versions for a page
 * POST /api/pages/[id]/versions - Create a version snapshot
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';

/**
 * GET /api/pages/[id]/versions
 * Returns version history for a page
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { id } = params;

	try {
		// Verify page exists
		const page = await postgresPageRepository.findById(id, userId);
		if (!page) {
			return json({ error: 'Page not found' }, { status: 404 });
		}

		const versions = await postgresPageRepository.getVersions(id, userId);

		return json({ versions });
	} catch (error) {
		console.error('Failed to fetch versions:', error);
		return json(
			{
				error: 'Failed to fetch versions',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/pages/[id]/versions
 * Creates a version snapshot of the current page state
 * Body:
 * - changeSummary: Optional description of changes
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { id } = params;

	try {
		const body = await request.json().catch(() => ({}));
		const changeSummary = body.changeSummary as string | undefined;

		const version = await postgresPageRepository.createVersion(id, changeSummary, userId);

		if (!version) {
			return json({ error: 'Page not found' }, { status: 404 });
		}

		return json({ version }, { status: 201 });
	} catch (error) {
		console.error('Failed to create version:', error);
		return json(
			{
				error: 'Failed to create version',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
