<!--
	TaskDashboard.svelte

	Main Task Dashboard component with time-based grouping.
	Groups tasks into: Needs Attention, Today, This Week, Later, Anytime

	Features:
	- Time-based task grouping
	- Quick complete with undo
	- Stale task detection (7+ days)
	- Overdue detection (hard deadline passed)
-->
<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import type { Task } from '$lib/types/tasks';
	import type { Area } from '$lib/types/areas';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import TaskGroupSection from './TaskGroupSection.svelte';
	import CompleteTaskModal from './CompleteTaskModal.svelte';
	import StatsRow from './StatsRow.svelte';
	import FocusSuggestion from './FocusSuggestion.svelte';
	import TaskPanel from '$lib/components/spaces/TaskPanel.svelte';
	import RecentlyCompletedSection from './RecentlyCompletedSection.svelte';
	import UserMenu from '$lib/components/layout/UserMenu.svelte';
	import type { CreateTaskInput } from '$lib/types/tasks';

	interface Props {
		spaceId: string;
		spaceSlug: string;
		spaceColor: string;
		spaceName: string;
		areas: Area[];
		user?: {
			displayName: string | null;
			role: 'owner' | 'admin' | 'member';
		} | null;
	}

	let { spaceId, spaceSlug, spaceColor, spaceName, areas, user }: Props = $props();

	// Get all tasks for this space (parent tasks only, not subtasks)
	let allTasks = $derived.by(() => {
		return taskStore
			.getTasksForSpaceId(spaceId)
			.filter((t) => !t.parentTaskId && t.status === 'active');
	});

	// Get completed tasks for this space (for Recently Completed section)
	// Include subtasks - RecentlyCompletedSection will handle filtering for different views
	let completedTasks = $derived.by(() => {
		return taskStore.getTasksForSpaceId(spaceId).filter((t) => t.status === 'completed');
	});

	// Helper functions for date comparisons
	function startOfDay(date: Date): Date {
		return new Date(date.getFullYear(), date.getMonth(), date.getDate());
	}

	function addDays(date: Date, days: number): Date {
		const result = new Date(date);
		result.setDate(result.getDate() + days);
		return result;
	}

	// Check if task is overdue (hard deadline passed)
	function isOverdue(task: Task): boolean {
		if (!task.dueDate || task.dueDateType !== 'hard') return false;
		return new Date(task.dueDate) < new Date();
	}

	// Check if task is stale (7+ days no activity, respects dismissal)
	function isStale(task: Task): boolean {
		return taskStore.isStale(task);
	}

	// Group tasks by time
	let taskGroups = $derived.by(() => {
		const now = new Date();
		const today = startOfDay(now);
		const weekEnd = addDays(today, 7);

		const groups = {
			needsAttention: [] as Task[],
			today: [] as Task[],
			thisWeek: [] as Task[],
			later: [] as Task[],
			anytime: [] as Task[]
		};

		for (const task of allTasks) {
			// Check if needs attention (overdue or stale)
			const taskOverdue = isOverdue(task);
			const taskStale = isStale(task);

			if (taskOverdue || taskStale) {
				groups.needsAttention.push(task);
				continue; // Don't put in other groups
			}

			// Group by due date
			if (!task.dueDate) {
				groups.anytime.push(task);
			} else {
				const dueDay = startOfDay(new Date(task.dueDate));
				if (dueDay <= today) {
					groups.today.push(task);
				} else if (dueDay <= weekEnd) {
					groups.thisWeek.push(task);
				} else {
					groups.later.push(task);
				}
			}
		}

		// Sort each group: high priority first, then by due date
		const sortTasks = (a: Task, b: Task) => {
			// Priority first
			if (a.priority !== b.priority) {
				return a.priority === 'high' ? -1 : 1;
			}
			// Then by due date (earliest first)
			const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
			const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
			return aDue - bDue;
		};

		groups.needsAttention.sort(sortTasks);
		groups.today.sort(sortTasks);
		groups.thisWeek.sort(sortTasks);
		groups.later.sort(sortTasks);
		groups.anytime.sort(sortTasks);

		return groups;
	});

	// Total counts for header
	let totalTasks = $derived(allTasks.length);
	let needsAttentionCount = $derived(taskGroups.needsAttention.length);

	// Counts for FocusSuggestion
	let overdueCount = $derived(allTasks.filter((t) => isOverdue(t)).length);
	let todayDueCount = $derived(taskGroups.today.length);

	// Stats for StatsRow
	let completedToday = $derived(taskStore.getCompletedToday(spaceId));
	let streak = $derived(taskStore.calculateStreak(spaceId));

	// Complete task modal state
	let showCompleteModal = $state(false);
	let taskToComplete = $state<Task | null>(null);
	let incompleteSubtasks = $state<Task[]>([]);

	// Task panel state (for both create and edit)
	let showTaskPanel = $state(false);
	let taskToEdit = $state<Task | null>(null);

	// Delete confirmation state
	let showDeleteConfirm = $state(false);
	let taskToDelete = $state<Task | null>(null);
	let isDeleting = $state(false);

	// Navigate to task
	function handleTaskClick(task: Task) {
		goto(`/spaces/${spaceSlug}/task/${task.id}`);
	}

	// Handle task completion
	async function handleCompleteTask(task: Task) {
		// Check if task has subtasks
		const subtasks = taskStore.getSubtasksForTask(task.id);
		const incomplete = subtasks.filter((s) => s.status !== 'completed');

		if (incomplete.length > 0) {
			// Show modal for tasks with incomplete subtasks
			taskToComplete = task;
			incompleteSubtasks = incomplete;
			showCompleteModal = true;
		} else {
			// Direct complete for simple tasks
			await completeTaskWithUndo(task);
		}
	}

	// Complete task with undo capability
	async function completeTaskWithUndo(task: Task) {
		try {
			await taskStore.completeTask(task.id);

			// Show success toast with undo
			const toastId = toastStore.success(`"${task.title}" completed`, 5000);

			// For now, just show success. Undo will be added in Phase 3.
		} catch (error) {
			console.error('Failed to complete task:', error);
			toastStore.error('Failed to complete task');
		}
	}

	// Modal handlers
	async function handleCompleteAll() {
		if (!taskToComplete) return;

		try {
			// Complete all incomplete subtasks
			for (const subtask of incompleteSubtasks) {
				await taskStore.completeTask(subtask.id);
			}
			// Complete the parent task
			await taskStore.completeTask(taskToComplete.id);
			toastStore.success(`"${taskToComplete.title}" and subtasks completed`);
		} catch (error) {
			console.error('Failed to complete tasks:', error);
			toastStore.error('Failed to complete tasks');
		} finally {
			closeModal();
		}
	}

	async function handleCompleteTaskOnly() {
		if (!taskToComplete) return;

		try {
			await taskStore.completeTask(taskToComplete.id);
			toastStore.success(`"${taskToComplete.title}" completed`);
		} catch (error) {
			console.error('Failed to complete task:', error);
			toastStore.error('Failed to complete task');
		} finally {
			closeModal();
		}
	}

	function closeModal() {
		showCompleteModal = false;
		taskToComplete = null;
		incompleteSubtasks = [];
	}

	// Handle dismiss stale
	async function handleDismissStale(task: Task) {
		try {
			await taskStore.dismissStale(task.id);
			toastStore.success('Stale warning dismissed');
		} catch (error) {
			console.error('Failed to dismiss stale:', error);
			toastStore.error('Failed to dismiss');
		}
	}

	// Navigate back to space dashboard
	function handleBack() {
		goto(`/spaces/${spaceSlug}`);
	}

	// Open task panel for creating new task
	function handleOpenTaskPanel() {
		taskToEdit = null;
		showTaskPanel = true;
	}

	// Handle edit task
	function handleEditTask(task: Task) {
		taskToEdit = task;
		showTaskPanel = true;
	}

	// Handle task panel close
	function closeTaskPanel() {
		showTaskPanel = false;
		taskToEdit = null;
	}

	// Handle create/update task from panel
	async function handleCreateTask(input: CreateTaskInput): Promise<Task | null> {
		try {
			const created = await taskStore.createTask(input);
			if (created) {
				toastStore.success(`Task "${input.title}" created`);
			}
			return created;
		} catch (error) {
			console.error('Failed to create task:', error);
			toastStore.error('Failed to create task');
			return null;
		}
	}

	// Handle delete task
	function handleDeleteTask(task: Task) {
		taskToDelete = task;
		showDeleteConfirm = true;
	}

	// Confirm delete
	async function confirmDelete() {
		if (!taskToDelete || isDeleting) return;

		isDeleting = true;
		try {
			await taskStore.deleteTask(taskToDelete.id);
			toastStore.success(`"${taskToDelete.title}" deleted`);
			closeDeleteConfirm();
		} catch (error) {
			console.error('Failed to delete task:', error);
			toastStore.error('Failed to delete task');
		} finally {
			isDeleting = false;
		}
	}

	// Close delete confirmation
	function closeDeleteConfirm() {
		showDeleteConfirm = false;
		taskToDelete = null;
	}

	// Handle reopen completed task
	async function handleReopenTask(task: Task) {
		try {
			await taskStore.reopenTask(task.id);
			toastStore.success(`"${task.title}" reopened`);
		} catch (error) {
			console.error('Failed to reopen task:', error);
			toastStore.error('Failed to reopen task');
		}
	}
</script>

<div class="task-dashboard" style="--space-color: {spaceColor}">
	<!-- Header -->
	<header class="dashboard-header">
		<button type="button" class="back-button" onclick={handleBack}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
			</svg>
			<span>{spaceName}</span>
		</button>

		<div class="header-center">
			<h1 class="dashboard-title">Tasks</h1>
			<span class="task-total">{totalTasks}</span>
			{#if needsAttentionCount > 0}
				<span class="attention-badge">{needsAttentionCount} needs attention</span>
			{/if}
		</div>

		<div class="header-right">
			<button type="button" class="add-task-btn" onclick={handleOpenTaskPanel}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
				</svg>
				<span>Add Task</span>
			</button>
			{#if user}
				<UserMenu displayName={user.displayName} role={user.role} />
			{/if}
		</div>
	</header>

	<!-- Task Groups -->
	<div class="dashboard-scroll">
		<div class="dashboard-content">
		<!-- Focus Suggestion -->
		<FocusSuggestion
			tasks={allTasks}
			{overdueCount}
			todayCount={todayDueCount}
			{completedToday}
			{spaceColor}
			{spaceSlug}
			onTaskClick={handleTaskClick}
		/>

		<!-- Stats Row -->
		<StatsRow
			{completedToday}
			{streak}
			activeCount={totalTasks}
			{needsAttentionCount}
			{spaceColor}
		/>

		<!-- Needs Attention -->
		{#if taskGroups.needsAttention.length > 0}
			<TaskGroupSection
				title="Needs Attention"
				tasks={taskGroups.needsAttention}
				{areas}
				{spaceColor}
				{spaceSlug}
				variant="warning"
				showStaleBadges={true}
				showOverdueBadges={true}
				onTaskClick={handleTaskClick}
				onCompleteTask={handleCompleteTask}
				onDismissStale={handleDismissStale}
				onEditTask={handleEditTask}
				onDeleteTask={handleDeleteTask}
			/>
		{/if}

		<!-- Today -->
		<TaskGroupSection
			title="Today"
			tasks={taskGroups.today}
			{areas}
			{spaceColor}
			{spaceSlug}
			emptyMessage="Nothing due today"
			onTaskClick={handleTaskClick}
			onCompleteTask={handleCompleteTask}
			onEditTask={handleEditTask}
			onDeleteTask={handleDeleteTask}
		/>

		<!-- This Week -->
		<TaskGroupSection
			title="This Week"
			tasks={taskGroups.thisWeek}
			{areas}
			{spaceColor}
			{spaceSlug}
			emptyMessage="Nothing due this week"
			onTaskClick={handleTaskClick}
			onCompleteTask={handleCompleteTask}
			onEditTask={handleEditTask}
			onDeleteTask={handleDeleteTask}
		/>

		<!-- Later -->
		{#if taskGroups.later.length > 0}
			<TaskGroupSection
				title="Later"
				tasks={taskGroups.later}
				{areas}
				{spaceColor}
				{spaceSlug}
				collapsible={true}
				defaultCollapsed={taskGroups.later.length > 5}
				onTaskClick={handleTaskClick}
				onCompleteTask={handleCompleteTask}
				onEditTask={handleEditTask}
				onDeleteTask={handleDeleteTask}
			/>
		{/if}

		<!-- Anytime -->
		{#if taskGroups.anytime.length > 0}
			<TaskGroupSection
				title="Anytime"
				tasks={taskGroups.anytime}
				{areas}
				{spaceColor}
				{spaceSlug}
				collapsible={true}
				defaultCollapsed={taskGroups.anytime.length > 5}
				emptyMessage="No flexible tasks"
				onTaskClick={handleTaskClick}
				onCompleteTask={handleCompleteTask}
				onEditTask={handleEditTask}
				onDeleteTask={handleDeleteTask}
			/>
		{/if}

		<!-- Empty state -->
		{#if totalTasks === 0}
			<div class="empty-state">
				<div class="empty-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<p class="empty-title">All clear!</p>
				<p class="empty-text">No active tasks in this space.</p>
			</div>
		{/if}

		<!-- Recently Completed -->
		<RecentlyCompletedSection
			{completedTasks}
			{spaceColor}
			onReopen={handleReopenTask}
			onTaskClick={handleTaskClick}
		/>
		</div>
	</div>
</div>

<!-- Complete Task Modal -->
{#if showCompleteModal && taskToComplete}
	<CompleteTaskModal
		task={taskToComplete}
		{incompleteSubtasks}
		onCompleteAll={handleCompleteAll}
		onCompleteTaskOnly={handleCompleteTaskOnly}
		onCancel={closeModal}
	/>
{/if}

<!-- Task Panel (Create/Edit) -->
<TaskPanel
	isOpen={showTaskPanel}
	{spaceId}
	{areas}
	{spaceColor}
	task={taskToEdit}
	onClose={closeTaskPanel}
	onCreate={handleCreateTask}
/>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm && taskToDelete}
	<div class="modal-backdrop" transition:fade={{ duration: 150 }}>
		<div class="confirm-modal" transition:fly={{ y: 20, duration: 200 }}>
			<div class="confirm-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			</div>
			<h3 class="confirm-title">Delete Task?</h3>
			<p class="confirm-message">
				Are you sure you want to delete "{taskToDelete.title}"? This action cannot be undone.
			</p>
			<div class="confirm-actions">
				<button
					type="button"
					class="btn-cancel"
					onclick={closeDeleteConfirm}
					disabled={isDeleting}
				>
					Cancel
				</button>
				<button
					type="button"
					class="btn-delete"
					onclick={confirmDelete}
					disabled={isDeleting}
				>
					{isDeleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.task-dashboard {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg-primary, #0a0a0a);
	}

	/* Header */
	.dashboard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(255, 255, 255, 0.02);
	}

	.back-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.back-button:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.06);
	}

	.back-button svg {
		width: 1rem;
		height: 1rem;
	}

	.header-center {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.dashboard-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin: 0;
	}

	.task-total {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 9999px;
		color: rgba(255, 255, 255, 0.6);
	}

	.attention-badge {
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.25rem 0.5rem;
		background: rgba(245, 158, 11, 0.15);
		border-radius: 9999px;
		color: #f59e0b;
	}

	.header-right {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
		min-width: 100px; /* Ensure space for balance */
	}

	.add-task-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--space-color, #3b82f6);
		background: color-mix(in srgb, var(--space-color, #3b82f6) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--space-color, #3b82f6) 20%, transparent);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.add-task-btn:hover {
		background: color-mix(in srgb, var(--space-color, #3b82f6) 20%, transparent);
		border-color: color-mix(in srgb, var(--space-color, #3b82f6) 40%, transparent);
	}

	.add-task-btn svg {
		width: 0.75rem;
		height: 0.75rem;
	}

	/* Scrollable area - full width for scroll to work anywhere */
	.dashboard-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	/* Content - centered with max width */
	.dashboard-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 800px;
		margin: 0 auto;
		width: 100%;
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
	}

	.empty-icon {
		width: 3rem;
		height: 3rem;
		color: rgba(34, 197, 94, 0.4);
		margin-bottom: 1rem;
	}

	.empty-icon svg {
		width: 100%;
		height: 100%;
	}

	.empty-title {
		font-size: 1rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.8);
		margin: 0 0 0.5rem 0;
	}

	.empty-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	/* Delete confirmation modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.confirm-modal {
		background: #1a1a1a;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		padding: 1.5rem;
		max-width: 400px;
		width: 100%;
		text-align: center;
	}

	.confirm-icon {
		width: 3rem;
		height: 3rem;
		margin: 0 auto 1rem;
		color: #ef4444;
	}

	.confirm-icon svg {
		width: 100%;
		height: 100%;
	}

	.confirm-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 0.5rem 0;
	}

	.confirm-message {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 1.5rem 0;
		line-height: 1.5;
	}

	.confirm-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}

	.btn-cancel,
	.btn-delete {
		padding: 0.625rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-cancel {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
	}

	.btn-cancel:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.9);
	}

	.btn-delete {
		background: #ef4444;
		border: none;
		color: white;
	}

	.btn-delete:hover:not(:disabled) {
		background: #dc2626;
	}

	.btn-cancel:disabled,
	.btn-delete:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
