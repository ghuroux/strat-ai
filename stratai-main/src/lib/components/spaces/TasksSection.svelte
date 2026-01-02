<!--
	TasksSection.svelte

	Right column of Space Dashboard - Task execution hub.
	Shows active/planning tasks with quick add functionality.
	Equal prominence to AreasSection for "two reasons to visit Spaces" UX.
-->
<script lang="ts">
	import type { Task } from '$lib/types/tasks';
	import type { Area } from '$lib/types/areas';

	interface Props {
		tasks: Task[];
		areas: Area[];
		spaceColor: string;
		onTaskClick: (task: Task) => void;
		onOpenTaskModal: () => void;
		onViewAllTasks?: () => void;
		maxDisplayTasks?: number;
	}

	let {
		tasks,
		areas,
		spaceColor,
		onTaskClick,
		onOpenTaskModal,
		onViewAllTasks,
		maxDisplayTasks = 5
	}: Props = $props();

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

	// Display limited tasks with "View all" option
	let displayTasks = $derived(sortedTasks.slice(0, maxDisplayTasks));
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
</script>

<section class="tasks-section" style="--space-color: {spaceColor}">
	<header class="section-header">
		<h2 class="section-title">Tasks</h2>
		<span class="task-count">{tasks.length}</span>
		{#if hasMoreTasks && onViewAllTasks}
			<button type="button" class="view-all" onclick={onViewAllTasks}>
				View all
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
				</svg>
			</button>
		{/if}
	</header>

	<div class="tasks-container">
		<!-- Task List -->
		{#if displayTasks.length > 0}
			<div class="task-list">
				{#each displayTasks as task (task.id)}
					{@const area = getArea(task.areaId)}
					{@const statusInfo = getStatusInfo(task.status)}
					<button
						type="button"
						class="task-item"
						onclick={() => onTaskClick(task)}
						style="--task-color: {task.color || spaceColor}"
					>
						<div class="task-indicator">
							<div class="task-dot" class:high-priority={task.priority === 'high'}></div>
						</div>
						<div class="task-content">
							<div class="task-header">
								<span class="task-title">{task.title}</span>
								{#if task.priority === 'high'}
									<span class="priority-badge">!</span>
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
						<svg class="task-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
						</svg>
					</button>
				{/each}
			</div>
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

		<!-- Add Task -->
		<div class="add-task-container">
			<button
				type="button"
				class="add-task-button"
				onclick={onOpenTaskModal}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
				</svg>
				<span>Add a task</span>
			</button>
		</div>
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

	.view-all {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--space-color);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: opacity 0.15s ease;
	}

	.view-all:hover {
		opacity: 0.8;
	}

	.view-all svg {
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
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		padding: 0.5rem;
		min-height: 200px;
	}

	/* Task List */
	.task-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
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
		padding-top: 0.125rem;
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

	/* Add Task */
	.add-task-container {
		margin-top: auto;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.add-task-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.625rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--space-color);
		background: color-mix(in srgb, var(--space-color) 10%, transparent);
		border: 1px dashed color-mix(in srgb, var(--space-color) 30%, transparent);
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.add-task-button:hover {
		background: color-mix(in srgb, var(--space-color) 15%, transparent);
		border-color: color-mix(in srgb, var(--space-color) 50%, transparent);
	}

	.add-task-button svg {
		width: 1rem;
		height: 1rem;
	}
</style>
