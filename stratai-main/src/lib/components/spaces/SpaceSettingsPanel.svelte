<!--
	SpaceSettingsPanel.svelte

	Slide-out panel for managing space settings.
	Uses the same glass effect pattern as ContextPanel.

	Sections:
	- Appearance: Name, Color
	- Context: Description for AI
	- Documents: List with delete, upload
	- Danger Zone: Delete space (custom spaces only)
-->
<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { documentStore } from '$lib/stores/documents.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Document } from '$lib/types/documents';
	import type { Space, UpdateSpaceInput } from '$lib/types/spaces';
	import { ACCEPT_DOCUMENTS } from '$lib/config/file-types';

	type Theme = 'dark' | 'light' | 'system';

	interface Props {
		isOpen: boolean;
		space: Space;
		onClose: () => void;
		onUpdate: (id: string, updates: UpdateSpaceInput) => Promise<void>;
		onDelete?: (id: string) => Promise<void>;
	}

	let { isOpen, space, onClose, onUpdate, onDelete }: Props = $props();

	// Local form state
	let name = $state('');
	let context = $state('');
	let color = $state('');
	let isEditingName = $state(false);
	let isEditingContext = $state(false);
	let isSaving = $state(false);
	let isDragOver = $state(false);
	let isUploading = $state(false);
	let deleteConfirmId = $state<string | null>(null);
	let showDeleteSpaceConfirm = $state(false);
	let isDeletingSpace = $state(false);

	// Color options
	const colorOptions = [
		{ value: '#3b82f6', label: 'Blue' },
		{ value: '#8b5cf6', label: 'Purple' },
		{ value: '#10b981', label: 'Green' },
		{ value: '#f59e0b', label: 'Amber' },
		{ value: '#ef4444', label: 'Red' },
		{ value: '#ec4899', label: 'Pink' },
		{ value: '#06b6d4', label: 'Cyan' },
		{ value: '#84cc16', label: 'Lime' }
	];

	// Theme options (app-wide)
	const themeOptions: { value: Theme; label: string }[] = [
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'system', label: 'System' }
	];

	let currentTheme = $derived(settingsStore.theme);

	// Derived
	let isSystemSpace = $derived(space?.type === 'system');
	let spaceColor = $derived(space?.color || '#3b82f6');

	// Load documents when panel opens
	$effect(() => {
		if (isOpen && space) {
			documentStore.loadDocuments(space.id);
			// Reset form state
			name = space.name;
			context = space.context ?? '';
			color = space.color ?? '#3b82f6';
			isEditingName = false;
			isEditingContext = false;
			showDeleteSpaceConfirm = false;
		}
	});

	// Get documents for this space
	let spaceDocs = $derived.by(() => {
		if (!space) return [];
		return documentStore.getDocuments(space.id);
	});

	// Format helpers
	function formatCharCount(count: number): string {
		if (count < 1000) return `${count}`;
		return `${(count / 1000).toFixed(1)}k`;
	}

	function getFileIcon(mimeType: string): string {
		if (mimeType === 'application/pdf') return 'pdf';
		if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'word';
		if (mimeType.startsWith('text/')) return 'text';
		return 'generic';
	}

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (showDeleteSpaceConfirm) {
				showDeleteSpaceConfirm = false;
			} else if (isEditingName || isEditingContext) {
				isEditingName = false;
				isEditingContext = false;
				name = space.name;
				context = space.context ?? '';
			} else {
				onClose();
			}
		}
	}

	// Save name
	async function saveName() {
		if (!name.trim()) {
			toastStore.error('Name is required');
			return;
		}
		isSaving = true;
		try {
			await onUpdate(space.id, { name: name.trim() });
			isEditingName = false;
			toastStore.success('Name updated');
		} catch (e) {
			toastStore.error('Failed to update name');
		} finally {
			isSaving = false;
		}
	}

	// Save context
	async function saveContext() {
		isSaving = true;
		try {
			await onUpdate(space.id, { context: context || undefined });
			isEditingContext = false;
			toastStore.success('Context updated');
		} catch (e) {
			toastStore.error('Failed to update context');
		} finally {
			isSaving = false;
		}
	}

	// Save color
	async function saveColor(newColor: string) {
		color = newColor;
		try {
			await onUpdate(space.id, { color: newColor });
		} catch (e) {
			toastStore.error('Failed to update color');
		}
	}

	// Set app theme
	function setTheme(theme: Theme) {
		settingsStore.setTheme(theme);
		applyTheme(theme);
	}

	function applyTheme(theme: Theme) {
		const root = document.documentElement;
		if (theme === 'system') {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			root.classList.toggle('light', !prefersDark);
			root.classList.toggle('dark', prefersDark);
		} else {
			root.classList.toggle('light', theme === 'light');
			root.classList.toggle('dark', theme === 'dark');
		}
	}

	// Document handling
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
		let uploaded = 0;

		for (const file of supported) {
			const doc = await documentStore.uploadDocument(file, space.id);
			if (doc) uploaded++;
		}

		if (uploaded > 0) {
			toastStore.success(`${uploaded} document${uploaded > 1 ? 's' : ''} uploaded`);
		}

		isUploading = false;
	}

	async function handleDeleteDocument(doc: Document) {
		await documentStore.deleteDocument(doc.id);
		deleteConfirmId = null;
	}

	// Delete space
	async function handleDeleteSpace() {
		if (!onDelete) return;
		isDeletingSpace = true;
		try {
			await onDelete(space.id);
			onClose();
		} catch (e) {
			toastStore.error('Failed to delete space');
		} finally {
			isDeletingSpace = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
		transition:fade={{ duration: 150 }}
		onclick={onClose}
		role="presentation"
	></div>

	<!-- Panel -->
	<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
	<aside
		class="panel fixed top-0 right-0 h-full flex flex-col bg-surface-900/98 backdrop-blur-md border-l border-surface-700 shadow-2xl z-50"
		style="width: 22rem; --space-color: {spaceColor};"
		transition:fly={{ x: 320, duration: 200, opacity: 1 }}
		role="dialog"
		aria-modal="true"
		aria-label="Space Settings"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 border-b border-surface-700">
			<div class="flex-1 min-w-0">
				<h2 class="text-sm font-semibold text-surface-100 truncate">{space.name} Settings</h2>
				<p class="text-xs text-surface-500 truncate">Manage your space</p>
			</div>
			<button
				type="button"
				class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors flex-shrink-0"
				onclick={onClose}
				title="Close (Esc)"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto">
			<div class="settings-content">
				<!-- Appearance Section -->
				<section class="settings-section">
					<div class="section-header">
						<div class="section-title">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
							</svg>
							<span>Appearance</span>
						</div>
					</div>

					<!-- Name -->
					<div class="field">
						<label class="field-label">Name</label>
						{#if isEditingName && !isSystemSpace}
							<div class="field-edit">
								<input
									type="text"
									bind:value={name}
									class="field-input"
									placeholder="Space name"
								/>
								<div class="field-actions">
									<button type="button" class="btn-cancel" onclick={() => { isEditingName = false; name = space.name; }} disabled={isSaving}>
										Cancel
									</button>
									<button type="button" class="btn-save" onclick={saveName} disabled={isSaving}>
										{isSaving ? 'Saving...' : 'Save'}
									</button>
								</div>
							</div>
						{:else}
							<div class="field-display">
								<span class="field-value">{space.name}</span>
								{#if !isSystemSpace}
									<button type="button" class="edit-btn" onclick={() => isEditingName = true}>
										Edit
									</button>
								{:else}
									<span class="system-badge">System</span>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Color -->
					<div class="field">
						<label class="field-label">Color</label>
						<div class="color-picker">
							{#each colorOptions as opt}
								<button
									type="button"
									class="color-option"
									class:selected={color === opt.value}
									style="--option-color: {opt.value}"
									onclick={() => saveColor(opt.value)}
									title={opt.label}
								>
									{#if color === opt.value}
										<svg viewBox="0 0 24 24" fill="currentColor">
											<path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clip-rule="evenodd" />
										</svg>
									{/if}
								</button>
							{/each}
						</div>
					</div>

				</section>

				<!-- Theme Section (app-wide) -->
				<section class="settings-section">
					<div class="section-header">
						<div class="section-title">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
							</svg>
							<span>Theme</span>
						</div>
						<span class="section-badge">App-wide</span>
					</div>

					<div class="theme-picker">
						{#each themeOptions as opt}
							<button
								type="button"
								class="theme-option"
								class:selected={currentTheme === opt.value}
								onclick={() => setTheme(opt.value)}
							>
								{#if opt.value === 'light'}
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
									</svg>
								{:else if opt.value === 'dark'}
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
									</svg>
								{:else}
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
									</svg>
								{/if}
								<span>{opt.label}</span>
							</button>
						{/each}
					</div>
				</section>

				<!-- Context Section -->
				<section class="settings-section">
					<div class="section-header">
						<div class="section-title">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
							</svg>
							<span>Context</span>
						</div>
						{#if !isEditingContext}
							<button type="button" class="edit-btn" onclick={() => isEditingContext = true}>
								Edit
							</button>
						{/if}
					</div>

					{#if isEditingContext}
						<div class="context-edit">
							<textarea
								bind:value={context}
								placeholder="Add context for the AI (e.g., goals, constraints, key information for all areas in this space)..."
								rows="4"
							></textarea>
							<div class="field-actions">
								<button type="button" class="btn-cancel" onclick={() => { isEditingContext = false; context = space.context ?? ''; }} disabled={isSaving}>
									Cancel
								</button>
								<button type="button" class="btn-save" onclick={saveContext} disabled={isSaving}>
									{isSaving ? 'Saving...' : 'Save'}
								</button>
							</div>
						</div>
					{:else if space.context}
						<div class="context-preview">{space.context}</div>
					{:else}
						<div class="context-empty">
							No context yet. Add information to help the AI understand this space.
						</div>
					{/if}
				</section>

				<!-- Documents Section -->
				<section class="settings-section">
					<div class="section-header">
						<div class="section-title">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
							</svg>
							<span>Documents</span>
						</div>
						{#if spaceDocs.length > 0}
							<span class="doc-count">{spaceDocs.length}</span>
						{/if}
					</div>

					<p class="section-hint">
						Documents uploaded here are available to all areas and tasks in this space.
					</p>

					<!-- Document List -->
					{#if spaceDocs.length > 0}
						<div class="doc-list">
							{#each spaceDocs as doc (doc.id)}
								{@const icon = getFileIcon(doc.mimeType)}
								<div class="doc-item">
									<!-- File icon -->
									<div class="doc-icon" class:pdf={icon === 'pdf'} class:word={icon === 'word'} class:text={icon === 'text'}>
										{#if icon === 'pdf'}
											<svg viewBox="0 0 24 24" fill="currentColor">
												<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9c.55 0 1-.45 1-1s-.45-1-1-1H7v4h1v-1h2c.55 0 1-.45 1-1zM8 10h2v1H8v-1zm6 4c.55 0 1-.45 1-1v-2c0-.55-.45-1-1-1h-3v4h3zm-2-3h1v2h-1v-2zm5 3c.55 0 1-.45 1-1v-2c0-.55-.45-1-1-1h-1c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h1zm0-3v2h-1v-2h1z"/>
											</svg>
										{:else if icon === 'word'}
											<svg viewBox="0 0 24 24" fill="currentColor">
												<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
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
											<button type="button" class="confirm-yes" onclick={() => handleDeleteDocument(doc)}>
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
										accept={ACCEPT_DOCUMENTS}
										multiple
										onchange={handleFileSelect}
									/>
								</label>
							</p>
							<span class="file-types">PDF, DOCX, TXT, MD</span>
						{/if}
					</div>
				</section>

				<!-- Danger Zone (custom spaces only) -->
				{#if !isSystemSpace && onDelete}
					<section class="settings-section danger-zone">
						<div class="section-header">
							<div class="section-title danger">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
								</svg>
								<span>Danger Zone</span>
							</div>
						</div>

						{#if showDeleteSpaceConfirm}
							<div class="delete-space-confirm">
								<p class="delete-warning">
									This will permanently delete <strong>{space.name}</strong> and all its areas, tasks, and conversations. This cannot be undone.
								</p>
								<div class="delete-actions">
									<button type="button" class="btn-cancel" onclick={() => showDeleteSpaceConfirm = false} disabled={isDeletingSpace}>
										Cancel
									</button>
									<button type="button" class="btn-delete" onclick={handleDeleteSpace} disabled={isDeletingSpace}>
										{isDeletingSpace ? 'Deleting...' : 'Delete Forever'}
									</button>
								</div>
							</div>
						{:else}
							<button type="button" class="delete-space-btn" onclick={() => showDeleteSpaceConfirm = true}>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
								</svg>
								Delete this space
							</button>
						{/if}
					</section>
				{/if}
			</div>
		</div>
	</aside>
{/if}

<style>
	.panel {
		box-shadow:
			-4px 0 24px rgba(0, 0, 0, 0.3),
			inset 1px 0 0 rgba(255, 255, 255, 0.03);
	}

	/* Smooth scrollbar */
	.panel :global(::-webkit-scrollbar) {
		width: 6px;
	}

	.panel :global(::-webkit-scrollbar-track) {
		background: transparent;
	}

	.panel :global(::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.panel :global(::-webkit-scrollbar-thumb:hover) {
		background: rgba(255, 255, 255, 0.2);
	}

	.settings-content {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Section styles */
	.settings-section {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		padding: 0.75rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
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

	.section-title.danger {
		color: #ef4444;
	}

	.section-badge {
		font-size: 0.5625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.125rem 0.375rem;
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.4);
		border-radius: 0.25rem;
	}

	.section-hint {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.4);
		margin-bottom: 0.75rem;
		line-height: 1.4;
	}

	/* Field styles */
	.field {
		margin-bottom: 0.75rem;
	}

	.field:last-child {
		margin-bottom: 0;
	}

	.field-label {
		display: block;
		font-size: 0.6875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		margin-bottom: 0.375rem;
	}

	.field-display {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.field-value {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.field-input {
		width: 100%;
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.9);
	}

	.field-input:focus {
		outline: none;
		border-color: var(--space-color);
	}

	.field-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

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

	.system-badge {
		font-size: 0.625rem;
		padding: 0.125rem 0.375rem;
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.5);
		border-radius: 0.25rem;
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

	/* Color picker */
	.color-picker {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.color-option {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.375rem;
		background: var(--option-color);
		border: 2px solid transparent;
		transition: all 0.15s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.color-option:hover {
		transform: scale(1.1);
	}

	.color-option.selected {
		border-color: rgba(255, 255, 255, 0.8);
		box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
	}

	.color-option svg {
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.9);
	}

	/* Theme picker */
	.theme-picker {
		display: flex;
		gap: 0.5rem;
	}

	.theme-option {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 0.5rem;
		border-radius: 0.625rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.75rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.theme-option:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.15);
		color: rgba(255, 255, 255, 0.8);
	}

	.theme-option.selected {
		background: color-mix(in srgb, var(--space-color) 12%, transparent);
		border-color: var(--space-color);
		color: var(--space-color);
	}

	.theme-option svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	/* Context section */
	.context-edit textarea {
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

	.context-edit textarea:focus {
		outline: none;
		border-color: var(--space-color);
	}

	.context-preview {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.context-empty {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
		font-style: italic;
	}

	/* Document section */
	.doc-count {
		font-size: 0.625rem;
		padding: 0.125rem 0.375rem;
		background: color-mix(in srgb, var(--space-color) 20%, transparent);
		color: var(--space-color);
		border-radius: 0.25rem;
		font-weight: 500;
	}

	.doc-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
		max-height: 200px;
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

	/* Danger zone */
	.danger-zone {
		background: rgba(239, 68, 68, 0.05);
		border-color: rgba(239, 68, 68, 0.15);
	}

	.delete-space-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.delete-space-btn:hover {
		background: rgba(239, 68, 68, 0.15);
		border-color: rgba(239, 68, 68, 0.3);
	}

	.delete-space-btn svg {
		width: 1rem;
		height: 1rem;
	}

	.delete-space-confirm {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.delete-warning {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.5;
	}

	.delete-warning strong {
		color: #ef4444;
	}

	.delete-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.btn-delete {
		font-size: 0.75rem;
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		font-weight: 500;
		background: #ef4444;
		color: #fff;
		transition: all 0.15s ease;
	}

	.btn-delete:hover {
		background: #dc2626;
	}

	.btn-delete:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
