/**
 * Page Unlock API
 *
 * POST /api/pages/[id]/unlock - Unlock a finalized page for editing
 *
 * Unlocking a page:
 * - Sets status to 'shared' (allows collaboration)
 * - Keeps the version intact (AI context still has finalized version)
 * - Re-finalizing will create a new version
 *
 * Only the page owner can unlock.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';
import { postgresAuditRepository } from '$lib/server/persistence/audit-postgres';

/**
 * POST /api/pages/[id]/unlock
 * Unlock a finalized page, setting status to 'shared'
 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	// Check authentication
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { id } = params;

	// Parse optional body for keepInContext flag
	let keepInContext = false;
	try {
		const body = await request.json();
		keepInContext = body?.keepInContext ?? false;
	} catch {
		// Body is optional — backwards compatible with existing callers
	}

	try {
		const page = await postgresPageRepository.unlockPage(id, userId, keepInContext);

		if (page) {
			// Log audit event
			postgresAuditRepository.logEvent(
				userId, 'page_unlocked', 'page', id, 'unlock',
				{
					from_version: page.currentVersion ?? 1,
					kept_in_context: keepInContext,
					context_version_number: keepInContext ? (page.contextVersionNumber ?? null) : null
				},
				locals.session.organizationId
			);
		}

		if (!page) {
			// Could be not found, not owner, or not finalized
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
		console.error('Failed to unlock page:', error);
		return json(
			{
				error: {
					message: 'Failed to unlock page',
					type: 'server_error',
					details: error instanceof Error ? error.message : 'Unknown error'
				}
			},
			{ status: 500 }
		);
	}
};
