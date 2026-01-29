<script lang="ts">
	/**
	 * RestoreVersionModal.svelte - Confirmation for restoring a previous version
	 *
	 * Shows confirmation when restoring a page to a previous version, explaining:
	 * - Current content will be replaced with the selected version
	 * - The page will be unlocked for editing
	 * - Re-finalizing will create the next version
	 *
	 * Pattern: Follows UnlockPageModal.svelte for consistency.
	 *
	 * Phase 3: Page Lifecycle - Version Management
	 */

	import { fade, fly } from 'svelte/transition';
	import { RotateCcw, Loader2 } from 'lucide-svelte';

	interface Props {
		open: boolean;
		pageTitle: string;
		versionNumber: number;
		currentVersion: number;
		onClose: () => void;
		onConfirm: () => Promise<void>;
	}

	let { open, pageTitle, versionNumber, currentVersion, onClose, onConfirm }: Props = $props();

	let isRestoring = $state(false);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isRestoring) {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isRestoring) {
			onClose();
		}
	}

	async function handleConfirm() {
		isRestoring = true;
		try {
			await onConfirm();
		} finally {
			isRestoring = false;
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
			aria-labelledby="restore-title"
		>
			<header class="modal-header">
				<div class="restore-icon">
					<RotateCcw size={24} strokeWidth={2} />
				</div>
				<h2 id="restore-title" class="modal-title">Restore Version?</h2>
			</header>

			<div class="modal-content">
				<p class="confirm-text">
					Restore "{pageTitle}" to v{versionNumber}?
				</p>

				<div class="info-box">
					<p class="info-item">This will replace the current content with v{versionNumber}</p>
					<p class="info-item">The page will be unlocked for editing</p>
					<p class="info-item">Finalize again to create v{currentVersion + 1}</p>
				</div>
			</div>

			<footer class="modal-footer">
				<button class="btn-secondary" onclick={onClose} disabled={isRestoring}>
					Cancel
				</button>
				<button class="btn-restore" onclick={handleConfirm} disabled={isRestoring}>
					{#if isRestoring}
						<Loader2 size={16} class="spinner" />
						Restoring...
					{:else}
						<RotateCcw size={16} />
						Restore
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

	.restore-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: rgba(245, 158, 11, 0.15);
		border-radius: 0.5rem;
		color: #f59e0b;
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
		border-left: 2px solid rgba(245, 158, 11, 0.5);
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
		color: rgba(245, 158, 11, 0.7);
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
	.btn-restore {
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

	.btn-restore {
		color: white;
		background: #d97706;
		border-color: #d97706;
	}

	.btn-restore:hover:not(:disabled) {
		background: #b45309;
		border-color: #b45309;
	}

	.btn-secondary:disabled,
	.btn-restore:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-restore :global(.spinner) {
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
