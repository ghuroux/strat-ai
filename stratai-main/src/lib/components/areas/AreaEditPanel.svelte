<!--
	AreaEditPanel.svelte

	Slide-out panel for editing area settings.
	Uses PanelBase for consistent panel behavior.

	Features:
	- Name editing (disabled for General areas)
	- Context notes editing
	- Reference document management
	- Color selection
-->
<script lang="ts">
	import PanelBase from './panels/PanelBase.svelte';
	import { documentStore } from '$lib/stores/documents.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Area, UpdateAreaInput } from '$lib/types/areas';
	import type { Document } from '$lib/types/documents';
	import { ACCEPT_DOCUMENTS } from '$lib/config/file-types';

	interface Props {
		isOpen: boolean;
		area: Area;
		spaceId: string;
		spaceColor?: string;
		onClose: () => void;
		onUpdate: (id: string, input: UpdateAreaInput) => Promise<void>;
	}

	let {
		isOpen,
		area,
		spaceId,
		spaceColor = '#3b82f6',
		onClose,
		onUpdate
	}: Props = $props();

	// Form state
	let name = $state('');
	let context = $state('');
	let color = $state('');
	let contextDocumentIds = $state<string[]>([]);
	let isSubmitting = $state(false);
	let isUploading = $state(false);
	let error = $state<string | null>(null);
	let fileInputRef = $state<HTMLInputElement | null>(null);

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
	let isGeneral = $derived(area?.isGeneral ?? false);
	let panelTitle = $derived(isGeneral ? 'Edit General Area' : 'Edit Area');

	// Get document details for linked documents
	let linkedDocuments = $derived.by(() => {
		const docs: Document[] = [];
		for (const docId of contextDocumentIds) {
			const doc = documentStore.getDocumentById(docId);
			if (doc) docs.push(doc);
		}
		return docs;
	});

	// Reset form when panel opens or area changes
	$effect(() => {
		if (isOpen && area) {
			documentStore.loadDocuments(spaceId);
			name = area.name;
			context = area.context ?? '';
			color = area.color ?? '';
			contextDocumentIds = [...(area.contextDocumentIds ?? [])];
			error = null;
		}
	});

	async function handleSubmit() {
		const trimmedName = name.trim();
		if (!trimmedName && !isGeneral) {
			error = 'Name is required';
			return;
		}

		isSubmitting = true;
		error = null;

		try {
			const updates: UpdateAreaInput = {};

			if (!isGeneral && trimmedName !== area.name) {
				updates.name = trimmedName;
			}

			if (context !== (area.context ?? '')) updates.context = context || undefined;
			if (color !== (area.color ?? '')) updates.color = color || undefined;

			const originalDocIds = area.contextDocumentIds ?? [];
			if (JSON.stringify(contextDocumentIds) !== JSON.stringify(originalDocIds)) {
				updates.contextDocumentIds = contextDocumentIds.length > 0 ? contextDocumentIds : undefined;
			}

			await onUpdate(area.id, updates);
			toastStore.success('Area updated');
			onClose();
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Failed to save area';
			error = msg;
			toastStore.error(msg);
		} finally {
			isSubmitting = false;
		}
	}

	// Document handling
	async function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files || files.length === 0) return;

		isUploading = true;
		error = null;

		try {
			for (const file of Array.from(files)) {
				const doc = await documentStore.uploadDocument(file, spaceId);
				if (doc) {
					contextDocumentIds = [...contextDocumentIds, doc.id];
				} else {
					error = documentStore.error || 'Failed to upload document';
				}
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Failed to upload document';
			error = msg;
			toastStore.error(msg);
		} finally {
			isUploading = false;
			if (fileInputRef) fileInputRef.value = '';
		}
	}

	function removeDocument(docId: string) {
		contextDocumentIds = contextDocumentIds.filter((id) => id !== docId);
	}

	function formatFileSize(bytes: number | undefined): string {
		if (bytes === undefined || bytes === null || isNaN(bytes)) return '';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<PanelBase
	{isOpen}
	title={panelTitle}
	subtitle={area?.name || ''}
	position="right"
	width="24rem"
	{onClose}
>
	{#snippet content()}
		<div class="panel-content" style="--space-color: {spaceColor}">
			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<!-- General area info -->
			{#if isGeneral}
				<div class="general-info">
					<svg class="info-icon" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>The General area is the default for this space. You can add context but cannot rename it.</span>
				</div>
			{/if}

			<!-- Name field -->
			<section class="field-section">
				<label for="area-name" class="section-label">Name</label>
				{#if isGeneral}
					<input
						id="area-name"
						type="text"
						class="field-input"
						value={name}
						disabled
						title="General area cannot be renamed"
					/>
				{:else}
					<input
						id="area-name"
						type="text"
						class="field-input"
						placeholder="e.g., DevOps, Marketing, Research"
						bind:value={name}
						disabled={isSubmitting}
					/>
				{/if}
			</section>

			<!-- Context field -->
			<section class="field-section">
				<label for="area-context" class="section-label">
					Context
					<span class="label-hint">(optional)</span>
				</label>
				<textarea
					id="area-context"
					class="field-textarea"
					placeholder="Add background information that helps the AI understand this area..."
					bind:value={context}
					disabled={isSubmitting}
					rows="4"
				></textarea>
				<p class="field-hint-text">
					This context will be included in AI conversations when this area is active.
				</p>
			</section>

			<!-- Documents field -->
			<section class="field-section">
				<span class="section-label">
					Reference Documents
					<span class="label-hint">(optional)</span>
				</span>

				<!-- Linked documents list -->
				{#if linkedDocuments.length > 0}
					<div class="documents-list">
						{#each linkedDocuments as doc (doc.id)}
							<div class="document-item">
								<div class="document-icon">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
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
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										/>
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
						id="document-upload"
						class="hidden"
						accept={ACCEPT_DOCUMENTS}
						onchange={handleFileSelect}
						disabled={isSubmitting || isUploading}
						multiple
					/>
					<label for="document-upload" class="upload-button" class:uploading={isUploading}>
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
				<p class="field-hint-text">
					PDF, Word, TXT, MD, JSON, CSV supported.
				</p>
			</section>

			<!-- Color field (not for General) -->
			{#if !isGeneral}
				<section class="field-section">
					<span class="section-label">Color</span>
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
				</section>
			{/if}
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="panel-footer">
			<button
				type="button"
				class="btn-secondary"
				onclick={onClose}
				disabled={isSubmitting}
			>
				Cancel
			</button>
			<button
				type="button"
				class="btn-primary"
				onclick={handleSubmit}
				disabled={isSubmitting || (!name.trim() && !isGeneral)}
			>
				{isSubmitting ? 'Saving...' : 'Save Changes'}
			</button>
		</div>
	{/snippet}
</PanelBase>

<style>
	.panel-content {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.error-message {
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 0.5rem;
		color: #fca5a5;
		font-size: 0.8125rem;
	}

	.general-info {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: 0.5rem;
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.info-icon {
		width: 0.875rem;
		height: 0.875rem;
		color: #3b82f6;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	/* Field sections */
	.field-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.section-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	.label-hint {
		font-weight: 400;
		color: rgba(255, 255, 255, 0.4);
	}

	.field-input,
	.field-textarea {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 0.875rem;
		transition: all 0.15s ease;
	}

	.field-input:focus,
	.field-textarea:focus {
		outline: none;
		border-color: var(--space-color);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--space-color) 15%, transparent);
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
		min-height: 4rem;
	}

	.field-hint-text {
		margin: 0;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	/* Document styles */
	.documents-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.document-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.625rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
	}

	.document-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--space-color);
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
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.document-meta {
		font-size: 0.6875rem;
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
		margin-top: 0.25rem;
	}

	.hidden {
		display: none;
	}

	.upload-button {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.05);
		border: 1px dashed rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.upload-button:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: var(--space-color);
		color: rgba(255, 255, 255, 0.9);
	}

	.upload-button.uploading {
		opacity: 0.7;
		cursor: wait;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}

	/* Color options */
	.color-options {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.color-option {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
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
		width: 0.875rem;
		height: 0.875rem;
		color: #fff;
	}

	/* Footer */
	.panel-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.btn-primary,
	.btn-secondary {
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: var(--space-color);
		color: #fff;
	}

	.btn-primary:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.8);
	}

	.btn-secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
