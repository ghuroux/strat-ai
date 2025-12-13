<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ArenaModelSelector from '$lib/components/arena/ArenaModelSelector.svelte';
	import ArenaInput from '$lib/components/arena/ArenaInput.svelte';
	import ArenaGrid from '$lib/components/arena/ArenaGrid.svelte';
	import ArenaResponseCard from '$lib/components/arena/ArenaResponseCard.svelte';
	import ArenaJudgment from '$lib/components/arena/ArenaJudgment.svelte';
	import ArenaBattleList from '$lib/components/arena/ArenaBattleList.svelte';
	import ArenaWelcome from '$lib/components/arena/ArenaWelcome.svelte';
	import { arenaStore, type ArenaModel, type ArenaBattle, type BattleSettings, type ResponseMetrics } from '$lib/stores/arena.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';

	let settingsOpen = $state(false);

	// Derived state from arena store
	let activeBattle = $derived(arenaStore.activeBattle);
	let selectedModels = $derived(arenaStore.selectedModels);
	let isStreaming = $derived(arenaStore.isStreaming);
	let battleList = $derived(arenaStore.battleList);

	// Apply theme on mount
	onMount(() => {
		applyTheme(settingsStore.theme);

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = () => {
			if (settingsStore.theme === 'system') {
				applyTheme('system');
			}
		};
		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	});

	function applyTheme(theme: 'dark' | 'light' | 'system') {
		const root = document.documentElement;
		if (theme === 'system') {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			root.classList.toggle('light', !prefersDark);
			root.classList.toggle('dark', prefersDark);
		} else {
			root.classList.toggle('light', theme === 'light');
			root.classList.toggle('dark', theme === 'dark');
		}
	}

	// Start a battle with the selected models
	async function handleStartBattle(
		prompt: string,
		reasoningEffort: 'low' | 'medium' | 'high' = 'medium',
		blindMode: boolean = false
	) {
		if (selectedModels.length < 2) {
			toastStore.warning('Select at least 2 models to start a battle');
			return;
		}

		if (!prompt.trim()) {
			toastStore.warning('Enter a prompt to start the battle');
			return;
		}

		// Build ArenaModel objects from selected model IDs
		const models: ArenaModel[] = selectedModels.map((id) => ({
			id,
			displayName: modelCapabilitiesStore.getDisplayName(id),
			provider: modelCapabilitiesStore.capabilities[id]?.provider || 'unknown'
		}));

		const settings: BattleSettings = {
			webSearchEnabled: settingsStore.webSearchEnabled,
			extendedThinkingEnabled: settingsStore.extendedThinkingEnabled,
			thinkingBudgetTokens: settingsStore.thinkingBudgetTokens,
			temperature: settingsStore.temperature,
			reasoningEffort,
			blindMode
		};

		// Create the battle
		const battleId = arenaStore.createBattle(prompt, models, settings);

		// Start parallel streaming for all models
		await streamAllModels(battleId, prompt, models, settings);
	}

	// Stream responses from all models in parallel
	async function streamAllModels(
		battleId: string,
		prompt: string,
		models: ArenaModel[],
		settings: BattleSettings
	) {
		const requests = models.map((model) =>
			streamModelResponse(battleId, model, prompt, settings)
		);

		// Wait for all to complete (errors are handled per-model)
		await Promise.allSettled(requests);

		// After all complete, trigger AI judgment if configured
		const battle = arenaStore.getBattle(battleId);
		if (battle && battle.status === 'complete') {
			await requestAiJudgment(battleId);
		}
	}

	// Stream a single model's response
	async function streamModelResponse(
		battleId: string,
		model: ArenaModel,
		prompt: string,
		settings: BattleSettings
	) {
		const controller = new AbortController();
		arenaStore.setAbortController(model.id, controller);

		// Track first token time
		let firstTokenReceived = false;

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: model.id,
					messages: [{ role: 'user', content: prompt }],
					temperature: settings.temperature,
					max_tokens: settingsStore.effectiveMaxTokens,
					searchEnabled: settings.webSearchEnabled,
					thinkingEnabled: settings.extendedThinkingEnabled && modelCapabilitiesStore.supportsThinking(model.id),
					thinkingBudgetTokens: settings.thinkingBudgetTokens,
					reasoningEffort: settings.reasoningEffort
				}),
				signal: controller.signal
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error?.message || 'Request failed');
			}

			// Parse SSE stream
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) throw new Error('No response body');

			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const decoded = decoder.decode(value, { stream: true });
				buffer += decoded;
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6);
						if (data === '[DONE]') continue;

						try {
							const parsed = JSON.parse(data);

							if (parsed.type === 'status') {
								if (parsed.status === 'searching') {
									arenaStore.updateResponse(battleId, model.id, {
										searchStatus: 'searching',
										searchQuery: parsed.query
									});
								} else if (parsed.status === 'processing') {
									arenaStore.updateResponse(battleId, model.id, {
										searchStatus: 'searching',
										searchQuery: undefined
									});
								}
							} else if (parsed.type === 'sources_preview' || parsed.type === 'sources') {
								arenaStore.updateResponse(battleId, model.id, {
									sources: parsed.sources,
									searchStatus: 'complete'
								});
							} else if (parsed.type === 'thinking_start') {
								arenaStore.updateResponse(battleId, model.id, {
									isThinking: true
								});
							} else if (parsed.type === 'thinking') {
								// Track first token time for thinking
								if (!firstTokenReceived) {
									firstTokenReceived = true;
									arenaStore.updateResponse(battleId, model.id, {
										firstTokenAt: Date.now()
									});
								}
								arenaStore.appendToThinking(battleId, model.id, parsed.content);
							} else if (parsed.type === 'thinking_end') {
								arenaStore.updateResponse(battleId, model.id, {
									isThinking: false
								});
							} else if (parsed.type === 'content') {
								// Track first token time for content
								if (!firstTokenReceived) {
									firstTokenReceived = true;
									arenaStore.updateResponse(battleId, model.id, {
										firstTokenAt: Date.now()
									});
								}
								arenaStore.appendToResponse(battleId, model.id, parsed.content);
							} else if (parsed.type === 'usage') {
								// Parse usage metrics from the API
								const metrics: ResponseMetrics = {
									inputTokens: parsed.usage?.prompt_tokens || parsed.usage?.input_tokens,
									outputTokens: parsed.usage?.completion_tokens || parsed.usage?.output_tokens,
									reasoningTokens: parsed.usage?.completion_tokens_details?.reasoning_tokens
								};
								arenaStore.updateResponse(battleId, model.id, { metrics });
							} else if (parsed.type === 'error') {
								throw new Error(parsed.error);
							} else if (parsed.choices?.[0]?.delta?.content) {
								// Track first token time for standard format
								if (!firstTokenReceived) {
									firstTokenReceived = true;
									arenaStore.updateResponse(battleId, model.id, {
										firstTokenAt: Date.now()
									});
								}
								arenaStore.appendToResponse(battleId, model.id, parsed.choices[0].delta.content);
							} else if (parsed.usage) {
								// Usage in standard OpenAI format
								const metrics: ResponseMetrics = {
									inputTokens: parsed.usage.prompt_tokens,
									outputTokens: parsed.usage.completion_tokens,
									reasoningTokens: parsed.usage.completion_tokens_details?.reasoning_tokens
								};
								arenaStore.updateResponse(battleId, model.id, { metrics });
							}
						} catch (e) {
							if (e instanceof Error && e.message !== 'Unexpected token') {
								throw e;
							}
						}
					}
				}
			}

			// Mark as complete
			arenaStore.completeResponse(battleId, model.id);
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				arenaStore.completeResponse(battleId, model.id);
			} else {
				arenaStore.errorResponse(
					battleId,
					model.id,
					err instanceof Error ? err.message : 'Unknown error'
				);
			}
		}
	}

	// Request AI judgment for a battle
	async function requestAiJudgment(battleId: string) {
		const battle = arenaStore.getBattle(battleId);
		if (!battle) return;

		// Skip if any responses errored
		const hasErrors = battle.responses.some((r) => r.error);
		if (hasErrors) {
			toastStore.info('Skipping AI judgment due to response errors');
			return;
		}

		arenaStore.setBattleStatus(battleId, 'judging');
		arenaStore.isJudging = true;

		try {
			const response = await fetch('/api/arena/judge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt: battle.prompt,
					responses: battle.responses.map((r) => ({
						modelId: r.modelId,
						modelName: battle.models.find((m) => m.id === r.modelId)?.displayName || r.modelId,
						content: r.content
					}))
				})
			});

			if (!response.ok) {
				throw new Error('Failed to get AI judgment');
			}

			const judgment = await response.json();
			arenaStore.setAiJudgment(battleId, {
				...judgment,
				timestamp: Date.now()
			});
		} catch (err) {
			toastStore.error('Failed to get AI judgment');
			arenaStore.setBattleStatus(battleId, 'complete');
			arenaStore.isJudging = false;
		}
	}

	// Handle stop all
	function handleStop() {
		arenaStore.abortAll();
	}

	// Handle user vote
	function handleVote(modelId: string) {
		if (!activeBattle) return;
		arenaStore.setUserVote(activeBattle.id, modelId);
	}

	// Handle new battle (clear active)
	function handleNewBattle() {
		arenaStore.setActiveBattle(null);
	}

	// Handle select battle from history
	function handleSelectBattle(battleId: string) {
		arenaStore.setActiveBattle(battleId);
	}

	// Handle rerun battle (create new battle with same prompt/models/settings)
	async function handleRerunBattle(battle: ArenaBattle) {
		// Use the exact models from the original battle
		const models = battle.models;

		// Use the exact settings from the original battle
		const settings = battle.settings;

		// Create a new battle with the same prompt
		const battleId = arenaStore.createBattle(battle.prompt, models, settings);

		// Toast notification
		toastStore.info('Rerunning battle with same configuration');

		// Start parallel streaming for all models
		await streamAllModels(battleId, battle.prompt, models, settings);
	}
</script>

<svelte:head>
	<title>Model Arena - StratAI</title>
</svelte:head>

<div class="h-screen flex flex-col overflow-hidden">
	<!-- Header -->
	<Header onModelChange={() => {}} onSettingsClick={() => (settingsOpen = true)} />

	<div class="flex-1 flex overflow-hidden">
		<!-- Battle History Sidebar -->
		<ArenaBattleList
			battles={battleList}
			activeBattleId={activeBattle?.id || null}
			onSelectBattle={handleSelectBattle}
			onNewBattle={handleNewBattle}
			onRerunBattle={handleRerunBattle}
		/>

		<!-- Main Content -->
		<main class="flex-1 flex flex-col overflow-hidden bg-surface-950">
			{#if !activeBattle}
				<!-- No active battle - Show welcome/setup -->
				<div class="flex-1 overflow-y-auto p-4 md:p-6">
					<div class="max-w-5xl mx-auto">
						<ArenaWelcome />

						<!-- Model Selection -->
						<div class="mt-8">
							<h2 class="text-lg font-semibold text-surface-100 mb-4">Select Models to Compare</h2>
							<ArenaModelSelector />
						</div>
					</div>
				</div>

				<!-- Input -->
				<ArenaInput
					onStartBattle={handleStartBattle}
					disabled={selectedModels.length < 2}
					{isStreaming}
				/>
			{:else}
				<!-- Active battle - Show responses -->
				<div class="flex-1 overflow-y-auto p-4 md:p-6">
					<div class="max-w-7xl mx-auto">
						<!-- Battle prompt header -->
						<div class="mb-6 p-4 bg-surface-800/50 rounded-2xl border border-surface-700">
							<div class="text-sm text-surface-400 mb-1">Prompt</div>
							<div class="text-surface-100">{activeBattle.prompt}</div>
						</div>

						<!-- Response Grid -->
						<ArenaGrid modelCount={activeBattle.models.length}>
							{#each activeBattle.responses as response}
								{@const model = activeBattle.models.find((m) => m.id === response.modelId)}
								<ArenaResponseCard
									{response}
									modelId={response.modelId}
									modelName={model?.displayName || response.modelId}
									provider={model?.provider || 'unknown'}
									isWinner={activeBattle.aiJudgment?.winnerId === response.modelId}
									isUserVote={activeBattle.userVote === response.modelId}
									score={activeBattle.aiJudgment?.scores[response.modelId]}
									onVote={() => handleVote(response.modelId)}
									canVote={activeBattle.status === 'complete' || activeBattle.status === 'judged'}
									blindMode={activeBattle.settings.blindMode}
									hasVoted={!!activeBattle.userVote}
								/>
							{/each}
						</ArenaGrid>

						<!-- AI Judgment -->
						{#if activeBattle.aiJudgment || activeBattle.status === 'judging'}
							<ArenaJudgment
								judgment={activeBattle.aiJudgment}
								isJudging={activeBattle.status === 'judging'}
								models={activeBattle.models}
								userVote={activeBattle.userVote}
							/>
						{/if}
					</div>
				</div>

				<!-- Stop button when streaming -->
				{#if isStreaming}
					<div class="p-4 border-t border-surface-800 bg-surface-900/80 backdrop-blur-sm">
						<div class="max-w-5xl mx-auto flex justify-center">
							<button
								type="button"
								onclick={handleStop}
								class="btn-secondary px-6 py-2.5 flex items-center gap-2"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
									/>
								</svg>
								Stop All
							</button>
						</div>
					</div>
				{:else if activeBattle.status === 'judged' || activeBattle.status === 'complete'}
					<!-- New Battle button -->
					<div class="p-4 border-t border-surface-800 bg-surface-900/80 backdrop-blur-sm">
						<div class="max-w-5xl mx-auto flex justify-center">
							<button
								type="button"
								onclick={handleNewBattle}
								class="btn-primary px-6 py-2.5 flex items-center gap-2"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 4v16m8-8H4"
									/>
								</svg>
								New Battle
							</button>
						</div>
					</div>
				{/if}
			{/if}
		</main>
	</div>
</div>

<!-- Settings Panel -->
<SettingsPanel open={settingsOpen} onclose={() => (settingsOpen = false)} />
