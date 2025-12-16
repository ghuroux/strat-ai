<script lang="ts">
	import { fade, fly, slide } from 'svelte/transition';
	import type { Task } from '$lib/types/tasks';
	import { taskStore } from '$lib/stores/tasks.svelte';

	interface Props {
		task: Task;
		onExitFocus: () => void;
		onOpenPanel: () => void;
		onStartPlanMode?: () => void;
	}

	let { task, onExitFocus, onOpenPanel, onStartPlanMode }: Props = $props();

	// Subtask state
	let subtasks = $derived(taskStore.getSubtasksForTask(task.id));
	let hasSubtasks = $derived(subtasks.length > 0);
	let completedSubtasks = $derived(subtasks.filter(s => s.status === 'completed').length);
	let isSubtask = $derived(!!task.parentTaskId);
	let parentTask = $derived(isSubtask ? taskStore.getParentTask(task.id) : null);

	// Format due date for display
	function formatDueDate(date: Date): string {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const taskDate = new Date(date);
		taskDate.setHours(0, 0, 0, 0);

		const diff = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		if (diff < 0) return 'Overdue';
		if (diff === 0) return 'Due today';
		if (diff === 1) return 'Due tomorrow';
		if (diff < 7) return taskDate.toLocaleDateString('en-US', { weekday: 'long' });
		return taskDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function isOverdue(date: Date): boolean {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return date < today;
	}

	function isDueSoon(date: Date): boolean {
		const today = new Date();
		const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
		return diff <= 1 && diff >= 0;
	}

	// For future: check if task has linked conversations
	let hasLinkedConversations = $derived(task.linkedConversationIds?.length > 0);

	// Helper to focus on a subtask
	function focusSubtask(subtaskId: string) {
		taskStore.setFocusedTask(subtaskId);
	}

	// Helper to focus on parent task
	function focusParent() {
		if (parentTask) {
			taskStore.setFocusedTask(parentTask.id);
		}
	}
</script>

<div class="h-full flex items-center justify-center min-h-[60vh]" in:fade={{ duration: 300 }}>
	<div class="text-center max-w-lg">
		<!-- Task Header -->
		<div
			class="mb-8 p-6 rounded-2xl border task-header-glow"
			style="background: color-mix(in srgb, {task.color} 8%, transparent); border-color: color-mix(in srgb, {task.color} 30%, transparent);"
			in:fly={{ y: -20, duration: 300 }}
		>
			<div class="flex items-start justify-between mb-4">
				<!-- Task Icon + Title -->
				<div class="flex items-start gap-3">
					<div
						class="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
						style="background: color-mix(in srgb, {task.color} 20%, transparent);"
					>
						<svg
							class="w-6 h-6"
							style="color: {task.color};"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
							/>
						</svg>
					</div>
					<div class="text-left">
						<h2
							class="text-xl font-bold"
							style="color: {task.color};"
						>
							{task.title}
						</h2>
						<div class="flex items-center gap-2 mt-1 flex-wrap">
							{#if task.priority === 'high'}
								<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400">
									<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
										<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
									</svg>
									High Priority
								</span>
							{/if}
							{#if task.dueDate}
								{@const overdue = isOverdue(task.dueDate)}
								{@const dueSoon = isDueSoon(task.dueDate)}
								<span
									class="text-xs px-2 py-0.5 rounded-full {overdue ? 'bg-red-500/20 text-red-400' : dueSoon ? 'bg-amber-500/20 text-amber-400' : 'bg-surface-700 text-surface-400'}"
								>
									{formatDueDate(task.dueDate)}
									{#if task.dueDateType === 'hard'}
										<span class="text-[10px] opacity-70">(hard deadline)</span>
									{/if}
								</span>
							{/if}
						</div>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="flex items-center gap-1">
					<button
						type="button"
						class="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 transition-colors"
						onclick={onOpenPanel}
						title="Edit task details"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
					</button>
					<button
						type="button"
						class="p-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 transition-colors"
						onclick={onExitFocus}
						title="Exit focus mode"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Focus mode indicator -->
			<div class="flex items-center justify-center gap-2 pt-3 border-t" style="border-color: color-mix(in srgb, {task.color} 20%, transparent);">
				<div class="w-2 h-2 rounded-full animate-pulse" style="background: {task.color};"></div>
				<span class="text-sm text-surface-400">Focus Mode Active</span>
			</div>
		</div>

		<!-- Breadcrumb for subtasks -->
		{#if isSubtask && parentTask}
			<nav class="mb-6 flex items-center justify-center gap-2 text-sm" in:fly={{ y: -10, duration: 200 }}>
				<button
					type="button"
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
					onclick={focusParent}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					{parentTask.title}
				</button>
				<svg class="w-4 h-4 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
				<span class="text-surface-300 font-medium">{task.title}</span>
			</nav>
		{/if}

		{#if hasSubtasks}
			<!-- Subtask List -->
			<div class="space-y-4" in:fly={{ y: 20, duration: 300, delay: 100 }}>
				<div class="p-5 rounded-xl border bg-surface-800/50 border-surface-700 text-left">
					<div class="flex items-center justify-between mb-4">
						<h3 class="font-medium text-surface-200 flex items-center gap-2">
							<svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
							</svg>
							Subtasks
							<span class="text-xs text-surface-500 font-normal">({completedSubtasks}/{subtasks.length})</span>
						</h3>
					</div>
					<div class="space-y-2">
						{#each subtasks as subtask (subtask.id)}
							{@const isCompleted = subtask.status === 'completed'}
							<button
								type="button"
								class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left
									   {isCompleted ? 'bg-surface-700/30 opacity-60' : 'bg-surface-700/50 hover:bg-surface-700'}"
								onclick={() => focusSubtask(subtask.id)}
								disabled={isCompleted}
							>
								{#if subtask.subtaskType === 'action'}
									<div class="w-5 h-5 rounded border {isCompleted ? 'bg-green-500 border-green-500' : 'border-surface-500'} flex items-center justify-center">
										{#if isCompleted}
											<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</div>
								{:else}
									<svg class="w-5 h-5 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
									</svg>
								{/if}
								<span class="flex-1 text-sm {isCompleted ? 'line-through text-surface-500' : 'text-surface-200'}">
									{subtask.title}
								</span>
								{#if !isCompleted && subtask.subtaskType === 'conversation'}
									<svg class="w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<!-- Continue with parent task -->
				<div class="text-center">
					<p class="text-sm text-surface-500 mb-3">Or continue working on the main task</p>
					<div class="flex flex-col items-center gap-2 text-surface-500 animate-subtle-bounce">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
						</svg>
					</div>
				</div>
			</div>
		{:else if !isSubtask && !hasLinkedConversations}
			<!-- Plan Mode Action Buttons (for parent tasks without subtasks) -->
			<div class="space-y-6" in:fly={{ y: 20, duration: 300, delay: 100 }}>
				<!-- Plan Mode CTA -->
				<div class="p-5 rounded-xl border bg-surface-800/50 border-surface-700 text-center">
					<div class="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center bg-primary-500/20">
						<svg class="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
						</svg>
					</div>
					<h3 class="font-medium text-surface-200 mb-2">How would you like to start?</h3>
					<p class="text-sm text-surface-400 mb-5">
						Choose your approach for tackling this task
					</p>

					<div class="flex flex-col gap-3">
						{#if onStartPlanMode}
							<button
								type="button"
								class="w-full py-3 px-4 rounded-xl font-medium text-white transition-all duration-200 flex items-center justify-center gap-2"
								style="background: var(--space-accent, #3b82f6);"
								onclick={onStartPlanMode}
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
								</svg>
								Help me plan this
							</button>
						{/if}
						<div class="relative">
							<div class="absolute inset-0 flex items-center">
								<div class="w-full border-t border-surface-700"></div>
							</div>
							<div class="relative flex justify-center text-xs">
								<span class="px-2 bg-surface-800 text-surface-500">or</span>
							</div>
						</div>
						<p class="text-sm text-surface-400">Just start chatting below</p>
					</div>
				</div>
			</div>

			<!-- Visual pointer to chat input -->
			<div class="mt-6 flex flex-col items-center gap-2 text-surface-500 animate-subtle-bounce">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
				</svg>
			</div>
		{:else}
			<!-- Guidance for tasks with conversation history -->
			<div class="space-y-4" in:fly={{ y: 20, duration: 300, delay: 100 }}>
				<div class="p-5 rounded-xl border bg-surface-800/50 border-surface-700 text-left">
					<div class="flex items-start gap-3">
						<div class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-green-500/20">
							<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
							</svg>
						</div>
						<div>
							<h3 class="font-medium text-surface-200 mb-2">Continue Your Work</h3>
							<p class="text-sm text-surface-400">
								You have previous conversations for this task. Continue where you left off.
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Visual pointer to chat input -->
			<div class="mt-8 flex flex-col items-center gap-2 text-surface-500 animate-subtle-bounce">
				<span class="text-sm">Continue below</span>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
				</svg>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Subtle glow based on task color */
	.task-header-glow {
		box-shadow: 0 0 40px color-mix(in srgb, var(--task-accent, #3b82f6) 15%, transparent);
	}

	/* Subtle bounce animation for pointer */
	.animate-subtle-bounce {
		animation: subtle-bounce 2s ease-in-out infinite;
	}

	@keyframes subtle-bounce {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(6px);
		}
	}
</style>
