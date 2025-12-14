<script lang="ts">
	import { fade } from 'svelte/transition';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';

	interface Props {
		currentModel: string;
		onSelect: (modelId: string) => void;
		onClose: () => void;
	}

	let { currentModel, onSelect, onClose }: Props = $props();

	// Get available models grouped by provider (excluding current model)
	let modelsByProvider = $derived.by(() => {
		const grouped: Record<string, Array<{ id: string; displayName: string }>> = {};

		for (const [modelId, caps] of Object.entries(modelCapabilitiesStore.capabilities)) {
			// Skip current model
			if (modelId === currentModel) continue;

			const provider = caps.provider || 'other';
			if (!grouped[provider]) {
				grouped[provider] = [];
			}
			grouped[provider].push({
				id: modelId,
				displayName: caps.displayName || modelId
			});
		}

		// Sort each provider's models alphabetically
		for (const models of Object.values(grouped)) {
			models.sort((a, b) => a.displayName.localeCompare(b.displayName));
		}

		return grouped;
	});

	// Provider display info
	const providerInfo: Record<string, { name: string; color: string }> = {
		anthropic: { name: 'Anthropic', color: 'text-amber-400' },
		openai: { name: 'OpenAI', color: 'text-emerald-400' },
		google: { name: 'Google', color: 'text-blue-400' },
		meta: { name: 'Meta', color: 'text-sky-400' },
		amazon: { name: 'Amazon', color: 'text-orange-400' },
		deepseek: { name: 'DeepSeek', color: 'text-violet-400' },
		mistral: { name: 'Mistral', color: 'text-rose-400' }
	};

	// Preferred provider order
	const providerOrder = ['anthropic', 'openai', 'google', 'meta', 'amazon', 'deepseek', 'mistral'];

	let sortedProviders = $derived(
		Object.keys(modelsByProvider).sort((a, b) => {
			const aIndex = providerOrder.indexOf(a);
			const bIndex = providerOrder.indexOf(b);
			if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
			if (aIndex === -1) return 1;
			if (bIndex === -1) return -1;
			return aIndex - bIndex;
		})
	);

	function handleSelect(modelId: string) {
		onSelect(modelId);
		onClose();
	}

	// Close on click outside
	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	// Close on Escape
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50"
	onclick={handleBackdropClick}
	transition:fade={{ duration: 150 }}
>
	<div
		class="absolute bg-surface-800 border border-surface-600 rounded-xl shadow-2xl overflow-hidden"
		style="top: var(--dropdown-top, 50%); left: var(--dropdown-left, 50%); transform: translate(-50%, 0);"
	>
		<!-- Header -->
		<div class="px-4 py-3 border-b border-surface-700 bg-surface-850">
			<div class="flex items-center gap-2">
				<svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
				</svg>
				<span class="text-sm font-medium text-surface-200">Choose Model for Second Opinion</span>
			</div>
		</div>

		<!-- Model List -->
		<div class="max-h-80 overflow-y-auto">
			{#each sortedProviders as provider}
				{@const models = modelsByProvider[provider]}
				{@const info = providerInfo[provider] || { name: provider, color: 'text-surface-400' }}

				<div class="py-2">
					<div class="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider {info.color}">
						{info.name}
					</div>

					{#each models as model}
						<button
							type="button"
							class="w-full px-4 py-2 text-left text-sm text-surface-200 hover:bg-surface-700 transition-colors flex items-center gap-2"
							onclick={() => handleSelect(model.id)}
						>
							<span class="flex-1">{model.displayName}</span>
							<svg class="w-4 h-4 text-surface-500 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</button>
					{/each}
				</div>
			{/each}

			{#if sortedProviders.length === 0}
				<div class="px-4 py-6 text-center text-surface-500 text-sm">
					No other models available
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Custom scrollbar */
	.max-h-80::-webkit-scrollbar {
		width: 6px;
	}

	.max-h-80::-webkit-scrollbar-track {
		background: transparent;
	}

	.max-h-80::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.max-h-80::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
