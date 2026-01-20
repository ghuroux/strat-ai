<script lang="ts">
	/**
	 * Space Pages Dashboard
	 *
	 * Displays all pages in a Space with:
	 * - Recently Edited section (pages user recently modified)
	 * - All Pages section with filtering
	 * - [+ New Page] button that opens area selector
	 *
	 * Route: /spaces/[space]/pages
	 *
	 * US-008 implementation
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Plus, ChevronLeft } from 'lucide-svelte';

	import { pageStore } from '$lib/stores/pages.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	import RecentlyEditedSection from '$lib/components/pages/RecentlyEditedSection.svelte';
	import AllPagesSection from '$lib/components/pages/AllPagesSection.svelte';
	import SelectAreaModal from '$lib/components/pages/SelectAreaModal.svelte';
	import DeletePageModal from '$lib/components/pages/DeletePageModal.svelte';

	import type { PageData } from './$types';
	import type { Page as PageType } from '$lib/types/page';

	let { data }: { data: PageData } = $props();

	// Extended Page type with metadata
	interface PageWithMetadata extends PageType {
		areaName?: string;
		areaSlug?: string;
		creatorName?: string | null;
		isOwnedByUser?: boolean;
	}

	// Get space slug from route
	let spaceSlug = $derived($page.params.space);

	// Get space from store
	let space = $derived.by(() => {
		if (!spaceSlug) return null;
		return spacesStore.getSpaceBySlug(spaceSlug);
	});

	// Extract created page ID from URL query param (for highlighting)
	let createdPageId = $derived($page.url.searchParams.get('created'));

	// Extract filter params from URL
	let currentFilters = $derived({
		area: $page.url.searchParams.get('area'),
		type: $page.url.searchParams.get('type'),
		owned: $page.url.searchParams.get('owned')
	});

	// UI state
	let isLoading = $state(true);
	let showAreaModal = $state(false);
	let pageToDelete = $state<PageWithMetadata | null>(null);

	// Load data on mount and force refresh for race condition defense
	onMount(async () => {
		if (!spaceSlug) {
			goto('/spaces');
			return;
		}

		// Ensure spaces are loaded
		await spacesStore.loadSpaces();
		const spaceFromStore = spacesStore.getSpaceBySlug(spaceSlug);

		if (!spaceFromStore) {
			toastStore.error('Space not found');
			goto('/spaces');
			return;
		}

		// Layer 3 defense: Force refresh pages on mount
		await pageStore.refreshPagesForSpace(spaceFromStore.id);

		isLoading = false;

		// If we have a created page, show success toast
		if (createdPageId) {
			toastStore.success('Page created successfully');
			// Clean up the URL param after showing toast
			const url = new URL($page.url);
			url.searchParams.delete('created');
			goto(url.toString(), { replaceState: true });
		}
	});

	// Handle area selection for new page
	function handleAreaSelect(areaSlug: string) {
		showAreaModal = false;
		goto(`/spaces/${spaceSlug}/${areaSlug}/pages/new`);
	}

	// Handle page delete confirmation
	function handleDeleteRequest(pageData: PageWithMetadata) {
		pageToDelete = pageData;
	}

	// Handle page delete
	async function handleDeleteConfirm() {
		if (!pageToDelete) return;

		const success = await pageStore.deletePage(pageToDelete.id);
		if (success) {
			toastStore.success('Page deleted');
		} else {
			toastStore.error('Failed to delete page');
		}
		pageToDelete = null;
	}

	// Handle share (placeholder - would open share modal)
	function handleShare(pageData: PageWithMetadata) {
		// TODO: Open share modal
		toastStore.info('Share functionality coming soon');
	}

	// Navigate to browse areas
	function handleBrowseAreas() {
		goto(`/spaces/${spaceSlug}`);
	}

	// Clear all filters
	function handleClearFilters() {
		goto(`/spaces/${spaceSlug}/pages`);
	}

	// Navigate back to space
	function handleBack() {
		goto(`/spaces/${spaceSlug}`);
	}
</script>

<svelte:head>
	<title>Pages - {data.space?.name || 'Space'} | StratAI</title>
</svelte:head>

<div class="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
	{#if isLoading}
		<!-- Loading state -->
		<div class="flex flex-col items-center justify-center h-full gap-4 text-zinc-500 dark:text-zinc-400">
			<div class="w-8 h-8 border-2 border-zinc-200 dark:border-zinc-700 border-t-primary-500 rounded-full animate-spin"></div>
			<p>Loading pages...</p>
		</div>
	{:else}
		<!-- Header -->
		<header class="flex items-center justify-between px-6 py-4 border-b
					   bg-white dark:bg-zinc-900
					   border-zinc-200 dark:border-zinc-800">
			<div class="flex items-center gap-3">
				<button
					type="button"
					class="flex items-center justify-center w-9 h-9 rounded-lg
						   border border-zinc-200 dark:border-zinc-700
						   text-zinc-500 dark:text-zinc-400
						   hover:bg-zinc-100 dark:hover:bg-zinc-800
						   hover:text-zinc-900 dark:hover:text-zinc-100
						   hover:border-zinc-300 dark:hover:border-zinc-600
						   transition-colors"
					onclick={handleBack}
					aria-label="Back to space"
				>
					<ChevronLeft size={20} />
				</button>
				<div class="flex flex-col gap-0.5">
					<h1 class="text-xl font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
						Pages
					</h1>
					{#if data.space}
						<span class="text-sm text-zinc-500 dark:text-zinc-400">{data.space.name}</span>
					{/if}
				</div>
			</div>

			<button
				type="button"
				class="flex items-center gap-2 px-4 py-2.5 rounded-lg
					   bg-primary-500 hover:bg-primary-600
					   text-sm font-medium text-white
					   disabled:opacity-50 disabled:cursor-not-allowed
					   transition-colors"
				onclick={() => (showAreaModal = true)}
				disabled={isLoading}
			>
				<Plus size={18} />
				<span class="hidden sm:inline">New Page</span>
			</button>
		</header>

		<!-- Main content with max-width for readability -->
		<main class="flex-1 overflow-y-auto">
			<div class="max-w-5xl mx-auto px-6 py-6">
				<!-- Recently Edited Section -->
				{#if data.recentlyEdited && data.recentlyEdited.length > 0}
					<RecentlyEditedSection
						pages={data.recentlyEdited}
						spaceSlug={spaceSlug || ''}
						{createdPageId}
						onDelete={handleDeleteRequest}
						onShare={handleShare}
					/>
				{/if}

				<!-- All Pages Section -->
				<AllPagesSection
					pages={data.pages}
					counts={data.counts}
					areas={data.areas}
					spaceSlug={spaceSlug || ''}
					{currentFilters}
					{createdPageId}
					onDelete={handleDeleteRequest}
					onShare={handleShare}
					onBrowseAreas={handleBrowseAreas}
					onClearFilters={handleClearFilters}
				/>
			</div>
		</main>
	{/if}
</div>

<!-- Area selection modal for new page -->
<SelectAreaModal
	isOpen={showAreaModal}
	areas={data.areas}
	onSelect={handleAreaSelect}
	onClose={() => (showAreaModal = false)}
/>

<!-- Delete confirmation modal -->
<DeletePageModal
	isOpen={pageToDelete !== null}
	page={pageToDelete}
	onConfirm={handleDeleteConfirm}
	onCancel={() => (pageToDelete = null)}
/>
