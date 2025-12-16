/**
 * Task Types for Phase 0.3c+: Task Lifecycle Foundation with Subtasks
 *
 * Tasks are the CENTRAL HUB of the productivity OS.
 * All other assists (Meeting Summary, Decision Log, etc.) feed into/from the task list.
 */

import type { SpaceType } from './chat';

/**
 * Task status values
 */
export type TaskStatus = 'active' | 'completed' | 'deferred';

/**
 * Task priority values
 */
export type TaskPriority = 'normal' | 'high';

/**
 * Due date type - hard deadlines vs soft targets
 */
export type DueDateType = 'hard' | 'soft';

/**
 * Source of task creation
 */
export type TaskSourceType = 'assist' | 'meeting' | 'chat' | 'manual';

/**
 * Subtask type - conversation has chat, action is checkbox-only
 */
export type SubtaskType = 'conversation' | 'action';

/**
 * Source metadata for task provenance
 */
export interface TaskSource {
	type: TaskSourceType;
	assistId?: string;
	conversationId?: string;
}

/**
 * Core Task entity
 */
export interface Task {
	id: string;
	title: string;
	status: TaskStatus;
	priority: TaskPriority;
	color: string;

	// Due dates
	dueDate?: Date;
	dueDateType?: DueDateType;

	// Completion
	completedAt?: Date;
	completionNotes?: string;

	// Source tracking
	source: TaskSource;

	// Linked conversations
	linkedConversationIds: string[];

	// Subtask support (Phase 0.3d++)
	parentTaskId?: string;
	subtaskType?: SubtaskType;
	subtaskOrder?: number;
	contextSummary?: string;

	// Scope
	space: SpaceType;
	userId: string;

	// Timestamps
	lastActivityAt: Date;
	createdAt: Date;
	updatedAt: Date;
	deletedAt?: Date;
}

/**
 * Input for creating a new task
 */
export interface CreateTaskInput {
	title: string;
	space: SpaceType;
	priority?: TaskPriority;
	dueDate?: Date;
	dueDateType?: DueDateType;
	source?: TaskSource;
}

/**
 * Input for updating an existing task
 */
export interface UpdateTaskInput {
	title?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	dueDate?: Date | null;
	dueDateType?: DueDateType | null;
	completionNotes?: string;
}

/**
 * Input for completing a task
 */
export interface CompleteTaskInput {
	notes?: string;
}

/**
 * Input for creating a subtask
 */
export interface CreateSubtaskInput {
	title: string;
	parentTaskId: string;
	subtaskType?: SubtaskType;
	priority?: TaskPriority;
}

/**
 * Plan mode phase
 */
export type PlanModePhase = 'eliciting' | 'proposing' | 'confirming';

/**
 * Plan mode state for guided task breakdown
 */
export interface PlanModeState {
	isActive: boolean;
	taskId: string;
	taskTitle: string;
	phase: PlanModePhase;
	proposedSubtasks: ProposedSubtask[];
	conversationId?: string;
}

/**
 * Proposed subtask from plan mode (before confirmation)
 */
export interface ProposedSubtask {
	id: string;
	title: string;
	type: SubtaskType;
	confirmed: boolean;
}

/**
 * Task extracted from AI response (before confirmation)
 * This is the ephemeral version before user confirms and it becomes a Task
 */
export interface ExtractedTask {
	title: string;
	priority?: TaskPriority;
	dueDate?: string; // Natural language like "Friday" or "next week"
	dueDateType?: DueDateType;
}

/**
 * Database row representation (for repository layer)
 */
export interface TaskRow {
	id: string;
	title: string;
	status: string;
	priority: string;
	color: string;
	due_date: Date | null;
	due_date_type: string | null;
	completed_at: Date | null;
	completion_notes: string | null;
	source_type: string;
	source_assist_id: string | null;
	source_conversation_id: string | null;
	linked_conversation_ids: string[] | null;
	// Subtask columns
	parent_task_id: string | null;
	subtask_type: string | null;
	subtask_order: number | null;
	context_summary: string | null;
	// Scope
	space: string;
	user_id: string;
	last_activity_at: Date;
	created_at: Date;
	updated_at: Date;
	deleted_at: Date | null;
}

/**
 * Filter options for listing tasks
 */
export interface TaskListFilter {
	space?: SpaceType;
	status?: TaskStatus | TaskStatus[];
	priority?: TaskPriority;
	includeCompleted?: boolean;
}

/**
 * Greeting data for returning users
 */
export interface GreetingData {
	message: string;
	tasks: Task[];
	suggestedAction?: Task;
	buttons: string[];
}

/**
 * Convert database row to Task entity
 */
export function rowToTask(row: TaskRow): Task {
	return {
		id: row.id,
		title: row.title,
		status: row.status as TaskStatus,
		priority: row.priority as TaskPriority,
		color: row.color,
		dueDate: row.due_date ?? undefined,
		dueDateType: (row.due_date_type as DueDateType) ?? undefined,
		completedAt: row.completed_at ?? undefined,
		completionNotes: row.completion_notes ?? undefined,
		source: {
			type: row.source_type as TaskSourceType,
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
