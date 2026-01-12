<!--
	ShareDocumentModal.svelte

	Full sharing management modal for documents.
	Allows sharing with specific Areas or entire Space.
-->
<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import type { Document } from '$lib/types/documents';
	import type { Area } from '$lib/types/areas';
	import { areaStore } from '$lib/stores/areas.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	interface Props {
		open: boolean;
		document: Document | null;
		spaceId: string;
		onClose: () => void;
		onSaved: () => void;
	}

	let { open, document, spaceId, onClose, onSaved }: Props = $props();

	// State
	let isEntireSpace = $state(false);
	let selectedAreaIds = $state<Set<string>>(new Set());
	let notifyMembers = $state(true);
	let isSaving = $state(false);
	let isLoading = $state(true);
	let areas = $state<Area[]>([]);
	let initialSharedAreaIds = $state<string[]>([]);
	let initialVisibility = $state<string>('private');

	// Derived
	let willBecomePrivate = $derived(!isEntireSpace && selectedAreaIds.size === 0);
	let currentVisibilityLabel = $derived.by(() => {
		if (!document) return '';
		if (initialVisibility === 'space') return 'Shared with entire Space';
		if (initialVisibility === 'areas') return `Shared with ${initialSharedAreaIds.length} Area(s)`;
		return 'Private (only you)';
	});

	// Load data when modal opens
	$effect(() => {
		if (open && document && spaceId) {
			loadData();
		}
	});

	async function loadData() {
		isLoading = true;
		try {
			// Load areas for this space
			await areaStore.loadAreas(spaceId);
			areas = areaStore.getAreasForSpace(spaceId);

			// Load current sharing info
			const response = await fetch(`/api/documents/${document!.id}/share`);
			if (response.ok) {
				const data = await response.json();
				initialSharedAreaIds = data.sharing.sharedAreas.map((a: { areaId: string }) => a.areaId);
				initialVisibility = data.sharing.visibility;

				// Set initial state based on current visibility
				if (data.sharing.visibility === 'space') {
					isEntireSpace = true;
					selectedAreaIds = new Set();
				} else if (data.sharing.visibility === 'areas') {
					isEntireSpace = false;
					selectedAreaIds = new Set(initialSharedAreaIds);
				} else {
					isEntireSpace = false;
					selectedAreaIds = new Set();
				}
			}
		} catch (e) {
			toastStore.error('Failed to load sharing info');
		} finally {
			isLoading = false;
		}
	}

	function handleEntireSpaceChange(checked: boolean) {
		isEntireSpace = checked;
		if (checked) {
			selectedAreaIds = new Set();
		}
	}

	function handleAreaToggle(areaId: string) {
		const newSet = new Set(selectedAreaIds);
		if (newSet.has(areaId)) {
			newSet.delete(areaId);
		} else {
			newSet.add(areaId);
		}
		selectedAreaIds = newSet;

		// Uncheck "Entire Space" if any area is selected
		if (selectedAreaIds.size > 0) {
			isEntireSpace = false;
		}
	}

	async function handleSave() {
		if (!document) return;

		isSaving = true;
		try {
			// Determine visibility
			let visibility: 'private' | 'areas' | 'space';
			if (isEntireSpace) {
				visibility = 'space';
			} else if (selectedAreaIds.size > 0) {
				visibility = 'areas';
			} else {
				visibility = 'private';
			}

			const response = await fetch(`/api/documents/${document.id}/share`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					visibility,
					areaIds: visibility === 'areas' ? Array.from(selectedAreaIds) : []
				})
			});

			if (!response.ok) {
				throw new Error('Failed to update sharing');
			}

			onSaved();
		} catch (e) {
			toastStore.error('Failed to update sharing');
		} finally {
			isSaving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isSaving) {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && !isSaving) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && document}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
		role="presentation"
	>
		<!-- Modal -->
		<div
			class="modal"
			transition:fly={{ y: 20, duration: 200 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="share-modal-title"
		>
			<!-- Header -->
			<div class="modal-header">
				<h2 id="share-modal-title">Share "{document.title || document.filename}"</h2>
				<button
					type="button"
					class="close-btn"
					onclick={onClose}
					disabled={isSaving}
					aria-label="Close"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div class="modal-content">
				{#if isLoading}
					<div class="loading">Loading sharing info...</div>
				{:else}
					<!-- Current status -->
					<div class="current-status">
						Currently: {currentVisibilityLabel}
					</div>

					<div class="divider"></div>

					<!-- Share options -->
					<div class="share-options">
						<div class="section-label">Share with:</div>

						<!-- Entire Space option -->
						<label class="option-item entire-space">
							<input
								type="checkbox"
								checked={isEntireSpace}
								onchange={(e) => handleEntireSpaceChange(e.currentTarget.checked)}
								disabled={isSaving}
							/>
							<span class="option-label">Entire Space</span>
							<span class="option-meta">(all members)</span>
						</label>

						<div class="area-divider">
							<span>Or select specific Areas</span>
						</div>

						<!-- Area list -->
						<div class="area-list">
							{#each areas.filter((a) => !a.isGeneral) as area}
								<label class="option-item area-item">
									<input
										type="checkbox"
										checked={selectedAreaIds.has(area.id)}
										onchange={() => handleAreaToggle(area.id)}
										disabled={isSaving || isEntireSpace}
									/>
									<span class="option-label">{area.name}</span>
								</label>
							{/each}
							{#if areas.filter((a) => !a.isGeneral).length === 0}
								<div class="no-areas">No Areas available in this Space</div>
							{/if}
						</div>

						<!-- Private warning -->
						{#if willBecomePrivate}
							<div class="private-warning">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
								<span>Document will become private</span>
							</div>
						{/if}
					</div>

					<div class="divider"></div>

					<!-- Notify option -->
					<label class="option-item notify-option">
						<input
							type="checkbox"
							bind:checked={notifyMembers}
							disabled={isSaving || willBecomePrivate}
						/>
						<span class="option-label">Notify members when shared</span>
					</label>
				{/if}
			</div>

			<!-- Footer -->
			<div class="modal-footer">
				<button type="button" class="btn-secondary" onclick={onClose} disabled={isSaving}>
					Cancel
				</button>
				<button
					type="button"
					class="btn-primary"
					onclick={handleSave}
					disabled={isSaving || isLoading}
				>
					{#if isSaving}
						Saving...
					{:else}
						Save Changes
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal {
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
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.modal-header h2 {
		font-size: 1rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
		flex-shrink: 0;
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
		max-height: 60vh;
		overflow-y: auto;
	}

	.loading {
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		padding: 2rem;
	}

	.current-status {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		margin-bottom: 1rem;
	}

	.divider {
		height: 1px;
		background: rgba(255, 255, 255, 0.08);
		margin: 1rem 0;
	}

	.share-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.section-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 0.5rem;
	}

	.option-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.option-item:hover:not(:has(input:disabled)) {
		background: rgba(255, 255, 255, 0.05);
	}

	.option-item input[type='checkbox'] {
		width: 1rem;
		height: 1rem;
		accent-color: #3b82f6;
		cursor: pointer;
	}

	.option-item input[type='checkbox']:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.option-label {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.option-meta {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.area-divider {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 0.75rem 0;
	}

	.area-divider::before,
	.area-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: rgba(255, 255, 255, 0.08);
	}

	.area-divider span {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		white-space: nowrap;
	}

	.area-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		max-height: 200px;
		overflow-y: auto;
	}

	.area-item {
		padding-left: 1.5rem;
	}

	.no-areas {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.4);
		padding: 0.75rem 1.5rem;
		font-style: italic;
	}

	.private-warning {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: rgba(234, 179, 8, 0.1);
		border: 1px solid rgba(234, 179, 8, 0.2);
		border-radius: 0.5rem;
		margin-top: 0.75rem;
	}

	.private-warning svg {
		width: 1rem;
		height: 1rem;
		color: rgb(234, 179, 8);
		flex-shrink: 0;
	}

	.private-warning span {
		font-size: 0.8125rem;
		color: rgb(234, 179, 8);
	}

	.notify-option {
		margin-top: 0.5rem;
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
		background: #3b82f6;
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
