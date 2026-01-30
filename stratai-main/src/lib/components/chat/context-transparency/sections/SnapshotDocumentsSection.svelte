<!--
	SnapshotDocumentsSection.svelte

	Shows active and available documents in the Context Snapshot Modal.
	Users can activate/deactivate documents before starting a conversation.
-->
<script lang="ts">
	import { FileText, Plus, Minus } from 'lucide-svelte';

	interface DocumentItem {
		id: string;
		filename: string;
		charCount?: number;
		title?: string;
	}

	interface Props {
		activeDocuments: DocumentItem[];
		availableDocuments: DocumentItem[];
		onactivate?: (docId: string) => void;
		ondeactivate?: (docId: string) => void;
	}

	let { activeDocuments, availableDocuments, onactivate, ondeactivate }: Props = $props();

	let totalCount = $derived(activeDocuments.length + availableDocuments.length);

	function formatSize(charCount?: number): string {
		if (!charCount) return '';
		const tokens = Math.round(charCount / 4);
		if (tokens < 1000) return `~${tokens} tokens`;
		return `~${(tokens / 1000).toFixed(1)}k tokens`;
	}
</script>

<section class="rounded-lg border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
	<div class="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50">
		<FileText size={14} class="text-primary-500" />
		<span class="text-xs font-medium text-zinc-700 dark:text-zinc-300">Documents</span>
		<span class="inline-flex items-center rounded-full bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
			{activeDocuments.length}/{totalCount}
		</span>
	</div>

	<div class="px-3 py-2 space-y-1.5">
		{#if totalCount === 0}
			<p class="text-xs text-zinc-400 dark:text-zinc-500 italic py-1">
				No documents uploaded to this space yet.
			</p>
		{:else}
			<!-- Active documents -->
			{#each activeDocuments as doc (doc.id)}
				<div class="flex items-center justify-between gap-2 py-1 group">
					<div class="flex items-center gap-2 min-w-0 flex-1">
						<div class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>
						<span class="text-xs text-zinc-700 dark:text-zinc-300 truncate">
							{doc.title || doc.filename}
						</span>
						{#if doc.charCount}
							<span class="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
								{formatSize(doc.charCount)}
							</span>
						{/if}
					</div>
					{#if ondeactivate}
						<button
							type="button"
							class="shrink-0 p-0.5 rounded text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
							title="Remove from context"
							onclick={() => ondeactivate?.(doc.id)}
						>
							<Minus size={12} />
						</button>
					{/if}
				</div>
			{/each}

			<!-- Available (inactive) documents -->
			{#each availableDocuments as doc (doc.id)}
				<div class="flex items-center justify-between gap-2 py-1 group">
					<div class="flex items-center gap-2 min-w-0 flex-1">
						<div class="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0"></div>
						<span class="text-xs text-zinc-400 dark:text-zinc-500 truncate">
							{doc.title || doc.filename}
						</span>
						{#if doc.charCount}
							<span class="text-[10px] text-zinc-400 dark:text-zinc-600 shrink-0">
								{formatSize(doc.charCount)}
							</span>
						{/if}
					</div>
					{#if onactivate}
						<button
							type="button"
							class="shrink-0 p-0.5 rounded text-zinc-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 opacity-0 group-hover:opacity-100 transition-all"
							title="Add to context"
							onclick={() => onactivate?.(doc.id)}
						>
							<Plus size={12} />
						</button>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</section>
