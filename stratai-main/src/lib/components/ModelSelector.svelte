<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { X } from 'lucide-svelte';
	import type { LiteLLMModel } from '$lib/types/api';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';

	// AUTO mode identifier
	const AUTO_MODEL_ID = 'auto';

	// Mobile detection for bottom sheet vs dropdown
	let isMobile = $state(false);

	// Svelte 5: Use $props - selectedModel can be passed as prop or managed internally
	let {
		selectedModel: propSelectedModel = '',
		disabled = false,
		routedModel = null,
		onchange,
		onproviderchange
	}: {
		selectedModel?: string;
		disabled?: boolean;
		routedModel?: string | null; // The model actually used when AUTO is selected
		onchange?: (model: string) => void;
		onproviderchange?: (provider: 'anthropic' | 'openai' | 'google') => void;
	} = $props();

	// Internal state for the selected model - sync with prop
	let internalSelectedModel = $state('');

	// Provider preference for AUTO mode
	let autoProvider = $state<'anthropic' | 'openai' | 'google'>('anthropic');

	// Sync internal state with prop when prop changes (including initial value)
	$effect(() => {
		if (propSelectedModel !== undefined) {
			internalSelectedModel = propSelectedModel;
		}
	});

	// Computed value that uses internal state
	let selectedModel = $derived(internalSelectedModel);

	// Check if AUTO mode is active
	let isAutoMode = $derived(selectedModel.toLowerCase() === AUTO_MODEL_ID);

	// Svelte 5: Use $state for local reactive state
	let models = $state<LiteLLMModel[]>([]);
	let loading = $state(true);
	let error = $state(false);
	let isOpen = $state(false);
	let dropdownRef: HTMLDivElement | undefined = $state();
	let isCollapsed = $state(false);

	// Responsive state: collapse at <768px (mobile breakpoint)
	// This shows abbreviated model names on mobile for better fit
	// Also track if we're on mobile for bottom sheet rendering
	$effect(() => {
		const handleResize = () => {
			isCollapsed = window.innerWidth < 768;
			isMobile = window.innerWidth < 768;
		};
		handleResize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});

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

	// Check if model is open source
	function isOpenSource(modelId: string): boolean {
		const family = getModelFamily(modelId);
		return family?.isOpenSource ?? false;
	}

	// Deduplicate models by preferring IDs in MODEL_CAPABILITIES
	// This handles LiteLLM returning multiple aliases for the same model
	// (e.g., claude-sonnet-4-20250514 AND claude-sonnet-4-5-20250514)
	let deduplicatedModels = $derived.by(() => {
		// Group models by their display name
		const byDisplayName = new Map<string, LiteLLMModel[]>();

		for (const model of models) {
			const displayName = getDisplayName(model.id);

			// Debug logging for Sonnet models
			if (model.id.includes('sonnet-4')) {
				console.log('[ModelSelector] Sonnet 4 model:', {
					id: model.id,
					displayName,
					mode: model.mode,
					contextWindow: model.max_input_tokens || model.max_tokens
				});
			}

			if (!byDisplayName.has(displayName)) {
				byDisplayName.set(displayName, []);
			}
			byDisplayName.get(displayName)!.push(model);
		}

		// For each display name group, select the best representative model ID
		const result: LiteLLMModel[] = [];

		for (const [displayName, duplicates] of byDisplayName) {
			if (duplicates.length === 1) {
				// No duplicates - keep the model as-is
				result.push(duplicates[0]);
				continue;
			}

			// Multiple models with same display name - pick the canonical one

			// Strategy 1: Prefer model ID that exists in MODEL_CAPABILITIES (our source of truth)
			const inCapabilities = duplicates.find(m =>
				modelCapabilitiesStore.capabilities[m.id] !== undefined
			);

			if (inCapabilities) {
				result.push(inCapabilities);
				continue;
			}

			// Strategy 2: No match in capabilities - prefer shortest ID (usually canonical)
			// e.g., "claude-sonnet-4-5" is shorter than "claude-sonnet-4-5-20250514"
			const shortest = duplicates.reduce((a, b) =>
				a.id.length <= b.id.length ? a : b
			);
			result.push(shortest);
		}

		return result;
	});

	// Group and sort models
	interface ModelGroup {
		category: 'proprietary' | 'opensource';
		family: string;
		models: LiteLLMModel[];
		order: number;
	}

	let groupedModels = $derived.by(() => {
		const groups: Map<string, ModelGroup> = new Map();

		for (const model of deduplicatedModels) {
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

		// Convert to array and sort
		const result = Array.from(groups.values());
		result.sort((a, b) => a.order - b.order);

		return result;
	});

	// Separate proprietary and open source groups
	let proprietaryGroups = $derived(groupedModels.filter(g => g.category === 'proprietary'));
	let opensourceGroups = $derived(groupedModels.filter(g => g.category === 'opensource'));

	// Get abbreviated name for collapsed state
	function getAbbreviatedName(modelId: string): string {
		const displayName = getDisplayName(modelId);

		if (modelId.toLowerCase() === AUTO_MODEL_ID) {
			return 'AUTO';
		}

		// "Claude Sonnet 4.5" → "CS 4.5"
		// "GPT-4 Turbo" → "GPT-4"
		const words = displayName.split(/[\s-]/);
		if (words.length >= 2) {
			// Check if second word is a number (e.g., "GPT-4")
			if (/^\d/.test(words[1])) {
				return `${words[0].slice(0, 3)} ${words[1]}`;
			}
			// Otherwise create initials
			const initials = words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
			const version = words.find(w => /^\d/.test(w));
			return version ? `${initials} ${version}` : initials;
		}

		// Fallback: truncate to 8 chars
		return displayName.slice(0, 8);
	}

	// Get display name from model capabilities or fallback to ID parsing
	function getDisplayName(modelId: string): string {
		// First try exact match
		const caps = modelCapabilitiesStore.capabilities[modelId];
		if (caps?.displayName) {
			return caps.displayName;
		}

		// Try to find a matching base model by normalizing the ID
		// This handles LiteLLM returning variations like:
		// - "claude-sonnet-4.5" → "claude-sonnet-4-5" (dot to dash)
		// - "claude-sonnet-4-5-20250514" → "claude-sonnet-4-5" (date suffix)
		// - "claude-sonnet-4-5-v2" → "claude-sonnet-4-5" (version suffix)
		const normalizedId = modelId
			.replace(/\./g, '-') // Convert dots to dashes (e.g., 4.5 → 4-5)
			.replace(/-\d{8}$/, '') // Remove date suffix (e.g., -20250514)
			.replace(/-v\d+$/, ''); // Remove version suffix (e.g., -v2)

		if (normalizedId !== modelId) {
			const normalizedCaps = modelCapabilitiesStore.capabilities[normalizedId];
			if (normalizedCaps?.displayName) {
				return normalizedCaps.displayName;
			}
		}

		// Fallback: parse from model ID
		const parts = modelId.split('/');
		return parts[parts.length - 1];
	}

	// Get provider from model capabilities or fallback to ID parsing
	function getProvider(modelId: string): string {
		const caps = modelCapabilitiesStore.capabilities[modelId];
		if (caps?.provider) {
			return caps.provider;
		}
		// Fallback: parse from model ID
		const parts = modelId.split('/');
		if (parts.length > 1) {
			return parts[0];
		}
		if (modelId.includes('claude')) return 'anthropic';
		if (modelId.includes('gpt') || modelId.startsWith('o3') || modelId.startsWith('o4')) return 'openai';
		return 'other';
	}

	// Get provider color
	function getProviderColor(provider: string): string {
		switch (provider.toLowerCase()) {
			case 'anthropic':
				return 'bg-orange-500/20 text-orange-400';
			case 'openai':
				return 'bg-green-500/20 text-green-400';
			case 'google':
				return 'bg-blue-500/20 text-blue-400';
			case 'meta':
				return 'bg-indigo-500/20 text-indigo-400';
			case 'deepseek':
				return 'bg-cyan-500/20 text-cyan-400';
			case 'mistral':
				return 'bg-purple-500/20 text-purple-400';
			case 'amazon':
				return 'bg-yellow-500/20 text-yellow-400';
			default:
				return 'bg-surface-600/50 text-surface-400';
		}
	}

	// Check model capabilities for badges
	function modelHasThinking(modelId: string): boolean {
		return modelCapabilitiesStore.supportsThinking(modelId);
	}

	function modelHasVision(modelId: string): boolean {
		return modelCapabilitiesStore.supportsVision(modelId);
	}

	// Format context window for display
	function getContextBadge(modelId: string): string {
		const contextWindow = modelCapabilitiesStore.getContextWindow(modelId);
		return modelCapabilitiesStore.formatContextWindow(contextWindow);
	}

	onMount(() => {
		// Fetch models on mount
		fetchModels();

		// Close dropdown on click outside
		function handleClickOutside(e: MouseEvent) {
			if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
				isOpen = false;
			}
		}
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	async function fetchModels() {
		loading = true;
		error = false;

		try {
			const response = await fetch('/api/models');
			if (!response.ok) {
				throw new Error('Failed to fetch models');
			}
			const data = await response.json();
			models = data.data || [];

			// Also fetch capabilities if not already loaded
			if (!modelCapabilitiesStore.isLoaded) {
				await modelCapabilitiesStore.fetch();
			}

			// Try to restore saved model preference
			const savedModel = settingsStore.selectedModel;
			if (savedModel) {
				// Check if it's AUTO or a valid model
				if (savedModel.toLowerCase() === AUTO_MODEL_ID) {
					internalSelectedModel = AUTO_MODEL_ID;
				} else if (models.some((m) => m.id === savedModel)) {
					internalSelectedModel = savedModel;
				}
			} else if (!internalSelectedModel) {
				// Default to AUTO mode for new users
				internalSelectedModel = AUTO_MODEL_ID;
				onchange?.(AUTO_MODEL_ID);
			}
		} catch (err) {
			error = true;
			toastStore.error('Failed to load available models');
			console.error('Failed to fetch models:', err);
		} finally {
			loading = false;
		}
	}

	function selectModel(modelId: string) {
		internalSelectedModel = modelId;
		isOpen = false;
		onchange?.(modelId);
	}

	function selectAuto() {
		internalSelectedModel = AUTO_MODEL_ID;
		isOpen = false;
		onchange?.(AUTO_MODEL_ID);
	}

	function selectProvider(provider: 'anthropic' | 'openai' | 'google') {
		autoProvider = provider;
		onproviderchange?.(provider);
	}

	// Get provider badge color for AUTO mode
	function getAutoProviderColor(provider: string): string {
		switch (provider) {
			case 'anthropic':
				return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
			case 'openai':
				return 'bg-green-500/20 text-green-400 border-green-500/30';
			case 'google':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
			default:
				return 'bg-surface-600/50 text-surface-400 border-surface-600';
		}
	}

	function toggleDropdown(e: MouseEvent) {
		e.stopPropagation();
		if (!disabled && !loading && !error) {
			isOpen = !isOpen;
		}
	}

	function closeModal() {
		isOpen = false;
	}

	// Prevent body scroll when mobile modal is open
	$effect(() => {
		if (isMobile && isOpen) {
			document.body.style.overflow = 'hidden';
			return () => {
				document.body.style.overflow = '';
			};
		}
	});
</script>

<div class="relative" bind:this={dropdownRef}>
	{#if loading}
		<div class="select-field animate-pulse bg-surface-700 text-surface-500 flex items-center gap-2">
			<div class="w-4 h-4 rounded-full border-2 border-surface-500 border-t-transparent animate-spin"></div>
			<span>Loading models...</span>
		</div>
	{:else if error}
		<div class="flex items-center gap-2">
			<div class="select-field bg-red-900/30 border-red-700 text-red-300 flex-1">Failed to load</div>
			<button type="button" onclick={fetchModels} class="btn-secondary text-sm px-3 py-2" aria-label="Retry loading models">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
			</button>
		</div>
	{:else}
		<!-- Custom dropdown trigger -->
		<button
			type="button"
			onclick={toggleDropdown}
			{disabled}
			class="w-full px-2.5 py-2 md:px-4 md:py-2.5 border rounded-lg md:rounded-xl
				   text-left flex items-center justify-between gap-1.5 md:gap-2
				   focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
				   transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
				   {isAutoMode
					? 'bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border-purple-500/40 hover:border-purple-400/60'
					: 'bg-surface-800 border-surface-700 hover:border-surface-600'}"
		>
			<div class="flex items-center gap-2 min-w-0">
				{#if isAutoMode}
					<!-- AUTO mode display -->
					<span class="px-1.5 py-0.5 rounded text-xs font-semibold bg-gradient-to-r from-purple-500/30 to-indigo-500/30 text-purple-300 border border-purple-500/30 flex items-center gap-1">
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
						AUTO
					</span>
					{#if routedModel && !isCollapsed}
						<span class="text-surface-400 text-sm">using</span>
						<span class="px-1.5 py-0.5 rounded text-xs font-medium {getProviderColor(getProvider(routedModel))}">
							{getProvider(routedModel)}
						</span>
						<span class="truncate text-surface-200">{getDisplayName(routedModel)}</span>
					{:else if routedModel && isCollapsed}
						<span class="truncate text-surface-200 text-sm">
							{getAbbreviatedName(routedModel)}
						</span>
					{:else if !routedModel && !isCollapsed}
						<span class="text-surface-400 text-sm">Smart model routing</span>
					{/if}
				{:else if selectedModel}
					<span class="px-1.5 py-0.5 rounded text-xs font-medium {getProviderColor(getProvider(selectedModel))}">
						{getProvider(selectedModel)}
					</span>
					{#if isCollapsed}
						<span class="truncate text-surface-100 text-sm">
							{getAbbreviatedName(selectedModel)}
						</span>
					{:else}
						<span class="truncate text-surface-100">{getDisplayName(selectedModel)}</span>
						<!-- Capability badges for selected model (only when not collapsed) -->
						<div class="flex items-center gap-1 ml-1">
							{#if modelHasThinking(selectedModel)}
								<span class="text-amber-400" title="Supports extended thinking">
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
									</svg>
								</span>
							{/if}
							{#if modelHasVision(selectedModel)}
								<span class="text-blue-400" title="Supports image analysis">
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								</span>
							{/if}
						</div>
					{/if}
				{:else}
					<span class="text-surface-500">Select a model</span>
				{/if}
			</div>
			<svg
				class="w-4 h-4 text-surface-500 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		<!-- Dropdown menu (desktop) / Bottom sheet (mobile) -->
		{#if isOpen && !isMobile}
			<!-- Desktop: Traditional dropdown -->
			<div
				class="absolute z-50 min-w-full w-max mt-2 py-2 bg-surface-800 border border-surface-700 rounded-xl shadow-xl"
				transition:fade={{ duration: 150 }}
			>
				{#if models.length === 0}
					<div class="px-4 py-3 text-sm text-surface-500">No models available</div>
				{:else}
					<div class="max-h-[32rem] overflow-y-auto">
						<!-- AUTO Mode Option -->
						<div class="px-3 py-2 text-xs font-semibold text-purple-300 uppercase tracking-wider bg-gradient-to-r from-purple-900/40 to-indigo-900/40 flex items-center gap-2">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
							Smart Routing
						</div>
						<button
							type="button"
							onclick={selectAuto}
							class="w-full px-4 py-3 text-left flex items-center gap-3
								   transition-colors whitespace-nowrap
								   {isAutoMode
									? 'bg-purple-900/30 border-l-2 border-purple-500'
									: 'hover:bg-surface-700'}"
						>
							<span class="px-2 py-1 rounded-md text-xs font-bold bg-gradient-to-r from-purple-500/30 to-indigo-500/30 text-purple-200 border border-purple-500/40 flex items-center gap-1.5">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
								</svg>
								AUTO
							</span>
							<div class="flex flex-col">
								<span class="text-surface-100 font-medium">Automatic Model Selection</span>
								<span class="text-xs text-surface-500">Optimal model for each query</span>
							</div>
							{#if isAutoMode}
								<svg class="w-4 h-4 text-purple-400 shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							{/if}
						</button>

						<!-- Provider preference (shown when AUTO is selected) -->
						{#if isAutoMode}
							<div class="px-4 py-2 border-t border-b border-surface-700 bg-surface-850/50">
								<div class="text-xs text-surface-500 mb-2">Prefer provider:</div>
								<div class="flex gap-2">
									<button
										type="button"
										onclick={() => selectProvider('anthropic')}
										class="px-2.5 py-1 rounded-md text-xs font-medium border transition-all
											   {autoProvider === 'anthropic'
												? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
												: 'bg-surface-700 text-surface-400 border-surface-600 hover:bg-surface-600'}"
									>
										Claude
									</button>
									<button
										type="button"
										onclick={() => selectProvider('openai')}
										class="px-2.5 py-1 rounded-md text-xs font-medium border transition-all
											   {autoProvider === 'openai'
												? 'bg-green-500/20 text-green-300 border-green-500/40'
												: 'bg-surface-700 text-surface-400 border-surface-600 hover:bg-surface-600'}"
									>
										GPT
									</button>
									<button
										type="button"
										onclick={() => selectProvider('google')}
										class="px-2.5 py-1 rounded-md text-xs font-medium border transition-all
											   {autoProvider === 'google'
												? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
												: 'bg-surface-700 text-surface-400 border-surface-600 hover:bg-surface-600'}"
									>
										Gemini
									</button>
								</div>
							</div>
						{/if}

						<!-- Divider -->
						<div class="my-2 border-t border-surface-700"></div>

						<!-- Proprietary Models Section -->
						{#if proprietaryGroups.length > 0}
							<div class="px-3 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider bg-surface-900/50 sticky top-0 z-10 flex items-center gap-2">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
								</svg>
								Proprietary
							</div>
							{#each proprietaryGroups as group}
								<!-- Family header -->
								<div class="px-4 py-1.5 text-xs font-medium text-surface-500 bg-surface-850">
									{group.family}
								</div>
								{#each group.models as model}
									<button
										type="button"
										onclick={() => selectModel(model.id)}
										class="w-full px-4 py-2 text-left flex items-center gap-3
											   hover:bg-surface-700 transition-colors whitespace-nowrap
											   {model.id === selectedModel ? 'bg-surface-700/50' : ''}"
									>
										<span class="px-1.5 py-0.5 rounded text-xs font-medium shrink-0 {getProviderColor(getProvider(model.id))}">
											{getProvider(model.id)}
										</span>
										<span class="text-surface-100">{getDisplayName(model.id)}</span>

										<!-- Capability badges -->
										<div class="flex items-center gap-1.5 shrink-0 ml-auto">
											<span class="text-xs text-surface-500">{getContextBadge(model.id)}</span>
											{#if modelHasThinking(model.id)}
												<span class="text-amber-400" title="Supports extended thinking">
													<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
													</svg>
												</span>
											{/if}
											{#if modelHasVision(model.id)}
												<span class="text-blue-400" title="Supports image analysis">
													<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
												</span>
											{/if}
										</div>

										{#if model.id === selectedModel}
											<svg class="w-4 h-4 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</button>
								{/each}
							{/each}
						{/if}

						<!-- Open Source Models Section -->
						{#if opensourceGroups.length > 0}
							<div class="px-3 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider bg-surface-900/50 sticky top-0 z-10 flex items-center gap-2 mt-1 border-t border-surface-700">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
								Open Source
							</div>
							{#each opensourceGroups as group}
								<!-- Family header -->
								<div class="px-4 py-1.5 text-xs font-medium text-surface-500 bg-surface-850">
									{group.family}
								</div>
								{#each group.models as model}
									<button
										type="button"
										onclick={() => selectModel(model.id)}
										class="w-full px-4 py-2 text-left flex items-center gap-3
											   hover:bg-surface-700 transition-colors whitespace-nowrap
											   {model.id === selectedModel ? 'bg-surface-700/50' : ''}"
									>
										<span class="px-1.5 py-0.5 rounded text-xs font-medium shrink-0 {getProviderColor(getProvider(model.id))}">
											{getProvider(model.id)}
										</span>
										<span class="text-surface-100">{getDisplayName(model.id)}</span>

										<!-- Capability badges -->
										<div class="flex items-center gap-1.5 shrink-0 ml-auto">
											<span class="text-xs text-surface-500">{getContextBadge(model.id)}</span>
											{#if modelHasThinking(model.id)}
												<span class="text-amber-400" title="Supports extended thinking">
													<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
													</svg>
												</span>
											{/if}
											{#if modelHasVision(model.id)}
												<span class="text-blue-400" title="Supports image analysis">
													<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
												</span>
											{/if}
										</div>

										{#if model.id === selectedModel}
											<svg class="w-4 h-4 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</button>
								{/each}
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Mobile: Full-screen bottom sheet modal -->
		{#if isOpen && isMobile}
			<!-- Backdrop -->
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div
				class="fixed inset-0 bg-black/60 z-50"
				onclick={closeModal}
				transition:fade={{ duration: 150 }}
			></div>

			<!-- Bottom sheet -->
			<div
				class="fixed inset-x-0 bottom-0 z-50 bg-surface-900 rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
				transition:fly={{ y: 300, duration: 250 }}
			>
				<!-- Handle bar -->
				<div class="flex justify-center pt-3 pb-1">
					<div class="w-10 h-1 bg-surface-600 rounded-full"></div>
				</div>

				<!-- Header -->
				<div class="flex items-center justify-between px-4 py-3 border-b border-surface-700">
					<h2 class="text-lg font-semibold text-white">Select Model</h2>
					<button
						type="button"
						onclick={closeModal}
						class="p-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				<!-- Content (scrollable) -->
				<div class="flex-1 overflow-y-auto">
					{#if models.length === 0}
						<div class="px-4 py-8 text-center text-surface-500">No models available</div>
					{:else}
						<!-- AUTO Mode Option -->
						<div class="px-4 py-3 text-xs font-semibold text-purple-300 uppercase tracking-wider bg-gradient-to-r from-purple-900/40 to-indigo-900/40 flex items-center gap-2">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
							Smart Routing
						</div>
						<button
							type="button"
							onclick={selectAuto}
							class="w-full px-4 py-4 text-left flex items-center gap-3
								   transition-colors active:bg-surface-700
								   {isAutoMode
									? 'bg-purple-900/30 border-l-4 border-purple-500'
									: ''}"
						>
							<span class="px-2.5 py-1.5 rounded-lg text-sm font-bold bg-gradient-to-r from-purple-500/30 to-indigo-500/30 text-purple-200 border border-purple-500/40 flex items-center gap-2">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
								</svg>
								AUTO
							</span>
							<div class="flex flex-col flex-1">
								<span class="text-white font-medium">Automatic Model Selection</span>
								<span class="text-sm text-surface-400">Optimal model for each query</span>
							</div>
							{#if isAutoMode}
								<svg class="w-5 h-5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							{/if}
						</button>

						<!-- Provider preference (shown when AUTO is selected) -->
						{#if isAutoMode}
							<div class="px-4 py-3 border-t border-b border-surface-700 bg-surface-850/50">
								<div class="text-sm text-surface-400 mb-2">Prefer provider:</div>
								<div class="flex gap-2">
									<button
										type="button"
										onclick={() => selectProvider('anthropic')}
										class="flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all
											   {autoProvider === 'anthropic'
												? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
												: 'bg-surface-700 text-surface-400 border-surface-600 active:bg-surface-600'}"
									>
										Claude
									</button>
									<button
										type="button"
										onclick={() => selectProvider('openai')}
										class="flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all
											   {autoProvider === 'openai'
												? 'bg-green-500/20 text-green-300 border-green-500/40'
												: 'bg-surface-700 text-surface-400 border-surface-600 active:bg-surface-600'}"
									>
										GPT
									</button>
									<button
										type="button"
										onclick={() => selectProvider('google')}
										class="flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all
											   {autoProvider === 'google'
												? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
												: 'bg-surface-700 text-surface-400 border-surface-600 active:bg-surface-600'}"
									>
										Gemini
									</button>
								</div>
							</div>
						{/if}

						<!-- Proprietary Models Section -->
						{#if proprietaryGroups.length > 0}
							<div class="px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider bg-surface-900/50 sticky top-0 z-10 flex items-center gap-2 border-t border-surface-700">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
								</svg>
								Proprietary
							</div>
							{#each proprietaryGroups as group}
								<!-- Family header -->
								<div class="px-4 py-2 text-xs font-medium text-surface-500 bg-surface-850">
									{group.family}
								</div>
								{#each group.models as model}
									<button
										type="button"
										onclick={() => selectModel(model.id)}
										class="w-full px-4 py-3 text-left flex items-center gap-3
											   transition-colors active:bg-surface-700
											   {model.id === selectedModel ? 'bg-surface-700/50 border-l-4 border-primary-500' : ''}"
									>
										<span class="px-2 py-1 rounded-lg text-xs font-medium shrink-0 {getProviderColor(getProvider(model.id))}">
											{getProvider(model.id)}
										</span>
										<span class="text-white flex-1 truncate">{getDisplayName(model.id)}</span>

										<!-- Capability badges -->
										<div class="flex items-center gap-2 shrink-0">
											{#if modelHasThinking(model.id)}
												<span class="text-amber-400" title="Supports extended thinking">
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
													</svg>
												</span>
											{/if}
											{#if modelHasVision(model.id)}
												<span class="text-blue-400" title="Supports image analysis">
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
												</span>
											{/if}
										</div>

										{#if model.id === selectedModel}
											<svg class="w-5 h-5 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</button>
								{/each}
							{/each}
						{/if}

						<!-- Open Source Models Section -->
						{#if opensourceGroups.length > 0}
							<div class="px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider bg-surface-900/50 sticky top-0 z-10 flex items-center gap-2 border-t border-surface-700">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
								Open Source
							</div>
							{#each opensourceGroups as group}
								<!-- Family header -->
								<div class="px-4 py-2 text-xs font-medium text-surface-500 bg-surface-850">
									{group.family}
								</div>
								{#each group.models as model}
									<button
										type="button"
										onclick={() => selectModel(model.id)}
										class="w-full px-4 py-3 text-left flex items-center gap-3
											   transition-colors active:bg-surface-700
											   {model.id === selectedModel ? 'bg-surface-700/50 border-l-4 border-primary-500' : ''}"
									>
										<span class="px-2 py-1 rounded-lg text-xs font-medium shrink-0 {getProviderColor(getProvider(model.id))}">
											{getProvider(model.id)}
										</span>
										<span class="text-white flex-1 truncate">{getDisplayName(model.id)}</span>

										<!-- Capability badges -->
										<div class="flex items-center gap-2 shrink-0">
											{#if modelHasThinking(model.id)}
												<span class="text-amber-400" title="Supports extended thinking">
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
													</svg>
												</span>
											{/if}
											{#if modelHasVision(model.id)}
												<span class="text-blue-400" title="Supports image analysis">
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
													</svg>
												</span>
											{/if}
										</div>

										{#if model.id === selectedModel}
											<svg class="w-5 h-5 text-primary-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</button>
								{/each}
							{/each}
						{/if}

						<!-- Bottom padding for safe area -->
						<div class="h-8"></div>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>
