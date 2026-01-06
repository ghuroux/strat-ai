<!--
	TasksPanel.svelte

	Slide-out panel showing tasks linked to an Area.
	Features:
	- Shows area's tasks with status indicators
	- Quick complete action (checkbox)
	- Add new task button (triggers callback to open TaskModal)
	- Shows subtask progress for parent tasks
-->
<script lang="ts">
	import PanelBase from './PanelBase.svelte';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import type { Task } from '$lib/types/tasks';

	interface Props {
		isOpen: boolean;
		areaId: string;
		spaceColor?: string;
		onClose: () => void;
		onAddTask: () => void; // Triggers parent to open TaskModal
		onTaskClick?: (task: Task) => void; // Navigate to task detail/focus
	}

	let {
		isOpen,
		areaId,
		spaceColor = '#3b82f6',
		onClose,
		onAddTask,
		onTaskClick
	}: Props = $props();

	// Get tasks for this area
	let areaTasks = $derived.by(() => {
		return taskStore.getTasksForAreaId(areaId);
	});

	// Split into active and completed
	let activeTasks = $derived(areaTasks.filter(t => t.status !== 'completed' && !t.parentTaskId));
	let completedTasks = $derived(areaTasks.filter(t => t.status === 'completed' && !t.parentTaskId));

	// Stats
	let totalCount = $derived(activeTasks.length + completedTasks.length);
	let completedCount = $derived(completedTasks.length);

	// Toggle task completion
	async function handleToggleComplete(task: Task, e: Event) {
		e.stopPropagation();
		if (task.status === 'completed') {
			await taskStore.reopenTask(task.id);
		} else {
			await taskStore.completeTask(task.id);
		}
	}

	// Format due date
	function formatDueDate(date: Date): string {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const dueDay = new Date(date);
		dueDay.setHours(0, 0, 0, 0);

		if (dueDay.getTime() < today.getTime()) {
			return 'Overdue';
		} else if (dueDay.getTime() === today.getTime()) {
			return 'Today';
		} else if (dueDay.getTime() === tomorrow.getTime()) {
			return 'Tomorrow';
		} else {
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		}
	}

	// Check if task is overdue
	function isOverdue(task: Task): boolean {
		if (!task.dueDate || task.status === 'completed') return false;
		return new Date(task.dueDate) < new Date();
	}

	// Get subtask progress for a task
	function getSubtaskProgress(taskId: string): { completed: number; total: number } | null {
		const subtasks = taskStore.getSubtasksForTask(taskId);
		if (subtasks.length === 0) return null;
		const completed = subtasks.filter(s => s.status === 'completed').length;
		return { completed, total: subtasks.length };
	}
</script>

<PanelBase
	{isOpen}
	title="Tasks"
	subtitle={totalCount > 0 ? `${completedCount}/${totalCount} completed` : 'No tasks yet'}
	position="right"
	width="20rem"
	{onClose}
>
	{#snippet header()}
		<button
			type="button"
			class="add-task-btn"
			onclick={onAddTask}
			title="Add task"
			style="--space-color: {spaceColor}"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
			</svg>
		</button>
	{/snippet}

	{#snippet content()}
		<div class="tasks-content" style="--space-color: {spaceColor}">
			{#if areaTasks.length === 0}
				<!-- Empty state -->
				<div class="empty-state">
					<div class="empty-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
						</svg>
					</div>
					<p class="empty-title">No tasks in this area</p>
					<p class="empty-subtitle">Add tasks to track work related to this focus area</p>
					<button
						type="button"
						class="empty-action"
						onclick={onAddTask}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
						</svg>
						Add Task
					</button>
				</div>
			{:else}
				<!-- Active tasks -->
				{#if activeTasks.length > 0}
					<div class="task-section">
						<h3 class="section-label">Active</h3>
						<div class="task-list">
							{#each activeTasks as task (task.id)}
								{@const subtaskProgress = getSubtaskProgress(task.id)}
								<div
									class="task-item"
									class:overdue={isOverdue(task)}
									class:high-priority={task.priority === 'high'}
									role="button"
									tabindex="0"
									onclick={() => onTaskClick?.(task)}
									onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onTaskClick?.(task)}
								>
									<button
										type="button"
										class="task-checkbox"
										onclick={(e) => handleToggleComplete(task, e)}
										title="Mark complete"
									>
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<circle cx="12" cy="12" r="10" />
										</svg>
									</button>

									<div class="task-content">
										<span class="task-title">{task.title}</span>
										<div class="task-meta">
											{#if task.priority === 'high'}
												<span class="meta-badge priority">High</span>
											{/if}
											{#if task.dueDate}
												<span class="meta-badge" class:overdue={isOverdue(task)}>
													{formatDueDate(new Date(task.dueDate))}
												</span>
											{/if}
											{#if subtaskProgress}
												<span class="meta-badge subtasks">
													{subtaskProgress.completed}/{subtaskProgress.total}
												</span>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Completed tasks -->
				{#if completedTasks.length > 0}
					<div class="task-section completed-section">
						<h3 class="section-label">Completed</h3>
						<div class="task-list">
							{#each completedTasks as task (task.id)}
								<div
									class="task-item completed"
									role="button"
									tabindex="0"
									onclick={() => onTaskClick?.(task)}
									onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onTaskClick?.(task)}
								>
									<button
										type="button"
										class="task-checkbox checked"
										onclick={(e) => handleToggleComplete(task, e)}
										title="Reopen task"
									>
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									</button>

									<div class="task-content">
										<span class="task-title">{task.title}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/if}
		</div>
	{/snippet}
</PanelBase>

<style>
	.add-task-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.375rem;
		color: var(--space-color);
		background: color-mix(in srgb, var(--space-color) 15%, transparent);
		transition: all 0.15s ease;
	}

	.add-task-btn:hover {
		background: color-mix(in srgb, var(--space-color) 25%, transparent);
	}

	.add-task-btn svg {
		width: 1rem;
		height: 1rem;
	}

	.tasks-content {
		padding: 0.75rem;
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem 1rem;
		text-align: center;
	}

	.empty-icon {
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.75rem;
		margin-bottom: 1rem;
	}

	.empty-icon svg {
		width: 1.5rem;
		height: 1.5rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.empty-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
		margin: 0 0 0.25rem;
	}

	.empty-subtitle {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0 0 1rem;
	}

	.empty-action {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--space-color);
		background: color-mix(in srgb, var(--space-color) 15%, transparent);
		border: 1px solid color-mix(in srgb, var(--space-color) 30%, transparent);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.empty-action:hover {
		background: color-mix(in srgb, var(--space-color) 25%, transparent);
	}

	.empty-action svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	/* Task sections */
	.task-section {
		margin-bottom: 1.25rem;
	}

	.task-section:last-child {
		margin-bottom: 0;
	}

	.section-label {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		margin: 0 0 0.5rem 0.25rem;
	}

	.completed-section {
		padding-top: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	/* Task list */
	.task-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.task-item {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 0.625rem 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.task-item:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.task-item.overdue {
		border-left: 2px solid #ef4444;
	}

	.task-item.high-priority:not(.overdue) {
		border-left: 2px solid #f59e0b;
	}

	.task-item.completed {
		opacity: 0.6;
	}

	/* Checkbox */
	.task-checkbox {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
		margin-top: 0.125rem;
		border-radius: 50%;
		color: rgba(255, 255, 255, 0.4);
		transition: all 0.15s ease;
	}

	.task-checkbox:hover {
		color: var(--space-color);
		background: color-mix(in srgb, var(--space-color) 15%, transparent);
	}

	.task-checkbox svg {
		width: 100%;
		height: 100%;
	}

	.task-checkbox.checked {
		color: rgba(34, 197, 94, 0.7);
		background: rgba(34, 197, 94, 0.1);
	}

	.task-checkbox.checked:hover {
		background: rgba(34, 197, 94, 0.2);
	}

	/* Task content */
	.task-content {
		flex: 1;
		min-width: 0;
	}

	.task-title {
		display: block;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.9);
		line-height: 1.4;
	}

	.completed .task-title {
		text-decoration: line-through;
		text-decoration-color: rgba(255, 255, 255, 0.3);
		color: rgba(255, 255, 255, 0.5);
	}

	.task-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-top: 0.375rem;
	}

	.meta-badge {
		font-size: 0.625rem;
		font-weight: 500;
		padding: 0.125rem 0.375rem;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 0.25rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.meta-badge.priority {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.meta-badge.overdue {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.meta-badge.subtasks {
		background: rgba(99, 102, 241, 0.15);
		color: #818cf8;
	}
</style>
