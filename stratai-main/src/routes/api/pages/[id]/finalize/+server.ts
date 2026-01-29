/**
 * Page Finalize API
 *
 * POST /api/pages/[id]/finalize - Finalize a page (lock it and create a version)
 *
 * Finalizing a page:
 * - Creates a version snapshot
 * - Sets status to 'finalized' (locked)
 * - Records finalized_at and finalized_by
 * - Increments current_version
 *
 * Only the page owner can finalize.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';

interface FinalizeBody {
	changeSummary?: string;
	addToContext?: boolean;
}

/**
 * POST /api/pages/[id]/finalize
 * Finalize a page, creating a version and locking it
 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	// Check authentication
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { id } = params;

	// Parse optional body
	let changeSummary: string | undefined;
	let addToContext: boolean | undefined;
	try {
		const body = await request.json() as FinalizeBody;
		changeSummary = body?.changeSummary;
		addToContext = body?.addToContext;
	} catch {
		// Body is optional, ignore parse errors
	}

	try {
		const page = await postgresPageRepository.finalizePage(id, userId, changeSummary, addToContext);

		if (!page) {
			// Could be not found, not owner, or already finalized
			return json(
				{
					error: {
						message: 'Page not found, already finalized, or you are not the owner',
						type: 'not_found'
					}
				},
				{ status: 404 }
			);
		}

		return json({ page }, { status: 200 });
	} catch (error) {
		console.error('Failed to finalize page:', error);
		return json(
			{
				error: {
					message: 'Failed to finalize page',
					type: 'server_error',
					details: error instanceof Error ? error.message : 'Unknown error'
				}
			},
			{ status: 500 }
		);
	}
};
