<!--
	UploadSharePrompt.svelte

	Modal shown after uploading a document in Area context.
	Asks user whether to share with the current Area or keep private.
-->
<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import type { Document } from '$lib/types/documents';
	import type { Area } from '$lib/types/areas';

	interface Props {
		open: boolean;
		document: Document | null;
		area: Area;
		areaColor?: string;
		onKeepPrivate: () => void;
		onShareWithArea: () => void;
	}

	let {
		open,
		document,
		area,
		areaColor = '#3b82f6',
		onKeepPrivate,
		onShareWithArea
	}: Props = $props();

	let isSharing = $state(false);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isSharing) {
			onKeepPrivate();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isSharing) {
			onKeepPrivate();
		}
	}

	async function handleShare() {
		isSharing = true;
		await onShareWithArea();
		isSharing = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && document}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
		role="presentation"
	>
		<!-- Modal -->
		<div
			class="modal"
			style="--area-color: {areaColor}"
			transition:fly={{ y: 20, duration: 200 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="share-prompt-title"
		>
			<!-- Header -->
			<div class="modal-header">
				<h2 id="share-prompt-title">Share with {area.name}?</h2>
				<button
					type="button"
					class="close-btn"
					onclick={onKeepPrivate}
					disabled={isSharing}
					aria-label="Close"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div class="modal-content">
				<div class="doc-preview">
					<div class="doc-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
							/>
						</svg>
					</div>
					<span class="doc-name">"{document.title || document.filename}"</span>
				</div>
				<p class="share-description">will be visible to all members of this Area.</p>
			</div>

			<!-- Footer -->
			<div class="modal-footer">
				<button type="button" class="btn-secondary" onclick={onKeepPrivate} disabled={isSharing}>
					Keep Private
				</button>
				<button type="button" class="btn-primary" onclick={handleShare} disabled={isSharing}>
					{#if isSharing}
						Sharing...
					{:else}
						Share with Area
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal {
		width: 100%;
		max-width: 24rem;
		background: rgb(23, 23, 23);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.modal-header h2 {
		font-size: 1rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
		margin: 0;
	}

	.close-btn {
		width: 1.75rem;
		height: 1.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.4);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.close-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.close-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.close-btn svg {
		width: 1rem;
		height: 1rem;
	}

	.modal-content {
		padding: 1.25rem;
	}

	.doc-preview {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.doc-icon {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--area-color) 15%, transparent);
		color: var(--area-color);
		border-radius: 0.375rem;
		flex-shrink: 0;
	}

	.doc-icon svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.doc-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.share-description {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0;
		line-height: 1.5;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.2);
	}

	.btn-secondary,
	.btn-primary {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.btn-secondary {
		color: rgba(255, 255, 255, 0.7);
		background: transparent;
	}

	.btn-secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.9);
	}

	.btn-primary {
		background: var(--area-color);
		color: #fff;
	}

	.btn-primary:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.btn-secondary:disabled,
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
