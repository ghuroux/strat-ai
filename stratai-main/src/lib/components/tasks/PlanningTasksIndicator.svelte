<script lang="ts">
	/**
	 * PlanningTasksIndicator - Header badge showing tasks in planning mode
	 *
	 * Displays a badge with count and dropdown to manage planning tasks.
	 * Clicking shows list of planning tasks with resume/cancel actions.
	 */
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Task } from '$lib/types/tasks';

	// Get planning tasks from store
	let planningTasks = $derived(taskStore.planningTasks);
	let planningCount = $derived(taskStore.planningTaskCount);
	let focusedTaskId = $derived(taskStore.focusedTaskId);

	// Dropdown state
	let isOpen = $state(false);
	let dropdownRef = $state<HTMLDivElement | null>(null);

	// Close dropdown when clicking outside
	function handleClickOutside(e: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
			isOpen = false;
		}
	}

	// Handle resume - navigate to task
	function handleResume(task: Task) {
		isOpen = false;
		// Find the space for this task
		const space = spacesStore.getSpaceById(task.spaceId);
		const spaceSlug = space?.slug || 'work';
		goto(`/spaces/${spaceSlug}/task/${task.id}`);
	}

	// Handle cancel planning
	async function handleCancel(task: Task) {
		// Need to focus the task first to cancel its plan mode
		taskStore.setFocusedTask(task.id);
		await taskStore.exitPlanMode();
		toastStore.success(`Cancelled planning for "${task.title}"`);
	}

	// Format time ago
	function formatTimeAgo(dateStr: string | undefined): string {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		const now = Date.now();
		const diff = now - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	// Get phase display
	function getPhaseLabel(task: Task): string {
		const phase = task.planningData?.phase;
		switch (phase) {
			case 'eliciting':
				return 'Discussing';
			case 'proposing':
				return 'Generating';
			case 'confirming':
				return 'Reviewing';
			default:
				return 'Planning';
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

{#if planningCount > 0}
	<div class="relative" bind:this={dropdownRef}>
		<!-- Badge Button -->
		<button
			type="button"
			class="planning-badge"
			onclick={() => isOpen = !isOpen}
			title="{planningCount} task{planningCount > 1 ? 's' : ''} in planning"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
				/>
			</svg>
			<span class="count">{planningCount}</span>
		</button>

		<!-- Dropdown -->
		{#if isOpen}
			<div
				class="dropdown"
				transition:fly={{ y: -10, duration: 150 }}
			>
				<div class="dropdown-header">
					<span class="dropdown-title">Tasks in Planning</span>
					<span class="dropdown-count">{planningCount}</span>
				</div>

				<div class="dropdown-content">
					{#each planningTasks as task (task.id)}
						{@const isFocused = task.id === focusedTaskId}
						{@const proposedCount = task.planningData?.proposedSubtasks?.length ?? 0}
						<div class="planning-task" class:focused={isFocused}>
							<div class="task-info">
								<div class="task-header">
									<span
										class="task-color"
										style="background: {task.color || '#a855f7'};"
									></span>
									<span class="task-title">{task.title}</span>
								</div>
								<div class="task-meta">
									<span class="task-phase">{getPhaseLabel(task)}</span>
									{#if proposedCount > 0}
										<span class="task-subtasks">{proposedCount} subtasks</span>
									{/if}
									<span class="task-time">{formatTimeAgo(task.planningData?.startedAt)}</span>
								</div>
							</div>
							<div class="task-actions">
								<button
									type="button"
									class="action-btn resume"
									onclick={() => handleResume(task)}
									title="Resume planning"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</button>
								<button
									type="button"
									class="action-btn cancel"
									onclick={() => handleCancel(task)}
									title="Cancel planning"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</div>
						</div>
					{/each}
				</div>

				{#if planningCount > 1}
					<div class="dropdown-footer">
						<span class="footer-hint">Tip: You can plan multiple tasks simultaneously</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.planning-badge {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		background: rgba(168, 85, 247, 0.15);
		border: 1px solid rgba(168, 85, 247, 0.3);
		border-radius: 0.5rem;
		color: #a855f7;
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.planning-badge:hover {
		background: rgba(168, 85, 247, 0.25);
		border-color: rgba(168, 85, 247, 0.5);
	}

	.planning-badge .count {
		min-width: 1rem;
		text-align: center;
	}

	.dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		width: 320px;
		background: rgb(var(--surface-900-rgb));
		border: 1px solid rgb(var(--surface-700-rgb));
		border-radius: 0.75rem;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
		z-index: 100;
		overflow: hidden;
	}

	.dropdown-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: rgba(168, 85, 247, 0.1);
		border-bottom: 1px solid rgb(var(--surface-700-rgb));
	}

	.dropdown-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
	}

	.dropdown-count {
		padding: 0.125rem 0.5rem;
		background: rgba(168, 85, 247, 0.2);
		border-radius: 9999px;
		font-size: 0.6875rem;
		font-weight: 600;
		color: #a855f7;
	}

	.dropdown-content {
		max-height: 300px;
		overflow-y: auto;
	}

	.planning-task {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgba(var(--surface-700-rgb), 0.5);
		transition: background 0.15s ease;
	}

	.planning-task:last-child {
		border-bottom: none;
	}

	.planning-task:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.planning-task.focused {
		background: rgba(168, 85, 247, 0.08);
	}

	.task-info {
		flex: 1;
		min-width: 0;
	}

	.task-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.375rem;
	}

	.task-color {
		flex-shrink: 0;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}

	.task-title {
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.task-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.task-phase {
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.125rem 0.375rem;
		background: rgba(168, 85, 247, 0.2);
		color: #c084fc;
		border-radius: 0.25rem;
	}

	.task-subtasks {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.task-time {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.task-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.375rem;
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.5);
		cursor: pointer;
		transition: all 0.15s ease;
		border: none;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.9);
	}

	.action-btn.resume:hover {
		background: rgba(168, 85, 247, 0.2);
		color: #a855f7;
	}

	.action-btn.cancel:hover {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.dropdown-footer {
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.02);
		border-top: 1px solid rgb(var(--surface-700-rgb));
	}

	.footer-hint {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.4);
		font-style: italic;
	}
</style>
