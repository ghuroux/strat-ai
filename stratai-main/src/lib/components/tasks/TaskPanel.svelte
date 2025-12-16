<script lang="ts">
	import { fly, fade, slide } from 'svelte/transition';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import type { Task, TaskPriority, DueDateType, SubtaskType } from '$lib/types/tasks';
	import type { SpaceType } from '$lib/types/chat';

	interface Props {
		space: SpaceType;
		onClose: () => void;
		onFocusTask: (taskId: string) => void;
	}

	let { space, onClose, onFocusTask }: Props = $props();

	// Task state from store - only parent tasks for main list
	let parentTasks = $derived(taskStore.parentTasks);
	let focusedTaskId = $derived(taskStore.focusedTaskId);
	let isLoading = $derived(taskStore.isLoading);

	// UI state
	let editingTaskId: string | null = $state(null);
	let editForm = $state({
		title: '',
		priority: 'normal' as TaskPriority,
		dueDate: '',
		dueDateType: 'soft' as DueDateType
	});
	let showAddTask = $state(false);
	let newTaskForm = $state({
		title: '',
		priority: 'normal' as TaskPriority,
		dueDate: '',
		dueDateType: 'soft' as DueDateType
	});
	let completingTaskId: string | null = $state(null);
	let completionNotes = $state('');
	let deleteConfirmId: string | null = $state(null);

	// Subtask state
	let addingSubtaskTo: string | null = $state(null);
	let newSubtaskForm = $state({
		title: '',
		type: 'conversation' as SubtaskType
	});

	// Keyboard handler
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (editingTaskId) {
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
			} else if (deleteConfirmId) {
				deleteConfirmId = null;
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
			dueDateType: 'soft'
		};
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
			dueDateType: task.dueDateType || 'soft'
		};
	}

	async function saveEdit() {
		if (!editingTaskId || !editForm.title.trim()) return;

		await taskStore.updateTask(editingTaskId, {
			title: editForm.title.trim(),
			priority: editForm.priority,
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

		await taskStore.createTask({
			title: newTaskForm.title.trim(),
			space,
			priority: newTaskForm.priority,
			dueDate: newTaskForm.dueDate ? new Date(newTaskForm.dueDate) : undefined,
			dueDateType: newTaskForm.dueDate ? newTaskForm.dueDateType : undefined,
			source: { type: 'manual' }
		});
		showAddTask = false;
		resetNewTaskForm();
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
	async function confirmDelete() {
		if (!deleteConfirmId) return;
		await taskStore.deleteTask(deleteConfirmId);
		deleteConfirmId = null;
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
					{@const isDeleting = task.id === deleteConfirmId}
					{@const hasSubtasks = taskStore.hasSubtasks(task.id)}
					{@const isExpanded = taskStore.isTaskExpanded(task.id)}
					{@const subtasks = taskStore.getSubtasksForTask(task.id)}
					{@const subtaskCount = subtasks.length}
					{@const completedSubtaskCount = subtasks.filter(s => s.status === 'completed').length}

					<div
						class="task-item group relative rounded-xl border transition-all duration-200
							   {isFocused
								? 'ring-2 ring-offset-2 ring-offset-surface-900'
								: 'hover:border-surface-600'}"
						style="background: {isFocused ? `color-mix(in srgb, ${task.color} 10%, transparent)` : 'rgba(var(--surface-800-rgb), 0.5)'}; border-color: {isFocused ? task.color : 'rgb(var(--surface-700-rgb))'}; {isFocused ? `--tw-ring-color: ${task.color};` : ''}"
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
						{:else if isDeleting}
							<!-- Delete Confirmation -->
							<div class="p-4 space-y-3" transition:fade={{ duration: 150 }}>
								<div class="text-sm text-surface-300">
									Delete <span class="font-medium text-surface-100">"{task.title}"</span>?
								</div>
								<div class="flex gap-2">
									<button
										type="button"
										onclick={confirmDelete}
										class="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600"
									>
										Delete
									</button>
									<button
										type="button"
										onclick={() => deleteConfirmId = null}
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
										<!-- Title, Priority, and Subtask count -->
										<div class="flex items-start gap-2">
											<span class="text-sm text-surface-100 flex-1 leading-relaxed {isFocused ? 'font-medium' : ''}">{task.title}</span>
											{#if task.priority === 'high'}
												<span class="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400 rounded">
													HIGH
												</span>
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
										onclick={() => deleteConfirmId = task.id}
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
											<div
												class="flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors
													   {isSubtaskFocused ? 'bg-surface-700' : 'hover:bg-surface-700/50'}"
											>
												<!-- Subtask type icon -->
												{#if subtask.subtaskType === 'action'}
													<button
														type="button"
														onclick={() => taskStore.completeTask(subtask.id)}
														class="flex-shrink-0 w-4 h-4 rounded border border-surface-500
															   {subtask.status === 'completed' ? 'bg-green-500 border-green-500' : 'hover:border-surface-400'}"
													>
														{#if subtask.status === 'completed'}
															<svg class="w-full h-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
															</svg>
														{/if}
													</button>
												{:else}
													<svg class="w-4 h-4 text-surface-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
													</svg>
												{/if}

												<!-- Subtask title -->
												<span class="flex-1 text-xs text-surface-300 truncate {subtask.status === 'completed' ? 'line-through opacity-60' : ''}">
													{subtask.title}
												</span>

												<!-- Focus button for conversation subtasks -->
												{#if subtask.subtaskType === 'conversation' && subtask.status !== 'completed'}
													<button
														type="button"
														onclick={() => handleFocus(subtask.id)}
														class="p-1 rounded text-surface-500 hover:text-surface-300 hover:bg-surface-600 transition-colors opacity-0 group-hover:opacity-100"
														title="Focus on this subtask"
													>
														<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
														</svg>
													</button>
												{/if}
											</div>
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
