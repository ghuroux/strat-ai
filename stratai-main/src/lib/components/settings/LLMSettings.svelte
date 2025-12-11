<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';

	// Local state for inputs (allows live editing without constant store updates)
	let temperature = $state(settingsStore.temperature);
	let maxTokens = $state(settingsStore.maxTokens);
	let systemPrompt = $state(settingsStore.systemPrompt);
	let thinkingBudget = $state(settingsStore.thinkingBudgetTokens);
	let contextThreshold = $state(settingsStore.contextThresholdPercent);

	// Web search feature toggle (admin-level control)
	let webSearchFeatureEnabled = $derived(settingsStore.webSearchFeatureEnabled);

	// Extended thinking settings
	let extendedThinkingEnabled = $derived(settingsStore.extendedThinkingEnabled);

	// Preset values for max tokens
	const tokenPresets = [
		{ label: 'Short', value: 1024 },
		{ label: 'Medium', value: 2048 },
		{ label: 'Long', value: 4096 },
		{ label: 'Max', value: 8192 }
	];

	// Update store when slider/input changes
	function handleTemperatureChange(e: Event) {
		const value = parseFloat((e.target as HTMLInputElement).value);
		temperature = value;
		settingsStore.setTemperature(value);
	}

	function handleMaxTokensChange(e: Event) {
		const value = parseInt((e.target as HTMLInputElement).value, 10);
		if (!isNaN(value)) {
			maxTokens = value;
			settingsStore.setMaxTokens(value);
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
		maxTokens = value;
		settingsStore.setMaxTokens(value);
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
			thinkingBudget = value;
			settingsStore.setThinkingBudgetTokens(value);
		}
	}

	// Preset values for thinking budget
	const thinkingPresets = [
		{ label: 'Quick', value: 5000 },
		{ label: 'Normal', value: 10000 },
		{ label: 'Deep', value: 20000 },
		{ label: 'Max', value: 50000 }
	];

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
</script>

<div class="space-y-6">
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
			<span class="text-sm text-surface-400">{maxTokens.toLocaleString()} tokens</span>
		</div>
		<input
			type="number"
			min="256"
			max="32000"
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

	<!-- Extended Thinking Budget (only shown when extended thinking is enabled) -->
	{#if extendedThinkingEnabled}
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
			<input
				type="range"
				min="1024"
				max="100000"
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
