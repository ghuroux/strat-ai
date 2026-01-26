<!--
	DocsPanel.svelte

	Slide-out panel showing documents available to an Area.
	Documents are inherited from the Space level.

	Features:
	- Lists documents available for context injection
	- Shows document metadata (filename, size, type)
	- Upload new documents
	- Future: Toggle which docs are "active" for current conversation
-->
<script lang="ts">
	import PanelBase from './PanelBase.svelte';
	import { documentStore } from '$lib/stores/documents.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Document } from '$lib/types/documents';
	import { ACCEPT_DOCUMENTS } from '$lib/config/file-types';

	interface Props {
		isOpen: boolean;
		spaceId: string;
		spaceColor?: string;
		onClose: () => void;
		onDocumentClick?: (doc: Document) => void;
	}

	let {
		isOpen,
		spaceId,
		spaceColor = '#3b82f6',
		onClose,
		onDocumentClick
	}: Props = $props();

	// Local state
	let isDragOver = $state(false);
	let isUploading = $state(false);

	// Load documents when panel opens
	$effect(() => {
		if (isOpen && spaceId) {
			documentStore.loadDocuments(spaceId);
		}
	});

	// Get documents for this space
	let spaceDocs = $derived.by(() => {
		return documentStore.getDocuments(spaceId);
	});

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Format character count
	function formatCharCount(count: number): string {
		if (count < 1000) return `${count} chars`;
		return `${(count / 1000).toFixed(1)}k chars`;
	}

	// Get file icon based on mime type
	function getFileIcon(mimeType: string): string {
		if (mimeType === 'application/pdf') return 'pdf';
		if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'word';
		if (mimeType.startsWith('text/')) return 'text';
		return 'generic';
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
			input.value = ''; // Reset input
		}
	}

	async function uploadFiles(files: File[]) {
		// Filter for supported types (matches file-parser.ts capabilities)
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
		let uploadedCount = 0;

		for (const file of supported) {
			const doc = await documentStore.uploadDocument(file, spaceId);
			if (doc) uploadedCount++;
		}

		if (uploadedCount > 0) {
			toastStore.success(`${uploadedCount} document${uploadedCount > 1 ? 's' : ''} uploaded`);
		}

		isUploading = false;
	}

	async function handleDelete(doc: Document, e: Event) {
		e.stopPropagation();
		if (confirm(`Delete "${doc.filename}"? This cannot be undone.`)) {
			const success = await documentStore.deleteDocument(doc.id);
			if (success) {
				toastStore.success('Document deleted');
			}
		}
	}
</script>

<PanelBase
	{isOpen}
	title="Documents"
	subtitle={spaceDocs.length > 0 ? `${spaceDocs.length} available` : 'No documents'}
	position="right"
	width="20rem"
	{onClose}
>
	{#snippet content()}
		<div class="docs-content" style="--space-color: {spaceColor}">
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
								accept={ACCEPT_DOCUMENTS}
								multiple
								onchange={handleFileSelect}
							/>
						</label>
					</p>
					<span class="file-types">PDF, DOCX, TXT, MD</span>
				{/if}
			</div>

			<!-- Document list -->
			{#if spaceDocs.length > 0}
				<div class="doc-list">
					{#each spaceDocs as doc (doc.id)}
						{@const icon = getFileIcon(doc.mimeType)}
						<div
							class="doc-item"
							role="button"
							tabindex="0"
							onclick={() => onDocumentClick?.(doc)}
							onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onDocumentClick?.(doc)}
						>
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

							<div class="doc-info">
								<span class="doc-name" title={doc.filename}>{doc.title || doc.filename}</span>
								<div class="doc-meta">
									<span>{formatCharCount(doc.charCount)}</span>
									{#if doc.pageCount}
										<span>{doc.pageCount} pg</span>
									{/if}
									<span>{formatFileSize(doc.fileSize)}</span>
								</div>
							</div>

							<button
								type="button"
								class="doc-delete"
								onclick={(e) => handleDelete(doc, e)}
								title="Delete document"
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					{/each}
				</div>
			{:else if !isUploading}
				<div class="empty-state">
					<p>No documents uploaded yet</p>
					<p class="empty-hint">Upload documents to provide AI with additional context</p>
				</div>
			{/if}
		</div>
	{/snippet}
</PanelBase>

<style>
	.docs-content {
		padding: 0.75rem;
	}

	/* Upload zone */
	.upload-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
		border: 2px dashed rgba(255, 255, 255, 0.12);
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		transition: all 0.15s ease;
		margin-bottom: 0.75rem;
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
		width: 1.5rem;
		height: 1.5rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.upload-zone p {
		margin: 0;
		font-size: 0.8125rem;
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
		font-size: 0.6875rem;
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

	/* Document list */
	.doc-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.doc-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.625rem 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.doc-item:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.doc-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.375rem;
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
		width: 1rem;
		height: 1rem;
	}

	.doc-info {
		flex: 1;
		min-width: 0;
	}

	.doc-name {
		display: block;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.doc-meta {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.doc-meta span {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.doc-delete {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		flex-shrink: 0;
		color: rgba(255, 255, 255, 0.3);
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
		width: 0.875rem;
		height: 0.875rem;
	}

	/* Empty state */
	.empty-state {
		text-align: center;
		padding: 1.5rem 1rem;
	}

	.empty-state p {
		margin: 0;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.empty-hint {
		margin-top: 0.25rem !important;
		font-size: 0.75rem !important;
		color: rgba(255, 255, 255, 0.35) !important;
	}
</style>
