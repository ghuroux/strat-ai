<script lang="ts">
	/**
	 * UnlockPageModal.svelte - Confirmation for unlocking a finalized page
	 *
	 * Shows confirmation when unlocking a page, explaining:
	 * - The page will become editable again
	 * - The current version remains (AI context unchanged)
	 * - Re-finalizing will create a new version
	 *
	 * Phase 4 additions:
	 * - "Keep in AI context" checkbox when page is currently in context
	 * - Pins the finalized version for AI while user edits
	 *
	 * Pattern: Follows VisibilityChangeConfirmModal.svelte for consistency.
	 */

	import { fade, fly } from 'svelte/transition';
	import { LockOpen, Loader2 } from 'lucide-svelte';

	interface Props {
		open: boolean;
		pageTitle: string;
		currentVersion: number;
		isInContext: boolean;
		onClose: () => void;
		onConfirm: (keepInContext: boolean) => Promise<void>;
	}

	let { open, pageTitle, currentVersion, isInContext, onClose, onConfirm }: Props = $props();

	// State
	let isUnlocking = $state(false);
	let keepInContext = $state(true);

	// Reset state when modal opens
	$effect(() => {
		if (open) {
			keepInContext = true;
		}
	});

	// Handle keyboard
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isUnlocking) {
			onClose();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isUnlocking) {
			onClose();
		}
	}

	// Handle confirmation
	async function handleConfirm() {
		isUnlocking = true;
		try {
			await onConfirm(isInContext ? keepInContext : false);
		} finally {
			isUnlocking = false;
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
			aria-labelledby="confirm-title"
		>
			<header class="modal-header">
				<div class="unlock-icon">
					<LockOpen size={24} strokeWidth={2} />
				</div>
				<h2 id="confirm-title" class="modal-title">Edit Finalized Page?</h2>
			</header>

			<div class="modal-content">
				<p class="confirm-text">
					Unlock "{pageTitle}"?
				</p>
				<p class="confirm-subtext">
					This page is finalized (v{currentVersion}). Editing will unlock it for changes.
				</p>

				<div class="info-box">
					<p class="info-item">The page will become editable</p>
					<p class="info-item">When you're done, finalize again to create v{currentVersion + 1}</p>
				</div>

				{#if isInContext}
					<label class="context-checkbox">
						<input type="checkbox" bind:checked={keepInContext} disabled={isUnlocking} />
						<div class="context-label-content">
							<span class="context-label-text">Keep v{currentVersion} in AI context while editing</span>
							<span class="context-hint">AI will reference the finalized version until you re-finalize</span>
						</div>
					</label>
				{/if}
			</div>

			<footer class="modal-footer">
				<button class="btn-secondary" onclick={onClose} disabled={isUnlocking}>
					Cancel
				</button>
				<button class="btn-unlock" onclick={handleConfirm} disabled={isUnlocking}>
					{#if isUnlocking}
						<Loader2 size={16} class="spinner" />
						Unlocking...
					{:else}
						<LockOpen size={16} />
						Unlock & Edit
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

	.unlock-icon {
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
		margin: 0 0 0.5rem 0;
	}

	.confirm-subtext {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 1rem 0;
		line-height: 1.5;
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

	/* Context checkbox */
	.context-checkbox {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 0.75rem;
		margin-top: 0.75rem;
		background: rgba(245, 158, 11, 0.08);
		border: 1px solid rgba(245, 158, 11, 0.2);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.context-checkbox:hover {
		background: rgba(245, 158, 11, 0.12);
		border-color: rgba(245, 158, 11, 0.3);
	}

	.context-checkbox input[type="checkbox"] {
		width: 1rem;
		height: 1rem;
		margin-top: 0.125rem;
		flex-shrink: 0;
		accent-color: #f59e0b;
		cursor: pointer;
	}

	.context-label-content {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.context-label-text {
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	.context-hint {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.3;
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
	.btn-unlock {
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

	.btn-unlock {
		color: white;
		background: #d97706;
		border-color: #d97706;
	}

	.btn-unlock:hover:not(:disabled) {
		background: #b45309;
		border-color: #b45309;
	}

	.btn-secondary:disabled,
	.btn-unlock:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-unlock :global(.spinner) {
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

	:global(html.light) .confirm-subtext {
		color: rgba(0, 0, 0, 0.6);
	}

	:global(html.light) .info-box {
		background: rgba(0, 0, 0, 0.02);
	}

	:global(html.light) .info-item {
		color: rgba(0, 0, 0, 0.7);
	}

	:global(html.light) .context-checkbox {
		background: rgba(245, 158, 11, 0.06);
		border-color: rgba(245, 158, 11, 0.2);
	}

	:global(html.light) .context-checkbox:hover {
		background: rgba(245, 158, 11, 0.1);
	}

	:global(html.light) .context-label-text {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .context-hint {
		color: rgba(0, 0, 0, 0.5);
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
