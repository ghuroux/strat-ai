<!--
	RecentlyCompletedSection.svelte

	Shows recently completed tasks in the Task Dashboard.
	- Default: Today's completions (includes subtasks for immediate feedback)
	- Expanded: This month's parent task completions (summary view)
	- Reopen action to restore tasks

	TODO: Add pagination if this month's completions becomes too large (100+)
-->
<script lang="ts">
	import { slide, fade } from 'svelte/transition';
	import type { Task } from '$lib/types/tasks';

	interface Props {
		completedTasks: Task[]; // All completed tasks for this space
		spaceColor: string;
		onReopen: (task: Task) => void;
		onTaskClick: (task: Task) => void;
	}

	let { completedTasks, spaceColor, onReopen, onTaskClick }: Props = $props();

	let showThisMonth = $state(false);

	// Filter tasks completed today
	let todaysTasks = $derived.by(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return completedTasks.filter((task) => {
			if (!task.completedAt) return false;
			const completedDate = new Date(task.completedAt);
			completedDate.setHours(0, 0, 0, 0);
			return completedDate.getTime() === today.getTime();
		});
	});

	// Filter tasks completed this month - PARENT TASKS ONLY (for summary view)
	let thisMonthsTasks = $derived.by(() => {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		return completedTasks
			.filter((task) => {
				if (!task.completedAt) return false;
				// Only include parent tasks (not subtasks) for the month view
				if (task.parentTaskId) return false;
				return new Date(task.completedAt) >= startOfMonth;
			})
			.sort((a, b) => {
				// Sort by completion date, newest first
				const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0;
				const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0;
				return bDate - aDate;
			});
	});

	// Tasks to display based on current view
	let displayTasks = $derived(showThisMonth ? thisMonthsTasks : todaysTasks);

	// Show "view month" button only if there are parent tasks this month to view
	let hasMonthProjects = $derived(thisMonthsTasks.length > 0);

	// Format completion date
	function formatCompletedDate(date: Date): string {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		const completedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

		if (completedDay.getTime() === today.getTime()) {
			return 'Today';
		} else if (completedDay.getTime() === yesterday.getTime()) {
			return 'Yesterday';
		} else {
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		}
	}

	// Handle reopen click
	function handleReopen(e: Event, task: Task) {
		e.stopPropagation();
		onReopen(task);
	}
</script>

{#if todaysTasks.length > 0 || thisMonthsTasks.length > 0}
	<section class="completed-section" style="--space-color: {spaceColor}" transition:slide={{ duration: 200 }}>
		<!-- Header -->
		<div class="section-header">
			<div class="header-left">
				<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<h3 class="section-title">
					{showThisMonth ? 'Completed This Month' : 'Recently Completed'}
				</h3>
				<span class="task-count">{displayTasks.length}</span>
			</div>
		</div>

		<!-- Task list -->
		<div class="task-list">
			{#each displayTasks as task (task.id)}
				<div
					class="completed-task"
					role="button"
					tabindex="0"
					onclick={() => onTaskClick(task)}
					onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onTaskClick(task)}
					transition:fade={{ duration: 150 }}
				>
					<div class="task-check">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
						</svg>
					</div>

					<div class="task-content">
						<span class="task-title">{task.title}</span>
						{#if task.completedAt}
							<span class="task-date">{formatCompletedDate(new Date(task.completedAt))}</span>
						{/if}
					</div>

					<button
						type="button"
						class="reopen-btn"
						onclick={(e) => handleReopen(e, task)}
						title="Reopen task"
					>
						Reopen
					</button>
				</div>
			{/each}
		</div>

		<!-- Show more / Show less -->
		{#if !showThisMonth && todaysTasks.length === 0 && hasMonthProjects}
			<!-- No tasks today but have parent tasks this month -->
			<button
				type="button"
				class="show-more-btn"
				onclick={() => (showThisMonth = true)}
			>
				View {thisMonthsTasks.length} project{thisMonthsTasks.length === 1 ? '' : 's'} completed this month
			</button>
		{:else if !showThisMonth && hasMonthProjects}
			<!-- Have tasks today and parent tasks this month -->
			<button
				type="button"
				class="show-more-btn"
				onclick={() => (showThisMonth = true)}
			>
				View {thisMonthsTasks.length} project{thisMonthsTasks.length === 1 ? '' : 's'} completed this month
			</button>
		{:else if showThisMonth && todaysTasks.length > 0}
			<!-- Viewing month, can go back to today's view -->
			<button
				type="button"
				class="show-more-btn"
				onclick={() => (showThisMonth = false)}
			>
				Show today's completions
			</button>
		{:else if showThisMonth}
			<!-- Viewing month, collapse -->
			<button
				type="button"
				class="show-more-btn"
				onclick={() => (showThisMonth = false)}
			>
				Collapse
			</button>
		{/if}
	</section>
{/if}

<style>
	.completed-section {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.check-icon {
		width: 1rem;
		height: 1rem;
		color: rgba(34, 197, 94, 0.6);
	}

	.section-title {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	.task-count {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		background: rgba(34, 197, 94, 0.1);
		border-radius: 9999px;
		color: rgba(34, 197, 94, 0.7);
	}

	.task-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.completed-task {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 0.375rem;
		text-align: left;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.completed-task:hover {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.task-check {
		width: 1.125rem;
		height: 1.125rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(34, 197, 94, 0.5);
		flex-shrink: 0;
	}

	.task-check svg {
		width: 100%;
		height: 100%;
	}

	.task-content {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.task-title {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
		text-decoration: line-through;
		text-decoration-color: rgba(255, 255, 255, 0.2);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.task-date {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.3);
		flex-shrink: 0;
	}

	.reopen-btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.4);
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.25rem;
		cursor: pointer;
		opacity: 0;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.completed-task:hover .reopen-btn {
		opacity: 1;
	}

	.reopen-btn:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
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
		margin-top: 0.5rem;
	}

	.show-more-btn:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.2);
	}
</style>
