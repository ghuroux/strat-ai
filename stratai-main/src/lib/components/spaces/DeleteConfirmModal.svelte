<script lang="ts">
	/**
	 * DeleteConfirmModal - Styled confirmation modal for task deletion
	 *
	 * Shows what will be deleted and optionally offers to delete linked conversations.
	 */
	import { fly, fade } from 'svelte/transition';
	import type { Task } from '$lib/types/tasks';
	import { taskStore } from '$lib/stores/tasks.svelte';

	interface Props {
		open: boolean;
		task: Task | null;
		spaceColor?: string;
		onClose: () => void;
		onConfirm: (deleteConversations: boolean) => void;
	}

	let {
		open,
		task,
		spaceColor = '#3b82f6',
		onClose,
		onConfirm
	}: Props = $props();

	// State
	let deleteConversations = $state(false);
	let isDeleting = $state(false);

	// Get deletion info
	let deletionInfo = $derived.by(() => {
		if (!task) return { subtaskCount: 0, conversationCount: 0 };
		return taskStore.getTaskDeletionInfo(task.id);
	});

	// Reset state when modal opens
	$effect(() => {
		if (open) {
			deleteConversations = false;
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

	async function handleDelete() {
		isDeleting = true;
		onConfirm(deleteConversations);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && task}
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
			style="--space-color: {spaceColor}"
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-modal-title"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<!-- Header -->
			<header class="modal-header">
				<div class="warning-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
					</svg>
				</div>
				<h2 id="delete-modal-title" class="modal-title">Delete Task</h2>
			</header>

			<!-- Content -->
			<div class="modal-content">
				<p class="confirm-text">
					Are you sure you want to delete <strong>"{task.title}"</strong>?
				</p>

				<!-- What will be deleted -->
				{#if deletionInfo.subtaskCount > 0 || deletionInfo.conversationCount > 0}
					<div class="deletion-info">
						<p class="deletion-heading">This will also delete:</p>
						<ul class="deletion-list">
							{#if deletionInfo.subtaskCount > 0}
								<li>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
									</svg>
									<span>{deletionInfo.subtaskCount} subtask{deletionInfo.subtaskCount !== 1 ? 's' : ''}</span>
								</li>
							{/if}
						</ul>
					</div>
				{/if}

				<!-- Conversation option -->
				{#if deletionInfo.conversationCount > 0}
					<label class="conversation-option">
						<input
							type="checkbox"
							bind:checked={deleteConversations}
							disabled={isDeleting}
						/>
						<span class="checkbox-label">
							Also delete {deletionInfo.conversationCount} linked conversation{deletionInfo.conversationCount !== 1 ? 's' : ''}
						</span>
					</label>
				{/if}

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
					onclick={handleDelete}
					disabled={isDeleting}
				>
					{isDeleting ? 'Deleting...' : 'Delete Task'}
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

	.deletion-info {
		padding: 0.875rem 1rem;
		background: rgba(239, 68, 68, 0.08);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	.deletion-heading {
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 0.5rem 0;
	}

	.deletion-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.deletion-list li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #fca5a5;
	}

	.deletion-list svg {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.conversation-option {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.conversation-option:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.12);
	}

	.conversation-option input[type="checkbox"] {
		width: 1rem;
		height: 1rem;
		margin-top: 0.125rem;
		accent-color: #ef4444;
		cursor: pointer;
	}

	.checkbox-label {
		font-size: 0.875rem;
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
