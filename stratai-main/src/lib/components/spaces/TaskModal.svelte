<script lang="ts">
	/**
	 * TaskModal - Create/Edit Task Modal
	 *
	 * Centered modal for creating or editing tasks with full field options:
	 * - Title (required)
	 * - Description (optional - helps AI context)
	 * - Due date (optional)
	 * - Due date type (hard/soft deadline)
	 * - Priority (normal/high)
	 * - Area (optional - link to specific area)
	 * - Reference documents (optional - collapsible section)
	 */
	import { fly, fade, slide } from 'svelte/transition';
	import type { Area } from '$lib/types/areas';
	import type { Task, CreateTaskInput, TaskPriority, DueDateType } from '$lib/types/tasks';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { documentStore } from '$lib/stores/documents.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	interface Props {
		open: boolean;
		spaceId: string;
		areas: Area[];
		spaceColor?: string;
		task?: Task | null; // If provided, modal is in edit mode
		onClose: () => void;
		onCreate: (input: CreateTaskInput) => Promise<Task | null>; // Returns created task for document linking
	}

	let {
		open,
		spaceId,
		areas,
		spaceColor = '#3b82f6',
		task = null,
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
	let priority = $state<TaskPriority>('normal');
	let areaId = $state<string>('');
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Documents section state
	let showDocuments = $state(false);
	let pendingFiles = $state<File[]>([]);
	let isDragOver = $state(false);
	let isUploadingDocs = $state(false);

	// Existing linked documents (edit mode)
	let linkedDocuments = $derived(
		task ? documentStore.getDocumentsForTask(task.id) : []
	);

	// Reset/populate form when modal opens
	$effect(() => {
		if (open) {
			if (task) {
				// Edit mode: populate from task
				title = task.title;
				description = task.description || '';
				dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
				dueDateType = task.dueDateType || 'soft';
				priority = task.priority;
				areaId = task.areaId || '';
				// Load linked documents
				documentStore.loadDocumentsForTask(task.id);
			} else {
				// Create mode: reset form
				title = '';
				description = '';
				dueDate = '';
				dueDateType = 'soft';
				priority = 'normal';
				areaId = '';
			}
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

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
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
			input.value = ''; // Reset input
		}
	}

	function addFiles(files: File[]) {
		// Filter for supported types and dedupe
		const supported = files.filter(f =>
			f.type === 'application/pdf' ||
			f.type === 'text/plain' ||
			f.type === 'text/markdown' ||
			f.name.endsWith('.md') ||
			f.name.endsWith('.txt')
		);

		if (supported.length < files.length) {
			toastStore.warning('Some files were skipped (only PDF, TXT, MD supported)');
		}

		// Add to pending, avoiding duplicates
		const existing = new Set(pendingFiles.map(f => f.name + f.size));
		const newFiles = supported.filter(f => !existing.has(f.name + f.size));
		pendingFiles = [...pendingFiles, ...newFiles];
	}

	function removePendingFile(index: number) {
		pendingFiles = pendingFiles.filter((_, i) => i !== index);
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
					description: trimmedDescription || null, // null to clear if empty
					priority,
					dueDateType,
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

				// Add optional fields
				if (trimmedDescription) {
					input.description = trimmedDescription;
				}
				if (dueDate) {
					input.dueDate = new Date(dueDate);
				}
				if (areaId) {
					input.areaId = areaId;
				}

				const createdTask = await onCreate(input);
				taskId = createdTask?.id ?? null;
			}

			// Upload pending files if we have a task ID
			if (taskId && pendingFiles.length > 0) {
				await uploadAndLinkFiles(taskId);
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
			style="--space-color: {spaceColor}"
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<!-- Header -->
			<header class="modal-header">
				<h2 id="modal-title" class="modal-title">{isEditMode ? 'Edit Task' : 'Add Task'}</h2>
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
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
					{#if error}
						<div class="error-message">{error}</div>
					{/if}

					<!-- Title field -->
					<div class="field">
						<label for="title" class="field-label">Title</label>
						<input
							id="title"
							type="text"
							class="field-input"
							placeholder="What needs to be done?"
							bind:value={title}
							disabled={isSubmitting}
							autofocus
						/>
					</div>

					<!-- Description field -->
					<div class="field">
						<label for="description" class="field-label">
							Description
							<span class="field-hint">(optional - helps AI understand context)</span>
						</label>
						<textarea
							id="description"
							class="field-input field-textarea"
							placeholder="Background, goals, constraints, or any context that would help..."
							bind:value={description}
							disabled={isSubmitting}
							rows="3"
						></textarea>
					</div>

					<!-- Due date row -->
					<div class="field-row">
						<!-- Due date field -->
						<div class="field flex-1">
							<label for="due-date" class="field-label">
								Due Date
								<span class="field-hint">(optional)</span>
							</label>
							<input
								id="due-date"
								type="date"
								class="field-input"
								bind:value={dueDate}
								min={today}
								disabled={isSubmitting}
							/>
						</div>

						<!-- Due date type -->
						<div class="field">
							<label class="field-label">Deadline Type</label>
							<div class="toggle-group">
								<button
									type="button"
									class="toggle-option"
									class:selected={dueDateType === 'soft'}
									onclick={() => (dueDateType = 'soft')}
									disabled={isSubmitting}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									Soft
								</button>
								<button
									type="button"
									class="toggle-option"
									class:selected={dueDateType === 'hard'}
									onclick={() => (dueDateType = 'hard')}
									disabled={isSubmitting}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
									</svg>
									Hard
								</button>
							</div>
						</div>
					</div>

					<!-- Priority field -->
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

					<!-- Area field -->
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

					<!-- Documents section (collapsible) -->
					<div class="documents-section">
						<button
							type="button"
							class="documents-toggle"
							onclick={() => showDocuments = !showDocuments}
							disabled={isSubmitting}
						>
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
							<span class="toggle-label">Reference Documents</span>
							{#if pendingFiles.length > 0 || linkedDocuments.length > 0}
								<span class="doc-count">
									{pendingFiles.length + linkedDocuments.length}
								</span>
							{/if}
						</button>

						{#if showDocuments}
							<div class="documents-content" transition:slide={{ duration: 150 }}>
								<!-- Drop zone -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="drop-zone"
									class:drag-over={isDragOver}
									ondragover={handleDragOver}
									ondragleave={handleDragLeave}
									ondrop={handleDrop}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
									</svg>
									<p>Drop files here or <label class="file-label">
										browse
										<input
											type="file"
											accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
											multiple
											onchange={handleFileSelect}
											disabled={isSubmitting}
										/>
									</label></p>
									<span class="file-hint">PDF, TXT, MD supported</span>
								</div>

								<!-- Linked documents (edit mode) -->
								{#if linkedDocuments.length > 0}
									<div class="file-list">
										<span class="file-list-label">Linked</span>
										{#each linkedDocuments as doc (doc.documentId)}
											<div class="file-item linked">
												<svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
													<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
												</svg>
												<span class="file-name">{doc.filename}</span>
												<button
													type="button"
													class="file-remove"
													onclick={() => unlinkDocument(doc.documentId)}
													disabled={isSubmitting}
													title="Remove document"
												>
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
														<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											</div>
										{/each}
									</div>
								{/if}

								<!-- Pending files (to be uploaded) -->
								{#if pendingFiles.length > 0}
									<div class="file-list">
										<span class="file-list-label">To upload</span>
										{#each pendingFiles as file, index (file.name + file.size)}
											<div class="file-item pending">
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
								{/if}
							</div>
						{/if}
					</div>

					<!-- Actions -->
					<div class="modal-actions">
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

	.field {
		margin-bottom: 1.25rem;
	}

	.field-row {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.flex-1 {
		flex: 1;
	}

	.field-row .field {
		margin-bottom: 0;
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

	.field-input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 0.9375rem;
		transition: all 0.15s ease;
	}

	.field-input:focus {
		outline: none;
		border-color: var(--space-color, #3b82f6);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--space-color, #3b82f6) 20%, transparent);
	}

	.field-input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.field-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Textarea styling */
	.field-textarea {
		resize: vertical;
		min-height: 4.5rem;
		max-height: 12rem;
		font-family: inherit;
		line-height: 1.5;
	}

	/* Date input styling */
	input[type="date"] {
		color-scheme: dark;
	}

	input[type="date"]::-webkit-calendar-picker-indicator {
		filter: invert(0.7);
		cursor: pointer;
	}

	/* Select styling */
	select.field-input {
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff50'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		background-size: 1rem;
		padding-right: 2.5rem;
	}

	/* Toggle group */
	.toggle-group {
		display: flex;
		gap: 0.5rem;
	}

	.toggle-option {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.toggle-option:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.9);
	}

	.toggle-option.selected {
		background: color-mix(in srgb, var(--space-color, #3b82f6) 20%, transparent);
		border-color: color-mix(in srgb, var(--space-color, #3b82f6) 50%, transparent);
		color: var(--space-color, #3b82f6);
	}

	.toggle-option.high-priority.selected {
		background: rgba(239, 68, 68, 0.15);
		border-color: rgba(239, 68, 68, 0.4);
		color: #ef4444;
	}

	.toggle-option:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-option svg {
		width: 1rem;
		height: 1rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.btn-primary,
	.btn-secondary {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: var(--space-color, #3b82f6);
		color: #fff;
	}

	.btn-primary:hover:not(:disabled) {
		background: color-mix(in srgb, var(--space-color, #3b82f6) 80%, #fff);
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

	/* Documents section */
	.documents-section {
		margin-bottom: 1.25rem;
	}

	.documents-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.625rem 0.875rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.documents-toggle:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.12);
		color: rgba(255, 255, 255, 0.9);
	}

	.documents-toggle:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-chevron {
		width: 1rem;
		height: 1rem;
		transition: transform 0.15s ease;
	}

	.toggle-chevron.expanded {
		transform: rotate(90deg);
	}

	.toggle-label {
		flex: 1;
		text-align: left;
	}

	.doc-count {
		padding: 0.125rem 0.5rem;
		background: var(--space-color, #3b82f6);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		color: #fff;
	}

	.documents-content {
		padding: 0.875rem;
		margin-top: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
	}

	.drop-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1.25rem;
		border: 2px dashed rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.drop-zone.drag-over {
		border-color: var(--space-color, #3b82f6);
		background: color-mix(in srgb, var(--space-color, #3b82f6) 10%, transparent);
	}

	.drop-zone svg {
		width: 1.75rem;
		height: 1.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.drop-zone p {
		margin: 0;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.file-label {
		color: var(--space-color, #3b82f6);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.file-label:hover {
		color: color-mix(in srgb, var(--space-color, #3b82f6) 80%, #fff);
	}

	.file-label input {
		display: none;
	}

	.file-hint {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.35);
	}

	.file-list {
		margin-top: 0.75rem;
	}

	.file-list-label {
		display: block;
		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		margin-bottom: 0.375rem;
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.625rem;
		background: rgba(255, 255, 255, 0.04);
		border-radius: 0.375rem;
		margin-bottom: 0.375rem;
	}

	.file-item:last-child {
		margin-bottom: 0;
	}

	.file-item.linked {
		border-left: 2px solid var(--space-color, #3b82f6);
	}

	.file-item.pending {
		border-left: 2px solid rgba(255, 255, 255, 0.3);
	}

	.file-icon {
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.5);
		flex-shrink: 0;
	}

	.file-name {
		flex: 1;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.8);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.file-size {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.file-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		color: rgba(255, 255, 255, 0.4);
		border-radius: 0.25rem;
		transition: all 0.15s ease;
	}

	.file-remove:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.file-remove:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.file-remove svg {
		width: 0.75rem;
		height: 0.75rem;
	}
</style>
