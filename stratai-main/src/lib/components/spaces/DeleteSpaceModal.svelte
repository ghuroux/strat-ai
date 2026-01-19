<script lang="ts">
	/**
	 * DeleteSpaceModal - Confirmation modal for deleting a space
	 *
	 * Shows cascade warning with details about what will be deleted:
	 * - All areas and their context
	 * - All tasks and subtasks
	 * - All conversations
	 *
	 * US-008: Update space delete API and frontend to show cascade info
	 */
	import { fly, fade } from 'svelte/transition';
	import type { Space } from '$lib/types/spaces';

	interface Props {
		open: boolean;
		space: Space | null;
		onClose: () => void;
		onConfirm: (spaceId: string) => Promise<void>;
	}

	let { open, space, onClose, onConfirm }: Props = $props();

	// Local state
	let isDeleting = $state(false);

	// Reset state when modal opens
	$effect(() => {
		if (open) {
			isDeleting = false;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isDeleting) {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isDeleting) {
			onClose();
		}
	}

	async function handleDelete() {
		if (!space || isDeleting) return;
		isDeleting = true;
		try {
			await onConfirm(space.id);
			onClose();
		} catch (e) {
			console.error('Failed to delete space:', e);
			isDeleting = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && space}
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
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-space-modal-title"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<!-- Header -->
			<header class="modal-header">
				<div class="header-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
						/>
					</svg>
				</div>
				<h2 id="delete-space-modal-title" class="modal-title">Delete Space</h2>
			</header>

			<!-- Content -->
			<div class="modal-content">
				<p class="confirm-text">
					Are you sure you want to delete <strong>"{space.name}"</strong>?
				</p>

				<!-- Cascade warning box -->
				<div class="cascade-warning">
					<p class="warning-heading">This will permanently delete:</p>
					<ul class="warning-list">
						<li>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
								/>
							</svg>
							<span>All areas and their context</span>
						</li>
						<li>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<span>All tasks and subtasks</span>
						</li>
						<li>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
								/>
							</svg>
							<span>All conversations</span>
						</li>
					</ul>
				</div>

				<p class="final-warning">This action cannot be undone.</p>
			</div>

			<!-- Actions -->
			<footer class="modal-actions">
				<button
					type="button"
					class="btn-secondary"
					onclick={onClose}
					disabled={isDeleting}
				>
					Cancel
				</button>
				<button
					type="button"
					class="btn-danger"
					onclick={handleDelete}
					disabled={isDeleting}
				>
					{#if isDeleting}
						<svg class="spinner" viewBox="0 0 24 24" fill="none">
							<circle
								class="spinner-track"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="3"
							/>
							<path
								class="spinner-head"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
						Deleting...
					{:else}
						Delete Space
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

	.confirm-text {
		font-size: 0.9375rem;
		color: rgba(255, 255, 255, 0.8);
		margin: 0 0 1rem 0;
		line-height: 1.5;
	}

	.confirm-text strong {
		color: #fff;
		font-weight: 600;
	}

	/* Cascade warning box - AC #4 styling */
	.cascade-warning {
		padding: 0.875rem 1rem;
		background: rgb(239 68 68 / 8%);
		border: 1px solid rgb(239 68 68 / 20%);
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	.warning-heading {
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 0.625rem 0;
	}

	.warning-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.warning-list li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #fca5a5;
	}

	.warning-list svg {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.final-warning {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
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

	/* AC #8 - Cancel button secondary styling */
	.btn-secondary {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.375rem;
		transition: all 0.15s ease;
		background: rgb(39 39 42);
		color: rgba(255, 255, 255, 0.8);
	}

	.btn-secondary:hover:not(:disabled) {
		background: rgb(63 63 70);
		color: #fff;
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* AC #6 - Delete button destructive styling */
	.btn-danger {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.375rem;
		transition: all 0.15s ease;
		background: #dc2626;
		color: #fff;
	}

	.btn-danger:hover:not(:disabled) {
		background: #b91c1c;
	}

	.btn-danger:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	/* AC #7 - Spinner for loading state */
	.spinner {
		width: 1rem;
		height: 1rem;
		animation: spin 1s linear infinite;
	}

	.spinner-track {
		opacity: 0.25;
	}

	.spinner-head {
		opacity: 0.75;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
