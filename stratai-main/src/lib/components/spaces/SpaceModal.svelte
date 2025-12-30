<script lang="ts">
	/**
	 * SpaceModal - Create/Edit Custom Space Modal
	 *
	 * Centered modal for:
	 * - Creating new custom spaces
	 * - Editing existing custom spaces
	 * - Managing name, context, documents, color, and icon
	 *
	 * Note: System spaces can only have their context and documents edited
	 */
	import { fly, fade } from 'svelte/transition';
	import type { Space, CreateSpaceInput, UpdateSpaceInput } from '$lib/types/spaces';
	import { documentStore } from '$lib/stores/documents.svelte';
	import type { Document } from '$lib/types/documents';

	interface Props {
		open: boolean;
		space?: Space | null; // Null = create mode, Space = edit mode
		onClose: () => void;
		onCreate: (input: CreateSpaceInput) => Promise<void>;
		onUpdate: (id: string, input: UpdateSpaceInput) => Promise<void>;
		onDelete?: (id: string) => Promise<void>;
	}

	let { open, space = null, onClose, onCreate, onUpdate, onDelete }: Props = $props();

	// Form state
	let name = $state('');
	let context = $state('');
	let contextDocumentIds = $state<string[]>([]);
	let color = $state('');
	let isSubmitting = $state(false);
	let isUploading = $state(false);
	let error = $state<string | null>(null);
	let showDeleteConfirm = $state(false);
	let fileInputRef = $state<HTMLInputElement | null>(null);

	// Get document details for linked documents
	let linkedDocuments = $derived.by(() => {
		const docs: Document[] = [];
		for (const docId of contextDocumentIds) {
			const doc = documentStore.getDocumentById(docId);
			if (doc) docs.push(doc);
		}
		return docs;
	});

	// Color options
	const colorOptions = [
		{ value: '', label: 'Default' },
		{ value: '#3b82f6', label: 'Blue' },
		{ value: '#8b5cf6', label: 'Purple' },
		{ value: '#10b981', label: 'Green' },
		{ value: '#f59e0b', label: 'Amber' },
		{ value: '#ef4444', label: 'Red' },
		{ value: '#ec4899', label: 'Pink' },
		{ value: '#06b6d4', label: 'Cyan' },
		{ value: '#84cc16', label: 'Lime' }
	];

	// Derived state
	let isEditMode = $derived(space !== null);
	let isSystemSpace = $derived(space?.type === 'system');
	let modalTitle = $derived(
		isEditMode ? (isSystemSpace ? 'Edit Space Context' : 'Edit Space') : 'Create Space'
	);
	let submitLabel = $derived(isEditMode ? 'Save Changes' : 'Create');

	// Reset form when modal opens/closes or space changes
	$effect(() => {
		if (open) {
			// Load documents for this space (use space slug for document storage)
			if (space) {
				documentStore.loadDocuments(space.slug);
			}

			if (space) {
				name = space.name;
				context = space.context ?? '';
				contextDocumentIds = [...(space.contextDocumentIds ?? [])];
				color = space.color ?? '';
			} else {
				name = '';
				context = '';
				contextDocumentIds = [];
				color = '';
			}
			error = null;
			showDeleteConfirm = false;
		}
	});

	// Document handling
	async function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file || !space) return;

		isUploading = true;
		error = null;

		try {
			const doc = await documentStore.uploadDocument(file, space.slug);
			if (doc) {
				contextDocumentIds = [...contextDocumentIds, doc.id];
			} else {
				error = documentStore.error || 'Failed to upload document';
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to upload document';
		} finally {
			isUploading = false;
			if (fileInputRef) fileInputRef.value = '';
		}
	}

	function removeDocument(docId: string) {
		contextDocumentIds = contextDocumentIds.filter(id => id !== docId);
	}

	function formatFileSize(bytes: number | undefined): string {
		if (bytes === undefined || bytes === null || isNaN(bytes)) return '';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (showDeleteConfirm) {
				showDeleteConfirm = false;
			} else {
				onClose();
			}
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	async function handleSubmit() {
		// Validate (only for create and custom space edits)
		if (!isSystemSpace) {
			const trimmedName = name.trim();
			if (!trimmedName) {
				error = 'Name is required';
				return;
			}
		}

		isSubmitting = true;
		error = null;

		try {
			if (isEditMode && space) {
				const updates: UpdateSpaceInput = {};

				if (isSystemSpace) {
					// System spaces: only context and documents can be changed
					if (context !== (space.context ?? '')) updates.context = context || undefined;
					const originalDocIds = space.contextDocumentIds ?? [];
					if (JSON.stringify(contextDocumentIds) !== JSON.stringify(originalDocIds)) {
						updates.contextDocumentIds = contextDocumentIds.length > 0 ? contextDocumentIds : undefined;
					}
				} else {
					// Custom spaces: all fields can change
					const trimmedName = name.trim();
					if (trimmedName !== space.name) updates.name = trimmedName;
					if (context !== (space.context ?? '')) updates.context = context || undefined;
					const originalDocIds = space.contextDocumentIds ?? [];
					if (JSON.stringify(contextDocumentIds) !== JSON.stringify(originalDocIds)) {
						updates.contextDocumentIds = contextDocumentIds.length > 0 ? contextDocumentIds : undefined;
					}
					if (color !== (space.color ?? '')) updates.color = color || undefined;
				}

				await onUpdate(space.id, updates);
			} else {
				const input: CreateSpaceInput = {
					name: name.trim(),
					context: context || undefined,
					contextDocumentIds: contextDocumentIds.length > 0 ? contextDocumentIds : undefined,
					color: color || undefined
				};
				await onCreate(input);
			}
			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save space';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDelete() {
		if (!space || !onDelete) return;

		isSubmitting = true;
		error = null;

		try {
			await onDelete(space.id);
			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete space';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
	>
		<!-- Modal -->
		<div
			class="modal-container"
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<!-- Header -->
			<header class="modal-header">
				<h2 id="modal-title" class="modal-title">{modalTitle}</h2>
				<button type="button" onclick={onClose} class="close-button" aria-label="Close">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</header>

			<!-- Content -->
			<div class="modal-content">
				{#if showDeleteConfirm}
					<!-- Delete confirmation -->
					<div class="delete-confirm">
						<p class="delete-message">
							Are you sure you want to delete <strong>"{space?.name}"</strong>?
						</p>
						<p class="delete-warning">
							Focus areas and tasks in this space will need to be reassigned.
						</p>
						<div class="delete-actions">
							<button
								type="button"
								class="btn-secondary"
								onclick={() => (showDeleteConfirm = false)}
								disabled={isSubmitting}
							>
								Cancel
							</button>
							<button
								type="button"
								class="btn-danger"
								onclick={handleDelete}
								disabled={isSubmitting}
							>
								{isSubmitting ? 'Deleting...' : 'Delete'}
							</button>
						</div>
					</div>
				{:else}
					<!-- Form -->
					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleSubmit();
						}}
					>
						{#if error}
							<div class="error-message">{error}</div>
						{/if}

						<!-- Name field (not for system spaces) -->
						{#if !isSystemSpace}
							<div class="field">
								<label for="name" class="field-label">Name</label>
								<input
									id="name"
									type="text"
									class="field-input"
									placeholder="e.g., Acme Project, Side Hustle"
									bind:value={name}
									disabled={isSubmitting}
									autofocus
								/>
							</div>
						{:else}
							<div class="system-space-notice">
								<p class="notice-text">
									This is a system space. Only the context can be edited.
								</p>
							</div>
						{/if}

						<!-- Context field -->
						<div class="field">
							<label for="context" class="field-label">
								Context
								<span class="field-hint">(optional)</span>
							</label>
							<textarea
								id="context"
								class="field-textarea"
								placeholder="Add background information that helps the AI understand this space..."
								bind:value={context}
								disabled={isSubmitting}
								rows="4"
							></textarea>
							<p class="field-description">
								This context will be included in all AI conversations within this space.
							</p>
						</div>

						<!-- Documents field (only in edit mode) -->
						{#if isEditMode}
							<div class="field">
								<label class="field-label">
									Reference Documents
									<span class="field-hint">(optional)</span>
								</label>

								<!-- Linked documents list -->
								{#if linkedDocuments.length > 0}
									<div class="documents-list">
										{#each linkedDocuments as doc (doc.id)}
											<div class="document-item">
												<div class="document-icon">
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
													</svg>
												</div>
												<div class="document-info">
													<span class="document-name">{doc.title || doc.filename}</span>
													<span class="document-meta">
														{#if doc.fileSize}{formatFileSize(doc.fileSize)}{/if}
														{#if doc.fileSize && doc.charCount} · {/if}
														{#if doc.charCount}{doc.charCount.toLocaleString()} chars{/if}
													</span>
												</div>
												<button
													type="button"
													class="document-remove"
													onclick={() => removeDocument(doc.id)}
													disabled={isSubmitting || isUploading}
													title="Remove document"
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											</div>
										{/each}
									</div>
								{/if}

								<!-- Upload button -->
								<div class="document-upload">
									<input
										bind:this={fileInputRef}
										type="file"
										id="space-document-upload"
										class="hidden"
										accept=".pdf,.doc,.docx,.txt,.md,.json,.csv"
										onchange={handleFileSelect}
										disabled={isSubmitting || isUploading}
									/>
									<label for="space-document-upload" class="upload-button" class:uploading={isUploading}>
										{#if isUploading}
											<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											<span>Uploading...</span>
										{:else}
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
											</svg>
											<span>Add Document</span>
										{/if}
									</label>
								</div>
								<p class="field-description">
									PDF, Word, TXT, MD, JSON, CSV supported. Document content will be included in AI context for all conversations in this space.
								</p>
							</div>
						{/if}

						<!-- Color field (not for system spaces) -->
						{#if !isSystemSpace}
							<div class="field">
								<label for="color" class="field-label">Color</label>
								<div class="color-options">
									{#each colorOptions as option (option.value)}
										<button
											type="button"
											class="color-option"
											class:selected={color === option.value}
											style="--option-color: {option.value || '#6b7280'}"
											onclick={() => (color = option.value)}
											disabled={isSubmitting}
											title={option.label}
										>
											{#if color === option.value}
												<svg class="check-icon" viewBox="0 0 20 20" fill="currentColor">
													<path
														fill-rule="evenodd"
														d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
														clip-rule="evenodd"
													/>
												</svg>
											{/if}
										</button>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Actions -->
						<div class="modal-actions">
							{#if isEditMode && onDelete && !isSystemSpace}
								<button
									type="button"
									class="btn-danger-outline"
									onclick={() => (showDeleteConfirm = true)}
									disabled={isSubmitting}
								>
									Delete
								</button>
							{/if}
							<div class="actions-right">
								<button
									type="button"
									class="btn-secondary"
									onclick={onClose}
									disabled={isSubmitting}
								>
									Cancel
								</button>
								<button
									type="submit"
									class="btn-primary"
									disabled={isSubmitting || (!isSystemSpace && !name.trim())}
								>
									{isSubmitting ? 'Saving...' : submitLabel}
								</button>
							</div>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-container {
		width: 100%;
		max-width: 28rem;
		background: rgb(23, 23, 23);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #fff;
		margin: 0;
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		color: rgba(255, 255, 255, 0.5);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.close-button:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	.modal-content {
		padding: 1.5rem;
	}

	.error-message {
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 0.5rem;
		color: #fca5a5;
		font-size: 0.875rem;
	}

	.system-space-notice {
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 0.5rem;
	}

	.notice-text {
		font-size: 0.875rem;
		color: #93c5fd;
		margin: 0;
	}

	.field {
		margin-bottom: 1.25rem;
	}

	.field-label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	.field-hint {
		font-weight: 400;
		color: rgba(255, 255, 255, 0.4);
	}

	.field-input,
	.field-textarea {
		width: 100%;
		padding: 0.625rem 0.875rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 0.9375rem;
		transition: all 0.15s ease;
	}

	.field-input:focus,
	.field-textarea:focus {
		outline: none;
		border-color: var(--space-accent, #3b82f6);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--space-accent, #3b82f6) 20%, transparent);
	}

	.field-input::placeholder,
	.field-textarea::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.field-input:disabled,
	.field-textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.field-textarea {
		resize: vertical;
		min-height: 5rem;
	}

	.field-description {
		margin-top: 0.5rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.4);
	}

	/* Document styles */
	.documents-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.document-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
	}

	.document-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--space-accent, #3b82f6);
		flex-shrink: 0;
	}

	.document-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.document-name {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.document-meta {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.document-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
		color: rgba(255, 255, 255, 0.4);
		border-radius: 0.25rem;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.document-remove:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.document-remove:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.document-upload {
		margin-bottom: 0.5rem;
	}

	.hidden {
		display: none;
	}

	.upload-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.875rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.05);
		border: 1px dashed rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.upload-button:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: var(--space-accent, #3b82f6);
		color: rgba(255, 255, 255, 0.9);
	}

	.upload-button.uploading {
		opacity: 0.7;
		cursor: wait;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}

	.color-options {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.color-option {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: var(--option-color);
		border: 2px solid transparent;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.color-option:hover:not(:disabled) {
		transform: scale(1.1);
	}

	.color-option.selected {
		border-color: #fff;
		box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
	}

	.color-option:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.check-icon {
		width: 1rem;
		height: 1rem;
		color: #fff;
	}

	.modal-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.actions-right {
		display: flex;
		gap: 0.75rem;
		margin-left: auto;
	}

	.btn-primary,
	.btn-secondary,
	.btn-danger,
	.btn-danger-outline {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: var(--space-accent, #3b82f6);
		color: #fff;
	}

	.btn-primary:hover:not(:disabled) {
		background: color-mix(in srgb, var(--space-accent, #3b82f6) 80%, #fff);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.btn-secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-danger {
		background: #ef4444;
		color: #fff;
	}

	.btn-danger:hover:not(:disabled) {
		background: #dc2626;
	}

	.btn-danger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-danger-outline {
		background: transparent;
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.btn-danger-outline:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.5);
	}

	.btn-danger-outline:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Delete confirmation */
	.delete-confirm {
		text-align: center;
		padding: 1rem 0;
	}

	.delete-message {
		font-size: 1rem;
		color: #fff;
		margin-bottom: 0.5rem;
	}

	.delete-warning {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin-bottom: 1.5rem;
	}

	.delete-actions {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
	}
</style>
