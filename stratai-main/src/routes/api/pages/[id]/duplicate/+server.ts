/**
 * Page Duplicate API
 *
 * POST /api/pages/[id]/duplicate - Duplicate a page
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';

/**
 * POST /api/pages/[id]/duplicate
 * Creates a copy of the page with " (Copy)" appended to title
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { id } = params;

	try {
		const page = await postgresPageRepository.duplicate(id, userId);

		if (!page) {
			return json({ error: 'Page not found' }, { status: 404 });
		}

		return json({ page }, { status: 201 });
	} catch (error) {
		console.error('Failed to duplicate page:', error);
		return json(
			{
				error: 'Failed to duplicate page',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
