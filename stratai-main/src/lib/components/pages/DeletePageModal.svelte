<script lang="ts">
	/**
	 * DeletePageModal.svelte - Confirmation modal for deleting a page
	 *
	 * Warnings included:
	 * - Action cannot be undone
	 * - If shared, other users will lose access
	 * - All version history will be deleted
	 * - Any linked conversations will be unlinked (conversations remain)
	 */

	import type { Page } from '$lib/types/page';

	// Props
	interface Props {
		page: Page | null;
		isOpen: boolean;
		isDeleting?: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let { page, isOpen, isDeleting = false, onConfirm, onCancel }: Props = $props();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !isDeleting) {
			onCancel();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && page}
	<div class="modal-backdrop" onclick={onCancel} role="presentation">
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="delete-modal-title"
			aria-describedby="delete-modal-description"
		>
			<!-- Warning icon -->
			<div class="warning-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
			</div>

			<!-- Header -->
			<h2 id="delete-modal-title">Delete "{page.title}"?</h2>

			<!-- Description -->
			<div id="delete-modal-description" class="description">
				<p class="warning-text">This action cannot be undone.</p>

				<ul class="consequences">
					<li>The page content will be permanently deleted</li>
					<li>All version history will be removed</li>
					{#if page.visibility === 'shared'}
						<li class="shared-warning">
							<strong>This page is shared</strong> — other users will lose access
						</li>
					{/if}
					<li>Any linked conversations will be unlinked (conversations will remain)</li>
				</ul>
			</div>

			<!-- Actions -->
			<div class="actions">
				<button
					type="button"
					class="cancel-button"
					onclick={onCancel}
					disabled={isDeleting}
				>
					Cancel
				</button>
				<button
					type="button"
					class="delete-button"
					onclick={onConfirm}
					disabled={isDeleting}
				>
					{#if isDeleting}
						<span class="spinner"></span>
						Deleting...
					{:else}
						Delete Page
					{/if}
				</button>
			</div>
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
		z-index: 100;
		padding: 1rem;
	}

	.modal {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		max-width: 420px;
		background: var(--editor-bg);
		border: 1px solid var(--editor-border);
		border-radius: 16px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		padding: 1.5rem;
		text-align: center;
	}

	.warning-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: rgba(239, 68, 68, 0.1);
		border-radius: 50%;
		color: #ef4444;
		margin-bottom: 1rem;
	}

	.warning-icon svg {
		width: 24px;
		height: 24px;
	}

	h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--editor-text);
		margin: 0 0 1rem 0;
	}

	.description {
		width: 100%;
		text-align: left;
		margin-bottom: 1.5rem;
	}

	.warning-text {
		font-size: 0.9375rem;
		font-weight: 500;
		color: #ef4444;
		margin: 0 0 0.75rem 0;
		text-align: center;
	}

	.consequences {
		margin: 0;
		padding-left: 1.25rem;
		font-size: 0.875rem;
		color: var(--editor-text-secondary);
		line-height: 1.6;
	}

	.consequences li {
		margin-bottom: 0.375rem;
	}

	.consequences li:last-child {
		margin-bottom: 0;
	}

	.shared-warning {
		color: #f59e0b;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		width: 100%;
	}

	.cancel-button,
	.delete-button {
		flex: 1;
		padding: 0.625rem 1rem;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 100ms ease, opacity 100ms ease;
	}

	.cancel-button {
		border: 1px solid var(--editor-border);
		background: transparent;
		color: var(--editor-text);
	}

	.cancel-button:hover:not(:disabled) {
		background: var(--toolbar-button-hover);
	}

	.delete-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border: none;
		background: #ef4444;
		color: white;
	}

	.delete-button:hover:not(:disabled) {
		background: #dc2626;
	}

	.cancel-button:disabled,
	.delete-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
