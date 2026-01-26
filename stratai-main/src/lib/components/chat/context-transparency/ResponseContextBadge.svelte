<!--
	ResponseContextBadge.svelte

	Subtle expandable badge showing context used for a response.
	Displayed below assistant messages.
-->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import { Eye, ChevronDown, FileText, StickyNote, ListTodo } from 'lucide-svelte';

	interface UsedContext {
		documents: Array<{ filename: string; tokenEstimate: number }>;
		notes: { included: boolean; tokenEstimate: number };
		tasks: Array<{ title: string; tokenEstimate: number }>;
	}

	interface Props {
		usedContext: UsedContext;
	}

	let { usedContext }: Props = $props();

	let expanded = $state(false);

	// Calculate totals
	let sourceCount = $derived(
		usedContext.documents.length +
		(usedContext.notes.included ? 1 : 0) +
		usedContext.tasks.length
	);

	let totalTokens = $derived(
		usedContext.documents.reduce((sum, d) => sum + d.tokenEstimate, 0) +
		usedContext.notes.tokenEstimate +
		usedContext.tasks.reduce((sum, t) => sum + t.tokenEstimate, 0)
	);

	// Don't render if no context used
	let hasContext = $derived(sourceCount > 0);

	function toggle() {
		expanded = !expanded;
	}
</script>

{#if hasContext}
	<div class="response-context-badge mt-2">
		<button
			type="button"
			class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px]
				   text-zinc-400 dark:text-zinc-500
				   hover:bg-zinc-100 dark:hover:bg-zinc-800
				   hover:text-zinc-600 dark:hover:text-zinc-300
				   transition-colors"
			onclick={toggle}
		>
			<Eye size={12} />
			<span>Context: {sourceCount} source{sourceCount !== 1 ? 's' : ''} used</span>
			<ChevronDown
				size={12}
				class="transition-transform {expanded ? 'rotate-180' : ''}"
			/>
		</button>

		{#if expanded}
			<div
				class="mt-2 p-2 rounded-md text-xs
					   bg-zinc-50 dark:bg-zinc-800/50
					   border border-zinc-200 dark:border-zinc-700"
				transition:slide={{ duration: 150 }}
			>
				<div class="space-y-1.5">
					<!-- Documents -->
					{#each usedContext.documents as doc}
						<div class="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
							<FileText size={12} class="text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
							<span class="flex-1 truncate">{doc.filename}</span>
							<span class="text-[10px] text-zinc-400 dark:text-zinc-500">
								~{doc.tokenEstimate.toLocaleString()} tokens
							</span>
						</div>
					{/each}

					<!-- Notes -->
					{#if usedContext.notes.included}
						<div class="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
							<StickyNote size={12} class="text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
							<span class="flex-1">Area Notes</span>
							<span class="text-[10px] text-zinc-400 dark:text-zinc-500">
								~{usedContext.notes.tokenEstimate.toLocaleString()} tokens
							</span>
						</div>
					{/if}

					<!-- Tasks -->
					{#each usedContext.tasks as task}
						<div class="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
							<ListTodo size={12} class="text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
							<span class="flex-1 truncate">{task.title}</span>
							<span class="text-[10px] text-zinc-400 dark:text-zinc-500">
								~{task.tokenEstimate.toLocaleString()} tokens
							</span>
						</div>
					{/each}

					<!-- Total -->
					<div class="pt-1.5 mt-1.5 border-t border-zinc-200 dark:border-zinc-700
								flex items-center justify-between text-zinc-500 dark:text-zinc-400">
						<span>Total context</span>
						<span class="font-medium">~{totalTokens.toLocaleString()} tokens</span>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
