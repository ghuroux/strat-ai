<script lang="ts">
	/**
	 * DiscardChangesModal.svelte - Confirmation for discarding changes
	 *
	 * Shown when the user wants to revert to the last finalized version,
	 * discarding all edits since unlocking.
	 *
	 * Pattern: Follows RestoreVersionModal.svelte for consistency.
	 *
	 * Phase 4: Page Lifecycle - Polish
	 */

	import { fade, fly } from 'svelte/transition';
	import { RotateCcw, Loader2 } from 'lucide-svelte';

	interface Props {
		open: boolean;
		pageTitle: string;
		targetVersion: number;
		onClose: () => void;
		onConfirm: () => Promise<void>;
	}

	let { open, pageTitle, targetVersion, onClose, onConfirm }: Props = $props();

	let isDiscarding = $state(false);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isDiscarding) {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isDiscarding) {
			onClose();
		}
	}

	async function handleConfirm() {
		isDiscarding = true;
		try {
			await onConfirm();
		} finally {
			isDiscarding = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="modal-backdrop"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
		role="presentation"
	>
		<div
			class="confirm-modal"
			transition:fly={{ y: 20, duration: 200 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="discard-title"
		>
			<header class="modal-header">
				<div class="discard-icon">
					<RotateCcw size={24} strokeWidth={2} />
				</div>
				<h2 id="discard-title" class="modal-title">Discard Changes?</h2>
			</header>

			<div class="modal-content">
				<p class="confirm-text">
					Revert "{pageTitle}" to v{targetVersion}?
				</p>

				<div class="info-box">
					<p class="info-item">All unsaved changes since unlocking will be lost</p>
					<p class="info-item">The page will be reverted to the last finalized version</p>
				</div>
			</div>

			<footer class="modal-footer">
				<button class="btn-secondary" onclick={onClose} disabled={isDiscarding}>
					Cancel
				</button>
				<button class="btn-discard" onclick={handleConfirm} disabled={isDiscarding}>
					{#if isDiscarding}
						<Loader2 size={16} class="spinner" />
						Reverting...
					{:else}
						<RotateCcw size={16} />
						Discard & Revert
					{/if}
				</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		z-index: 101;
	}

	.confirm-modal {
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
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.discard-icon {
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
		color: rgba(255, 255, 255, 0.95);
		margin: 0;
	}

	.modal-content {
		padding: 1.25rem 1.5rem;
	}

	.confirm-text {
		font-size: 0.9375rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 1rem 0;
	}

	.info-box {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 0.375rem;
		border-left: 2px solid rgba(239, 68, 68, 0.5);
	}

	.info-item {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
		line-height: 1.4;
	}

	.info-item::before {
		content: '\2022';
		margin-right: 0.5rem;
		color: rgba(239, 68, 68, 0.7);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.2);
	}

	.btn-secondary,
	.btn-discard {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border: 1px solid;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.btn-secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.btn-discard {
		color: white;
		background: #dc2626;
		border-color: #dc2626;
	}

	.btn-discard:hover:not(:disabled) {
		background: #b91c1c;
		border-color: #b91c1c;
	}

	.btn-secondary:disabled,
	.btn-discard:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-discard :global(.spinner) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Light mode */
	:global(html.light) .confirm-modal {
		background: #ffffff;
		border-color: rgba(0, 0, 0, 0.1);
	}

	:global(html.light) .modal-header,
	:global(html.light) .modal-footer {
		border-color: rgba(0, 0, 0, 0.08);
	}

	:global(html.light) .modal-title {
		color: rgba(0, 0, 0, 0.95);
	}

	:global(html.light) .confirm-text {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .info-box {
		background: rgba(0, 0, 0, 0.02);
	}

	:global(html.light) .info-item {
		color: rgba(0, 0, 0, 0.7);
	}

	:global(html.light) .btn-secondary {
		color: rgba(0, 0, 0, 0.9);
		background: rgba(0, 0, 0, 0.05);
		border-color: rgba(0, 0, 0, 0.2);
	}

	:global(html.light) .btn-secondary:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.1);
		border-color: rgba(0, 0, 0, 0.3);
	}

	:global(html.light) .modal-footer {
		background: rgba(0, 0, 0, 0.02);
	}
</style>
