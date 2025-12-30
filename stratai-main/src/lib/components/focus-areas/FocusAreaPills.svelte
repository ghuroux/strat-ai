<script lang="ts">
	/**
	 * FocusAreaPills - Horizontal scrollable pills for focus area selection
	 *
	 * Displays focus areas as pills within a space, with:
	 * - Selection state
	 * - Color-coded pills
	 * - Add button for creating new focus areas
	 */
	import type { FocusArea } from '$lib/types/focus-areas';

	interface Props {
		focusAreas: FocusArea[];
		selectedId: string | null;
		onSelect: (id: string | null) => void;
		onAdd: () => void;
		onEdit?: (focusArea: FocusArea) => void; // NEW: Edit callback
		spaceColor?: string; // Default space color for pills without custom color
		disabled?: boolean;
	}

	let {
		focusAreas,
		selectedId,
		onSelect,
		onAdd,
		onEdit,
		spaceColor = '#6b7280',
		disabled = false
	}: Props = $props();

	// Default colors for focus areas without custom color
	const defaultColors = [
		'#3b82f6', // blue
		'#8b5cf6', // purple
		'#10b981', // green
		'#f59e0b', // amber
		'#ef4444', // red
		'#ec4899', // pink
		'#06b6d4', // cyan
		'#84cc16'  // lime
	];

	function getPillColor(focusArea: FocusArea, index: number): string {
		if (focusArea.color) return focusArea.color;
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

<div class="focus-pills-container">
	<div class="focus-pills">
		<!-- All Focus Areas pill (deselect) -->
		<button
			type="button"
			class="focus-pill"
			class:selected={selectedId === null}
			style="--pill-color: {spaceColor}"
			onclick={() => onSelect(null)}
			disabled={disabled}
		>
			<span class="pill-text">All</span>
		</button>

		<!-- Focus Area pills -->
		{#each focusAreas as focusArea, index (focusArea.id)}
			<div class="pill-group" class:selected={selectedId === focusArea.id}>
				<button
					type="button"
					class="focus-pill"
					class:selected={selectedId === focusArea.id}
					style="--pill-color: {getPillColor(focusArea, index)}"
					onclick={() => handlePillClick(focusArea.id)}
					onkeydown={(e) => handleKeydown(e, focusArea.id)}
					disabled={disabled}
					title={focusArea.context ? `${focusArea.name} - Has context` : focusArea.name}
				>
					{#if focusArea.icon}
						<span class="pill-icon">{focusArea.icon}</span>
					{/if}
					<span class="pill-text">{focusArea.name}</span>
					{#if focusArea.context || (focusArea.contextDocumentIds && focusArea.contextDocumentIds.length > 0)}
						<span class="context-indicator" title="Has context">•</span>
					{/if}
				</button>
				<!-- Edit button (shows when selected) -->
				{#if selectedId === focusArea.id && onEdit}
					<button
						type="button"
						class="edit-pill-btn"
						onclick={(e) => { e.stopPropagation(); onEdit(focusArea); }}
						disabled={disabled}
						title="Edit focus area"
					>
						<svg class="edit-icon" viewBox="0 0 20 20" fill="currentColor">
							<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
						</svg>
					</button>
				{/if}
			</div>
		{/each}

		<!-- Add button -->
		<button
			type="button"
			class="focus-pill add-pill"
			onclick={onAdd}
			disabled={disabled}
			title="Add focus area"
		>
			<svg class="add-icon" viewBox="0 0 20 20" fill="currentColor">
				<path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
			</svg>
			<span class="pill-text">Add</span>
		</button>
	</div>
</div>

<style>
	.focus-pills-container {
		width: 100%;
		overflow-x: auto;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
	}

	.focus-pills-container::-webkit-scrollbar {
		height: 4px;
	}

	.focus-pills-container::-webkit-scrollbar-track {
		background: transparent;
	}

	.focus-pills-container::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
	}

	.focus-pills {
		display: flex;
		gap: 0.5rem;
		padding: 0.25rem 0;
		white-space: nowrap;
	}

	.focus-pill {
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

	.focus-pill:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		border-color: var(--pill-color, rgba(255, 255, 255, 0.2));
		color: rgba(255, 255, 255, 0.9);
	}

	.focus-pill.selected {
		background: color-mix(in srgb, var(--pill-color) 20%, transparent);
		border-color: var(--pill-color);
		color: #fff;
	}

	.focus-pill:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.focus-pill:focus-visible {
		outline: 2px solid var(--pill-color, #3b82f6);
		outline-offset: 2px;
	}

	.pill-icon {
		font-size: 0.875rem;
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
