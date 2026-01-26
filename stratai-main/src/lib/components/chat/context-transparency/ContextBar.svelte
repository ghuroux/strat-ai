<!--
	ContextBar.svelte

	Container for context transparency chips and expandable panels.
	Shows what context the AI has access to with ability to adjust.

	Features:
	- Chips for Documents, Notes, Tasks
	- Expandable panels (only one at a time)
	- Click-outside to close
	- Direct document activation/deactivation
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import ContextChip from './ContextChip.svelte';
	import DocumentsPanel from './panels/DocumentsPanel.svelte';
	import NotesPanel from './panels/NotesPanel.svelte';
	import TasksPanel from './panels/TasksPanel.svelte';
	import { areaStore } from '$lib/stores/areas.svelte';
	import { documentStore } from '$lib/stores/documents.svelte';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import type { Task } from '$lib/types/tasks';

	interface ContextSource {
		type: 'area' | 'task' | 'subtask';
		id: string;
		spaceId: string;
		spaceSlug?: string;  // For navigation
		areaId?: string;      // For task context
		areaSlug?: string;    // For navigation
	}

	interface Props {
		contextSource: ContextSource;
		onActivateDocument: (docId: string) => Promise<void>;
		onDeactivateDocument: (docId: string) => Promise<void>;
		onOpenContextPanel: () => void;
		onOpenTasksPanel?: () => void;
	}

	let {
		contextSource,
		onActivateDocument,
		onDeactivateDocument,
		onOpenContextPanel,
		onOpenTasksPanel
	}: Props = $props();

	// Panel state - only one can be open at a time
	let openPanel = $state<'documents' | 'notes' | 'tasks' | null>(null);

	// Refs for click-outside detection
	let containerRef: HTMLElement | undefined = $state();

	// Derive context data
	let activeContext = $derived.by(() => {
		// Get the area ID (either direct or via task)
		const areaId = contextSource.type === 'area' ? contextSource.id : contextSource.areaId;
		if (!areaId) {
			return {
				documents: { active: [], available: [] },
				notes: { hasNotes: false, preview: undefined },
				relatedTasks: []
			};
		}

		const area = areaStore.getAreaById(areaId);
		const allDocs = documentStore.getDocuments(contextSource.spaceId);
		const activeIds = new Set(area?.contextDocumentIds ?? []);

		// Get tasks for this area
		const tasks = taskStore.getTasksForAreaId(areaId)
			.filter((t: Task) => t.status === 'active' || t.status === 'planning')
			.slice(0, 5)
			.map((t: Task) => ({
				id: t.id,
				title: t.title,
				status: t.status,
				color: t.color
			}));

		return {
			documents: {
				active: allDocs
					.filter(d => activeIds.has(d.id))
					.map(d => ({ id: d.id, filename: d.filename, charCount: d.charCount, title: d.title })),
				available: allDocs
					.filter(d => !activeIds.has(d.id))
					.map(d => ({ id: d.id, filename: d.filename, charCount: d.charCount, title: d.title }))
			},
			notes: {
				hasNotes: !!area?.context,
				preview: area?.context?.slice(0, 200)
			},
			relatedTasks: tasks
		};
	});

	// Counts for chips
	let activeDocCount = $derived(activeContext.documents.active.length);
	let availableDocCount = $derived(activeContext.documents.available.length);
	let totalDocCount = $derived(activeDocCount + availableDocCount);
	let taskCount = $derived(activeContext.relatedTasks.length);

	// Toggle panel
	function togglePanel(panel: 'documents' | 'notes' | 'tasks') {
		openPanel = openPanel === panel ? null : panel;
	}

	// Close panel
	function closePanel() {
		openPanel = null;
	}

	// Click outside handler
	function handleClickOutside(e: MouseEvent) {
		if (openPanel && containerRef && !containerRef.contains(e.target as Node)) {
			closePanel();
		}
	}

	// Escape key handler
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && openPanel) {
			closePanel();
		}
	}

	// Document handlers
	async function handleActivate(docId: string) {
		await onActivateDocument(docId);
	}

	async function handleDeactivate(docId: string) {
		await onDeactivateDocument(docId);
	}

	// Task click handler
	function handleTaskClick(taskId: string) {
		closePanel();
		// Navigate to task page
		if (contextSource.spaceSlug && taskId) {
			goto(`/spaces/${contextSource.spaceSlug}/task/${taskId}`);
		}
	}

	// Open full panels
	function handleManageDocuments() {
		closePanel();
		onOpenContextPanel();
	}

	function handleEditNotes() {
		closePanel();
		onOpenContextPanel();
	}

	function handleViewAllTasks() {
		closePanel();
		onOpenTasksPanel?.();
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div
	class="context-bar relative flex items-center gap-2 flex-wrap"
	bind:this={containerRef}
>
	<!-- Documents Chip -->
	<div class="relative">
		<ContextChip
			icon="file-text"
			label={activeDocCount > 0 ? `${activeDocCount} doc${activeDocCount !== 1 ? 's' : ''}` : 'Docs'}
			count={availableDocCount > 0 ? availableDocCount : undefined}
			active={activeDocCount > 0}
			expanded={openPanel === 'documents'}
			onclick={() => togglePanel('documents')}
		/>
		{#if openPanel === 'documents'}
			<DocumentsPanel
				activeDocuments={activeContext.documents.active}
				availableDocuments={activeContext.documents.available}
				onActivate={handleActivate}
				onDeactivate={handleDeactivate}
				onManage={handleManageDocuments}
			/>
		{/if}
	</div>

	<!-- Notes Chip -->
	<div class="relative">
		<ContextChip
			icon="sticky-note"
			label="Notes"
			active={activeContext.notes.hasNotes}
			expanded={openPanel === 'notes'}
			onclick={() => togglePanel('notes')}
		/>
		{#if openPanel === 'notes'}
			<NotesPanel
				hasNotes={activeContext.notes.hasNotes}
				preview={activeContext.notes.preview}
				onEdit={handleEditNotes}
			/>
		{/if}
	</div>

	<!-- Tasks Chip (only show if we have tasks) -->
	{#if taskCount > 0}
		<div class="relative">
			<ContextChip
				icon="list-todo"
				label="Tasks"
				count={taskCount}
				active={true}
				expanded={openPanel === 'tasks'}
				onclick={() => togglePanel('tasks')}
			/>
			{#if openPanel === 'tasks'}
				<TasksPanel
					tasks={activeContext.relatedTasks}
					onTaskClick={handleTaskClick}
					onViewAll={handleViewAllTasks}
				/>
			{/if}
		</div>
	{/if}
</div>
