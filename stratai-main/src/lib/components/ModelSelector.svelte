<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { LiteLLMModel } from '$lib/types/api';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';

	// Svelte 5: Use $props with $bindable for two-way binding
	let {
		selectedModel = $bindable(''),
		disabled = false,
		onchange
	}: {
		selectedModel?: string;
		disabled?: boolean;
		onchange?: (model: string) => void;
	} = $props();

	// Svelte 5: Use $state for local reactive state
	let models = $state<LiteLLMModel[]>([]);
	let loading = $state(true);
	let error = $state(false);
	let isOpen = $state(false);
	let dropdownRef: HTMLDivElement | undefined = $state();

	// Get display name from model ID
	function getDisplayName(modelId: string): string {
		const parts = modelId.split('/');
		return parts[parts.length - 1];
	}

	// Get provider from model ID
	function getProvider(modelId: string): string {
		const parts = modelId.split('/');
		if (parts.length > 1) {
			return parts[0];
		}
		if (modelId.includes('claude')) return 'anthropic';
		if (modelId.includes('gpt')) return 'openai';
		return 'other';
	}

	// Get provider color
	function getProviderColor(provider: string): string {
		switch (provider.toLowerCase()) {
			case 'anthropic':
				return 'bg-orange-500/20 text-orange-400';
			case 'openai':
				return 'bg-green-500/20 text-green-400';
			case 'bedrock':
				return 'bg-yellow-500/20 text-yellow-400';
			default:
				return 'bg-surface-600/50 text-surface-400';
		}
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

			// Try to restore saved model preference
			const savedModel = settingsStore.selectedModel;
			if (savedModel && models.some((m) => m.id === savedModel)) {
				selectedModel = savedModel;
			} else if (!selectedModel && models.length > 0) {
				selectedModel = models[0].id;
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
		selectedModel = modelId;
		isOpen = false;
		onchange?.(modelId);
	}

	function toggleDropdown() {
		if (!disabled && !loading && !error) {
			isOpen = !isOpen;
		}
	}
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
			class="w-full px-4 py-2.5 bg-surface-800 border border-surface-700 rounded-xl
				   text-left flex items-center justify-between gap-2
				   hover:border-surface-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
				   transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			<div class="flex items-center gap-2 min-w-0">
				{#if selectedModel}
					<span class="px-1.5 py-0.5 rounded text-xs font-medium {getProviderColor(getProvider(selectedModel))}">
						{getProvider(selectedModel)}
					</span>
					<span class="truncate text-surface-100">{getDisplayName(selectedModel)}</span>
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

		<!-- Dropdown menu -->
		{#if isOpen}
			<div
				class="absolute z-50 w-full mt-2 py-2 bg-surface-800 border border-surface-700 rounded-xl shadow-xl"
				transition:fade={{ duration: 150 }}
			>
				{#if models.length === 0}
					<div class="px-4 py-3 text-sm text-surface-500">No models available</div>
				{:else}
					<div class="max-h-96 overflow-y-auto">
						{#each models as model}
							<button
								type="button"
								onclick={() => selectModel(model.id)}
								class="w-full px-4 py-2.5 text-left flex items-center gap-3
									   hover:bg-surface-700 transition-colors
									   {model.id === selectedModel ? 'bg-surface-700/50' : ''}"
							>
								<span class="px-1.5 py-0.5 rounded text-xs font-medium {getProviderColor(getProvider(model.id))}">
									{getProvider(model.id)}
								</span>
								<span class="flex-1 truncate text-surface-100">{getDisplayName(model.id)}</span>
								{#if model.id === selectedModel}
									<svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
