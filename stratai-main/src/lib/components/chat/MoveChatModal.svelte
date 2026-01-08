<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import type { Conversation } from '$lib/types/chat';
	import type { Space } from '$lib/types/spaces';
	import type { Area } from '$lib/types/areas';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { areaStore } from '$lib/stores/areas.svelte';
	import SpaceIcon from '$lib/components/SpaceIcon.svelte';
	import type { SpaceType } from '$lib/types/chat';

	interface Props {
		conversation: Conversation;
		onMove: (spaceId: string | null, areaId: string | null) => void;
		onClose: () => void;
	}

	let { conversation, onMove, onClose }: Props = $props();

	// Selected destination
	let selectedSpaceId = $state<string | null>(conversation.spaceId ?? null);
	let selectedAreaId = $state<string | null>(conversation.areaId ?? null);

	// Loading state for areas
	let loadingAreas = $state(false);

	// Get all spaces
	let spaces = $derived(Array.from(spacesStore.spaces.values()));

	// Get areas for selected space
	let areasForSelectedSpace = $derived.by(() => {
		if (!selectedSpaceId) return [];
		return areaStore.areasBySpace.get(selectedSpaceId) || [];
	});

	// Get current location info
	let currentSpace = $derived.by(() => {
		if (!conversation.spaceId) return null;
		return spacesStore.getSpaceById(conversation.spaceId);
	});

	let currentArea = $derived.by(() => {
		if (!conversation.areaId) return null;
		return areaStore.getAreaById(conversation.areaId);
	});

	let currentLocationText = $derived.by(() => {
		if (!currentSpace) return 'Main Chat';
		if (currentArea) return `${currentSpace.name} → ${currentArea.name}`;
		return currentSpace.name;
	});

	// Get selected space object for color
	let selectedSpace = $derived.by(() => {
		if (!selectedSpaceId) return null;
		return spacesStore.getSpaceById(selectedSpaceId);
	});

	// Check if destination is different from current
	let hasChanges = $derived(
		selectedSpaceId !== (conversation.spaceId ?? null) ||
		selectedAreaId !== (conversation.areaId ?? null)
	);

	// Load areas when space changes
	async function handleSpaceChange(spaceId: string | null) {
		selectedSpaceId = spaceId;
		selectedAreaId = null;

		if (spaceId) {
			loadingAreas = true;
			await areaStore.loadAreas(spaceId);
			loadingAreas = false;

			// Auto-select General area if available
			const areas = areaStore.areasBySpace.get(spaceId) || [];
			const generalArea = areas.find((a: Area) => a.isGeneral);
			if (generalArea) {
				selectedAreaId = generalArea.id;
			}
		}
	}

	function handleMove() {
		onMove(selectedSpaceId, selectedAreaId);
	}

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

	// Load areas for current selection on mount
	$effect(() => {
		if (selectedSpaceId && !areaStore.areasBySpace.has(selectedSpaceId)) {
			areaStore.loadAreas(selectedSpaceId);
		}
	});
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
		<!-- Header -->
		<div class="modal-header">
			<div class="header-text">
				<h3 class="modal-title">Move Chat</h3>
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

		<!-- Current Location -->
		<div class="current-location">
			<span class="location-label">Currently in:</span>
			<span class="location-value">{currentLocationText}</span>
		</div>

		<!-- Destination Selection -->
		<div class="destination-section">
			<label class="section-label">Move to:</label>

			<!-- Space Selection -->
			<div class="space-options">
				<!-- Main Chat option -->
				<button
					type="button"
					class="space-option"
					class:selected={selectedSpaceId === null}
					onclick={() => handleSpaceChange(null)}
				>
					<div class="space-icon-wrapper" style:--space-color="#6b7280">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
						</svg>
					</div>
					<span class="space-name">Main Chat</span>
					{#if selectedSpaceId === null}
						<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					{/if}
				</button>

				<!-- Space options -->
				{#each spaces as space (space.id)}
					<button
						type="button"
						class="space-option"
						class:selected={selectedSpaceId === space.id}
						onclick={() => handleSpaceChange(space.id)}
						style:--space-color={space.color}
					>
						<div class="space-icon-wrapper">
							<SpaceIcon space={space.slug as SpaceType} size="sm" />
						</div>
						<span class="space-name">{space.name}</span>
						{#if selectedSpaceId === space.id}
							<svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						{/if}
					</button>
				{/each}
			</div>

			<!-- Area Selection (only if space is selected) -->
			{#if selectedSpaceId}
				<div class="area-section" transition:fade={{ duration: 150 }}>
					<label class="area-label">Area:</label>
					{#if loadingAreas}
						<div class="loading-areas">Loading areas...</div>
					{:else if areasForSelectedSpace.length > 0}
						<select
							class="area-select"
							bind:value={selectedAreaId}
							style:--space-color={selectedSpace?.color || '#6366f1'}
						>
							{#each areasForSelectedSpace as area (area.id)}
								<option value={area.id}>
									{area.name}{area.isGeneral ? ' (default)' : ''}
								</option>
							{/each}
						</select>
					{:else}
						<div class="no-areas">No areas available</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="modal-actions">
			<button type="button" class="btn-cancel" onclick={onClose}>
				Cancel
			</button>
			<button
				type="button"
				class="btn-move"
				disabled={!hasChanges}
				onclick={handleMove}
				style:--accent-color={selectedSpace?.color || '#6366f1'}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
				</svg>
				Move
			</button>
		</div>
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
		max-width: 420px;
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
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.header-text {
		flex: 1;
		min-width: 0;
	}

	.modal-title {
		font-size: 1.125rem;
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

	.current-location {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: #27272a;
		border-radius: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.location-label {
		font-size: 0.8125rem;
		color: #71717a;
	}

	.location-value {
		font-size: 0.8125rem;
		font-weight: 500;
		color: #e4e4e7;
	}

	.destination-section {
		margin-bottom: 1.5rem;
	}

	.section-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
		margin-bottom: 0.75rem;
	}

	.space-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.space-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1rem;
		background-color: #27272a;
		border: 1px solid #3f3f46;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
	}

	.space-option:hover {
		background-color: #3f3f46;
		border-color: #52525b;
	}

	.space-option.selected {
		background-color: color-mix(in srgb, var(--space-color, #6366f1) 15%, #27272a);
		border-color: var(--space-color, #6366f1);
	}

	.space-icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: color-mix(in srgb, var(--space-color, #6366f1) 20%, transparent);
		border-radius: 0.375rem;
		color: var(--space-color, #6366f1);
	}

	.space-name {
		flex: 1;
		font-size: 0.875rem;
		font-weight: 500;
		color: #e4e4e7;
	}

	.check-icon {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--space-color, #6366f1);
	}

	.area-section {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #3f3f46;
	}

	.area-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
		margin-bottom: 0.5rem;
	}

	.area-select {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		background-color: #27272a;
		border: 1px solid #3f3f46;
		border-radius: 0.5rem;
		color: #e4e4e7;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.area-select:hover {
		border-color: #52525b;
	}

	.area-select:focus {
		outline: none;
		border-color: var(--space-color, #6366f1);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--space-color, #6366f1) 25%, transparent);
	}

	.loading-areas,
	.no-areas {
		padding: 0.75rem 1rem;
		font-size: 0.8125rem;
		color: #71717a;
		background-color: #27272a;
		border-radius: 0.5rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.btn-cancel {
		padding: 0.625rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #a1a1aa;
		background: none;
		border: 1px solid #3f3f46;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-cancel:hover {
		color: #fafafa;
		border-color: #52525b;
	}

	.btn-move {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #fafafa;
		background-color: var(--accent-color, #6366f1);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-move:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.btn-move:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
