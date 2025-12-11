<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';

	interface Props {
		disabled?: boolean;
	}

	let { disabled = false }: Props = $props();

	let isEnabled = $derived(settingsStore.webSearchEnabled);

	function toggleSearch() {
		if (!disabled) {
			settingsStore.toggleWebSearch();
		}
	}
</script>

<button
	type="button"
	onclick={toggleSearch}
	disabled={disabled}
	class="search-toggle flex items-center justify-center w-10 h-10 rounded-xl
		   transition-all duration-200
		   {isEnabled
			? 'bg-primary-600/20 text-primary-400 ring-2 ring-primary-500/50 hover:bg-primary-600/30'
			: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'}
		   {disabled ? 'opacity-50 cursor-not-allowed' : ''}"
	title={isEnabled ? 'Web search enabled - click to disable' : 'Enable web search'}
>
	<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		{#if isEnabled}
			<!-- Globe with glow effect when active -->
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
			/>
		{:else}
			<!-- Simple globe icon when inactive -->
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
			/>
		{/if}
	</svg>
</button>

{#if isEnabled}
	<div class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-800 rounded text-xs text-primary-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
		Web search on
	</div>
{/if}
