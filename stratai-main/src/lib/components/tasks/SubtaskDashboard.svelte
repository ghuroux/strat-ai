<script lang="ts">
	/**
	 * Subtask Dashboard Component
	 *
	 * Centered, inspiring view for parent tasks with subtasks.
	 * Features:
	 * - Hero progress section with ring and motivational greeting
	 * - Prominent "Next Up" card with expandable context
	 * - Two-column grid for remaining subtasks
	 * - Collapsed completed section
	 * - Action buttons at bottom
	 */
	import { goto } from '$app/navigation';
	import { slide } from 'svelte/transition';
	import type { Task, SubtaskContext } from '$lib/types/tasks';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import ProgressRing from '$lib/components/ui/ProgressRing.svelte';

	interface Props {
		task: Task;
		subtasks: Task[];
		spaceParam: string;
		onAddSubtask?: () => void;
		onCompleteTask?: () => void;
	}

	let { task, subtasks, spaceParam, onAddSubtask, onCompleteTask }: Props = $props();

	// Separate active and completed subtasks
	let activeSubtasks = $derived(subtasks.filter((s) => s.status !== 'completed'));
	let completedSubtasks = $derived(subtasks.filter((s) => s.status === 'completed'));

	// Progress calculations
	let completedCount = $derived(completedSubtasks.length);
	let totalCount = $derived(subtasks.length);
	let progressPercent = $derived(totalCount > 0 ? (completedCount / totalCount) * 100 : 0);

	// First incomplete subtask (the "next up")
	let nextSubtask = $derived(activeSubtasks[0]);

	// Remaining subtasks (excluding next up)
	let remainingSubtasks = $derived(activeSubtasks.slice(1));

	// Show/hide completed section (expanded by default for visibility)
	let showCompleted = $state(true);

	// Expandable cards state
	let expandedCards = $state(new Set<string>());

	// Motivational greeting based on progress
	let greeting = $derived.by(() => {
		if (completedCount === 0) {
			return "Ready to dive in?";
		} else if (progressPercent < 50) {
			return `Great start! ${completedCount} down, ${activeSubtasks.length} to go.`;
		} else if (progressPercent < 100) {
			return "Almost there! Keep going.";
		} else {
			return "All done! Ready to complete?";
		}
	});

	// Parse subtask context from JSON
	function parseContext(subtask: Task): SubtaskContext | null {
		if (!subtask.contextSummary) return null;
		try {
			return JSON.parse(subtask.contextSummary) as SubtaskContext;
		} catch {
			return null;
		}
	}

	// Toggle card expansion
	function toggleCardExpanded(e: Event, subtaskId: string) {
		e.stopPropagation();
		if (expandedCards.has(subtaskId)) {
			expandedCards.delete(subtaskId);
		} else {
			expandedCards.add(subtaskId);
		}
		expandedCards = new Set(expandedCards); // Force reactivity
	}

	// Check if subtask has context
	function hasContext(subtask: Task): boolean {
		return !!subtask.contextSummary;
	}

	// Navigate to subtask
	function handleSubtaskClick(subtaskId: string) {
		goto(`/spaces/${spaceParam}/task/${subtaskId}`);
	}

	// Quick complete a subtask
	async function handleQuickComplete(e: Event, subtaskId: string) {
		e.stopPropagation();
		await taskStore.completeTask(subtaskId);
	}

	// Reopen a completed subtask
	async function handleReopenSubtask(e: Event, subtaskId: string) {
		e.stopPropagation();
		await taskStore.reopenTask(subtaskId);
	}

	// Format relative time for completion timestamps
	function formatRelativeTime(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}
</script>

<div class="dashboard-wrapper">
	<div class="subtask-dashboard" style="--task-color: {task.color};">
		<!-- Progress Hero -->
		<div class="progress-hero">
			<ProgressRing
				completed={completedCount}
				total={totalCount}
				size={100}
				strokeWidth={8}
				color={progressPercent === 100 ? '#22c55e' : task.color}
			/>
			<div class="hero-content">
				<h2 class="hero-greeting">{greeting}</h2>
				<p class="hero-detail">
					{completedCount} of {totalCount} subtask{totalCount === 1 ? '' : 's'} complete
				</p>
				{#if progressPercent === 100 && onCompleteTask}
					<button type="button" class="hero-complete-btn" onclick={onCompleteTask}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
						</svg>
						Complete Task
					</button>
				{/if}
			</div>
		</div>

		<!-- Next Up Card (prominent) -->
		{#if nextSubtask}
			{@const nextContext = parseContext(nextSubtask)}
			{@const nextIsExpanded = expandedCards.has(nextSubtask.id)}
			<div class="next-up-section">
				<span class="section-label">Next up</span>
				<div class="next-up-wrapper">
					<div
						class="next-up-card"
						class:expanded={nextIsExpanded && hasContext(nextSubtask)}
						role="button"
						tabindex="0"
						onclick={() => handleSubtaskClick(nextSubtask.id)}
						onkeydown={(e) => e.key === 'Enter' && handleSubtaskClick(nextSubtask.id)}
					>
						<button
							type="button"
							class="quick-complete-btn"
							onclick={(e) => handleQuickComplete(e, nextSubtask.id)}
							title="Mark complete"
						>
							<div class="checkbox-icon"></div>
						</button>
						<div class="next-up-content">
							<h3 class="next-up-title">{nextSubtask.title}</h3>
							<span class="next-up-type">
								{nextSubtask.subtaskType === 'action' ? 'Action item' : 'Conversation'}
							</span>
						</div>
						{#if hasContext(nextSubtask)}
							<button
								type="button"
								class="expand-btn"
								class:expanded={nextIsExpanded}
								onclick={(e) => toggleCardExpanded(e, nextSubtask.id)}
								title={nextIsExpanded ? 'Hide context' : 'Show context'}
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
								</svg>
							</button>
						{:else}
							<div class="next-up-arrow">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
								</svg>
							</div>
						{/if}
					</div>

					<!-- Expanded Context for Next Up -->
					{#if nextIsExpanded && nextContext}
						<div class="context-panel" transition:slide={{ duration: 200 }}>
							<div class="context-section">
								<span class="context-label">Why this matters</span>
								<p class="context-text">{nextContext.whyImportant}</p>
							</div>
							<div class="context-section">
								<span class="context-label">Done when</span>
								<p class="context-text">{nextContext.definitionOfDone}</p>
							</div>
							{#if nextContext.hints && nextContext.hints.length > 0}
								<div class="context-section">
									<span class="context-label">Tips</span>
									<ul class="context-hints">
										{#each nextContext.hints as hint}
											<li>{hint}</li>
										{/each}
									</ul>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Remaining Subtasks -->
		{#if remainingSubtasks.length > 0}
			<div class="remaining-section">
				<span class="section-label">Remaining ({remainingSubtasks.length})</span>
				<div class="subtasks-grid">
					{#each remainingSubtasks as subtask (subtask.id)}
						{@const subContext = parseContext(subtask)}
						{@const isExpanded = expandedCards.has(subtask.id)}
						<div class="subtask-card-wrapper">
							<div
								class="subtask-card"
								class:expanded={isExpanded && hasContext(subtask)}
								role="button"
								tabindex="0"
								onclick={() => handleSubtaskClick(subtask.id)}
								onkeydown={(e) => e.key === 'Enter' && handleSubtaskClick(subtask.id)}
							>
								<button
									type="button"
									class="quick-complete-btn-small"
									onclick={(e) => handleQuickComplete(e, subtask.id)}
									title="Mark complete"
								>
									<div class="checkbox-small"></div>
								</button>
								<span class="card-title">{subtask.title}</span>
								{#if hasContext(subtask)}
									<button
										type="button"
										class="expand-btn-small"
										class:expanded={isExpanded}
										onclick={(e) => toggleCardExpanded(e, subtask.id)}
										title={isExpanded ? 'Hide context' : 'Show context'}
									>
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
										</svg>
									</button>
								{:else}
									<svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
									</svg>
								{/if}
							</div>

							<!-- Expanded Context for Remaining -->
							{#if isExpanded && subContext}
								<div class="context-panel-small" transition:slide={{ duration: 200 }}>
									<p class="context-why">{subContext.whyImportant}</p>
									<p class="context-done"><strong>Done when:</strong> {subContext.definitionOfDone}</p>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Add Subtask -->
		{#if onAddSubtask}
			<button type="button" class="add-subtask-button" onclick={onAddSubtask}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
				</svg>
				Add subtask
			</button>
		{/if}

		<!-- Completed Section (collapsed) -->
		{#if completedSubtasks.length > 0}
			<div class="completed-section">
				<button
					type="button"
					class="completed-toggle"
					onclick={() => (showCompleted = !showCompleted)}
				>
					<svg
						class="toggle-chevron"
						class:rotated={showCompleted}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
					</svg>
					<span>Completed ({completedSubtasks.length})</span>
				</button>

				{#if showCompleted}
					<div class="completed-list" transition:slide={{ duration: 200 }}>
						{#each completedSubtasks as subtask (subtask.id)}
							<div class="completed-item">
								<div class="completed-check">
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								</div>
								<span class="completed-title">{subtask.title}</span>
								{#if subtask.completedAt}
									<span class="completed-time">{formatRelativeTime(new Date(subtask.completedAt))}</span>
								{/if}
								<button
									type="button"
									class="reopen-btn"
									onclick={(e) => handleReopenSubtask(e, subtask.id)}
									title="Reopen subtask"
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
									</svg>
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Footer Actions -->
		<div class="dashboard-footer">
			<!-- TODO: Add "View planning history" button here to show read-only version of task planning conversation -->

			{#if onCompleteTask && progressPercent < 100}
				<button type="button" class="footer-btn secondary" onclick={onCompleteTask}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
					Complete Task
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.dashboard-wrapper {
		flex: 1;
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		height: 100%;
		padding: 2rem;
		overflow-y: auto;
	}

	.subtask-dashboard {
		width: 100%;
		max-width: 700px;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Progress Hero */
	.progress-hero {
		display: flex;
		align-items: center;
		gap: 2rem;
		padding: 2rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1rem;
	}

	.hero-content {
		flex: 1;
	}

	.hero-greeting {
		font-size: 1.5rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
		margin: 0 0 0.5rem 0;
	}

	.hero-detail {
		font-size: 0.9375rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.hero-complete-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.75rem 1.25rem;
		font-size: 0.9375rem;
		font-weight: 500;
		color: white;
		background: #22c55e;
		border: none;
		border-radius: 0.625rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.hero-complete-btn:hover {
		background: #16a34a;
		transform: translateY(-1px);
	}

	.hero-complete-btn svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	/* Section Labels */
	.section-label {
		display: block;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		margin-bottom: 0.75rem;
	}

	/* Next Up Section */
	.next-up-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		padding: 1.25rem 1.5rem;
		background: color-mix(in srgb, var(--task-color) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--task-color) 30%, transparent);
		border-radius: 0.875rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
	}

	.next-up-card:hover {
		background: color-mix(in srgb, var(--task-color) 15%, transparent);
		border-color: color-mix(in srgb, var(--task-color) 40%, transparent);
		transform: translateY(-2px);
		box-shadow: 0 8px 24px color-mix(in srgb, var(--task-color) 15%, transparent);
	}

	.next-up-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		background: color-mix(in srgb, var(--task-color) 20%, transparent);
		border-radius: 0.75rem;
		flex-shrink: 0;
	}

	.next-up-icon svg {
		width: 1.5rem;
		height: 1.5rem;
		color: var(--task-color);
	}

	.checkbox-icon {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid var(--task-color);
		border-radius: 0.25rem;
		transition: all 0.15s ease;
	}

	.quick-complete-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		background: none;
		border: none;
		cursor: pointer;
	}

	.quick-complete-btn:hover .checkbox-icon {
		background: color-mix(in srgb, var(--task-color) 20%, transparent);
		border-color: var(--task-color);
	}

	.next-up-content {
		flex: 1;
		min-width: 0;
	}

	.next-up-title {
		font-size: 1.0625rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.95);
		margin: 0 0 0.25rem 0;
	}

	.next-up-type {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.next-up-arrow {
		flex-shrink: 0;
		color: var(--task-color);
		opacity: 0.6;
		transition: all 0.15s ease;
	}

	.next-up-arrow svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.next-up-card:hover .next-up-arrow {
		opacity: 1;
		transform: translateX(4px);
	}

	/* Remaining Subtasks List */
	.subtasks-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.subtask-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.625rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
	}

	.subtask-card:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.12);
		transform: translateY(-1px);
	}

	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		flex-shrink: 0;
	}

	.card-icon svg {
		width: 1.125rem;
		height: 1.125rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.checkbox-small {
		width: 1rem;
		height: 1rem;
		border: 1.5px solid rgba(255, 255, 255, 0.3);
		border-radius: 0.1875rem;
		transition: all 0.15s ease;
	}

	.quick-complete-btn-small {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		background: none;
		border: none;
		cursor: pointer;
	}

	.quick-complete-btn-small:hover .checkbox-small {
		background: rgba(34, 197, 94, 0.15);
		border-color: #22c55e;
	}

	.card-title {
		flex: 1;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.card-arrow {
		width: 0.875rem;
		height: 0.875rem;
		color: rgba(255, 255, 255, 0.25);
		flex-shrink: 0;
		opacity: 0;
		transition: all 0.15s ease;
	}

	.subtask-card:hover .card-arrow {
		opacity: 1;
		transform: translateX(2px);
	}

	/* Add Subtask Button */
	.add-subtask-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		background: transparent;
		border: 1px dashed rgba(255, 255, 255, 0.15);
		border-radius: 0.625rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.add-subtask-button:hover {
		color: rgba(255, 255, 255, 0.8);
		border-color: rgba(255, 255, 255, 0.25);
		background: rgba(255, 255, 255, 0.02);
	}

	.add-subtask-button svg {
		width: 1rem;
		height: 1rem;
	}

	/* Completed Section */
	.completed-section {
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.completed-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.4);
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.completed-toggle:hover {
		color: rgba(255, 255, 255, 0.6);
	}

	.toggle-chevron {
		width: 0.875rem;
		height: 0.875rem;
		transition: transform 0.2s ease;
	}

	.toggle-chevron.rotated {
		transform: rotate(90deg);
	}

	.completed-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: 0.5rem;
		padding-left: 0.25rem;
	}

	.completed-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.75rem;
		opacity: 0.5;
	}

	.completed-check {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.125rem;
		height: 1.125rem;
		background: #22c55e;
		border-radius: 0.25rem;
		flex-shrink: 0;
	}

	.completed-check svg {
		width: 0.75rem;
		height: 0.75rem;
		color: white;
	}

	.completed-title {
		flex: 1;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
		text-decoration: line-through;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.completed-time {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.35);
		flex-shrink: 0;
	}

	.reopen-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		opacity: 0;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.reopen-btn svg {
		width: 0.875rem;
		height: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.completed-item:hover .reopen-btn {
		opacity: 1;
	}

	.reopen-btn:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.reopen-btn:hover svg {
		color: rgba(255, 255, 255, 0.7);
	}

	/* Footer */
	.dashboard-footer {
		display: flex;
		gap: 0.75rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.footer-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.footer-btn.secondary {
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.footer-btn.secondary:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.footer-btn svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	/* Expandable Context */
	.next-up-wrapper,
	.subtask-card-wrapper {
		display: flex;
		flex-direction: column;
	}

	.expand-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		background: color-mix(in srgb, var(--task-color) 15%, transparent);
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.expand-btn svg {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--task-color);
		transition: transform 0.2s ease;
	}

	.expand-btn.expanded svg {
		transform: rotate(180deg);
	}

	.expand-btn:hover {
		background: color-mix(in srgb, var(--task-color) 25%, transparent);
	}

	.expand-btn-small {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		background: rgba(255, 255, 255, 0.05);
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.expand-btn-small svg {
		width: 0.875rem;
		height: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		transition: transform 0.2s ease;
	}

	.expand-btn-small.expanded svg {
		transform: rotate(180deg);
	}

	.expand-btn-small:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.expand-btn-small:hover svg {
		color: rgba(255, 255, 255, 0.8);
	}

	.context-panel {
		padding: 1.25rem 1.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid color-mix(in srgb, var(--task-color) 15%, transparent);
		border-top: none;
		border-radius: 0 0 0.875rem 0.875rem;
	}

	.context-section {
		margin-bottom: 1rem;
	}

	.context-section:last-child {
		margin-bottom: 0;
	}

	.context-label {
		display: block;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--task-color);
		margin-bottom: 0.375rem;
	}

	.context-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.75);
		line-height: 1.5;
		margin: 0;
	}

	.context-hints {
		margin: 0;
		padding-left: 1.25rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.context-hints li {
		margin-bottom: 0.25rem;
	}

	.context-hints li:last-child {
		margin-bottom: 0;
	}

	.context-panel-small {
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-top: none;
		border-radius: 0 0 0.625rem 0.625rem;
	}

	.context-why {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.6);
		line-height: 1.4;
		margin: 0 0 0.375rem 0;
	}

	.context-done {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.context-done strong {
		color: rgba(255, 255, 255, 0.6);
	}

	/* Adjust card radius when expanded */
	.next-up-card.expanded {
		border-radius: 0.875rem 0.875rem 0 0;
	}

	.subtask-card.expanded {
		border-radius: 0.625rem 0.625rem 0 0;
	}

	/* Scrollbar */
	.dashboard-wrapper::-webkit-scrollbar {
		width: 6px;
	}

	.dashboard-wrapper::-webkit-scrollbar-track {
		background: transparent;
	}

	.dashboard-wrapper::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.dashboard-wrapper::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
