<script lang="ts">
	import { onMount } from 'svelte';
	import { X, Plus, Shuffle, Grid3x3, ChevronDown, ChevronUp, Lightbulb, Eye, Check } from 'lucide-svelte';
	import { arenaStore } from '$lib/stores/arena.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import { getSmartPick, getSurpriseMe, getProviderColor } from '$lib/utils/smart-pick';
	import type { TemplateCategory } from '$lib/config/battle-templates';
	import type { LiteLLMModel } from '$lib/types/api';
	import ArenaModelSelector from './ArenaModelSelector.svelte';

	interface Props {
		category?: TemplateCategory;
	}

	let { category = 'general' }: Props = $props();

	let gridExpanded = $state(false);
	let gridContainerRef: HTMLDivElement | undefined = $state();
	let models = $state<LiteLLMModel[]>([]);
	let loading = $state(true);
	let smartPickApplied = $state(false);

	// Click outside handler to collapse grid
	function handleClickOutside(event: MouseEvent) {
		if (gridExpanded && gridContainerRef && !gridContainerRef.contains(event.target as Node)) {
			// Check if click was on the toggle button (which has its own handler)
			const target = event.target as HTMLElement;
			if (!target.closest('.grid-toggle-btn')) {
				gridExpanded = false;
			}
		}
	}

	let selectedModels = $derived(arenaStore.selectedModels);

	// Load models on mount
	onMount(async () => {
		loading = true;
		try {
			const response = await fetch('/api/models');
			if (!response.ok) throw new Error('Failed to fetch models');
			const data = await response.json();
			models = data.data || [];

			if (!modelCapabilitiesStore.isLoaded) {
				await modelCapabilitiesStore.fetch();
			}

			// Apply smart pick if no models selected yet
			if (selectedModels.length === 0 && !smartPickApplied) {
				applySmartPick();
			}
		} catch (err) {
			console.error('Failed to fetch models:', err);
		} finally {
			loading = false;
		}
	});

	// Apply smart pick based on category
	function applySmartPick() {
		const picks = getSmartPick(category);
		// Only select models that exist in our loaded models
		const validPicks = picks.filter(id =>
			models.some(m => m.id === id) || modelCapabilitiesStore.capabilities[id]
		);

		arenaStore.clearSelectedModels();
		for (const modelId of validPicks) {
			arenaStore.toggleSelectedModel(modelId);
		}
		smartPickApplied = true;
	}

	// Surprise me - random diverse selection
	function handleSurpriseMe() {
		const picks = getSurpriseMe(Math.floor(Math.random() * 3) + 2); // 2-4 models
		arenaStore.clearSelectedModels();
		for (const modelId of picks) {
			arenaStore.toggleSelectedModel(modelId);
		}
	}

	// Remove a model from selection
	function removeModel(modelId: string) {
		arenaStore.toggleSelectedModel(modelId);
	}

	// Get display info for a model
	function getModelInfo(modelId: string) {
		const caps = modelCapabilitiesStore.capabilities[modelId];
		return {
			displayName: caps?.displayName || modelId,
			provider: caps?.provider || 'unknown',
			hasThinking: caps?.supportsThinking || false,
			hasVision: caps?.supportsVision || false
		};
	}

	// Handle Done button
	function handleDone() {
		gridExpanded = false;
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-semibold text-surface-100">Models</h2>
		<div class="flex items-center gap-2 text-sm text-surface-400">
			<span class="text-surface-100 font-medium">{selectedModels.length}</span> of 4 selected
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="w-5 h-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
			<span class="ml-3 text-surface-400 text-sm">Loading models...</span>
		</div>
	{:else}
		<!-- Selected Models Cards -->
		<div class="flex flex-wrap gap-2">
			{#each selectedModels as modelId, index}
				{@const info = getModelInfo(modelId)}
				<div
					class="group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
						bg-surface-800/70 border-surface-600 hover:border-surface-500"
				>
					<!-- Selection order badge -->
					<span class="flex items-center justify-center w-5 h-5 rounded-full bg-primary-500 text-white text-xs font-bold">
						{index + 1}
					</span>

					<!-- Provider badge -->
					<span class="px-1.5 py-0.5 rounded text-[10px] font-medium border {getProviderColor(info.provider)}">
						{info.provider}
					</span>

					<!-- Model name -->
					<span class="text-sm text-surface-100 font-medium">{info.displayName}</span>

					<!-- Capability icons -->
					<div class="flex items-center gap-1">
						{#if info.hasThinking}
							<Lightbulb class="w-3.5 h-3.5 text-amber-400" />
						{/if}
						{#if info.hasVision}
							<Eye class="w-3.5 h-3.5 text-blue-400" />
						{/if}
					</div>

					<!-- Remove button -->
					<button
						type="button"
						onclick={() => removeModel(modelId)}
						class="ml-1 p-0.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-200 transition-colors"
						title="Remove model"
					>
						<X class="w-4 h-4" />
					</button>
				</div>
			{/each}

			<!-- Add model button (when less than 4 selected) -->
			{#if selectedModels.length < 4}
				<button
					type="button"
					onclick={() => gridExpanded = true}
					class="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed transition-all
						border-surface-600 hover:border-surface-500 text-surface-400 hover:text-surface-200"
				>
					<Plus class="w-4 h-4" />
					<span class="text-sm">Add model</span>
				</button>
			{/if}
		</div>

		<!-- Action buttons -->
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={handleSurpriseMe}
				class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
					text-surface-300 hover:text-surface-100 hover:bg-surface-800"
			>
				<Shuffle class="w-4 h-4" />
				<span>Surprise me</span>
			</button>

			<button
				type="button"
				onclick={() => gridExpanded = !gridExpanded}
				class="grid-toggle-btn flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
					text-surface-300 hover:text-surface-100 hover:bg-surface-800"
			>
				<Grid3x3 class="w-4 h-4" />
				<span>Select from all models</span>
				{#if gridExpanded}
					<ChevronUp class="w-4 h-4" />
				{:else}
					<ChevronDown class="w-4 h-4" />
				{/if}
			</button>

			{#if selectedModels.length > 0}
				<button
					type="button"
					onclick={() => arenaStore.clearSelectedModels()}
					class="ml-auto text-sm text-surface-400 hover:text-surface-200 transition-colors"
				>
					Clear all
				</button>
			{/if}
		</div>

		<!-- Expandable full model grid -->
		{#if gridExpanded}
			<div
				bind:this={gridContainerRef}
				class="mt-4 p-4 rounded-xl bg-surface-800/30 border border-surface-700"
			>
				<ArenaModelSelector />

				<!-- Done button -->
				<div class="flex justify-end mt-4 pt-4 border-t border-surface-700">
					<button
						type="button"
						onclick={handleDone}
						class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
							bg-primary-500/20 text-primary-300 border border-primary-500/30
							hover:bg-primary-500/30 hover:border-primary-500/50"
					>
						<Check class="w-4 h-4" />
						<span>Done</span>
					</button>
				</div>
			</div>
		{/if}

		<!-- Hint about continuing conversations -->
		<p class="text-xs text-surface-500 mt-2">
			<span class="text-surface-400">Tip:</span> After the battle, you can continue the conversation with your favorite model.
		</p>
	{/if}
</div>
