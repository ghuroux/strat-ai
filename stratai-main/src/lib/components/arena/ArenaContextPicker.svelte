<script lang="ts">
	/**
	 * ArenaContextPicker - Select Space/Area context for Arena battles
	 *
	 * Allows users to optionally add context from a Space's Area
	 * to their Arena prompt. The Area's context will be prepended
	 * to the prompt when starting the battle.
	 */
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { areaStore } from '$lib/stores/areas.svelte';
	import type { Area } from '$lib/types/areas';
	import { ChevronDown, CheckCircle } from 'lucide-svelte';

	interface Props {
		selectedSpaceId: string | null;
		selectedAreaId: string | null;
		onSelect: (spaceId: string | null, areaId: string | null) => void;
		disabled?: boolean;
	}

	let { selectedSpaceId, selectedAreaId, onSelect, disabled = false }: Props = $props();

	// Get spaces from store
	let spaces = $derived([...spacesStore.getSystemSpaces(), ...spacesStore.getCustomSpaces()]);

	// Get areas for selected space
	let areas = $derived.by((): Area[] => {
		if (!selectedSpaceId) return [];
		return areaStore.getAreasForSpace(selectedSpaceId);
	});

	// Get selected area's context preview
	let selectedAreaContext = $derived.by(() => {
		if (!selectedAreaId) return null;
		const area = areaStore.getAreaById(selectedAreaId);
		return area?.context || null;
	});

	// Get display names
	let selectedSpaceName = $derived.by(() => {
		if (!selectedSpaceId) return null;
		const space = spaces.find(s => s.id === selectedSpaceId);
		return space?.name || null;
	});

	let selectedAreaName = $derived.by(() => {
		if (!selectedAreaId) return null;
		const area = areas.find(a => a.id === selectedAreaId);
		return area?.name || null;
	});

	function handleSpaceChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const spaceId = target.value || null;
		onSelect(spaceId, null); // Clear area when space changes

		// Load areas for the selected space
		if (spaceId) {
			areaStore.loadAreas(spaceId);
		}
	}

	function handleAreaChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const areaId = target.value || null;
		onSelect(selectedSpaceId, areaId);
	}

	function handleClear() {
		onSelect(null, null);
	}

	// Truncate context for preview
	function truncateContext(text: string, maxLength: number = 100): string {
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength) + '...';
	}
</script>

<div class="context-picker" class:disabled>
	<div class="picker-header">
		<span class="label">Context</span>
		<span class="hint">(optional)</span>
		{#if selectedSpaceId || selectedAreaId}
			<button type="button" class="clear-btn" onclick={handleClear}>
				Clear
			</button>
		{/if}
	</div>

	<div class="picker-row">
		<!-- Space selector (left half) -->
		<div class="select-wrapper half">
			<select
				class="select"
				value={selectedSpaceId || ''}
				onchange={handleSpaceChange}
				{disabled}
			>
				<option value="">No space</option>
				{#each spaces as space}
					<option value={space.id}>{space.name}</option>
				{/each}
			</select>
			<ChevronDown class="select-arrow" />
		</div>

		<!-- Area selector (right half, only if space is selected) -->
		{#if selectedSpaceId}
			<div class="select-wrapper half">
				<select
					class="select"
					value={selectedAreaId || ''}
					onchange={handleAreaChange}
					disabled={disabled || areas.length === 0}
				>
					<option value="">Select area...</option>
					{#each areas as area}
						<option value={area.id}>
							{area.icon || ''} {area.name}
							{#if area.context}(has context){/if}
						</option>
					{/each}
				</select>
				<ChevronDown class="select-arrow" />
			</div>
		{/if}
	</div>

	<!-- Context preview -->
	{#if selectedAreaContext}
		<div class="context-preview">
			<div class="preview-header">
				<CheckCircle class="w-3.5 h-3.5 text-green-500" />
				<span>Context from {selectedAreaName}</span>
			</div>
			<p class="preview-text">{truncateContext(selectedAreaContext, 150)}</p>
		</div>
	{:else if selectedAreaId}
		<div class="context-preview empty">
			<span>This area has no context defined</span>
		</div>
	{/if}
</div>

<style>
	.context-picker {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.context-picker.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.picker-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.label {
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.hint {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.clear-btn {
		margin-left: auto;
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.25rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.clear-btn:hover {
		color: rgba(255, 255, 255, 0.8);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.picker-row {
		display: flex;
		gap: 1rem;
	}

	.select-wrapper {
		position: relative;
	}

	.select-wrapper.half {
		flex: 0 0 calc(50% - 0.5rem);
		min-width: 150px;
	}

	.select {
		width: 100%;
		padding: 0.5rem 2rem 0.5rem 0.75rem;
		font-size: 0.8125rem;
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

	:global(.select-arrow) {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.4);
		pointer-events: none;
	}

	.context-preview {
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
	}

	.context-preview.empty {
		text-align: center;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.4);
		font-style: italic;
	}

	.preview-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		margin-bottom: 0.375rem;
	}

	.preview-text {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.4;
		margin: 0;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.picker-row {
			flex-direction: column;
			gap: 0.5rem;
		}

		.select-wrapper.half {
			flex: none;
			width: 100%;
			min-width: unset;
		}
	}
</style>
