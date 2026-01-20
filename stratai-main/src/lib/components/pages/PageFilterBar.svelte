<script lang="ts">
	/**
	 * PageFilterBar.svelte - Filter controls for pages dashboard
	 *
	 * Provides filtering by:
	 * - Search (client-side, case-insensitive title match)
	 * - Ownership (All, Owned by me, Shared with me)
	 * - Area (dropdown with counts)
	 * - Type (dropdown with counts)
	 *
	 * URL-based filtering using goto() for shareable filter states.
	 *
	 * US-011 implementation
	 */
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Search } from 'lucide-svelte';

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
		counts: PageCounts;
		areas: AreaOption[];
		currentFilters: {
			area: string | null;
			type: string | null;
			owned: string | null;
		};
		searchQuery?: string;
		onSearchChange: (query: string) => void;
	}

	let { counts, areas, currentFilters, searchQuery = '', onSearchChange }: Props = $props();

	// Page type labels for display
	const PAGE_TYPE_LABELS: Record<string, string> = {
		general: 'General',
		meeting_notes: 'Meeting Notes',
		decision_record: 'Decision Record'
	};

	// Update URL with filter params
	function updateFilter(key: string, value: string | null) {
		const url = new URL($page.url);

		if (value && value !== 'all') {
			url.searchParams.set(key, value);
		} else {
			url.searchParams.delete(key);
		}

		goto(url.toString(), { keepFocus: true, replaceState: true });
	}

	// Handle area filter change
	function handleAreaChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		updateFilter('area', select.value || null);
	}

	// Handle type filter change
	function handleTypeChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		updateFilter('type', select.value || null);
	}

	// Handle ownership filter change
	function handleOwnedChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		updateFilter('owned', select.value || null);
	}

	// Handle search input
	function handleSearchInput(e: Event) {
		const input = e.target as HTMLInputElement;
		onSearchChange(input.value);
	}

	// Get unique page types from counts
	let pageTypes = $derived(Object.keys(counts.byType));
</script>

<div class="flex flex-wrap gap-3 items-center mb-6">
	<!-- Search input -->
	<div class="relative flex-1 min-w-[200px] max-w-xs">
		<Search
			size={16}
			class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none"
		/>
		<input
			type="text"
			placeholder="Search pages..."
			value={searchQuery}
			oninput={handleSearchInput}
			class="w-full py-2 px-3 pl-9 rounded-lg text-sm
				   bg-zinc-100 dark:bg-zinc-800
				   border border-zinc-200 dark:border-zinc-700
				   text-zinc-900 dark:text-zinc-100
				   placeholder:text-zinc-400 dark:placeholder:text-zinc-500
				   focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50
				   transition-colors"
			aria-label="Search pages"
		/>
	</div>

	<div class="flex flex-wrap gap-2">
		<!-- Ownership filter -->
		<select
			value={currentFilters.owned || ''}
			onchange={handleOwnedChange}
			class="filter-select py-2 px-3 pr-8 rounded-lg text-sm cursor-pointer appearance-none
				   bg-zinc-100 dark:bg-zinc-800
				   border border-zinc-200 dark:border-zinc-700
				   text-zinc-900 dark:text-zinc-100
				   hover:border-zinc-400 dark:hover:border-zinc-500
				   focus:outline-none focus:border-primary-500
				   transition-colors"
			aria-label="Filter by ownership"
		>
			<option value="">All pages ({counts.total})</option>
			<option value="me">Owned by me ({counts.ownedByMe})</option>
			<option value="shared">Shared with me ({counts.sharedWithMe})</option>
		</select>

		<!-- Area filter -->
		<select
			value={currentFilters.area || ''}
			onchange={handleAreaChange}
			class="filter-select py-2 px-3 pr-8 rounded-lg text-sm cursor-pointer appearance-none
				   bg-zinc-100 dark:bg-zinc-800
				   border border-zinc-200 dark:border-zinc-700
				   text-zinc-900 dark:text-zinc-100
				   hover:border-zinc-400 dark:hover:border-zinc-500
				   focus:outline-none focus:border-primary-500
				   transition-colors"
			aria-label="Filter by area"
		>
			<option value="">All areas</option>
			{#each areas as area (area.id)}
				<option value={area.slug}>
					{area.name} ({counts.byArea[area.slug] || 0})
				</option>
			{/each}
		</select>

		<!-- Type filter -->
		<select
			value={currentFilters.type || ''}
			onchange={handleTypeChange}
			class="filter-select py-2 px-3 pr-8 rounded-lg text-sm cursor-pointer appearance-none
				   bg-zinc-100 dark:bg-zinc-800
				   border border-zinc-200 dark:border-zinc-700
				   text-zinc-900 dark:text-zinc-100
				   hover:border-zinc-400 dark:hover:border-zinc-500
				   focus:outline-none focus:border-primary-500
				   transition-colors"
			aria-label="Filter by type"
		>
			<option value="">All types</option>
			{#each pageTypes as type (type)}
				<option value={type}>
					{PAGE_TYPE_LABELS[type] || type} ({counts.byType[type] || 0})
				</option>
			{/each}
		</select>
	</div>
</div>

<style>
	/* Custom select arrow that works in both themes */
	.filter-select {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;
	}

	/* Mobile: Stack filters */
	@media (max-width: 640px) {
		.filter-select {
			flex: 1;
		}
	}
</style>
