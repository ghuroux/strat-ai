<!--
	FocusSuggestion.svelte

	AI-assisted focus suggestion for Task Dashboard.
	Shows contextual message about task state and suggests the most important task to work on.

	Features:
	- Contextual, situation-aware messaging (not generic greetings)
	- Smart task suggestion algorithm
	- Click to navigate directly to task
-->
<script lang="ts">
	import type { Task } from '$lib/types/tasks';

	interface Props {
		tasks: Task[];
		overdueCount: number;
		todayCount: number;
		completedToday: number;
		spaceColor: string;
		spaceSlug: string;
		onTaskClick: (task: Task) => void;
	}

	let {
		tasks,
		overdueCount,
		todayCount,
		completedToday,
		spaceColor,
		spaceSlug,
		onTaskClick
	}: Props = $props();

	// Generate contextual message based on current state
	let contextMessage = $derived.by(() => {
		// Priority: overdue > today's workload > momentum > all clear
		if (overdueCount > 0) {
			return overdueCount === 1
				? '1 overdue task needs attention'
				: `${overdueCount} overdue tasks need attention`;
		}

		if (todayCount > 0) {
			const highPriorityToday = tasks.filter(
				(t) =>
					t.priority === 'high' &&
					t.dueDate &&
					new Date(t.dueDate).toDateString() === new Date().toDateString()
			).length;

			if (highPriorityToday > 0) {
				return `${todayCount} task${todayCount === 1 ? '' : 's'} due today, ${highPriorityToday} high priority`;
			}
			return `${todayCount} task${todayCount === 1 ? '' : 's'} due today`;
		}

		if (completedToday > 0) {
			return completedToday === 1
				? "You've completed 1 task today - keep it going"
				: `You've completed ${completedToday} tasks today - nice momentum`;
		}

		return 'All clear for today';
	});

	// Suggested task algorithm
	// Priority: 1. Overdue hard deadlines, 2. High priority today, 3. Any today,
	//           4. High priority anytime, 5. Most recently active
	let suggestedTask = $derived.by(() => {
		if (tasks.length === 0) return null;

		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		// Helper to check if task is due today or earlier
		const isDueByToday = (task: Task) => {
			if (!task.dueDate) return false;
			const dueDay = new Date(task.dueDate);
			dueDay.setHours(0, 0, 0, 0);
			return dueDay <= today;
		};

		// Helper to check if overdue (hard deadline passed)
		const isOverdue = (task: Task) => {
			if (!task.dueDate || task.dueDateType !== 'hard') return false;
			return new Date(task.dueDate) < now;
		};

		// 1. Overdue hard deadlines (oldest first)
		const overdueHard = tasks
			.filter(isOverdue)
			.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
		if (overdueHard.length > 0) return overdueHard[0];

		// 2. High priority due today
		const highPriorityToday = tasks.filter((t) => t.priority === 'high' && isDueByToday(t));
		if (highPriorityToday.length > 0) return highPriorityToday[0];

		// 3. Any due today (earliest first)
		const dueToday = tasks
			.filter(isDueByToday)
			.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
		if (dueToday.length > 0) return dueToday[0];

		// 4. High priority without date
		const highPriorityAnytime = tasks.filter((t) => t.priority === 'high' && !t.dueDate);
		if (highPriorityAnytime.length > 0) return highPriorityAnytime[0];

		// 5. Most recently active task
		const byActivity = [...tasks].sort(
			(a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
		);
		return byActivity[0] || null;
	});

	// Generate reason for suggestion
	let suggestionReason = $derived.by(() => {
		if (!suggestedTask) return '';

		const now = new Date();
		const reasons: string[] = [];

		// Check overdue
		if (
			suggestedTask.dueDate &&
			suggestedTask.dueDateType === 'hard' &&
			new Date(suggestedTask.dueDate) < now
		) {
			reasons.push('Hard deadline passed');
		} else if (suggestedTask.dueDate) {
			const dueDay = new Date(suggestedTask.dueDate);
			dueDay.setHours(0, 0, 0, 0);
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

			if (dueDay <= today) {
				reasons.push('Due today');
			}
		}

		// Check priority
		if (suggestedTask.priority === 'high') {
			reasons.push('High priority');
		}

		// Fallback
		if (reasons.length === 0) {
			reasons.push('Recently active');
		}

		return reasons.join(' · ');
	});

	// Should we show the focus suggestion?
	let shouldShow = $derived.by(() => {
		// Don't show if no tasks
		if (tasks.length === 0) return false;

		// Don't show if no suggested task
		if (!suggestedTask) return false;

		// Show if there's anything actionable
		return true;
	});

	function handleClick() {
		if (suggestedTask) {
			onTaskClick(suggestedTask);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}
</script>

{#if shouldShow && suggestedTask}
	<div class="focus-suggestion" style="--space-color: {spaceColor}">
		<div class="context-message">{contextMessage}</div>

		<button
			type="button"
			class="suggested-task"
			onclick={handleClick}
			onkeydown={handleKeydown}
		>
			<div class="task-indicator">
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
			</div>

			<div class="task-content">
				<span class="task-title">{suggestedTask.title}</span>
				<span class="task-reason">{suggestionReason}</span>
			</div>

			<div class="task-action">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
				</svg>
			</div>
		</button>
	</div>
{/if}

<style>
	.focus-suggestion {
		background: linear-gradient(
			135deg,
			rgba(var(--space-color-rgb, 99, 102, 241), 0.08) 0%,
			rgba(var(--space-color-rgb, 99, 102, 241), 0.03) 100%
		);
		border: 1px solid rgba(var(--space-color-rgb, 99, 102, 241), 0.15);
		border-radius: 0.75rem;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.context-message {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.6);
		margin-bottom: 0.75rem;
	}

	.suggested-task {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
	}

	.suggested-task:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.task-indicator {
		width: 1.75rem;
		height: 1.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(251, 191, 36, 0.15);
		border-radius: 0.375rem;
		color: #fbbf24;
		flex-shrink: 0;
	}

	.task-indicator svg {
		width: 1rem;
		height: 1rem;
	}

	.task-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.task-title {
		font-size: 0.9375rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.task-reason {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.task-action {
		width: 1.25rem;
		height: 1.25rem;
		color: rgba(255, 255, 255, 0.4);
		flex-shrink: 0;
		transition: color 0.15s ease;
	}

	.task-action svg {
		width: 100%;
		height: 100%;
	}

	.suggested-task:hover .task-action {
		color: rgba(255, 255, 255, 0.7);
	}

	/* Responsive */
	@media (max-width: 480px) {
		.focus-suggestion {
			padding: 0.875rem;
		}

		.suggested-task {
			padding: 0.625rem;
		}

		.task-indicator {
			width: 1.5rem;
			height: 1.5rem;
		}

		.task-indicator svg {
			width: 0.875rem;
			height: 0.875rem;
		}
	}
</style>
