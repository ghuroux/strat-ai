<script lang="ts">
	/**
	 * LibraryPicker.svelte - Library selection panel for Excalidraw
	 *
	 * Displays available diagram libraries organized by category.
	 * Users can click to load/unload libraries into the Excalidraw editor.
	 */
	import { Cloud, Code, Palette, Shapes, Check, Loader2, ChevronDown, ChevronRight, PanelLeft, Library } from 'lucide-svelte';
	import { DIAGRAM_LIBRARIES, CATEGORY_LABELS, type DiagramLibrary } from './diagram-libraries';

	interface Props {
		loadedLibraries: string[];
		loadingLibrary: string | null;
		onToggleLibrary: (library: DiagramLibrary) => void;
		onOpenLibraryPanel?: () => void;
		isCollapsed?: boolean;
		onToggleCollapse?: () => void;
	}

	let {
		loadedLibraries,
		loadingLibrary,
		onToggleLibrary,
		onOpenLibraryPanel,
		isCollapsed = false,
		onToggleCollapse
	}: Props = $props();

	// Track expanded categories
	let expandedCategories = $state<Set<string>>(new Set(['cloud', 'development']));

	// Category icons
	const categoryIcons = {
		cloud: Cloud,
		development: Code,
		design: Palette,
		general: Shapes
	};

	// Group libraries by category
	let librariesByCategory = $derived.by(() => {
		const grouped: Record<string, DiagramLibrary[]> = {};
		for (const lib of DIAGRAM_LIBRARIES) {
			if (!grouped[lib.category]) {
				grouped[lib.category] = [];
			}
			grouped[lib.category].push(lib);
		}
		return grouped;
	});

	// Count loaded libraries per category
	let loadedCountByCategory = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const [category, libraries] of Object.entries(librariesByCategory)) {
			counts[category] = libraries.filter(lib => loadedLibraries.includes(lib.id)).length;
		}
		return counts;
	});

	// Total loaded count
	let totalLoaded = $derived(loadedLibraries.length);

	function toggleCategory(category: string) {
		const newSet = new Set(expandedCategories);
		if (newSet.has(category)) {
			newSet.delete(category);
		} else {
			newSet.add(category);
		}
		expandedCategories = newSet;
	}

	function isLoaded(libraryId: string): boolean {
		return loadedLibraries.includes(libraryId);
	}

	function isLoading(libraryId: string): boolean {
		return loadingLibrary === libraryId;
	}
</script>

<div class="library-picker" class:collapsed={isCollapsed}>
	{#if isCollapsed}
		<!-- Collapsed state: just show expand button -->
		<button
			type="button"
			class="expand-button"
			onclick={onToggleCollapse}
			title="Show Icon Libraries"
		>
			<Library size={18} />
			{#if totalLoaded > 0}
				<span class="loaded-badge">{totalLoaded}</span>
			{/if}
		</button>
	{:else}
		<!-- Expanded state: full panel -->
		<div class="library-header">
			<div class="header-content">
				<h3 class="library-title">Icon Libraries</h3>
				<p class="library-subtitle">Click to load/unload icons</p>
			</div>
			<div class="header-actions">
				{#if onOpenLibraryPanel}
					<button
						type="button"
						class="header-btn"
						onclick={onOpenLibraryPanel}
						title="Open library panel (view loaded icons)"
					>
						<Library size={16} />
					</button>
				{/if}
				{#if onToggleCollapse}
					<button
						type="button"
						class="header-btn"
						onclick={onToggleCollapse}
						title="Collapse panel"
					>
						<PanelLeft size={16} />
					</button>
				{/if}
			</div>
		</div>

		<div class="library-categories">
			{#each Object.entries(librariesByCategory) as [category, libraries]}
				{@const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons]}
				{@const isExpanded = expandedCategories.has(category)}
				{@const loadedCount = loadedCountByCategory[category] || 0}

				<div class="category">
					<button
						type="button"
						class="category-header"
						onclick={() => toggleCategory(category)}
					>
						<span class="category-icon">
							<CategoryIcon size={16} />
						</span>
						<span class="category-name">{CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}</span>
						<span class="category-count" class:has-loaded={loadedCount > 0}>
							{loadedCount > 0 ? `${loadedCount}/` : ''}{libraries.length}
						</span>
						<span class="category-chevron">
							{#if isExpanded}
								<ChevronDown size={16} />
							{:else}
								<ChevronRight size={16} />
							{/if}
						</span>
					</button>

					{#if isExpanded}
						<div class="category-libraries">
							{#each libraries as library}
								{@const loaded = isLoaded(library.id)}
								{@const loading = isLoading(library.id)}

								<button
									type="button"
									class="library-item"
									class:loaded
									class:loading
									disabled={loading}
									onclick={() => onToggleLibrary(library)}
									title={loaded ? `Click to unload ${library.name}` : `Click to load ${library.name}`}
								>
									<div class="library-info">
										<span class="library-name">{library.name}</span>
										<span class="library-description">{library.description}</span>
									</div>
									<span class="library-status">
										{#if loading}
											<Loader2 size={16} class="animate-spin" />
										{:else if loaded}
											<Check size={16} class="text-green-500" />
										{/if}
									</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.library-picker {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
		transition: width 200ms ease;
	}

	.library-picker.collapsed {
		width: 48px;
		min-width: 48px;
	}

	.expand-button {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.75rem;
		border: none;
		background: transparent;
		cursor: pointer;
		color: #52525b;
		transition: color 100ms ease;
	}

	.expand-button:hover {
		color: #18181b;
	}

	:global(.dark) .expand-button {
		color: #a1a1aa;
	}

	:global(.dark) .expand-button:hover {
		color: #fafafa;
	}

	.loaded-badge {
		font-size: 0.625rem;
		font-weight: 600;
		background: #16a34a;
		color: white;
		padding: 0.125rem 0.375rem;
		border-radius: 9999px;
		min-width: 1.25rem;
		text-align: center;
	}

	.library-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #e4e4e7;
	}

	:global(.dark) .library-header {
		border-color: #3f3f46;
	}

	.header-content {
		flex: 1;
	}

	.header-actions {
		display: flex;
		gap: 0.25rem;
	}

	.header-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		border-radius: 0.375rem;
		cursor: pointer;
		color: #71717a;
		transition: all 100ms ease;
	}

	.header-btn:hover {
		background: #f4f4f5;
		color: #18181b;
	}

	:global(.dark) .header-btn:hover {
		background: #27272a;
		color: #fafafa;
	}

	.library-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: #18181b;
		margin: 0;
	}

	:global(.dark) .library-title {
		color: #fafafa;
	}

	.library-subtitle {
		font-size: 0.75rem;
		color: #71717a;
		margin: 0.25rem 0 0;
	}

	:global(.dark) .library-subtitle {
		color: #a1a1aa;
	}

	.library-categories {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.category {
		margin-bottom: 0.25rem;
	}

	.category-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: none;
		background: transparent;
		border-radius: 0.5rem;
		cursor: pointer;
		text-align: left;
		transition: background-color 100ms ease;
	}

	.category-header:hover {
		background: #f4f4f5;
	}

	:global(.dark) .category-header:hover {
		background: #27272a;
	}

	.category-icon {
		color: #52525b;
	}

	:global(.dark) .category-icon {
		color: #a1a1aa;
	}

	.category-name {
		flex: 1;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #18181b;
	}

	:global(.dark) .category-name {
		color: #fafafa;
	}

	.category-count {
		font-size: 0.75rem;
		color: #71717a;
		background: #f4f4f5;
		padding: 0.125rem 0.375rem;
		border-radius: 9999px;
	}

	.category-count.has-loaded {
		background: #dcfce7;
		color: #16a34a;
	}

	:global(.dark) .category-count {
		color: #a1a1aa;
		background: #3f3f46;
	}

	:global(.dark) .category-count.has-loaded {
		background: #14532d;
		color: #4ade80;
	}

	.category-chevron {
		color: #71717a;
	}

	:global(.dark) .category-chevron {
		color: #a1a1aa;
	}

	.category-libraries {
		padding: 0.25rem 0 0.25rem 1.5rem;
	}

	.library-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: none;
		background: transparent;
		border-radius: 0.375rem;
		cursor: pointer;
		text-align: left;
		transition: background-color 100ms ease;
	}

	.library-item:hover:not(:disabled) {
		background: #f4f4f5;
	}

	:global(.dark) .library-item:hover:not(:disabled) {
		background: #27272a;
	}

	.library-item:disabled {
		cursor: wait;
	}

	.library-item.loaded {
		background: #f0fdf4;
	}

	:global(.dark) .library-item.loaded {
		background: #14532d20;
	}

	.library-item.loaded:hover:not(:disabled) {
		background: #dcfce7;
	}

	:global(.dark) .library-item.loaded:hover:not(:disabled) {
		background: #14532d40;
	}

	.library-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.library-name {
		font-size: 0.8125rem;
		font-weight: 500;
		color: #18181b;
	}

	:global(.dark) .library-name {
		color: #fafafa;
	}

	.library-item.loaded .library-name {
		color: #16a34a;
	}

	:global(.dark) .library-item.loaded .library-name {
		color: #4ade80;
	}

	.library-description {
		font-size: 0.6875rem;
		color: #71717a;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(.dark) .library-description {
		color: #a1a1aa;
	}

	.library-status {
		flex-shrink: 0;
		width: 1rem;
		height: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Animate spin for loading icon */
	.library-status :global(.animate-spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
