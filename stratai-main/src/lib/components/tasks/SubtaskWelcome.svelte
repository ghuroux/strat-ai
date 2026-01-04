<script lang="ts">
	/**
	 * Subtask Welcome Component
	 *
	 * Displays a contextual welcome message when entering a subtask chat.
	 * Provides context from the parent task and planning conversation
	 * to help the user understand where to start.
	 *
	 * When rich context is available (from Plan Mode), shows:
	 * - Why this subtask matters
	 * - Definition of done
	 * - Practical hints
	 */
	import { fly } from 'svelte/transition';
	import type { Task, SubtaskContext } from '$lib/types/tasks';
	import {
		generateSubtaskWelcome,
		getQuickActions,
		type SubtaskWelcomeData
	} from '$lib/utils/subtask-welcome';

	interface Props {
		subtask: Task;
		parentTask: Task;
		planningContext?: string;
		onStartWorking: () => void;
		onSeeParent: () => void;
		onDismiss: () => void;
	}

	let { subtask, parentTask, planningContext, onStartWorking, onSeeParent, onDismiss }: Props =
		$props();

	// Parse rich context from subtask.contextSummary
	let richContext = $derived.by((): SubtaskContext | null => {
		if (!subtask.contextSummary) return null;
		try {
			return JSON.parse(subtask.contextSummary) as SubtaskContext;
		} catch {
			return null;
		}
	});

	// Has rich context available?
	let hasRichContext = $derived(richContext !== null);

	// Generate welcome data (fallback when no rich context)
	let welcome = $derived(generateSubtaskWelcome(subtask, parentTask, planningContext));
	let quickActions = $derived(getQuickActions(subtask));

	// Handle quick action click - prepopulate the input
	function handleQuickAction(action: string) {
		// Dispatch event to prepopulate chat input
		const event = new CustomEvent('prepopulate-input', {
			detail: { text: action },
			bubbles: true
		});
		document.dispatchEvent(event);
		onStartWorking();
	}
</script>

<div class="subtask-welcome" in:fly={{ y: 20, duration: 300 }}>
	<div class="welcome-card">
		<!-- AI Avatar -->
		<div class="avatar-section">
			<div class="avatar">
				<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
					/>
				</svg>
			</div>
			<div class="avatar-label">
				<span class="label-text">StratAI</span>
				<span class="label-badge">Subtask Context</span>
			</div>
		</div>

		<!-- Welcome Message -->
		<div class="message-content">
			{#if hasRichContext && richContext}
				<!-- Rich Context from Plan Mode -->
				<div class="rich-context">
					<div class="context-block">
						<span class="context-label">Why this matters</span>
						<p class="context-text">{richContext.whyImportant}</p>
					</div>

					<div class="context-block">
						<span class="context-label">Done when</span>
						<p class="context-text">{richContext.definitionOfDone}</p>
					</div>

					{#if richContext.hints && richContext.hints.length > 0}
						<div class="context-block">
							<span class="context-label">Tips to get started</span>
							<ul class="hints-list">
								{#each richContext.hints as hint}
									<li>{hint}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Fallback: Generated welcome message -->
				<p class="greeting">{welcome.greeting}</p>
				<p class="context-hint">{welcome.contextHint}</p>
				<p class="suggested-start">{welcome.suggestedStart}</p>
			{/if}
		</div>

		<!-- Quick Actions -->
		<div class="quick-actions">
			<span class="quick-label">Quick start:</span>
			<div class="action-chips">
				{#each quickActions as action}
					<button type="button" class="action-chip" onclick={() => handleQuickAction(action)}>
						{action}
					</button>
				{/each}
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="action-buttons">
			<button
				type="button"
				class="btn-primary"
				style="background: var(--task-color, var(--space-accent, #3b82f6));"
				onclick={onStartWorking}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
					/>
				</svg>
				Start working
			</button>

			<button type="button" class="btn-secondary" onclick={onSeeParent}>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
				See parent task
			</button>
		</div>

		<!-- Dismiss Link -->
		<button type="button" class="dismiss-link" onclick={onDismiss}> Skip intro </button>
	</div>
</div>

<style>
	.subtask-welcome {
		display: flex;
		justify-content: center;
		padding: 2rem 1rem;
	}

	.welcome-card {
		max-width: 28rem;
		width: 100%;
		padding: 1.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1rem;
	}

	/* Avatar Section */
	.avatar-section {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.avatar {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.625rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--gradient-primary, linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%));
	}

	.avatar-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.label-text {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
	}

	.label-badge {
		padding: 0.125rem 0.5rem;
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		border-radius: 0.25rem;
		background: rgba(139, 92, 246, 0.2);
		color: #a78bfa;
	}

	/* Message Content */
	.message-content {
		margin-bottom: 1.25rem;
	}

	.greeting {
		font-size: 1rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 0.75rem 0;
		line-height: 1.5;
	}

	.context-hint {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0 0 0.75rem 0;
		line-height: 1.5;
	}

	.suggested-start {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
		line-height: 1.5;
	}

	/* Rich Context (from Plan Mode) */
	.rich-context {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.context-block {
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 0.5rem;
		border-left: 2px solid var(--task-color, var(--space-accent, #3b82f6));
	}

	.context-label {
		display: block;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--task-color, var(--space-accent, #3b82f6));
		margin-bottom: 0.375rem;
	}

	.context-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
		margin: 0;
		line-height: 1.5;
	}

	.hints-list {
		margin: 0;
		padding-left: 1.25rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.6;
	}

	.hints-list li {
		margin-bottom: 0.25rem;
	}

	.hints-list li:last-child {
		margin-bottom: 0;
	}

	/* Quick Actions */
	.quick-actions {
		margin-bottom: 1.25rem;
	}

	.quick-label {
		display: block;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		margin-bottom: 0.5rem;
	}

	.action-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.action-chip {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-chip:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	/* Action Buttons */
	.action-buttons {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.btn-primary {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		border: none;
		border-radius: 0.625rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-primary:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	.btn-secondary {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.625rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.15);
	}

	/* Dismiss Link */
	.dismiss-link {
		display: block;
		width: 100%;
		text-align: center;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.dismiss-link:hover {
		color: rgba(255, 255, 255, 0.6);
	}
</style>
