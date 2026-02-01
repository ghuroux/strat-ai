<script lang="ts">
	/**
	 * PageList.svelte - List view of pages in an Area
	 *
	 * Features:
	 * - Search input (client-side filter)
	 * - Type filter dropdown
	 * - Page grid with cards
	 * - Empty state
	 * - Loading state
	 *
	 * Based on DOCUMENT_SYSTEM.md Section 4.6
	 */

	import type { Page, PageType } from '$lib/types/page';
	import { PAGE_TYPE_LABELS } from '$lib/types/page';
	import PageCard from './PageCard.svelte';

	// Props
	interface Props {
		pages: Page[];
		loading?: boolean;
		onSelect: (page: Page) => void;
		onNewPage: () => void;
		onImport?: () => void;
		onDelete?: (page: Page) => void;
		onShare?: (page: Page) => void;
	}

	let { pages, loading = false, onSelect, onNewPage, onImport, onDelete, onShare }: Props = $props();

	// Filter state
	let searchQuery = $state('');
	let typeFilter = $state<PageType | ''>('');
	let statusFilter = $state<'all' | 'draft' | 'finalized'>('all');

	// Page types for filter dropdown
	const pageTypes: { type: PageType | ''; label: string }[] = [
		{ type: '', label: 'All types' },
		{ type: 'general', label: PAGE_TYPE_LABELS.general },
		{ type: 'meeting_notes', label: PAGE_TYPE_LABELS.meeting_notes },
		{ type: 'decision_record', label: PAGE_TYPE_LABELS.decision_record },
		{ type: 'proposal', label: PAGE_TYPE_LABELS.proposal },
		{ type: 'project_brief', label: PAGE_TYPE_LABELS.project_brief },
		{ type: 'weekly_update', label: PAGE_TYPE_LABELS.weekly_update },
		{ type: 'technical_spec', label: PAGE_TYPE_LABELS.technical_spec }
	];

	// Filtered pages
	let filteredPages = $derived.by(() => {
		let result = pages;

		// Apply search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(p) =>
					p.title.toLowerCase().includes(query) ||
					(p.contentText && p.contentText.toLowerCase().includes(query))
			);
		}

		// Apply type filter
		if (typeFilter) {
			result = result.filter((p) => p.pageType === typeFilter);
		}

		// Apply status filter
		if (statusFilter === 'finalized') {
			result = result.filter((p) => p.status === 'finalized');
		} else if (statusFilter === 'draft') {
			result = result.filter((p) => p.status !== 'finalized');
		}

		// Sort by updated date (newest first)
		return result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
	});

	// Check if list is empty
	let isEmpty = $derived(!loading && filteredPages.length === 0);
	let hasActiveFilters = $derived(!!searchQuery || !!typeFilter || statusFilter !== 'all');
	let isEmptyWithFilters = $derived(isEmpty && hasActiveFilters);
	let isEmptyNoPages = $derived(isEmpty && !hasActiveFilters && pages.length === 0);
</script>

<div class="page-list">
	<!-- Header -->
	<div class="list-header">
		<h2 class="list-title">Pages</h2>
		<div class="header-actions">
			{#if onImport}
				<button type="button" class="import-btn" onclick={onImport}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="17 8 12 3 7 8" />
						<line x1="12" y1="3" x2="12" y2="15" />
					</svg>
					<span>Import</span>
				</button>
			{/if}
			<button type="button" class="new-page-btn" onclick={onNewPage}>
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
				</svg>
				<span>New Page</span>
			</button>
		</div>
	</div>

	<!-- Filters -->
	<div class="list-filters">
		<div class="search-wrapper">
			<svg class="search-icon" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
			</svg>
			<input
				type="search"
				placeholder="Search pages..."
				bind:value={searchQuery}
				class="search-input"
			/>
		</div>
		<select bind:value={typeFilter} class="type-filter">
			{#each pageTypes as pt}
				<option value={pt.type}>{pt.label}</option>
			{/each}
		</select>
		<select bind:value={statusFilter} class="type-filter">
			<option value="all">All statuses</option>
			<option value="draft">Draft</option>
			<option value="finalized">Finalized</option>
		</select>
	</div>

	<!-- Loading state -->
	{#if loading}
		<div class="pages-grid">
			{#each Array(6) as _}
				<div class="page-card-skeleton">
					<div class="skeleton-icon"></div>
					<div class="skeleton-content">
						<div class="skeleton-title"></div>
						<div class="skeleton-meta"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if isEmptyNoPages}
		<!-- Empty state - no pages at all -->
		<div class="empty-state">
			<div class="empty-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<path d="M14 2v6h6" />
					<path d="M12 18v-6" />
					<path d="M9 15h6" />
				</svg>
			</div>
			<h3 class="empty-title">No pages yet</h3>
			<p class="empty-description">Create your first page to start capturing knowledge</p>
			<button type="button" class="empty-action" onclick={onNewPage}>
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
				</svg>
				<span>New Page</span>
			</button>
		</div>
	{:else if isEmptyWithFilters}
		<!-- Empty state - no results for filters -->
		<div class="empty-state">
			<div class="empty-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<circle cx="11" cy="11" r="8" />
					<path d="M21 21l-4.35-4.35" />
				</svg>
			</div>
			<h3 class="empty-title">No pages found</h3>
			<p class="empty-description">Try adjusting your search or filters</p>
			<button
				type="button"
				class="empty-action secondary"
				onclick={() => { searchQuery = ''; typeFilter = ''; statusFilter = 'all'; }}
			>
				Clear filters
			</button>
		</div>
	{:else}
		<!-- Page grid -->
		<div class="pages-grid">
			{#each filteredPages as page (page.id)}
				<PageCard {page} onclick={() => onSelect(page)} {onDelete} {onShare} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.page-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.list-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.list-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--editor-text);
		margin: 0;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.import-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: transparent;
		color: var(--editor-text-secondary);
		border: 1px solid var(--editor-border);
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 100ms ease, color 100ms ease;
	}

	.import-btn:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	.import-btn svg {
		width: 16px;
		height: 16px;
	}

	.new-page-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: var(--editor-border-focus);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: filter 150ms ease;
	}

	.new-page-btn:hover {
		filter: brightness(1.1);
	}

	.new-page-btn svg {
		width: 16px;
		height: 16px;
	}

	.list-filters {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.search-wrapper {
		position: relative;
		flex: 1;
		min-width: 200px;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 16px;
		height: 16px;
		color: var(--editor-text-muted);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.625rem 0.75rem 0.625rem 2.25rem;
		border: 1px solid var(--editor-border);
		border-radius: 8px;
		background: var(--editor-bg);
		color: var(--editor-text);
		font-size: 0.875rem;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--editor-border-focus);
	}

	.search-input::placeholder {
		color: var(--editor-text-muted);
	}

	.type-filter {
		padding: 0.625rem 2rem 0.625rem 0.75rem;
		border: 1px solid var(--editor-border);
		border-radius: 8px;
		background: var(--editor-bg);
		color: var(--editor-text);
		font-size: 0.875rem;
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;
	}

	.type-filter:focus {
		outline: none;
		border-color: var(--editor-border-focus);
	}

	.pages-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	/* Skeleton loading */
	.page-card-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.25rem;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		border-radius: 12px;
	}

	.skeleton-icon {
		width: 40px;
		height: 40px;
		background: var(--toolbar-button-hover);
		border-radius: 8px;
		animation: skeleton-pulse 1.5s ease-in-out infinite;
	}

	.skeleton-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-title {
		height: 1rem;
		width: 80%;
		background: var(--toolbar-button-hover);
		border-radius: 4px;
		animation: skeleton-pulse 1.5s ease-in-out infinite;
	}

	.skeleton-meta {
		height: 0.75rem;
		width: 50%;
		background: var(--toolbar-button-hover);
		border-radius: 4px;
		animation: skeleton-pulse 1.5s ease-in-out infinite;
	}

	@keyframes skeleton-pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	.empty-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		background: var(--toolbar-button-hover);
		border-radius: 16px;
		margin-bottom: 1.5rem;
	}

	.empty-icon svg {
		width: 32px;
		height: 32px;
		color: var(--editor-text-muted);
	}

	.empty-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--editor-text);
		margin: 0 0 0.5rem 0;
	}

	.empty-description {
		font-size: 0.875rem;
		color: var(--editor-text-secondary);
		margin: 0 0 1.5rem 0;
		max-width: 280px;
	}

	.empty-action {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: var(--editor-border-focus);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: filter 150ms ease;
	}

	.empty-action:hover {
		filter: brightness(1.1);
	}

	.empty-action.secondary {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	.empty-action svg {
		width: 16px;
		height: 16px;
	}
</style>
