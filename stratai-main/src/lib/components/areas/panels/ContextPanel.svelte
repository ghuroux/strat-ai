<!--
	ContextPanel.svelte

	Slide-out panel for managing area context - "What does the AI know?"

	Features:
	- Area Notes: View/edit area.context (markdown text)
	- Documents: Activation toggles for area.contextDocumentIds
	- Search: Filter documents
	- Upload: Add new documents (auto-activated)
	- Delete: Remove documents from space
-->
<script lang="ts">
	import PanelBase from './PanelBase.svelte';
	import { documentStore } from '$lib/stores/documents.svelte';
	import { areaStore } from '$lib/stores/areas.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Document } from '$lib/types/documents';
	import type { Area } from '$lib/types/areas';

	interface Props {
		isOpen: boolean;
		area: Area;
		spaceId: string;
		spaceColor?: string;
		onClose: () => void;
		onAreaUpdate?: (areaId: string, updates: { context?: string; contextDocumentIds?: string[] }) => Promise<void>;
	}

	let {
		isOpen,
		area,
		spaceId,
		spaceColor = '#3b82f6',
		onClose,
		onAreaUpdate
	}: Props = $props();

	// Local state
	let isDragOver = $state(false);
	let isUploading = $state(false);
	let isEditingNotes = $state(false);
	let notesValue = $state('');
	let isSavingNotes = $state(false);
	let searchQuery = $state('');
	let deleteConfirmId = $state<string | null>(null);

	// Load documents when panel opens
	$effect(() => {
		if (isOpen && spaceId) {
			documentStore.loadDocuments(spaceId);
		}
	});

	// Sync notes value when area changes or edit mode starts
	$effect(() => {
		if (isEditingNotes) {
			notesValue = area.context ?? '';
		}
	});

	// Get all documents for this space
	let spaceDocs = $derived.by(() => {
		return documentStore.getDocuments(spaceId);
	});

	// Filter documents by search
	let filteredDocs = $derived.by(() => {
		if (!searchQuery.trim()) return spaceDocs;
		const query = searchQuery.toLowerCase();
		return spaceDocs.filter(doc =>
			doc.filename.toLowerCase().includes(query) ||
			(doc.title?.toLowerCase().includes(query))
		);
	});

	// Sort: active first, then by name
	let sortedDocs = $derived.by(() => {
		const activeIds = new Set(area.contextDocumentIds ?? []);
		return [...filteredDocs].sort((a, b) => {
			const aActive = activeIds.has(a.id);
			const bActive = activeIds.has(b.id);
			if (aActive && !bActive) return -1;
			if (!aActive && bActive) return 1;
			return a.filename.localeCompare(b.filename);
		});
	});

	// Count active documents and total chars
	let activeCount = $derived((area.contextDocumentIds ?? []).length);
	let totalActiveChars = $derived.by(() => {
		const activeIds = new Set(area.contextDocumentIds ?? []);
		return spaceDocs
			.filter(doc => activeIds.has(doc.id))
			.reduce((sum, doc) => sum + doc.charCount, 0);
	});

	// Check if a document is active
	function isDocActive(docId: string): boolean {
		return (area.contextDocumentIds ?? []).includes(docId);
	}

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Format character count
	function formatCharCount(count: number): string {
		if (count < 1000) return `${count}`;
		return `${(count / 1000).toFixed(1)}k`;
	}

	// Get file icon based on mime type
	function getFileIcon(mimeType: string): string {
		if (mimeType === 'application/pdf') return 'pdf';
		if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'word';
		if (mimeType.startsWith('text/')) return 'text';
		return 'generic';
	}

	// Toggle document activation
	async function toggleDocument(docId: string) {
		if (!onAreaUpdate) return;

		const currentIds = area.contextDocumentIds ?? [];
		const isActive = currentIds.includes(docId);

		const newIds = isActive
			? currentIds.filter(id => id !== docId)
			: [...currentIds, docId];

		try {
			await onAreaUpdate(area.id, { contextDocumentIds: newIds });
		} catch (e) {
			toastStore.error('Failed to update document activation');
		}
	}

	// Save notes
	async function saveNotes() {
		if (!onAreaUpdate) return;

		isSavingNotes = true;
		try {
			await onAreaUpdate(area.id, { context: notesValue || undefined });
			isEditingNotes = false;
			toastStore.success('Notes saved');
		} catch (e) {
			toastStore.error('Failed to save notes');
		} finally {
			isSavingNotes = false;
		}
	}

	// Cancel notes editing
	function cancelNotes() {
		isEditingNotes = false;
		notesValue = area.context ?? '';
	}

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
		if (files?.length) {
			await uploadFiles(Array.from(files));
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.length) {
			uploadFiles(Array.from(input.files));
			input.value = '';
		}
	}

	async function uploadFiles(files: File[]) {
		// Filter for supported types
		const supported = files.filter(f =>
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
		const uploadedDocIds: string[] = [];

		for (const file of supported) {
			const doc = await documentStore.uploadDocument(file, spaceId);
			if (doc) {
				uploadedDocIds.push(doc.id);
			}
		}

		// Auto-activate uploaded documents
		if (uploadedDocIds.length > 0 && onAreaUpdate) {
			const currentIds = area.contextDocumentIds ?? [];
			const newIds = [...currentIds, ...uploadedDocIds];
			try {
				await onAreaUpdate(area.id, { contextDocumentIds: newIds });
				toastStore.success(`${uploadedDocIds.length} document${uploadedDocIds.length > 1 ? 's' : ''} added`);
			} catch (e) {
				toastStore.warning('Documents uploaded but not activated');
			}
		}

		isUploading = false;
	}

	async function handleDelete(doc: Document) {
		const success = await documentStore.deleteDocument(doc.id);
		if (success) {
			// Remove from contextDocumentIds if present
			const currentIds = area.contextDocumentIds ?? [];
			if (currentIds.includes(doc.id) && onAreaUpdate) {
				const newIds = currentIds.filter(id => id !== doc.id);
				await onAreaUpdate(area.id, { contextDocumentIds: newIds });
			}
			toastStore.success('Document deleted');
		}
		deleteConfirmId = null;
	}
</script>

<PanelBase
	{isOpen}
	title="Context"
	subtitle="What the AI knows about this area"
	position="right"
	width="22rem"
	{onClose}
>
	{#snippet content()}
		<div class="context-content" style="--space-color: {spaceColor}">
			<!-- Area Notes Section -->
			<section class="notes-section">
				<div class="section-header">
					<div class="section-title">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
						</svg>
						<span>Notes</span>
					</div>
					{#if !isEditingNotes}
						<button
							type="button"
							class="edit-btn"
							onclick={() => { isEditingNotes = true; notesValue = area.context ?? ''; }}
						>
							Edit
						</button>
					{/if}
				</div>

				{#if isEditingNotes}
					<div class="notes-edit">
						<textarea
							bind:value={notesValue}
							placeholder="Add context for the AI (e.g., goals, constraints, key information)..."
							rows="4"
						></textarea>
						<div class="notes-actions">
							<button type="button" class="btn-cancel" onclick={cancelNotes} disabled={isSavingNotes}>
								Cancel
							</button>
							<button type="button" class="btn-save" onclick={saveNotes} disabled={isSavingNotes}>
								{isSavingNotes ? 'Saving...' : 'Save'}
							</button>
						</div>
					</div>
				{:else if area.context}
					<div class="notes-preview">{area.context}</div>
				{:else}
					<div class="notes-empty">
						No notes yet. Add context to help the AI understand this area.
					</div>
				{/if}
			</section>

			<!-- Documents Section -->
			<section class="docs-section">
				<div class="section-header">
					<div class="section-title">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
						</svg>
						<span>Documents</span>
					</div>
					<div class="doc-stats">
						{#if activeCount > 0}
							<span class="stat-badge">{activeCount} active</span>
							<span class="stat-chars">{formatCharCount(totalActiveChars)} chars</span>
						{:else}
							<span class="stat-none">None active</span>
						{/if}
					</div>
				</div>

				<!-- Search -->
				{#if spaceDocs.length > 5}
					<div class="search-bar">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search documents..."
						/>
						{#if searchQuery}
							<button type="button" class="search-clear" onclick={() => searchQuery = ''} aria-label="Clear search">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						{/if}
					</div>
				{/if}

				<!-- Document List -->
				{#if sortedDocs.length > 0}
					<div class="doc-list">
						{#each sortedDocs as doc (doc.id)}
							{@const icon = getFileIcon(doc.mimeType)}
							{@const active = isDocActive(doc.id)}
							<div class="doc-item" class:active>
								<!-- Activation checkbox -->
								<button
									type="button"
									class="doc-toggle"
									class:checked={active}
									onclick={() => toggleDocument(doc.id)}
									title={active ? 'Remove from context' : 'Add to context'}
								>
									{#if active}
										<svg viewBox="0 0 24 24" fill="currentColor">
											<path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd" />
										</svg>
									{:else}
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
											<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
									{/if}
								</button>

								<!-- File icon -->
								<div class="doc-icon" class:pdf={icon === 'pdf'} class:word={icon === 'word'} class:text={icon === 'text'}>
									{#if icon === 'pdf'}
										<svg viewBox="0 0 24 24" fill="currentColor">
											<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9c.55 0 1-.45 1-1s-.45-1-1-1H7v4h1v-1h2c.55 0 1-.45 1-1zM8 10h2v1H8v-1zm6 4c.55 0 1-.45 1-1v-2c0-.55-.45-1-1-1h-3v4h3zm-2-3h1v2h-1v-2zm5 3c.55 0 1-.45 1-1v-2c0-.55-.45-1-1-1h-1c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h1zm0-3v2h-1v-2h1z"/>
										</svg>
									{:else if icon === 'word'}
										<svg viewBox="0 0 24 24" fill="currentColor">
											<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-4.5-8.5l-1.5 6-1.5-6H9l2.25 7.5h1.5L14.5 13l1.75 6h1.5L20 11.5h-1.5l-1.5 6-1.5-6h-1.5z"/>
										</svg>
									{:else}
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
											<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
										</svg>
									{/if}
								</div>

								<!-- Doc info -->
								<div class="doc-info">
									<span class="doc-name" title={doc.filename}>{doc.title || doc.filename}</span>
									<span class="doc-meta">{formatCharCount(doc.charCount)} chars</span>
								</div>

								<!-- Delete button -->
								{#if deleteConfirmId === doc.id}
									<div class="delete-confirm">
										<button type="button" class="confirm-yes" onclick={() => handleDelete(doc)}>
											Delete
										</button>
										<button type="button" class="confirm-no" onclick={() => deleteConfirmId = null}>
											Cancel
										</button>
									</div>
								{:else}
									<button
										type="button"
										class="doc-delete"
										onclick={() => deleteConfirmId = doc.id}
										title="Delete document"
									>
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								{/if}
							</div>
						{/each}
					</div>
				{:else if searchQuery}
					<div class="empty-state">
						<p>No documents match "{searchQuery}"</p>
					</div>
				{/if}

				<!-- Upload zone -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="upload-zone"
					class:drag-over={isDragOver}
					class:uploading={isUploading}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					ondrop={handleDrop}
				>
					{#if isUploading}
						<div class="upload-spinner"></div>
						<span>Uploading...</span>
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
						</svg>
						<p>
							Drop files or
							<label class="browse-link">
								browse
								<input
									type="file"
									accept=".pdf,.docx,.txt,.md,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
									multiple
									onchange={handleFileSelect}
								/>
							</label>
						</p>
						<span class="file-types">PDF, DOCX, TXT, MD</span>
					{/if}
				</div>
			</section>
		</div>
	{/snippet}
</PanelBase>

<style>
	.context-content {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Section styles */
	section {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		padding: 0.75rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.5);
	}

	.section-title svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	/* Notes section */
	.edit-btn {
		font-size: 0.6875rem;
		color: var(--space-color);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		transition: all 0.15s ease;
	}

	.edit-btn:hover {
		background: color-mix(in srgb, var(--space-color) 15%, transparent);
	}

	.notes-preview {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.notes-empty {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		font-style: italic;
	}

	.notes-edit textarea {
		width: 100%;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.375rem;
		padding: 0.5rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.9);
		resize: vertical;
		min-height: 4rem;
	}

	.notes-edit textarea:focus {
		outline: none;
		border-color: var(--space-color);
	}

	.notes-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.btn-cancel,
	.btn-save {
		font-size: 0.75rem;
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		font-weight: 500;
		transition: all 0.15s ease;
	}

	.btn-cancel {
		color: rgba(255, 255, 255, 0.6);
	}

	.btn-cancel:hover {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.9);
	}

	.btn-save {
		background: var(--space-color);
		color: #fff;
	}

	.btn-save:hover {
		filter: brightness(1.1);
	}

	.btn-save:disabled,
	.btn-cancel:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Documents section */
	.doc-stats {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.6875rem;
	}

	.stat-badge {
		padding: 0.125rem 0.375rem;
		background: color-mix(in srgb, var(--space-color) 20%, transparent);
		color: var(--space-color);
		border-radius: 0.25rem;
		font-weight: 500;
	}

	.stat-chars {
		color: rgba(255, 255, 255, 0.4);
	}

	.stat-none {
		color: rgba(255, 255, 255, 0.35);
	}

	/* Search bar */
	.search-bar {
		position: relative;
		margin-bottom: 0.5rem;
	}

	.search-bar svg {
		position: absolute;
		left: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		width: 0.875rem;
		height: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.search-bar input {
		width: 100%;
		padding: 0.375rem 1.75rem 0.375rem 1.75rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.375rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.search-bar input:focus {
		outline: none;
		border-color: var(--space-color);
	}

	.search-clear {
		position: absolute;
		right: 0.375rem;
		top: 50%;
		transform: translateY(-50%);
		padding: 0.125rem;
		color: rgba(255, 255, 255, 0.4);
		border-radius: 0.25rem;
	}

	.search-clear:hover {
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.1);
	}

	.search-clear svg {
		position: static;
		transform: none;
		width: 0.75rem;
		height: 0.75rem;
	}

	/* Document list */
	.doc-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
		max-height: 300px;
		overflow-y: auto;
	}

	.doc-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.doc-item:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.doc-item.active {
		background: color-mix(in srgb, var(--space-color) 8%, transparent);
		border-color: color-mix(in srgb, var(--space-color) 20%, transparent);
	}

	.doc-toggle {
		flex-shrink: 0;
		width: 1.25rem;
		height: 1.25rem;
		color: rgba(255, 255, 255, 0.3);
		transition: all 0.15s ease;
	}

	.doc-toggle:hover {
		color: rgba(255, 255, 255, 0.6);
	}

	.doc-toggle.checked {
		color: var(--space-color);
	}

	.doc-toggle svg {
		width: 100%;
		height: 100%;
	}

	.doc-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		flex-shrink: 0;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.25rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.doc-icon.pdf {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.doc-icon.word {
		background: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
	}

	.doc-icon.text {
		background: color-mix(in srgb, var(--space-color) 15%, transparent);
		color: var(--space-color);
	}

	.doc-icon svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.doc-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.doc-name {
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.doc-meta {
		font-size: 0.625rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.doc-delete {
		flex-shrink: 0;
		width: 1.25rem;
		height: 1.25rem;
		color: rgba(255, 255, 255, 0.25);
		border-radius: 0.25rem;
		opacity: 0;
		transition: all 0.15s ease;
	}

	.doc-item:hover .doc-delete {
		opacity: 1;
	}

	.doc-delete:hover {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.doc-delete svg {
		width: 100%;
		height: 100%;
	}

	/* Delete confirmation */
	.delete-confirm {
		display: flex;
		gap: 0.25rem;
	}

	.confirm-yes,
	.confirm-no {
		font-size: 0.625rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-weight: 500;
	}

	.confirm-yes {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.confirm-yes:hover {
		background: rgba(239, 68, 68, 0.25);
	}

	.confirm-no {
		color: rgba(255, 255, 255, 0.5);
	}

	.confirm-no:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	/* Upload zone */
	.upload-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.75rem;
		border: 2px dashed rgba(255, 255, 255, 0.12);
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		transition: all 0.15s ease;
	}

	.upload-zone.drag-over {
		border-color: var(--space-color);
		background: color-mix(in srgb, var(--space-color) 10%, transparent);
	}

	.upload-zone.uploading {
		pointer-events: none;
		opacity: 0.7;
	}

	.upload-zone svg {
		width: 1.25rem;
		height: 1.25rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.upload-zone p {
		margin: 0;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.browse-link {
		color: var(--space-color);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.browse-link:hover {
		color: color-mix(in srgb, var(--space-color) 80%, #fff);
	}

	.browse-link input {
		display: none;
	}

	.file-types {
		font-size: 0.625rem;
		color: rgba(255, 255, 255, 0.35);
	}

	.upload-spinner {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-top-color: var(--space-color);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Empty state */
	.empty-state {
		text-align: center;
		padding: 1rem;
		color: rgba(255, 255, 255, 0.4);
		font-size: 0.75rem;
	}
</style>
