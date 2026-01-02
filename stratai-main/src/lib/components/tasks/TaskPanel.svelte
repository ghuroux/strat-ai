<script lang="ts">
	import { fly, fade, slide } from 'svelte/transition';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { areaStore as focusAreaStore } from '$lib/stores/areas.svelte';
	import { documentStore } from '$lib/stores/documents.svelte';
	import DeleteTaskModal from './DeleteTaskModal.svelte';
	import type { Task, TaskPriority, DueDateType, SubtaskType } from '$lib/types/tasks';
	import type { DocumentContextRole } from '$lib/types/documents';

	interface Props {
		spaceId: string;
		areaId?: string | null; // Current focus area selection
		onClose: () => void;
		onFocusTask: (taskId: string) => void;
		onAddContext?: (taskId: string) => void;
	}

	let { spaceId, areaId, onClose, onFocusTask, onAddContext }: Props = $props();

	// Task state from store - only parent tasks for main list
	// Sort: Planning tasks first, then high priority, then by date
	let parentTasks = $derived(
		taskStore.parentTasks.slice().sort((a, b) => {
			// Planning tasks always first
			if (a.status === 'planning' && b.status !== 'planning') return -1;
			if (a.status !== 'planning' && b.status === 'planning') return 1;
			// Then high priority
			if (a.priority === 'high' && b.priority !== 'high') return -1;
			if (a.priority !== 'high' && b.priority === 'high') return 1;
			// Then by created date
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		})
	);
	let focusedTaskId = $derived(taskStore.focusedTaskId);
	let isLoading = $derived(taskStore.isLoading);
	let planningTask = $derived(taskStore.planningTask);

	// Focus areas for the current space
	let focusAreas = $derived(focusAreaStore.getFocusAreasForSpace(spaceId));

	// UI state
	let editingTaskId: string | null = $state(null);
	let editForm = $state({
		title: '',
		priority: 'normal' as TaskPriority,
		dueDate: '',
		dueDateType: 'soft' as DueDateType,
		areaId: '' as string // empty string = no focus area
	});
	let showAddTask = $state(false);
	let showContextSection = $state(false);
	let newTaskForm = $state({
		title: '',
		priority: 'normal' as TaskPriority,
		dueDate: '',
		dueDateType: 'soft' as DueDateType,
		areaId: '' as string, // empty = use current areaId or none
		selectedDocumentIds: new Set<string>(),
		selectedRelatedTaskIds: new Set<string>()
	});

	// Document/task selection state for the context picker
	let documentSearchQuery = $state('');
	let relatedTaskSearchQuery = $state('');
	let selectedDocumentRole = $state<DocumentContextRole>('reference');

	// Available documents filtered for context picker
	let availableDocuments = $derived.by(() => {
		const _ = documentStore._version;
		const docs = documentStore.getDocuments(spaceId);
		if (!documentSearchQuery) return docs;
		const query = documentSearchQuery.toLowerCase();
		return docs.filter(
			d => d.filename.toLowerCase().includes(query) ||
				 d.title?.toLowerCase().includes(query)
		);
	});

	// Available tasks for linking (exclude current tasks that are already parents)
	let availableRelatedTasks = $derived.by(() => {
		const _ = taskStore._version;
		const tasks = taskStore.parentTasks;
		if (!relatedTaskSearchQuery) return tasks;
		const query = relatedTaskSearchQuery.toLowerCase();
		return tasks.filter(t => t.title.toLowerCase().includes(query));
	});
	let completingTaskId: string | null = $state(null);
	let completionNotes = $state('');

	// Delete modal state
	let deleteModalTask: Task | null = $state(null);
	let deleteModalInfo = $state({ subtaskCount: 0, conversationCount: 0 });

	// Subtask state
	let addingSubtaskTo: string | null = $state(null);
	let newSubtaskForm = $state({
		title: '',
		type: 'conversation' as SubtaskType
	});

	// Keyboard handler
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (deleteModalTask) {
				deleteModalTask = null;
			} else if (editingTaskId) {
				editingTaskId = null;
			} else if (showAddTask) {
				showAddTask = false;
				resetNewTaskForm();
			} else if (addingSubtaskTo) {
				addingSubtaskTo = null;
				resetSubtaskForm();
			} else if (completingTaskId) {
				completingTaskId = null;
				completionNotes = '';
			} else {
				onClose();
			}
		}
	}

	function resetNewTaskForm() {
		newTaskForm = {
			title: '',
			priority: 'normal',
			dueDate: '',
			dueDateType: 'soft',
			areaId: '',
			selectedDocumentIds: new Set<string>(),
			selectedRelatedTaskIds: new Set<string>()
		};
		showContextSection = false;
		documentSearchQuery = '';
		relatedTaskSearchQuery = '';
		selectedDocumentRole = 'reference';
	}

	function resetSubtaskForm() {
		newSubtaskForm = {
			title: '',
			type: 'conversation'
		};
	}

	// Subtask functions
	function startAddingSubtask(parentId: string) {
		addingSubtaskTo = parentId;
		resetSubtaskForm();
		// Auto-expand parent to show the form
		taskStore.expandTask(parentId);
	}

	async function addSubtask() {
		if (!addingSubtaskTo || !newSubtaskForm.title.trim()) return;

		await taskStore.createSubtask({
			title: newSubtaskForm.title.trim(),
			parentTaskId: addingSubtaskTo,
			subtaskType: newSubtaskForm.type
		});
		addingSubtaskTo = null;
		resetSubtaskForm();
	}

	function toggleExpand(taskId: string) {
		taskStore.toggleTaskExpanded(taskId);
	}

	// Edit functions
	function startEditing(task: Task) {
		editingTaskId = task.id;
		editForm = {
			title: task.title,
			priority: task.priority,
			dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : '',
			dueDateType: task.dueDateType || 'soft',
			areaId: task.areaId || ''
		};
	}

	async function saveEdit() {
		if (!editingTaskId || !editForm.title.trim()) return;

		await taskStore.updateTask(editingTaskId, {
			title: editForm.title.trim(),
			priority: editForm.priority,
			areaId: editForm.areaId || null, // empty string becomes null
			dueDate: editForm.dueDate ? new Date(editForm.dueDate) : null,
			dueDateType: editForm.dueDate ? editForm.dueDateType : null
		});
		editingTaskId = null;
	}

	function cancelEdit() {
		editingTaskId = null;
	}

	// Add task functions
	async function addTask() {
		if (!newTaskForm.title.trim()) return;

		// Determine focus area: use form selection, or fall back to current areaId
		const selectedFocusArea = newTaskForm.areaId || areaId || undefined;

		const newTask = await taskStore.createTask({
			title: newTaskForm.title.trim(),
			spaceId,
			areaId: selectedFocusArea,
			priority: newTaskForm.priority,
			dueDate: newTaskForm.dueDate ? new Date(newTaskForm.dueDate) : undefined,
			dueDateType: newTaskForm.dueDate ? newTaskForm.dueDateType : undefined,
			source: { type: 'manual' }
		});

		// If task was created successfully and we have context to link
		if (newTask) {
			// Link selected documents
			const docIds = Array.from(newTaskForm.selectedDocumentIds);
			for (const docId of docIds) {
				await documentStore.linkToTask(docId, newTask.id, selectedDocumentRole);
			}

			// Link selected related tasks
			const relatedIds = Array.from(newTaskForm.selectedRelatedTaskIds);
			for (const targetId of relatedIds) {
				await taskStore.linkRelatedTask(newTask.id, targetId, 'related');
			}
		}

		showAddTask = false;
		resetNewTaskForm();
	}

	// Helper to get area by ID (returns full area for color access)
	function getArea(areaId: string) {
		return focusAreaStore.getAreaById(areaId);
	}

	// Complete task functions
	function startCompleting(task: Task) {
		completingTaskId = task.id;
		completionNotes = '';
	}

	async function completeTask() {
		if (!completingTaskId) return;
		await taskStore.completeTask(completingTaskId, completionNotes || undefined);
		completingTaskId = null;
		completionNotes = '';
	}

	// Delete functions
	function openDeleteModal(task: Task) {
		const info = taskStore.getTaskDeletionInfo(task.id);
		deleteModalTask = task;
		deleteModalInfo = info;
	}

	async function handleDeleteConfirm(deleteConversations: boolean) {
		if (!deleteModalTask) return;
		await taskStore.deleteTask(deleteModalTask.id, { deleteConversations });
		deleteModalTask = null;
	}

	function handleDeleteCancel() {
		deleteModalTask = null;
	}

	// Focus function
	function handleFocus(taskId: string) {
		onFocusTask(taskId);
		onClose();
	}

	// Date formatting
	function formatDueDate(date: Date, type?: DueDateType): string {
		const now = new Date();
		const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

		let dateStr: string;
		if (diff === 0) dateStr = 'Today';
		else if (diff === 1) dateStr = 'Tomorrow';
		else if (diff < 7) dateStr = date.toLocaleDateString('en-US', { weekday: 'long' });
		else dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

		return type === 'hard' ? `${dateStr} (deadline)` : dateStr;
	}

	function isDueSoon(date: Date): boolean {
		const now = new Date();
		const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		return diff <= 2;
	}

	function isOverdue(date: Date): boolean {
		return date < new Date();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<aside
	class="task-panel w-[40vw] min-w-80 max-w-lg h-full flex flex-col bg-surface-900/95 backdrop-blur-sm border-l border-surface-700 shadow-2xl"
	transition:fly={{ x: 600, duration: 300, opacity: 1 }}
>
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-surface-700">
		<div class="flex items-center gap-3">
			<div
				class="w-9 h-9 rounded-xl flex items-center justify-center"
				style="background: var(--space-accent-muted, rgba(59, 130, 246, 0.15));"
			>
				<svg
					class="w-5 h-5"
					style="color: var(--space-accent, #3b82f6);"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
				</svg>
			</div>
			<div>
				<span class="font-semibold text-surface-100">All Tasks</span>
				<p class="text-xs text-surface-500">{parentTasks.length} {parentTasks.length === 1 ? 'task' : 'tasks'}</p>
			</div>
		</div>

		<button
			type="button"
			onclick={onClose}
			class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
			title="Close (Esc)"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Content Area -->
	<div class="flex-1 overflow-y-auto p-4">
		{#if isLoading}
			<div class="flex items-center justify-center h-32">
				<div class="animate-spin w-6 h-6 border-2 border-surface-600 border-t-primary-400 rounded-full"></div>
			</div>
		{:else if parentTasks.length === 0 && !showAddTask}
			<!-- Empty State -->
			<div class="flex flex-col items-center justify-center h-full text-center px-4">
				<div class="w-14 h-14 rounded-full bg-surface-800 flex items-center justify-center mb-4">
					<svg class="w-7 h-7 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
					</svg>
				</div>
				<p class="text-surface-400 mb-1">No tasks yet</p>
				<p class="text-sm text-surface-500 mb-4">Add a task to get started</p>
				<button
					type="button"
					onclick={() => showAddTask = true}
					class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
					style="background: var(--space-accent); color: white;"
				>
					Add Task
				</button>
			</div>
		{:else}
			<div class="space-y-3">
				{#each parentTasks as task (task.id)}
					{@const isFocused = task.id === focusedTaskId}
					{@const isEditing = task.id === editingTaskId}
					{@const isCompleting = task.id === completingTaskId}
					{@const hasSubtasks = taskStore.hasSubtasks(task.id)}
					{@const isExpanded = taskStore.isTaskExpanded(task.id)}
					{@const subtasks = taskStore.getSubtasksForTask(task.id)}
					{@const subtaskCount = subtasks.length}
					{@const completedSubtaskCount = subtasks.filter(s => s.status === 'completed').length}
					{@const isPlanning = task.status === 'planning'}
					{@const proposedCount = task.planningData?.proposedSubtasks?.length ?? 0}

					<div
						class="task-item group relative rounded-xl border transition-all duration-200
							   {isFocused
								? 'ring-2 ring-offset-2 ring-offset-surface-900'
								: 'hover:border-surface-600'}
							   {isPlanning ? 'planning-task' : ''}"
						style="background: {isPlanning ? 'rgba(168, 85, 247, 0.1)' : isFocused ? `color-mix(in srgb, ${task.color} 10%, transparent)` : 'rgba(var(--surface-800-rgb), 0.5)'}; border-color: {isPlanning ? 'rgb(168, 85, 247)' : isFocused ? task.color : 'rgb(var(--surface-700-rgb))'}; {isFocused ? `--tw-ring-color: ${task.color};` : ''}"
					>
						{#if isEditing}
							<!-- Edit Mode -->
							<div class="p-4 space-y-3" transition:fade={{ duration: 150 }}>
								<input
									type="text"
									bind:value={editForm.title}
									class="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
										   text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
									placeholder="Task title"
									autofocus
								/>
								<div class="grid grid-cols-2 gap-3">
									<div>
										<label class="block text-xs text-surface-500 mb-1">Priority</label>
										<select
											bind:value={editForm.priority}
											class="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
												   text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
										>
											<option value="normal">Normal</option>
											<option value="high">High</option>
										</select>
									</div>
									<div>
										<label class="block text-xs text-surface-500 mb-1">Due Date</label>
										<input
											type="date"
											bind:value={editForm.dueDate}
											class="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
												   text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
										/>
									</div>
								</div>
								{#if focusAreas.length > 0}
									<div>
										<label class="block text-xs text-surface-500 mb-1">Area</label>
										<select
											bind:value={editForm.areaId}
											class="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
												   text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
										>
											<option value="">No area</option>
											{#each focusAreas as fa}
												<option value={fa.id}>{fa.name}</option>
											{/each}
										</select>
									</div>
								{/if}
								{#if editForm.dueDate}
									<div>
										<label class="block text-xs text-surface-500 mb-1">Deadline Type</label>
										<div class="flex gap-2">
											<button
												type="button"
												onclick={() => editForm.dueDateType = 'soft'}
												class="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
													   {editForm.dueDateType === 'soft' ? 'bg-primary-500 text-white' : 'bg-surface-700 text-surface-300'}"
											>
												Target
											</button>
											<button
												type="button"
												onclick={() => editForm.dueDateType = 'hard'}
												class="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
													   {editForm.dueDateType === 'hard' ? 'bg-red-500 text-white' : 'bg-surface-700 text-surface-300'}"
											>
												Hard Deadline
											</button>
										</div>
									</div>
								{/if}
								<div class="flex gap-2 pt-1">
									<button
										type="button"
										onclick={saveEdit}
										class="px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600"
									>
										Save
									</button>
									<button
										type="button"
										onclick={cancelEdit}
										class="px-4 py-2 text-sm font-medium bg-surface-700 text-surface-300 rounded-lg hover:bg-surface-600"
									>
										Cancel
									</button>
								</div>
							</div>
						{:else if isCompleting}
							<!-- Complete Mode -->
							<div class="p-4 space-y-3" transition:fade={{ duration: 150 }}>
								<div class="flex items-center gap-2 text-sm text-surface-300">
									<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
									Completing: <span class="font-medium text-surface-100">{task.title}</span>
								</div>
								<textarea
									bind:value={completionNotes}
									placeholder="Add completion notes (optional)..."
									rows="2"
									class="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
										   text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
								></textarea>
								<div class="flex gap-2">
									<button
										type="button"
										onclick={completeTask}
										class="px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-lg hover:bg-green-600"
									>
										Complete
									</button>
									<button
										type="button"
										onclick={() => { completingTaskId = null; completionNotes = ''; }}
										class="px-4 py-2 text-sm font-medium bg-surface-700 text-surface-300 rounded-lg hover:bg-surface-600"
									>
										Cancel
									</button>
								</div>
							</div>
						{:else}
							<!-- Display Mode -->
							<div class="p-3">
								<div class="flex items-start gap-2">
									<!-- Expand/Collapse button (for tasks with subtasks) -->
									{#if hasSubtasks}
										<button
											type="button"
											onclick={() => toggleExpand(task.id)}
											class="flex-shrink-0 p-0.5 mt-0.5 rounded text-surface-400 hover:text-surface-200 transition-colors"
										>
											<svg
												class="w-4 h-4 transition-transform duration-200 {isExpanded ? 'rotate-90' : ''}"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
											</svg>
										</button>
									{:else}
										<div class="w-5"></div>
									{/if}

									<!-- Color indicator -->
									<div
										class="flex-shrink-0 w-1 h-full rounded-full self-stretch min-h-[2.5rem]"
										style="background: {task.color};"
									></div>

									<div class="flex-1 min-w-0">
										<!-- Title, Priority, Area, and Subtask count -->
										<div class="flex items-start gap-2">
											<span class="text-sm text-surface-100 flex-1 leading-relaxed {isFocused ? 'font-medium' : ''}">{task.title}</span>
											{#if isPlanning}
												<span class="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-400 rounded flex items-center gap-1">
													<svg class="w-3 h-3 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
														<circle cx="12" cy="12" r="3" />
													</svg>
													PLANNING
													{#if proposedCount > 0}
														<span class="text-purple-300">({proposedCount})</span>
													{/if}
												</span>
											{:else if task.priority === 'high'}
												<span class="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400 rounded">
													HIGH
												</span>
											{/if}
											{#if task.areaId}
												{@const taskArea = getArea(task.areaId)}
												{#if taskArea}
													<span
														class="area-badge flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded truncate max-w-[100px]"
														style="--area-color: {taskArea.color || '#3b82f6'}; background: color-mix(in srgb, var(--area-color) 20%, transparent); color: var(--area-color);"
														title={taskArea.name}
													>
														{taskArea.name}
													</span>
												{/if}
											{/if}
											{#if subtaskCount > 0}
												<span class="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-surface-700 text-surface-400 rounded">
													{completedSubtaskCount}/{subtaskCount}
												</span>
											{/if}
										</div>

										<!-- Due Date -->
										{#if task.dueDate}
											<div class="mt-1.5 flex items-center gap-1 text-xs
												{isOverdue(task.dueDate) ? 'text-red-400' : isDueSoon(task.dueDate) ? 'text-amber-400' : 'text-surface-500'}">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
												</svg>
												{formatDueDate(task.dueDate, task.dueDateType)}
											</div>
										{/if}

										<!-- Focus badge -->
										{#if isFocused}
											<div class="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
												style="background: {task.color}20; color: {task.color};">
												<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
													<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
												</svg>
												Currently Focused
											</div>
										{/if}
									</div>
								</div>

								<!-- Action buttons -->
								<div class="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
									{#if isPlanning}
										<!-- Planning-specific actions -->
										<button
											type="button"
											onclick={() => handleFocus(task.id)}
											class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
												   bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
										>
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											Resume Planning
										</button>
										<button
											type="button"
											onclick={() => taskStore.exitPlanMode()}
											class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
												   bg-surface-700 text-surface-300 hover:bg-surface-600 transition-colors"
											title="Cancel planning and return to active status"
										>
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
											Cancel
										</button>
									{:else}
										<!-- Normal task actions -->
										{#if !isFocused}
											<button
												type="button"
												onclick={() => handleFocus(task.id)}
												class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
													   bg-surface-700 text-surface-300 hover:bg-surface-600 transition-colors"
											>
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
												</svg>
												Focus
											</button>
										{/if}
										<button
											type="button"
											onclick={() => startCompleting(task)}
											class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
												   bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
										>
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
											Done
										</button>
										<button
											type="button"
											onclick={() => startAddingSubtask(task.id)}
											class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
												   bg-surface-700 text-surface-300 hover:bg-surface-600 transition-colors"
											title="Add subtask"
										>
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
											</svg>
											Subtask
										</button>
										{#if onAddContext}
											<button
												type="button"
												onclick={() => onAddContext?.(task.id)}
												class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
													   bg-surface-700 text-surface-300 hover:bg-surface-600 transition-colors"
												title="Add context (documents, related tasks)"
											>
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
												</svg>
												Context
											</button>
										{/if}
									{/if}
									<button
										type="button"
										onclick={() => startEditing(task)}
										class="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700 transition-colors"
										title="Edit"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
										</svg>
									</button>
									<button
										type="button"
										onclick={() => openDeleteModal(task)}
										class="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-surface-700 transition-colors"
										title="Delete"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								</div>
							</div>

							<!-- Subtasks List (when expanded) -->
							{#if isExpanded && (subtasks.length > 0 || addingSubtaskTo === task.id)}
								<div class="border-t border-surface-700/50 bg-surface-800/30" transition:slide={{ duration: 200 }}>
									<div class="pl-10 pr-3 py-2 space-y-1">
										{#each subtasks as subtask (subtask.id)}
											{@const isSubtaskFocused = subtask.id === focusedTaskId}
											{@const isCompleted = subtask.status === 'completed'}
											{@const isConversation = subtask.subtaskType === 'conversation'}
											<button
												type="button"
												onclick={() => { if (!isCompleted && isConversation) handleFocus(subtask.id); }}
												class="group/subtask w-full flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors text-left
													   {isSubtaskFocused ? 'bg-surface-700' : 'hover:bg-surface-700/50'}
													   {isCompleted ? 'opacity-60' : ''}"
											>
												<!-- Subtask type icon / checkbox -->
												{#if subtask.subtaskType === 'action'}
													<!-- svelte-ignore a11y_no_static_element_interactions -->
													<span
														role="checkbox"
														aria-checked={isCompleted}
														tabindex="0"
														onclick={(e) => { e.stopPropagation(); taskStore.completeTask(subtask.id); }}
														onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); taskStore.completeTask(subtask.id); } }}
														class="flex-shrink-0 w-4 h-4 rounded border border-surface-500 flex items-center justify-center cursor-pointer
															   {isCompleted ? 'bg-green-500 border-green-500' : 'hover:border-surface-400'}"
													>
														{#if isCompleted}
															<svg class="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
															</svg>
														{/if}
													</span>
												{:else}
													<svg class="w-4 h-4 text-surface-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
													</svg>
												{/if}

												<!-- Subtask title -->
												<span class="flex-1 text-xs text-surface-300 truncate {isCompleted ? 'line-through' : ''}">
													{subtask.title}
												</span>

												<!-- Focus arrow for conversation subtasks -->
												{#if isConversation && !isCompleted}
													<svg class="w-4 h-4 text-surface-500 group-hover/subtask:text-surface-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
													</svg>
												{/if}
											</button>
										{/each}

										<!-- Add Subtask Form -->
										{#if addingSubtaskTo === task.id}
											<div class="flex items-center gap-2 py-1.5 px-2 bg-surface-700/30 rounded-lg" transition:fade={{ duration: 150 }}>
												<input
													type="text"
													bind:value={newSubtaskForm.title}
													placeholder="New subtask..."
													class="flex-1 px-2 py-1 bg-surface-800 border border-surface-600 rounded
														   text-xs text-surface-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
													autofocus
													onkeydown={(e) => { if (e.key === 'Enter' && newSubtaskForm.title.trim()) addSubtask(); }}
												/>
												<button
													type="button"
													onclick={addSubtask}
													disabled={!newSubtaskForm.title.trim()}
													class="px-2 py-1 text-xs font-medium rounded transition-colors
														   {newSubtaskForm.title.trim() ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-surface-700 text-surface-500 cursor-not-allowed'}"
												>
													Add
												</button>
												<button
													type="button"
													onclick={() => { addingSubtaskTo = null; resetSubtaskForm(); }}
													class="p-1 rounded text-surface-500 hover:text-surface-300 hover:bg-surface-600"
												>
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											</div>
										{/if}
									</div>
								</div>
							{/if}
						{/if}
					</div>
				{/each}

				<!-- Add Task Form -->
				{#if showAddTask}
					<div class="p-4 rounded-xl border border-dashed border-primary-500/50 bg-primary-500/5" transition:fade={{ duration: 150 }}>
						<input
							type="text"
							bind:value={newTaskForm.title}
							class="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
								   text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
							placeholder="What needs to be done?"
							autofocus
						/>
						<div class="grid grid-cols-2 gap-3 mb-3">
							<div>
								<label class="block text-xs text-surface-500 mb-1">Priority</label>
								<select
									bind:value={newTaskForm.priority}
									class="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
										   text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
								>
									<option value="normal">Normal</option>
									<option value="high">High</option>
								</select>
							</div>
							<div>
								<label class="block text-xs text-surface-500 mb-1">Due Date</label>
								<input
									type="date"
									bind:value={newTaskForm.dueDate}
									class="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
										   text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
								/>
							</div>
						</div>
						{#if newTaskForm.dueDate}
							<div class="mb-3">
								<label class="block text-xs text-surface-500 mb-1">Deadline Type</label>
								<div class="flex gap-2">
									<button
										type="button"
										onclick={() => newTaskForm.dueDateType = 'soft'}
										class="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
											   {newTaskForm.dueDateType === 'soft' ? 'bg-primary-500 text-white' : 'bg-surface-700 text-surface-300'}"
									>
										Target
									</button>
									<button
										type="button"
										onclick={() => newTaskForm.dueDateType = 'hard'}
										class="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
											   {newTaskForm.dueDateType === 'hard' ? 'bg-red-500 text-white' : 'bg-surface-700 text-surface-300'}"
									>
										Hard Deadline
									</button>
								</div>
							</div>
						{/if}

						<!-- Area -->
						{#if focusAreas.length > 0}
							<div class="mb-3">
								<label class="block text-xs text-surface-500 mb-1">Area</label>
								<select
									bind:value={newTaskForm.areaId}
									class="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
										   text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
								>
									<option value="">
										{areaId ? getArea(areaId)?.name || 'Current area' : 'No area'}
									</option>
									{#each focusAreas as fa}
										<option value={fa.id}>{fa.name}</option>
									{/each}
								</select>
							</div>
						{/if}

						<!-- Add Context (expandable) -->
						<div class="mb-3">
							<button
								type="button"
								onclick={() => { showContextSection = !showContextSection; if (showContextSection) documentStore.loadDocuments(spaceId); }}
								class="flex items-center gap-2 text-xs text-surface-400 hover:text-surface-300 transition-colors"
							>
								<svg
									class="w-4 h-4 transition-transform {showContextSection ? 'rotate-90' : ''}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
								Add Context
								{#if newTaskForm.selectedDocumentIds.size > 0 || newTaskForm.selectedRelatedTaskIds.size > 0}
									<span class="px-1.5 py-0.5 bg-primary-500/20 text-primary-400 rounded text-[10px]">
										{newTaskForm.selectedDocumentIds.size + newTaskForm.selectedRelatedTaskIds.size}
									</span>
								{/if}
							</button>

							{#if showContextSection}
								<div class="mt-3 space-y-3 p-3 bg-surface-800/50 rounded-lg border border-surface-700" transition:slide={{ duration: 200 }}>
									<!-- Documents Section -->
									<div>
										<div class="flex items-center justify-between mb-2">
											<span class="text-xs font-medium text-surface-400">Documents</span>
											<select
												bind:value={selectedDocumentRole}
												class="px-2 py-1 bg-surface-700 border border-surface-600 rounded text-[10px] text-surface-300"
											>
												<option value="reference">Reference</option>
												<option value="input">Input</option>
												<option value="output">Output</option>
											</select>
										</div>

										<!-- Selected Documents -->
										{#if newTaskForm.selectedDocumentIds.size > 0}
											<div class="flex flex-wrap gap-1 mb-2">
												{#each Array.from(newTaskForm.selectedDocumentIds) as docId}
													{@const doc = documentStore.getDocumentById(docId)}
													{#if doc}
														<span class="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-500/20 text-primary-300 rounded text-[10px]">
															{doc.title || doc.filename}
															<button
																type="button"
																onclick={() => { newTaskForm.selectedDocumentIds.delete(docId); newTaskForm.selectedDocumentIds = new Set(newTaskForm.selectedDocumentIds); }}
																class="hover:text-white"
															>×</button>
														</span>
													{/if}
												{/each}
											</div>
										{/if}

										<!-- Document Search & List -->
										<input
											type="text"
											bind:value={documentSearchQuery}
											placeholder="Search documents..."
											class="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-xs text-surface-100 mb-2"
										/>
										<div class="max-h-24 overflow-y-auto space-y-1">
											{#if availableDocuments.length === 0}
												<p class="text-[10px] text-surface-500 italic">No documents available</p>
											{:else}
												{#each availableDocuments.slice(0, 5) as doc}
													{#if !newTaskForm.selectedDocumentIds.has(doc.id)}
														<button
															type="button"
															onclick={() => { newTaskForm.selectedDocumentIds.add(doc.id); newTaskForm.selectedDocumentIds = new Set(newTaskForm.selectedDocumentIds); }}
															class="w-full flex items-center gap-2 p-1.5 rounded hover:bg-surface-700 text-left"
														>
															<span class="text-xs">📄</span>
															<span class="text-xs text-surface-300 truncate flex-1">{doc.title || doc.filename}</span>
														</button>
													{/if}
												{/each}
											{/if}
										</div>
									</div>

									<!-- Related Tasks Section -->
									<div class="pt-2 border-t border-surface-700">
										<span class="block text-xs font-medium text-surface-400 mb-2">Related Tasks</span>

										<!-- Selected Tasks -->
										{#if newTaskForm.selectedRelatedTaskIds.size > 0}
											<div class="flex flex-wrap gap-1 mb-2">
												{#each Array.from(newTaskForm.selectedRelatedTaskIds) as taskId}
													{@const task = taskStore.tasks.get(taskId)}
													{#if task}
														<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px]" style="background: {task.color}20; color: {task.color};">
															{task.title}
															<button
																type="button"
																onclick={() => { newTaskForm.selectedRelatedTaskIds.delete(taskId); newTaskForm.selectedRelatedTaskIds = new Set(newTaskForm.selectedRelatedTaskIds); }}
																class="hover:opacity-80"
															>×</button>
														</span>
													{/if}
												{/each}
											</div>
										{/if}

										<!-- Task Search & List -->
										<input
											type="text"
											bind:value={relatedTaskSearchQuery}
											placeholder="Search tasks..."
											class="w-full px-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-xs text-surface-100 mb-2"
										/>
										<div class="max-h-24 overflow-y-auto space-y-1">
											{#if availableRelatedTasks.length === 0}
												<p class="text-[10px] text-surface-500 italic">No tasks available</p>
											{:else}
												{#each availableRelatedTasks.slice(0, 5) as task}
													{#if !newTaskForm.selectedRelatedTaskIds.has(task.id)}
														<button
															type="button"
															onclick={() => { newTaskForm.selectedRelatedTaskIds.add(task.id); newTaskForm.selectedRelatedTaskIds = new Set(newTaskForm.selectedRelatedTaskIds); }}
															class="w-full flex items-center gap-2 p-1.5 rounded hover:bg-surface-700 text-left"
														>
															<span class="w-2 h-2 rounded-full" style="background: {task.color};"></span>
															<span class="text-xs text-surface-300 truncate flex-1">{task.title}</span>
														</button>
													{/if}
												{/each}
											{/if}
										</div>
									</div>
								</div>
							{/if}
						</div>

						<div class="flex gap-2">
							<button
								type="button"
								onclick={addTask}
								disabled={!newTaskForm.title.trim()}
								class="px-4 py-2 text-sm font-medium rounded-lg transition-colors
									   {newTaskForm.title.trim() ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-surface-700 text-surface-500 cursor-not-allowed'}"
							>
								Add Task
							</button>
							<button
								type="button"
								onclick={() => { showAddTask = false; resetNewTaskForm(); }}
								class="px-4 py-2 text-sm font-medium bg-surface-700 text-surface-300 rounded-lg hover:bg-surface-600"
							>
								Cancel
							</button>
						</div>
					</div>
				{:else}
					<button
						type="button"
						onclick={() => showAddTask = true}
						class="w-full p-3 rounded-xl border border-dashed border-surface-700 text-surface-500
							   hover:border-surface-600 hover:text-surface-400 hover:bg-surface-800/30 transition-all
							   flex items-center justify-center gap-2 text-sm"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Add a task
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Footer hint -->
	<div class="px-4 py-2 border-t border-surface-800 text-center">
		<span class="text-xs text-surface-500">Press Esc to close</span>
	</div>
</aside>

<!-- Delete Task Modal -->
{#if deleteModalTask}
	<DeleteTaskModal
		task={deleteModalTask}
		subtaskCount={deleteModalInfo.subtaskCount}
		conversationCount={deleteModalInfo.conversationCount}
		onConfirm={handleDeleteConfirm}
		onCancel={handleDeleteCancel}
	/>
{/if}

<style>
	.task-panel {
		box-shadow:
			-4px 0 24px rgba(0, 0, 0, 0.3),
			inset 1px 0 0 rgba(255, 255, 255, 0.05);
	}

	.task-panel :global(::-webkit-scrollbar) {
		width: 6px;
	}

	.task-panel :global(::-webkit-scrollbar-track) {
		background: transparent;
	}

	.task-panel :global(::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.task-panel :global(::-webkit-scrollbar-thumb:hover) {
		background: rgba(255, 255, 255, 0.2);
	}

	.task-item:not(:has(input)):not(:has(textarea)):hover {
		transform: translateX(-2px);
	}
</style>
