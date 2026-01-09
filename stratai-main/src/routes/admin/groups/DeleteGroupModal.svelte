<script lang="ts">
	interface GroupData {
		id: string;
		name: string;
		memberCount: number;
	}

	interface Props {
		group: GroupData;
		onclose: () => void;
		ondeleted: () => void;
	}

	let { group, onclose, ondeleted }: Props = $props();

	let isDeleting = $state(false);
	let error = $state('');
	let confirmName = $state('');

	const requiresConfirmation = group.memberCount > 0;

	async function handleDelete() {
		if (requiresConfirmation && confirmName !== group.name) {
			error = 'Please type the group name to confirm deletion';
			return;
		}

		error = '';
		isDeleting = true;

		try {
			const response = await fetch(`/api/admin/groups/${group.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to delete group');
			}

			ondeleted();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete group';
		} finally {
			isDeleting = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="modal-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="modal-title">
	<div class="modal">
		<header class="modal-header">
			<div class="header-icon danger">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			</div>
			<h2 id="modal-title">Delete Group</h2>
			<button class="btn-close" onclick={onclose} aria-label="Close">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</header>

		<div class="modal-body">
			{#if error}
				<div class="error-message">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			{/if}

			<p class="warning-text">
				Are you sure you want to delete <strong>{group.name}</strong>?
			</p>

			{#if group.memberCount > 0}
				<div class="warning-box">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					<div>
						<p><strong>{group.memberCount} member{group.memberCount === 1 ? '' : 's'}</strong> will be removed from this group.</p>
						<p class="sub">Members will retain their organization access but lose any group-specific settings.</p>
					</div>
				</div>

				<div class="confirm-section">
					<label for="confirm-name">
						Type <strong>{group.name}</strong> to confirm:
					</label>
					<input
						type="text"
						id="confirm-name"
						bind:value={confirmName}
						placeholder="Type group name"
						autocomplete="off"
					/>
				</div>
			{:else}
				<p class="info-text">
					This group has no members. It can be safely deleted.
				</p>
			{/if}

			<p class="permanent-notice">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				This action cannot be undone.
			</p>
		</div>

		<footer class="modal-footer">
			<button class="btn-secondary" onclick={onclose} disabled={isDeleting}>
				Cancel
			</button>
			<button
				class="btn-danger"
				onclick={handleDelete}
				disabled={isDeleting || (requiresConfirmation && confirmName !== group.name)}
			>
				{#if isDeleting}
					<svg class="spinner" viewBox="0 0 24 24">
						<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="60" stroke-linecap="round" />
					</svg>
					Deleting...
				{:else}
					Delete Group
				{/if}
			</button>
		</footer>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgb(0 0 0 / 0.6);
		backdrop-filter: blur(4px);
	}

	.modal {
		width: 100%;
		max-width: 440px;
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.75rem;
		box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5);
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-surface-800);
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 9999px;
	}

	.header-icon.danger {
		color: var(--color-error-400);
		background: color-mix(in srgb, var(--color-error-500) 15%, transparent);
	}

	.modal-header h2 {
		flex: 1;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-surface-100);
	}

	.btn-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		color: var(--color-surface-400);
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-close:hover {
		color: var(--color-surface-200);
		background: var(--color-surface-800);
	}

	.modal-body {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		color: var(--color-error-300);
		background: color-mix(in srgb, var(--color-error-500) 15%, transparent);
		border: 1px solid var(--color-error-500);
		border-radius: 0.5rem;
	}

	.warning-text {
		font-size: 0.9375rem;
		color: var(--color-surface-200);
		line-height: 1.5;
	}

	.warning-text strong {
		color: var(--color-surface-100);
	}

	.warning-box {
		display: flex;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: color-mix(in srgb, var(--color-warning-500) 10%, transparent);
		border: 1px solid var(--color-warning-500);
		border-radius: 0.5rem;
	}

	.warning-box svg {
		flex-shrink: 0;
		color: var(--color-warning-400);
	}

	.warning-box p {
		font-size: 0.875rem;
		color: var(--color-surface-200);
		line-height: 1.5;
	}

	.warning-box p strong {
		color: var(--color-surface-100);
	}

	.warning-box .sub {
		margin-top: 0.25rem;
		font-size: 0.8125rem;
		color: var(--color-surface-400);
	}

	.info-text {
		font-size: 0.875rem;
		color: var(--color-surface-400);
	}

	.confirm-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.confirm-section label {
		font-size: 0.875rem;
		color: var(--color-surface-300);
	}

	.confirm-section strong {
		color: var(--color-surface-100);
		font-family: monospace;
		background: var(--color-surface-800);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	.confirm-section input {
		padding: 0.625rem 0.75rem;
		font-size: 0.875rem;
		color: var(--color-surface-100);
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.confirm-section input:focus {
		border-color: var(--color-error-500);
	}

	.confirm-section input::placeholder {
		color: var(--color-surface-500);
	}

	.permanent-notice {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: var(--color-surface-400);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--color-surface-800);
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-300);
		background: transparent;
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary:hover:not(:disabled) {
		color: var(--color-surface-100);
		border-color: var(--color-surface-600);
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-danger {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: var(--color-error-500);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-danger:hover:not(:disabled) {
		background: var(--color-error-600);
	}

	.btn-danger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
