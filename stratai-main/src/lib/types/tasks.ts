/**
 * Task Types for Phase 0.3c+: Task Lifecycle Foundation with Subtasks
 *
 * Tasks are the CENTRAL HUB of the productivity OS.
 * All other assists (Meeting Summary, Decision Log, etc.) feed into/from the task list.
 */

// Note: SpaceType is kept for backwards compatibility with some UI components
// but spaceId (string) is now the canonical reference to spaces table
import type { SpaceType } from './chat';

/**
 * Task status values
 * - active: Task is ready to work on
 * - planning: Task is being broken down into subtasks (Plan Mode)
 * - completed: Task is done
 * - deferred: Task is postponed
 */
export type TaskStatus = 'active' | 'planning' | 'completed' | 'deferred';

/**
 * Task priority values
 */
export type TaskPriority = 'normal' | 'high';

/**
 * Due date type - hard deadlines vs soft targets
 */
export type DueDateType = 'hard' | 'soft';

/**
 * Estimated effort/time for a task
 * - quick: < 15 minutes
 * - short: < 1 hour
 * - medium: 1-4 hours
 * - long: 4+ hours
 * - multi_day: spans multiple days
 */
export type EstimatedEffort = 'quick' | 'short' | 'medium' | 'long' | 'multi_day';

/**
 * Source of task creation
 */
export type TaskSourceType = 'assist' | 'meeting' | 'chat' | 'manual' | 'document';

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
	meetingId?: string;
}

/**
 * Core Task entity
 */
export interface Task {
	id: string;
	title: string;
	description?: string; // User-provided background/context
	status: TaskStatus;
	priority: TaskPriority;
	color: string;

	// Due dates
	dueDate?: Date;
	dueDateType?: DueDateType;

	// Effort estimate
	estimatedEffort?: EstimatedEffort;

	// Completion
	completedAt?: Date;
	completionNotes?: string;

	// Stale tracking
	staleDismissedAt?: Date;

	// Task approach tracking (for Task Approach Modal)
	approachChosenAt?: Date;

	// Source tracking
	source: TaskSource;

	// Linked conversations
	linkedConversationIds: string[];

	// Subtask support (Phase 0.3d++)
	parentTaskId?: string;
	subtaskType?: SubtaskType;
	subtaskOrder?: number;
	contextSummary?: string;

	// Focus Area (optional - for specialized context within space)
	areaId?: string;

	// Assignment
	assigneeId?: string; // Who should complete this task (defaults to userId)

	// Scope
	spaceId: string; // FK to spaces table (system space id = slug, custom = UUID)
	userId: string;

	// Planning state (for status='planning' tasks)
	planningData?: PlanningData;

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
	description?: string; // User-provided background/context
	spaceId: string; // FK to spaces table
	areaId?: string;
	assigneeId?: string; // Who should complete this task (defaults to creator)
	priority?: TaskPriority;
	dueDate?: Date;
	dueDateType?: DueDateType;
	estimatedEffort?: EstimatedEffort;
	source?: TaskSource;
}

/**
 * Input for updating an existing task
 */
export interface UpdateTaskInput {
	title?: string;
	description?: string | null; // null to clear
	status?: TaskStatus;
	priority?: TaskPriority;
	areaId?: string | null;
	assigneeId?: string | null; // null to unassign (falls back to creator)
	dueDate?: Date | null;
	dueDateType?: DueDateType | null;
	estimatedEffort?: EstimatedEffort | null;
	completionNotes?: string;
	staleDismissedAt?: Date | null; // null to clear dismissal
	approachChosenAt?: Date | null; // null to clear (reset to show modal again)
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
	assigneeId?: string; // Who should complete this subtask (defaults to creator)
	priority?: TaskPriority;
	sourceConversationId?: string; // The conversation that created this subtask (e.g., Plan Mode conversation)
	contextSummary?: string; // JSON string containing SubtaskContext
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
	exchangeCount: number; // Tracks conversation depth for prompt selection
	proposedSubtasks: ProposedSubtask[];
	conversationId?: string;
	/** AI-generated synopsis, available after context generation */
	synopsis?: PlanModeSynopsis;
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
 * AI-generated synopsis for Plan Mode breakdown
 * Explains why the breakdown makes sense and how to get started
 */
export interface PlanModeSynopsis {
	/** Why this breakdown works well for the task (2-3 sentences) */
	reasoning: string;
	/** Practical advice on how to begin (1-2 sentences) */
	gettingStarted: string;
}

/**
 * Rich context for an individual subtask
 * Generated by LLM during Plan Mode confirmation
 * Stored as JSON string in task.contextSummary
 */
export interface SubtaskContext {
	/** Why this subtask is important to the overall goal (1 sentence) */
	whyImportant: string;
	/** Clear criteria for when this subtask is done (1-2 sentences) */
	definitionOfDone: string;
	/** 2-3 practical tips, approaches, or things to consider */
	hints: string[];
}

/**
 * Persisted planning data - stored in task.planning_data JSONB
 * Enables Plan Mode state to survive page refreshes
 */
export interface PlanningData {
	phase: PlanModePhase;
	exchangeCount: number; // Tracks conversation depth for prompt selection
	proposedSubtasks: ProposedSubtask[];
	conversationId?: string;
	startedAt: string; // ISO timestamp
	/** AI-generated synopsis, added when user confirms subtasks */
	synopsis?: PlanModeSynopsis;
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
 * Note: postgres.js auto-converts snake_case to camelCase
 */
export interface TaskRow {
	id: string;
	title: string;
	description: string | null;
	status: string;
	priority: string;
	color: string;
	dueDate: Date | null;
	dueDateType: string | null;
	estimatedEffort: string | null;
	completedAt: Date | null;
	completionNotes: string | null;
	staleDismissedAt: Date | null;
	approachChosenAt: Date | null;
	sourceType: string;
	sourceAssistId: string | null;
	sourceConversationId: string | null;
	sourceMeetingId: string | null;
	linkedConversationIds: string[] | null;
	// Subtask columns
	parentTaskId: string | null;
	subtaskType: string | null;
	subtaskOrder: number | null;
	contextSummary: string | null;
	// Focus Area
	areaId: string | null;
	// Planning state
	planningData: PlanningData | null;
	// Assignment
	assigneeId: string | null;
	// Scope
	spaceId: string;
	userId: string;
	lastActivityAt: Date;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
}

/**
 * Filter options for listing tasks
 */
export interface TaskListFilter {
	spaceId?: string; // FK to spaces table
	areaId?: string | null; // null = no focus area, undefined = any
	status?: TaskStatus | TaskStatus[];
	priority?: TaskPriority;
	includeCompleted?: boolean;
}

// ============================================================================
// GLOBAL TASK TYPES (Cross-space task aggregation)
// ============================================================================

/**
 * Task with denormalized space/area metadata from JOIN
 * Used by the Global Tasks Dashboard for cross-space display
 */
export interface GlobalTask extends Task {
	spaceName: string;
	spaceSlug: string;
	spaceColor: string;
	areaName?: string;
	areaSlug?: string;
	areaColor?: string;
}

/**
 * Database row for GlobalTask (extends TaskRow with JOIN columns)
 * postgres.js auto-transforms snake_case → camelCase
 */
export interface GlobalTaskRow extends TaskRow {
	spaceName: string;
	spaceSlug: string;
	spaceColor: string;
	areaName: string | null;
	areaSlug: string | null;
	areaColor: string | null;
}

/**
 * Filter options for global (cross-space) task listing
 */
export interface GlobalTaskFilter {
	spaceId?: string;
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
 * Note: postgres.js auto-converts snake_case to camelCase, so row properties are already camelCase
 */
export function rowToTask(row: TaskRow): Task {
	return {
		id: row.id,
		title: row.title,
		description: row.description ?? undefined,
		status: row.status as TaskStatus,
		priority: row.priority as TaskPriority,
		color: row.color,
		dueDate: row.dueDate ?? undefined,
		dueDateType: (row.dueDateType as DueDateType) ?? undefined,
		estimatedEffort: (row.estimatedEffort as EstimatedEffort) ?? undefined,
		completedAt: row.completedAt ?? undefined,
		completionNotes: row.completionNotes ?? undefined,
		staleDismissedAt: row.staleDismissedAt ?? undefined,
		approachChosenAt: row.approachChosenAt ?? undefined,
		source: {
			type: row.sourceType as TaskSourceType,
			assistId: row.sourceAssistId ?? undefined,
			conversationId: row.sourceConversationId ?? undefined,
			meetingId: row.sourceMeetingId ?? undefined
		},
		linkedConversationIds: row.linkedConversationIds ?? [],
		// Subtask fields
		parentTaskId: row.parentTaskId ?? undefined,
		subtaskType: (row.subtaskType as SubtaskType) ?? undefined,
		subtaskOrder: row.subtaskOrder ?? undefined,
		contextSummary: row.contextSummary ?? undefined,
		// Focus Area
		areaId: row.areaId ?? undefined,
		// Planning state
		planningData: row.planningData ?? undefined,
		// Assignment
		assigneeId: row.assigneeId ?? undefined,
		// Scope
		spaceId: row.spaceId,
		userId: row.userId,
		lastActivityAt: row.lastActivityAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		deletedAt: row.deletedAt ?? undefined
	};
}

// ============================================================================
// RELATED TASKS (Task Context System)
// ============================================================================

/**
 * Types of relationships between tasks
 * - related: general connection
 * - blocks: source blocks target (target can't start until source done)
 * - depends_on: source depends on target (source can't start until target done)
 * - informs: output of source informs/feeds into target
 */
export type TaskRelationshipType = 'related' | 'blocks' | 'depends_on' | 'informs';

/**
 * Related task junction record
 */
export interface RelatedTask {
	id: string;
	sourceTaskId: string;
	targetTaskId: string;
	relationshipType: TaskRelationshipType;
	createdAt: Date;
}

/**
 * Database row for related_tasks junction
 */
export interface RelatedTaskRow {
	id: string;
	source_task_id: string;
	target_task_id: string;
	relationship_type: string;
	created_at: Date;
}

/**
 * Related task info for display (includes the actual task)
 */
export interface RelatedTaskInfo {
	task: Task;
	relationshipType: TaskRelationshipType;
	direction: 'outgoing' | 'incoming'; // outgoing = we're the source, incoming = we're the target
}

/**
 * Input for linking tasks
 */
export interface LinkTaskInput {
	targetTaskId: string;
	relationshipType?: TaskRelationshipType;
}

/**
 * Context payload for Plan Mode
 * Aggregates all linked context for a task
 */
export interface TaskContext {
	documents: Array<{
		id: string;
		filename: string;
		content: string;
		summary?: string;
		charCount: number;
		role: string;
	}>;
	relatedTasks: Array<{
		id: string;
		title: string;
		contextSummary?: string;
		status: TaskStatus;
		relationship: string;
	}>;
}

/**
 * Convert related_tasks row to RelatedTask
 */
export function rowToRelatedTask(row: RelatedTaskRow): RelatedTask {
	return {
		id: row.id,
		sourceTaskId: row.source_task_id,
		targetTaskId: row.target_task_id,
		relationshipType: row.relationship_type as TaskRelationshipType,
		createdAt: row.created_at
	};
}
