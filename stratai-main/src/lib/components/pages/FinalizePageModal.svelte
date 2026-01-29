<script lang="ts">
	/**
	 * FinalizePageModal.svelte - Confirmation for page finalization
	 *
	 * Shows confirmation when finalizing a page, which:
	 * - Creates a version snapshot
	 * - Locks the page from editing
	 * - Allows the page to be added to AI context (Phase 2)
	 *
	 * Pattern: Follows VisibilityChangeConfirmModal.svelte for consistency.
	 */

	import { fade, fly } from 'svelte/transition';
	import { Lock, Loader2, BookOpen } from 'lucide-svelte';

	interface Props {
		open: boolean;
		pageTitle: string;
		contextVersionNumber?: number;
		onClose: () => void;
		onConfirm: (changeSummary?: string, addToContext?: boolean) => Promise<void>;
	}

	let { open, pageTitle, contextVersionNumber, onClose, onConfirm }: Props = $props();

	// State
	let isFinalizing = $state(false);
	let changeSummary = $state('');
	let addToContext = $state(true); // Default checked for discoverability

	// Handle keyboard
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isFinalizing) {
			onClose();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isFinalizing) {
			onClose();
		}
	}

	// Handle confirmation
	async function handleConfirm() {
		isFinalizing = true;
		try {
			await onConfirm(changeSummary.trim() || undefined, addToContext);
		} finally {
			isFinalizing = false;
			changeSummary = '';
		}
	}

	// Reset on close
	$effect(() => {
		if (!open) {
			changeSummary = '';
			addToContext = true;
		}
	});
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
				<div class="lock-icon">
					<Lock size={24} strokeWidth={2} />
				</div>
				<h2 id="confirm-title" class="modal-title">Finalize Page</h2>
			</header>

			<div class="modal-content">
				<p class="confirm-text">
					Finalize "{pageTitle}"?
				</p>
				<p class="confirm-subtext">
					This will lock the page. Future edits will create a new version.
				</p>

				<label class="summary-label">
					<span class="summary-label-text">Change summary (optional)</span>
					<textarea
						class="summary-input"
						bind:value={changeSummary}
						placeholder="Describe what changed in this version..."
						rows="3"
						disabled={isFinalizing}
					></textarea>
				</label>

				{#if contextVersionNumber}
					<div class="context-replace-note">
						<BookOpen size={14} />
						<span>v{contextVersionNumber} is currently in AI context. Finalizing will replace it with this new version.</span>
					</div>
				{/if}

				<!-- Context checkbox -->
				<label class="context-checkbox">
					<input
						type="checkbox"
						bind:checked={addToContext}
						disabled={isFinalizing}
					/>
					<span class="context-label-text">Add to Area AI context</span>
					<span class="context-hint">AI will reference this page in conversations</span>
				</label>
			</div>

			<footer class="modal-footer">
				<button class="btn-secondary" onclick={onClose} disabled={isFinalizing}>
					Cancel
				</button>
				<button class="btn-finalize" onclick={handleConfirm} disabled={isFinalizing}>
					{#if isFinalizing}
						<Loader2 size={16} class="spinner" />
						Finalizing...
					{:else}
						<Lock size={16} />
						Finalize
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

	.lock-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: rgba(34, 197, 94, 0.15);
		border-radius: 0.5rem;
		color: #22c55e;
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

	.summary-label {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.summary-label-text {
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
	}

	.summary-input {
		width: 100%;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		color: rgba(255, 255, 255, 0.95);
		font-size: 0.875rem;
		line-height: 1.5;
		resize: vertical;
	}

	.summary-input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}

	.summary-input:focus {
		outline: none;
		border-color: #22c55e;
	}

	.summary-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.context-replace-note {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.625rem 0.75rem;
		background: rgba(245, 158, 11, 0.08);
		border: 1px solid rgba(245, 158, 11, 0.2);
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.4;
	}

	.context-replace-note :global(svg) {
		flex-shrink: 0;
		margin-top: 0.125rem;
		color: #f59e0b;
	}

	.context-checkbox {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.75rem;
		background: rgba(34, 197, 94, 0.08);
		border: 1px solid rgba(34, 197, 94, 0.2);
		border-radius: 0.5rem;
		cursor: pointer;
	}

	.context-checkbox input[type="checkbox"] {
		width: 1rem;
		height: 1rem;
		accent-color: #22c55e;
		cursor: pointer;
	}

	.context-label-text {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	.context-hint {
		width: 100%;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		padding-left: 1.5rem;
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
	.btn-finalize {
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

	.btn-finalize {
		color: white;
		background: #16a34a;
		border-color: #16a34a;
	}

	.btn-finalize:hover:not(:disabled) {
		background: #15803d;
		border-color: #15803d;
	}

	.btn-secondary:disabled,
	.btn-finalize:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-finalize :global(.spinner) {
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

	:global(html.light) .summary-label-text {
		color: rgba(0, 0, 0, 0.7);
	}

	:global(html.light) .summary-input {
		background: rgba(0, 0, 0, 0.03);
		border-color: rgba(0, 0, 0, 0.15);
		color: rgba(0, 0, 0, 0.95);
	}

	:global(html.light) .summary-input::placeholder {
		color: rgba(0, 0, 0, 0.4);
	}

	:global(html.light) .context-replace-note {
		background: rgba(245, 158, 11, 0.06);
		border-color: rgba(245, 158, 11, 0.2);
		color: rgba(0, 0, 0, 0.8);
	}

	:global(html.light) .context-checkbox {
		background: rgba(34, 197, 94, 0.06);
		border-color: rgba(34, 197, 94, 0.2);
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
