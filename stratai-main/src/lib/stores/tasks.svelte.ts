/**
 * Task Store - Persistent task management for productivity features
 * Uses Svelte 5 runes for reactivity
 *
 * Tasks are the CENTRAL HUB of the productivity OS.
 * All other assists (Meeting Summary, Decision Log, etc.) feed into/from the task list.
 */

import { SvelteMap } from 'svelte/reactivity';
import type {
	Task,
	CreateTaskInput,
	UpdateTaskInput,
	TaskListFilter,
	ExtractedTask,
	CreateSubtaskInput,
	PlanModeState,
	PlanModePhase,
	ProposedSubtask,
	PlanningData,
	SubtaskType,
	RelatedTaskInfo,
	TaskRelationshipType,
	TaskContext,
	PlanModeSynopsis,
	SubtaskContext
} from '$lib/types/tasks';
import type { TaskContextInfo } from '$lib/utils/context-builder';

/**
 * Task Store - manages persistent tasks with API sync
 */
class TaskStore {
	// Task state
	tasks = $state<SvelteMap<string, Task>>(new SvelteMap());
	isLoading = $state(false);
	error = $state<string | null>(null);

	// Focus mode state
	focusedTaskId = $state<string | null>(null);

	// Subtask state - which parent tasks are expanded
	expandedTasks = $state<Set<string>>(new Set());

	// Related tasks cache: taskId -> related tasks
	relatedTasks = new SvelteMap<string, RelatedTaskInfo[]>();

	// Task context cache: taskId -> full context (for Plan Mode)
	taskContext = new SvelteMap<string, TaskContextInfo>();

	// Plan completion state - transient flag for post-planning UX
	// Set when subtasks are created from Plan Mode, cleared when user starts a subtask
	planJustCompleted = $state<{
		taskId: string;
		subtaskCount: number;
		firstSubtaskId?: string;
		synopsis?: PlanModeSynopsis;
	} | null>(null);

	// Version counter for fine-grained updates
	_version = $state(0);

	// Initialization tracking
	private initializedSpaceIds = new Set<string>();
	private loadedRelatedTasks = new Set<string>();
	private loadedTaskContext = new Set<string>();

	// Plan Mode guard: timestamp when plan mode was started
	// Used to prevent accidental exits immediately after starting
	private planModeStartTime: number | null = null;
	private readonly PLAN_MODE_GUARD_MS = 2000; // 2 second guard

	// =====================================================
	// Derived Values
	// =====================================================

	/**
	 * All tasks as a sorted array (high priority first, then by created date)
	 */
	taskList = $derived.by(() => {
		const _ = this._version;
		return Array.from(this.tasks.values())
			.filter((t) => t && t.id)
			.sort((a, b) => {
				// High priority first
				if (a.priority === 'high' && b.priority !== 'high') return -1;
				if (a.priority !== 'high' && b.priority === 'high') return 1;
				// Then by created date (newest first)
				return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			});
	});

	/**
	 * Only active (pending) tasks
	 */
	pendingTasks = $derived.by(() => {
		const _ = this._version;
		return this.taskList.filter((t) => t.status === 'active');
	});

	/**
	 * Count of pending tasks
	 */
	pendingCount = $derived.by(() => {
		return this.pendingTasks.length;
	});

	/**
	 * Currently focused task
	 */
	focusedTask = $derived.by(() => {
		const _ = this._version;
		if (!this.focusedTaskId) return null;
		return this.tasks.get(this.focusedTaskId) ?? null;
	});

	/**
	 * High priority tasks
	 */
	highPriorityTasks = $derived.by(() => {
		return this.pendingTasks.filter((t) => t.priority === 'high');
	});

	/**
	 * Tasks with due dates
	 */
	tasksWithDueDates = $derived.by(() => {
		return this.pendingTasks.filter((t) => t.dueDate);
	});

	/**
	 * Check if we have any tasks
	 */
	hasTasks = $derived.by(() => {
		return this.tasks.size > 0;
	});

	/**
	 * Parent tasks only (tasks without a parent)
	 */
	parentTasks = $derived.by(() => {
		const _ = this._version;
		return this.taskList.filter((t) => !t.parentTaskId);
	});

	/**
	 * Parent tasks that are pending (not completed)
	 */
	pendingParentTasks = $derived.by(() => {
		return this.parentTasks.filter((t) => t.status === 'active');
	});

	/**
	 * All tasks currently in planning status
	 * Multiple tasks can be in planning simultaneously
	 */
	planningTasks = $derived.by(() => {
		const _ = this._version;
		return Array.from(this.tasks.values()).filter((task) => task.status === 'planning');
	});

	/**
	 * Count of tasks in planning mode
	 */
	planningTaskCount = $derived.by(() => {
		return this.planningTasks.length;
	});

	/**
	 * The currently focused planning task (if any)
	 * Returns the focused task if it's in planning, otherwise the first planning task
	 * Maintained for backward compatibility
	 */
	planningTask = $derived.by(() => {
		const _ = this._version;
		// If focused task is in planning, return it
		if (this.focusedTaskId) {
			const focused = this.tasks.get(this.focusedTaskId);
			if (focused?.status === 'planning') {
				return focused;
			}
		}
		// Otherwise return first planning task (for backward compat)
		for (const task of this.tasks.values()) {
			if (task.status === 'planning') {
				return task;
			}
		}
		return null;
	});

	/**
	 * Plan mode state derived from the planning task
	 * This replaces the ephemeral planMode state with persisted data
	 */
	planMode = $derived.by((): PlanModeState | null => {
		const task = this.planningTask;
		if (!task || !task.planningData) {
			return null;
		}

		return {
			isActive: true,
			taskId: task.id,
			taskTitle: task.title,
			phase: task.planningData.phase,
			exchangeCount: task.planningData.exchangeCount || 0,
			proposedSubtasks: task.planningData.proposedSubtasks || [],
			conversationId: task.planningData.conversationId
		};
	});

	/**
	 * Check if Plan Mode is active (derived)
	 */
	isPlanModeActive = $derived(this.planningTask !== null);

	// =====================================================
	// API Methods
	// =====================================================

	/**
	 * Load tasks for a specific space from API
	 * Auto-restores Plan Mode if a task is in 'planning' status
	 */
	async loadTasks(spaceId: string): Promise<void> {
		// Skip if already loaded for this space
		if (this.initializedSpaceIds.has(spaceId)) return;

		this.isLoading = true;
		this.error = null;

		try {
			const params = new URLSearchParams({ spaceId, includeCompleted: 'true' });
			const response = await fetch(`/api/tasks?${params}`);

			if (!response.ok) {
				throw new Error(`Failed to load tasks: ${response.status}`);
			}

			const data = await response.json();

			// Add tasks to store
			if (data.tasks && Array.isArray(data.tasks)) {
				for (const task of data.tasks) {
					this.tasks.set(task.id, this.parseTaskDates(task));
				}
				this._version++;

				// Auto-restore Plan Mode: if a task is in 'planning' status, focus on it
				for (const task of data.tasks) {
					if (task.status === 'planning') {
						this.focusedTaskId = task.id;
						break;
					}
				}
			}

			this.initializedSpaceIds.add(spaceId);
		} catch (e) {
			console.error('Failed to load tasks:', e);
			this.error = e instanceof Error ? e.message : 'Failed to load tasks';
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Create a single task
	 */
	async createTask(input: CreateTaskInput): Promise<Task | null> {
		this.error = null;

		try {
			const response = await fetch('/api/tasks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...input,
					dueDate: input.dueDate?.toISOString()
				})
			});

			if (!response.ok) {
				throw new Error(`Failed to create task: ${response.status}`);
			}

			const data = await response.json();
			const task = this.parseTaskDates(data.task);

			// Add to store
			this.tasks.set(task.id, task);
			this._version++;

			return task;
		} catch (e) {
			console.error('Failed to create task:', e);
			this.error = e instanceof Error ? e.message : 'Failed to create task';
			return null;
		}
	}

	/**
	 * Create tasks from assist extraction (bulk)
	 */
	async createTasksFromAssist(
		extractedTasks: ExtractedTask[],
		spaceId: string,
		assistId: string,
		conversationId?: string,
		areaId?: string
	): Promise<Task[]> {
		this.error = null;

		try {
			const response = await fetch('/api/tasks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tasks: extractedTasks.map((t) => ({
						title: t.title,
						priority: t.priority,
						dueDate: t.dueDate, // Natural language - server can parse later
						dueDateType: t.dueDateType
					})),
					spaceId,
					areaId, // Apply to all tasks in bulk
					source: {
						type: 'assist',
						assistId,
						conversationId
					}
				})
			});

			if (!response.ok) {
				throw new Error(`Failed to create tasks: ${response.status}`);
			}

			const data = await response.json();
			const tasks = (data.tasks || []).map((t: Task) => this.parseTaskDates(t));

			// Add to store
			for (const task of tasks) {
				this.tasks.set(task.id, task);
			}
			this._version++;

			return tasks;
		} catch (e) {
			console.error('Failed to create tasks from assist:', e);
			this.error = e instanceof Error ? e.message : 'Failed to create tasks';
			return [];
		}
	}

	/**
	 * Update an existing task
	 */
	async updateTask(id: string, updates: UpdateTaskInput): Promise<Task | null> {
		this.error = null;

		try {
			const response = await fetch(`/api/tasks/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...updates,
					dueDate: updates.dueDate === null ? null : updates.dueDate?.toISOString()
				})
			});

			if (!response.ok) {
				if (response.status === 404) {
					// Task was deleted - remove from store
					this.tasks.delete(id);
					this._version++;
					return null;
				}
				throw new Error(`Failed to update task: ${response.status}`);
			}

			const data = await response.json();
			const task = this.parseTaskDates(data.task);

			// Update in store
			this.tasks.set(task.id, task);
			this._version++;

			return task;
		} catch (e) {
			console.error('Failed to update task:', e);
			this.error = e instanceof Error ? e.message : 'Failed to update task';
			return null;
		}
	}

	/**
	 * Complete a task with optional notes
	 */
	async completeTask(id: string, notes?: string): Promise<Task | null> {
		this.error = null;

		try {
			const response = await fetch(`/api/tasks/${id}/complete`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ notes })
			});

			if (!response.ok) {
				if (response.status === 404) {
					this.tasks.delete(id);
					this._version++;
					return null;
				}
				throw new Error(`Failed to complete task: ${response.status}`);
			}

			const data = await response.json();
			const task = this.parseTaskDates(data.task);

			// Update in store
			this.tasks.set(task.id, task);
			this._version++;

			// Clear focus if this was the focused task
			if (this.focusedTaskId === id) {
				this.focusedTaskId = null;
			}

			return task;
		} catch (e) {
			console.error('Failed to complete task:', e);
			this.error = e instanceof Error ? e.message : 'Failed to complete task';
			return null;
		}
	}

	/**
	 * Reopen a completed task (set status back to active)
	 */
	async reopenTask(id: string): Promise<Task | null> {
		this.error = null;

		try {
			const response = await fetch(`/api/tasks/${id}/reopen`, {
				method: 'POST'
			});

			if (!response.ok) {
				if (response.status === 404) {
					this.tasks.delete(id);
					this._version++;
					return null;
				}
				throw new Error(`Failed to reopen task: ${response.status}`);
			}

			const data = await response.json();
			const task = this.parseTaskDates(data.task);

			// Update in store
			this.tasks.set(task.id, task);
			this._version++;

			return task;
		} catch (e) {
			console.error('Failed to reopen task:', e);
			this.error = e instanceof Error ? e.message : 'Failed to reopen task';
			return null;
		}
	}

	/**
	 * Get info about what will be deleted with a task
	 * Used to show confirmation dialog
	 */
	getTaskDeletionInfo(taskId: string): { subtaskCount: number; conversationCount: number } {
		const task = this.tasks.get(taskId);
		if (!task) return { subtaskCount: 0, conversationCount: 0 };

		const subtaskCount = this.getSubtaskCount(taskId);
		const conversationCount = task.linkedConversationIds?.length || 0;

		return { subtaskCount, conversationCount };
	}

	/**
	 * Delete a task (soft delete)
	 * Always cascades to subtasks (orphaned subtasks make no sense)
	 * Optionally deletes linked conversations
	 */
	async deleteTask(id: string, options?: { deleteConversations?: boolean }): Promise<boolean> {
		this.error = null;

		try {
			const params = new URLSearchParams();
			if (options?.deleteConversations) {
				params.set('deleteConversations', 'true');
			}

			const url = `/api/tasks/${id}${params.toString() ? `?${params}` : ''}`;
			const response = await fetch(url, {
				method: 'DELETE'
			});

			if (!response.ok && response.status !== 404) {
				throw new Error(`Failed to delete task: ${response.status}`);
			}

			// Remove subtasks from store first
			for (const [subtaskId, task] of this.tasks) {
				if (task.parentTaskId === id) {
					this.tasks.delete(subtaskId);
				}
			}

			// Remove the task from store
			this.tasks.delete(id);
			this._version++;

			// Clear focus if this was the focused task
			if (this.focusedTaskId === id) {
				this.focusedTaskId = null;
			}

			return true;
		} catch (e) {
			console.error('Failed to delete task:', e);
			this.error = e instanceof Error ? e.message : 'Failed to delete task';
			return false;
		}
	}

	// =====================================================
	// Focus Mode Methods
	// =====================================================

	/**
	 * Set the focused task
	 */
	setFocusedTask(id: string | null): void {
		this.focusedTaskId = id;
	}

	/**
	 * Exit focus mode
	 */
	exitFocusMode(): void {
		this.focusedTaskId = null;
		this.planJustCompleted = null;
	}

	/**
	 * Clear the plan completion state
	 * Called when user starts working on a subtask or dismisses the completion UI
	 */
	clearPlanJustCompleted(): void {
		this.planJustCompleted = null;
	}

	/**
	 * Start a subtask from the Plan Complete screen
	 * Clears the completion state and focuses on the subtask
	 */
	startSubtaskFromPlanComplete(subtaskId: string): void {
		this.clearPlanJustCompleted();
		this.setFocusedTask(subtaskId);
	}

	/**
	 * Focus on the next pending task (useful after completing one)
	 */
	focusNextTask(): void {
		const pending = this.pendingTasks;
		if (pending.length === 0) {
			this.focusedTaskId = null;
			return;
		}

		// Find next task after current, or first if at end
		if (this.focusedTaskId) {
			const currentIndex = pending.findIndex((t) => t.id === this.focusedTaskId);
			if (currentIndex >= 0 && currentIndex < pending.length - 1) {
				this.focusedTaskId = pending[currentIndex + 1].id;
				return;
			}
		}

		// Default to first pending task
		this.focusedTaskId = pending[0].id;
	}

	// =====================================================
	// Task-Conversation Linking Methods
	// =====================================================

	/**
	 * Link a conversation to a task
	 */
	async linkConversation(taskId: string, conversationId: string): Promise<Task | null> {
		this.error = null;

		try {
			const response = await fetch(`/api/tasks/${taskId}/link`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ conversationId })
			});

			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				throw new Error(`Failed to link conversation: ${response.status}`);
			}

			const data = await response.json();
			const task = this.parseTaskDates(data.task);

			// Update in store
			this.tasks.set(task.id, task);
			this._version++;

			return task;
		} catch (e) {
			console.error('Failed to link conversation:', e);
			this.error = e instanceof Error ? e.message : 'Failed to link conversation';
			return null;
		}
	}

	/**
	 * Unlink a conversation from a task
	 */
	async unlinkConversation(taskId: string, conversationId: string): Promise<Task | null> {
		this.error = null;

		try {
			const response = await fetch(`/api/tasks/${taskId}/link`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ conversationId })
			});

			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				throw new Error(`Failed to unlink conversation: ${response.status}`);
			}

			const data = await response.json();
			const task = this.parseTaskDates(data.task);

			// Update in store
			this.tasks.set(task.id, task);
			this._version++;

			return task;
		} catch (e) {
			console.error('Failed to unlink conversation:', e);
			this.error = e instanceof Error ? e.message : 'Failed to unlink conversation';
			return null;
		}
	}

	/**
	 * Get task linked to a specific conversation
	 */
	getTaskForConversation(conversationId: string): Task | null {
		for (const task of this.tasks.values()) {
			if (task.linkedConversationIds?.includes(conversationId)) {
				return task;
			}
		}
		return null;
	}

	/**
	 * Check if a conversation is linked to any task
	 */
	isConversationLinked(conversationId: string): boolean {
		return this.getTaskForConversation(conversationId) !== null;
	}

	// =====================================================
	// Subtask Methods (Phase 0.3d++)
	// =====================================================

	/**
	 * Create a subtask under a parent task
	 */
	async createSubtask(input: CreateSubtaskInput): Promise<Task | null> {
		this.error = null;

		try {
			const response = await fetch(`/api/tasks/${input.parentTaskId}/subtasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: input.title,
					subtaskType: input.subtaskType ?? 'conversation',
					priority: input.priority ?? 'normal',
					sourceConversationId: input.sourceConversationId,
					contextSummary: input.contextSummary // Rich context from Plan Mode
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `Failed to create subtask: ${response.status}`);
			}

			const data = await response.json();
			const subtask = this.parseTaskDates(data.subtask);

			// Add to store
			this.tasks.set(subtask.id, subtask);
			this._version++;

			// Auto-expand parent
			this.expandedTasks.add(input.parentTaskId);

			return subtask;
		} catch (e) {
			console.error('Failed to create subtask:', e);
			this.error = e instanceof Error ? e.message : 'Failed to create subtask';
			return null;
		}
	}

	/**
	 * Get subtasks for a parent task, sorted by subtask order
	 */
	getSubtasksForTask(parentId: string): Task[] {
		const _ = this._version;
		const subtasks = Array.from(this.tasks.values())
			.filter((t) => t.parentTaskId === parentId);

		// Sort by subtask_order (ascending), fallback to created date
		return [...subtasks].sort((a, b) => {
			if (a.subtaskOrder !== undefined && b.subtaskOrder !== undefined) {
				return a.subtaskOrder - b.subtaskOrder;
			}
			return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
		});
	}

	/**
	 * Get count of subtasks for a parent task
	 */
	getSubtaskCount(parentId: string): number {
		return this.getSubtasksForTask(parentId).length;
	}

	/**
	 * Get count of completed subtasks for a parent task
	 */
	getCompletedSubtaskCount(parentId: string): number {
		return this.getSubtasksForTask(parentId).filter((t) => t.status === 'completed').length;
	}

	/**
	 * Check if a task has subtasks
	 */
	hasSubtasks(taskId: string): boolean {
		return this.getSubtaskCount(taskId) > 0;
	}

	/**
	 * Check if a task can have subtasks (not itself a subtask)
	 */
	canHaveSubtasks(taskId: string): boolean {
		const task = this.tasks.get(taskId);
		return task ? !task.parentTaskId : false;
	}

	/**
	 * Toggle expanded state for a task
	 */
	toggleTaskExpanded(taskId: string): void {
		if (this.expandedTasks.has(taskId)) {
			this.expandedTasks.delete(taskId);
		} else {
			this.expandedTasks.add(taskId);
		}
		// Force reactivity update
		this.expandedTasks = new Set(this.expandedTasks);
	}

	/**
	 * Check if a task is expanded
	 */
	isTaskExpanded(taskId: string): boolean {
		return this.expandedTasks.has(taskId);
	}

	/**
	 * Expand a task to show its subtasks
	 */
	expandTask(taskId: string): void {
		this.expandedTasks.add(taskId);
		this.expandedTasks = new Set(this.expandedTasks);
	}

	/**
	 * Collapse a task to hide its subtasks
	 */
	collapseTask(taskId: string): void {
		this.expandedTasks.delete(taskId);
		this.expandedTasks = new Set(this.expandedTasks);
	}

	/**
	 * Get the parent task for a subtask
	 */
	getParentTask(subtaskId: string): Task | null {
		const subtask = this.tasks.get(subtaskId);
		if (!subtask?.parentTaskId) return null;
		return this.tasks.get(subtask.parentTaskId) ?? null;
	}

	// =====================================================
	// Plan Mode Methods (Phase 0.3d++ - Persistent)
	// =====================================================

	/**
	 * Start Plan Mode for a task
	 * Sets task status to 'planning' and initializes planning_data
	 * Multiple tasks can be in planning simultaneously
	 */
	async startPlanMode(taskId: string, conversationId?: string): Promise<{ success: boolean; existingPlanningCount: number }> {
		const task = this.tasks.get(taskId);
		if (!task) return { success: false, existingPlanningCount: 0 };

		// Subtasks cannot enter planning mode - they can't have children
		if (task.parentTaskId) {
			console.warn('Cannot start plan mode on a subtask:', taskId);
			return { success: false, existingPlanningCount: 0 };
		}

		// Track how many tasks are already in planning (for toast notification)
		const existingPlanningCount = this.planningTaskCount;

		const planningData: PlanningData = {
			phase: 'eliciting',
			exchangeCount: 0, // Initialize to 0 for tracking conversation depth
			proposedSubtasks: [],
			conversationId,
			startedAt: new Date().toISOString()
		};

		try {
			// Update task status to 'planning' and set planning_data
			const response = await fetch(`/api/tasks/${taskId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'planning' })
			});

			if (!response.ok) {
				throw new Error(`Failed to start plan mode: ${response.status}`);
			}

			// Set planning data via dedicated endpoint
			const planResponse = await fetch(`/api/tasks/${taskId}/planning`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ planningData })
			});

			if (!planResponse.ok) {
				throw new Error(`Failed to set planning data: ${planResponse.status}`);
			}

			const data = await planResponse.json();
			const updatedTask = this.parseTaskDates(data.task);

			// Update in store
			this.tasks.set(updatedTask.id, updatedTask);
			this._version++;

			// Auto-focus on planning task
			this.focusedTaskId = taskId;

			// Set guard timestamp to prevent accidental immediate exits
			this.planModeStartTime = Date.now();

			return { success: true, existingPlanningCount };
		} catch (e) {
			console.error('Failed to start plan mode:', e);
			this.error = e instanceof Error ? e.message : 'Failed to start plan mode';
			return { success: false, existingPlanningCount };
		}
	}

	/**
	 * Exit Plan Mode (cancel or complete)
	 * Sets task status back to 'active' and clears planning_data
	 */
	async exitPlanMode(): Promise<boolean> {
		// Guard: Prevent accidental exits immediately after starting
		if (this.planModeStartTime) {
			const elapsed = Date.now() - this.planModeStartTime;
			if (elapsed < this.PLAN_MODE_GUARD_MS) {
				return false;
			}
		}

		const task = this.planningTask;
		if (!task) {
			return false;
		}

		try {
			// Clear planning data first
			const planResponse = await fetch(`/api/tasks/${task.id}/planning`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ planningData: null })
			});

			if (!planResponse.ok) {
				throw new Error(`Failed to clear planning data: ${planResponse.status}`);
			}

			// Update task status back to 'active'
			const response = await fetch(`/api/tasks/${task.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'active' })
			});

			if (!response.ok) {
				throw new Error(`Failed to exit plan mode: ${response.status}`);
			}

			const data = await response.json();
			const updatedTask = this.parseTaskDates(data.task);

			// Update in store
			this.tasks.set(updatedTask.id, updatedTask);
			this._version++;

			// Clear the guard timestamp
			this.planModeStartTime = null;

			return true;
		} catch (e) {
			console.error('Failed to exit plan mode:', e);
			this.error = e instanceof Error ? e.message : 'Failed to exit plan mode';
			return false;
		}
	}

	/**
	 * Set the Plan Mode phase
	 */
	async setPlanModePhase(phase: PlanModePhase): Promise<boolean> {
		const task = this.planningTask;
		if (!task?.planningData) return false;

		const planningData: PlanningData = {
			...task.planningData,
			phase
		};

		return this.updatePlanningData(task.id, planningData);
	}

	/**
	 * Increment the exchange count for Plan Mode
	 * Called after each successful AI response during elicitation
	 *
	 * IMPORTANT: This must properly update the store with the server response
	 * to maintain reactivity. Mutating nested properties alone doesn't trigger
	 * Svelte 5's fine-grained reactivity properly.
	 */
	async incrementExchangeCount(taskId: string): Promise<void> {
		const task = this.tasks.get(taskId);
		if (!task?.planningData) {
			return;
		}

		const newCount = (task.planningData.exchangeCount || 0) + 1;

		// Build the updated planning data
		const updatedPlanningData: PlanningData = {
			...task.planningData,
			exchangeCount: newCount
		};

		// Persist to database AND update store with response
		try {
			const response = await fetch(`/api/tasks/${taskId}/planning`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ planningData: updatedPlanningData })
			});

			if (!response.ok) {
				throw new Error(`Failed to update exchange count: ${response.status}`);
			}

			// CRITICAL: Update store with server response to maintain sync
			const data = await response.json();
			const updatedTask = this.parseTaskDates(data.task);

			// Replace the task in the store with the server's version
			this.tasks.set(updatedTask.id, updatedTask);
			this._version++;
		} catch (error) {
			console.error('Failed to persist exchange count:', error);
			// Fallback: update local state to at least keep UI responsive
			// Create a new task object to ensure reactivity
			const fallbackTask: Task = {
				...task,
				planningData: updatedPlanningData
			};
			this.tasks.set(taskId, fallbackTask);
			this._version++;
		}
	}

	/**
	 * Set proposed subtasks from AI
	 */
	async setProposedSubtasks(subtasks: ProposedSubtask[]): Promise<boolean> {
		const task = this.planningTask;
		if (!task?.planningData) return false;

		const planningData: PlanningData = {
			...task.planningData,
			proposedSubtasks: subtasks
		};

		return this.updatePlanningData(task.id, planningData);
	}

	/**
	 * Set synopsis for Plan Mode (shown on Review Breakdown screen)
	 * Called after subtask extraction, before confirming phase
	 */
	async setSynopsis(synopsis: PlanModeSynopsis | null): Promise<boolean> {
		const task = this.planningTask;
		if (!task?.planningData) return false;

		const planningData: PlanningData = {
			...task.planningData,
			synopsis: synopsis ?? undefined
		};

		return this.updatePlanningData(task.id, planningData);
	}

	/**
	 * Update a proposed subtask
	 */
	async updateProposedSubtask(id: string, updates: Partial<ProposedSubtask>): Promise<boolean> {
		const task = this.planningTask;
		if (!task?.planningData) return false;

		const subtasks = task.planningData.proposedSubtasks.map((s) =>
			s.id === id ? { ...s, ...updates } : s
		);

		const planningData: PlanningData = {
			...task.planningData,
			proposedSubtasks: subtasks
		};

		return this.updatePlanningData(task.id, planningData);
	}

	/**
	 * Toggle confirmation status for a proposed subtask
	 */
	async toggleProposedSubtask(id: string): Promise<boolean> {
		const task = this.planningTask;
		if (!task?.planningData) return false;

		const subtasks = task.planningData.proposedSubtasks.map((s) =>
			s.id === id ? { ...s, confirmed: !s.confirmed } : s
		);

		const planningData: PlanningData = {
			...task.planningData,
			proposedSubtasks: subtasks
		};

		return this.updatePlanningData(task.id, planningData);
	}

	/**
	 * Add a new proposed subtask
	 */
	async addProposedSubtask(title: string, type: SubtaskType = 'conversation'): Promise<boolean> {
		const task = this.planningTask;
		if (!task?.planningData) return false;

		const id = `proposed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
		const newSubtask: ProposedSubtask = { id, title, type, confirmed: true };

		const planningData: PlanningData = {
			...task.planningData,
			proposedSubtasks: [...task.planningData.proposedSubtasks, newSubtask]
		};

		return this.updatePlanningData(task.id, planningData);
	}

	/**
	 * Remove a proposed subtask
	 */
	async removeProposedSubtask(id: string): Promise<boolean> {
		const task = this.planningTask;
		if (!task?.planningData) return false;

		const subtasks = task.planningData.proposedSubtasks.filter((s) => s.id !== id);

		const planningData: PlanningData = {
			...task.planningData,
			proposedSubtasks: subtasks
		};

		return this.updatePlanningData(task.id, planningData);
	}

	/**
	 * Generate rich context for Plan Mode subtasks via LLM
	 * Returns synopsis for the overall breakdown and context for each subtask
	 */
	async generatePlanContext(): Promise<{
		synopsis: PlanModeSynopsis;
		subtaskContexts: Map<string, SubtaskContext>;
	} | null> {
		const task = this.planningTask;
		if (!task?.planningData) return null;

		const confirmed = task.planningData.proposedSubtasks.filter((s) => s.confirmed);
		if (confirmed.length === 0) return null;

		try {
			const response = await fetch('/api/plan-context', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					taskTitle: task.title,
					proposedSubtasks: confirmed.map((s) => ({
						id: s.id,
						title: s.title,
						type: s.type
					}))
				})
			});

			if (!response.ok) {
				console.error('Failed to generate plan context:', response.status);
				return null;
			}

			const data = await response.json();

			// Build a map of subtask contexts for easy lookup
			const subtaskContexts = new Map<string, SubtaskContext>();
			if (data.subtaskContexts) {
				for (const ctx of data.subtaskContexts) {
					subtaskContexts.set(ctx.id, {
						whyImportant: ctx.whyImportant,
						definitionOfDone: ctx.definitionOfDone,
						hints: ctx.hints || []
					});
				}
			}

			return {
				synopsis: data.synopsis as PlanModeSynopsis,
				subtaskContexts
			};
		} catch (e) {
			console.error('Failed to generate plan context:', e);
			return null;
		}
	}

	/**
	 * Create subtasks from confirmed proposed subtasks
	 * Generates rich context via LLM, then creates subtasks with that context
	 * The Plan Mode conversation ID is stored on each subtask for context injection
	 */
	async createSubtasksFromPlanMode(): Promise<Task[]> {
		const task = this.planningTask;
		if (!task?.planningData) return [];

		const confirmed = task.planningData.proposedSubtasks.filter((s) => s.confirmed);
		if (confirmed.length === 0) return [];

		const createdSubtasks: Task[] = [];

		// Get the Plan Mode conversation ID to store on subtasks
		const planModeConversationId = task.planningData.conversationId;
		const parentTaskId = task.id;

		// Generate rich context for subtasks via LLM
		// This runs during the "Working on your subtasks..." loading phase
		const planContext = await this.generatePlanContext();

		// Store synopsis on parent task's planning data before exiting plan mode
		if (planContext?.synopsis) {
			const updatedPlanningData: PlanningData = {
				...task.planningData,
				synopsis: planContext.synopsis
			};
			await this.updatePlanningData(parentTaskId, updatedPlanningData);
		}

		// Create subtasks with their individual context
		for (const proposed of confirmed) {
			// Get context for this specific subtask
			const subtaskContext = planContext?.subtaskContexts.get(proposed.id);

			const subtask = await this.createSubtask({
				title: proposed.title,
				parentTaskId: parentTaskId,
				subtaskType: proposed.type,
				sourceConversationId: planModeConversationId, // Pass Plan Mode conversation for context
				contextSummary: subtaskContext ? JSON.stringify(subtaskContext) : undefined
			});
			if (subtask) {
				createdSubtasks.push(subtask);
			}
		}

		// Exit plan mode after creating subtasks
		await this.exitPlanMode();

		// Set planJustCompleted to trigger the "Plan Complete" UX
		// This gives the user a clear transition from planning to execution
		if (createdSubtasks.length > 0) {
			this.planJustCompleted = {
				taskId: parentTaskId,
				subtaskCount: createdSubtasks.length,
				firstSubtaskId: createdSubtasks[0]?.id,
				synopsis: planContext?.synopsis
			};
		}

		return createdSubtasks;
	}

	/**
	 * Internal helper to update planning data via API
	 */
	private async updatePlanningData(taskId: string, planningData: PlanningData): Promise<boolean> {
		try {
			const response = await fetch(`/api/tasks/${taskId}/planning`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ planningData })
			});

			if (!response.ok) {
				throw new Error(`Failed to update planning data: ${response.status}`);
			}

			const data = await response.json();
			const updatedTask = this.parseTaskDates(data.task);

			// Update in store
			this.tasks.set(updatedTask.id, updatedTask);
			this._version++;

			return true;
		} catch (e) {
			console.error('Failed to update planning data:', e);
			this.error = e instanceof Error ? e.message : 'Failed to update planning data';
			return false;
		}
	}

	/**
	 * Pause Plan Mode (close panel but keep task in planning status)
	 * This allows users to work on other tasks and resume planning later
	 */
	pausePlanMode(): void {
		// Just clear focus - task stays in 'planning' status with saved data
		if (this.planningTask) {
			this.focusedTaskId = null;
		}
	}

	/**
	 * Resume Plan Mode for a paused planning task
	 */
	resumePlanMode(taskId: string): boolean {
		const task = this.tasks.get(taskId);
		if (!task || task.status !== 'planning') return false;

		// Re-focus on the planning task
		this.focusedTaskId = taskId;
		return true;
	}

	/**
	 * Check if there's a paused planning task (not currently focused)
	 */
	get hasPausedPlanningTask(): boolean {
		return this.planningTask !== null && this.focusedTaskId !== this.planningTask?.id;
	}

	// =====================================================
	// Related Tasks Methods (Task Context System)
	// =====================================================

	/**
	 * Load related tasks for a task
	 */
	async loadRelatedTasks(taskId: string): Promise<void> {
		if (this.loadedRelatedTasks.has(taskId)) return;

		try {
			const response = await fetch(`/api/tasks/${taskId}/related`);

			if (!response.ok) {
				if (response.status === 404) {
					this.relatedTasks.set(taskId, []);
					return;
				}
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.relatedTasks) {
				const related: RelatedTaskInfo[] = data.relatedTasks.map(
					(rt: {
						id: string;
						title: string;
						status: string;
						priority: string;
						color: string;
						contextSummary?: string;
						relationshipType: string;
						direction: 'outgoing' | 'incoming';
					}) => ({
						task: {
							id: rt.id,
							title: rt.title,
							status: rt.status,
							priority: rt.priority,
							color: rt.color,
							contextSummary: rt.contextSummary
						} as Task,
						relationshipType: rt.relationshipType as TaskRelationshipType,
						direction: rt.direction
					})
				);
				this.relatedTasks.set(taskId, related);
				this.loadedRelatedTasks.add(taskId);
				this._version++;
			}
		} catch (e) {
			console.error('Failed to load related tasks:', e);
			this.relatedTasks.set(taskId, []);
		}
	}

	/**
	 * Link a related task
	 */
	async linkRelatedTask(
		sourceId: string,
		targetId: string,
		type: TaskRelationshipType = 'related'
	): Promise<boolean> {
		try {
			const response = await fetch(`/api/tasks/${sourceId}/related`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					targetTaskId: targetId,
					relationshipType: type
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Link failed: ${response.status}`);
			}

			// Refresh related tasks for both source and target
			this.loadedRelatedTasks.delete(sourceId);
			this.loadedRelatedTasks.delete(targetId);
			await this.loadRelatedTasks(sourceId);

			// Clear context cache since it changed
			this.clearTaskContext(sourceId);

			return true;
		} catch (e) {
			console.error('Failed to link related task:', e);
			this.error = e instanceof Error ? e.message : 'Failed to link task';
			return false;
		}
	}

	/**
	 * Unlink a related task
	 */
	async unlinkRelatedTask(sourceId: string, targetId: string): Promise<boolean> {
		try {
			const response = await fetch(`/api/tasks/${sourceId}/related?targetTaskId=${targetId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error(`Unlink failed: ${response.status}`);
			}

			// Update local cache
			const current = this.relatedTasks.get(sourceId) ?? [];
			this.relatedTasks.set(
				sourceId,
				current.filter((rt) => rt.task.id !== targetId)
			);
			this._version++;

			// Clear context cache since it changed
			this.clearTaskContext(sourceId);

			return true;
		} catch (e) {
			console.error('Failed to unlink related task:', e);
			this.error = e instanceof Error ? e.message : 'Failed to unlink task';
			return false;
		}
	}

	/**
	 * Get related tasks for a task (from cache)
	 */
	getRelatedTasks(taskId: string): RelatedTaskInfo[] {
		return this.relatedTasks.get(taskId) ?? [];
	}

	// =====================================================
	// Task Context Methods (Plan Mode)
	// =====================================================

	/**
	 * Load full task context (documents + related tasks)
	 */
	async loadTaskContext(taskId: string): Promise<TaskContextInfo | null> {
		if (this.loadedTaskContext.has(taskId)) {
			return this.taskContext.get(taskId) ?? null;
		}

		try {
			const response = await fetch(`/api/tasks/${taskId}/context`);

			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.context) {
				const context: TaskContextInfo = {
					documents: data.context.documents,
					relatedTasks: data.context.relatedTasks
				};
				this.taskContext.set(taskId, context);
				this.loadedTaskContext.add(taskId);
				this._version++;
				return context;
			}

			return null;
		} catch (e) {
			console.error('Failed to load task context:', e);
			return null;
		}
	}

	/**
	 * Get task context from cache
	 */
	getTaskContext(taskId: string): TaskContextInfo | undefined {
		return this.taskContext.get(taskId);
	}

	/**
	 * Clear task context cache (forces reload)
	 */
	clearTaskContext(taskId: string): void {
		this.loadedTaskContext.delete(taskId);
		this.taskContext.delete(taskId);
		this._version++;
	}

	/**
	 * Clear related tasks cache (forces reload)
	 */
	clearRelatedTasksCache(taskId: string): void {
		this.loadedRelatedTasks.delete(taskId);
		this.relatedTasks.delete(taskId);
		this._version++;
	}

	// =====================================================
	// Helper Methods
	// =====================================================

	/**
	 * Get tasks for a specific space
	 */
	getTasksForSpaceId(spaceId: string): Task[] {
		return this.taskList.filter((t) => t.spaceId === spaceId);
	}

	/**
	 * Get tasks for a specific area
	 */
	getTasksForAreaId(areaId: string): Task[] {
		return this.taskList.filter((t) => t.areaId === areaId);
	}

	/**
	 * Get pending tasks for a specific space
	 */
	getPendingTasksForSpaceId(spaceId: string): Task[] {
		return this.pendingTasks.filter((t) => t.spaceId === spaceId);
	}

	/**
	 * Get task by ID
	 */
	getTask(id: string): Task | undefined {
		return this.tasks.get(id);
	}

	/**
	 * Force reload tasks for a space
	 */
	async reloadTasks(spaceId: string): Promise<void> {
		this.initializedSpaceIds.delete(spaceId);
		// Clear tasks for this space
		for (const [id, task] of this.tasks) {
			if (task.spaceId === spaceId) {
				this.tasks.delete(id);
			}
		}
		this._version++;
		await this.loadTasks(spaceId);
	}

	/**
	 * Clear all tasks (for testing/logout)
	 * Note: planMode is derived from tasks, so clearing tasks will clear plan mode
	 */
	clearAll(): void {
		this.tasks = new SvelteMap();
		this.focusedTaskId = null;
		this.expandedTasks = new Set();
		// planMode is derived from tasks with status='planning', no need to clear
		this.relatedTasks.clear();
		this.taskContext.clear();
		this.initializedSpaceIds.clear();
		this.loadedRelatedTasks.clear();
		this.loadedTaskContext.clear();
		this.error = null;
		this._version = 0;
	}

	/**
	 * Parse date strings from API response into Date objects
	 */
	private parseTaskDates(task: Task): Task {
		return {
			...task,
			dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
			completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
			staleDismissedAt: task.staleDismissedAt ? new Date(task.staleDismissedAt) : undefined,
			lastActivityAt: new Date(task.lastActivityAt),
			createdAt: new Date(task.createdAt),
			updatedAt: new Date(task.updatedAt),
			deletedAt: task.deletedAt ? new Date(task.deletedAt) : undefined
		};
	}

	// =====================================================
	// Stats & Stale Detection Methods
	// =====================================================

	/**
	 * Dismiss stale warning for a task
	 * Sets staleDismissedAt to now, which prevents the task from showing as stale
	 * until there's new activity and then 7+ more days of inactivity
	 */
	async dismissStale(taskId: string): Promise<Task | null> {
		return this.updateTask(taskId, { staleDismissedAt: new Date() });
	}

	/**
	 * Check if a task is stale (7+ days no activity, not dismissed)
	 */
	isStale(task: Task): boolean {
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		// Not stale if recent activity
		if (new Date(task.lastActivityAt) >= sevenDaysAgo) return false;

		// Stale if never dismissed
		if (!task.staleDismissedAt) return true;

		// Stale if dismissed before last activity (dismissal was "reset" by activity)
		return new Date(task.staleDismissedAt) < new Date(task.lastActivityAt);
	}

	/**
	 * Get count of tasks completed today for a space
	 */
	getCompletedToday(spaceId: string): number {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return Array.from(this.tasks.values()).filter((t) => {
			if (t.spaceId !== spaceId) return false;
			if (t.status !== 'completed') return false;
			if (!t.completedAt) return false;

			const completedDate = new Date(t.completedAt);
			completedDate.setHours(0, 0, 0, 0);
			return completedDate.getTime() === today.getTime();
		}).length;
	}

	/**
	 * Calculate completion streak (consecutive days with at least one completion)
	 * Streak continues if today has completions, or if yesterday had completions
	 */
	calculateStreak(spaceId: string): number {
		// Get all completed tasks with completedAt for this space
		const completedTasks = Array.from(this.tasks.values()).filter(
			(t) => t.spaceId === spaceId && t.status === 'completed' && t.completedAt
		);

		if (completedTasks.length === 0) return 0;

		// Get unique completion dates (as date strings YYYY-MM-DD)
		const completionDates = new Set<string>();
		for (const task of completedTasks) {
			const date = new Date(task.completedAt!);
			date.setHours(0, 0, 0, 0);
			completionDates.add(date.toISOString().split('T')[0]);
		}

		// Start counting from today
		let streak = 0;
		const checkDate = new Date();
		checkDate.setHours(0, 0, 0, 0);

		const todayStr = checkDate.toISOString().split('T')[0];

		// If nothing completed today, check if streak continues from yesterday
		if (!completionDates.has(todayStr)) {
			checkDate.setDate(checkDate.getDate() - 1);
			const yesterdayStr = checkDate.toISOString().split('T')[0];
			if (!completionDates.has(yesterdayStr)) {
				return 0; // No streak - no completions today or yesterday
			}
		}

		// Count consecutive days backwards
		while (completionDates.has(checkDate.toISOString().split('T')[0])) {
			streak++;
			checkDate.setDate(checkDate.getDate() - 1);
		}

		return streak;
	}
}

// Export singleton instance
export const taskStore = new TaskStore();
