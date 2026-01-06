<!--
	TaskCard.svelte

	Individual task card for the Task Dashboard.
	Features:
	- Priority indicator (dot with glow for high)
	- Task title (clickable → navigate to task page OR toggle accordion)
	- Due date badge with urgency colors
	- Area tag (if assigned)
	- Subtask progress pill
	- Accordion expansion for tasks with subtasks
	- Hover: checkbox for quick complete
	- Future: space for source indicator
-->
<script lang="ts">
	import { slide, fade } from 'svelte/transition';
	import type { Task } from '$lib/types/tasks';
	import type { Area } from '$lib/types/areas';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import SubtaskAccordionList from '$lib/components/spaces/SubtaskAccordionList.svelte';

	interface Props {
		task: Task;
		area?: Area | null;
		spaceColor: string;
		spaceSlug: string;
		variant?: 'default' | 'attention';
		showStaleBadge?: boolean;
		showOverdueBadge?: boolean;
		isExpanded?: boolean;
		onComplete: () => void;
		onClick: () => void;
		onToggleExpanded?: () => void;
		onDismissStale?: () => void;
		onEdit?: () => void;
		onDelete?: () => void;
	}

	let {
		task,
		area = null,
		spaceColor,
		spaceSlug,
		variant = 'default',
		showStaleBadge = false,
		showOverdueBadge = false,
		isExpanded = false,
		onComplete,
		onClick,
		onToggleExpanded,
		onDismissStale,
		onEdit,
		onDelete
	}: Props = $props();

	// Hover state for checkbox
	let isHovered = $state(false);
	let isCompleting = $state(false);

	// Get subtasks
	let subtasks = $derived(taskStore.getSubtasksForTask(task.id));
	let hasSubtasks = $derived(subtasks.length > 0);

	// Subtask count
	let subtaskCount = $derived.by(() => {
		const completed = subtasks.filter((s) => s.status === 'completed').length;
		return { total: subtasks.length, completed };
	});

	// Format due date
	function formatDueDate(date: Date, type?: string): string {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		const diffDays = Math.floor((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		let label = '';
		if (diffDays < 0) {
			label = 'Overdue';
		} else if (diffDays === 0) {
			label = 'Today';
		} else if (diffDays === 1) {
			label = 'Tomorrow';
		} else if (diffDays < 7) {
			label = date.toLocaleDateString('en-US', { weekday: 'short' });
		} else {
			label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		}

		// Add hard deadline indicator
		if (type === 'hard' && diffDays >= 0) {
			label += ' (hard)';
		}

		return label;
	}

	// Get due date urgency class
	function getDueDateClass(date: Date): string {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		const diffDays = Math.floor((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays < 0) return 'due-overdue';
		if (diffDays === 0) return 'due-today';
		if (diffDays <= 7) return 'due-week';
		return 'due-later';
	}

	// Handle card click
	function handleCardClick() {
		if (hasSubtasks && onToggleExpanded) {
			onToggleExpanded();
		} else {
			onClick();
		}
	}

	// Handle checkbox click
	function handleCheckboxClick(e: Event) {
		e.stopPropagation();
		if (isCompleting) return;
		isCompleting = true;
		onComplete();
	}

	// Handle dismiss stale click
	function handleDismissStale(e: Event) {
		e.stopPropagation();
		onDismissStale?.();
	}

	// Handle edit click
	function handleEditClick(e: Event) {
		e.stopPropagation();
		onEdit?.();
	}

	// Handle delete click
	function handleDeleteClick(e: Event) {
		e.stopPropagation();
		onDelete?.();
	}
</script>

<div
	class="task-card-wrapper"
	class:expanded={isExpanded}
	style="--task-color: {task.color || spaceColor}; --space-color: {spaceColor}"
>
	<button
		type="button"
		class="task-card"
		class:attention={variant === 'attention'}
		class:completing={isCompleting}
		class:has-subtasks={hasSubtasks}
		onclick={handleCardClick}
		onmouseenter={() => (isHovered = true)}
		onmouseleave={() => (isHovered = false)}
	>
		<!-- Checkbox (hover-reveal) -->
		<div class="checkbox-area">
			{#if isHovered && !isCompleting}
				<button
					type="button"
					class="checkbox"
					onclick={handleCheckboxClick}
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

		<!-- Main content -->
		<div class="task-content">
			<!-- Title row -->
			<div class="task-header">
				<span class="task-title">{task.title}</span>
				{#if task.priority === 'high'}
					<span class="priority-badge">!</span>
				{/if}
				{#if hasSubtasks}
					<span class="subtask-badge">
						{subtaskCount.completed}/{subtaskCount.total}
					</span>
				{/if}
			</div>

			<!-- Meta row -->
			<div class="task-meta">
				{#if area}
					<span class="task-area" style="--area-color: {area.color || spaceColor}">
						{area.icon || ''} {area.name}
					</span>
				{/if}

				<!-- Badges -->
				{#if showOverdueBadge}
					<span class="badge badge-overdue">Overdue</span>
				{:else if showStaleBadge}
					<span class="badge badge-stale">
						No activity
						{#if onDismissStale}
							<button
								type="button"
								class="dismiss-btn"
								onclick={handleDismissStale}
								title="Dismiss"
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						{/if}
					</span>
				{/if}
			</div>
		</div>

		<!-- Due date badge -->
		{#if task.dueDate}
			{@const dueDate = new Date(task.dueDate)}
			<span class="due-badge {getDueDateClass(dueDate)}" class:hard={task.dueDateType === 'hard'}>
				{formatDueDate(dueDate, task.dueDateType)}
			</span>
		{/if}

		<!-- Action buttons (hover-reveal) -->
		{#if isHovered && !isCompleting}
			<div class="action-buttons" transition:fade={{ duration: 100 }}>
				<button
					type="button"
					class="action-btn action-done"
					onclick={handleCheckboxClick}
					title="Mark as done"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</button>
				{#if onEdit}
					<button
						type="button"
						class="action-btn action-edit"
						onclick={handleEditClick}
						title="Edit task"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
						</svg>
					</button>
				{/if}
				{#if onDelete}
					<button
						type="button"
						class="action-btn action-delete"
						onclick={handleDeleteClick}
						title="Delete task"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
						</svg>
					</button>
				{/if}
			</div>
		{/if}

		<!-- Chevron (expandable) or Arrow (navigate) -->
		{#if hasSubtasks}
			<svg
				class="task-chevron"
				class:rotated={isExpanded}
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

	<!-- Accordion content -->
	{#if isExpanded && hasSubtasks}
		<div class="accordion-content" transition:slide={{ duration: 200 }}>
			<SubtaskAccordionList
				{subtasks}
				parentTaskId={task.id}
				spaceParam={spaceSlug}
			/>
		</div>
	{/if}
</div>

<style>
	.task-card-wrapper {
		display: flex;
		flex-direction: column;
	}

	.task-card-wrapper.expanded .task-card {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		border-bottom-color: transparent;
	}

	.task-card {
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

	.task-card:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.task-card.attention {
		background: rgba(245, 158, 11, 0.05);
		border-color: rgba(245, 158, 11, 0.15);
	}

	.task-card.attention:hover {
		background: rgba(245, 158, 11, 0.08);
		border-color: rgba(245, 158, 11, 0.25);
	}

	.task-card.completing {
		opacity: 0.5;
		pointer-events: none;
	}

	/* Checkbox area */
	.checkbox-area {
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

	/* Content */
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

	/* Meta row */
	.task-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.task-area {
		font-size: 0.6875rem;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		background: color-mix(in srgb, var(--area-color, var(--space-color)) 15%, transparent);
		color: var(--area-color, var(--space-color));
	}

	/* Badges */
	.badge {
		font-size: 0.625rem;
		font-weight: 500;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.badge-overdue {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.badge-stale {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.dismiss-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 0.875rem;
		height: 0.875rem;
		padding: 0;
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.1s ease;
	}

	.dismiss-btn:hover {
		opacity: 1;
	}

	.dismiss-btn svg {
		width: 0.625rem;
		height: 0.625rem;
	}

	/* Due date badge */
	.due-badge {
		flex-shrink: 0;
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		white-space: nowrap;
	}

	.due-badge.due-overdue {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.due-badge.due-today {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.due-badge.due-week {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	.due-badge.due-later {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.5);
	}

	.due-badge.hard {
		font-weight: 600;
	}

	/* Arrow (for non-expandable) */
	.task-arrow {
		flex-shrink: 0;
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.3);
		margin-top: 0.125rem;
		transition: all 0.15s ease;
	}

	.task-card:hover .task-arrow {
		color: rgba(255, 255, 255, 0.6);
		transform: translateX(2px);
	}

	/* Chevron (for expandable) */
	.task-chevron {
		flex-shrink: 0;
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.4);
		margin-top: 0.125rem;
		transition: all 0.2s ease;
	}

	.task-chevron.rotated {
		transform: rotate(180deg);
	}

	.task-card:hover .task-chevron {
		color: rgba(255, 255, 255, 0.6);
	}

	/* Accordion content */
	.accordion-content {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-top: none;
		border-bottom-left-radius: 0.5rem;
		border-bottom-right-radius: 0.5rem;
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

	/* Responsive: hide action buttons on small screens, show menu instead */
	@media (max-width: 640px) {
		.action-buttons {
			display: none;
		}
	}
</style>
