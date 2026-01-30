<!--
	SnapshotTasksSection.svelte

	Shows active/planning tasks in the Context Snapshot Modal.
	Read-only — tasks provide context but aren't toggled here.
-->
<script lang="ts">
	import { ListTodo } from 'lucide-svelte';

	interface TaskItem {
		id: string;
		title: string;
		status: string;
		color?: string;
	}

	interface Props {
		tasks: TaskItem[];
	}

	let { tasks }: Props = $props();

	function statusLabel(status: string): string {
		if (status === 'active') return 'Active';
		if (status === 'planning') return 'Planning';
		return status;
	}

	function statusColor(status: string): string {
		if (status === 'active') return 'bg-blue-500';
		if (status === 'planning') return 'bg-amber-500';
		return 'bg-zinc-400';
	}
</script>

<section class="rounded-lg border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
	<div class="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50">
		<ListTodo size={14} class="text-blue-500" />
		<span class="text-xs font-medium text-zinc-700 dark:text-zinc-300">Tasks</span>
		<span class="inline-flex items-center rounded-full bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
			{tasks.length}
		</span>
	</div>

	<div class="px-3 py-2 space-y-1.5">
		{#if tasks.length === 0}
			<p class="text-xs text-zinc-400 dark:text-zinc-500 italic py-1">
				No active tasks in this area.
			</p>
		{:else}
			{#each tasks as task (task.id)}
				<div class="flex items-center gap-2 py-1">
					<div class="w-1.5 h-1.5 rounded-full {statusColor(task.status)} shrink-0"></div>
					<span class="text-xs text-zinc-700 dark:text-zinc-300 truncate flex-1">
						{task.title}
					</span>
					<span class="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
						{statusLabel(task.status)}
					</span>
				</div>
			{/each}
		{/if}
	</div>
</section>
