<!--
	DocumentsPanel.svelte

	Expandable panel showing active and available documents with activation controls.
	Part of the Context Transparency system.
-->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import { Check, Plus, Minus, Settings, FileText, AlertCircle } from 'lucide-svelte';

	interface DocumentInfo {
		id: string;
		filename: string;
		charCount: number;
		title?: string;
	}

	interface Props {
		activeDocuments: DocumentInfo[];
		availableDocuments: DocumentInfo[];
		onActivate: (docId: string) => void;
		onDeactivate: (docId: string) => void;
		onManage: () => void;  // Opens ContextPanel
	}

	let {
		activeDocuments,
		availableDocuments,
		onActivate,
		onDeactivate,
		onManage
	}: Props = $props();

	// Format character count for display
	function formatCharCount(count: number): string {
		if (count < 1000) return `${count}`;
		return `${(count / 1000).toFixed(1)}k`;
	}

	// Calculate total tokens (rough estimate: ~4 chars per token)
	let totalActiveChars = $derived(
		activeDocuments.reduce((sum, doc) => sum + doc.charCount, 0)
	);
	let estimatedTokens = $derived(Math.round(totalActiveChars / 4));
</script>

<div
	class="documents-panel absolute bottom-full left-0 mb-2 w-80 max-h-72 overflow-y-auto
		   rounded-lg border shadow-xl z-50
		   bg-white dark:bg-zinc-900
		   border-zinc-200 dark:border-zinc-700"
	transition:slide={{ duration: 150 }}
>
	<!-- Active Documents Section -->
	{#if activeDocuments.length > 0}
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
				{#each activeDocuments as doc (doc.id)}
					<div class="flex items-center gap-2 p-2 rounded-md
								bg-primary-50 dark:bg-primary-500/10
								border border-primary-200 dark:border-primary-500/20">
						<Check size={14} class="text-primary-500 flex-shrink-0" />
						<FileText size={14} class="text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
						<div class="flex-1 min-w-0">
							<span class="text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate block">
								{doc.title || doc.filename}
							</span>
							<span class="text-[10px] text-zinc-500 dark:text-zinc-400">
								{formatCharCount(doc.charCount)} chars
							</span>
						</div>
						<button
							type="button"
							class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/20
								   text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400
								   transition-colors"
							onclick={() => onDeactivate(doc.id)}
							title="Remove from context"
						>
							<Minus size={14} />
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Available Documents Section -->
	{#if availableDocuments.length > 0}
		<div class="p-3">
			<div class="flex items-center gap-1.5 mb-2">
				<AlertCircle size={12} class="text-amber-500" />
				<span class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
					Available but not active
				</span>
			</div>

			<div class="space-y-1">
				{#each availableDocuments as doc (doc.id)}
					<div class="flex items-center gap-2 p-2 rounded-md
								bg-zinc-50 dark:bg-zinc-800/50
								border border-zinc-200 dark:border-zinc-700
								hover:border-zinc-300 dark:hover:border-zinc-600
								transition-colors">
						<FileText size={14} class="text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
						<div class="flex-1 min-w-0">
							<span class="text-xs font-medium text-zinc-600 dark:text-zinc-300 truncate block">
								{doc.title || doc.filename}
							</span>
							<span class="text-[10px] text-zinc-400 dark:text-zinc-500">
								{formatCharCount(doc.charCount)} chars
							</span>
						</div>
						<button
							type="button"
							class="p-1 rounded hover:bg-primary-100 dark:hover:bg-primary-500/20
								   text-zinc-400 hover:text-primary-500 dark:text-zinc-500 dark:hover:text-primary-400
								   transition-colors"
							onclick={() => onActivate(doc.id)}
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
	{#if activeDocuments.length === 0 && availableDocuments.length === 0}
		<div class="p-4 text-center">
			<FileText size={24} class="mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
			<p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
				No documents in this space yet
			</p>
			<button
				type="button"
				class="text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300
					   font-medium"
				onclick={onManage}
			>
				Upload documents
			</button>
		</div>
	{/if}

	<!-- Footer with manage link -->
	{#if activeDocuments.length > 0 || availableDocuments.length > 0}
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
				Manage documents
			</button>
		</div>
	{/if}
</div>
