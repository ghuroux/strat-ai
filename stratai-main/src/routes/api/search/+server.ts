/**
 * Global Search API
 *
 * GET /api/search - Search across all entity types
 *
 * Query params:
 * - q: Search query (required, min 2 chars)
 * - types: Comma-separated entity types to search (optional, defaults to all)
 *   Valid types: pages, tasks, areas, spaces, documents, conversations
 * - limit: Max results per type (optional, default 8)
 *
 * Returns results grouped by entity type, each with enough data
 * for the command palette to display and navigate.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	postgresTaskRepository,
	postgresAreaRepository,
	postgresSpaceRepository,
	postgresDocumentRepository,
	postgresPageRepository
} from '$lib/server/persistence';
import { searchConversations } from '$lib/server/persistence/postgres';

export interface SearchResultItem {
	id: string;
	type: 'page' | 'task' | 'area' | 'space' | 'document' | 'conversation';
	title: string;
	description?: string;
	spaceId?: string;
	areaId?: string;
	slug?: string;
	status?: string;
	meta?: Record<string, string>;
}

const ALL_TYPES = ['pages', 'tasks', 'areas', 'spaces', 'documents', 'conversations'] as const;
type SearchType = (typeof ALL_TYPES)[number];

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const query = url.searchParams.get('q')?.trim() ?? '';
	const typesParam = url.searchParams.get('types');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '8', 10), 25);

	if (query.length < 2) {
		return json({ error: 'Query must be at least 2 characters' }, { status: 400 });
	}

	// Parse requested types
	const requestedTypes: Set<SearchType> = typesParam
		? new Set(typesParam.split(',').filter((t): t is SearchType => ALL_TYPES.includes(t as SearchType)))
		: new Set(ALL_TYPES);

	const results: SearchResultItem[] = [];

	// Run all searches in parallel
	const searches: Promise<void>[] = [];

	if (requestedTypes.has('pages')) {
		searches.push(
			postgresPageRepository.search(query, userId).then((pages) => {
				for (const page of pages.slice(0, limit)) {
					results.push({
						id: page.id,
						type: 'page',
						title: page.title || 'Untitled',
						description: page.pageType,
						areaId: page.areaId,
						meta: {
							pageType: page.pageType,
							wordCount: String(page.wordCount ?? 0)
						}
					});
				}
			})
		);
	}

	if (requestedTypes.has('tasks')) {
		searches.push(
			postgresTaskRepository.search(query, userId, limit).then((tasks) => {
				for (const task of tasks) {
					results.push({
						id: task.id,
						type: 'task',
						title: task.title,
						description: task.status,
						spaceId: task.spaceId,
						areaId: task.areaId ?? undefined,
						status: task.status
					});
				}
			})
		);
	}

	if (requestedTypes.has('areas')) {
		searches.push(
			postgresAreaRepository.search(query, userId, limit).then((areas) => {
				for (const area of areas) {
					results.push({
						id: area.id,
						type: 'area',
						title: area.name,
						spaceId: area.spaceId,
						slug: area.slug
					});
				}
			})
		);
	}

	if (requestedTypes.has('spaces')) {
		searches.push(
			postgresSpaceRepository.search(query, userId, limit).then((spaces) => {
				for (const space of spaces) {
					results.push({
						id: space.id,
						type: 'space',
						title: space.name,
						slug: space.slug
					});
				}
			})
		);
	}

	if (requestedTypes.has('documents')) {
		searches.push(
			postgresDocumentRepository.search(query, userId, limit).then((docs) => {
				for (const doc of docs) {
					results.push({
						id: doc.id,
						type: 'document',
						title: doc.title || doc.filename,
						description: doc.filename,
						spaceId: doc.spaceId ?? undefined
					});
				}
			})
		);
	}

	if (requestedTypes.has('conversations')) {
		searches.push(
			searchConversations(userId, query, limit).then((convos) => {
				for (const convo of convos) {
					results.push({
						id: convo.id,
						type: 'conversation',
						title: convo.title || 'Untitled conversation',
						spaceId: convo.spaceId ?? undefined,
						areaId: convo.areaId ?? undefined
					});
				}
			})
		);
	}

	try {
		await Promise.all(searches);
		return json({ results, query });
	} catch (error) {
		console.error('Search failed:', error);
		return json(
			{ error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
