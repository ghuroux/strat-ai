/**
 * Pages API - List and Create
 *
 * GET /api/pages - List pages with optional filters
 * POST /api/pages - Create a new page
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';
import type { CreatePageInput, PageType, PageVisibility } from '$lib/types/page';

/**
 * GET /api/pages
 * Query params:
 * - areaId: Filter by area ID (required for most views)
 * - pageType: Filter by page type
 * - visibility: Filter by visibility
 * - taskId: Filter by linked task
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const areaId = url.searchParams.get('areaId') ?? undefined;
		const pageType = url.searchParams.get('pageType') as PageType | undefined;
		const visibility = url.searchParams.get('visibility') as PageVisibility | undefined;
		const taskId = url.searchParams.get('taskId') ?? undefined;

		const pages = await postgresPageRepository.findAll(userId, {
			areaId,
			pageType,
			visibility,
			taskId
		});

		// Return without full content to reduce payload for list views
		const summaries = pages.map((page) => ({
			id: page.id,
			areaId: page.areaId,
			taskId: page.taskId,
			title: page.title,
			pageType: page.pageType,
			visibility: page.visibility,
			wordCount: page.wordCount,
			createdAt: page.createdAt,
			updatedAt: page.updatedAt
		}));

		return json({ pages: summaries });
	} catch (error) {
		console.error('Failed to fetch pages:', error);
		return json(
			{
				error: 'Failed to fetch pages',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/pages
 * Body:
 * - areaId: Area to create the page in (required)
 * - title: Page title (required)
 * - content: TipTap JSON content (optional)
 * - pageType: Page type (default: 'general')
 * - visibility: Visibility level (default: 'private')
 * - taskId: Optional task to link to
 * - sourceConversationId: Optional source conversation
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const body = await request.json();

		// Validate required fields
		if (!body.areaId) {
			return json({ error: 'Missing required field: areaId' }, { status: 400 });
		}

		if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
			return json({ error: 'Missing or invalid required field: title' }, { status: 400 });
		}

		const input: CreatePageInput = {
			areaId: body.areaId,
			title: body.title.trim(),
			content: body.content,
			pageType: body.pageType ?? 'general',
			visibility: body.visibility ?? 'private',
			taskId: body.taskId,
			sourceConversationId: body.sourceConversationId
		};

		const page = await postgresPageRepository.create(input, userId);

		return json({ page }, { status: 201 });
	} catch (error) {
		console.error('Failed to create page:', error);
		return json(
			{
				error: 'Failed to create page',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
