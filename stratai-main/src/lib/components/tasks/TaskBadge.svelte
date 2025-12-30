<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import type { Task } from '$lib/types/tasks';

	interface Props {
		spaceId: string;
		onOpenPanel?: () => void;
		onFocusTask?: (taskId: string) => void;
		onCompleteTask?: (taskId: string) => void;
	}

	let { spaceId, onOpenPanel, onFocusTask, onCompleteTask }: Props = $props();

	// State
	let isOpen = $state(false);
	let dropdownRef: HTMLDivElement | undefined = $state();

	// Derived
	let tasks = $derived(taskStore.getPendingTasksForSpaceId(spaceId));
	let count = $derived(tasks.length);
	let hasHighPriority = $derived(tasks.some(t => t.priority === 'high'));

	// Close dropdown on outside click
	function handleClickOutside(event: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			isOpen = false;
		}
	}

	// Close on escape
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			document.addEventListener('keydown', handleKeydown);
		}
		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	function handleTaskClick(task: Task) {
		isOpen = false;
		onFocusTask?.(task.id);
	}

	function handleCompleteClick(e: MouseEvent, task: Task) {
		e.stopPropagation();
		onCompleteTask?.(task.id);
	}

	function formatDueDate(date?: Date): string {
		if (!date) return '';
		const now = new Date();
		const diff = date.getTime() - now.getTime();
		const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

		if (days < 0) return 'Overdue';
		if (days === 0) return 'Today';
		if (days === 1) return 'Tomorrow';
		if (days < 7) return `${days} days`;
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="relative" bind:this={dropdownRef}>
	<!-- Badge Button -->
	<button
		type="button"
		class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
			   bg-surface-800 hover:bg-surface-700 border border-surface-700 hover:border-surface-600
			   {hasHighPriority ? 'text-amber-400' : 'text-surface-300'}"
		onclick={() => isOpen = !isOpen}
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
				d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
		</svg>
		<span class="tabular-nums">{count}</span>
		{#if hasHighPriority}
			<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
		{/if}
	</button>

		<!-- Dropdown -->
		{#if isOpen}
			<div
				class="absolute top-full right-0 mt-2 w-80 max-h-96 overflow-hidden
					   bg-surface-800 border border-surface-700 rounded-xl shadow-xl z-50"
				transition:fly={{ y: -10, duration: 150 }}
			>
				<!-- Header -->
				<div class="px-4 py-3 border-b border-surface-700 flex items-center justify-between">
					<span class="text-sm font-medium text-surface-200">Your Tasks</span>
					<span class="text-xs text-surface-500">{count} pending</span>
				</div>

				<!-- Task List -->
				<div class="max-h-72 overflow-y-auto">
					{#if count === 0}
						<div class="px-4 py-8 text-center">
							<svg class="w-10 h-10 mx-auto mb-2 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
							</svg>
							<p class="text-sm text-surface-500">No tasks yet</p>
							<p class="text-xs text-surface-600 mt-1">Click below to add one</p>
						</div>
					{:else}
						{#each tasks.slice(0, 8) as task (task.id)}
							<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
							<div
								class="px-4 py-3 hover:bg-surface-700/50 cursor-pointer transition-colors
									   border-b border-surface-700/50 last:border-0 group"
								onclick={() => handleTaskClick(task)}
							>
								<div class="flex items-start gap-3">
									<!-- Complete button -->
									<button
										type="button"
										class="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all
											   hover:bg-surface-600 group-hover:border-surface-500"
										style="border-color: {task.color};"
										onclick={(e) => handleCompleteClick(e, task)}
										title="Mark complete"
									>
										<span class="sr-only">Complete task</span>
									</button>

									<!-- Task content -->
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<span class="text-sm text-surface-200 truncate">{task.title}</span>
											{#if task.priority === 'high'}
												<svg class="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
													<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
												</svg>
											{/if}
										</div>
										{#if task.dueDate}
											<span class="text-xs text-surface-500 mt-0.5 block">
												{formatDueDate(task.dueDate)}
												{#if task.dueDateType === 'hard'}
													<span class="text-rose-400/70">(hard)</span>
												{/if}
											</span>
										{/if}
									</div>

									<!-- Color indicator -->
									<div
										class="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
										style="background-color: {task.color};"
									></div>
								</div>
							</div>
						{/each}

						{#if count > 8}
							<div class="px-4 py-2 text-xs text-center text-surface-500 border-t border-surface-700">
								+{count - 8} more tasks
							</div>
						{/if}
					{/if}
				</div>

				<!-- Footer -->
				<div class="px-4 py-3 border-t border-surface-700 bg-surface-850">
					<button
						type="button"
						class="w-full text-sm text-center py-2 rounded-lg
							   bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-surface-100
							   transition-colors"
						onclick={() => { isOpen = false; onOpenPanel?.(); }}
					>
						{count === 0 ? 'Add a task' : 'View all tasks'}
					</button>
				</div>
			</div>
		{/if}
	</div>
