<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { Swords, StopCircle, Plus, MessageSquare, RefreshCw, Sliders, Home, FolderOpen, Settings } from 'lucide-svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import MobileHeader from '$lib/components/layout/MobileHeader.svelte';
	import MobileActionsMenu from '$lib/components/layout/MobileActionsMenu.svelte';
	import UserMenu from '$lib/components/layout/UserMenu.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import ArenaTabs from '$lib/components/arena/ArenaTabs.svelte';
	import ArenaQuickStart from '$lib/components/arena/ArenaQuickStart.svelte';
	import ArenaModelSelection from '$lib/components/arena/ArenaModelSelection.svelte';
	import ArenaCategoryChips from '$lib/components/arena/ArenaCategoryChips.svelte';
	import ArenaContextPicker from '$lib/components/arena/ArenaContextPicker.svelte';
	import ArenaContinueModal from '$lib/components/arena/ArenaContinueModal.svelte';
	import ArenaVotingPrompt from '$lib/components/arena/ArenaVotingPrompt.svelte';
	import ArenaInput from '$lib/components/arena/ArenaInput.svelte';
	import ArenaGrid from '$lib/components/arena/ArenaGrid.svelte';
	import ArenaResponseCard from '$lib/components/arena/ArenaResponseCard.svelte';
	import ArenaJudgment from '$lib/components/arena/ArenaJudgment.svelte';
	import { arenaStore, type ArenaModel, type BattleSettings, type ResponseMetrics } from '$lib/stores/arena.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { areaStore } from '$lib/stores/areas.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { goto } from '$app/navigation';
	import type { TemplateCategory, BattleTemplate } from '$lib/config/battle-templates';
	import { handleUnauthorizedResponse } from '$lib/utils/logout';

	let settingsOpen = $state(false);
	let showContinueModal = $state(false);

	// User data for mobile header
	let userData = $derived($page.data.user as { displayName: string | null; role: 'owner' | 'admin' | 'member' } | null);
	let votingSkipped = $state(false);
	let battleTransitionDelay = $state(false); // Delay UI transition for animation
	let focusedModelId = $state<string | null>(null); // Focus mode for a single response

	// Tab state
	type Tab = 'battle' | 'results' | 'rankings';
	let activeTab = $state<Tab>('battle');

	// Category selection (default: general)
	let selectedCategory = $state<TemplateCategory>('general');

	// Context selection (optional Space/Area)
	let contextSpaceId = $state<string | null>(null);
	let contextAreaId = $state<string | null>(null);

	// Template selection (when using Quick Start)
	let selectedTemplate = $state<BattleTemplate | null>(null);

	// Track if user is in custom mode (interacted with Customize section)
	let hasCustomized = $state(false);

	// Quick start prompt from template
	let quickStartPrompt = $state<string | null>(null);

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
		// Mark as customized when user selects context
		if (spaceId) {
			hasCustomized = true;
		}
	}

	// Handle category selection from Customize section
	function handleCategorySelect(category: TemplateCategory) {
		selectedCategory = category;
		// Mark as customized when user changes category
		hasCustomized = true;
	}

	// Handle Quick Start template selection
	function handleSelectTemplate(template: BattleTemplate) {
		selectedTemplate = template;
		selectedCategory = template.category;
		quickStartPrompt = template.prompt;
		hasCustomized = false; // Back to template mode
	}

	// Handle template reset (back to default state - show both sections)
	function handleResetTemplate() {
		selectedTemplate = null;
		quickStartPrompt = null;
		hasCustomized = false; // Show both sections again
	}

	// Handle tab change
	function handleTabChange(tab: Tab) {
		if (tab === 'results' || tab === 'rankings') {
			toastStore.info('Coming soon! Battle history and rankings are in development.');
			return;
		}
		activeTab = tab;
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

		// Start transition delay - keep setup visible while API calls start in background
		battleTransitionDelay = true;
		setTimeout(() => {
			battleTransitionDelay = false;
		}, 1000);

		// Clear quick start prompt, template, and customization state after use
		quickStartPrompt = null;
		selectedTemplate = null;
		hasCustomized = false;

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
				if (handleUnauthorizedResponse(response)) return;
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
				if (handleUnauthorizedResponse(response)) return;
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
		votingSkipped = false;
		focusedModelId = null;
	}

	// Toggle focus mode for a response
	function toggleFocus(modelId: string) {
		focusedModelId = focusedModelId === modelId ? null : modelId;
	}

	// Handle keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		// Escape to exit focus mode
		if (e.key === 'Escape' && focusedModelId) {
			e.preventDefault();
			focusedModelId = null;
		}
	}

	// Handle skip voting
	function handleSkipVoting() {
		votingSkipped = true;
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

	// Derived: Get winner model provider for display
	let winnerProvider = $derived.by(() => {
		if (!activeBattle?.userVote) return '';
		const model = activeBattle.models.find((m) => m.id === activeBattle.userVote);
		return model?.provider || '';
	});
</script>

<svelte:head>
	<title>Model Arena - StratAI</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="h-screen flex flex-col overflow-hidden">
	<!-- Mobile Header -->
	<MobileHeader title="Model Arena" hideBack={true}>
		<!-- Navigation menu -->
		<MobileActionsMenu>
			<a href="/" class="mobile-action-item">
				<Home size={16} />
				Quick Chat
			</a>
			<a href="/spaces" class="mobile-action-item">
				<FolderOpen size={16} />
				Spaces
			</a>
			<div class="mobile-action-divider"></div>
			<button class="mobile-action-item" onclick={() => (settingsOpen = true)}>
				<Settings size={16} />
				Settings
			</button>
		</MobileActionsMenu>

		<!-- User Menu -->
		{#if userData}
			<UserMenu displayName={userData.displayName} role={userData.role} iconOnly />
		{/if}
	</MobileHeader>

	<!-- Desktop Header (hidden on mobile) -->
	<div class="hidden md:block">
		<Header onSettingsClick={() => (settingsOpen = true)} />
	</div>

	<!-- Main Content (full width, no sidebar) -->
	<main class="flex-1 flex flex-col overflow-hidden bg-surface-950">
		{#if !activeBattle || battleTransitionDelay}
			<!-- No active battle - Show welcome/setup -->
			<div class="flex-1 overflow-y-auto p-4 md:p-6">
				<div class="max-w-5xl mx-auto space-y-8">
					<!-- Hero Section -->
					<div class="text-center space-y-4">
						<div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-500/20">
							<Swords class="w-7 h-7 text-primary-400" />
						</div>
						<div>
							<h1 class="text-2xl font-bold text-surface-100">Model Arena</h1>
							<p class="mt-1 text-surface-400">Compare AI models side-by-side and find the best for your needs</p>
						</div>
					</div>

					<!-- Tabs -->
					<div class="flex justify-center">
						<ArenaTabs {activeTab} onTabChange={handleTabChange} />
					</div>

					{#if activeTab === 'battle'}
						<!-- Quick Start Section (hidden when user is customizing) -->
						{#if !hasCustomized}
							<ArenaQuickStart
								{selectedTemplate}
								onSelectTemplate={handleSelectTemplate}
								onReset={handleResetTemplate}
							/>
						{/if}

						<!-- Customize Your Battle Section (hidden when template is selected) -->
						{#if !selectedTemplate}
							<div class="customize-battle-section p-6 rounded-2xl bg-surface-800/30 border border-surface-700/50">
								<div class="flex items-center justify-between mb-4">
									<div class="flex items-center gap-3">
										<div class="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center">
											<Sliders class="w-4 h-4 text-surface-400" />
										</div>
										<div>
											<h3 class="text-sm font-medium text-surface-200">Customize Your Battle</h3>
											<p class="text-xs text-surface-500">Fine-tune your comparison for better results</p>
										</div>
									</div>
									{#if hasCustomized}
										<button
											type="button"
											onclick={() => { hasCustomized = false; selectedCategory = 'general'; contextSpaceId = null; contextAreaId = null; }}
											class="text-xs text-surface-400 hover:text-surface-200 underline"
										>
											Show templates
										</button>
									{/if}
								</div>

								<!-- Category Selection with helper text -->
								<div class="space-y-2 mb-4">
									<div class="flex items-center gap-2">
										<span class="text-xs font-medium text-surface-400 uppercase tracking-wider">Category</span>
										<span class="text-xs text-surface-500">(helps the community learn which models excel where)</span>
									</div>
									<ArenaCategoryChips
										selected={selectedCategory}
										onSelect={handleCategorySelect}
									/>
								</div>

								<!-- Context Selection - full width, dropdowns side by side -->
								<ArenaContextPicker
									selectedSpaceId={contextSpaceId}
									selectedAreaId={contextAreaId}
									onSelect={handleContextSelect}
								/>
							</div>
						{/if}

						<!-- Model Selection -->
						<ArenaModelSelection category={selectedCategory} />
					{:else if activeTab === 'results'}
						<!-- Results Tab Placeholder -->
						<div class="text-center py-16">
							<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-800 mb-4">
								<svg class="w-8 h-8 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<h2 class="text-xl font-semibold text-surface-200 mb-2">Battle History Coming Soon</h2>
							<p class="text-surface-400 max-w-md mx-auto">
								Track your battle history, see your model preferences by category, and revisit past comparisons.
							</p>
						</div>
					{:else if activeTab === 'rankings'}
						<!-- Rankings Tab Placeholder -->
						<div class="text-center py-16">
							<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-800 mb-4">
								<svg class="w-8 h-8 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
							</div>
							<h2 class="text-xl font-semibold text-surface-200 mb-2">Rankings Coming Soon</h2>
							<p class="text-surface-400 max-w-md mx-auto">
								View community rankings, see which models excel in different categories, and discover trending performers.
							</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Input (only for battle tab) -->
			{#if activeTab === 'battle'}
				<ArenaInput
					onStartBattle={handleStartBattle}
					disabled={selectedModels.length < 2}
					{isStreaming}
					initialPrompt={quickStartPrompt}
				/>
			{/if}
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
					<ArenaGrid modelCount={activeBattle.models.length} hasFocused={focusedModelId !== null}>
						{#each activeBattle.responses as response}
							{@const model = activeBattle.models.find((m) => m.id === response.modelId)}
							<ArenaResponseCard
								{response}
								modelId={response.modelId}
								modelName={model?.displayName || response.modelId}
								provider={model?.provider || 'unknown'}
								isWinner={activeBattle.aiJudgment?.winnerId === response.modelId && (!!activeBattle.userVote || votingSkipped)}
								isUserVote={activeBattle.userVote === response.modelId}
								score={(!!activeBattle.userVote || votingSkipped) ? activeBattle.aiJudgment?.scores[response.modelId] : undefined}
								onVote={() => handleVote(response.modelId)}
								canVote={activeBattle.status === 'complete' || activeBattle.status === 'judged'}
								blindMode={activeBattle.settings.blindMode}
								hasVoted={!!activeBattle.userVote}
								isFocused={focusedModelId === response.modelId}
								isOtherFocused={focusedModelId !== null && focusedModelId !== response.modelId}
								onToggleFocus={() => toggleFocus(response.modelId)}
							/>
						{/each}
					</ArenaGrid>

					<!-- Voting Prompt - Show when responses complete but user hasn't voted/skipped -->
					{#if (activeBattle.status === 'complete' || activeBattle.status === 'judged') && !activeBattle.userVote && !votingSkipped && !isStreaming}
						<ArenaVotingPrompt
							models={activeBattle.models}
							onVote={handleVote}
							onSkip={handleSkipVoting}
						/>
					{/if}

					<!-- AI Judgment - Show after voting or skipping -->
					{#if (activeBattle.aiJudgment || activeBattle.status === 'judging') && (activeBattle.userVote || votingSkipped)}
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
							<StopCircle class="w-4 h-4" />
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
								<MessageSquare class="w-4 h-4" />
								Continue with {winnerModelName}
							</button>
						{/if}
						<button
							type="button"
							onclick={handleNewBattle}
							class="btn-secondary px-6 py-2.5 flex items-center gap-2"
						>
							<RefreshCw class="w-4 h-4" />
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
		{winnerProvider}
		battleContextSpaceId={activeBattle.settings.contextSpaceId}
		battleContextAreaId={activeBattle.settings.contextAreaId}
		onConfirm={handleContinue}
		onClose={() => showContinueModal = false}
	/>
{/if}
