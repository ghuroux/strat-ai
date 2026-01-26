<!--
	NotesPanel.svelte

	Read-only panel showing area notes preview with link to edit.
	Part of the Context Transparency system.
-->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import { StickyNote, Edit, CheckCircle } from 'lucide-svelte';

	interface Props {
		hasNotes: boolean;
		preview?: string;  // First ~200 chars
		onEdit: () => void;  // Opens ContextPanel for editing
	}

	let {
		hasNotes,
		preview,
		onEdit
	}: Props = $props();
</script>

<div
	class="notes-panel absolute bottom-full left-0 mb-2 w-72
		   rounded-lg border shadow-xl z-50
		   bg-white dark:bg-zinc-900
		   border-zinc-200 dark:border-zinc-700"
	transition:slide={{ duration: 150 }}
>
	<div class="p-3">
		<div class="flex items-center justify-between mb-2">
			<div class="flex items-center gap-1.5">
				<StickyNote size={14} class="text-primary-500" />
				<span class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
					Area Notes
				</span>
			</div>
			{#if hasNotes}
				<CheckCircle size={12} class="text-green-500" />
			{/if}
		</div>

		{#if hasNotes && preview}
			<div class="mb-3">
				<p class="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
					{preview}{preview.length >= 200 ? '...' : ''}
				</p>
			</div>
		{:else}
			<div class="mb-3 py-3 text-center">
				<StickyNote size={20} class="mx-auto mb-1.5 text-zinc-300 dark:text-zinc-600" />
				<p class="text-xs text-zinc-400 dark:text-zinc-500">
					No notes added yet.
				</p>
				<p class="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
					Add context to help the AI understand this area.
				</p>
			</div>
		{/if}

		<button
			type="button"
			class="w-full flex items-center justify-center gap-1.5 py-2
				   text-xs font-medium rounded-md
				   bg-zinc-100 hover:bg-zinc-200
				   dark:bg-zinc-800 dark:hover:bg-zinc-700
				   text-zinc-600 dark:text-zinc-300
				   transition-colors"
			onclick={onEdit}
		>
			<Edit size={12} />
			{hasNotes ? 'Edit notes' : 'Add notes'}
		</button>
	</div>
</div>
