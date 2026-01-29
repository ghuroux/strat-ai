<!--
	TaskGroupSection.svelte

	Reusable section for time-grouped tasks.
	Used in Task Dashboard for: Needs Attention, Today, This Week, Later, Anytime
-->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { Task } from '$lib/types/tasks';
	import type { GlobalTask } from '$lib/types/tasks';
	import type { Area } from '$lib/types/areas';
	import TaskCard from './TaskCard.svelte';

	interface Props {
		title: string;
		tasks: Task[];
		areas: Area[];
		spaceColor: string;
		spaceSlug: string;
		variant?: 'warning' | 'default';
		emptyMessage?: string;
		collapsible?: boolean;
		defaultCollapsed?: boolean;
		showStaleBadges?: boolean;
		showOverdueBadges?: boolean;
		maxVisible?: number; // Max tasks to show before "Show more" (0 = show all)
		// Global dashboard support
		isGlobal?: boolean;
		showSpaceBadge?: boolean;
		onTaskClick: (task: Task) => void;
		onCompleteTask: (task: Task) => void;
		onDismissStale?: (task: Task) => void;
		onEditTask?: (task: Task) => void;
		onDeleteTask?: (task: Task) => void;
	}

	let {
		title,
		tasks,
		areas,
		spaceColor,
		spaceSlug,
		variant = 'default',
		emptyMessage = 'No tasks',
		collapsible = false,
		defaultCollapsed = false,
		showStaleBadges = false,
		showOverdueBadges = false,
		maxVisible = 5,
		isGlobal = false,
		showSpaceBadge = false,
		onTaskClick,
		onCompleteTask,
		onDismissStale,
		onEditTask,
		onDeleteTask
	}: Props = $props();

	let isCollapsed = $state(defaultCollapsed);
	let showAll = $state(false);

	// Track which tasks are expanded (for accordion)
	let expandedTaskIds = $state(new Set<string>());

	// Visible tasks based on maxVisible and showAll
	let visibleTasks = $derived.by(() => {
		if (maxVisible === 0 || showAll || tasks.length <= maxVisible) {
			return tasks;
		}
		return tasks.slice(0, maxVisible);
	});

	let hiddenCount = $derived(tasks.length - visibleTasks.length);

	// Get area for a task
	function getArea(areaId: string | null | undefined): Area | null {
		if (!areaId) return null;
		return areas.find((a) => a.id === areaId) ?? null;
	}

	// Check if task is overdue (hard deadline passed)
	function isOverdue(task: Task): boolean {
		if (!task.dueDate || task.dueDateType !== 'hard') return false;
		return new Date(task.dueDate) < new Date();
	}

	// Check if task is stale (7+ days no activity)
	function isStale(task: Task): boolean {
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		return new Date(task.lastActivityAt) < sevenDaysAgo;
	}

	function toggleCollapsed() {
		if (collapsible) {
			isCollapsed = !isCollapsed;
		}
	}

	// Toggle task expansion
	function toggleTaskExpanded(taskId: string) {
		const newSet = new Set(expandedTaskIds);
		if (newSet.has(taskId)) {
			newSet.delete(taskId);
		} else {
			newSet.add(taskId);
		}
		expandedTaskIds = newSet;
	}

	// Check if task is expanded
	function isTaskExpanded(taskId: string): boolean {
		return expandedTaskIds.has(taskId);
	}
</script>

<section class="task-group" class:warning={variant === 'warning'} style="--space-color: {spaceColor}">
	<!-- Header -->
	<button
		type="button"
		class="section-header"
		class:collapsible
		onclick={toggleCollapsed}
		disabled={!collapsible}
	>
		<div class="header-left">
			{#if variant === 'warning'}
				<svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			{/if}
			<h3 class="section-title">{title}</h3>
			<span class="task-count">{tasks.length}</span>
		</div>

		{#if collapsible}
			<svg
				class="chevron"
				class:rotated={!isCollapsed}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
			</svg>
		{/if}
	</button>

	<!-- Content -->
	{#if !isCollapsed}
		<div class="section-content" transition:slide={{ duration: 200 }}>
			{#if tasks.length > 0}
				<div class="task-list">
					{#each visibleTasks as task (task.id)}
						{@const globalTask = isGlobal ? (task as GlobalTask) : null}
						<TaskCard
							{task}
							area={isGlobal ? null : getArea(task.areaId)}
							spaceColor={isGlobal && globalTask ? globalTask.spaceColor : spaceColor}
							spaceSlug={isGlobal && globalTask ? globalTask.spaceSlug : spaceSlug}
							variant={variant === 'warning' ? 'attention' : 'default'}
							showStaleBadge={showStaleBadges && isStale(task) && !isOverdue(task)}
							showOverdueBadge={showOverdueBadges && isOverdue(task)}
							isExpanded={isTaskExpanded(task.id)}
							{showSpaceBadge}
							spaceName={globalTask?.spaceName}
							spaceBadgeColor={globalTask?.spaceColor}
							areaName={globalTask?.areaName}
							areaColor={globalTask?.areaColor}
							onClick={() => onTaskClick(task)}
							onComplete={() => onCompleteTask(task)}
							onToggleExpanded={() => toggleTaskExpanded(task.id)}
							onDismissStale={onDismissStale ? () => onDismissStale(task) : undefined}
							onEdit={onEditTask ? () => onEditTask(task) : undefined}
							onDelete={onDeleteTask ? () => onDeleteTask(task) : undefined}
						/>
					{/each}
				</div>

				<!-- Show more button -->
				{#if hiddenCount > 0}
					<button
						type="button"
						class="show-more-btn"
						onclick={() => (showAll = true)}
					>
						Show {hiddenCount} more
					</button>
				{:else if showAll && tasks.length > maxVisible}
					<button
						type="button"
						class="show-more-btn"
						onclick={() => (showAll = false)}
					>
						Show less
					</button>
				{/if}
			{:else}
				<p class="empty-message">{emptyMessage}</p>
			{/if}
		</div>
	{/if}
</section>

<style>
	.task-group {
		display: flex;
		flex-direction: column;
	}

	.task-group.warning .section-header {
		color: #f59e0b;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0;
		background: transparent;
		border: none;
		cursor: default;
		width: 100%;
		text-align: left;
	}

	.section-header.collapsible {
		cursor: pointer;
	}

	.section-header.collapsible:hover {
		opacity: 0.8;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.warning-icon {
		width: 1rem;
		height: 1rem;
		color: #f59e0b;
	}

	.section-title {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	.task-group.warning .section-title {
		color: #f59e0b;
	}

	.task-count {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 9999px;
		color: rgba(255, 255, 255, 0.5);
	}

	.task-group.warning .task-count {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.chevron {
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.4);
		transition: transform 0.2s ease;
	}

	.chevron.rotated {
		transform: rotate(180deg);
	}

	.section-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-bottom: 1rem;
	}

	.task-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.empty-message {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.4);
		padding: 1rem;
		text-align: center;
		margin: 0;
	}

	.show-more-btn {
		width: 100%;
		padding: 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
		margin-top: 0.25rem;
	}

	.show-more-btn:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.2);
	}
</style>
