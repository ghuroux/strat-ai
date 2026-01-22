<script lang="ts">
	/**
	 * DeleteConversationModal - Confirmation modal for deleting a conversation
	 *
	 * Simple confirmation with conversation title display.
	 * Matches the styling of other delete modals (DeleteAreaModal, DeleteTaskModal).
	 */
	import { fly, fade } from 'svelte/transition';
	import { Trash2 } from 'lucide-svelte';
	import type { Conversation } from '$lib/types/chat';

	interface Props {
		open: boolean;
		conversation: Conversation | null;
		onClose: () => void;
		onConfirm: () => void;
	}

	let {
		open,
		conversation,
		onClose,
		onConfirm
	}: Props = $props();

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

	async function handleConfirm() {
		if (isDeleting) return;
		isDeleting = true;
		onConfirm();
	}

	// Get message count for context
	let messageCount = $derived(conversation?.messages?.length ?? 0);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && conversation}
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
			aria-labelledby="modal-title"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<!-- Header -->
			<header class="modal-header">
				<div class="header-icon">
					<Trash2 size={20} />
				</div>
				<h2 id="modal-title" class="modal-title">Delete Conversation</h2>
			</header>

			<!-- Content -->
			<div class="modal-content">
				<p class="confirm-text">
					Are you sure you want to delete <strong>"{conversation.title}"</strong>?
				</p>

				{#if messageCount > 0}
					<div class="content-info">
						<svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
						</svg>
						<span>{messageCount} message{messageCount !== 1 ? 's' : ''} will be deleted</span>
					</div>
				{/if}

				<p class="warning-text">This action cannot be undone.</p>
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
					onclick={handleConfirm}
					disabled={isDeleting}
				>
					{isDeleting ? 'Deleting...' : 'Delete'}
				</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.modal-container {
		width: 100%;
		max-width: 24rem;
		background: rgb(23, 23, 23);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}

	:global(.light) .modal-container,
	:global(:root:not(.dark)) .modal-container {
		background: rgb(255, 255, 255);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(.light) .modal-header,
	:global(:root:not(.dark)) .modal-header {
		border-color: rgba(0, 0, 0, 0.1);
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

	.modal-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #fff;
		margin: 0;
	}

	:global(.light) .modal-title,
	:global(:root:not(.dark)) .modal-title {
		color: #18181b;
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

	:global(.light) .confirm-text,
	:global(:root:not(.dark)) .confirm-text {
		color: rgba(0, 0, 0, 0.7);
	}

	.confirm-text strong {
		color: #fff;
		font-weight: 600;
	}

	:global(.light) .confirm-text strong,
	:global(:root:not(.dark)) .confirm-text strong {
		color: #18181b;
	}

	.content-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
	}

	:global(.light) .content-info,
	:global(:root:not(.dark)) .content-info {
		background: rgba(0, 0, 0, 0.03);
		border-color: rgba(0, 0, 0, 0.1);
		color: rgba(0, 0, 0, 0.6);
	}

	.info-icon {
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
		color: #71717a;
	}

	.warning-text {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	:global(.light) .warning-text,
	:global(:root:not(.dark)) .warning-text {
		color: rgba(0, 0, 0, 0.4);
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.2);
	}

	:global(.light) .modal-actions,
	:global(:root:not(.dark)) .modal-actions {
		border-color: rgba(0, 0, 0, 0.1);
		background: rgba(0, 0, 0, 0.02);
	}

	.btn-secondary,
	.btn-danger {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.375rem;
		transition: all 0.15s ease;
		border: none;
		cursor: pointer;
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	:global(.light) .btn-secondary,
	:global(:root:not(.dark)) .btn-secondary {
		background: rgba(0, 0, 0, 0.05);
		color: rgba(0, 0, 0, 0.7);
	}

	.btn-secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	:global(.light) .btn-secondary:hover:not(:disabled),
	:global(:root:not(.dark)) .btn-secondary:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.1);
		color: #18181b;
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
