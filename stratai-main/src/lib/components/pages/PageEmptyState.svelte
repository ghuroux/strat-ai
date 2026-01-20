<script lang="ts">
	/**
	 * PageEmptyState.svelte - Empty state for pages list
	 *
	 * Displays helpful empty states when:
	 * - No pages exist in the space
	 * - No pages match the current filters
	 *
	 * Follows design system patterns with theme support and clear CTAs.
	 */

	import { FileEdit, Search } from 'lucide-svelte';

	interface Props {
		/** The reason for the empty state */
		reason: 'no-pages' | 'no-matches';
		/** Callback for Browse Areas button (no-pages) */
		onBrowseAreas?: () => void;
		/** Callback for Clear Filters button (no-matches) */
		onClearFilters?: () => void;
	}

	let { reason, onBrowseAreas, onClearFilters }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center text-center py-16 px-8">
	{#if reason === 'no-pages'}
		<!-- No Pages Yet State -->
		<!-- Icon container -->
		<div
			class="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
			style="color: rgba(255, 255, 255, 0.2)"
		>
			<FileEdit size={48} strokeWidth={1.5} />
		</div>

		<!-- Heading -->
		<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No pages yet</h3>

		<!-- Description -->
		<p class="text-sm text-zinc-600 dark:text-zinc-400 max-w-xs mb-5">
			Pages are created within areas. Browse areas to start creating pages where work happens.
		</p>

		<!-- CTA Button -->
		{#if onBrowseAreas}
			<button
				onclick={onBrowseAreas}
				class="px-4 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-sm font-medium text-white transition-all duration-150"
			>
				Browse Areas
			</button>
		{/if}
	{:else if reason === 'no-matches'}
		<!-- No Matches State -->
		<!-- Icon container -->
		<div
			class="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
			style="color: rgba(255, 255, 255, 0.2)"
		>
			<Search size={48} strokeWidth={1.5} />
		</div>

		<!-- Heading -->
		<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
			No pages match your filters
		</h3>

		<!-- Description -->
		<p class="text-sm text-zinc-600 dark:text-zinc-400 max-w-xs mb-5">
			Try adjusting your search terms or filters to find what you're looking for.
		</p>

		<!-- CTA Button -->
		{#if onClearFilters}
			<button
				onclick={onClearFilters}
				class="px-4 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-sm font-medium text-white transition-all duration-150"
			>
				Clear Filters
			</button>
		{/if}
	{/if}
</div>
