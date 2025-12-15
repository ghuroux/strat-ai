<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { AssistState, ExtractedTask } from '$lib/types/assists';
	import { ASSIST_ICONS } from '$lib/config/assists';

	interface Props {
		assistState: AssistState;
		onClose: () => void;
		onConfirmTasks: () => void;
		onSelectTask: (taskId: string) => void;
		onUpdateTask?: (taskId: string, text: string) => void;
		onRemoveTask?: (taskId: string) => void;
		onAddTask?: (text: string) => void;
	}

	let {
		assistState,
		onClose,
		onConfirmTasks,
		onSelectTask,
		onUpdateTask,
		onRemoveTask,
		onAddTask
	}: Props = $props();

	// Get icon path for the current assist
	let iconPath = $derived(
		assistState.assist?.icon ? ASSIST_ICONS[assistState.assist.icon] || ASSIST_ICONS.tasks : ASSIST_ICONS.tasks
	);

	// Edit mode state
	let editingTaskId: string | null = $state(null);
	let editingText = $state('');
	let newTaskText = $state('');
	let showAddTask = $state(false);

	// Handle keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (editingTaskId) {
				editingTaskId = null;
			} else if (showAddTask) {
				showAddTask = false;
				newTaskText = '';
			} else {
				onClose();
			}
		}
	}

	function startEditing(task: ExtractedTask) {
		editingTaskId = task.id;
		editingText = task.text;
	}

	function saveEdit() {
		if (editingTaskId && editingText.trim() && onUpdateTask) {
			onUpdateTask(editingTaskId, editingText.trim());
		}
		editingTaskId = null;
		editingText = '';
	}

	function cancelEdit() {
		editingTaskId = null;
		editingText = '';
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveEdit();
		} else if (e.key === 'Escape') {
			cancelEdit();
		}
	}

	function addNewTask() {
		if (newTaskText.trim() && onAddTask) {
			onAddTask(newTaskText.trim());
			newTaskText = '';
			showAddTask = false;
		}
	}

	function handleAddKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addNewTask();
		} else if (e.key === 'Escape') {
			showAddTask = false;
			newTaskText = '';
		}
	}

	// Phase-specific messaging
	let phaseTitle = $derived.by(() => {
		switch (assistState.phase) {
			case 'confirming':
				return 'Review Your Tasks';
			case 'prioritizing':
				return 'Your Tasks';
			case 'focused':
				return 'Working On';
			default:
				return assistState.assist?.outputLabel || 'Your Tasks';
		}
	});

	let phaseSubtitle = $derived.by(() => {
		switch (assistState.phase) {
			case 'confirming':
				return 'Check that I captured everything correctly';
			case 'prioritizing':
				return 'Click a task to start working on it';
			case 'focused':
				return 'Click another task to switch';
			default:
				return '';
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<aside
	class="working-panel w-[40vw] min-w-80 h-full flex flex-col bg-surface-900/95 backdrop-blur-sm border-l border-surface-700 shadow-2xl"
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
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPath} />
				</svg>
			</div>
			<div>
				<span class="font-semibold text-surface-100">{phaseTitle}</span>
				{#if phaseSubtitle}
					<p class="text-xs text-surface-500">{phaseSubtitle}</p>
				{/if}
			</div>
		</div>

		<button
			type="button"
			onclick={onClose}
			class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
			title="Close (Esc)"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</div>

	<!-- Task Count Badge -->
	{#if assistState.tasks.length > 0}
		<div class="px-4 py-3 border-b border-surface-800">
			<div class="flex items-center gap-2 text-xs text-surface-500">
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
					/>
				</svg>
				<span>{assistState.tasks.length} {assistState.tasks.length === 1 ? 'task' : 'tasks'}</span>
			</div>
		</div>
	{/if}

	<!-- Content Area -->
	<div class="flex-1 overflow-y-auto p-4">
		{#if assistState.error}
			<!-- Error State -->
			<div class="flex flex-col items-center justify-center h-full text-center">
				<div class="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
					<svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<p class="text-red-400 font-medium mb-1">Something went wrong</p>
				<p class="text-sm text-surface-500">{assistState.error}</p>
				<button
					type="button"
					onclick={onClose}
					class="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-surface-700 text-surface-200 hover:bg-surface-600 transition-colors"
				>
					Close
				</button>
			</div>
		{:else if assistState.tasks.length === 0}
			<!-- Empty State - Waiting for tasks -->
			<div class="flex flex-col items-center justify-center h-full text-center px-4">
				<div class="w-12 h-12 rounded-full bg-surface-800 flex items-center justify-center mb-3">
					<svg class="w-6 h-6 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<p class="text-sm text-surface-500">Tasks will appear here once extracted...</p>
			</div>
		{:else}
			<!-- Task List -->
			<div class="space-y-2">
				{#each assistState.tasks as task, index (task.id)}
					<div
						class="task-item group relative rounded-xl border transition-all duration-200
							   {assistState.selectedTaskId === task.id
							? 'bg-surface-700/50 border-primary-500/50 ring-1 ring-primary-500/30'
							: 'bg-surface-800/50 border-surface-700 hover:border-surface-600 hover:bg-surface-800'}"
					>
						{#if editingTaskId === task.id}
							<!-- Edit Mode -->
							<div class="p-3">
								<input
									type="text"
									bind:value={editingText}
									onkeydown={handleEditKeydown}
									class="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
										   text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
									autofocus
								/>
								<div class="flex gap-2 mt-2">
									<button
										type="button"
										onclick={saveEdit}
										class="px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600"
									>
										Save
									</button>
									<button
										type="button"
										onclick={cancelEdit}
										class="px-3 py-1.5 text-xs font-medium bg-surface-700 text-surface-300 rounded-lg hover:bg-surface-600"
									>
										Cancel
									</button>
								</div>
							</div>
						{:else}
							<!-- Display Mode -->
							<button
								type="button"
								class="w-full text-left p-3 flex items-start gap-3"
								onclick={() => {
									if (assistState.phase === 'prioritizing' || assistState.phase === 'focused') {
										onSelectTask(task.id);
									}
								}}
								disabled={assistState.phase === 'confirming'}
							>
								<!-- Task Number / Status Icon -->
								<div
									class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
										   {assistState.selectedTaskId === task.id
										? 'bg-primary-500 text-white'
										: task.status === 'in_progress'
											? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
											: 'bg-surface-700 text-surface-400'}"
								>
									{#if assistState.selectedTaskId === task.id}
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									{:else}
										{index + 1}
									{/if}
								</div>

								<!-- Task Text -->
								<span
									class="flex-1 text-sm leading-relaxed
										   {assistState.selectedTaskId === task.id ? 'text-surface-100 font-medium' : 'text-surface-300'}"
								>
									{task.text}
								</span>
							</button>

							<!-- Edit/Remove buttons (only in confirming phase) -->
							{#if assistState.phase === 'confirming'}
								<div class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<button
										type="button"
										onclick={() => startEditing(task)}
										class="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700"
										title="Edit"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
										</svg>
									</button>
									{#if onRemoveTask}
										<button
											type="button"
											onclick={() => onRemoveTask(task.id)}
											class="p-1.5 rounded-lg text-surface-500 hover:text-red-400 hover:bg-surface-700"
											title="Remove"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									{/if}
								</div>
							{/if}
						{/if}
					</div>
				{/each}

				<!-- Add Task (only in confirming phase) -->
				{#if assistState.phase === 'confirming'}
					{#if showAddTask}
						<div class="p-3 rounded-xl border border-dashed border-surface-600 bg-surface-800/30">
							<input
								type="text"
								bind:value={newTaskText}
								onkeydown={handleAddKeydown}
								placeholder="Add a task..."
								class="w-full px-3 py-2 bg-surface-900 border border-surface-600 rounded-lg
									   text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
								autofocus
							/>
							<div class="flex gap-2 mt-2">
								<button
									type="button"
									onclick={addNewTask}
									class="px-3 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600"
								>
									Add
								</button>
								<button
									type="button"
									onclick={() => { showAddTask = false; newTaskText = ''; }}
									class="px-3 py-1.5 text-xs font-medium bg-surface-700 text-surface-300 rounded-lg hover:bg-surface-600"
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
							Add another task
						</button>
					{/if}
				{/if}
			</div>
		{/if}
	</div>

	<!-- Action Buttons -->
	{#if assistState.tasks.length > 0 && assistState.phase === 'confirming'}
		<div class="p-4 border-t border-surface-700">
			<button
				type="button"
				onclick={onConfirmTasks}
				class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
					   text-white transition-all duration-200"
				style="background: var(--space-accent, #3b82f6);"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				Looks Good!
			</button>
		</div>
	{/if}

	<!-- Done button for focused mode -->
	{#if assistState.phase === 'focused' && assistState.selectedTaskId}
		<div class="p-4 border-t border-surface-700">
			<button
				type="button"
				onclick={onClose}
				class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
					   bg-surface-700 text-surface-200 hover:bg-surface-600 transition-all duration-200"
			>
				Done for now
			</button>
		</div>
	{/if}

	<!-- Dismiss hint -->
	<div class="px-4 py-2 border-t border-surface-800 text-center">
		<span class="text-xs text-surface-500">Press Esc to close</span>
	</div>
</aside>

<style>
	.working-panel {
		/* Premium glassmorphism effect */
		box-shadow:
			-4px 0 24px rgba(0, 0, 0, 0.3),
			inset 1px 0 0 rgba(255, 255, 255, 0.05);
	}

	/* Smooth scrollbar */
	.working-panel :global(::-webkit-scrollbar) {
		width: 6px;
	}

	.working-panel :global(::-webkit-scrollbar-track) {
		background: transparent;
	}

	.working-panel :global(::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.working-panel :global(::-webkit-scrollbar-thumb:hover) {
		background: rgba(255, 255, 255, 0.2);
	}

	/* Task item hover effects */
	.task-item:not(:has(input)):hover {
		transform: translateX(-2px);
	}
</style>
