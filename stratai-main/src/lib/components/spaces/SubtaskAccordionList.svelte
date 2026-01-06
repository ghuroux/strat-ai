<script lang="ts">
	/**
	 * Subtask Accordion List Component
	 *
	 * Compact subtask list for accordion view on Space Dashboard.
	 * Features:
	 * - Mini progress bar
	 * - Clickable subtasks navigate to subtask chat
	 * - Quick-complete checkbox for action items
	 * - "View full task" link at bottom
	 */
	import { goto } from '$app/navigation';
	import type { Task } from '$lib/types/tasks';
	import { taskStore } from '$lib/stores/tasks.svelte';

	interface Props {
		subtasks: Task[];
		parentTaskId: string;
		spaceParam: string;
	}

	let { subtasks, parentTaskId, spaceParam }: Props = $props();

	// Progress calculations
	let completedCount = $derived(subtasks.filter((s) => s.status === 'completed').length);
	let activeSubtasks = $derived(subtasks.filter((s) => s.status !== 'completed'));
	let completedSubtasks = $derived(subtasks.filter((s) => s.status === 'completed'));
	let progressPercent = $derived(subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0);

	// Navigate to subtask
	function handleSubtaskClick(subtaskId: string) {
		goto(`/spaces/${spaceParam}/task/${subtaskId}`);
	}

	// Navigate to parent task dashboard
	function handleViewFullTask() {
		goto(`/spaces/${spaceParam}/task/${parentTaskId}?view=dashboard`);
	}

	// Quick complete action item
	async function handleQuickComplete(e: Event, subtaskId: string) {
		e.stopPropagation();
		await taskStore.completeTask(subtaskId);
	}
</script>

<div class="accordion-list">
	<!-- Mini Progress Bar -->
	<div class="progress-row">
		<div class="progress-bar">
			<div class="progress-fill" style="width: {progressPercent}%"></div>
		</div>
		<span class="progress-text">{completedCount}/{subtasks.length}</span>
	</div>

	<!-- Active Subtasks -->
	{#each activeSubtasks.slice(0, 5) as subtask (subtask.id)}
		<div
			class="accordion-item"
			role="button"
			tabindex="0"
			onclick={() => handleSubtaskClick(subtask.id)}
			onkeydown={(e) => e.key === 'Enter' && handleSubtaskClick(subtask.id)}
		>
			{#if subtask.subtaskType === 'action'}
				<button
					type="button"
					class="quick-checkbox"
					onclick={(e) => handleQuickComplete(e, subtask.id)}
					title="Mark complete"
				>
					<div class="checkbox-inner"></div>
				</button>
			{:else}
				<div class="item-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					</svg>
				</div>
			{/if}
			<span class="item-title">{subtask.title}</span>
			<svg class="item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
			</svg>
		</div>
	{/each}

	<!-- Show completed count if any -->
	{#if completedSubtasks.length > 0 && activeSubtasks.length <= 5}
		<div class="completed-hint">
			{completedSubtasks.length} completed
		</div>
	{/if}

	<!-- Show "more" if there are more than 5 active subtasks -->
	{#if activeSubtasks.length > 5}
		<div class="more-hint">
			+{activeSubtasks.length - 5} more subtasks
		</div>
	{/if}

	<!-- View Full Task Link -->
	<button type="button" class="view-full-link" onclick={handleViewFullTask}>
		View full task
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
		</svg>
	</button>
</div>

<style>
	.accordion-list {
		padding: 0.5rem 0.75rem 0.75rem 2.5rem;
		background: rgba(255, 255, 255, 0.01);
		border-top: 1px solid rgba(255, 255, 255, 0.04);
	}

	/* Progress Row */
	.progress-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	}

	.progress-bar {
		flex: 1;
		height: 3px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 1.5px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: #22c55e;
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.4);
		flex-shrink: 0;
	}

	/* Accordion Item */
	.accordion-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.375rem;
		background: none;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: background 0.15s ease;
		text-align: left;
	}

	.accordion-item:hover {
		background: rgba(255, 255, 255, 0.03);
	}

	.item-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.item-icon svg {
		width: 0.875rem;
		height: 0.875rem;
		color: rgba(255, 255, 255, 0.35);
	}

	.quick-checkbox {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1rem;
		height: 1rem;
		padding: 0;
		background: none;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
	}

	.checkbox-inner {
		width: 0.75rem;
		height: 0.75rem;
		border: 1.5px solid rgba(255, 255, 255, 0.3);
		border-radius: 0.125rem;
		transition: all 0.15s ease;
	}

	.quick-checkbox:hover .checkbox-inner {
		border-color: #22c55e;
		background: rgba(34, 197, 94, 0.1);
	}

	.item-title {
		flex: 1;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.7);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-arrow {
		width: 0.75rem;
		height: 0.75rem;
		color: rgba(255, 255, 255, 0.2);
		flex-shrink: 0;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.accordion-item:hover .item-arrow {
		opacity: 1;
	}

	/* Hints */
	.completed-hint,
	.more-hint {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.35);
		padding: 0.375rem 0.5rem;
	}

	/* View Full Link */
	.view-full-link {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.375rem;
		padding: 0.5rem 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.4);
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.view-full-link:hover {
		color: rgba(255, 255, 255, 0.7);
	}

	.view-full-link svg {
		width: 0.75rem;
		height: 0.75rem;
	}
</style>
