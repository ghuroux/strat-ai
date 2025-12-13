<script lang="ts">
	import { onMount } from 'svelte';
	import { arenaStore } from '$lib/stores/arena.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import type { LiteLLMModel } from '$lib/types/api';

	let models = $state<LiteLLMModel[]>([]);
	let loading = $state(true);
	let error = $state(false);

	let selectedModels = $derived(arenaStore.selectedModels);

	// Model family definitions for grouping
	type ModelFamily = {
		name: string;
		patterns: string[];
		isOpenSource: boolean;
		order: number;
	};

	const MODEL_FAMILIES: ModelFamily[] = [
		// Proprietary models
		{ name: 'Claude', patterns: ['claude'], isOpenSource: false, order: 1 },
		{ name: 'GPT', patterns: ['gpt-5', 'gpt-4'], isOpenSource: false, order: 2 },
		{ name: 'OpenAI o-series', patterns: ['o3', 'o4'], isOpenSource: false, order: 3 },
		{ name: 'Gemini', patterns: ['gemini'], isOpenSource: false, order: 4 },
		// Open-source models
		{ name: 'Llama', patterns: ['llama'], isOpenSource: true, order: 5 },
		{ name: 'DeepSeek', patterns: ['deepseek'], isOpenSource: true, order: 6 },
		{ name: 'Mistral', patterns: ['mistral'], isOpenSource: true, order: 7 },
		{ name: 'Amazon Nova', patterns: ['nova'], isOpenSource: true, order: 8 },
	];

	// Get model family
	function getModelFamily(modelId: string): ModelFamily | undefined {
		const lowerModelId = modelId.toLowerCase();
		return MODEL_FAMILIES.find(family =>
			family.patterns.some(pattern => lowerModelId.includes(pattern))
		);
	}

	// Group and sort models
	interface ModelGroup {
		category: 'proprietary' | 'opensource';
		family: string;
		models: LiteLLMModel[];
		order: number;
	}

	let groupedModels = $derived.by(() => {
		const groups: Map<string, ModelGroup> = new Map();

		for (const model of models) {
			const family = getModelFamily(model.id);
			const familyName = family?.name ?? 'Other';
			const category = family?.isOpenSource ? 'opensource' : 'proprietary';
			const key = `${category}-${familyName}`;

			if (!groups.has(key)) {
				groups.set(key, {
					category,
					family: familyName,
					models: [],
					order: family?.order ?? 99
				});
			}
			groups.get(key)!.models.push(model);
		}

		const result = Array.from(groups.values());
		result.sort((a, b) => a.order - b.order);
		return result;
	});

	// Separate proprietary and open source groups
	let proprietaryGroups = $derived(groupedModels.filter(g => g.category === 'proprietary'));
	let opensourceGroups = $derived(groupedModels.filter(g => g.category === 'opensource'));

	// Get display name from model capabilities
	function getDisplayName(modelId: string): string {
		const caps = modelCapabilitiesStore.capabilities[modelId];
		if (caps?.displayName) return caps.displayName;
		const parts = modelId.split('/');
		return parts[parts.length - 1];
	}

	// Get provider from model capabilities
	function getProvider(modelId: string): string {
		const caps = modelCapabilitiesStore.capabilities[modelId];
		if (caps?.provider) return caps.provider;
		const parts = modelId.split('/');
		if (parts.length > 1) return parts[0];
		if (modelId.includes('claude')) return 'anthropic';
		if (modelId.includes('gpt') || modelId.startsWith('o3') || modelId.startsWith('o4')) return 'openai';
		return 'other';
	}

	// Get provider color
	function getProviderColor(provider: string): string {
		switch (provider.toLowerCase()) {
			case 'anthropic':
				return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
			case 'openai':
				return 'bg-green-500/20 text-green-400 border-green-500/30';
			case 'google':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
			case 'meta':
				return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
			case 'deepseek':
				return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
			case 'mistral':
				return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
			case 'amazon':
				return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
			default:
				return 'bg-surface-600/50 text-surface-400 border-surface-500/30';
		}
	}

	// Check if model supports features
	function modelHasThinking(modelId: string): boolean {
		return modelCapabilitiesStore.supportsThinking(modelId);
	}

	function modelHasVision(modelId: string): boolean {
		return modelCapabilitiesStore.supportsVision(modelId);
	}

	// Get context window badge
	function getContextBadge(modelId: string): string {
		const contextWindow = modelCapabilitiesStore.getContextWindow(modelId);
		return modelCapabilitiesStore.formatContextWindow(contextWindow);
	}

	// Get selection order (1-4) or null if not selected
	function getSelectionOrder(modelId: string): number | null {
		const index = selectedModels.indexOf(modelId);
		return index >= 0 ? index + 1 : null;
	}

	// Toggle model selection
	function toggleModel(modelId: string) {
		arenaStore.toggleSelectedModel(modelId);
	}

	// Check if can select more
	function canSelectMore(): boolean {
		return selectedModels.length < 4;
	}

	onMount(async () => {
		loading = true;
		error = false;

		try {
			const response = await fetch('/api/models');
			if (!response.ok) throw new Error('Failed to fetch models');
			const data = await response.json();
			models = data.data || [];

			if (!modelCapabilitiesStore.isLoaded) {
				await modelCapabilitiesStore.fetch();
			}
		} catch (err) {
			error = true;
			console.error('Failed to fetch models:', err);
		} finally {
			loading = false;
		}
	});
</script>

<div class="arena-model-selector">
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
			<span class="ml-3 text-surface-400">Loading models...</span>
		</div>
	{:else if error}
		<div class="text-center py-8">
			<p class="text-red-400 mb-4">Failed to load models</p>
			<button
				type="button"
				onclick={() => location.reload()}
				class="btn-secondary"
			>
				Retry
			</button>
		</div>
	{:else}
		<!-- Selection status -->
		<div class="flex items-center justify-between mb-4">
			<div class="text-sm text-surface-400">
				<span class="text-surface-100 font-medium">{selectedModels.length}</span> of 4 models selected
			</div>
			{#if selectedModels.length > 0}
				<button
					type="button"
					onclick={() => arenaStore.clearSelectedModels()}
					class="text-sm text-surface-400 hover:text-surface-200 transition-colors"
				>
					Clear selection
				</button>
			{/if}
		</div>

		<!-- Proprietary Models Section -->
		{#if proprietaryGroups.length > 0}
			<div class="mb-6">
				<div class="flex items-center gap-2 mb-3 pb-2 border-b border-surface-700">
					<svg class="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
					</svg>
					<span class="text-sm font-semibold text-surface-300 uppercase tracking-wider">Proprietary</span>
				</div>

				{#each proprietaryGroups as group}
					<div class="mb-4">
						<div class="text-xs font-medium text-surface-500 mb-2 px-1">{group.family}</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
							{#each group.models as model}
								{@const isSelected = selectedModels.includes(model.id)}
								{@const order = getSelectionOrder(model.id)}
								{@const provider = getProvider(model.id)}
								{@const disabled = !isSelected && !canSelectMore()}

								<button
									type="button"
									onclick={() => toggleModel(model.id)}
									{disabled}
									class="relative p-4 rounded-xl border text-left transition-all duration-200
										   {isSelected
											? 'bg-primary-500/10 border-primary-500/50 shadow-glow'
											: disabled
												? 'bg-surface-800/30 border-surface-700/50 opacity-50 cursor-not-allowed'
												: 'bg-surface-800/50 border-surface-700 hover:border-surface-600 hover:bg-surface-800'}"
								>
									{#if order}
										<div class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
											{order}
										</div>
									{/if}

									<div class="flex items-center gap-2 mb-2">
										<span class="px-2 py-0.5 rounded text-xs font-medium border {getProviderColor(provider)}">
											{provider}
										</span>
									</div>

									<div class="font-medium text-surface-100 mb-2 truncate">
										{getDisplayName(model.id)}
									</div>

									<div class="flex items-center gap-2 text-xs">
										<span class="text-surface-500">{getContextBadge(model.id)}</span>
										{#if modelHasThinking(model.id)}
											<span class="text-amber-400" title="Extended thinking">
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
												</svg>
											</span>
										{/if}
										{#if modelHasVision(model.id)}
											<span class="text-blue-400" title="Vision support">
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
												</svg>
											</span>
										{/if}
									</div>

									<div class="absolute bottom-3 right-3">
										<div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
													{isSelected ? 'bg-primary-500 border-primary-500' : 'border-surface-600'}">
											{#if isSelected}
												<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
												</svg>
											{/if}
										</div>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Open Source Models Section -->
		{#if opensourceGroups.length > 0}
			<div>
				<div class="flex items-center gap-2 mb-3 pb-2 border-b border-surface-700">
					<svg class="w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
					<span class="text-sm font-semibold text-surface-300 uppercase tracking-wider">Open Source</span>
				</div>

				{#each opensourceGroups as group}
					<div class="mb-4">
						<div class="text-xs font-medium text-surface-500 mb-2 px-1">{group.family}</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
							{#each group.models as model}
								{@const isSelected = selectedModels.includes(model.id)}
								{@const order = getSelectionOrder(model.id)}
								{@const provider = getProvider(model.id)}
								{@const disabled = !isSelected && !canSelectMore()}

								<button
									type="button"
									onclick={() => toggleModel(model.id)}
									{disabled}
									class="relative p-4 rounded-xl border text-left transition-all duration-200
										   {isSelected
											? 'bg-primary-500/10 border-primary-500/50 shadow-glow'
											: disabled
												? 'bg-surface-800/30 border-surface-700/50 opacity-50 cursor-not-allowed'
												: 'bg-surface-800/50 border-surface-700 hover:border-surface-600 hover:bg-surface-800'}"
								>
									{#if order}
										<div class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
											{order}
										</div>
									{/if}

									<div class="flex items-center gap-2 mb-2">
										<span class="px-2 py-0.5 rounded text-xs font-medium border {getProviderColor(provider)}">
											{provider}
										</span>
									</div>

									<div class="font-medium text-surface-100 mb-2 truncate">
										{getDisplayName(model.id)}
									</div>

									<div class="flex items-center gap-2 text-xs">
										<span class="text-surface-500">{getContextBadge(model.id)}</span>
										{#if modelHasThinking(model.id)}
											<span class="text-amber-400" title="Extended thinking">
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
												</svg>
											</span>
										{/if}
										{#if modelHasVision(model.id)}
											<span class="text-blue-400" title="Vision support">
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
												</svg>
											</span>
										{/if}
									</div>

									<div class="absolute bottom-3 right-3">
										<div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
													{isSelected ? 'bg-primary-500 border-primary-500' : 'border-surface-600'}">
											{#if isSelected}
												<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
												</svg>
											{/if}
										</div>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
