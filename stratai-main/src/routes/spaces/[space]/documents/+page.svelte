<script lang="ts">
	/**
	 * Space Documents Page
	 *
	 * Displays all documents in a space:
	 * - My Documents: User's uploaded documents
	 * - Shared with Me: Documents shared by others
	 *
	 * Route: /spaces/[space]/documents
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { documentStore } from '$lib/stores/documents.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import DocumentList from '$lib/components/documents/DocumentList.svelte';
	import ShareDocumentModal from '$lib/components/documents/ShareDocumentModal.svelte';
	import type { Document } from '$lib/types/documents';
	import { ACCEPT_DOCUMENTS } from '$lib/config/file-types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Get space from route param
	let spaceParam = $derived($page.params.space);

	// Get space from store
	let spaceFromStore = $derived.by(() => {
		if (!spaceParam) return null;
		return spacesStore.getSpaceBySlug(spaceParam);
	});

	// Space config
	let spaceConfig = $derived.by(() => {
		if (!spaceFromStore) return null;
		return {
			id: spaceFromStore.id,
			slug: spaceFromStore.slug,
			name: spaceFromStore.name,
			color: spaceFromStore.color || '#3b82f6'
		};
	});

	// Documents from store
	let myDocuments = $derived.by(() => {
		if (!spaceFromStore) return [];
		return documentStore.getDocuments(spaceFromStore.id);
	});

	let sharedDocuments = $derived.by(() => {
		if (!spaceFromStore) return [];
		return documentStore.getSharedDocuments(spaceFromStore.id);
	});

	// Filter state
	type VisibilityFilter = 'all' | 'private' | 'shared' | 'space';
	let visibilityFilter = $state<VisibilityFilter>('all');

	// Filtered documents
	let filteredMyDocuments = $derived.by(() => {
		if (visibilityFilter === 'all') return myDocuments;
		return myDocuments.filter((doc) => doc.visibility === visibilityFilter);
	});

	// UI state
	let isLoading = $state(true);
	let isDragOver = $state(false);
	let isUploading = $state(false);

	// Share modal state
	let shareModalOpen = $state(false);
	let docToShare = $state<Document | null>(null);

	// Load data on mount
	onMount(async () => {
		if (!spaceParam) {
			goto('/spaces');
			return;
		}

		// Ensure spaces are loaded first
		await spacesStore.loadSpaces();
		const space = spacesStore.getSpaceBySlug(spaceParam);
		if (!space) {
			toastStore.error('Space not found');
			goto('/spaces');
			return;
		}

		// Load documents
		await Promise.all([
			documentStore.loadDocuments(space.id),
			documentStore.loadSharedDocuments(space.id)
		]);

		isLoading = false;
	});

	// Handle drag events
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;

		const files = e.dataTransfer?.files;
		if (files?.length && spaceFromStore) {
			await uploadFiles(Array.from(files));
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.length && spaceFromStore) {
			uploadFiles(Array.from(input.files));
			input.value = '';
		}
	}

	async function uploadFiles(files: File[]) {
		if (!spaceFromStore) return;

		// Filter for supported types
		const supported = files.filter(
			(f) =>
				f.type === 'application/pdf' ||
				f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
				f.type === 'text/plain' ||
				f.type === 'text/markdown' ||
				f.name.endsWith('.md') ||
				f.name.endsWith('.txt') ||
				f.name.endsWith('.docx')
		);

		if (supported.length < files.length) {
			toastStore.warning('Some files were skipped (only PDF, DOCX, TXT, MD supported)');
		}

		if (supported.length === 0) return;

		isUploading = true;

		let uploadedCount = 0;
		for (const file of supported) {
			const doc = await documentStore.uploadDocument(file, spaceFromStore.id);
			if (doc) {
				uploadedCount++;
			}
		}

		if (uploadedCount > 0) {
			toastStore.success(`${uploadedCount} document${uploadedCount > 1 ? 's' : ''} uploaded`);
		}

		isUploading = false;
	}

	// Share modal handlers
	function openShareModal(doc: Document) {
		docToShare = doc;
		shareModalOpen = true;
	}

	function closeShareModal() {
		shareModalOpen = false;
		docToShare = null;
	}

	async function handleShareSaved() {
		if (spaceFromStore) {
			// Refresh documents to show updated visibility
			documentStore.clearSharedCache(spaceFromStore.id);
			await documentStore.loadDocuments(spaceFromStore.id);
			await documentStore.loadSharedDocuments(spaceFromStore.id);
		}
		closeShareModal();
		toastStore.success('Sharing updated');
	}

	// Delete handler
	async function handleDelete(doc: Document) {
		const success = await documentStore.deleteDocument(doc.id);
		if (success) {
			toastStore.success('Document deleted');
		}
	}
</script>

<svelte:head>
	<title>Documents - {spaceConfig?.name || 'Space'} | StratAI</title>
</svelte:head>

<!-- Global drop zone handler - must be at root level -->
<svelte:window ondragover={handleDragOver} ondragleave={handleDragLeave} ondrop={handleDrop} />

{#if isLoading}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading documents...</p>
	</div>
{:else if spaceConfig}
	<div class="documents-dashboard" style="--space-color: {spaceConfig.color}">
		<!-- Header -->
		<header class="dashboard-header">
			<!-- Back button -->
			<button type="button" class="back-button" onclick={() => goto(`/spaces/${spaceConfig.slug}`)}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
				</svg>
				<span>{spaceConfig.name}</span>
			</button>

			<!-- Center title and count -->
			<div class="header-center">
				<h1 class="dashboard-title">Documents</h1>
				<span class="doc-total">{myDocuments.length + sharedDocuments.length}</span>
			</div>

			<!-- Upload button -->
			<div class="header-right">
				<label class="upload-btn">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
						/>
					</svg>
					<span>Upload</span>
					<input
						type="file"
						accept={ACCEPT_DOCUMENTS}
						multiple
						onchange={handleFileSelect}
					/>
				</label>
			</div>
		</header>

		<!-- Scrollable content area -->
		<div class="dashboard-scroll">
			<div class="dashboard-content">
				<!-- Filter tabs -->
				<div class="filter-tabs">
					<button
						type="button"
						class="filter-tab"
						class:active={visibilityFilter === 'all'}
						onclick={() => (visibilityFilter = 'all')}
					>
						All
					</button>
					<button
						type="button"
						class="filter-tab"
						class:active={visibilityFilter === 'private'}
						onclick={() => (visibilityFilter = 'private')}
					>
						Private
					</button>
					<button
						type="button"
						class="filter-tab"
						class:active={visibilityFilter === 'shared'}
						onclick={() => (visibilityFilter = 'shared')}
					>
						Shared
					</button>
					<button
						type="button"
						class="filter-tab"
						class:active={visibilityFilter === 'space'}
						onclick={() => (visibilityFilter = 'space')}
					>
						Space-wide
					</button>
				</div>

				<!-- My Documents -->
				{#if filteredMyDocuments.length > 0 || visibilityFilter === 'all'}
					<DocumentList
						documents={filteredMyDocuments}
						title="My Documents"
						emptyMessage="You haven't uploaded any documents yet"
						showVisibilityBadge={true}
						areaColor={spaceConfig.color}
						onShare={openShareModal}
						onDelete={handleDelete}
					/>
				{/if}

				<!-- Shared with Me (only show if there are shared docs) -->
				{#if sharedDocuments.length > 0}
					<DocumentList
						documents={sharedDocuments}
						title="Shared with Me"
						emptyMessage="No documents shared with you"
						showVisibilityBadge={true}
						showOwner={true}
						isOwner={false}
						areaColor={spaceConfig.color}
					/>
				{/if}

				<!-- Empty state when no documents at all -->
				{#if myDocuments.length === 0 && sharedDocuments.length === 0}
					<div class="empty-state">
						<div class="empty-icon">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
							</svg>
						</div>
						<p class="empty-title">No documents yet</p>
						<p class="empty-text">Upload a document to get started.</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Drop zone overlay -->
		{#if isDragOver}
			<div class="drop-overlay">
				<div class="drop-zone">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
						/>
					</svg>
					<p>Drop files here to upload</p>
					<span>PDF, DOCX, TXT, MD</span>
				</div>
			</div>
		{/if}

		<!-- Upload progress -->
		{#if isUploading}
			<div class="upload-progress">
				<div class="upload-spinner"></div>
				<span>Uploading...</span>
			</div>
		{/if}
	</div>

	<!-- Share Modal -->
	<ShareDocumentModal
		open={shareModalOpen}
		document={docToShare}
		spaceId={spaceConfig.id}
		onClose={closeShareModal}
		onSaved={handleShareSaved}
	/>
{:else}
	<div class="error-container">
		<h1>Space not found</h1>
		<p>The space you're looking for doesn't exist.</p>
		<a href="/spaces" class="back-link">Back to spaces</a>
	</div>
{/if}

<style>
	/* Dashboard container */
	.documents-dashboard {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg-primary, #0a0a0a);
		position: relative;
	}

	/* Header - matches TaskDashboard pattern */
	.dashboard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(255, 255, 255, 0.02);
	}

	.back-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.back-button:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.06);
	}

	.back-button svg {
		width: 1rem;
		height: 1rem;
	}

	.header-center {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.dashboard-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin: 0;
	}

	.doc-total {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 9999px;
		color: rgba(255, 255, 255, 0.6);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	/* Upload button - outlined style like add-task-btn */
	.upload-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--space-color);
		background: color-mix(in srgb, var(--space-color) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--space-color) 20%, transparent);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.upload-btn:hover {
		background: color-mix(in srgb, var(--space-color) 20%, transparent);
		border-color: color-mix(in srgb, var(--space-color) 40%, transparent);
	}

	.upload-btn svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.upload-btn input {
		display: none;
	}

	/* Scrollable content area */
	.dashboard-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	/* Centered content with max-width */
	.dashboard-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 800px;
		margin: 0 auto;
		width: 100%;
	}

	/* Filter tabs - compact style */
	.filter-tabs {
		display: flex;
		gap: 0.25rem;
		padding: 0.25rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		width: fit-content;
		margin-bottom: 0.5rem;
	}

	.filter-tab {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.filter-tab:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.05);
	}

	.filter-tab.active {
		color: rgba(255, 255, 255, 0.95);
		background: rgba(255, 255, 255, 0.1);
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
	}

	.empty-icon {
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.75rem;
		margin-bottom: 1rem;
	}

	.empty-icon svg {
		width: 1.5rem;
		height: 1.5rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.empty-title {
		font-size: 1rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
		margin: 0 0 0.25rem;
	}

	.empty-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	/* Drop overlay */
	.drop-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.drop-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem 4rem;
		border: 2px dashed var(--space-color);
		border-radius: 1rem;
		background: color-mix(in srgb, var(--space-color) 10%, transparent);
	}

	.drop-zone svg {
		width: 3rem;
		height: 3rem;
		color: var(--space-color);
	}

	.drop-zone p {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	.drop-zone span {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
	}

	/* Upload progress */
	.upload-progress {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.25rem;
		background: rgb(23, 23, 23);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
		z-index: 50;
	}

	.upload-spinner {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-top-color: var(--space-color);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.upload-progress span {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
	}

	/* Loading */
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 1rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.loading-spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-top-color: var(--space-color, #3b82f6);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Error */
	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 1rem;
		text-align: center;
		padding: 2rem;
	}

	.error-container h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin: 0;
	}

	.error-container p {
		font-size: 0.9375rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.back-link {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--space-color, #3b82f6);
		background: rgba(59, 130, 246, 0.1);
		border-radius: 0.375rem;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.back-link:hover {
		background: rgba(59, 130, 246, 0.2);
	}
</style>
