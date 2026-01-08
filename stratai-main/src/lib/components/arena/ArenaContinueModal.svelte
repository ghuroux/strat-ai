<script lang="ts">
	/**
	 * ArenaContinueModal - Continue battle conversation in a Space/Area
	 *
	 * Shows after user votes, allowing them to continue the conversation
	 * with the winning model in their workspace.
	 */
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { areaStore } from '$lib/stores/areas.svelte';
	import type { Area } from '$lib/types/areas';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		isOpen: boolean;
		winnerModelId: string;
		winnerModelName: string;
		battleContextSpaceId?: string;
		battleContextAreaId?: string;
		onConfirm: (spaceId: string | null, areaId: string | null) => void;
		onClose: () => void;
	}

	let {
		isOpen,
		winnerModelId,
		winnerModelName,
		battleContextSpaceId,
		battleContextAreaId,
		onConfirm,
		onClose
	}: Props = $props();

	// Pre-fill from battle context if available
	let selectedSpaceId = $state<string | null>(battleContextSpaceId || null);
	let selectedAreaId = $state<string | null>(battleContextAreaId || null);

	// Sync with battle context when modal opens
	$effect(() => {
		if (isOpen) {
			selectedSpaceId = battleContextSpaceId || null;
			selectedAreaId = battleContextAreaId || null;
		}
	});

	// Get spaces from store
	let spaces = $derived([...spacesStore.getSystemSpaces(), ...spacesStore.getCustomSpaces()]);

	// Get areas for selected space
	let areas = $derived.by((): Area[] => {
		if (!selectedSpaceId) return [];
		return areaStore.getAreasForSpace(selectedSpaceId);
	});

	function handleSpaceChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const spaceId = target.value || null;
		selectedSpaceId = spaceId;
		selectedAreaId = null; // Clear area when space changes

		// Load areas for the selected space
		if (spaceId) {
			areaStore.loadAreas(spaceId);
		}
	}

	function handleAreaChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedAreaId = target.value || null;
	}

	function handleConfirm() {
		onConfirm(selectedSpaceId, selectedAreaId);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

{#if isOpen}
	<!-- Backdrop -->
	<button
		type="button"
		class="backdrop"
		onclick={onClose}
		onkeydown={handleKeydown}
		transition:fade={{ duration: 150 }}
		aria-label="Close modal"
	></button>

	<!-- Modal -->
	<div
		class="modal"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		transition:fly={{ y: 20, duration: 200 }}
	>
		<div class="modal-header">
			<h2 id="modal-title" class="modal-title">Continue Conversation</h2>
			<button type="button" class="close-btn" onclick={onClose} aria-label="Close">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<div class="modal-body">
			<p class="description">
				Continue this conversation with <strong>{winnerModelName}</strong> in your workspace.
			</p>

			<div class="fields">
				<!-- Space selector -->
				<div class="field">
					<label class="field-label" for="space-select">Space</label>
					<div class="select-wrapper">
						<select
							id="space-select"
							class="select"
							value={selectedSpaceId || ''}
							onchange={handleSpaceChange}
						>
							<option value="">Select a space...</option>
							{#each spaces as space}
								<option value={space.id}>{space.name}</option>
							{/each}
						</select>
						<svg class="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
						</svg>
					</div>
				</div>

				<!-- Area selector -->
				{#if selectedSpaceId}
					<div class="field">
						<label class="field-label" for="area-select">Area</label>
						<div class="select-wrapper">
							<select
								id="area-select"
								class="select"
								value={selectedAreaId || ''}
								onchange={handleAreaChange}
								disabled={areas.length === 0}
							>
								<option value="">Select an area...</option>
								{#each areas as area}
									<option value={area.id}>{area.icon || ''} {area.name}</option>
								{/each}
							</select>
							<svg class="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
							</svg>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<div class="modal-footer">
			<button type="button" class="btn-cancel" onclick={onClose}>
				Cancel
			</button>
			<button type="button" class="btn-continue" onclick={handleConfirm}>
				Continue
			</button>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		border: none;
		cursor: default;
	}

	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 101;
		width: 90%;
		max-width: 400px;
		background: #1a1a1a;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.modal-title {
		font-size: 1rem;
		font-weight: 600;
		color: #fff;
		margin: 0;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		color: rgba(255, 255, 255, 0.4);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.close-btn svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.modal-body {
		padding: 1.25rem;
	}

	.description {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		margin: 0 0 1.25rem 0;
		line-height: 1.5;
	}

	.description strong {
		color: #fff;
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.select-wrapper {
		position: relative;
	}

	.select {
		width: 100%;
		padding: 0.625rem 2.5rem 0.625rem 0.875rem;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		cursor: pointer;
		appearance: none;
		transition: all 0.15s ease;
	}

	.select:hover:not(:disabled) {
		border-color: rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.08);
	}

	.select:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.3);
	}

	.select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.select option {
		background: #1e1e1e;
		color: #fff;
	}

	.select-arrow {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.4);
		pointer-events: none;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.btn-cancel {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-cancel:hover {
		color: rgba(255, 255, 255, 0.9);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.btn-continue {
		padding: 0.5rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #fff;
		background: linear-gradient(135deg, #3b82f6, #8b5cf6);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-continue:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}
</style>
