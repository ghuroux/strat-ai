<script lang="ts">
	/**
	 * Page Editor Page
	 *
	 * Full page editor for creating and editing pages.
	 * Based on DOCUMENT_SYSTEM.md Phase 3 specification.
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { PageEditor } from '$lib/components/pages';
	import { pageStore } from '$lib/stores/pages.svelte';
	import { areaStore } from '$lib/stores/areas.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Page as PageType, TipTapContent, PageType as PageTypeEnum, PageVisibility } from '$lib/types/page';
	import type { Area } from '$lib/types/areas';
	import type { Space } from '$lib/types/spaces';

	// Server data
	let { data } = $props();

	// Route params
	let spaceParam = $derived($page.params.space);
	let areaParam = $derived($page.params.area);
	let pageIdParam = $derived($page.params.pageId);

	// State
	let isLoading = $state(true);
	let currentPage = $state<PageType | null>(null);

	// Load space from store
	let spaceFromStore = $derived.by(() => {
		if (!spaceParam) return null;
		return spacesStore.getSpaceBySlug(spaceParam);
	});

	let properSpaceId = $derived(spaceFromStore?.id ?? '');

	// Load area
	let area = $derived.by((): Area | null => {
		if (!properSpaceId || !areaParam) return null;
		return areaStore.getAreaBySlug(properSpaceId, areaParam) ?? null;
	});

	// Derive colors
	let areaColor = $derived(area?.color || spaceFromStore?.color || '#3b82f6');

	// Apply area color
	$effect(() => {
		if (areaColor) {
			document.documentElement.style.setProperty('--space-accent', areaColor);
		}
		return () => {
			document.documentElement.style.removeProperty('--space-accent');
		};
	});

	// Initialize from server data
	$effect(() => {
		if (data.page && !currentPage) {
			// Convert server page data back to Page object with Date objects
			currentPage = {
				...data.page,
				createdAt: new Date(data.page.createdAt),
				updatedAt: new Date(data.page.updatedAt)
			} as PageType;
		}
	});

	// Load data on mount
	onMount(async () => {
		if (!spaceParam || !areaParam) {
			goto('/spaces');
			return;
		}

		// Load spaces first
		await spacesStore.loadSpaces();
		const loadedSpace = spacesStore.getSpaceBySlug(spaceParam);
		if (!loadedSpace) {
			toastStore.error('Space not found');
			goto('/spaces');
			return;
		}

		// Load areas
		await areaStore.loadAreas(loadedSpace.id);

		// Validate area exists
		const loadedArea = areaStore.getAreaBySlug(loadedSpace.id, areaParam);
		if (!loadedArea) {
			toastStore.error('Area not found');
			goto(`/spaces/${spaceParam}`);
			return;
		}

		isLoading = false;
	});

	// Handle save
	async function handleSave(content: TipTapContent, title: string, visibility: PageVisibility) {
		if (!area?.id) {
			toastStore.error('Area not found');
			return;
		}

		try {
			if (data.isNew) {
				// Create new page
				const newPage = await pageStore.createPage({
					areaId: area.id,
					title,
					content,
					pageType: 'general',
					visibility
				});

				if (newPage) {
					currentPage = newPage;
					// Update URL to the new page ID
					const newUrl = `/spaces/${spaceParam}/${areaParam}/pages/${newPage.id}`;
					history.replaceState(null, '', newUrl);
					toastStore.success('Page created');
				}
			} else if (currentPage) {
				// Update existing page
				const updated = await pageStore.updatePage(currentPage.id, {
					title,
					content,
					visibility
				});

				if (updated) {
					currentPage = updated;
					toastStore.success('Page saved');
				}
			}
		} catch (err) {
			console.error('Failed to save page:', err);
			toastStore.error('Failed to save page');
			throw err; // Re-throw to let editor know save failed
		}
	}

	// Handle close
	function handleClose() {
		goto(`/spaces/${spaceParam}/${areaParam}/pages`);
	}

	// Get initial values
	let initialTitle = $derived(data.isNew ? 'Untitled Page' : (currentPage?.title || data.page?.title || 'Untitled'));
	let initialContent = $derived(data.isNew ? undefined : (currentPage?.content || data.page?.content));
	let initialType = $derived<PageTypeEnum>(data.isNew ? 'general' : (currentPage?.pageType || data.page?.pageType || 'general'));
</script>

<svelte:head>
	<title>{initialTitle} - {area?.name || 'Page'} | StratAI</title>
</svelte:head>

{#if isLoading}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading...</p>
	</div>
{:else if area}
	<div class="editor-page">
		<PageEditor
			page={currentPage}
			areaId={area.id}
			initialContent={initialContent}
			initialTitle={initialTitle}
			initialType={initialType}
			onSave={handleSave}
			onClose={handleClose}
		/>
	</div>
{:else}
	<div class="error-container">
		<h2>Not Found</h2>
		<p>The requested area could not be found.</p>
		<button type="button" onclick={() => goto('/spaces')}>Go to Spaces</button>
	</div>
{/if}

<style>
	.editor-page {
		height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.loading-container,
	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		gap: 1rem;
		color: var(--editor-text-secondary);
		background: var(--editor-bg);
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--editor-border);
		border-top-color: var(--editor-border-focus);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.error-container h2 {
		color: var(--editor-text);
		margin: 0;
	}

	.error-container p {
		margin: 0;
	}

	.error-container button {
		padding: 0.5rem 1rem;
		background: var(--editor-border-focus);
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}
</style>
