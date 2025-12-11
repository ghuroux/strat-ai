<script lang="ts">
	interface Props {
		disabled?: boolean;
		isGenerating?: boolean;
		hasSummary?: boolean;
		onclick: () => void;
	}

	let { disabled = false, isGenerating = false, hasSummary = false, onclick }: Props = $props();

	function handleClick() {
		if (!disabled && !isGenerating) {
			onclick();
		}
	}

	let title = $derived(
		isGenerating ? 'Generating summary...' :
		hasSummary ? 'Regenerate summary' :
		'Summarize conversation'
	);
</script>

<button
	type="button"
	onclick={handleClick}
	disabled={disabled || isGenerating}
	class="flex items-center justify-center w-10 h-10 rounded-xl
		   transition-all duration-200
		   {isGenerating
			? 'bg-primary-600/20 text-primary-400 ring-2 ring-primary-500/50'
			: hasSummary
				? 'bg-primary-600/10 text-primary-400 hover:bg-primary-600/20'
				: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'}
		   {disabled ? 'opacity-50 cursor-not-allowed' : ''}"
>
	{#if isGenerating}
		<!-- Spinning loader -->
		<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
	{:else}
		<!-- Document/Summary icon -->
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
		</svg>
	{/if}
</button>

<!-- Tooltip (appears above on hover) -->
<div class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-800 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none {isGenerating ? 'text-primary-400' : hasSummary ? 'text-primary-400' : 'text-surface-300'}">
	{title}
</div>
