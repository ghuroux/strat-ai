<!--
	TasksSection.svelte

	Right column of Space Dashboard - Task execution hub.
	Shows active/planning tasks with quick add functionality.
	Equal prominence to AreasSection for "two reasons to visit Spaces" UX.

	Accordion behavior: Tasks with subtasks expand inline instead of navigating.
	Quick actions available via menu button on each task.
-->
<script lang="ts">
	import { slide, fade } from 'svelte/transition';
	import type { Task } from '$lib/types/tasks';
	import type { Area } from '$lib/types/areas';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import SubtaskAccordionList from './SubtaskAccordionList.svelte';

	interface Props {
		tasks: Task[];
		areas: Area[];
		spaceColor: string;
		spaceParam: string;
		onTaskClick: (task: Task) => void;
		onOpenTaskModal: () => void;
		onViewAllTasks?: () => void;
		onEditTask?: (task: Task) => void;
		onDeleteTask?: (task: Task) => void;
		onStartPlanMode?: (task: Task) => void;
		maxDisplayTasks?: number;
	}

	let {
		tasks,
		areas,
		spaceColor,
		spaceParam,
		onTaskClick,
		onOpenTaskModal,
		onViewAllTasks,
		onEditTask,
		onDeleteTask,
		onStartPlanMode,
		maxDisplayTasks = 5
	}: Props = $props();

	// Track which tasks are expanded (for accordion)
	let expandedTaskIds = $state(new Set<string>());

	// Track hover state for each task
	let hoveredTaskId = $state<string | null>(null);

	// Show all tasks toggle (inline expansion)
	let showAllTasks = $state(false);

	// Sort tasks: due date first (earliest first), then high priority, then most recent
	let sortedTasks = $derived.by(() => {
		return [...tasks].sort((a, b) => {
			// Due date takes priority (tasks with due dates come first, earliest first)
			const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
			const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
			if (aDue !== bDue) return aDue - bDue;

			// Then by priority (high before normal)
			if (a.priority !== b.priority) {
				return a.priority === 'high' ? -1 : 1;
			}

			// Then by most recently updated
			return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
		});
	});

	// Group tasks by status (using sorted order)
	let activeTasks = $derived(sortedTasks.filter(t => t.status === 'active'));
	let planningTasks = $derived(sortedTasks.filter(t => t.status === 'planning'));

	// Display limited tasks with "Show more" option
	let displayTasks = $derived(showAllTasks ? sortedTasks : sortedTasks.slice(0, maxDisplayTasks));
	let hasMoreTasks = $derived(sortedTasks.length > maxDisplayTasks);
	let remainingCount = $derived(sortedTasks.length - maxDisplayTasks);

	// Get area for a task
	function getArea(areaId: string | null | undefined): Area | null {
		if (!areaId) return null;
		return areas.find(a => a.id === areaId) ?? null;
	}

	// Format relative time
	function formatRelativeTime(date: Date): string {
		const now = Date.now();
		const diff = now - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days}d ago`;
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	// Get status display info
	function getStatusInfo(status: string): { label: string; class: string } {
		switch (status) {
			case 'active':
				return { label: 'In Progress', class: 'status-active' };
			case 'planning':
				return { label: 'Planning', class: 'status-planning' };
			default:
				return { label: status, class: '' };
		}
	}

	// Get subtasks for a task
	function getSubtasks(taskId: string): Task[] {
		return taskStore.getSubtasksForTask(taskId);
	}

	// Check if task has subtasks
	function hasSubtasks(taskId: string): boolean {
		return getSubtasks(taskId).length > 0;
	}

	// Check if task is expanded
	function isExpanded(taskId: string): boolean {
		return expandedTaskIds.has(taskId);
	}

	// Toggle task expansion
	function toggleExpanded(taskId: string) {
		const newSet = new Set(expandedTaskIds);
		if (newSet.has(taskId)) {
			newSet.delete(taskId);
		} else {
			newSet.add(taskId);
		}
		expandedTaskIds = newSet;
	}

	// Handle task click - toggle accordion if has subtasks, otherwise navigate
	function handleTaskClick(task: Task) {
		if (hasSubtasks(task.id)) {
			toggleExpanded(task.id);
		} else {
			onTaskClick(task);
		}
	}

	// Handle done action
	async function handleDone(e: Event, task: Task) {
		e.stopPropagation();
		await taskStore.completeTask(task.id);
	}

	// Handle edit action
	function handleEdit(e: Event, task: Task) {
		e.stopPropagation();
		onEditTask?.(task);
	}

	// Handle delete action
	function handleDelete(e: Event, task: Task) {
		e.stopPropagation();
		onDeleteTask?.(task);
	}

	// Get subtask count badge
	function getSubtaskCount(taskId: string): { total: number; completed: number } {
		const subtasks = getSubtasks(taskId);
		const completed = subtasks.filter(s => s.status === 'completed').length;
		return { total: subtasks.length, completed };
	}
</script>

<section class="tasks-section" style="--space-color: {spaceColor}">
	<header class="section-header">
		<div class="header-left">
			<h2 class="section-title">Tasks</h2>
			<span class="task-count">{tasks.length}</span>
		</div>
		<div class="header-right">
			<!-- Add Task button - always visible -->
			<button type="button" class="add-task-btn" onclick={onOpenTaskModal}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
				</svg>
				Add
			</button>
			{#if onViewAllTasks && tasks.length > 0}
				<button type="button" class="view-all-btn" onclick={onViewAllTasks}>
					View all
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
					</svg>
				</button>
			{/if}
		</div>
	</header>

	<div class="tasks-container">
		<!-- Task List -->
		{#if displayTasks.length > 0}
			<div class="task-list">
				{#each displayTasks as task (task.id)}
					{@const area = getArea(task.areaId)}
					{@const statusInfo = getStatusInfo(task.status)}
					{@const taskHasSubtasks = hasSubtasks(task.id)}
					{@const taskExpanded = isExpanded(task.id)}
					{@const subtaskCount = taskHasSubtasks ? getSubtaskCount(task.id) : null}
					{@const isHovered = hoveredTaskId === task.id}
					<div class="task-wrapper" class:expanded={taskExpanded}>
						<button
							type="button"
							class="task-item"
							class:has-subtasks={taskHasSubtasks}
							onclick={() => handleTaskClick(task)}
							onmouseenter={() => hoveredTaskId = task.id}
							onmouseleave={() => hoveredTaskId = null}
							style="--task-color: {task.color || spaceColor}"
						>
							<!-- Checkbox / Priority Dot -->
							<div class="task-indicator">
								{#if isHovered}
									<button
										type="button"
										class="checkbox"
										onclick={(e) => handleDone(e, task)}
										title="Complete task"
										transition:fade={{ duration: 100 }}
									>
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									</button>
								{:else}
									<div class="task-dot" class:high-priority={task.priority === 'high'}></div>
								{/if}
							</div>

							<div class="task-content">
								<div class="task-header">
									<span class="task-title">{task.title}</span>
									{#if task.priority === 'high'}
										<span class="priority-badge">!</span>
									{/if}
									{#if subtaskCount}
										<span class="subtask-badge">
											{subtaskCount.completed}/{subtaskCount.total}
										</span>
									{/if}
								</div>
								<div class="task-meta">
									<span class="task-status {statusInfo.class}">{statusInfo.label}</span>
									{#if area}
										<span class="task-area" style="--area-color: {area.color || spaceColor}">
											{area.icon || ''} {area.name}
										</span>
									{/if}
									<span class="task-time">{formatRelativeTime(new Date(task.updatedAt))}</span>
								</div>
							</div>

							<!-- Action buttons (hover-reveal) -->
							{#if isHovered}
								<div class="action-buttons" transition:fade={{ duration: 100 }}>
									<button
										type="button"
										class="action-btn action-done"
										onclick={(e) => handleDone(e, task)}
										title="Mark as done"
									>
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
										</svg>
									</button>
									{#if onEditTask}
										<button
											type="button"
											class="action-btn action-edit"
											onclick={(e) => handleEdit(e, task)}
											title="Edit task"
										>
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
											</svg>
										</button>
									{/if}
									{#if onDeleteTask}
										<button
											type="button"
											class="action-btn action-delete"
											onclick={(e) => handleDelete(e, task)}
											title="Delete task"
										>
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
											</svg>
										</button>
									{/if}
								</div>
							{/if}

							{#if taskHasSubtasks}
								<svg
									class="expand-chevron"
									class:rotated={taskExpanded}
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
								</svg>
							{:else}
								<svg class="task-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
								</svg>
							{/if}
						</button>

						<!-- Accordion Content -->
						{#if taskExpanded && taskHasSubtasks}
							<div transition:slide={{ duration: 200 }}>
								<SubtaskAccordionList
									subtasks={getSubtasks(task.id)}
									parentTaskId={task.id}
									{spaceParam}
								/>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Show more / Show less toggle -->
			{#if hasMoreTasks}
				<button
					type="button"
					class="show-more-button"
					onclick={() => showAllTasks = !showAllTasks}
				>
					{#if showAllTasks}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
						</svg>
						Show less
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
						</svg>
						Show {remainingCount} more
					{/if}
				</button>
			{/if}
		{:else}
			<div class="empty-tasks">
				<div class="empty-icon">
					<!-- Clipboard list icon -->
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
					</svg>
				</div>
				<p class="empty-text">No active tasks</p>
			</div>
		{/if}

	</div>
</section>

<style>
	.tasks-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: 100%;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.section-title {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	.add-task-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--space-color);
		background: color-mix(in srgb, var(--space-color) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--space-color) 20%, transparent);
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.add-task-btn:hover {
		background: color-mix(in srgb, var(--space-color) 20%, transparent);
		border-color: color-mix(in srgb, var(--space-color) 40%, transparent);
	}

	.add-task-btn svg {
		width: 0.75rem;
		height: 0.75rem;
	}

	.view-all-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--space-color);
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		transition: all 0.15s ease;
	}

	.view-all-btn:hover {
		background: color-mix(in srgb, var(--space-color) 10%, transparent);
	}

	.view-all-btn svg {
		width: 0.75rem;
		height: 0.75rem;
	}

	.show-more-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		width: 100%;
		padding: 0.625rem 1rem;
		margin-top: 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.show-more-button:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.show-more-button svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.task-count {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 9999px;
		color: rgba(255, 255, 255, 0.5);
	}

	.tasks-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* Task List */
	.task-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.task-wrapper {
		display: flex;
		flex-direction: column;
	}

	.task-wrapper.expanded .task-item {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	.task-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		text-align: left;
		transition: all 0.15s ease;
		cursor: pointer;
	}

	.task-item:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.task-indicator {
		flex-shrink: 0;
		width: 1.25rem;
		height: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 0.0625rem;
	}

	.checkbox {
		width: 1.25rem;
		height: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(34, 197, 94, 0.1);
		border: 1.5px solid rgba(34, 197, 94, 0.4);
		border-radius: 0.25rem;
		color: #22c55e;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.checkbox:hover {
		background: rgba(34, 197, 94, 0.2);
		border-color: #22c55e;
	}

	.checkbox svg {
		width: 0.75rem;
		height: 0.75rem;
		opacity: 0;
		transition: opacity 0.1s ease;
	}

	.checkbox:hover svg {
		opacity: 1;
	}

	.task-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 50%;
		background: var(--task-color);
		transition: all 0.15s ease;
	}

	.task-dot.high-priority {
		box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3);
	}

	.task-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.task-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.task-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.priority-badge {
		flex-shrink: 0;
		width: 1rem;
		height: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.625rem;
		font-weight: 700;
		color: #ef4444;
		background: rgba(239, 68, 68, 0.15);
		border-radius: 0.25rem;
	}

	.subtask-badge {
		flex-shrink: 0;
		padding: 0.125rem 0.375rem;
		font-size: 0.625rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.08);
		border-radius: 9999px;
	}

	.task-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.task-status {
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.6);
	}

	.task-status.status-active {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
	}

	.task-status.status-planning {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.task-area {
		font-size: 0.6875rem;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		background: color-mix(in srgb, var(--area-color, var(--space-color)) 15%, transparent);
		color: var(--area-color, var(--space-color));
	}

	.task-time {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.task-arrow {
		flex-shrink: 0;
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.3);
		margin-top: 0.125rem;
		transition: all 0.15s ease;
	}

	.task-item:hover .task-arrow {
		color: rgba(255, 255, 255, 0.6);
		transform: translateX(2px);
	}

	.expand-chevron {
		flex-shrink: 0;
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.4);
		margin-top: 0.125rem;
		transition: all 0.2s ease;
	}

	.expand-chevron.rotated {
		transform: rotate(180deg);
	}

	.task-item:hover .expand-chevron {
		color: rgba(255, 255, 255, 0.6);
	}

	.task-item.has-subtasks {
		cursor: pointer;
	}

	/* Empty State */
	.empty-tasks {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		text-align: center;
		flex: 1;
	}

	.empty-icon {
		width: 2.5rem;
		height: 2.5rem;
		color: rgba(255, 255, 255, 0.15);
		margin-bottom: 0.75rem;
	}

	.empty-icon svg {
		width: 100%;
		height: 100%;
	}

	.empty-text {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	/* Action buttons */
	.action-buttons {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.625rem;
		height: 1.625rem;
		padding: 0;
		border: none;
		border-radius: 0.375rem;
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.9);
	}

	.action-btn svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	/* Done button */
	.action-btn.action-done:hover {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
	}

	/* Edit button */
	.action-btn.action-edit:hover {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	/* Delete button */
	.action-btn.action-delete:hover {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	/* Responsive: hide action buttons on small screens */
	@media (max-width: 640px) {
		.action-buttons {
			display: none;
		}
	}
</style>
