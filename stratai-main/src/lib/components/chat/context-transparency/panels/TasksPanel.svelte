<!--
	TasksPanel.svelte

	Read-only panel showing related tasks with status badges.
	Part of the Context Transparency system.
-->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import { ListTodo, Circle, CheckCircle2, Clock, AlertCircle } from 'lucide-svelte';
	import type { Task } from '$lib/types/tasks';

	interface TaskInfo {
		id: string;
		title: string;
		status: Task['status'];
		color?: string;
	}

	interface Props {
		tasks: TaskInfo[];
		onTaskClick?: (taskId: string) => void;  // Navigate to task
		onViewAll: () => void;  // Opens TasksPanel
	}

	let {
		tasks,
		onTaskClick,
		onViewAll
	}: Props = $props();

	// Get status icon and color
	function getStatusInfo(status: Task['status']): { icon: typeof Circle; color: string; label: string } {
		switch (status) {
			case 'active':
				return { icon: Circle, color: 'text-blue-500', label: 'Active' };
			case 'planning':
				return { icon: Clock, color: 'text-amber-500', label: 'Planning' };
			case 'completed':
				return { icon: CheckCircle2, color: 'text-green-500', label: 'Complete' };
			case 'deferred':
				return { icon: AlertCircle, color: 'text-zinc-400', label: 'Deferred' };
			default:
				return { icon: Circle, color: 'text-zinc-400', label: status };
		}
	}
</script>

<div
	class="tasks-panel absolute bottom-full left-0 mb-2 w-72 max-h-64 overflow-y-auto
		   rounded-lg border shadow-xl z-50
		   bg-white dark:bg-zinc-900
		   border-zinc-200 dark:border-zinc-700"
	transition:slide={{ duration: 150 }}
>
	<div class="p-3">
		<div class="flex items-center justify-between mb-2">
			<div class="flex items-center gap-1.5">
				<ListTodo size={14} class="text-primary-500" />
				<span class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
					Related Tasks
				</span>
			</div>
			<span class="text-[10px] text-zinc-400 dark:text-zinc-500">
				{tasks.length} task{tasks.length !== 1 ? 's' : ''}
			</span>
		</div>

		{#if tasks.length > 0}
			<div class="space-y-1">
				{#each tasks as task (task.id)}
					{@const statusInfo = getStatusInfo(task.status)}
					{@const StatusIcon = statusInfo.icon}
					<button
						type="button"
						class="w-full flex items-center gap-2 p-2 rounded-md text-left
							   bg-zinc-50 dark:bg-zinc-800/50
							   border border-zinc-200 dark:border-zinc-700
							   hover:border-zinc-300 dark:hover:border-zinc-600
							   hover:bg-zinc-100 dark:hover:bg-zinc-800
							   transition-colors"
						onclick={() => onTaskClick?.(task.id)}
					>
						<StatusIcon size={14} class={statusInfo.color + ' flex-shrink-0'} />
						<span class="flex-1 text-xs text-zinc-700 dark:text-zinc-200 truncate">
							{task.title}
						</span>
						{#if task.color}
							<span
								class="w-2 h-2 rounded-full flex-shrink-0"
								style="background-color: {task.color}"
							></span>
						{/if}
					</button>
				{/each}
			</div>
		{:else}
			<div class="py-4 text-center">
				<ListTodo size={20} class="mx-auto mb-1.5 text-zinc-300 dark:text-zinc-600" />
				<p class="text-xs text-zinc-400 dark:text-zinc-500">
					No tasks in this area yet.
				</p>
			</div>
		{/if}

		{#if tasks.length > 0}
			<button
				type="button"
				class="w-full flex items-center justify-center gap-1.5 py-2 mt-2
					   text-xs text-zinc-500 hover:text-zinc-700
					   dark:text-zinc-400 dark:hover:text-zinc-200
					   transition-colors"
				onclick={onViewAll}
			>
				View all tasks
			</button>
		{/if}
	</div>
</div>
