/**
 * PostgreSQL implementation of TaskRepository
 *
 * Key design:
 * - User scoping on all queries
 * - Soft deletes via deleted_at column
 * - Rotating color assignment
 */

import type {
	Task,
	TaskRow,
	CreateTaskInput,
	UpdateTaskInput,
	TaskListFilter,
	CreateSubtaskInput,
	SubtaskType
} from '$lib/types/tasks';
import type { SpaceType } from '$lib/types/chat';
import type { TaskRepository } from './types';
import { sql } from './db';
import { getNextTaskColor } from '$lib/config/task-colors';

/**
 * Generate a unique task ID
 */
function generateTaskId(): string {
	return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert database row to Task entity
 */
function dbRowToTask(row: TaskRow): Task {
	return {
		id: row.id,
		title: row.title,
		status: row.status as Task['status'],
		priority: row.priority as Task['priority'],
		color: row.color,
		dueDate: row.due_date ?? undefined,
		dueDateType: row.due_date_type as Task['dueDateType'] ?? undefined,
		completedAt: row.completed_at ?? undefined,
		completionNotes: row.completion_notes ?? undefined,
		source: {
			type: row.source_type as Task['source']['type'],
			assistId: row.source_assist_id ?? undefined,
			conversationId: row.source_conversation_id ?? undefined
		},
		linkedConversationIds: row.linked_conversation_ids ?? [],
		// Subtask fields
		parentTaskId: row.parent_task_id ?? undefined,
		subtaskType: (row.subtask_type as SubtaskType) ?? undefined,
		subtaskOrder: row.subtask_order ?? undefined,
		contextSummary: row.context_summary ?? undefined,
		// Scope
		space: row.space as SpaceType,
		userId: row.user_id,
		lastActivityAt: row.last_activity_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at ?? undefined
	};
}

/**
 * PostgreSQL implementation of TaskRepository
 */
export const postgresTaskRepository: TaskRepository = {
	async findAll(userId: string, filter?: TaskListFilter): Promise<Task[]> {
		// Build WHERE conditions based on filter
		let query;

		if (filter?.space && filter?.status) {
			const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
			query = sql<TaskRow[]>`
				SELECT *
				FROM tasks
				WHERE user_id = ${userId}
					AND space = ${filter.space}
					AND status = ANY(${statuses})
					AND deleted_at IS NULL
				ORDER BY
					CASE WHEN priority = 'high' THEN 0 ELSE 1 END,
					created_at DESC
			`;
		} else if (filter?.space) {
			if (filter.includeCompleted) {
				query = sql<TaskRow[]>`
					SELECT *
					FROM tasks
					WHERE user_id = ${userId}
						AND space = ${filter.space}
						AND deleted_at IS NULL
					ORDER BY
						CASE WHEN status = 'completed' THEN 1 ELSE 0 END,
						CASE WHEN priority = 'high' THEN 0 ELSE 1 END,
						created_at DESC
				`;
			} else {
				query = sql<TaskRow[]>`
					SELECT *
					FROM tasks
					WHERE user_id = ${userId}
						AND space = ${filter.space}
						AND status != 'completed'
						AND deleted_at IS NULL
					ORDER BY
						CASE WHEN priority = 'high' THEN 0 ELSE 1 END,
						created_at DESC
				`;
			}
		} else if (filter?.status) {
			const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
			query = sql<TaskRow[]>`
				SELECT *
				FROM tasks
				WHERE user_id = ${userId}
					AND status = ANY(${statuses})
					AND deleted_at IS NULL
				ORDER BY
					CASE WHEN priority = 'high' THEN 0 ELSE 1 END,
					created_at DESC
			`;
		} else {
			// Default: all non-completed tasks
			query = sql<TaskRow[]>`
				SELECT *
				FROM tasks
				WHERE user_id = ${userId}
					AND status != 'completed'
					AND deleted_at IS NULL
				ORDER BY
					CASE WHEN priority = 'high' THEN 0 ELSE 1 END,
					created_at DESC
			`;
		}

		const rows = await query;
		return rows.map(dbRowToTask);
	},

	async findById(id: string, userId: string): Promise<Task | null> {
		const rows = await sql<TaskRow[]>`
			SELECT *
			FROM tasks
			WHERE id = ${id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
		return rows.length > 0 ? dbRowToTask(rows[0]) : null;
	},

	async create(input: CreateTaskInput, userId: string): Promise<Task> {
		const id = generateTaskId();
		const color = getNextTaskColor();
		const now = new Date();

		await sql`
			INSERT INTO tasks (
				id, title, status, priority, color,
				due_date, due_date_type,
				source_type, source_assist_id, source_conversation_id,
				space, user_id,
				last_activity_at, created_at, updated_at
			) VALUES (
				${id},
				${input.title},
				'active',
				${input.priority ?? 'normal'},
				${color},
				${input.dueDate ?? null},
				${input.dueDateType ?? null},
				${input.source?.type ?? 'manual'},
				${input.source?.assistId ?? null},
				${input.source?.conversationId ?? null},
				${input.space},
				${userId},
				${now},
				${now},
				${now}
			)
		`;

		// Return the created task
		const task = await this.findById(id, userId);
		if (!task) throw new Error('Failed to create task');
		return task;
	},

	async createBulk(inputs: CreateTaskInput[], userId: string): Promise<Task[]> {
		const tasks: Task[] = [];
		for (const input of inputs) {
			const task = await this.create(input, userId);
			tasks.push(task);
		}
		return tasks;
	},

	async update(id: string, updates: UpdateTaskInput, userId: string): Promise<Task | null> {
		// Build dynamic update query
		const setClauses: string[] = [];
		const values: unknown[] = [];

		if (updates.title !== undefined) {
			setClauses.push('title');
			values.push(updates.title);
		}
		if (updates.status !== undefined) {
			setClauses.push('status');
			values.push(updates.status);
		}
		if (updates.priority !== undefined) {
			setClauses.push('priority');
			values.push(updates.priority);
		}
		if (updates.dueDate !== undefined) {
			setClauses.push('due_date');
			values.push(updates.dueDate);
		}
		if (updates.dueDateType !== undefined) {
			setClauses.push('due_date_type');
			values.push(updates.dueDateType);
		}
		if (updates.completionNotes !== undefined) {
			setClauses.push('completion_notes');
			values.push(updates.completionNotes);
		}

		// Always update last_activity_at and updated_at
		await sql`
			UPDATE tasks
			SET
				title = COALESCE(${updates.title ?? null}, title),
				status = COALESCE(${updates.status ?? null}, status),
				priority = COALESCE(${updates.priority ?? null}, priority),
				due_date = ${updates.dueDate === null ? null : updates.dueDate ?? sql`due_date`},
				due_date_type = ${updates.dueDateType === null ? null : updates.dueDateType ?? sql`due_date_type`},
				completion_notes = COALESCE(${updates.completionNotes ?? null}, completion_notes),
				last_activity_at = NOW(),
				updated_at = NOW()
			WHERE id = ${id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;

		return this.findById(id, userId);
	},

	async complete(id: string, userId: string, notes?: string): Promise<Task | null> {
		await sql`
			UPDATE tasks
			SET
				status = 'completed',
				completed_at = NOW(),
				completion_notes = ${notes ?? null},
				last_activity_at = NOW(),
				updated_at = NOW()
			WHERE id = ${id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;

		return this.findById(id, userId);
	},

	async delete(id: string, userId: string): Promise<void> {
		// Soft delete
		await sql`
			UPDATE tasks
			SET deleted_at = NOW()
			WHERE id = ${id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
	},

	async count(userId: string, filter?: TaskListFilter): Promise<number> {
		let result;

		if (filter?.space) {
			if (filter.includeCompleted) {
				result = await sql<{ count: string }[]>`
					SELECT COUNT(*) as count
					FROM tasks
					WHERE user_id = ${userId}
						AND space = ${filter.space}
						AND deleted_at IS NULL
				`;
			} else {
				result = await sql<{ count: string }[]>`
					SELECT COUNT(*) as count
					FROM tasks
					WHERE user_id = ${userId}
						AND space = ${filter.space}
						AND status != 'completed'
						AND deleted_at IS NULL
				`;
			}
		} else {
			if (filter?.includeCompleted) {
				result = await sql<{ count: string }[]>`
					SELECT COUNT(*) as count
					FROM tasks
					WHERE user_id = ${userId}
						AND deleted_at IS NULL
				`;
			} else {
				result = await sql<{ count: string }[]>`
					SELECT COUNT(*) as count
					FROM tasks
					WHERE user_id = ${userId}
						AND status != 'completed'
						AND deleted_at IS NULL
				`;
			}
		}

		return parseInt(result[0]?.count || '0', 10);
	},

	async getActiveBySpace(userId: string, space: SpaceType): Promise<Task[]> {
		const rows = await sql<TaskRow[]>`
			SELECT *
			FROM tasks
			WHERE user_id = ${userId}
				AND space = ${space}
				AND status = 'active'
				AND deleted_at IS NULL
			ORDER BY
				CASE WHEN priority = 'high' THEN 0 ELSE 1 END,
				created_at DESC
		`;
		return rows.map(dbRowToTask);
	},

	async linkConversation(taskId: string, conversationId: string, userId: string): Promise<void> {
		// Add conversation ID to the array if not already present
		await sql`
			UPDATE tasks
			SET
				linked_conversation_ids = array_append(
					COALESCE(linked_conversation_ids, '{}'),
					${conversationId}
				),
				last_activity_at = NOW(),
				updated_at = NOW()
			WHERE id = ${taskId}
				AND user_id = ${userId}
				AND deleted_at IS NULL
				AND NOT (${conversationId} = ANY(COALESCE(linked_conversation_ids, '{}')))
		`;
	},

	async unlinkConversation(taskId: string, conversationId: string, userId: string): Promise<void> {
		// Remove conversation ID from the array
		await sql`
			UPDATE tasks
			SET
				linked_conversation_ids = array_remove(
					COALESCE(linked_conversation_ids, '{}'),
					${conversationId}
				),
				last_activity_at = NOW(),
				updated_at = NOW()
			WHERE id = ${taskId}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
	},

	async getTaskByConversation(conversationId: string, userId: string): Promise<Task | null> {
		const rows = await sql<TaskRow[]>`
			SELECT *
			FROM tasks
			WHERE user_id = ${userId}
				AND ${conversationId} = ANY(linked_conversation_ids)
				AND deleted_at IS NULL
			LIMIT 1
		`;
		return rows.length > 0 ? dbRowToTask(rows[0]) : null;
	},

	// =====================================================
	// Subtask Methods (Phase 0.3d++)
	// =====================================================

	async getSubtasks(parentId: string, userId: string): Promise<Task[]> {
		const rows = await sql<TaskRow[]>`
			SELECT *
			FROM tasks
			WHERE parent_task_id = ${parentId}
				AND user_id = ${userId}
				AND deleted_at IS NULL
			ORDER BY subtask_order ASC, created_at ASC
		`;
		return rows.map(dbRowToTask);
	},

	async createSubtask(input: CreateSubtaskInput, userId: string): Promise<Task> {
		// First verify parent exists and is not itself a subtask (enforce 1-level max)
		const parent = await this.findById(input.parentTaskId, userId);
		if (!parent) {
			throw new Error('Parent task not found');
		}
		if (parent.parentTaskId) {
			throw new Error('Cannot create subtask of a subtask (max 1 level)');
		}

		// Get the next subtask order
		const orderResult = await sql<{ max_order: number | null }[]>`
			SELECT MAX(subtask_order) as max_order
			FROM tasks
			WHERE parent_task_id = ${input.parentTaskId}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
		const nextOrder = (orderResult[0]?.max_order ?? -1) + 1;

		const id = generateTaskId();
		const color = parent.color; // Inherit parent color (slightly muted in UI)
		const now = new Date();

		await sql`
			INSERT INTO tasks (
				id, title, status, priority, color,
				parent_task_id, subtask_type, subtask_order,
				source_type,
				space, user_id,
				last_activity_at, created_at, updated_at
			) VALUES (
				${id},
				${input.title},
				'active',
				${input.priority ?? 'normal'},
				${color},
				${input.parentTaskId},
				${input.subtaskType ?? 'conversation'},
				${nextOrder},
				'manual',
				${parent.space},
				${userId},
				${now},
				${now},
				${now}
			)
		`;

		const task = await this.findById(id, userId);
		if (!task) throw new Error('Failed to create subtask');
		return task;
	},

	async canHaveSubtasks(taskId: string, userId: string): Promise<boolean> {
		// A task can have subtasks if it's not itself a subtask
		const task = await this.findById(taskId, userId);
		if (!task) return false;
		return !task.parentTaskId;
	},

	async getSubtaskCount(taskId: string, userId: string): Promise<number> {
		const result = await sql<{ count: string }[]>`
			SELECT COUNT(*) as count
			FROM tasks
			WHERE parent_task_id = ${taskId}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
		return parseInt(result[0]?.count || '0', 10);
	},

	async reorderSubtasks(parentId: string, subtaskIds: string[], userId: string): Promise<void> {
		// Update order for each subtask
		for (let i = 0; i < subtaskIds.length; i++) {
			await sql`
				UPDATE tasks
				SET subtask_order = ${i}, updated_at = NOW()
				WHERE id = ${subtaskIds[i]}
					AND parent_task_id = ${parentId}
					AND user_id = ${userId}
					AND deleted_at IS NULL
			`;
		}
	},

	async updateSubtaskContext(taskId: string, contextSummary: string, userId: string): Promise<void> {
		await sql`
			UPDATE tasks
			SET context_summary = ${contextSummary}, updated_at = NOW()
			WHERE id = ${taskId}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
	}
};
