<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';

	interface Props {
		disabled?: boolean;
	}

	let { disabled = false }: Props = $props();

	// Check if the current model supports thinking
	let modelSupportsThinking = $derived(settingsStore.canUseExtendedThinking);
	let isEnabled = $derived(settingsStore.extendedThinkingEnabled && modelSupportsThinking);

	// Compute effective disabled state
	let effectiveDisabled = $derived(disabled || !modelSupportsThinking);

	// Get model display name for tooltip
	let modelName = $derived(modelCapabilitiesStore.currentDisplayName);

	function toggleThinking() {
		if (!effectiveDisabled) {
			settingsStore.toggleExtendedThinking();
		}
	}

	// Dynamic tooltip based on model support
	let tooltip = $derived.by(() => {
		if (!modelSupportsThinking) {
			return `Extended thinking not supported by ${modelName}`;
		}
		return isEnabled
			? 'Extended thinking enabled - click to disable'
			: 'Enable extended thinking for deeper reasoning';
	});
</script>

<button
	type="button"
	onclick={toggleThinking}
	disabled={effectiveDisabled}
	class="thinking-toggle flex items-center justify-center w-10 h-10 rounded-xl
		   transition-all duration-200
		   {isEnabled
			? 'bg-amber-600/20 text-amber-400 ring-2 ring-amber-500/50 hover:bg-amber-600/30'
			: modelSupportsThinking
				? 'text-surface-400 hover:text-surface-200 hover:bg-surface-700'
				: 'text-surface-500 opacity-50'}
		   {effectiveDisabled ? 'cursor-not-allowed' : ''}"
	title={tooltip}
>
	<!-- Brain/thinking icon -->
	<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		{#if isEnabled}
			<!-- Brain icon with sparkles when active -->
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
			/>
		{:else}
			<!-- Simple lightbulb outline when inactive -->
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
			/>
		{/if}
	</svg>
</button>

{#if isEnabled}
	<div class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-800 rounded text-xs text-amber-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
		Thinking on
	</div>
{/if}
