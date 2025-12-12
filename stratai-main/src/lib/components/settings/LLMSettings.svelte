<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import {
		modelSupportsThinking as configSupportsThinking,
		getModelCapabilities,
		getMaxOutputTokens,
		getContextWindow
	} from '$lib/config/model-capabilities';

	// Local state for inputs (allows live editing without constant store updates)
	let temperature = $state(settingsStore.temperature);
	let maxTokens = $state(settingsStore.maxTokens);
	let systemPrompt = $state(settingsStore.systemPrompt);
	let thinkingBudget = $state(settingsStore.thinkingBudgetTokens);
	let contextThreshold = $state(settingsStore.contextThresholdPercent);

	// Web search feature toggle (admin-level control)
	let webSearchFeatureEnabled = $derived(settingsStore.webSearchFeatureEnabled);

	// Extended thinking settings - now based on both user setting AND model capability
	// Use config file directly for reliability (API might not be loaded yet)
	let extendedThinkingEnabled = $derived(settingsStore.extendedThinkingEnabled);
	let modelSupportsThinking = $derived(configSupportsThinking(settingsStore.selectedModel));

	// Model capabilities - use config file as fallback if API not loaded
	let modelMaxOutputTokens = $derived(
		modelCapabilitiesStore.isLoaded
			? modelCapabilitiesStore.currentMaxOutputTokens
			: getMaxOutputTokens(settingsStore.selectedModel)
	);
	let modelContextWindow = $derived(
		modelCapabilitiesStore.isLoaded
			? modelCapabilitiesStore.currentContextWindow
			: getContextWindow(settingsStore.selectedModel)
	);
	let modelName = $derived(
		modelCapabilitiesStore.isLoaded
			? modelCapabilitiesStore.currentDisplayName
			: (getModelCapabilities(settingsStore.selectedModel)?.displayName ?? settingsStore.selectedModel)
	);

	// Dynamic token presets based on model max output
	let tokenPresets = $derived.by(() => {
		const max = modelMaxOutputTokens;
		const presets = [];

		// Always include Short
		presets.push({ label: 'Short', value: Math.min(1024, max) });

		// Medium if model supports it
		if (max >= 2048) {
			presets.push({ label: 'Medium', value: Math.min(2048, max) });
		}

		// Long if model supports it
		if (max >= 4096) {
			presets.push({ label: 'Long', value: Math.min(4096, max) });
		}

		// Very Long for high-output models
		if (max >= 16384) {
			presets.push({ label: 'XLong', value: Math.min(16384, max) });
		}

		// Max always at model's max
		if (max > (presets[presets.length - 1]?.value ?? 0)) {
			presets.push({ label: 'Max', value: max });
		}

		return presets;
	});

	// Sync local state when store values change (e.g., when model changes)
	$effect(() => {
		const storeMax = settingsStore.maxTokens;
		if (maxTokens !== storeMax) {
			maxTokens = storeMax;
		}
	});

	$effect(() => {
		const storeBudget = settingsStore.thinkingBudgetTokens;
		if (thinkingBudget !== storeBudget) {
			thinkingBudget = storeBudget;
		}
	});

	// Update store when slider/input changes
	function handleTemperatureChange(e: Event) {
		const value = parseFloat((e.target as HTMLInputElement).value);
		temperature = value;
		settingsStore.setTemperature(value);
	}

	function handleMaxTokensChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value, 10);
		if (!isNaN(value)) {
			maxTokens = Math.min(value, modelMaxOutputTokens);
			settingsStore.setMaxTokens(maxTokens);
		}
	}

	function handleSystemPromptChange(e: Event) {
		const value = (e.target as HTMLTextAreaElement).value;
		systemPrompt = value;
	}

	function handleSystemPromptBlur() {
		settingsStore.setSystemPrompt(systemPrompt);
	}

	function setPreset(value: number) {
		maxTokens = Math.min(value, modelMaxOutputTokens);
		settingsStore.setMaxTokens(maxTokens);
	}

	function resetToDefaults() {
		settingsStore.resetLLMSettings();
		temperature = settingsStore.temperature;
		maxTokens = settingsStore.maxTokens;
		systemPrompt = settingsStore.systemPrompt;
	}

	function toggleWebSearchFeature() {
		settingsStore.setWebSearchFeatureEnabled(!webSearchFeatureEnabled);
	}

	function handleThinkingBudgetChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value, 10);
		if (!isNaN(value) && value >= 1024) {
			const maxBudget = modelMaxOutputTokens - 1000;
			thinkingBudget = Math.min(value, maxBudget);
			settingsStore.setThinkingBudgetTokens(thinkingBudget);
		}
	}

	// Dynamic thinking presets based on model max output
	let thinkingPresets = $derived.by(() => {
		const maxBudget = Math.max(1024, modelMaxOutputTokens - 1000);
		const presets = [];

		presets.push({ label: 'Quick', value: Math.min(5000, maxBudget) });

		if (maxBudget >= 10000) {
			presets.push({ label: 'Normal', value: Math.min(10000, maxBudget) });
		}

		if (maxBudget >= 20000) {
			presets.push({ label: 'Deep', value: Math.min(20000, maxBudget) });
		}

		if (maxBudget >= 50000) {
			presets.push({ label: 'Max', value: Math.min(50000, maxBudget) });
		} else if (maxBudget > (presets[presets.length - 1]?.value ?? 0)) {
			presets.push({ label: 'Max', value: maxBudget });
		}

		return presets;
	});

	function setThinkingPreset(value: number) {
		thinkingBudget = value;
		settingsStore.setThinkingBudgetTokens(value);
	}

	// Context threshold presets
	const contextThresholdPresets: Array<{ label: string; value: 0 | 25 | 50 | 75 }> = [
		{ label: 'Always', value: 0 },
		{ label: '25%', value: 25 },
		{ label: '50%', value: 50 },
		{ label: '75%', value: 75 }
	];

	function setContextThreshold(value: 0 | 25 | 50 | 75) {
		contextThreshold = value;
		settingsStore.setContextThresholdPercent(value);
	}

	// Character count for system prompt
	let promptCharCount = $derived(systemPrompt.length);

	// Format token count for display
	function formatTokens(tokens: number): string {
		if (tokens >= 1000000) {
			return `${(tokens / 1000000).toFixed(tokens % 1000000 === 0 ? 0 : 1)}M`;
		}
		if (tokens >= 1000) {
			return `${Math.round(tokens / 1000)}K`;
		}
		return tokens.toString();
	}
</script>

<div class="space-y-6">
	<!-- Model Info Card -->
	<div class="p-3 bg-surface-800/50 rounded-lg border border-surface-700">
		<div class="flex items-center justify-between mb-2">
			<span class="text-sm font-medium text-surface-300">{modelName}</span>
		</div>
		<div class="flex gap-4 text-xs text-surface-500">
			<div class="flex items-center gap-1">
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
				</svg>
				<span>Context: {formatTokens(modelContextWindow)}</span>
			</div>
			<div class="flex items-center gap-1">
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				<span>Max Output: {formatTokens(modelMaxOutputTokens)}</span>
			</div>
		</div>
		<div class="flex gap-3 mt-2 text-xs">
			{#if modelSupportsThinking}
				<span class="flex items-center gap-1 text-amber-400">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
					</svg>
					Thinking
				</span>
			{/if}
			{#if settingsStore.canUseVision}
				<span class="flex items-center gap-1 text-blue-400">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
					</svg>
					Vision
				</span>
			{/if}
		</div>
	</div>

	<!-- Temperature -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<span class="block text-sm font-medium text-surface-300">Temperature</span>
			<span class="text-sm font-mono text-primary-400">{temperature.toFixed(2)}</span>
		</div>
		<input
			type="range"
			min="0"
			max="2"
			step="0.05"
			value={temperature}
			oninput={handleTemperatureChange}
			class="llm-slider w-full"
		/>
		<div class="flex justify-between text-xs text-surface-500">
			<span>Precise</span>
			<span>Balanced</span>
			<span>Creative</span>
		</div>
	</div>

	<!-- Max Tokens -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<span class="block text-sm font-medium text-surface-300">Max Response Length</span>
			<span class="text-sm text-surface-400">{maxTokens.toLocaleString()} / {formatTokens(modelMaxOutputTokens)}</span>
		</div>
		<input
			type="number"
			min="256"
			max={modelMaxOutputTokens}
			value={maxTokens}
			onchange={handleMaxTokensChange}
			class="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg
				   text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
		/>
		<div class="flex gap-2">
			{#each tokenPresets as preset}
				<button
					type="button"
					onclick={() => setPreset(preset.value)}
					class="flex-1 px-2 py-1.5 text-xs rounded-lg transition-colors
						   {maxTokens === preset.value
							? 'bg-primary-600 text-white'
							: 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-300'}"
				>
					{preset.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- System Prompt -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<span class="block text-sm font-medium text-surface-300">System Prompt</span>
			<span class="text-xs text-surface-500">{promptCharCount}/2000</span>
		</div>
		<textarea
			value={systemPrompt}
			oninput={handleSystemPromptChange}
			onblur={handleSystemPromptBlur}
			placeholder="Custom instructions for the AI (e.g., 'You are a helpful coding assistant...')"
			rows="4"
			maxlength="2000"
			class="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg
				   text-surface-100 text-sm placeholder-surface-500 resize-none
				   focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
		></textarea>
		<p class="text-xs text-surface-500">
			Instructions that will be sent with every message to guide AI behavior.
		</p>
	</div>

	<!-- Web Search Toggle -->
	<div class="flex items-center justify-between py-3 border-t border-surface-700">
		<div class="flex items-center gap-3">
			<svg class="w-5 h-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
			</svg>
			<div>
				<span class="block text-sm font-medium text-surface-300">Web Search</span>
				<span class="text-xs text-surface-500">Allow AI to search the web for current information</span>
			</div>
		</div>
		<button
			type="button"
			onclick={toggleWebSearchFeature}
			class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
				   transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-surface-900
				   {webSearchFeatureEnabled ? 'bg-primary-600' : 'bg-surface-600'}"
			role="switch"
			aria-checked={webSearchFeatureEnabled}
			aria-label="Toggle web search feature"
		>
			<span
				class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
					   transition duration-200 ease-in-out
					   {webSearchFeatureEnabled ? 'translate-x-5' : 'translate-x-0'}"
			></span>
		</button>
	</div>

	<!-- Context Window Alert Threshold -->
	<div class="space-y-3 pt-3 border-t border-surface-700">
		<div class="flex items-center gap-2">
			<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
			</svg>
			<span class="text-sm font-medium text-surface-300">Context Window Alert</span>
		</div>
		<p class="text-xs text-surface-500">
			Show usage indicator when context window reaches this threshold
		</p>
		<div class="flex gap-2">
			{#each contextThresholdPresets as preset}
				<button
					type="button"
					onclick={() => setContextThreshold(preset.value)}
					class="flex-1 px-2 py-1.5 text-xs rounded-lg transition-colors
						   {contextThreshold === preset.value
							? 'bg-emerald-600 text-white'
							: 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-300'}"
				>
					{preset.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Extended Thinking Budget (conditional based on model support) -->
	{#if modelSupportsThinking}
		<div class="space-y-3 pt-3 border-t border-surface-700">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
					</svg>
					<span class="text-sm font-medium text-surface-300">Thinking Budget</span>
				</div>
				<span class="text-sm font-mono text-amber-400">{thinkingBudget.toLocaleString()}</span>
			</div>
			{#if extendedThinkingEnabled}
				<input
					type="range"
					min="1024"
					max={Math.max(1024, modelMaxOutputTokens - 1000)}
					step="1000"
					value={thinkingBudget}
					oninput={handleThinkingBudgetChange}
					class="llm-slider llm-slider-amber w-full"
				/>
				<div class="flex justify-between text-xs text-surface-500">
					<span>Quick</span>
					<span>Normal</span>
					<span>Deep</span>
					<span>Max</span>
				</div>
				<div class="flex gap-2">
					{#each thinkingPresets as preset}
						<button
							type="button"
							onclick={() => setThinkingPreset(preset.value)}
							class="flex-1 px-2 py-1.5 text-xs rounded-lg transition-colors
								   {thinkingBudget === preset.value
									? 'bg-amber-600 text-white'
									: 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-300'}"
						>
							{preset.label}
						</button>
					{/each}
				</div>
			{:else}
				<p class="text-xs text-surface-500">
					Enable extended thinking from the chat input to configure the budget.
				</p>
			{/if}
		</div>
	{:else}
		<div class="p-3 bg-surface-800/30 rounded-lg border border-surface-700/50 mt-3">
			<div class="flex items-center gap-2 text-surface-500">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span class="text-xs">Extended thinking is not available for {modelName}</span>
			</div>
		</div>
	{/if}

	<!-- Reset Button -->
	<button
		type="button"
		onclick={resetToDefaults}
		class="w-full px-4 py-2 text-sm text-surface-400 hover:text-surface-200
			   bg-surface-800 hover:bg-surface-700 border border-surface-700
			   rounded-lg transition-colors"
	>
		Reset to Defaults
	</button>
</div>
