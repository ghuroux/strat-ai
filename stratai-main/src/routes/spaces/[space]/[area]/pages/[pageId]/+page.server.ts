/**
 * Page Editor - Server Load
 *
 * Loads a specific page for editing, or validates for new page creation.
 */

import type { PageServerLoad } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';
import { postgresAuditRepository } from '$lib/server/persistence/audit-postgres';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Require authentication
	if (!locals.session) {
		error(401, 'Unauthorized');
	}

	const userId = locals.session.userId;
	const { space, area, pageId } = params;

	// Handle "new" page creation
	if (pageId === 'new') {
		return {
			page: null,
			userPermission: 'admin' as const, // Creator is always admin
			isNew: true,
			spaceSlug: space,
			areaSlug: area,
			userId
		};
	}

	// Load existing page
	try {
		const page = await postgresPageRepository.findById(pageId, userId);

		if (!page) {
			console.warn(`[PageLoad] Page not found or access denied: pageId=${pageId}, userId=${userId}`);
			error(404, 'Page not found');
		}

		// Log deduplicated page view (fire-and-forget — don't delay page load)
		postgresAuditRepository.logPageView(userId, pageId, locals.session.organizationId);

		// Get user's permission level for this page
		const userPermission = await postgresPageRepository.getUserPagePermission(userId, pageId);

		return {
			page: {
				id: page.id,
				userId: page.userId,
				areaId: page.areaId,
				taskId: page.taskId,
				title: page.title,
				content: page.content,
				contentText: page.contentText,
				pageType: page.pageType,
				visibility: page.visibility,
				status: page.status,
				inContext: page.inContext,
				currentVersion: page.currentVersion,
				sourceConversationId: page.sourceConversationId,
				wordCount: page.wordCount,
				createdAt: page.createdAt.toISOString(),
				updatedAt: page.updatedAt.toISOString()
			},
			userPermission,
			isNew: false,
			spaceSlug: space,
			areaSlug: area,
			userId
		};
	} catch (err) {
		console.error(`[PageLoad] Failed to load page: pageId=${pageId}, userId=${userId}`, err);
		console.error('[PageLoad] Error details:', {
			name: err instanceof Error ? err.name : 'Unknown',
			message: err instanceof Error ? err.message : String(err),
			stack: err instanceof Error ? err.stack : undefined
		});
		error(500, 'Failed to load page');
	}
};
