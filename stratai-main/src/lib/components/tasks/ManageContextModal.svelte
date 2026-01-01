<!--
	ManageContextModal.svelte

	Modal for managing context settings for a task.
	Allows setting focus area, viewing/managing linked documents.
-->
<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { areaStore as focusAreaStore } from '$lib/stores/areas.svelte';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { documentStore, type TaskDocumentLink } from '$lib/stores/documents.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Area as FocusArea } from '$lib/types/areas';
	import type { Document, DocumentContextRole } from '$lib/types/documents';

	interface Props {
		open: boolean;
		taskId: string;
		spaceId: string;
		currentFocusAreaId: string | null;
		onClose: () => void;
		onUpdateFocusArea: (focusAreaId: string | null) => Promise<void>;
		onAddContext: () => void; // Opens AddContextModal for full document management
	}

	let {
		open,
		taskId,
		spaceId,
		currentFocusAreaId,
		onClose,
		onUpdateFocusArea,
		onAddContext
	}: Props = $props();

	// State
	let selectedFocusAreaId = $state<string | null>(null);
	let isSaving = $state(false);
	let isUnlinking = $state<string | null>(null);

	// Get focus areas for this space
	let focusAreas = $derived.by(() => {
		return focusAreaStore.getFocusAreasForSpace(spaceId);
	});

	// Get linked documents for this task
	let linkedDocuments = $derived.by(() => {
		return documentStore.getDocumentsForTask(taskId);
	});

	// Task info
	let task = $derived.by(() => {
		return taskStore.tasks.get(taskId);
	});

	// Reset selection when modal opens
	$effect(() => {
		if (open) {
			selectedFocusAreaId = currentFocusAreaId;
		}
	});

	// Handle save focus area
	async function handleSaveFocusArea() {
		if (selectedFocusAreaId === currentFocusAreaId) {
			return;
		}

		isSaving = true;
		try {
			await onUpdateFocusArea(selectedFocusAreaId);
			const newFocusArea = selectedFocusAreaId
				? focusAreas.find(f => f.id === selectedFocusAreaId)?.name
				: 'None';
			toastStore.success(`Focus area updated to: ${newFocusArea || 'None'}`);
		} catch (error) {
			console.error('Failed to update focus area:', error);
			toastStore.error('Failed to update focus area');
		} finally {
			isSaving = false;
		}
	}

	// Handle unlink document
	async function handleUnlinkDocument(docId: string) {
		isUnlinking = docId;
		try {
			await documentStore.unlinkFromTask(docId, taskId);
			toastStore.success('Document removed from task');
		} catch (error) {
			console.error('Failed to unlink document:', error);
			toastStore.error('Failed to remove document');
		} finally {
			isUnlinking = null;
		}
	}

	// Handle add context - opens full AddContextModal
	function handleAddContext() {
		onClose();
		onAddContext();
	}

	// Get role badge color
	function getRoleBadgeClass(role: DocumentContextRole | undefined): string {
		switch (role) {
			case 'input': return 'bg-primary-500/20 text-primary-400';
			case 'reference': return 'bg-surface-600 text-surface-300';
			case 'output': return 'bg-emerald-500/20 text-emerald-400';
			default: return 'bg-surface-600 text-surface-300';
		}
	}

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !isSaving && !isUnlinking) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
		transition:fade={{ duration: 150 }}
		onclick={onClose}
		role="presentation"
	></div>

	<!-- Modal -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
	>
		<div
			class="bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto max-h-[85vh] flex flex-col"
			transition:fly={{ y: 20, duration: 200 }}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-6 py-4 border-b border-surface-700 flex-shrink-0">
				<h2 id="modal-title" class="text-lg font-semibold text-surface-100">
					Manage Context
				</h2>
				<button
					type="button"
					class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
					onclick={onClose}
					disabled={isSaving}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Content - Scrollable -->
			<div class="px-6 py-5 space-y-6 overflow-y-auto flex-1">
				<!-- Task Info -->
				{#if task}
					<div class="flex items-center gap-3 p-3 bg-surface-800/50 rounded-lg">
						<div
							class="w-3 h-3 rounded-full flex-shrink-0"
							style="background-color: {task.color};"
						></div>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium text-surface-200 truncate">{task.title}</p>
							<p class="text-xs text-surface-500">Task Context</p>
						</div>
					</div>
				{/if}

				<!-- Documents Section -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<label class="block text-sm font-medium text-surface-300">
							Reference Documents
						</label>
						<button
							type="button"
							class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium
								   text-primary-400 hover:text-primary-300 hover:bg-primary-500/10
								   rounded-lg transition-colors"
							onclick={handleAddContext}
						>
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
							</svg>
							Add
						</button>
					</div>

					{#if linkedDocuments.length > 0}
						<div class="space-y-2">
							{#each linkedDocuments as link (link.documentId)}
								{@const doc = documentStore.documents.get(link.documentId)}
								{#if doc}
									<div class="flex items-center gap-3 p-2.5 bg-surface-800/30 rounded-lg border border-surface-700/50 group">
										<!-- Document Icon -->
										<div class="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center flex-shrink-0">
											<svg class="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
											</svg>
										</div>

										<!-- Document Info -->
										<div class="min-w-0 flex-1">
											<p class="text-sm text-surface-200 truncate">{doc.filename}</p>
											<div class="flex items-center gap-2 mt-0.5">
												<span class="text-xs px-1.5 py-0.5 rounded {getRoleBadgeClass(link.contextRole)}">
													{link.contextRole}
												</span>
												{#if doc.charCount}
													<span class="text-xs text-surface-500">
														{Math.round(doc.charCount / 4).toLocaleString()} tokens
													</span>
												{/if}
											</div>
										</div>

										<!-- Remove Button -->
										<button
											type="button"
											class="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10
												   opacity-0 group-hover:opacity-100 transition-all"
											onclick={() => handleUnlinkDocument(link.documentId)}
											disabled={isUnlinking === link.documentId}
											title="Remove document"
										>
											{#if isUnlinking === link.documentId}
												<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
													<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
													<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
											{:else}
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
												</svg>
											{/if}
										</button>
									</div>
								{/if}
							{/each}
						</div>
					{:else}
						<div class="p-4 text-center border border-dashed border-surface-700 rounded-lg">
							<svg class="w-8 h-8 mx-auto text-surface-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							<p class="text-sm text-surface-500">No documents linked</p>
							<button
								type="button"
								class="mt-2 text-xs text-primary-400 hover:text-primary-300"
								onclick={handleAddContext}
							>
								Add reference documents
							</button>
						</div>
					{/if}
				</div>

				<!-- Divider -->
				<div class="border-t border-surface-700/50"></div>

				<!-- Focus Area Selection -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<label class="block text-sm font-medium text-surface-300">
							Focus Area
						</label>
						{#if selectedFocusAreaId !== currentFocusAreaId}
							<button
								type="button"
								class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium
									   text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20
									   rounded-lg transition-colors disabled:opacity-50"
								onclick={handleSaveFocusArea}
								disabled={isSaving}
							>
								{#if isSaving}
									<svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
								{:else}
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
								{/if}
								Save
							</button>
						{/if}
					</div>
					<p class="text-xs text-surface-500">
						Assign to a focus area to inherit its context and documents.
					</p>

					<div class="space-y-1.5 max-h-48 overflow-y-auto">
						<!-- No Focus Area Option -->
						<label
							class="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all
								   {selectedFocusAreaId === null
									? 'border-primary-500 bg-primary-500/10'
									: 'border-surface-700 hover:border-surface-600 hover:bg-surface-800/50'}"
						>
							<input
								type="radio"
								name="focusArea"
								checked={selectedFocusAreaId === null}
								onchange={() => selectedFocusAreaId = null}
								class="sr-only"
							/>
							<div class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
								   {selectedFocusAreaId === null ? 'border-primary-500' : 'border-surface-500'}">
								{#if selectedFocusAreaId === null}
									<div class="w-2 h-2 rounded-full bg-primary-500"></div>
								{/if}
							</div>
							<span class="text-sm text-surface-300">No focus area (general)</span>
						</label>

						<!-- Focus Areas -->
						{#each focusAreas as focusArea (focusArea.id)}
							<label
								class="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all
									   {selectedFocusAreaId === focusArea.id
										? 'border-primary-500 bg-primary-500/10'
										: 'border-surface-700 hover:border-surface-600 hover:bg-surface-800/50'}"
							>
								<input
									type="radio"
									name="focusArea"
									checked={selectedFocusAreaId === focusArea.id}
									onchange={() => selectedFocusAreaId = focusArea.id}
									class="sr-only"
								/>
								<div class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
									   {selectedFocusAreaId === focusArea.id ? 'border-primary-500' : 'border-surface-500'}">
									{#if selectedFocusAreaId === focusArea.id}
										<div class="w-2 h-2 rounded-full bg-primary-500"></div>
									{/if}
								</div>
								<div class="flex items-center gap-2 min-w-0 flex-1">
									{#if focusArea.color}
										<div
											class="w-2.5 h-2.5 rounded-full flex-shrink-0"
											style="background-color: {focusArea.color};"
										></div>
									{/if}
									<span class="text-sm text-surface-200 truncate">{focusArea.name}</span>
								</div>
								{#if focusArea.context}
									<span class="text-xs text-surface-500 flex-shrink-0">Has context</span>
								{/if}
							</label>
						{/each}

						{#if focusAreas.length === 0}
							<div class="p-3 text-center text-surface-500 text-sm">
								<p>No focus areas in this space yet.</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Context Chain Preview -->
				{#if selectedFocusAreaId}
					{@const selectedFA = focusAreas.find(f => f.id === selectedFocusAreaId)}
					{#if selectedFA?.context}
						<div class="p-3 bg-surface-800/30 rounded-lg border border-surface-700/50">
							<p class="text-xs font-medium text-surface-400 mb-1.5">Focus Area Context</p>
							<p class="text-sm text-surface-300 line-clamp-3">{selectedFA.context}</p>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-end px-6 py-4 border-t border-surface-700 flex-shrink-0">
				<button
					type="button"
					class="px-4 py-2 text-sm font-medium text-surface-300 hover:text-surface-100
						   bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors"
					onclick={onClose}
					disabled={isSaving}
				>
					Done
				</button>
			</div>
		</div>
	</div>
{/if}
