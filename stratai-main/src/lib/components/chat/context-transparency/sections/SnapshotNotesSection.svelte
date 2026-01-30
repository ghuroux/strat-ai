<!--
	SnapshotNotesSection.svelte

	Shows area notes preview in the Context Snapshot Modal.
	Read-only display with an "Edit" link to open the ContextPanel.
-->
<script lang="ts">
	import { StickyNote, ExternalLink } from 'lucide-svelte';

	interface Props {
		hasNotes: boolean;
		preview?: string;
		oneditclick?: () => void;
	}

	let { hasNotes, preview, oneditclick }: Props = $props();
</script>

<section class="rounded-lg border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
	<div class="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50">
		<div class="flex items-center gap-2">
			<StickyNote size={14} class="text-primary-500" />
			<span class="text-xs font-medium text-zinc-700 dark:text-zinc-300">Area Notes</span>
			{#if hasNotes}
				<span class="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
					Active
				</span>
			{/if}
		</div>
		{#if oneditclick}
			<button
				type="button"
				class="flex items-center gap-1 text-[11px] text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
				onclick={oneditclick}
			>
				Edit
				<ExternalLink size={10} />
			</button>
		{/if}
	</div>

	<div class="px-3 py-2.5">
		{#if hasNotes && preview}
			<p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
				{preview}{preview.length >= 200 ? '…' : ''}
			</p>
		{:else}
			<p class="text-xs text-zinc-400 dark:text-zinc-500 italic">
				No notes configured for this area yet.
			</p>
		{/if}
	</div>
</section>
