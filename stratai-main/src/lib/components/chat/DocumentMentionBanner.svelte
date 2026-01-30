<!--
	DocumentMentionBanner.svelte

	Phase 3: Intelligent Detection — shows a subtle banner when the user
	mentions a document that exists in the space but isn't activated in context.

	Appears above the ChatInput. Non-intrusive: single line, dismissible,
	one suggestion at a time.
-->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import { FileText, Plus, X } from 'lucide-svelte';

	interface Props {
		filename: string;
		onactivate: () => void;
		ondismiss: () => void;
	}

	let { filename, onactivate, ondismiss }: Props = $props();

	function handleActivate() {
		onactivate();
	}
</script>

<div
	class="flex items-center gap-2 px-3 py-2 mb-1.5 rounded-lg
	       bg-amber-50 dark:bg-amber-900/15
	       border border-amber-200/60 dark:border-amber-700/30
	       text-xs"
	transition:slide={{ duration: 150 }}
>
	<FileText size={13} class="text-amber-600 dark:text-amber-400 shrink-0" />

	<span class="text-amber-800 dark:text-amber-300 min-w-0 truncate">
		<strong class="font-medium">{filename}</strong>
		<span class="text-amber-600 dark:text-amber-400/80"> is available but not in context</span>
	</span>

	<div class="flex items-center gap-1 ml-auto shrink-0">
		<button
			type="button"
			class="flex items-center gap-1 px-2 py-0.5 rounded
			       text-[11px] font-medium
			       text-emerald-700 dark:text-emerald-400
			       bg-emerald-100 dark:bg-emerald-900/30
			       hover:bg-emerald-200 dark:hover:bg-emerald-800/40
			       transition-colors"
			onclick={handleActivate}
		>
			<Plus size={11} />
			Activate
		</button>

		<button
			type="button"
			class="p-0.5 rounded
			       text-amber-400 dark:text-amber-500
			       hover:text-amber-600 dark:hover:text-amber-300
			       hover:bg-amber-100 dark:hover:bg-amber-800/30
			       transition-colors"
			title="Dismiss"
			onclick={ondismiss}
		>
			<X size={12} />
		</button>
	</div>
</div>
