<script lang="ts">
	/**
	 * RemoveMemberConfirmModal.svelte - Confirmation dialog for removing members
	 *
	 * Shows confirmation before removing a user or group from an area.
	 * Danger-styled modal with clear warning about consequences.
	 */

	import { fade, fly } from 'svelte/transition';
	import { AlertCircle, Loader2 } from 'lucide-svelte';
	import type { AreaMemberWithDetails } from '$lib/types/area-memberships';

	interface Props {
		open: boolean;
		member: AreaMemberWithDetails | null;
		onClose: () => void;
		onConfirm: () => Promise<void>;
	}

	let { open, member, onClose, onConfirm }: Props = $props();

	// State
	let isRemoving = $state(false);

	// Handle keyboard
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isRemoving) {
			onClose();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isRemoving) {
			onClose();
		}
	}

	// Handle confirmation
	async function handleConfirm() {
		isRemoving = true;
		try {
			await onConfirm();
		} finally {
			isRemoving = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && member}
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
					<AlertCircle size={24} strokeWidth={2} />
				</div>
				<h2 id="confirm-title" class="modal-title">Remove Member</h2>
			</header>

			<div class="modal-content">
				<p class="confirm-text">
					Remove <strong>{member.userName ?? member.groupName}</strong> from this area?
				</p>
				<p class="confirm-subtext">
					They will no longer have access to conversations and tasks in this area.
				</p>
			</div>

			<footer class="modal-footer">
				<button class="btn-secondary" onclick={onClose} disabled={isRemoving}>
					Cancel
				</button>
				<button class="btn-danger" onclick={handleConfirm} disabled={isRemoving}>
					{#if isRemoving}
						<Loader2 size={16} class="spinner" />
						Removing...
					{:else}
						Remove
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
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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
		margin: 0 0 0.5rem 0;
	}

	.confirm-text strong {
		color: #ef4444;
	}

	.confirm-subtext {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0;
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
	.btn-danger {
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

	.btn-danger {
		color: white;
		background: #dc2626;
		border-color: #dc2626;
	}

	.btn-danger:hover:not(:disabled) {
		background: #b91c1c;
		border-color: #b91c1c;
	}

	.btn-secondary:disabled,
	.btn-danger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-danger :global(.spinner) {
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
