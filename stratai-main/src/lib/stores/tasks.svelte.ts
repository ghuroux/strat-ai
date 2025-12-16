/**
 * Task Store - Persistent task management for productivity features
 * Uses Svelte 5 runes for reactivity
 *
 * Tasks are the CENTRAL HUB of the productivity OS.
 * All other assists (Meeting Summary, Decision Log, etc.) feed into/from the task list.
 */

import { SvelteMap } from 'svelte/reactivity';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskListFilter, ExtractedTask, CreateSubtaskInput, PlanModeState, ProposedSubtask, SubtaskType } from '$lib/types/tasks';
import type { SpaceType } from '$lib/types/chat';

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

	// Plan Mode state
	planMode = $state<PlanModeState | null>(null);

	// Version counter for fine-grained updates
	_version = $state(0);

	// Initialization tracking
	private initializedSpaces = new Set<SpaceType>();

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

	// =====================================================
	// API Methods
	// =====================================================

	/**
	 * Load tasks for a specific space from API
	 */
	async loadTasks(space: SpaceType): Promise<void> {
		// Skip if already loaded for this space
		if (this.initializedSpaces.has(space)) return;

		this.isLoading = true;
		this.error = null;

		try {
			const params = new URLSearchParams({ space });
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
			}

			this.initializedSpaces.add(space);
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
		space: SpaceType,
		assistId: string,
		conversationId?: string
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
					space,
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
	 * Delete a task (soft delete)
	 */
	async deleteTask(id: string): Promise<boolean> {
		this.error = null;

		try {
			const response = await fetch(`/api/tasks/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok && response.status !== 404) {
				throw new Error(`Failed to delete task: ${response.status}`);
			}

			// Remove from store
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
					priority: input.priority ?? 'normal'
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
	 * Get subtasks for a parent task
	 */
	getSubtasksForTask(parentId: string): Task[] {
		const _ = this._version;
		return Array.from(this.tasks.values())
			.filter((t) => t.parentTaskId === parentId)
			.sort((a, b) => {
				// Sort by subtask_order, then by created date
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
	// Plan Mode Methods (Phase 0.3d++)
	// =====================================================

	/**
	 * Start Plan Mode for a task
	 */
	startPlanMode(taskId: string, conversationId?: string): void {
		const task = this.tasks.get(taskId);
		if (!task) return;

		this.planMode = {
			isActive: true,
			taskId,
			taskTitle: task.title,
			phase: 'eliciting',
			proposedSubtasks: [],
			conversationId
		};
	}

	/**
	 * Exit Plan Mode
	 */
	exitPlanMode(): void {
		this.planMode = null;
	}

	/**
	 * Set the Plan Mode phase
	 */
	setPlanModePhase(phase: PlanModeState['phase']): void {
		if (this.planMode) {
			this.planMode = { ...this.planMode, phase };
		}
	}

	/**
	 * Set proposed subtasks from AI
	 */
	setProposedSubtasks(subtasks: ProposedSubtask[]): void {
		if (this.planMode) {
			this.planMode = { ...this.planMode, proposedSubtasks: subtasks };
		}
	}

	/**
	 * Update a proposed subtask
	 */
	updateProposedSubtask(id: string, updates: Partial<ProposedSubtask>): void {
		if (this.planMode) {
			const subtasks = this.planMode.proposedSubtasks.map((s) =>
				s.id === id ? { ...s, ...updates } : s
			);
			this.planMode = { ...this.planMode, proposedSubtasks: subtasks };
		}
	}

	/**
	 * Toggle confirmation status for a proposed subtask
	 */
	toggleProposedSubtask(id: string): void {
		if (this.planMode) {
			const subtasks = this.planMode.proposedSubtasks.map((s) =>
				s.id === id ? { ...s, confirmed: !s.confirmed } : s
			);
			this.planMode = { ...this.planMode, proposedSubtasks: subtasks };
		}
	}

	/**
	 * Add a new proposed subtask
	 */
	addProposedSubtask(title: string, type: SubtaskType = 'conversation'): void {
		if (this.planMode) {
			const id = `proposed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
			const newSubtask: ProposedSubtask = { id, title, type, confirmed: true };
			this.planMode = {
				...this.planMode,
				proposedSubtasks: [...this.planMode.proposedSubtasks, newSubtask]
			};
		}
	}

	/**
	 * Remove a proposed subtask
	 */
	removeProposedSubtask(id: string): void {
		if (this.planMode) {
			const subtasks = this.planMode.proposedSubtasks.filter((s) => s.id !== id);
			this.planMode = { ...this.planMode, proposedSubtasks: subtasks };
		}
	}

	/**
	 * Create subtasks from confirmed proposed subtasks
	 */
	async createSubtasksFromPlanMode(): Promise<Task[]> {
		if (!this.planMode) return [];

		const confirmed = this.planMode.proposedSubtasks.filter((s) => s.confirmed);
		const createdSubtasks: Task[] = [];

		for (const proposed of confirmed) {
			const subtask = await this.createSubtask({
				title: proposed.title,
				parentTaskId: this.planMode.taskId,
				subtaskType: proposed.type
			});
			if (subtask) {
				createdSubtasks.push(subtask);
			}
		}

		// Exit plan mode after creating subtasks
		this.exitPlanMode();

		return createdSubtasks;
	}

	/**
	 * Check if Plan Mode is active
	 */
	get isPlanModeActive(): boolean {
		return this.planMode?.isActive ?? false;
	}

	// =====================================================
	// Helper Methods
	// =====================================================

	/**
	 * Get tasks for a specific space
	 */
	getTasksForSpace(space: SpaceType): Task[] {
		return this.taskList.filter((t) => t.space === space);
	}

	/**
	 * Get pending tasks for a specific space
	 */
	getPendingTasksForSpace(space: SpaceType): Task[] {
		return this.pendingTasks.filter((t) => t.space === space);
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
	async reloadTasks(space: SpaceType): Promise<void> {
		this.initializedSpaces.delete(space);
		// Clear tasks for this space
		for (const [id, task] of this.tasks) {
			if (task.space === space) {
				this.tasks.delete(id);
			}
		}
		this._version++;
		await this.loadTasks(space);
	}

	/**
	 * Clear all tasks (for testing/logout)
	 */
	clearAll(): void {
		this.tasks = new SvelteMap();
		this.focusedTaskId = null;
		this.expandedTasks = new Set();
		this.planMode = null;
		this.initializedSpaces.clear();
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
			lastActivityAt: new Date(task.lastActivityAt),
			createdAt: new Date(task.createdAt),
			updatedAt: new Date(task.updatedAt),
			deletedAt: task.deletedAt ? new Date(task.deletedAt) : undefined
		};
	}
}

// Export singleton instance
export const taskStore = new TaskStore();
