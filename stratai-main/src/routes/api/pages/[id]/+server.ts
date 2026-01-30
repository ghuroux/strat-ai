/**
 * Pages API - Single Page Operations
 *
 * GET /api/pages/[id] - Get single page with full content
 * PATCH /api/pages/[id] - Update page
 * DELETE /api/pages/[id] - Soft delete page
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';
import { postgresAuditRepository } from '$lib/server/persistence/audit-postgres';
import type { UpdatePageInput } from '$lib/types/page';

/**
 * GET /api/pages/[id]
 * Returns the full page including content
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { id } = params;

	try {
		const page = await postgresPageRepository.findById(id, userId);

		if (!page) {
			return json({ error: 'Page not found' }, { status: 404 });
		}

		return json({ page });
	} catch (error) {
		console.error('Failed to fetch page:', error);
		return json(
			{
				error: 'Failed to fetch page',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/pages/[id]
 * Body:
 * - title: New title
 * - content: New TipTap JSON content
 * - pageType: New page type
 * - visibility: New visibility
 * - taskId: Task to link (null to unlink)
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { id } = params;

	try {
		// Verify page exists and check finalization status
		const existingPage = await postgresPageRepository.findById(id, userId);
		if (!existingPage) {
			return json({ error: 'Page not found' }, { status: 404 });
		}
		if (existingPage.status === 'finalized') {
			return json({ error: 'Cannot edit a finalized page. Unlock it first.' }, { status: 403 });
		}

		const body = await request.json();

		const updates: UpdatePageInput = {};

		if (body.title !== undefined) {
			if (typeof body.title !== 'string' || !body.title.trim()) {
				return json({ error: 'Invalid title' }, { status: 400 });
			}
			updates.title = body.title.trim();
		}

		if (body.content !== undefined) {
			updates.content = body.content;
		}

		if (body.pageType !== undefined) {
			updates.pageType = body.pageType;
		}

		if (body.visibility !== undefined) {
			updates.visibility = body.visibility;
		}

		if (body.taskId !== undefined) {
			updates.taskId = body.taskId; // Can be null to unlink
		}

		const page = await postgresPageRepository.update(id, updates, userId);

		if (!page) {
			return json({ error: 'Page not found' }, { status: 404 });
		}

		// Log audit event
		postgresAuditRepository.logEvent(
			userId, 'page_edited', 'page', id, 'edit',
			{
				word_count_before: existingPage.wordCount ?? 0,
				word_count_after: page.wordCount ?? 0,
				title_changed: updates.title !== undefined && updates.title !== existingPage.title
			},
			locals.session.organizationId
		);

		return json({ page });
	} catch (error) {
		console.error('Failed to update page:', error);
		return json(
			{
				error: 'Failed to update page',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/pages/[id]
 * Soft deletes the page
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { id } = params;

	try {
		// Verify page exists before deleting
		const page = await postgresPageRepository.findById(id, userId);
		if (!page) {
			return json({ error: 'Page not found' }, { status: 404 });
		}

		await postgresPageRepository.delete(id, userId);

		// Log audit event
		postgresAuditRepository.logEvent(
			userId, 'page_deleted', 'page', id, 'delete',
			{
				title: page.title,
				was_finalized: page.status === 'finalized',
				was_in_context: page.inContext ?? false,
				version_count: page.currentVersion ?? 0
			},
			locals.session.organizationId
		);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete page:', error);
		return json(
			{
				error: 'Failed to delete page',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
