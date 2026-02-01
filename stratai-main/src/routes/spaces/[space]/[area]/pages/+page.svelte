<script lang="ts">
	/**
	 * Pages List Page
	 *
	 * Displays all pages in the current area with search and filtering.
	 * Based on DOCUMENT_SYSTEM.md Section 4.6 specification.
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { MessageSquare, Plus, Upload } from 'lucide-svelte';
	import MobileHeader from '$lib/components/layout/MobileHeader.svelte';
	import MobileActionsMenu from '$lib/components/layout/MobileActionsMenu.svelte';
	import UserMenu from '$lib/components/layout/UserMenu.svelte';
	import { PageList, NewPageModal, DeletePageModal, SharePageModal, ImportPageModal } from '$lib/components/pages';
	import { pageStore } from '$lib/stores/pages.svelte';
	import { areaStore } from '$lib/stores/areas.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Page as PageType, PageType as PageTypeEnum, TipTapContent } from '$lib/types/page';
	import type { GuidedCreationData } from '$lib/types/guided-creation';
	import type { EntityToCreate } from '$lib/services/template-renderers';
	import type { Area } from '$lib/types/areas';
	import type { Space, SystemSpaceSlug } from '$lib/types/spaces';
	import { renderTemplate } from '$lib/services/template-renderers';
	import { isSystemSpace as checkIsSystemSpace } from '$lib/types/spaces';
	import { SPACES, isValidSpace } from '$lib/config/spaces';
	import SpaceIcon from '$lib/components/SpaceIcon.svelte';

	// Server data
	let { data } = $props();

	// Route params
	let spaceParam = $derived($page.params.space);
	let areaParam = $derived($page.params.area);

	// State
	let isLoading = $state(true);
	let isNewPageModalOpen = $state(false);
	let isCreating = $state(false);

	// Delete modal state
	let pageToDelete = $state<PageType | null>(null);
	let isDeleteModalOpen = $state(false);
	let isDeleting = $state(false);

	// Import modal state
	let isImportModalOpen = $state(false);

	// Share modal state
	let pageToShare = $state<PageType | null>(null);
	let isShareModalOpen = $state(false);

	// Load space (system or custom)
	let spaceFromStore = $derived.by(() => {
		if (!spaceParam) return null;
		return spacesStore.getSpaceBySlug(spaceParam);
	});

	let isSystemSpace = $derived(spaceParam ? isValidSpace(spaceParam) : false);

	let spaceConfig = $derived.by(() => {
		if (isSystemSpace && spaceParam) {
			const config = SPACES[spaceParam as keyof typeof SPACES];
			return {
				id: spaceParam,
				slug: spaceParam,
				name: config.name,
				icon: config.icon,
				color: config.accentColor,
				context: '',
				type: 'system' as const
			};
		}
		if (spaceFromStore) {
			return spaceFromStore;
		}
		return null;
	});

	// Construct Space object
	let space = $derived.by((): Space | null => {
		if (!spaceConfig) return null;
		return {
			id: spaceConfig.id || spaceParam || '',
			slug: spaceConfig.slug || spaceParam || '',
			name: spaceConfig.name || 'Space',
			type: spaceConfig.type || 'custom',
			icon: spaceConfig.icon,
			color: spaceConfig.color,
			context: spaceConfig.context,
			orderIndex: 0,
			userId: 'admin',
			createdAt: new Date(),
			updatedAt: new Date()
		};
	});

	// Use proper space ID from store for API calls
	let properSpaceId = $derived(spaceFromStore?.id ?? '');

	// Load area
	let area = $derived.by((): Area | null => {
		if (!properSpaceId || !areaParam) return null;
		return areaStore.getAreaBySlug(properSpaceId, areaParam) ?? null;
	});

	// Derive colors
	let spaceColor = $derived(space?.color || '#3b82f6');
	let areaColor = $derived(area?.color || spaceColor);

	// User data for mobile header
	let userData = $derived($page.data.user as { displayName: string | null; role: 'owner' | 'admin' | 'member' } | null);

	// Pages for this area
	let pages = $derived.by(() => {
		if (!area?.id) return [];
		return pageStore.getPagesForArea(area.id);
	});

	// Apply area color
	$effect(() => {
		if (areaColor) {
			document.documentElement.style.setProperty('--space-accent', areaColor);
			document.documentElement.style.setProperty('--space-accent-muted', `color-mix(in srgb, ${areaColor} 15%, transparent)`);
			document.documentElement.style.setProperty('--space-accent-ring', `color-mix(in srgb, ${areaColor} 40%, transparent)`);
		}
		return () => {
			document.documentElement.style.removeProperty('--space-accent');
			document.documentElement.style.removeProperty('--space-accent-muted');
			document.documentElement.style.removeProperty('--space-accent-ring');
		};
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

		// Load pages for this area
		await pageStore.loadPages(loadedArea.id);

		isLoading = false;
	});

	// Navigation handlers
	function goToSpaceDashboard() {
		goto(`/spaces/${spaceParam}`);
	}

	function goToArea() {
		goto(`/spaces/${spaceParam}/${areaParam}`);
	}

	function handleSelectPage(selectedPage: PageType) {
		goto(`/spaces/${spaceParam}/${areaParam}/pages/${selectedPage.id}`);
	}

	function handleNewPage() {
		isNewPageModalOpen = true;
	}

	function handleCloseModal() {
		isNewPageModalOpen = false;
	}

	function handleImportPage() {
		isImportModalOpen = true;
	}

	async function handleImportSuccess(page: PageType) {
		isImportModalOpen = false;
		toastStore.success('Page imported');

		// Refresh page store cache
		if (area?.id) {
			await pageStore.loadPages(area.id);
		}

		// Navigate to the new page
		goto(`/spaces/${spaceParam}/${areaParam}/pages/${page.id}`);
	}

	async function handleCreatePage(data: {
		title: string;
		pageType: PageTypeEnum;
		template: TipTapContent | null;
		guidedData?: GuidedCreationData;
	}) {
		if (!area?.id || isCreating) return;

		isCreating = true;
		try {
			// If guided data, extract entities to create
			let entitiesToCreate: EntityToCreate[] = [];
			if (data.guidedData) {
				const renderResult = renderTemplate(data.guidedData, area.context);
				entitiesToCreate = renderResult.entitiesToCreate;
			}

			// Call API directly to handle entity creation
			const response = await fetch('/api/pages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					areaId: area.id,
					title: data.title,
					content: data.template,
					pageType: data.pageType,
					visibility: 'private',
					guidedData: data.guidedData,
					entitiesToCreate
				})
			});

			const result = await response.json();

			if (response.ok && result.page) {
				isNewPageModalOpen = false;

				// Enhanced success message with task count
				if (result.entitiesCreated?.length > 0) {
					const taskCount = result.entitiesCreated.filter((e: { success: boolean }) => e.success).length;
					if (taskCount > 0) {
						toastStore.success(`Page created with ${taskCount} task${taskCount !== 1 ? 's' : ''}`);
					} else {
						toastStore.success('Page created');
					}
				} else {
					toastStore.success('Page created');
				}

				// Refresh page store cache
				await pageStore.loadPages(area.id);

				// Navigate to the new page
				goto(`/spaces/${spaceParam}/${areaParam}/pages/${result.page.id}`);
			} else {
				toastStore.error(result.error || 'Failed to create page');
			}
		} catch (err) {
			console.error('Failed to create page:', err);
			toastStore.error('Failed to create page');
		} finally {
			isCreating = false;
		}
	}

	// Delete handlers
	function handleDeletePage(pageItem: PageType) {
		pageToDelete = pageItem;
		isDeleteModalOpen = true;
	}

	function handleCancelDelete() {
		pageToDelete = null;
		isDeleteModalOpen = false;
	}

	async function handleConfirmDelete() {
		if (!pageToDelete || isDeleting) return;

		isDeleting = true;
		try {
			const success = await pageStore.deletePage(pageToDelete.id);
			if (success) {
				toastStore.success('Page deleted');
				isDeleteModalOpen = false;
				pageToDelete = null;
			} else {
				toastStore.error('Failed to delete page');
			}
		} catch (err) {
			console.error('Failed to delete page:', err);
			toastStore.error('Failed to delete page');
		} finally {
			isDeleting = false;
		}
	}

	// Share handlers
	function handleSharePage(pageItem: PageType) {
		pageToShare = pageItem;
		isShareModalOpen = true;
	}

	function handleCloseShareModal() {
		pageToShare = null;
		isShareModalOpen = false;
	}
</script>

<svelte:head>
	<title>Pages - {area?.name || 'Area'} | StratAI</title>
</svelte:head>

{#if isLoading}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading...</p>
	</div>
{:else if space && area}
	<div class="pages-page" style="--area-color: {areaColor}">
		<!-- Mobile Header -->
		<MobileHeader
			title="Pages"
			breadcrumb={area.name}
			onBack={goToArea}
			accentColor={areaColor}
		>
			<!-- Import button -->
			<button
				class="mobile-header-action"
				onclick={handleImportPage}
				title="Import File"
			>
				<Upload size={18} />
			</button>

			<!-- New Page button -->
			<button
				class="mobile-header-action primary"
				onclick={handleNewPage}
				title="New Page"
			>
				<Plus size={18} />
			</button>

			<!-- Actions menu -->
			<MobileActionsMenu>
				<button class="mobile-action-item" onclick={goToArea}>
					<MessageSquare size={16} />
					Back to Chat
				</button>
			</MobileActionsMenu>

			<!-- User Menu -->
			{#if userData}
				<UserMenu displayName={userData.displayName} role={userData.role} iconOnly />
			{/if}
		</MobileHeader>

		<!-- Desktop Header (hidden on mobile) -->
		<header class="pages-header">
			<div class="header-left">
				<button type="button" class="back-button" onclick={goToArea} title="Back to {area.name}">
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
					</svg>
				</button>
				<div class="breadcrumb">
					<button type="button" class="breadcrumb-space" onclick={goToSpaceDashboard}>
						{#if checkIsSystemSpace(space.slug)}
							<SpaceIcon space={space.slug as SystemSpaceSlug} size="sm" class="space-icon-svg" />
						{:else if space.icon}
							<span class="space-icon">{space.icon}</span>
						{/if}
						{space.name}
					</button>
					<span class="breadcrumb-separator">/</span>
					<button type="button" class="breadcrumb-area" style="--badge-color: {areaColor}" onclick={goToArea}>
						{#if area.icon}<span class="area-icon">{area.icon}</span>{/if}
						{area.name}
					</button>
					<span class="breadcrumb-separator">/</span>
					<span class="breadcrumb-current">Pages</span>
				</div>
			</div>
		</header>

		<!-- Main content -->
		<main class="pages-content">
			<PageList
				{pages}
				loading={isLoading}
				onSelect={handleSelectPage}
				onNewPage={handleNewPage}
				onImport={handleImportPage}
				onDelete={handleDeletePage}
				onShare={handleSharePage}
			/>
		</main>
	</div>
{:else}
	<div class="error-container">
		<h2>Not Found</h2>
		<p>The requested space or area could not be found.</p>
		<button type="button" onclick={() => goto('/spaces')}>Go to Spaces</button>
	</div>
{/if}

<!-- New Page Modal -->
<NewPageModal
	isOpen={isNewPageModalOpen}
	spaceId={properSpaceId}
	areaId={area?.id ?? null}
	areaContext={area?.context}
	onClose={handleCloseModal}
	onCreate={handleCreatePage}
/>

<!-- Delete Page Modal -->
<DeletePageModal
	page={pageToDelete}
	isOpen={isDeleteModalOpen}
	{isDeleting}
	onConfirm={handleConfirmDelete}
	onCancel={handleCancelDelete}
/>

<!-- Import Page Modal -->
<ImportPageModal
	isOpen={isImportModalOpen}
	areaId={area?.id ?? null}
	onClose={() => isImportModalOpen = false}
	onSuccess={handleImportSuccess}
/>

<!-- Share Page Modal -->
{#if pageToShare && area && space}
	<SharePageModal
		open={isShareModalOpen}
		page={pageToShare}
		areaId={area.id}
		areaName={area.name}
		spaceName={space.name}
		currentUserId={data.userId ?? ''}
		onClose={handleCloseShareModal}
	/>
{/if}

<style>
	.pages-page {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--editor-bg);
		color: var(--editor-text);
	}

	.pages-header {
		/* Hidden on mobile, flex on desktop */
		display: none;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		background: var(--editor-bg);
		border-bottom: 1px solid var(--editor-border);
	}

	@media (min-width: 768px) {
		.pages-header {
			display: flex;
		}
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.back-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: transparent;
		border-radius: 6px;
		color: var(--editor-text-secondary);
		cursor: pointer;
		transition: background-color 100ms ease, color 100ms ease;
	}

	.back-button:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	.back-button svg {
		width: 18px;
		height: 18px;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.breadcrumb-space,
	.breadcrumb-area {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.5rem;
		border: none;
		background: transparent;
		border-radius: 4px;
		color: var(--editor-text-secondary);
		cursor: pointer;
		transition: background-color 100ms ease, color 100ms ease;
	}

	.breadcrumb-space:hover,
	.breadcrumb-area:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	.breadcrumb-separator {
		color: var(--editor-text-muted);
	}

	.breadcrumb-current {
		color: var(--editor-text);
		font-weight: 500;
	}

	.space-icon,
	.area-icon {
		font-size: 1rem;
	}

	:global(.space-icon-svg) {
		width: 16px;
		height: 16px;
	}

	.pages-content {
		flex: 1;
		overflow-y: auto;
	}

	.loading-container,
	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 1rem;
		color: var(--editor-text-secondary);
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
