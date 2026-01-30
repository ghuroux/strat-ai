<!--
	SnapshotPagesSection.svelte

	Shows active and available finalized pages in the Context Snapshot Modal.
	Users can activate/deactivate pages before starting a conversation.
-->
<script lang="ts">
	import { FileText, Plus, Minus } from 'lucide-svelte';

	interface PageItem {
		id: string;
		title: string;
		wordCount: number;
		currentVersion?: number;
	}

	interface Props {
		activePages: PageItem[];
		availablePages: PageItem[];
		onactivate?: (pageId: string) => void;
		ondeactivate?: (pageId: string) => void;
	}

	let { activePages, availablePages, onactivate, ondeactivate }: Props = $props();

	let totalCount = $derived(activePages.length + availablePages.length);

	function formatWordCount(count: number): string {
		if (count < 1000) return `${count} words`;
		return `${(count / 1000).toFixed(1)}k words`;
	}
</script>

<section class="rounded-lg border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
	<div class="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50">
		<FileText size={14} class="text-violet-500" />
		<span class="text-xs font-medium text-zinc-700 dark:text-zinc-300">Pages</span>
		<span class="inline-flex items-center rounded-full bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
			{activePages.length}/{totalCount}
		</span>
	</div>

	<div class="px-3 py-2 space-y-1.5">
		{#if totalCount === 0}
			<p class="text-xs text-zinc-400 dark:text-zinc-500 italic py-1">
				No finalized pages in this area yet.
			</p>
		{:else}
			<!-- Active pages -->
			{#each activePages as pg (pg.id)}
				<div class="flex items-center justify-between gap-2 py-1 group">
					<div class="flex items-center gap-2 min-w-0 flex-1">
						<div class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
						<span class="text-xs text-zinc-700 dark:text-zinc-300 truncate">
							{pg.title}
						</span>
						<span class="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
							{formatWordCount(pg.wordCount)}
							{#if pg.currentVersion}· v{pg.currentVersion}{/if}
						</span>
					</div>
					{#if ondeactivate}
						<button
							type="button"
							class="shrink-0 p-0.5 rounded text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
							title="Remove from context"
							onclick={() => ondeactivate?.(pg.id)}
						>
							<Minus size={12} />
						</button>
					{/if}
				</div>
			{/each}

			<!-- Available (inactive) pages -->
			{#each availablePages as pg (pg.id)}
				<div class="flex items-center justify-between gap-2 py-1 group">
					<div class="flex items-center gap-2 min-w-0 flex-1">
						<div class="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0"></div>
						<span class="text-xs text-zinc-400 dark:text-zinc-500 truncate">
							{pg.title}
						</span>
						<span class="text-[10px] text-zinc-400 dark:text-zinc-600 shrink-0">
							{formatWordCount(pg.wordCount)}
							{#if pg.currentVersion}· v{pg.currentVersion}{/if}
						</span>
					</div>
					{#if onactivate}
						<button
							type="button"
							class="shrink-0 p-0.5 rounded text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 opacity-0 group-hover:opacity-100 transition-all"
							title="Add to context"
							onclick={() => onactivate?.(pg.id)}
						>
							<Plus size={12} />
						</button>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</section>
