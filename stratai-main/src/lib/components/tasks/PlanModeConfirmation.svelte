<script lang="ts">
	/**
	 * PlanModeConfirmation Component
	 *
	 * Full-page centered dashboard shown after Plan Mode subtask creation.
	 * Features:
	 * - Loading state while generating context
	 * - Success hero with synopsis
	 * - Subtask cards with context previews
	 * - Action buttons to navigate
	 */
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import type { Task, PlanModeSynopsis, SubtaskContext } from '$lib/types/tasks';

	interface Props {
		task: Task;
		subtasks: Task[];
		synopsis?: PlanModeSynopsis;
		spaceParam: string;
		isLoading?: boolean;
		onStartFirstSubtask?: () => void;
		onViewDashboard?: () => void;
	}

	let {
		task,
		subtasks,
		synopsis,
		spaceParam,
		isLoading = false,
		onStartFirstSubtask,
		onViewDashboard
	}: Props = $props();

	// Parse context from subtasks
	function parseSubtaskContext(subtask: Task): SubtaskContext | null {
		if (!subtask.contextSummary) return null;
		try {
			return JSON.parse(subtask.contextSummary) as SubtaskContext;
		} catch {
			return null;
		}
	}

	// First subtask (recommended to start with)
	let firstSubtask = $derived(subtasks[0]);

	// Navigate to subtask
	function handleSubtaskClick(subtaskId: string) {
		goto(`/spaces/${spaceParam}/task/${subtaskId}`);
	}

	// Handle start first subtask
	function handleStartFirst() {
		if (onStartFirstSubtask) {
			onStartFirstSubtask();
		} else if (firstSubtask) {
			handleSubtaskClick(firstSubtask.id);
		}
	}
</script>

<div class="confirmation-wrapper">
	{#if isLoading}
		<!-- Loading State -->
		<div class="loading-container" in:fade={{ duration: 200 }}>
			<div class="loading-spinner">
				<svg viewBox="0 0 50 50" class="spinner">
					<circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
				</svg>
			</div>
			<h2 class="loading-title">Working on your subtasks...</h2>
			<p class="loading-subtitle">Generating context and guidance for each step</p>
		</div>
	{:else}
		<!-- Success Content -->
		<div class="confirmation-content" style="--task-color: {task.color};" in:fly={{ y: 20, duration: 300 }}>
			<!-- Success Hero -->
			<div class="success-hero">
				<div class="success-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<div class="hero-content">
					<h1 class="hero-title">Plan Ready!</h1>
					<p class="hero-subtitle">
						"{task.title}" &bull; {subtasks.length} subtask{subtasks.length === 1 ? '' : 's'} created
					</p>
				</div>
			</div>

			<!-- Synopsis Card -->
			{#if synopsis}
				<div class="synopsis-card">
					<h3 class="synopsis-header">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
						</svg>
						How to approach this
					</h3>
					<p class="synopsis-reasoning">{synopsis.reasoning}</p>
					<div class="synopsis-getting-started">
						<span class="getting-started-label">Getting started:</span>
						{synopsis.gettingStarted}
					</div>
				</div>
			{/if}

			<!-- Subtask List -->
			<div class="subtasks-section">
				<h3 class="section-title">Your subtasks</h3>
				<div class="subtasks-list">
					{#each subtasks as subtask, index (subtask.id)}
						{@const context = parseSubtaskContext(subtask)}
						<div
							class="subtask-card"
							class:recommended={index === 0}
							role="button"
							tabindex="0"
							onclick={() => handleSubtaskClick(subtask.id)}
							onkeydown={(e) => e.key === 'Enter' && handleSubtaskClick(subtask.id)}
						>
							<div class="subtask-number">{index + 1}</div>
							<div class="subtask-content">
								<div class="subtask-header">
									<h4 class="subtask-title">{subtask.title}</h4>
									{#if index === 0}
										<span class="recommended-badge">Start here</span>
									{/if}
								</div>
								{#if context}
									<p class="subtask-why">{context.whyImportant}</p>
									<p class="subtask-done">
										<span class="done-label">Done when:</span>
										{context.definitionOfDone}
									</p>
								{/if}
							</div>
							<div class="subtask-arrow">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
								</svg>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="actions">
				<button type="button" class="action-btn primary" onclick={handleStartFirst}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
						<path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					Start First Subtask
				</button>
				{#if onViewDashboard}
					<button type="button" class="action-btn secondary" onclick={onViewDashboard}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
						</svg>
						View Dashboard
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.confirmation-wrapper {
		flex: 1;
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		height: 100%;
		padding: 2rem;
		overflow-y: auto;
	}

	/* Loading State */
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 300px;
		text-align: center;
	}

	.loading-spinner {
		width: 64px;
		height: 64px;
		margin-bottom: 1.5rem;
		color: var(--task-color, #3b82f6);
	}

	.spinner {
		width: 100%;
		height: 100%;
		animation: rotate 1.5s linear infinite;
	}

	.spinner circle {
		stroke-dasharray: 100;
		stroke-dashoffset: 40;
		animation: dash 1.5s ease-in-out infinite;
	}

	@keyframes rotate {
		100% {
			transform: rotate(360deg);
		}
	}

	@keyframes dash {
		0% {
			stroke-dashoffset: 100;
		}
		50% {
			stroke-dashoffset: 25;
		}
		100% {
			stroke-dashoffset: 100;
		}
	}

	.loading-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
		margin: 0 0 0.5rem 0;
	}

	.loading-subtitle {
		font-size: 0.9375rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	/* Success Content */
	.confirmation-content {
		width: 100%;
		max-width: 700px;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Success Hero */
	.success-hero {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 2rem;
		background: rgba(34, 197, 94, 0.08);
		border: 1px solid rgba(34, 197, 94, 0.2);
		border-radius: 1rem;
	}

	.success-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		background: rgba(34, 197, 94, 0.15);
		border-radius: 50%;
		flex-shrink: 0;
	}

	.success-icon svg {
		width: 32px;
		height: 32px;
		color: #22c55e;
	}

	.hero-content {
		flex: 1;
	}

	.hero-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
		margin: 0 0 0.5rem 0;
	}

	.hero-subtitle {
		font-size: 0.9375rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0;
	}

	/* Synopsis Card */
	.synopsis-card {
		padding: 1.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.875rem;
	}

	.synopsis-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9375rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 1rem 0;
	}

	.synopsis-header svg {
		width: 1.125rem;
		height: 1.125rem;
		color: var(--task-color);
	}

	.synopsis-reasoning {
		font-size: 0.9375rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.6;
		margin: 0 0 1rem 0;
	}

	.synopsis-getting-started {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 0.5rem;
	}

	.getting-started-label {
		font-weight: 600;
		color: rgba(255, 255, 255, 0.8);
	}

	/* Subtasks Section */
	.subtasks-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section-title {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	.subtasks-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.subtask-card {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.subtask-card:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.12);
		transform: translateY(-1px);
	}

	.subtask-card.recommended {
		background: color-mix(in srgb, var(--task-color) 8%, transparent);
		border-color: color-mix(in srgb, var(--task-color) 25%, transparent);
	}

	.subtask-card.recommended:hover {
		background: color-mix(in srgb, var(--task-color) 12%, transparent);
		border-color: color-mix(in srgb, var(--task-color) 35%, transparent);
	}

	.subtask-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.05);
		border-radius: 50%;
		flex-shrink: 0;
	}

	.subtask-card.recommended .subtask-number {
		color: var(--task-color);
		background: color-mix(in srgb, var(--task-color) 15%, transparent);
	}

	.subtask-content {
		flex: 1;
		min-width: 0;
	}

	.subtask-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.375rem;
	}

	.subtask-title {
		font-size: 0.9375rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		margin: 0;
	}

	.recommended-badge {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.1875rem 0.5rem;
		color: var(--task-color);
		background: color-mix(in srgb, var(--task-color) 15%, transparent);
		border-radius: 0.25rem;
		white-space: nowrap;
	}

	.subtask-why {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.55);
		margin: 0 0 0.25rem 0;
		line-height: 1.4;
	}

	.subtask-done {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.45);
		margin: 0;
	}

	.done-label {
		font-weight: 600;
		color: rgba(255, 255, 255, 0.55);
	}

	.subtask-arrow {
		flex-shrink: 0;
		color: rgba(255, 255, 255, 0.25);
		transition: all 0.15s ease;
		margin-top: 0.25rem;
	}

	.subtask-arrow svg {
		width: 1rem;
		height: 1rem;
	}

	.subtask-card:hover .subtask-arrow {
		color: rgba(255, 255, 255, 0.5);
		transform: translateX(2px);
	}

	.subtask-card.recommended .subtask-arrow {
		color: color-mix(in srgb, var(--task-color) 50%, transparent);
	}

	.subtask-card.recommended:hover .subtask-arrow {
		color: var(--task-color);
	}

	/* Actions */
	.actions {
		display: flex;
		gap: 0.75rem;
		padding-top: 0.5rem;
	}

	.action-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		font-size: 0.9375rem;
		font-weight: 500;
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-btn svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.action-btn.primary {
		color: white;
		background: var(--task-color);
		border: none;
	}

	.action-btn.primary:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
		box-shadow: 0 8px 24px color-mix(in srgb, var(--task-color) 30%, transparent);
	}

	.action-btn.secondary {
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.action-btn.secondary:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.15);
	}

	/* Scrollbar */
	.confirmation-wrapper::-webkit-scrollbar {
		width: 6px;
	}

	.confirmation-wrapper::-webkit-scrollbar-track {
		background: transparent;
	}

	.confirmation-wrapper::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.confirmation-wrapper::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
