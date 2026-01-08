<script lang="ts">
	/**
	 * Task Work Welcome
	 *
	 * Shown after user chooses "Work directly" in the Task Approach Modal.
	 * Displays above the chat input, following the main chat welcome pattern.
	 *
	 * Features:
	 * - Task icon/emoji at top
	 * - Welcome message with task title
	 * - Guidance about capabilities (multiple conversations, panel)
	 * - Quick start suggestion cards
	 */

	import type { Task } from '$lib/types/tasks';

	interface Props {
		task: Task;
		onQuickStart?: (prompt: string) => void;
	}

	let { task, onQuickStart }: Props = $props();

	// Quick start suggestions
	const quickStarts = [
		{
			icon: '⚡',
			label: 'Brainstorm approaches',
			prompt: `Help me brainstorm different approaches to: ${task.title}`
		},
		{
			icon: '📝',
			label: 'Create a plan',
			prompt: `Help me create a plan for: ${task.title}`
		}
	];

	function handleQuickStart(prompt: string) {
		onQuickStart?.(prompt);
	}
</script>

<div class="work-welcome">
	<!-- Icon -->
	<div class="welcome-icon" style="--task-color: {task.color}">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
			/>
		</svg>
	</div>

	<!-- Title -->
	<h2 class="welcome-title" style="--task-color: {task.color}">
		Ready to work on "{task.title}"
	</h2>

	<!-- Subtitle -->
	<p class="welcome-subtitle">
		Start a conversation to work through this task. Use the panel to add context and manage
		sessions.
	</p>

	<!-- Quick Start Cards -->
	{#if onQuickStart}
		<div class="quick-starts">
			{#each quickStarts as qs}
				<button class="quick-start-card" onclick={() => handleQuickStart(qs.prompt)}>
					<span class="quick-start-icon">{qs.icon}</span>
					<span class="quick-start-label">{qs.label}</span>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Visual Pointer -->
	<div class="pointer">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
		</svg>
		<span>Type below to get started</span>
	</div>
</div>

<style>
	.work-welcome {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		text-align: center;
		min-height: 300px;
	}

	.welcome-icon {
		width: 4rem;
		height: 4rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--task-color, #3b82f6) 15%, transparent);
		border-radius: 1rem;
		margin-bottom: 1.5rem;
	}

	.welcome-icon svg {
		width: 2.25rem;
		height: 2.25rem;
		color: var(--task-color, #3b82f6);
	}

	.welcome-title {
		font-size: 1.375rem;
		font-weight: 600;
		color: var(--task-color, #3b82f6);
		margin: 0 0 0.75rem;
		max-width: 400px;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.welcome-subtitle {
		font-size: 0.9375rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 2rem;
		max-width: 380px;
		line-height: 1.5;
	}

	.quick-starts {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.quick-start-card {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.quick-start-card:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
		transform: translateY(-1px);
	}

	.quick-start-icon {
		font-size: 1rem;
	}

	.quick-start-label {
		font-weight: 500;
	}

	.pointer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.8125rem;
	}

	.pointer svg {
		width: 1.25rem;
		height: 1.25rem;
		animation: bounce 2s infinite;
	}

	@keyframes bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(4px);
		}
	}

	/* Mobile adjustments */
	@media (max-width: 480px) {
		.work-welcome {
			padding: 1.5rem 1rem;
			min-height: 250px;
		}

		.welcome-title {
			font-size: 1.25rem;
		}

		.quick-starts {
			flex-direction: column;
			width: 100%;
		}

		.quick-start-card {
			width: 100%;
			justify-content: center;
		}
	}
</style>
