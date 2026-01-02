/**
 * Tasks API - List and Create
 *
 * GET /api/tasks - List tasks with optional filters
 * POST /api/tasks - Create single or bulk tasks
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';
import type { CreateTaskInput, TaskListFilter, TaskStatus } from '$lib/types/tasks';

// Default user ID for POC (will be replaced with auth in Phase 0.4)
const DEFAULT_USER_ID = 'admin';

/**
 * GET /api/tasks
 * Query params:
 * - spaceId: Filter by space ID
 * - areaId: Filter by focus area ID
 * - status: Filter by status (active, completed, deferred) - can be comma-separated
 * - includeCompleted: Include completed tasks (default: false)
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const spaceId = url.searchParams.get('spaceId') ?? undefined;
		const areaId = url.searchParams.get('areaId');
		const statusParam = url.searchParams.get('status');
		const includeCompleted = url.searchParams.get('includeCompleted') === 'true';

		const filter: TaskListFilter = {
			includeCompleted
		};

		if (spaceId) {
			filter.spaceId = spaceId;
		}

		// Handle areaId filter (null means no focus area, undefined means any)
		if (areaId !== null) {
			filter.areaId = areaId === 'null' ? null : areaId || undefined;
		}

		if (statusParam) {
			const statuses = statusParam.split(',') as TaskStatus[];
			filter.status = statuses.length === 1 ? statuses[0] : statuses;
		}

		const tasks = await postgresTaskRepository.findAll(DEFAULT_USER_ID, filter);

		return json({ tasks });
	} catch (error) {
		console.error('Failed to fetch tasks:', error);
		return json(
			{ error: 'Failed to fetch tasks', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/tasks
 * Body can be:
 * - Single task: { title, spaceId, areaId?, priority?, dueDate?, dueDateType?, source? }
 * - Bulk tasks: { tasks: [...], spaceId, areaId?, source? }
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Check if bulk create
		if (body.tasks && Array.isArray(body.tasks)) {
			const inputs: CreateTaskInput[] = body.tasks.map((t: { title: string; priority?: string; dueDate?: string; dueDateType?: string; areaId?: string }) => ({
				title: t.title,
				spaceId: body.spaceId as string,
				areaId: t.areaId ?? body.areaId, // Per-task or bulk level
				priority: t.priority,
				dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
				dueDateType: t.dueDateType,
				source: body.source
			}));

			const tasks = await postgresTaskRepository.createBulk(inputs, DEFAULT_USER_ID);

			return json({ tasks }, { status: 201 });
		}

		// Single task create
		const input: CreateTaskInput = {
			title: body.title,
			spaceId: body.spaceId as string,
			areaId: body.areaId,
			priority: body.priority,
			dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
			dueDateType: body.dueDateType,
			source: body.source
		};

		if (!input.title || !input.spaceId) {
			return json(
				{ error: 'Missing required fields: title and spaceId' },
				{ status: 400 }
			);
		}

		const task = await postgresTaskRepository.create(input, DEFAULT_USER_ID);

		return json({ task }, { status: 201 });
	} catch (error) {
		console.error('Failed to create task:', error);
		return json(
			{ error: 'Failed to create task', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
