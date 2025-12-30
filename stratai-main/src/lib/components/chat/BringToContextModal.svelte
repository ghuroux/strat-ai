<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import type { Conversation } from '$lib/types/chat';
	import type { Space } from '$lib/types/spaces';
	import { spacesStore } from '$lib/stores/spaces.svelte';

	interface Props {
		conversation: Conversation;
		currentContext: {
			spaceId?: string | null;
			focusAreaId?: string | null;
			taskId?: string | null;
		};
		onOpenInOrigin: () => void;
		onBringHere: () => void;
		onClose: () => void;
	}

	let { conversation, currentContext, onOpenInOrigin, onBringHere, onClose }: Props = $props();

	// Get origin space info
	let originSpace = $derived.by(() => {
		if (!conversation.spaceId) return null;
		return spacesStore.getSpaceById(conversation.spaceId);
	});

	// Get current context space info
	let currentSpace = $derived.by(() => {
		if (!currentContext.spaceId) return null;
		return spacesStore.getSpaceById(currentContext.spaceId);
	});

	// Build origin name (e.g., "Work" or "Main")
	let originName = $derived.by(() => {
		if (!conversation.spaceId) return 'Main';
		return originSpace?.name || 'Unknown Space';
	});

	// Build current context name
	let currentContextName = $derived.by(() => {
		if (!currentContext.spaceId) return 'Main';
		return currentSpace?.name || 'this context';
	});

	// Get origin space color for visual indicator
	let originColor = $derived(originSpace?.color || '#6366f1');

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="modal-backdrop"
	onclick={handleBackdropClick}
	transition:fade={{ duration: 150 }}
>
	<div
		class="modal-content"
		transition:fly={{ y: 20, duration: 200 }}
	>
		<!-- Header with origin indicator -->
		<div class="modal-header">
			<div class="origin-indicator" style:background-color={originColor}></div>
			<div class="header-text">
				<h3 class="modal-title">This chat is from {originName}</h3>
				<p class="modal-subtitle">"{conversation.title}"</p>
			</div>
			<button
				type="button"
				class="close-button"
				onclick={onClose}
				aria-label="Close"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Description -->
		<p class="modal-description">
			This conversation belongs to a different context. What would you like to do?
		</p>

		<!-- Actions -->
		<div class="modal-actions">
			<button
				type="button"
				class="action-button action-origin"
				style:--action-color={originColor}
				onclick={onOpenInOrigin}
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
				</svg>
				<div class="action-text">
					<span class="action-label">Open in {originName}</span>
					<span class="action-hint">Navigate to original context</span>
				</div>
			</button>

			<button
				type="button"
				class="action-button action-bring"
				onclick={onBringHere}
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
				</svg>
				<div class="action-text">
					<span class="action-label">Bring to {currentContextName}</span>
					<span class="action-hint">Move chat to current context</span>
				</div>
			</button>
		</div>

		<!-- Cancel link -->
		<button type="button" class="cancel-link" onclick={onClose}>
			Cancel
		</button>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		z-index: 100;
	}

	.modal-content {
		width: 100%;
		max-width: 400px;
		margin: 1rem;
		padding: 1.5rem;
		background-color: #18181b;
		border: 1px solid #3f3f46;
		border-radius: 1rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.origin-indicator {
		width: 4px;
		height: 100%;
		min-height: 48px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.header-text {
		flex: 1;
		min-width: 0;
	}

	.modal-title {
		font-size: 1rem;
		font-weight: 600;
		color: #fafafa;
		margin: 0;
	}

	.modal-subtitle {
		font-size: 0.875rem;
		color: #a1a1aa;
		margin: 0.25rem 0 0 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.close-button {
		padding: 0.25rem;
		color: #71717a;
		background: none;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.close-button:hover {
		color: #fafafa;
	}

	.modal-description {
		font-size: 0.875rem;
		color: #a1a1aa;
		margin: 0 0 1.25rem 0;
		line-height: 1.5;
	}

	.modal-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.action-button {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.875rem 1rem;
		text-align: left;
		background-color: #27272a;
		border: 1px solid #3f3f46;
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-button:hover {
		background-color: #3f3f46;
		border-color: #52525b;
	}

	.action-button svg {
		flex-shrink: 0;
		color: #a1a1aa;
	}

	.action-origin:hover {
		border-color: var(--action-color);
	}

	.action-origin:hover svg {
		color: var(--action-color);
	}

	.action-bring:hover {
		border-color: #6366f1;
	}

	.action-bring:hover svg {
		color: #6366f1;
	}

	.action-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.action-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #fafafa;
	}

	.action-hint {
		font-size: 0.75rem;
		color: #71717a;
	}

	.cancel-link {
		display: block;
		width: 100%;
		margin-top: 1rem;
		padding: 0.5rem;
		font-size: 0.875rem;
		color: #71717a;
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.15s ease;
	}

	.cancel-link:hover {
		color: #a1a1aa;
	}
</style>
