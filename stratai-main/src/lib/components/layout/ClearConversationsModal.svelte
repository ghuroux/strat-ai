<script lang="ts">
	/**
	 * ClearConversationsModal - Confirmation modal for clearing main nav conversations
	 *
	 * Shows a warning with the count of conversations to be deleted.
	 * Only clears conversations without a spaceId (main nav only).
	 */
	import { fly, fade } from 'svelte/transition';

	interface Props {
		open: boolean;
		conversationCount: number;
		onClose: () => void;
		onConfirm: () => void;
	}

	let {
		open,
		conversationCount,
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

	function handleClear() {
		isDeleting = true;
		onConfirm();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
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
			aria-labelledby="clear-modal-title"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<!-- Header -->
			<header class="modal-header">
				<div class="warning-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
					</svg>
				</div>
				<h2 id="clear-modal-title" class="modal-title">Clear Conversations</h2>
			</header>

			<!-- Content -->
			<div class="modal-content">
				<p class="confirm-text">
					Are you sure you want to delete <strong>{conversationCount}</strong> conversation{conversationCount !== 1 ? 's' : ''} from your main chat?
				</p>

				<div class="info-box">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
					</svg>
					<span>Conversations in your Spaces will not be affected.</span>
				</div>

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
					onclick={handleClear}
					disabled={isDeleting}
				>
					{isDeleting ? 'Clearing...' : 'Clear All'}
				</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.modal-container {
		width: 100%;
		max-width: 26rem;
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

	.warning-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: rgba(239, 68, 68, 0.15);
		border-radius: 0.5rem;
		color: #ef4444;
	}

	.warning-icon svg {
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

	.info-box {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 0.75rem 1rem;
		background: rgba(59, 130, 246, 0.08);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	.info-box svg {
		width: 1.125rem;
		height: 1.125rem;
		color: #60a5fa;
		flex-shrink: 0;
		margin-top: 0.0625rem;
	}

	.info-box span {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.4;
	}

	.warning-text {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		background: rgba(0, 0, 0, 0.2);
		border-top: 1px solid rgba(255, 255, 255, 0.06);
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

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-danger {
		background: #dc2626;
		color: #fff;
	}

	.btn-danger:hover:not(:disabled) {
		background: #b91c1c;
	}

	.btn-danger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
