/**
 * Page Editor - Server Load
 *
 * Loads a specific page for editing, or validates for new page creation.
 */

import type { PageServerLoad } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';
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
			error(404, 'Page not found');
		}

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
				sourceConversationId: page.sourceConversationId,
				wordCount: page.wordCount,
				createdAt: page.createdAt.toISOString(),
				updatedAt: page.updatedAt.toISOString()
			},
			isNew: false,
			spaceSlug: space,
			areaSlug: area,
			userId
		};
	} catch (err) {
		console.error('Failed to load page:', err);
		error(500, 'Failed to load page');
	}
};
