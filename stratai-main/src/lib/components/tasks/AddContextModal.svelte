<!--
	AddContextModal.svelte

	Modal for adding context to a task - documents and related tasks.
	Three tabs: Upload, My Documents, Related Tasks
-->
<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { documentStore, type TaskDocumentLink } from '$lib/stores/documents.svelte';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import type { Document, DocumentContextRole } from '$lib/types/documents';
	import type { Task, TaskRelationshipType } from '$lib/types/tasks';
	import { ACCEPT_DOCUMENTS } from '$lib/config/file-types';

	interface Props {
		open: boolean;
		taskId: string;
		spaceId: string;
		currentDocumentIds: string[];
		currentRelatedTaskIds: string[];
		onClose: () => void;
		onLinkDocument: (docId: string, role: DocumentContextRole) => Promise<void>;
		onLinkRelatedTask: (targetId: string, type: TaskRelationshipType) => Promise<void>;
		onUploadComplete: (doc: Document) => void;
	}

	let {
		open,
		taskId,
		spaceId,
		currentDocumentIds = [],
		currentRelatedTaskIds = [],
		onClose,
		onLinkDocument,
		onLinkRelatedTask,
		onUploadComplete
	}: Props = $props();

	// Tabs
	type TabId = 'upload' | 'documents' | 'tasks';
	let activeTab = $state<TabId>('upload');

	// Upload state
	let isUploading = $state(false);
	let isDragOver = $state(false);
	let uploadRole = $state<DocumentContextRole>('reference');
	let fileInput: HTMLInputElement | undefined = $state();

	// Documents tab
	let documentSearch = $state('');
	let selectedDocumentIds = $state<Set<string>>(new Set());
	let linkingRole = $state<DocumentContextRole>('reference');

	// Tasks tab
	let taskSearch = $state('');
	let selectedRelationType = $state<TaskRelationshipType>('related');

	// Filtered lists
	let availableDocuments = $derived.by(() => {
		const docs = documentStore.getDocuments(spaceId);
		return docs.filter(
			(d) =>
				!currentDocumentIds.includes(d.id) &&
				(documentSearch === '' ||
					d.filename.toLowerCase().includes(documentSearch.toLowerCase()) ||
					d.title?.toLowerCase().includes(documentSearch.toLowerCase()))
		);
	});

	let availableTasks = $derived.by(() => {
		const _ = taskStore._version;
		const allTasks = Array.from(taskStore.tasks.values());
		return allTasks.filter(
			(t) =>
				t.id !== taskId &&
				t.spaceId === spaceId &&
				!currentRelatedTaskIds.includes(t.id) &&
				(taskSearch === '' || t.title.toLowerCase().includes(taskSearch.toLowerCase()))
		);
	});

	// Load documents on mount
	$effect(() => {
		if (open) {
			documentStore.loadDocuments(spaceId);
		}
	});

	// Reset state when modal opens
	$effect(() => {
		if (open) {
			activeTab = 'upload';
			documentSearch = '';
			taskSearch = '';
			selectedDocumentIds = new Set();
			isDragOver = false;
		}
	});


	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	// ===== Upload Tab =====

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
		const file = e.dataTransfer?.files[0];
		if (file) {
			await uploadFile(file);
		}
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (files && files.length > 0) {
			for (const file of Array.from(files)) {
				await uploadFile(file);
			}
		}
		if (fileInput) fileInput.value = '';
	}

	async function uploadFile(file: File) {
		isUploading = true;
		try {
			const doc = await documentStore.uploadDocument(file, spaceId);
			if (doc) {
				// Link to task
				await onLinkDocument(doc.id, uploadRole);
				onUploadComplete(doc);
				toastStore.success(`${file.name} uploaded and linked`);
			}
		} catch (err) {
			toastStore.error(err instanceof Error ? err.message : 'Upload failed');
		} finally {
			isUploading = false;
		}
	}

	// ===== Documents Tab =====

	function toggleDocumentSelection(docId: string) {
		const newSet = new Set(selectedDocumentIds);
		if (newSet.has(docId)) {
			newSet.delete(docId);
		} else {
			newSet.add(docId);
		}
		selectedDocumentIds = newSet;
	}

	async function linkSelectedDocuments() {
		const ids = Array.from(selectedDocumentIds);
		for (const id of ids) {
			await onLinkDocument(id, linkingRole);
		}
		selectedDocumentIds = new Set();
		toastStore.success(`${ids.length} document${ids.length > 1 ? 's' : ''} linked`);
		onClose();
	}

	// ===== Tasks Tab =====

	async function linkTask(targetTaskId: string) {
		await onLinkRelatedTask(targetTaskId, selectedRelationType);
		toastStore.success('Task linked');
	}

	// ===== Helpers =====

	function getFileIcon(mimeType: string): string {
		if (mimeType.includes('pdf')) return '📄';
		if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
		if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
		if (mimeType.includes('text') || mimeType.includes('markdown')) return '📃';
		if (mimeType.includes('json') || mimeType.includes('csv')) return '📋';
		return '📄';
	}

	function formatDate(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric'
		}).format(date);
	}

	function formatCharCount(charCount: number): string {
		if (charCount >= 1000) {
			return `${(charCount / 1000).toFixed(1)}k`;
		}
		return String(charCount);
	}

	function getStatusBadge(status: string): { text: string; class: string } {
		switch (status) {
			case 'completed':
				return { text: 'Done', class: 'status-completed' };
			case 'deferred':
				return { text: 'Paused', class: 'status-deferred' };
			default:
				return { text: '', class: '' };
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
		transition:fade={{ duration: 200 }}
		onclick={handleBackdropClick}
	>
		<!-- Modal -->
		<div
			class="modal"
			transition:fly={{ y: 20, duration: 200 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			<!-- Header -->
			<header class="modal-header">
				<h2 id="modal-title" class="modal-title">Add Context</h2>
				<button type="button" class="close-button" onclick={onClose} aria-label="Close">
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<path
							d="M5 5L15 15M15 5L5 15"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</header>

			<!-- Tabs -->
			<nav class="tabs">
				<button
					type="button"
					class="tab"
					class:active={activeTab === 'upload'}
					onclick={() => (activeTab = 'upload')}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path
							d="M8 2V10M8 2L5 5M8 2L11 5"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<path
							d="M2 10V12C2 13.1046 2.89543 14 4 14H12C13.1046 14 14 13.1046 14 12V10"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
						/>
					</svg>
					Upload
				</button>
				<button
					type="button"
					class="tab"
					class:active={activeTab === 'documents'}
					onclick={() => (activeTab = 'documents')}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path
							d="M4 2H10L14 6V14H4C2.89543 14 2 13.1046 2 12V4C2 2.89543 2.89543 2 4 2Z"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linejoin="round"
						/>
						<path d="M10 2V6H14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
					</svg>
					My Documents
				</button>
				<button
					type="button"
					class="tab"
					class:active={activeTab === 'tasks'}
					onclick={() => (activeTab = 'tasks')}
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path
							d="M2 4H10M2 8H14M2 12H6"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
						/>
					</svg>
					Related Tasks
				</button>
			</nav>

			<!-- Content -->
			<div class="modal-content">
				{#if activeTab === 'upload'}
					<!-- Upload Tab -->
					<div class="upload-tab">
						<!-- Role selector -->
						<div class="role-selector">
							<label class="role-label">Document role:</label>
							<select bind:value={uploadRole} class="role-select">
								<option value="reference">Reference (general context)</option>
								<option value="input">Input (data to process)</option>
								<option value="output">Output (deliverable template)</option>
							</select>
						</div>

						<!-- Drop zone -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="drop-zone"
							class:drag-over={isDragOver}
							class:uploading={isUploading}
							ondragover={handleDragOver}
							ondragleave={handleDragLeave}
							ondrop={handleDrop}
							onclick={() => fileInput?.click()}
							role="button"
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
						>
							<input
								type="file"
								bind:this={fileInput}
								onchange={handleFileSelect}
								accept={ACCEPT_DOCUMENTS}
								multiple
								class="hidden"
							/>

							{#if isUploading}
								<svg class="upload-spinner" viewBox="0 0 24 24">
									<circle
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
										fill="none"
										opacity="0.25"
									/>
									<path
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									/>
								</svg>
								<p class="drop-text">Uploading...</p>
							{:else}
								<svg class="drop-icon" viewBox="0 0 24 24" fill="none">
									<path
										d="M12 4V16M12 4L8 8M12 4L16 8"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
									<path
										d="M4 14V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V14"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
									/>
								</svg>
								<p class="drop-text">Drop files here or click to browse</p>
								<p class="drop-hint">PDF, Word, Text, Markdown, CSV, JSON</p>
							{/if}
						</div>
					</div>
				{:else if activeTab === 'documents'}
					<!-- My Documents Tab -->
					<div class="documents-tab">
						<!-- Search -->
						<div class="search-bar">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
								<circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" />
								<path d="M11 11L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
							</svg>
							<input
								type="text"
								bind:value={documentSearch}
								placeholder="Search documents..."
								class="search-input"
							/>
						</div>

						<!-- Role selector -->
						<div class="role-selector inline">
							<label class="role-label">Link as:</label>
							<select bind:value={linkingRole} class="role-select small">
								<option value="reference">Reference</option>
								<option value="input">Input</option>
								<option value="output">Output</option>
							</select>
						</div>

						<!-- Document list -->
						<div class="item-list">
							{#if availableDocuments.length === 0}
								<p class="empty-message">
									{documentSearch ? 'No matching documents' : 'No documents available'}
								</p>
							{:else}
								{#each availableDocuments as doc (doc.id)}
									<label class="item document-item">
										<input
											type="checkbox"
											checked={selectedDocumentIds.has(doc.id)}
											onchange={() => toggleDocumentSelection(doc.id)}
										/>
										<span class="item-icon">{getFileIcon(doc.mimeType)}</span>
										<span class="item-name">{doc.title || doc.filename}</span>
										<span class="item-meta">{formatCharCount(doc.charCount)} chars</span>
										<span class="item-date">{formatDate(doc.createdAt)}</span>
									</label>
								{/each}
							{/if}
						</div>

						<!-- Link button -->
						{#if selectedDocumentIds.size > 0}
							<div class="action-bar">
								<button type="button" class="link-button" onclick={linkSelectedDocuments}>
									Link {selectedDocumentIds.size} document{selectedDocumentIds.size > 1 ? 's' : ''}
								</button>
							</div>
						{/if}
					</div>
				{:else if activeTab === 'tasks'}
					<!-- Related Tasks Tab -->
					<div class="tasks-tab">
						<!-- Search -->
						<div class="search-bar">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
								<circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" />
								<path d="M11 11L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
							</svg>
							<input
								type="text"
								bind:value={taskSearch}
								placeholder="Search tasks..."
								class="search-input"
							/>
						</div>

						<!-- Relationship selector -->
						<div class="role-selector inline">
							<label class="role-label">Relationship:</label>
							<select bind:value={selectedRelationType} class="role-select small">
								<option value="related">Related</option>
								<option value="blocks">Blocks this task</option>
								<option value="depends_on">This task depends on</option>
								<option value="informs">Informs this task</option>
							</select>
						</div>

						<!-- Task list -->
						<div class="item-list">
							{#if availableTasks.length === 0}
								<p class="empty-message">
									{taskSearch ? 'No matching tasks' : 'No other tasks available'}
								</p>
							{:else}
								{#each availableTasks as task (task.id)}
									<div class="item task-item">
										<span class="task-color" style="background: {task.color}"></span>
										<span class="item-name">{task.title}</span>
										{#if task.status !== 'active'}
											{@const badge = getStatusBadge(task.status)}
											<span class="status-badge {badge.class}">{badge.text}</span>
										{/if}
										<button
											type="button"
											class="link-task-button"
											onclick={() => linkTask(task.id)}
										>
											Link
										</button>
									</div>
								{/each}
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal {
		width: 100%;
		max-width: 520px;
		max-height: 80vh;
		background: var(--color-surface-900, #1a1a2e);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text, rgba(255, 255, 255, 0.95));
		margin: 0;
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: none;
		color: var(--color-text-muted, rgba(255, 255, 255, 0.5));
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.close-button:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--color-text, rgba(255, 255, 255, 0.9));
	}

	/* Tabs */
	.tabs {
		display: flex;
		gap: 4px;
		padding: 8px 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.2);
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-muted, rgba(255, 255, 255, 0.5));
		background: none;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.tab:hover {
		color: var(--color-text, rgba(255, 255, 255, 0.8));
		background: rgba(255, 255, 255, 0.05);
	}

	.tab.active {
		color: var(--color-text, rgba(255, 255, 255, 0.95));
		background: rgba(255, 255, 255, 0.1);
	}

	/* Content */
	.modal-content {
		flex: 1;
		overflow-y: auto;
		padding: 16px 20px;
	}

	/* Upload Tab */
	.upload-tab {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.role-selector {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.role-selector.inline {
		flex-direction: row;
		align-items: center;
		gap: 10px;
		margin-bottom: 12px;
	}

	.role-label {
		font-size: 13px;
		color: var(--color-text-muted, rgba(255, 255, 255, 0.6));
	}

	.role-select {
		padding: 8px 12px;
		font-size: 13px;
		color: var(--color-text, rgba(255, 255, 255, 0.9));
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		cursor: pointer;
	}

	.role-select.small {
		padding: 6px 10px;
		font-size: 12px;
	}

	.role-select:hover {
		border-color: rgba(255, 255, 255, 0.2);
	}

	.drop-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 48px 24px;
		background: rgba(255, 255, 255, 0.02);
		border: 2px dashed rgba(255, 255, 255, 0.15);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.drop-zone:hover,
	.drop-zone.drag-over {
		background: rgba(59, 130, 246, 0.05);
		border-color: rgba(59, 130, 246, 0.4);
	}

	.drop-zone.uploading {
		pointer-events: none;
		opacity: 0.7;
	}

	.drop-icon {
		width: 48px;
		height: 48px;
		color: var(--color-text-muted, rgba(255, 255, 255, 0.4));
	}

	.upload-spinner {
		width: 32px;
		height: 32px;
		color: var(--color-text-muted, rgba(255, 255, 255, 0.5));
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.drop-text {
		font-size: 14px;
		color: var(--color-text, rgba(255, 255, 255, 0.8));
		margin: 0;
	}

	.drop-hint {
		font-size: 12px;
		color: var(--color-text-muted, rgba(255, 255, 255, 0.4));
		margin: 0;
	}

	/* Documents/Tasks Tab */
	.documents-tab,
	.tasks-tab {
		display: flex;
		flex-direction: column;
	}

	.search-bar {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		margin-bottom: 12px;
	}

	.search-bar svg {
		color: var(--color-text-muted, rgba(255, 255, 255, 0.4));
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		border: none;
		background: none;
		font-size: 14px;
		color: var(--color-text, rgba(255, 255, 255, 0.9));
		outline: none;
	}

	.search-input::placeholder {
		color: var(--color-text-muted, rgba(255, 255, 255, 0.4));
	}

	.item-list {
		flex: 1;
		max-height: 280px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.empty-message {
		text-align: center;
		color: var(--color-text-muted, rgba(255, 255, 255, 0.4));
		font-size: 13px;
		font-style: italic;
		padding: 24px;
	}

	.item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.item:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.document-item input[type='checkbox'] {
		width: 16px;
		height: 16px;
		accent-color: #3b82f6;
		flex-shrink: 0;
	}

	.item-icon {
		font-size: 16px;
		flex-shrink: 0;
	}

	.item-name {
		flex: 1;
		font-size: 13px;
		color: var(--color-text, rgba(255, 255, 255, 0.9));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-meta {
		font-size: 11px;
		color: var(--color-text-muted, rgba(255, 255, 255, 0.4));
		flex-shrink: 0;
	}

	.item-date {
		font-size: 11px;
		color: var(--color-text-muted, rgba(255, 255, 255, 0.35));
		flex-shrink: 0;
	}

	.task-color {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.task-item {
		cursor: default;
	}

	.status-badge {
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.status-completed {
		background: rgba(34, 197, 94, 0.15);
		color: rgb(34, 197, 94);
	}

	.status-deferred {
		background: rgba(234, 179, 8, 0.15);
		color: rgb(234, 179, 8);
	}

	.link-task-button {
		padding: 4px 12px;
		font-size: 12px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
		background: rgba(59, 130, 246, 0.2);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s;
		flex-shrink: 0;
	}

	.link-task-button:hover {
		background: rgba(59, 130, 246, 0.3);
		border-color: rgba(59, 130, 246, 0.5);
		color: white;
	}

	.action-bar {
		display: flex;
		justify-content: flex-end;
		padding-top: 16px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		margin-top: 12px;
	}

	.link-button {
		padding: 10px 20px;
		font-size: 14px;
		font-weight: 500;
		color: white;
		background: #3b82f6;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.link-button:hover {
		background: #2563eb;
	}

	.hidden {
		display: none;
	}
</style>
