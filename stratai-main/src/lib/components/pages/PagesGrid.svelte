<script lang="ts">
	/**
	 * PagesGrid.svelte - Responsive grid layout for page cards
	 *
	 * Displays pages in a CSS Grid with responsive breakpoints:
	 * - Desktop (>1024px): Auto-fill with 280px minimum
	 * - Tablet (<1024px): 2 columns
	 * - Mobile (<640px): 1 column
	 *
	 * US-012 implementation
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
</script>

<div class="pages-grid">
	{#each pages as page (page.id)}
		<PageCard
			{page}
			{spaceSlug}
			highlight={page.id === createdPageId}
			{onDelete}
			{onShare}
		/>
	{/each}
</div>

<style>
	.pages-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	/* Tablet: 2 columns */
	@media (max-width: 1024px) {
		.pages-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	/* Mobile: 1 column */
	@media (max-width: 640px) {
		.pages-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
