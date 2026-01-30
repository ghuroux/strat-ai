<!--
	ThinkingContextBar.svelte

	Compact row showing context being used during AI generation.
	Displayed in ThinkingDisplay while streaming.
-->
<script lang="ts">
	import { scale } from 'svelte/transition';
	import { FileText, StickyNote, Link2 } from 'lucide-svelte';

	interface ContextUsed {
		documents?: Array<{ filename: string }>;
		notes?: { included: boolean };
		tasks?: Array<{ title: string }>;
	}

	interface Props {
		context: ContextUsed;
	}

	let { context }: Props = $props();

	// Count what's being used
	let docCount = $derived(context.documents?.length ?? 0);
	let hasNotes = $derived(context.notes?.included ?? false);
	let taskCount = $derived(context.tasks?.length ?? 0);

	// Only show if there's some context
	let hasAnyContext = $derived(docCount > 0 || hasNotes || taskCount > 0);
</script>

{#if hasAnyContext}
	<div
		class="thinking-context-bar flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5"
		transition:scale={{ duration: 150, start: 0.95 }}
	>
		<span class="text-zinc-400 dark:text-zinc-500">Using:</span>

		{#if docCount > 0}
			<span class="flex items-center gap-1">
				<FileText size={11} class="text-primary-400" />
				<span class="text-zinc-600 dark:text-zinc-300">
					{context.documents?.[0]?.filename}
					{#if docCount > 1}
						<span class="text-zinc-400 dark:text-zinc-500">+{docCount - 1}</span>
					{/if}
				</span>
			</span>
		{/if}

		{#if docCount > 0 && (hasNotes || taskCount > 0)}
			<span class="text-zinc-300 dark:text-zinc-600">·</span>
		{/if}

		{#if hasNotes}
			<span class="flex items-center gap-1">
				<StickyNote size={11} class="text-primary-400" />
				<span class="text-zinc-600 dark:text-zinc-300">Notes</span>
			</span>
		{/if}

		{#if hasNotes && taskCount > 0}
			<span class="text-zinc-300 dark:text-zinc-600">·</span>
		{/if}

		{#if taskCount > 0}
			<span class="flex items-center gap-1">
				<Link2 size={11} class="text-primary-400" />
				<span class="text-zinc-600 dark:text-zinc-300">
					{taskCount} task{taskCount !== 1 ? 's' : ''}
				</span>
			</span>
		{/if}
	</div>
{/if}
