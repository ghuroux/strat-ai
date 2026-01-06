<!--
	TaskSuggestionCard.svelte

	Displays an inline task suggestion card after AI messages.
	When the AI detects an actionable item, it includes a [TASK_SUGGEST] marker
	that the frontend parses and renders as this card.

	Features:
	- Shows suggested task title, due date, priority
	- Explains why the AI suggested this task
	- Create button opens TaskModal pre-filled
	- Dismiss button hides the suggestion
-->
<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { TaskSuggestion } from '$lib/utils/task-suggestion-parser';

	interface Props {
		suggestion: TaskSuggestion;
		areaColor?: string;
		onAccept: (suggestion: TaskSuggestion) => void;
		onDismiss: () => void;
	}

	let { suggestion, areaColor = '#3b82f6', onAccept, onDismiss }: Props = $props();

	// Format the due date for display
	function formatDueDate(dueDate: string | undefined): string {
		if (!dueDate) return '';
		const lower = dueDate.toLowerCase();
		// Capitalize first letter
		return lower.charAt(0).toUpperCase() + lower.slice(1);
	}
</script>

<div
	class="suggestion-card"
	style="--suggestion-color: {areaColor}"
	in:fly={{ y: 10, duration: 200, delay: 100 }}
>
	<div class="suggestion-header">
		<svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
		</svg>
		<span class="suggestion-label">Track this?</span>
	</div>

	<div class="suggestion-content">
		<p class="suggestion-title">"{suggestion.title}"</p>
		<div class="suggestion-meta">
			{#if suggestion.dueDate}
				<span class="meta-item due">Due: {formatDueDate(suggestion.dueDate)}</span>
			{/if}
			{#if suggestion.priority === 'high'}
				<span class="meta-item priority">High priority</span>
			{:else}
				<span class="meta-item">Normal priority</span>
			{/if}
		</div>
		<p class="suggestion-reason">{suggestion.reason}</p>
	</div>

	<div class="suggestion-actions">
		<button
			type="button"
			class="action-btn create"
			onclick={() => onAccept(suggestion)}
		>
			Create Task
		</button>
		<button
			type="button"
			class="action-btn dismiss"
			onclick={onDismiss}
		>
			Dismiss
		</button>
	</div>
</div>

<style>
	.suggestion-card {
		margin: 0.75rem 0;
		padding: 0.875rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-left: 3px solid var(--suggestion-color);
		border-radius: 0.5rem;
		max-width: 28rem;
	}

	.suggestion-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.625rem;
	}

	.suggestion-icon {
		width: 1rem;
		height: 1rem;
		color: var(--suggestion-color);
	}

	.suggestion-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--suggestion-color);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.suggestion-content {
		margin-bottom: 0.75rem;
	}

	.suggestion-title {
		margin: 0 0 0.5rem;
		font-size: 0.9375rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.95);
		line-height: 1.4;
	}

	.suggestion-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.meta-item {
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.125rem 0.5rem;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 9999px;
		color: rgba(255, 255, 255, 0.6);
	}

	.meta-item.due {
		background: color-mix(in srgb, var(--suggestion-color) 15%, transparent);
		color: var(--suggestion-color);
	}

	.meta-item.priority {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.suggestion-reason {
		margin: 0;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.5;
	}

	.suggestion-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		flex: 1;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.action-btn.create {
		color: white;
		background: var(--suggestion-color);
	}

	.action-btn.create:hover {
		filter: brightness(1.1);
	}

	.action-btn.dismiss {
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.action-btn.dismiss:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.08);
	}
</style>
