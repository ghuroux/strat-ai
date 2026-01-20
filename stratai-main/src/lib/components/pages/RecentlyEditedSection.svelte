<script lang="ts">
	/**
	 * RecentlyEditedSection.svelte - Horizontal scroll of recently edited pages
	 *
	 * Displays the 3 most recent pages edited by the current user.
	 * - Horizontal scrolling with scroll-snap on mobile
	 * - Side-by-side on desktop
	 * - Highlights newly created pages
	 *
	 * US-009 implementation
	 */
	import type { Page } from '$lib/types/page';
	import PageCard from './PageCard.svelte';

	// Extended Page type with metadata from API
	interface PageWithMetadata extends Page {
		areaName?: string;
		areaSlug?: string;
		creatorName?: string | null;
		isOwnedByUser?: boolean;
	}

	interface Props {
		pages: PageWithMetadata[];
		spaceSlug: string;
		createdPageId?: string | null;
		onDelete?: (page: PageWithMetadata) => void;
		onShare?: (page: PageWithMetadata) => void;
	}

	let { pages, spaceSlug, createdPageId = null, onDelete, onShare }: Props = $props();

	// Don't render if no pages
	let hasPages = $derived(pages.length > 0);
</script>

{#if hasPages}
	<section class="mb-8">
		<header class="mb-4">
			<h2 class="text-base font-semibold m-0 text-zinc-900 dark:text-zinc-100">
				Recently Edited by You
			</h2>
		</header>

		<div class="cards-horizontal flex gap-4 overflow-x-auto pb-2">
			{#each pages as page (page.id)}
				<div class="card-wrapper flex-shrink-0 w-[280px] snap-start lg:flex-1 lg:min-w-0 lg:max-w-xs">
					<PageCard
						{page}
						{spaceSlug}
						highlight={page.id === createdPageId}
						{onDelete}
						{onShare}
					/>
				</div>
			{/each}
		</div>
	</section>
{/if}

<style>
	.cards-horizontal {
		scroll-snap-type: x mandatory;
		-webkit-overflow-scrolling: touch;
	}

	/* Custom scrollbar that works in both themes */
	.cards-horizontal::-webkit-scrollbar {
		height: 6px;
	}

	.cards-horizontal::-webkit-scrollbar-track {
		background: transparent;
	}

	.cards-horizontal::-webkit-scrollbar-thumb {
		border-radius: 3px;
	}

	/* Light mode scrollbar */
	.cards-horizontal::-webkit-scrollbar-thumb {
		background: rgb(212, 212, 216);
	}

	/* Dark mode scrollbar - use global dark class */
	:global(.dark) .cards-horizontal::-webkit-scrollbar-thumb {
		background: rgb(63, 63, 70);
	}

	/* Desktop: Show all side-by-side without scroll */
	@media (min-width: 1024px) {
		.cards-horizontal {
			overflow-x: visible;
			scroll-snap-type: none;
		}
	}

	/* Mobile: Smaller cards */
	@media (max-width: 640px) {
		.card-wrapper {
			width: 260px;
		}
	}
</style>
