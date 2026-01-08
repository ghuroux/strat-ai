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
	import { generateSubtaskWelcome, type SubtaskWelcomeData } from '$lib/utils/subtask-welcome';
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

	// Contextual quick starts based on subtask title and parent context
	let quickStarts = $derived(
		getQuickStarts({
			title: subtask.title,
			description: subtask.description,
			parentTaskTitle: parentTask.title,
			isSubtask: true,
			richContext: subtask.richContext
		})
	);

	// Handle quick start click - prepopulate the input with full prompt
	function handleQuickStart(prompt: string) {
		// Dispatch event to prepopulate chat input
		const event = new CustomEvent('prepopulate-input', {
			detail: { text: prompt },
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
					<div class="context-section">
						<span class="context-label">Why this matters</span>
						<p class="context-text">{richContext.whyImportant}</p>
					</div>

					<div class="context-section">
						<span class="context-label">Done when</span>
						<p class="context-text">{richContext.definitionOfDone}</p>
					</div>

					{#if richContext.hints && richContext.hints.length > 0}
						<div class="context-section">
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

		<!-- Quick Starts -->
		<div class="quick-actions">
			<span class="quick-label">Quick start:</span>
			<div class="action-chips">
				{#each quickStarts as qs}
					<button type="button" class="action-chip" onclick={() => handleQuickStart(qs.prompt)}>
						<svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d={ICON_PATHS[qs.icon]} />
						</svg>
						{qs.label}
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

	/* Rich Context (from Plan Mode) - Unified card */
	.rich-context {
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 0.5rem;
		border-left: 2px solid var(--task-color, var(--space-accent, #3b82f6));
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
		padding-left: 0;
		list-style: none;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.6;
	}

	.hints-list li {
		position: relative;
		padding-left: 1rem;
		margin-bottom: 0.25rem;
	}

	.hints-list li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.55em;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--task-color, var(--space-accent, #3b82f6));
		opacity: 0.7;
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
		display: flex;
		align-items: center;
		gap: 0.375rem;
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

	.action-icon {
		width: 0.875rem;
		height: 0.875rem;
		flex-shrink: 0;
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
