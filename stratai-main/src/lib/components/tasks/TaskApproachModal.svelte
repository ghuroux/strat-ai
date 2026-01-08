<script lang="ts">
	/**
	 * Task Approach Modal
	 *
	 * Shown on first visit to a parent task (no subtasks, no conversations).
	 * Presents two choices:
	 * - Work directly: Start working with AI, multiple conversations, context panel
	 * - Break into subtasks: Enter planning mode to decompose the task
	 *
	 * This educates users about the system's capabilities while capturing intent.
	 */

	import { fade, fly } from 'svelte/transition';

	interface Props {
		open: boolean;
		taskTitle: string;
		taskColor?: string;
		onChooseWork: () => void;
		onChoosePlan: () => void;
	}

	let { open, taskTitle, taskColor = '#3b82f6', onChooseWork, onChoosePlan }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		// Don't allow escape to close - user must make a choice
		// This is intentional to ensure users understand the options
	}

	function handleBackdropClick(e: MouseEvent) {
		// Don't close on backdrop click - user must make a choice
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="modal-backdrop"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="approach-modal-title"
	>
		<div
			class="modal-container"
			style="--task-color: {taskColor}"
			transition:fly={{ y: 20, duration: 200 }}
			onclick={(e) => e.stopPropagation()}
		>
			<header class="modal-header">
				<h2 id="approach-modal-title" class="modal-title">
					How do you want to approach this?
				</h2>
				<p class="task-name">"{taskTitle}"</p>
			</header>

			<div class="modal-content">
				<div class="options-grid">
					<!-- Work Directly Option -->
					<button class="option-card" onclick={onChooseWork}>
						<div class="option-icon work-icon">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
								/>
							</svg>
						</div>
						<h3 class="option-title">Work directly</h3>
						<p class="option-description">
							Start working with AI assistance. Have multiple conversations and add context
							documents.
						</p>
					</button>

					<!-- Break into Subtasks Option -->
					<button class="option-card" onclick={onChoosePlan}>
						<div class="option-icon plan-icon">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
								/>
							</svg>
						</div>
						<h3 class="option-title">Break into subtasks</h3>
						<p class="option-description">
							Let AI help you break this into smaller, manageable pieces.
						</p>
					</button>
				</div>
			</div>

			<footer class="modal-footer">
				<p class="hint-text">You can always change your approach later</p>
			</footer>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
	}

	.modal-container {
		width: 100%;
		max-width: 32rem;
		background: rgb(23, 23, 23);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}

	.modal-header {
		padding: 1.5rem 1.5rem 1rem;
		text-align: center;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.modal-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #fff;
		margin: 0 0 0.75rem;
	}

	.task-name {
		font-size: 0.9375rem;
		color: var(--task-color);
		margin: 0;
		font-style: italic;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.modal-content {
		padding: 1.5rem;
	}

	.options-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.option-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1.5rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: center;
	}

	.option-card:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: var(--task-color);
		transform: translateY(-2px);
	}

	.option-card:focus {
		outline: none;
		border-color: var(--task-color);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--task-color) 20%, transparent);
	}

	.option-icon {
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.75rem;
		margin-bottom: 1rem;
	}

	.option-icon svg {
		width: 1.75rem;
		height: 1.75rem;
	}

	.work-icon {
		background: rgba(59, 130, 246, 0.15);
		color: #60a5fa;
	}

	.plan-icon {
		background: rgba(34, 197, 94, 0.15);
		color: #4ade80;
	}

	.option-title {
		font-size: 1rem;
		font-weight: 600;
		color: #fff;
		margin: 0 0 0.5rem;
	}

	.option-description {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0;
		line-height: 1.4;
	}

	.modal-footer {
		padding: 1rem 1.5rem 1.25rem;
		text-align: center;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.hint-text {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	/* Responsive: Stack on mobile */
	@media (max-width: 480px) {
		.options-grid {
			grid-template-columns: 1fr;
		}

		.option-card {
			padding: 1.25rem 1rem;
		}
	}
</style>
