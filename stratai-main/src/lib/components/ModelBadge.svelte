<script lang="ts">
	import {
		getModelDisplayName,
		getModelProvider,
		getProviderColor,
		modelSupportsThinking,
		modelSupportsVision
	} from '$lib/utils/model-display';

	interface Props {
		model: string;
		compact?: boolean; // If true, show minimal version (just provider + name)
	}

	let { model, compact = false }: Props = $props();

	let provider = $derived(getModelProvider(model));
	let displayName = $derived(getModelDisplayName(model));
	let providerColor = $derived(getProviderColor(provider));
	let hasThinking = $derived(modelSupportsThinking(model));
	let hasVision = $derived(modelSupportsVision(model));
</script>

{#if model}
	<div
		class="model-badge flex items-center gap-2 px-3 py-1.5 bg-surface-800 border border-surface-700 rounded-lg"
		title="Model locked for this conversation"
	>
		<!-- Provider badge -->
		<span class="px-1.5 py-0.5 rounded text-xs font-medium {providerColor}">
			{provider}
		</span>

		<!-- Model name -->
		<span class="text-sm text-surface-200 truncate max-w-[150px]">
			{displayName}
		</span>

		<!-- Capability icons (unless compact mode) -->
		{#if !compact}
			<div class="flex items-center gap-1">
				{#if hasThinking}
					<span class="text-amber-400" title="Supports extended thinking">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
						</svg>
					</span>
				{/if}
				{#if hasVision}
					<span class="text-blue-400" title="Supports image analysis">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
						</svg>
					</span>
				{/if}
			</div>
		{/if}

		<!-- Lock icon to indicate model is fixed -->
		<svg class="w-3.5 h-3.5 text-surface-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
		</svg>
	</div>
{/if}
