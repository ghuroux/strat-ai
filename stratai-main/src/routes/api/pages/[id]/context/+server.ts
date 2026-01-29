/**
 * Page Context Toggle API
 *
 * PATCH /api/pages/[id]/context - Toggle a page's in_context status
 *
 * Body: { inContext: boolean }
 * Response: { page: Page }
 *
 * Only the page owner can toggle context.
 * Only finalized pages can be added to context.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';

interface ContextBody {
	inContext: boolean;
}

/**
 * PATCH /api/pages/[id]/context
 * Toggle whether a finalized page is included in AI context
 */
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	// Check authentication
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { id } = params;

	// Parse body
	let body: ContextBody;
	try {
		body = await request.json() as ContextBody;
	} catch {
		return json(
			{ error: { message: 'Invalid request body', type: 'validation_error' } },
			{ status: 400 }
		);
	}

	if (typeof body.inContext !== 'boolean') {
		return json(
			{ error: { message: 'inContext must be a boolean', type: 'validation_error' } },
			{ status: 400 }
		);
	}

	try {
		const page = await postgresPageRepository.setPageInContext(id, body.inContext, userId);

		if (!page) {
			return json(
				{
					error: {
						message: 'Page not found, not finalized, or you are not the owner',
						type: 'not_found'
					}
				},
				{ status: 404 }
			);
		}

		return json({ page }, { status: 200 });
	} catch (error) {
		console.error('Failed to toggle page context:', error);
		return json(
			{
				error: {
					message: 'Failed to toggle page context',
					type: 'server_error',
					details: error instanceof Error ? error.message : 'Unknown error'
				}
			},
			{ status: 500 }
		);
	}
};
