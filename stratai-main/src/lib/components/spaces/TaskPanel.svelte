<!--
	TaskPanel.svelte

	Slide-out panel for creating/editing tasks.
	Uses the same glass effect pattern as SpaceSettingsPanel.

	Sections:
	- Details: Title, Description
	- Scheduling: Due Date, Deadline Type, Estimated Effort
	- Organization: Priority, Area
	- Documents: Select from space docs + Upload new
-->
<script lang="ts">
	import { fly, fade, slide } from 'svelte/transition';
	import type { Area } from '$lib/types/areas';
	import type { Task, CreateTaskInput, TaskPriority, DueDateType, EstimatedEffort } from '$lib/types/tasks';
	import type { Document } from '$lib/types/documents';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { documentStore } from '$lib/stores/documents.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	interface InitialValues {
		title?: string;
		description?: string;
		dueDate?: Date;
		dueDateType?: DueDateType;
		estimatedEffort?: EstimatedEffort;
		priority?: TaskPriority;
		areaId?: string;
	}

	interface Props {
		isOpen: boolean;
		spaceId: string;
		areas: Area[];
		spaceColor?: string;
		task?: Task | null;
		initialValues?: InitialValues;
		onClose: () => void;
		onCreate: (input: CreateTaskInput) => Promise<Task | null>;
	}

	let {
		isOpen,
		spaceId,
		areas,
		spaceColor = '#3b82f6',
		task = null,
		initialValues,
		onClose,
		onCreate
	}: Props = $props();

	// Derived: is this edit mode?
	let isEditMode = $derived(!!task);

	// Form state
	let title = $state('');
	let description = $state('');
	let dueDate = $state('');
	let dueDateType = $state<DueDateType>('soft');
	let estimatedEffort = $state<EstimatedEffort | ''>('');
	let priority = $state<TaskPriority>('normal');
	let areaId = $state<string>('');
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Documents section state
	let showDocuments = $state(false);
	let selectedSpaceDocIds = $state<Set<string>>(new Set());
	let pendingFiles = $state<File[]>([]);
	let isDragOver = $state(false);
	let isUploadingDocs = $state(false);

	// Effort options
	const effortOptions: { value: EstimatedEffort; label: string; hint: string }[] = [
		{ value: 'quick', label: 'Quick', hint: '<15m' },
		{ value: 'short', label: 'Short', hint: '<1h' },
		{ value: 'medium', label: 'Medium', hint: '1-4h' },
		{ value: 'long', label: 'Long', hint: '4h+' },
		{ value: 'multi_day', label: 'Multi-day', hint: 'Days' }
	];

	// Get space documents
	let spaceDocuments = $derived.by(() => {
		return documentStore.getDocuments(spaceId);
	});

	// Existing linked documents (edit mode)
	let linkedDocuments = $derived(
		task ? documentStore.getDocumentsForTask(task.id) : []
	);

	// Reset/populate form when panel opens
	$effect(() => {
		if (isOpen) {
			if (task) {
				// Edit mode: populate from task
				title = task.title;
				description = task.description || '';
				dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
				dueDateType = task.dueDateType || 'soft';
				estimatedEffort = task.estimatedEffort || '';
				priority = task.priority;
				areaId = task.areaId || '';
				// Load linked documents
				documentStore.loadDocumentsForTask(task.id);
				// Pre-select linked docs
				selectedSpaceDocIds = new Set(linkedDocuments.map(d => d.documentId));
			} else if (initialValues) {
				// Create mode with initial values
				title = initialValues.title || '';
				description = initialValues.description || '';
				dueDate = initialValues.dueDate ? initialValues.dueDate.toISOString().split('T')[0] : '';
				dueDateType = initialValues.dueDateType || 'soft';
				estimatedEffort = initialValues.estimatedEffort || '';
				priority = initialValues.priority || 'normal';
				areaId = initialValues.areaId || '';
				selectedSpaceDocIds = new Set();
			} else {
				// Create mode: reset form
				title = '';
				description = '';
				dueDate = '';
				dueDateType = 'soft';
				estimatedEffort = '';
				priority = 'normal';
				areaId = '';
				selectedSpaceDocIds = new Set();
			}
			// Load space documents
			documentStore.loadDocuments(spaceId);
			// Reset document state
			showDocuments = false;
			pendingFiles = [];
			isDragOver = false;
			isUploadingDocs = false;
			error = null;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
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

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		const files = e.dataTransfer?.files;
		if (files?.length) {
			addFiles(Array.from(files));
		}
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.length) {
			addFiles(Array.from(input.files));
			input.value = '';
		}
	}

	function addFiles(files: File[]) {
		const supported = files.filter(f =>
			f.type === 'application/pdf' ||
			f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
			f.type === 'text/plain' ||
			f.type === 'text/markdown' ||
			f.name.endsWith('.md') ||
			f.name.endsWith('.txt') ||
			f.name.endsWith('.docx') ||
			f.name.endsWith('.pdf')
		);

		if (supported.length < files.length) {
			toastStore.warning('Some files were skipped (only PDF, DOCX, TXT, MD supported)');
		}

		const existing = new Set(pendingFiles.map(f => f.name + f.size));
		const newFiles = supported.filter(f => !existing.has(f.name + f.size));
		pendingFiles = [...pendingFiles, ...newFiles];
	}

	function removePendingFile(index: number) {
		pendingFiles = pendingFiles.filter((_, i) => i !== index);
	}

	function toggleSpaceDoc(docId: string) {
		const newSet = new Set(selectedSpaceDocIds);
		if (newSet.has(docId)) {
			newSet.delete(docId);
		} else {
			newSet.add(docId);
		}
		selectedSpaceDocIds = newSet;
	}

	async function unlinkDocument(documentId: string) {
		if (!task) return;
		await documentStore.unlinkFromTask(documentId, task.id);
	}

	async function uploadAndLinkFiles(taskId: string): Promise<void> {
		if (pendingFiles.length === 0) return;

		isUploadingDocs = true;
		let uploadedCount = 0;

		for (const file of pendingFiles) {
			const doc = await documentStore.uploadDocument(file, spaceId);
			if (doc) {
				await documentStore.linkToTask(doc.id, taskId);
				uploadedCount++;
			}
		}

		if (uploadedCount > 0) {
			toastStore.success(`${uploadedCount} document${uploadedCount > 1 ? 's' : ''} uploaded`);
		}

		isUploadingDocs = false;
	}

	async function linkSelectedSpaceDocs(taskId: string): Promise<void> {
		for (const docId of selectedSpaceDocIds) {
			// Only link if not already linked
			const alreadyLinked = linkedDocuments.some(d => d.documentId === docId);
			if (!alreadyLinked) {
				await documentStore.linkToTask(docId, taskId);
			}
		}
	}

	async function handleSubmit() {
		const trimmedTitle = title.trim();
		if (!trimmedTitle) {
			error = 'Title is required';
			return;
		}

		isSubmitting = true;
		error = null;

		try {
			const trimmedDescription = description.trim();
			let taskId: string | null = null;

			if (isEditMode && task) {
				// Edit mode: update existing task
				await taskStore.updateTask(task.id, {
					title: trimmedTitle,
					description: trimmedDescription || null,
					priority,
					dueDateType,
					estimatedEffort: estimatedEffort || null,
					dueDate: dueDate ? new Date(dueDate) : undefined,
					areaId: areaId || undefined
				});
				taskId = task.id;
			} else {
				// Create mode: create new task
				const input: CreateTaskInput = {
					title: trimmedTitle,
					spaceId,
					priority,
					dueDateType,
					source: { type: 'manual' }
				};

				if (trimmedDescription) input.description = trimmedDescription;
				if (dueDate) input.dueDate = new Date(dueDate);
				if (estimatedEffort) input.estimatedEffort = estimatedEffort;
				if (areaId) input.areaId = areaId;

				const createdTask = await onCreate(input);
				taskId = createdTask?.id ?? null;
			}

			// Handle documents
			if (taskId) {
				// Upload pending files
				if (pendingFiles.length > 0) {
					await uploadAndLinkFiles(taskId);
				}
				// Link selected space documents
				if (selectedSpaceDocIds.size > 0) {
					await linkSelectedSpaceDocs(taskId);
				}
			}

			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : isEditMode ? 'Failed to update task' : 'Failed to create task';
		} finally {
			isSubmitting = false;
		}
	}

	// Format today's date for min attribute
	let today = $derived(new Date().toISOString().split('T')[0]);

	// Format file size for display
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Format char count
	function formatCharCount(count: number): string {
		if (count < 1000) return `${count}`;
		return `${(count / 1000).toFixed(1)}k`;
	}

	// Count total documents to show
	let totalDocsCount = $derived(
		selectedSpaceDocIds.size + pendingFiles.length + linkedDocuments.length
	);
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
	<aside
		class="panel fixed top-0 right-0 h-full flex flex-col bg-surface-900/98 backdrop-blur-md border-l border-surface-700 shadow-2xl z-50"
		style="width: 24rem; --space-color: {spaceColor};"
		transition:fly={{ x: 384, duration: 200, opacity: 1 }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="panel-title"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-3 border-b border-surface-700">
			<div class="flex-1 min-w-0">
				<h2 id="panel-title" class="text-sm font-semibold text-surface-100 truncate">
					{isEditMode ? 'Edit Task' : 'Add Task'}
				</h2>
				<p class="text-xs text-surface-500 truncate">
					{isEditMode ? 'Update task details' : 'Create a new task'}
				</p>
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
			<form class="panel-content" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				{#if error}
					<div class="error-message">{error}</div>
				{/if}

				<!-- Details Section -->
				<section class="panel-section">
					<div class="section-header">
						<div class="section-title">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
							</svg>
							<span>Details</span>
						</div>
					</div>

					<div class="field">
						<label for="title" class="field-label">Title</label>
						<input
							id="title"
							type="text"
							class="field-input"
							placeholder="What needs to be done?"
							bind:value={title}
							disabled={isSubmitting}
						/>
					</div>

					<div class="field">
						<label for="description" class="field-label">
							Description
							<span class="field-hint">(optional)</span>
						</label>
						<textarea
							id="description"
							class="field-input field-textarea"
							placeholder="Background, goals, constraints..."
							bind:value={description}
							disabled={isSubmitting}
							rows="2"
						></textarea>
					</div>
				</section>

				<!-- Scheduling Section -->
				<section class="panel-section">
					<div class="section-header">
						<div class="section-title">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
							</svg>
							<span>Scheduling</span>
						</div>
					</div>

					<div class="field-row">
						<div class="field flex-1">
							<label for="due-date" class="field-label">Due Date</label>
							<input
								id="due-date"
								type="date"
								class="field-input"
								bind:value={dueDate}
								min={today}
								disabled={isSubmitting}
							/>
						</div>

						<div class="field">
							<label class="field-label">Deadline</label>
							<div class="toggle-group compact">
								<button
									type="button"
									class="toggle-option"
									class:selected={dueDateType === 'soft'}
									onclick={() => (dueDateType = 'soft')}
									disabled={isSubmitting}
								>
									Soft
								</button>
								<button
									type="button"
									class="toggle-option"
									class:selected={dueDateType === 'hard'}
									onclick={() => (dueDateType = 'hard')}
									disabled={isSubmitting}
								>
									Hard
								</button>
							</div>
						</div>
					</div>

					<div class="field">
						<label class="field-label">
							Estimated Effort
							<span class="field-hint">(optional)</span>
						</label>
						<div class="effort-picker">
							{#each effortOptions as opt}
								<button
									type="button"
									class="effort-option"
									class:selected={estimatedEffort === opt.value}
									onclick={() => estimatedEffort = estimatedEffort === opt.value ? '' : opt.value}
									disabled={isSubmitting}
								>
									<span class="effort-label">{opt.label}</span>
									<span class="effort-hint">{opt.hint}</span>
								</button>
							{/each}
						</div>
					</div>
				</section>

				<!-- Organization Section -->
				<section class="panel-section">
					<div class="section-header">
						<div class="section-title">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
							</svg>
							<span>Organization</span>
						</div>
					</div>

					<div class="field">
						<label class="field-label">Priority</label>
						<div class="toggle-group">
							<button
								type="button"
								class="toggle-option"
								class:selected={priority === 'normal'}
								onclick={() => (priority = 'normal')}
								disabled={isSubmitting}
							>
								Normal
							</button>
							<button
								type="button"
								class="toggle-option high-priority"
								class:selected={priority === 'high'}
								onclick={() => (priority = 'high')}
								disabled={isSubmitting}
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
								</svg>
								High
							</button>
						</div>
					</div>

					{#if areas.length > 0}
						<div class="field">
							<label for="area" class="field-label">
								Area
								<span class="field-hint">(optional)</span>
							</label>
							<select
								id="area"
								class="field-input"
								bind:value={areaId}
								disabled={isSubmitting}
							>
								<option value="">No specific area</option>
								{#each areas as area (area.id)}
									<option value={area.id}>
										{area.name}
										{#if area.isGeneral}(General){/if}
									</option>
								{/each}
							</select>
						</div>
					{/if}
				</section>

				<!-- Documents Section -->
				<section class="panel-section">
					<button
						type="button"
						class="section-header clickable"
						onclick={() => showDocuments = !showDocuments}
						disabled={isSubmitting}
					>
						<div class="section-title">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
							</svg>
							<span>Reference Documents</span>
						</div>
						<div class="section-meta">
							{#if totalDocsCount > 0}
								<span class="doc-count">{totalDocsCount}</span>
							{/if}
							<svg
								class="toggle-chevron"
								class:expanded={showDocuments}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
							</svg>
						</div>
					</button>

					{#if showDocuments}
						<div class="documents-content" transition:slide={{ duration: 150 }}>
							<!-- Existing Space Documents -->
							{#if spaceDocuments.length > 0}
								<div class="doc-section">
									<span class="doc-section-label">From Space</span>
									<div class="space-doc-list">
										{#each spaceDocuments as doc (doc.id)}
											<label class="space-doc-item">
												<input
													type="checkbox"
													checked={selectedSpaceDocIds.has(doc.id)}
													onchange={() => toggleSpaceDoc(doc.id)}
													disabled={isSubmitting}
												/>
												<span class="doc-name" title={doc.filename}>{doc.title || doc.filename}</span>
												<span class="doc-size">{formatCharCount(doc.charCount)}</span>
											</label>
										{/each}
									</div>
								</div>
							{/if}

							<!-- Upload New -->
							<div class="doc-section">
								<span class="doc-section-label">Upload New</span>
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="drop-zone"
									class:drag-over={isDragOver}
									ondragover={handleDragOver}
									ondragleave={handleDragLeave}
									ondrop={handleDrop}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
									</svg>
									<p>
										Drop files or
										<label class="file-label">
											browse
											<input
												type="file"
												accept=".pdf,.docx,.txt,.md,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
												multiple
												onchange={handleFileSelect}
												disabled={isSubmitting}
											/>
										</label>
									</p>
									<span class="file-hint">PDF, DOCX, TXT, MD</span>
								</div>
							</div>

							<!-- Pending Files -->
							{#if pendingFiles.length > 0}
								<div class="doc-section">
									<span class="doc-section-label">To Upload ({pendingFiles.length})</span>
									<div class="file-list">
										{#each pendingFiles as file, index (file.name + file.size)}
											<div class="file-item">
												<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
													<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
												</svg>
												<span class="file-name">{file.name}</span>
												<span class="file-size">{formatFileSize(file.size)}</span>
												<button
													type="button"
													class="file-remove"
													onclick={() => removePendingFile(index)}
													disabled={isSubmitting}
													title="Remove file"
												>
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
														<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</section>

				<!-- Actions (sticky footer) -->
				<div class="panel-actions">
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
						disabled={isSubmitting || !title.trim()}
					>
						{#if isSubmitting}
							{isEditMode ? 'Saving...' : 'Creating...'}
						{:else}
							{isEditMode ? 'Save Changes' : 'Create Task'}
						{/if}
					</button>
				</div>
			</form>
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

	.panel-content {
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.error-message {
		padding: 0.625rem 0.75rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 0.5rem;
		color: #fca5a5;
		font-size: 0.8125rem;
	}

	/* Section styles */
	.panel-section {
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

	.section-header.clickable {
		cursor: pointer;
		width: 100%;
		padding: 0;
		margin-bottom: 0;
		background: none;
		border: none;
		text-align: left;
	}

	.section-header.clickable:hover .section-title {
		color: rgba(255, 255, 255, 0.7);
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
		transition: color 0.15s ease;
	}

	.section-title svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.section-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.doc-count {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		background: color-mix(in srgb, var(--space-color) 20%, transparent);
		color: var(--space-color);
		border-radius: 0.25rem;
	}

	.toggle-chevron {
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.4);
		transition: transform 0.15s ease;
	}

	.toggle-chevron.expanded {
		transform: rotate(90deg);
	}

	/* Field styles */
	.field {
		margin-bottom: 0.75rem;
	}

	.field:last-child {
		margin-bottom: 0;
	}

	.field-row {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.field-row .field {
		margin-bottom: 0;
	}

	.flex-1 {
		flex: 1;
	}

	.field-label {
		display: block;
		margin-bottom: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
	}

	.field-hint {
		font-weight: 400;
		color: rgba(255, 255, 255, 0.4);
	}

	.field-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.375rem;
		color: #fff;
		font-size: 0.8125rem;
		transition: all 0.15s ease;
	}

	.field-input:focus {
		outline: none;
		border-color: var(--space-color);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--space-color) 20%, transparent);
	}

	.field-input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.field-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.field-textarea {
		resize: vertical;
		min-height: 3rem;
		max-height: 8rem;
		font-family: inherit;
		line-height: 1.4;
	}

	/* Date input */
	input[type="date"] {
		color-scheme: dark;
	}

	input[type="date"]::-webkit-calendar-picker-indicator {
		filter: invert(0.7);
		cursor: pointer;
	}

	/* Select */
	select.field-input {
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff50'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;
		background-size: 1rem;
		padding-right: 2rem;
	}

	/* Toggle group */
	.toggle-group {
		display: flex;
		gap: 0.375rem;
	}

	.toggle-group.compact {
		gap: 0.25rem;
	}

	.toggle-option {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.toggle-option:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(255, 255, 255, 0.8);
	}

	.toggle-option.selected {
		background: color-mix(in srgb, var(--space-color) 15%, transparent);
		border-color: color-mix(in srgb, var(--space-color) 40%, transparent);
		color: var(--space-color);
	}

	.toggle-option.high-priority.selected {
		background: rgba(239, 68, 68, 0.12);
		border-color: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.toggle-option:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-option svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	/* Effort picker */
	.effort-picker {
		display: flex;
		gap: 0.375rem;
	}

	.effort-option {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
		padding: 0.5rem 0.25rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.effort-option:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.12);
	}

	.effort-option.selected {
		background: color-mix(in srgb, var(--space-color) 12%, transparent);
		border-color: var(--space-color);
	}

	.effort-option:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.effort-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
	}

	.effort-option.selected .effort-label {
		color: var(--space-color);
	}

	.effort-hint {
		font-size: 0.5625rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.effort-option.selected .effort-hint {
		color: color-mix(in srgb, var(--space-color) 70%, transparent);
	}

	/* Documents section */
	.documents-content {
		margin-top: 0.75rem;
	}

	.doc-section {
		margin-bottom: 0.75rem;
	}

	.doc-section:last-child {
		margin-bottom: 0;
	}

	.doc-section-label {
		display: block;
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		margin-bottom: 0.375rem;
	}

	.space-doc-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		max-height: 120px;
		overflow-y: auto;
	}

	.space-doc-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.space-doc-item:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.space-doc-item input[type="checkbox"] {
		accent-color: var(--space-color);
	}

	.space-doc-item .doc-name {
		flex: 1;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.8);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.space-doc-item .doc-size {
		font-size: 0.625rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.drop-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.75rem;
		border: 2px dashed rgba(255, 255, 255, 0.12);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.drop-zone.drag-over {
		border-color: var(--space-color);
		background: color-mix(in srgb, var(--space-color) 10%, transparent);
	}

	.drop-zone svg {
		width: 1.25rem;
		height: 1.25rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.drop-zone p {
		margin: 0;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.file-label {
		color: var(--space-color);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.file-label:hover {
		color: color-mix(in srgb, var(--space-color) 80%, #fff);
	}

	.file-label input {
		display: none;
	}

	.file-hint {
		font-size: 0.625rem;
		color: rgba(255, 255, 255, 0.35);
	}

	.file-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.375rem;
	}

	.file-icon {
		width: 0.875rem;
		height: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		flex-shrink: 0;
	}

	.file-name {
		flex: 1;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.8);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.file-size {
		font-size: 0.625rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.file-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.125rem;
		height: 1.125rem;
		color: rgba(255, 255, 255, 0.3);
		border-radius: 0.25rem;
		transition: all 0.15s ease;
	}

	.file-remove:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.file-remove:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.file-remove svg {
		width: 0.625rem;
		height: 0.625rem;
	}

	/* Actions */
	.panel-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 0.75rem;
		margin-top: auto;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(0, 0, 0, 0.2);
	}

	.btn-primary,
	.btn-secondary {
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		border-radius: 0.375rem;
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
		color: rgba(255, 255, 255, 0.7);
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
