<script lang="ts">
	/**
	 * VisibilityChangeConfirmModal.svelte - Confirmation for visibility changes
	 *
	 * Shows confirmation when changing visibility from private to area/space,
	 * which will remove existing specific shares.
	 *
	 * Pattern: Follows RemoveMemberConfirmModal.svelte for consistency.
	 */

	import { fade, fly } from 'svelte/transition';
	import { AlertTriangle, Loader2 } from 'lucide-svelte';
	import type { PageVisibility } from '$lib/types/page';

	interface Props {
		open: boolean;
		newVisibility: PageVisibility;
		shareCount: number;
		areaName: string;
		spaceName: string;
		onClose: () => void;
		onConfirm: () => Promise<void>;
	}

	let { open, newVisibility, shareCount, areaName, spaceName, onClose, onConfirm }: Props = $props();

	// State
	let isChanging = $state(false);

	// Derived
	let targetName = $derived(newVisibility === 'area' ? areaName : spaceName);
	let targetLabel = $derived(newVisibility === 'area' ? 'area' : 'space');

	// Handle keyboard
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isChanging) {
			onClose();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isChanging) {
			onClose();
		}
	}

	// Handle confirmation
	async function handleConfirm() {
		isChanging = true;
		try {
			await onConfirm();
		} finally {
			isChanging = false;
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
				<div class="warning-icon">
					<AlertTriangle size={24} strokeWidth={2} />
				</div>
				<h2 id="confirm-title" class="modal-title">Change Visibility</h2>
			</header>

			<div class="modal-content">
				<p class="confirm-text">
					Make this page visible to all {targetLabel} members?
				</p>
				<p class="confirm-subtext">
					Making this page visible to all members of <strong>{targetName}</strong> will remove
					{shareCount} specific {shareCount === 1 ? 'share' : 'shares'}.
				</p>
				<p class="confirm-note">
					{#if newVisibility === 'area'}
						Area members will access this page based on their area role.
					{:else}
						Space members will access this page based on their space role.
					{/if}
				</p>
			</div>

			<footer class="modal-footer">
				<button class="btn-secondary" onclick={onClose} disabled={isChanging}>
					Cancel
				</button>
				<button class="btn-warning" onclick={handleConfirm} disabled={isChanging}>
					{#if isChanging}
						<Loader2 size={16} class="spinner" />
						Changing...
					{:else}
						Change Visibility
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

	.warning-icon {
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
		margin: 0 0 0.75rem 0;
	}

	.confirm-subtext {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0 0 0.75rem 0;
		line-height: 1.5;
	}

	.confirm-subtext strong {
		color: #f59e0b;
	}

	.confirm-note {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 0.375rem;
		border-left: 2px solid rgba(255, 255, 255, 0.1);
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
	.btn-warning {
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

	.btn-warning {
		color: white;
		background: #d97706;
		border-color: #d97706;
	}

	.btn-warning:hover:not(:disabled) {
		background: #b45309;
		border-color: #b45309;
	}

	.btn-secondary:disabled,
	.btn-warning:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-warning :global(.spinner) {
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
		color: rgba(0, 0, 0, 0.7);
	}

	:global(html.light) .confirm-note {
		color: rgba(0, 0, 0, 0.5);
		background: rgba(0, 0, 0, 0.02);
		border-color: rgba(0, 0, 0, 0.1);
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
