<!--
	PagesPanel.svelte

	Expandable panel showing active and available finalized pages with context controls.
	Part of the Context Transparency system (Phase 2: Page Context).
	Follows DocumentsPanel.svelte pattern.
-->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import { Check, Plus, Minus, Settings, BookOpen } from 'lucide-svelte';

	interface PageInfo {
		id: string;
		title: string;
		wordCount: number;
		currentVersion?: number;
	}

	interface Props {
		activePages: PageInfo[];
		availablePages: PageInfo[];
		onActivate: (pageId: string) => void;
		onDeactivate: (pageId: string) => void;
		onManage: () => void;
	}

	let {
		activePages,
		availablePages,
		onActivate,
		onDeactivate,
		onManage
	}: Props = $props();

	// Estimate total chars from word count (~5 chars per word)
	let totalActiveChars = $derived(
		activePages.reduce((sum, p) => sum + p.wordCount * 5, 0)
	);
	let estimatedTokens = $derived(Math.round(totalActiveChars / 4));
</script>

<div
	class="pages-panel absolute bottom-full left-0 mb-2 w-80 max-h-72 overflow-y-auto
		   rounded-lg border shadow-xl z-50
		   bg-white dark:bg-zinc-900
		   border-zinc-200 dark:border-zinc-700"
	transition:slide={{ duration: 150 }}
>
	<!-- Active Pages Section -->
	{#if activePages.length > 0}
		<div class="p-3 border-b border-zinc-200 dark:border-zinc-700">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
					Active in Context
				</span>
				<span class="text-[10px] text-zinc-400 dark:text-zinc-500">
					~{estimatedTokens.toLocaleString()} tokens
				</span>
			</div>

			<div class="space-y-1">
				{#each activePages as page (page.id)}
					<div class="flex items-center gap-2 p-2 rounded-md
								bg-primary-50 dark:bg-primary-500/10
								border border-primary-200 dark:border-primary-500/20">
						<Check size={14} class="text-primary-500 flex-shrink-0" />
						<BookOpen size={14} class="text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
						<div class="flex-1 min-w-0">
							<span class="text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate block">
								{page.title}
							</span>
							<span class="text-[10px] text-zinc-500 dark:text-zinc-400">
								v{page.currentVersion ?? 1} &middot; {page.wordCount} words
							</span>
						</div>
						<button
							type="button"
							class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/20
								   text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400
								   transition-colors"
							onclick={() => onDeactivate(page.id)}
							title="Remove from context"
						>
							<Minus size={14} />
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Available Pages Section -->
	{#if availablePages.length > 0}
		<div class="p-3">
			<div class="flex items-center gap-1.5 mb-2">
				<BookOpen size={12} class="text-amber-500" />
				<span class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
					Available finalized pages
				</span>
			</div>

			<div class="space-y-1">
				{#each availablePages as page (page.id)}
					<div class="flex items-center gap-2 p-2 rounded-md
								bg-zinc-50 dark:bg-zinc-800/50
								border border-zinc-200 dark:border-zinc-700
								hover:border-zinc-300 dark:hover:border-zinc-600
								transition-colors">
						<BookOpen size={14} class="text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
						<div class="flex-1 min-w-0">
							<span class="text-xs font-medium text-zinc-600 dark:text-zinc-300 truncate block">
								{page.title}
							</span>
							<span class="text-[10px] text-zinc-400 dark:text-zinc-500">
								v{page.currentVersion ?? 1} &middot; {page.wordCount} words
							</span>
						</div>
						<button
							type="button"
							class="p-1 rounded hover:bg-primary-100 dark:hover:bg-primary-500/20
								   text-zinc-400 hover:text-primary-500 dark:text-zinc-500 dark:hover:text-primary-400
								   transition-colors"
							onclick={() => onActivate(page.id)}
							title="Add to context"
						>
							<Plus size={14} />
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Empty State -->
	{#if activePages.length === 0 && availablePages.length === 0}
		<div class="p-4 text-center">
			<BookOpen size={24} class="mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
			<p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
				No finalized pages in this area
			</p>
			<p class="text-[10px] text-zinc-400 dark:text-zinc-500">
				Finalize a page to add it to AI context
			</p>
		</div>
	{/if}

	<!-- Footer with manage link -->
	{#if activePages.length > 0 || availablePages.length > 0}
		<div class="p-2 border-t border-zinc-200 dark:border-zinc-700">
			<button
				type="button"
				class="w-full flex items-center justify-center gap-1.5 py-1.5
					   text-xs text-zinc-500 hover:text-zinc-700
					   dark:text-zinc-400 dark:hover:text-zinc-200
					   transition-colors"
				onclick={onManage}
			>
				<Settings size={12} />
				Manage pages
			</button>
		</div>
	{/if}
</div>
