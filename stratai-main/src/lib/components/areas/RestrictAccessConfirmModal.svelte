<script lang="ts">
	/**
	 * RestrictAccessConfirmModal.svelte - Confirmation for restricting area access
	 *
	 * Shows warning before changing area from open to restricted mode.
	 * Explains consequences and gives user option to cancel.
	 */

	import { fade, fly } from 'svelte/transition';
	import { Lock, Loader2 } from 'lucide-svelte';

	interface Props {
		open: boolean;
		areaName: string;
		onClose: () => void;
		onConfirm: () => Promise<void>;
	}

	let { open, areaName, onClose, onConfirm }: Props = $props();

	// State
	let isConfirming = $state(false);

	// Handle keyboard
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isConfirming) {
			onClose();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isConfirming) {
			onClose();
		}
	}

	// Handle confirmation
	async function handleConfirm() {
		isConfirming = true;
		try {
			await onConfirm();
		} finally {
			isConfirming = false;
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
				<div class="info-icon">
					<Lock size={24} strokeWidth={2} />
				</div>
				<h2 id="confirm-title" class="modal-title">Restrict Access?</h2>
			</header>

			<div class="modal-content">
				<p class="confirm-text">
					This will change <strong>{areaName}</strong> to restricted access.
				</p>

				<div class="info-box">
					<p class="info-title">What this means:</p>
					<ul class="info-list">
						<li>Only explicitly invited members will have access</li>
						<li>Space members will need explicit invites to access</li>
						<li>Current invited members will retain access</li>
						<li>You can manage access in the Members section</li>
					</ul>
				</div>
			</div>

			<footer class="modal-footer">
				<button class="btn-secondary" onclick={onClose} disabled={isConfirming}>
					Cancel
				</button>
				<button class="btn-primary" onclick={handleConfirm} disabled={isConfirming}>
					{#if isConfirming}
						<Loader2 size={16} class="spinner" />
						Applying...
					{:else}
						Restrict Access
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
		z-index: 102;
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

	.info-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: rgba(59, 130, 246, 0.15);
		border-radius: 0.5rem;
		color: #3b82f6;
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
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 1rem 0;
	}

	.confirm-text strong {
		color: #3b82f6;
	}

	.info-box {
		padding: 1rem;
		background: rgba(59, 130, 246, 0.05);
		border: 1px solid rgba(59, 130, 246, 0.15);
		border-radius: 0.5rem;
	}

	.info-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 0.5rem 0;
	}

	.info-list {
		margin: 0;
		padding-left: 1.25rem;
	}

	.info-list li {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.6;
		margin-bottom: 0.25rem;
	}

	.info-list li:last-child {
		margin-bottom: 0;
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
	.btn-primary {
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

	.btn-primary {
		color: white;
		background: #3b82f6;
		border-color: #3b82f6;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
		border-color: #2563eb;
	}

	.btn-secondary:disabled,
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary :global(.spinner) {
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

	:global(html.light) .info-icon {
		background: rgba(59, 130, 246, 0.1);
		color: #2563eb;
	}

	:global(html.light) .modal-title {
		color: rgba(0, 0, 0, 0.95);
	}

	:global(html.light) .confirm-text {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .confirm-text strong {
		color: #2563eb;
	}

	:global(html.light) .info-box {
		background: rgba(59, 130, 246, 0.05);
		border-color: rgba(59, 130, 246, 0.15);
	}

	:global(html.light) .info-title {
		color: rgba(0, 0, 0, 0.9);
	}

	:global(html.light) .info-list li {
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

	:global(html.light) .btn-primary {
		background: #2563eb;
		border-color: #2563eb;
	}

	:global(html.light) .btn-primary:hover:not(:disabled) {
		background: #1d4ed8;
		border-color: #1d4ed8;
	}

	:global(html.light) .modal-footer {
		background: rgba(0, 0, 0, 0.02);
	}
</style>
