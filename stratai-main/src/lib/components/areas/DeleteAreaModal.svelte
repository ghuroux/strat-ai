<script lang="ts">
	/**
	 * DeleteAreaModal - Confirmation modal for deleting an area
	 *
	 * Presents two options:
	 * 1. Keep content - Conversations move to General, tasks unlinked
	 * 2. Delete everything - All conversations and tasks deleted
	 */
	import { fly, fade } from 'svelte/transition';
	import type { Area } from '$lib/types/areas';

	interface Props {
		open: boolean;
		area: Area | null;
		conversationCount: number;
		taskCount: number;
		spaceColor?: string;
		onClose: () => void;
		onConfirm: (deleteContent: boolean) => Promise<void>;
	}

	let {
		open,
		area,
		conversationCount,
		taskCount,
		spaceColor = '#3b82f6',
		onClose,
		onConfirm
	}: Props = $props();

	// Selected option: false = keep content, true = delete all
	let deleteContent = $state(false);
	let isSubmitting = $state(false);

	// Reset when modal opens
	$effect(() => {
		if (open) {
			deleteContent = false;
			isSubmitting = false;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isSubmitting) {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isSubmitting) {
			onClose();
		}
	}

	async function handleConfirm() {
		if (!area || isSubmitting) return;
		isSubmitting = true;
		try {
			await onConfirm(deleteContent);
		} finally {
			isSubmitting = false;
		}
	}

	// Derived: has any content?
	let hasContent = $derived(conversationCount > 0 || taskCount > 0);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && area}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
	>
		<!-- Modal -->
		<div
			class="modal-container"
			style="--space-color: {spaceColor}"
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<!-- Header -->
			<header class="modal-header">
				<div class="header-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
					</svg>
				</div>
				<h2 id="modal-title" class="modal-title">Delete "{area.name}"?</h2>
			</header>

			<!-- Content -->
			<div class="modal-content">
				{#if hasContent}
					<!-- Content summary -->
					<div class="content-summary">
						<p class="summary-label">This area contains:</p>
						<ul class="summary-list">
							{#if conversationCount > 0}
								<li>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
									</svg>
									<span>{conversationCount} conversation{conversationCount !== 1 ? 's' : ''}</span>
								</li>
							{/if}
							{#if taskCount > 0}
								<li>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span>{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
								</li>
							{/if}
						</ul>
					</div>

					<!-- Options -->
					<div class="options">
						<button
							type="button"
							class="option"
							class:selected={!deleteContent}
							onclick={() => deleteContent = false}
							disabled={isSubmitting}
						>
							<div class="option-radio">
								{#if !deleteContent}
									<div class="radio-dot"></div>
								{/if}
							</div>
							<div class="option-content">
								<div class="option-header">
									<span class="option-title">Keep content</span>
									<span class="option-badge recommended">Recommended</span>
								</div>
								<p class="option-description">
									Conversations will be moved to the General area.
									Tasks will be unlinked from this area.
								</p>
							</div>
						</button>

						<button
							type="button"
							class="option option-danger"
							class:selected={deleteContent}
							onclick={() => deleteContent = true}
							disabled={isSubmitting}
						>
							<div class="option-radio">
								{#if deleteContent}
									<div class="radio-dot danger"></div>
								{/if}
							</div>
							<div class="option-content">
								<div class="option-header">
									<span class="option-title">Delete all content</span>
								</div>
								<p class="option-description">
									Permanently delete all conversations and tasks in this area.
									This cannot be undone.
								</p>
							</div>
						</button>
					</div>
				{:else}
					<!-- No content - simple confirmation -->
					<p class="empty-message">
						This area has no conversations or tasks. It will be permanently deleted.
					</p>
				{/if}
			</div>

			<!-- Actions -->
			<footer class="modal-actions">
				<button
					type="button"
					class="btn-secondary"
					onclick={onClose}
					disabled={isSubmitting}
				>
					Cancel
				</button>
				<button
					type="button"
					class="btn-danger"
					onclick={handleConfirm}
					disabled={isSubmitting}
				>
					{#if isSubmitting}
						Deleting...
					{:else}
						Delete Area
					{/if}
				</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.modal-container {
		width: 100%;
		max-width: 28rem;
		background: rgb(23, 23, 23);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: rgba(239, 68, 68, 0.15);
		border-radius: 0.5rem;
		color: #ef4444;
		flex-shrink: 0;
	}

	.header-icon svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.modal-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #fff;
		margin: 0;
	}

	.modal-content {
		padding: 1.5rem;
	}

	/* Content summary */
	.content-summary {
		margin-bottom: 1.25rem;
	}

	.summary-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
		margin: 0 0 0.5rem 0;
	}

	.summary-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.summary-list li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.summary-list svg {
		width: 1rem;
		height: 1rem;
		color: var(--space-color);
	}

	/* Options */
	.options {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.option {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		width: 100%;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		text-align: left;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.option:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.option.selected {
		background: color-mix(in srgb, var(--space-color) 10%, transparent);
		border-color: color-mix(in srgb, var(--space-color) 40%, transparent);
	}

	.option.option-danger.selected {
		background: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.4);
	}

	.option:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.option-radio {
		width: 1.125rem;
		height: 1.125rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 0.125rem;
		transition: border-color 0.15s ease;
	}

	.option.selected .option-radio {
		border-color: var(--space-color);
	}

	.option.option-danger.selected .option-radio {
		border-color: #ef4444;
	}

	.radio-dot {
		width: 0.5rem;
		height: 0.5rem;
		background: var(--space-color);
		border-radius: 50%;
	}

	.radio-dot.danger {
		background: #ef4444;
	}

	.option-content {
		flex: 1;
		min-width: 0;
	}

	.option-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.option-title {
		font-size: 0.9375rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	.option-badge {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	.option-badge.recommended {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
	}

	.option-description {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
		line-height: 1.5;
	}

	/* Empty message */
	.empty-message {
		font-size: 0.9375rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
		line-height: 1.5;
	}

	/* Actions */
	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.2);
	}

	.btn-secondary,
	.btn-danger {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.btn-secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	.btn-danger {
		background: #ef4444;
		color: #fff;
	}

	.btn-danger:hover:not(:disabled) {
		background: #dc2626;
	}

	.btn-secondary:disabled,
	.btn-danger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
