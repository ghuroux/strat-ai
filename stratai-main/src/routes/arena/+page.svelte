<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ArenaModelSelector from '$lib/components/arena/ArenaModelSelector.svelte';
	import ArenaCategoryChips from '$lib/components/arena/ArenaCategoryChips.svelte';
	import ArenaContextPicker from '$lib/components/arena/ArenaContextPicker.svelte';
	import ArenaContinueModal from '$lib/components/arena/ArenaContinueModal.svelte';
	import ArenaInput from '$lib/components/arena/ArenaInput.svelte';
	import ArenaGrid from '$lib/components/arena/ArenaGrid.svelte';
	import ArenaResponseCard from '$lib/components/arena/ArenaResponseCard.svelte';
	import ArenaJudgment from '$lib/components/arena/ArenaJudgment.svelte';
	import ArenaWelcome from '$lib/components/arena/ArenaWelcome.svelte';
	import { arenaStore, type ArenaModel, type BattleSettings, type ResponseMetrics } from '$lib/stores/arena.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { areaStore } from '$lib/stores/areas.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { goto } from '$app/navigation';
	import type { TemplateCategory } from '$lib/config/battle-templates';

	let settingsOpen = $state(false);
	let showContinueModal = $state(false);

	// Category selection (default: general)
	let selectedCategory = $state<TemplateCategory>('general');

	// Context selection (optional Space/Area)
	let contextSpaceId = $state<string | null>(null);
	let contextAreaId = $state<string | null>(null);

	// Derived state from arena store
	let activeBattle = $derived(arenaStore.activeBattle);
	let selectedModels = $derived(arenaStore.selectedModels);
	let isStreaming = $derived(arenaStore.isStreaming);

	// Apply theme on mount and load spaces
	onMount(() => {
		applyTheme(settingsStore.theme);
		spacesStore.loadSpaces();

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = () => {
			if (settingsStore.theme === 'system') {
				applyTheme('system');
			}
		};
		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	});

	// Build context prefix from selected area
	function buildContextPrefix(): string {
		if (!contextAreaId) return '';

		const area = areaStore.getAreaById(contextAreaId);
		if (!area?.context) return '';

		return `[Context: ${area.name}]\n${area.context}\n\n---\n\n`;
	}

	// Handle context selection
	function handleContextSelect(spaceId: string | null, areaId: string | null) {
		contextSpaceId = spaceId;
		contextAreaId = areaId;
	}

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

		// Build context prefix and full prompt
		const contextPrefix = buildContextPrefix();
		const fullPrompt = contextPrefix + prompt;

		const settings: BattleSettings = {
			webSearchEnabled: settingsStore.webSearchEnabled,
			extendedThinkingEnabled: settingsStore.extendedThinkingEnabled,
			thinkingBudgetTokens: settingsStore.thinkingBudgetTokens,
			temperature: settingsStore.temperature,
			reasoningEffort,
			blindMode,
			category: selectedCategory,
			contextSpaceId: contextSpaceId || undefined,
			contextAreaId: contextAreaId || undefined
		};

		// Create the battle (store the user's original prompt for display)
		const battleId = arenaStore.createBattle(prompt, models, settings);

		// Start parallel streaming for all models (with context prefix)
		await streamAllModels(battleId, fullPrompt, models, settings);
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
					category: battle.settings.category,
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

			// Handle suggested category from AI Judge
			if (judgment.suggestedCategory && battle.settings.category === 'general') {
				arenaStore.updateBattleSuggestedCategory(battleId, judgment.suggestedCategory);
			}

			arenaStore.setAiJudgment(battleId, {
				winnerId: judgment.winnerId,
				analysis: judgment.analysis,
				scores: judgment.scores,
				criteria: judgment.criteria,
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

	// Handle continue conversation with winning model
	async function handleContinue(spaceId: string | null, areaId: string | null) {
		if (!activeBattle || !activeBattle.userVote) return;

		const winnerModelId = activeBattle.userVote;
		const winnerResponse = activeBattle.responses.find((r) => r.modelId === winnerModelId);

		if (!winnerResponse) {
			toastStore.error('Could not find winner response');
			return;
		}

		try {
			// Create a new conversation with the winning model
			const conversationId = await chatStore.createConversation(winnerModelId, {
				spaceId: spaceId || undefined,
				areaId: areaId || undefined
			});

			if (!conversationId) {
				toastStore.error('Failed to create conversation');
				return;
			}

			// Add the initial exchange
			await chatStore.addMessage(conversationId, {
				role: 'user',
				content: activeBattle.prompt
			});
			await chatStore.addMessage(conversationId, {
				role: 'assistant',
				content: winnerResponse.content,
				thinking: winnerResponse.thinking
			});

			// Navigate to the conversation
			const space = spaceId ? spacesStore.getSpaceById(spaceId) : null;
			const area = areaId ? areaStore.getAreaById(areaId) : null;

			if (space && area) {
				goto(`/spaces/${space.slug}/${area.slug}?conversationId=${conversationId}`);
			} else if (space) {
				goto(`/spaces/${space.slug}?conversationId=${conversationId}`);
			} else {
				goto(`/?conversationId=${conversationId}`);
			}

			showContinueModal = false;
			toastStore.success('Conversation created');
		} catch (err) {
			console.error('Failed to continue conversation:', err);
			toastStore.error('Failed to continue conversation');
		}
	}

	// Derived: Get winner model name for display
	let winnerModelName = $derived.by(() => {
		if (!activeBattle?.userVote) return '';
		const model = activeBattle.models.find((m) => m.id === activeBattle.userVote);
		return model?.displayName || activeBattle.userVote;
	});
</script>

<svelte:head>
	<title>Model Arena - StratAI</title>
</svelte:head>

<div class="h-screen flex flex-col overflow-hidden">
	<!-- Header -->
	<Header onSettingsClick={() => (settingsOpen = true)} />

	<!-- Main Content (full width, no sidebar) -->
	<main class="flex-1 flex flex-col overflow-hidden bg-surface-950">
			{#if !activeBattle}
				<!-- No active battle - Show welcome/setup -->
				<div class="flex-1 overflow-y-auto p-4 md:p-6">
					<div class="max-w-5xl mx-auto">
						<ArenaWelcome />

						<!-- Category Selection -->
						<div class="mt-8">
							<ArenaCategoryChips
								selected={selectedCategory}
								onSelect={(cat) => selectedCategory = cat}
							/>
						</div>

						<!-- Context Selection -->
						<div class="mt-6">
							<ArenaContextPicker
								selectedSpaceId={contextSpaceId}
								selectedAreaId={contextAreaId}
								onSelect={handleContextSelect}
							/>
						</div>

						<!-- Model Selection -->
						<div class="mt-6">
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
							<div class="flex items-center flex-wrap gap-2 mb-1">
								<span class="text-sm text-surface-400">Prompt</span>
								{#if activeBattle.settings.category}
									<span class="text-xs px-2 py-0.5 rounded-full bg-surface-700 text-surface-300">
										{activeBattle.settings.category}
									</span>
								{/if}
								{#if activeBattle.suggestedCategory && activeBattle.suggestedCategory !== activeBattle.settings.category}
									<span class="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
										AI suggests: {activeBattle.suggestedCategory}
									</span>
								{/if}
								{#if activeBattle.settings.contextAreaId}
									{@const area = areaStore.getAreaById(activeBattle.settings.contextAreaId)}
									{#if area}
										<span class="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
											+ context: {area.name}
										</span>
									{/if}
								{/if}
							</div>
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
					<!-- Action buttons after battle -->
					<div class="p-4 border-t border-surface-800 bg-surface-900/80 backdrop-blur-sm">
						<div class="max-w-5xl mx-auto flex justify-center gap-3">
							{#if activeBattle.userVote}
								<button
									type="button"
									onclick={() => showContinueModal = true}
									class="btn-primary px-6 py-2.5 flex items-center gap-2"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
										/>
									</svg>
									Continue with {winnerModelName}
								</button>
							{/if}
							<button
								type="button"
								onclick={handleNewBattle}
								class="btn-secondary px-6 py-2.5 flex items-center gap-2"
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

<!-- Settings Panel -->
<SettingsPanel open={settingsOpen} onclose={() => (settingsOpen = false)} />

<!-- Continue Conversation Modal -->
{#if activeBattle}
	<ArenaContinueModal
		isOpen={showContinueModal}
		winnerModelId={activeBattle.userVote || ''}
		{winnerModelName}
		battleContextSpaceId={activeBattle.settings.contextSpaceId}
		battleContextAreaId={activeBattle.settings.contextAreaId}
		onConfirm={handleContinue}
		onClose={() => showContinueModal = false}
	/>
{/if}
