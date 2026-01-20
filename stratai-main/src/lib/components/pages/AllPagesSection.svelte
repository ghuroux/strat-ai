<script lang="ts">
	/**
	 * AllPagesSection.svelte - Main pages section with filter bar and grid
	 *
	 * Combines:
	 * - PageFilterBar for filtering
	 * - PagesGrid for display
	 * - PageEmptyState for empty/no-match states
	 *
	 * Handles client-side search filtering of pages.
	 *
	 * US-010 implementation
	 */
	import type { Page } from '$lib/types/page';
	import PageFilterBar from './PageFilterBar.svelte';
	import PagesGrid from './PagesGrid.svelte';
	import PageEmptyState from './PageEmptyState.svelte';

	// Extended Page type with metadata from API
	interface PageWithMetadata extends Page {
		areaName?: string;
		areaSlug?: string;
		creatorName?: string | null;
		isOwnedByUser?: boolean;
	}

	interface PageCounts {
		total: number;
		byArea: Record<string, number>;
		byType: Record<string, number>;
		ownedByMe: number;
		sharedWithMe: number;
	}

	interface AreaOption {
		id: string;
		name: string;
		slug: string;
	}

	interface Props {
		pages: PageWithMetadata[];
		counts: PageCounts;
		areas: AreaOption[];
		spaceSlug: string;
		currentFilters: {
			area: string | null;
			type: string | null;
			owned: string | null;
		};
		createdPageId?: string | null;
		onDelete?: (page: PageWithMetadata) => void;
		onShare?: (page: PageWithMetadata) => void;
		onBrowseAreas?: () => void;
		onClearFilters?: () => void;
	}

	let {
		pages,
		counts,
		areas,
		spaceSlug,
		currentFilters,
		createdPageId = null,
		onDelete,
		onShare,
		onBrowseAreas,
		onClearFilters
	}: Props = $props();

	// Local search state (client-side filtering)
	let searchQuery = $state('');

	// Filter pages by search query (case-insensitive title match)
	let filteredPages = $derived.by(() => {
		if (!searchQuery.trim()) {
			return pages;
		}

		const query = searchQuery.toLowerCase().trim();
		return pages.filter((page) => page.title.toLowerCase().includes(query));
	});

	// Determine empty state reason
	let emptyReason = $derived.by(() => {
		if (counts.total === 0) {
			return 'no-pages' as const;
		}
		return 'no-matches' as const;
	});

	// Check if any filters are active
	let hasActiveFilters = $derived(
		currentFilters.area !== null ||
			currentFilters.type !== null ||
			currentFilters.owned !== null ||
			searchQuery.trim() !== ''
	);

	// Handle search change from filter bar
	function handleSearchChange(query: string) {
		searchQuery = query;
	}
</script>

<section>
	<header class="flex items-center gap-2 mb-4">
		<h2 class="text-base font-semibold m-0 text-zinc-900 dark:text-zinc-100">
			All Pages
		</h2>
		{#if counts.total > 0}
			<span class="text-sm font-medium px-2 py-0.5 rounded-full
						 text-zinc-500 dark:text-zinc-400
						 bg-zinc-100 dark:bg-zinc-800">
				{counts.total}
			</span>
		{/if}
	</header>

	<PageFilterBar
		{counts}
		{areas}
		{currentFilters}
		{searchQuery}
		onSearchChange={handleSearchChange}
	/>

	{#if filteredPages.length > 0}
		<PagesGrid
			pages={filteredPages}
			{spaceSlug}
			{createdPageId}
			{onDelete}
			{onShare}
		/>
	{:else}
		<PageEmptyState
			reason={emptyReason}
			{onBrowseAreas}
			onClearFilters={hasActiveFilters ? onClearFilters : undefined}
		/>
	{/if}
</section>
