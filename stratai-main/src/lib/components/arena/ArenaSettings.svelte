<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { arenaStore } from '$lib/stores/arena.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import ThinkingToggle from '$lib/components/chat/ThinkingToggle.svelte';
	import SearchToggle from '$lib/components/chat/SearchToggle.svelte';
	import { Eye, EyeOff } from 'lucide-svelte';

	interface Props {
		reasoningEffort: 'low' | 'medium' | 'high';
		blindMode: boolean;
		onReasoningEffortChange: (effort: 'low' | 'medium' | 'high') => void;
		onBlindModeChange: (enabled: boolean) => void;
	}

	let { reasoningEffort, blindMode, onReasoningEffortChange, onBlindModeChange }: Props = $props();

	// Check if any selected model is an OpenAI reasoning model
	let hasOpenAIReasoningModel = $derived(
		arenaStore.selectedModels.some((modelId) => {
			const caps = modelCapabilitiesStore.capabilities[modelId];
			return caps?.provider === 'openai' && caps?.supportsThinking && caps?.reasoningEffortLevels;
		})
	);

	// Check if any selected model supports thinking (Claude or OpenAI)
	let hasThinkingModel = $derived(
		arenaStore.selectedModels.some((modelId) => {
			return modelCapabilitiesStore.supportsThinking(modelId);
		})
	);

	const effortLevels: { value: 'low' | 'medium' | 'high'; label: string; description: string }[] = [
		{ value: 'low', label: 'Low', description: 'Faster, less thorough' },
		{ value: 'medium', label: 'Medium', description: 'Balanced reasoning' },
		{ value: 'high', label: 'High', description: 'Deeper analysis' }
	];
</script>

<div class="arena-settings flex flex-wrap items-center gap-4">
	<!-- Standard toggles -->
	<div class="flex items-center gap-3">
		<ThinkingToggle />
		<SearchToggle />
	</div>

	<!-- Reasoning Effort Selector (for OpenAI models) -->
	{#if hasOpenAIReasoningModel && settingsStore.extendedThinkingEnabled}
		<div class="flex items-center gap-2 px-3 py-1.5 bg-surface-800/50 rounded-lg border border-surface-700">
			<span class="text-xs text-surface-400">Reasoning:</span>
			<div class="flex gap-1">
				{#each effortLevels as level}
					<button
						type="button"
						onclick={() => onReasoningEffortChange(level.value)}
						class="px-2 py-0.5 text-xs rounded transition-all
							   {reasoningEffort === level.value
								? 'bg-primary-500 text-white'
								: 'bg-surface-700 text-surface-400 hover:bg-surface-600 hover:text-surface-200'}"
						title={level.description}
					>
						{level.label}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Blind Mode Toggle -->
	<button
		type="button"
		onclick={() => onBlindModeChange(!blindMode)}
		class="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm
			   {blindMode
				? 'bg-accent-500/20 border-accent-500/50 text-accent-400'
				: 'bg-surface-800/50 border-surface-700 text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
		title="Hide model names until you vote (reduces bias)"
	>
		{#if blindMode}
			<EyeOff class="w-4 h-4" />
		{:else}
			<Eye class="w-4 h-4" />
		{/if}
		<span class="hidden sm:inline">Blind</span>
	</button>
</div>
