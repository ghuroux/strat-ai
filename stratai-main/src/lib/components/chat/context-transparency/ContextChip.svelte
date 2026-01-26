<!--
	ContextChip.svelte

	Compact clickable chip showing context type with icon + label + count.
	Part of the Context Transparency system.
-->
<script lang="ts">
	import { FileText, StickyNote, ListTodo } from 'lucide-svelte';

	interface Props {
		icon: 'file-text' | 'sticky-note' | 'list-todo';
		label: string;
		count?: number;
		active: boolean;      // Has content
		expanded: boolean;    // Panel open
		onclick: () => void;
	}

	let {
		icon,
		label,
		count,
		active,
		expanded,
		onclick
	}: Props = $props();

	// Map icon type to component
	const iconComponents = {
		'file-text': FileText,
		'sticky-note': StickyNote,
		'list-todo': ListTodo
	};

	let IconComponent = $derived(iconComponents[icon]);
</script>

<button
	type="button"
	class="context-chip flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium
		   transition-all duration-150
		   {active
		   	? 'bg-primary-500/15 text-primary-400 dark:bg-primary-500/15 dark:text-primary-400 hover:bg-primary-500/25 dark:hover:bg-primary-500/25'
		   	: 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700'}
		   {expanded ? 'ring-2 ring-primary-500/40' : ''}"
	{onclick}
	title="{label}{count !== undefined ? ` (${count})` : ''}"
>
	<IconComponent size={14} class="flex-shrink-0" />
	<span class="whitespace-nowrap">{label}</span>
	{#if count !== undefined && count > 0}
		<span class="min-w-[1.25rem] rounded-full px-1 py-0.5 text-[10px] font-semibold leading-none
					 {active
					 	? 'bg-primary-500/20 text-primary-300'
					 	: 'bg-zinc-300 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'}">
			{count}
		</span>
	{/if}
</button>
