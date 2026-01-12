<!--
	DocumentList.svelte

	Reusable list component for displaying documents with search and filtering.
	Used in Space documents page.
-->
<script lang="ts">
	import DocumentCard from './DocumentCard.svelte';
	import type { Document } from '$lib/types/documents';

	interface Props {
		documents: Document[];
		title: string;
		emptyMessage?: string;
		showVisibilityBadge?: boolean;
		showOwner?: boolean;
		showActivation?: boolean;
		activatedIds?: string[];
		showSearch?: boolean;
		areaColor?: string;
		isOwner?: boolean | ((doc: Document) => boolean);
		onShare?: (doc: Document) => void;
		onToggleActivation?: (docId: string) => void;
		onDelete?: (doc: Document) => void;
	}

	let {
		documents,
		title,
		emptyMessage = 'No documents',
		showVisibilityBadge = true,
		showOwner = false,
		showActivation = false,
		activatedIds = [],
		showSearch = true,
		areaColor = '#3b82f6',
		isOwner = true,
		onShare,
		onToggleActivation,
		onDelete
	}: Props = $props();

	let searchQuery = $state('');

	// Filter documents by search
	let filteredDocs = $derived.by(() => {
		if (!searchQuery.trim()) return documents;
		const query = searchQuery.toLowerCase();
		return documents.filter(
			(doc) =>
				doc.filename.toLowerCase().includes(query) || doc.title?.toLowerCase().includes(query)
		);
	});

	// Check if document is activated
	function isActivated(docId: string): boolean {
		return activatedIds.includes(docId);
	}

	// Check if current user is owner of document
	function checkIsOwner(doc: Document): boolean {
		if (typeof isOwner === 'function') {
			return isOwner(doc);
		}
		return isOwner;
	}
</script>

<section class="document-list" style="--area-color: {areaColor}">
	<!-- Header -->
	<div class="section-header">
		<div class="section-title">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
				/>
			</svg>
			<span>{title}</span>
			<span class="doc-count">{documents.length}</span>
		</div>
	</div>

	<!-- Search (if enabled and more than 5 docs) -->
	{#if showSearch && documents.length > 5}
		<div class="search-bar">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
			<input type="text" bind:value={searchQuery} placeholder="Search documents..." />
			{#if searchQuery}
				<button
					type="button"
					class="search-clear"
					onclick={() => (searchQuery = '')}
					aria-label="Clear search"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
	{/if}

	<!-- Document list -->
	{#if filteredDocs.length > 0}
		<div class="doc-list">
			{#each filteredDocs as doc (doc.id)}
				<DocumentCard
					document={doc}
					{showVisibilityBadge}
					{showOwner}
					{showActivation}
					isActivated={isActivated(doc.id)}
					isOwner={checkIsOwner(doc)}
					{areaColor}
					onShare={onShare ? () => onShare(doc) : undefined}
					onToggleActivation={onToggleActivation ? () => onToggleActivation(doc.id) : undefined}
					onDelete={onDelete ? () => onDelete(doc) : undefined}
				/>
			{/each}
		</div>
	{:else if searchQuery}
		<div class="empty-state">
			<p>No documents match "{searchQuery}"</p>
		</div>
	{:else}
		<div class="empty-state">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
				/>
			</svg>
			<p>{emptyMessage}</p>
		</div>
	{/if}
</section>

<style>
	.document-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	/* Section header - matches TaskGroupSection */
	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
	}

	.section-title svg {
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.doc-count {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.5);
		border-radius: 9999px;
	}

	/* Search bar */
	.search-bar {
		position: relative;
	}

	.search-bar > svg {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.search-bar input {
		width: 100%;
		padding: 0.5rem 2rem 0.5rem 2.25rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.search-bar input::placeholder {
		color: rgba(255, 255, 255, 0.35);
	}

	.search-bar input:focus {
		outline: none;
		border-color: var(--area-color);
		background: rgba(255, 255, 255, 0.08);
	}

	.search-clear {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		padding: 0.25rem;
		color: rgba(255, 255, 255, 0.4);
		border-radius: 0.25rem;
	}

	.search-clear:hover {
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.1);
	}

	.search-clear svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	/* Document list */
	.doc-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2rem 1rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
	}

	.empty-state svg {
		width: 2rem;
		height: 2rem;
		color: rgba(255, 255, 255, 0.25);
	}

	.empty-state p {
		margin: 0;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
	}
</style>
