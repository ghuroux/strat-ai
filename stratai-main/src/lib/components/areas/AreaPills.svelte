<script lang="ts">
	/**
	 * AreaPills - Horizontal scrollable pills for area selection
	 *
	 * Displays areas as pills within a space, with:
	 * - Selection state
	 * - Color-coded pills
	 * - Add button for creating new areas
	 * - General area marked specially
	 *
	 * Renamed from FocusAreaPills - see DESIGN-SPACES-AND-FOCUS-AREAS.md
	 */
	import type { Area } from '$lib/types/areas';

	interface Props {
		areas: Area[];
		selectedId: string | null;
		onSelect: (id: string | null) => void;
		onAdd: () => void;
		onEdit?: (area: Area) => void;
		spaceColor?: string;
		disabled?: boolean;
	}

	let {
		areas,
		selectedId,
		onSelect,
		onAdd,
		onEdit,
		spaceColor = '#6b7280',
		disabled = false
	}: Props = $props();

	// Default colors for areas without custom color
	const defaultColors = [
		'#3b82f6', // blue
		'#8b5cf6', // purple
		'#10b981', // green
		'#f59e0b', // amber
		'#ef4444', // red
		'#ec4899', // pink
		'#06b6d4', // cyan
		'#84cc16' // lime
	];

	function getPillColor(area: Area, index: number): string {
		if (area.color) return area.color;
		if (area.isGeneral) return spaceColor;
		return defaultColors[index % defaultColors.length];
	}

	function handlePillClick(id: string) {
		if (disabled) return;
		// Toggle selection: if already selected, deselect
		onSelect(selectedId === id ? null : id);
	}

	function handleKeydown(event: KeyboardEvent, id: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handlePillClick(id);
		}
	}
</script>

<div class="area-pills-container">
	<div class="area-pills">
		<!-- All Areas pill (deselect) -->
		<button
			type="button"
			class="area-pill"
			class:selected={selectedId === null}
			style="--pill-color: {spaceColor}"
			onclick={() => onSelect(null)}
			disabled={disabled}
		>
			<span class="pill-text">All</span>
		</button>

		<!-- Area pills -->
		{#each areas as area, index (area.id)}
			<div class="pill-group" class:selected={selectedId === area.id}>
				<button
					type="button"
					class="area-pill"
					class:selected={selectedId === area.id}
					class:general={area.isGeneral}
					style="--pill-color: {getPillColor(area, index)}"
					onclick={() => handlePillClick(area.id)}
					onkeydown={(e) => handleKeydown(e, area.id)}
					disabled={disabled}
					title={area.context ? `${area.name} - Has context` : area.name}
				>
					{#if area.icon}
						<span class="pill-icon">{area.icon}</span>
					{:else if area.isGeneral}
						<span class="pill-icon">
							<svg viewBox="0 0 20 20" fill="currentColor" class="general-icon">
								<path
									d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
								/>
							</svg>
						</span>
					{/if}
					<span class="pill-text">{area.name}</span>
					{#if area.context || (area.contextDocumentIds && area.contextDocumentIds.length > 0)}
						<span class="context-indicator" title="Has context">+</span>
					{/if}
				</button>
				<!-- Edit button (shows when selected, but not for General) -->
				{#if selectedId === area.id && onEdit && !area.isGeneral}
					<button
						type="button"
						class="edit-pill-btn"
						onclick={(e) => {
							e.stopPropagation();
							onEdit(area);
						}}
						disabled={disabled}
						title="Edit area"
					>
						<svg class="edit-icon" viewBox="0 0 20 20" fill="currentColor">
							<path
								d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
							/>
						</svg>
					</button>
				{/if}
			</div>
		{/each}

		<!-- Add button -->
		<button
			type="button"
			class="area-pill add-pill"
			onclick={onAdd}
			disabled={disabled}
			title="Add area"
		>
			<svg class="add-icon" viewBox="0 0 20 20" fill="currentColor">
				<path
					d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
				/>
			</svg>
			<span class="pill-text">Add</span>
		</button>
	</div>
</div>

<style>
	.area-pills-container {
		width: 100%;
		overflow-x: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
	}

	.area-pills-container::-webkit-scrollbar {
		height: 4px;
	}

	.area-pills-container::-webkit-scrollbar-track {
		background: transparent;
	}

	.area-pills-container::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
	}

	.area-pills {
		display: flex;
		gap: 0.5rem;
		padding: 0.25rem 0;
		white-space: nowrap;
	}

	.area-pill {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 9999px;
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.area-pill:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		border-color: var(--pill-color, rgba(255, 255, 255, 0.2));
		color: rgba(255, 255, 255, 0.9);
	}

	.area-pill.selected {
		background: color-mix(in srgb, var(--pill-color) 20%, transparent);
		border-color: var(--pill-color);
		color: #fff;
	}

	.area-pill.general {
		font-weight: 600;
	}

	.area-pill:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.area-pill:focus-visible {
		outline: 2px solid var(--pill-color, #3b82f6);
		outline-offset: 2px;
	}

	.pill-icon {
		font-size: 0.875rem;
		display: flex;
		align-items: center;
	}

	.general-icon {
		width: 0.875rem;
		height: 0.875rem;
	}

	.pill-text {
		line-height: 1;
	}

	.context-indicator {
		font-size: 0.75rem;
		color: var(--pill-color);
		opacity: 0.8;
	}

	.add-pill {
		color: rgba(255, 255, 255, 0.5);
		border-style: dashed;
	}

	.add-pill:hover:not(:disabled) {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.add-icon {
		width: 0.875rem;
		height: 0.875rem;
	}

	.pill-group {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.edit-pill-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 9999px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.edit-pill-btn:hover:not(:disabled) {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.edit-pill-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.edit-icon {
		width: 0.75rem;
		height: 0.75rem;
	}
</style>
