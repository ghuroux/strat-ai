/**
 * Tasks API - List and Create
 *
 * GET /api/tasks - List tasks with optional filters
 * POST /api/tasks - Create single or bulk tasks
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';
import { resolveSpaceIdAccessible } from '$lib/server/persistence/spaces-postgres';
import type { CreateTaskInput, TaskListFilter, TaskStatus, GlobalTaskFilter } from '$lib/types/tasks';
import { sendTaskAssignmentNotification } from '$lib/server/email/task-notifications';

/**
 * GET /api/tasks
 * Query params:
 * - spaceId: Filter by space ID or slug (resolved to proper ID)
 * - areaId: Filter by focus area ID
 * - status: Filter by status (active, completed, deferred) - can be comma-separated
 * - includeCompleted: Include completed tasks (default: false)
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		// Global mode: cross-space task aggregation
		const isGlobal = url.searchParams.get('global') === 'true';

		if (isGlobal) {
			const globalFilter: GlobalTaskFilter = {};

			// Optional space filter (resolve slug → ID)
			const spaceParam = url.searchParams.get('spaceId');
			if (spaceParam) {
				const resolvedId = await resolveSpaceIdAccessible(spaceParam, userId);
				if (!resolvedId) {
					return json({ error: `Space not found: ${spaceParam}` }, { status: 404 });
				}
				globalFilter.spaceId = resolvedId;
			}

			// Optional status filter
			const globalStatusParam = url.searchParams.get('status');
			if (globalStatusParam) {
				const statuses = globalStatusParam.split(',') as TaskStatus[];
				globalFilter.status = statuses.length === 1 ? statuses[0] : statuses;
			}

			globalFilter.includeCompleted = url.searchParams.get('includeCompleted') === 'true';

			const tasks = await postgresTaskRepository.findAllForUser(userId, globalFilter);
			return json({ tasks });
		}

		// Per-space mode (existing behavior)
		const spaceIdParam = url.searchParams.get('spaceId') ?? undefined;
		const areaId = url.searchParams.get('areaId');
		const statusParam = url.searchParams.get('status');
		const includeCompleted = url.searchParams.get('includeCompleted') === 'true';

		const filter: TaskListFilter = {
			includeCompleted
		};

		// Resolve space identifier (slug or ID) to proper ID
		if (spaceIdParam) {
			const resolvedSpaceId = await resolveSpaceIdAccessible(spaceIdParam, userId);
			if (!resolvedSpaceId) {
				return json({ error: `Space not found: ${spaceIdParam}` }, { status: 404 });
			}
			filter.spaceId = resolvedSpaceId;
		}

		// Handle areaId filter (null means no focus area, undefined means any)
		if (areaId !== null) {
			filter.areaId = areaId === 'null' ? null : areaId || undefined;
		}

		if (statusParam) {
			const statuses = statusParam.split(',') as TaskStatus[];
			filter.status = statuses.length === 1 ? statuses[0] : statuses;
		}

		const tasks = await postgresTaskRepository.findAll(userId, filter);

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
 * Note: spaceId can be a slug or proper ID - it will be resolved
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const body = await request.json();

		// Validate and resolve spaceId
		if (!body.spaceId) {
			return json({ error: 'Missing required field: spaceId' }, { status: 400 });
		}

		const resolvedSpaceId = await resolveSpaceIdAccessible(body.spaceId, userId);
		if (!resolvedSpaceId) {
			return json({ error: `Space not found: ${body.spaceId}` }, { status: 404 });
		}

		// Check if bulk create
		if (body.tasks && Array.isArray(body.tasks)) {
			const inputs: CreateTaskInput[] = body.tasks.map((t: { title: string; priority?: string; dueDate?: string; dueDateType?: string; estimatedEffort?: string; areaId?: string; assigneeId?: string }) => ({
				title: t.title,
				spaceId: resolvedSpaceId,
				areaId: t.areaId ?? body.areaId, // Per-task or bulk level
				assigneeId: t.assigneeId ?? body.assigneeId, // Per-task or bulk level
				priority: t.priority,
				dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
				dueDateType: t.dueDateType,
				estimatedEffort: t.estimatedEffort,
				source: body.source
			}));

			const tasks = await postgresTaskRepository.createBulk(inputs, userId);

			return json({ tasks }, { status: 201 });
		}

		// Single task create
		if (!body.title) {
			return json({ error: 'Missing required field: title' }, { status: 400 });
		}

		const input: CreateTaskInput = {
			title: body.title,
			description: body.description,
			spaceId: resolvedSpaceId,
			areaId: body.areaId,
			assigneeId: body.assigneeId,
			priority: body.priority,
			dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
			dueDateType: body.dueDateType,
			estimatedEffort: body.estimatedEffort,
			source: body.source
		};

		const task = await postgresTaskRepository.create(input, userId);

		// Fire-and-forget: send assignment notification if assigned to someone else
		if (task.assigneeId && task.assigneeId !== userId) {
			sendTaskAssignmentNotification({
				task, assigneeId: task.assigneeId, assignerId: userId,
				orgId: locals.session.organizationId
			}).catch(console.error);
		}

		return json({ task }, { status: 201 });
	} catch (error) {
		console.error('Failed to create task:', error);
		return json(
			{ error: 'Failed to create task', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
