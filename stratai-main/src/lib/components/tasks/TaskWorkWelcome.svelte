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
	 * - Quick start suggestion cards (contextually aware based on task type)
	 */

	import type { Task } from '$lib/types/tasks';
	import { getQuickStarts, type QuickStartIcon } from '$lib/utils/quick-starts';

	// SVG icon paths for quick start icons
	const ICON_PATHS: Record<QuickStartIcon, string> = {
		checklist: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
		search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
		chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
		target: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
		calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
		warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		question: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		magnifier: 'M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z',
		document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
		ruler: 'M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5',
		puzzle: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
		microscope: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
		lightbulb: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
		users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
		sparkle: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
		bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
		rocket: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z'
	};

	interface Props {
		task: Task;
		onQuickStart?: (prompt: string) => void;
	}

	let { task, onQuickStart }: Props = $props();

	// Quick start suggestions - contextually aware based on task title
	let quickStarts = $derived(
		getQuickStarts({
			title: task.title,
			description: task.description,
			isSubtask: false
		}).slice(0, 2) // Only show first 2 for work welcome
	);

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
					<svg class="quick-start-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d={ICON_PATHS[qs.icon]} />
					</svg>
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
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
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
