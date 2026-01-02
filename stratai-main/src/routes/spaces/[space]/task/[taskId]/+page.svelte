<script lang="ts">
	/**
	 * Task Focus Mode Page
	 *
	 * A dedicated, serene environment for working on a single task.
	 * Features:
	 * - Task header with navigation back to space
	 * - Subtask panel on the right for tracking progress
	 * - Full chat experience scoped to this task
	 * - Plan Mode integration ("Help me plan this")
	 *
	 * URL: /spaces/{space}/task/{taskId}
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { documentStore } from '$lib/stores/documents.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import { SPACES, isValidSpace } from '$lib/config/spaces';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import ChatInput from '$lib/components/ChatInput.svelte';
	import ModelSelector from '$lib/components/ModelSelector.svelte';
	import PlanModePanel from '$lib/components/tasks/PlanModePanel.svelte';
	import type { Task, ProposedSubtask, SubtaskType } from '$lib/types/tasks';
	import type { SpaceType, Message, FileAttachment } from '$lib/types/chat';
	import type { TaskContextInfo } from '$lib/utils/context-builder';

	// Route params
	let spaceParam = $derived($page.params.space);
	let taskIdParam = $derived($page.params.taskId);

	// Task from store
	let task = $derived(taskIdParam ? taskStore.getTask(taskIdParam) : undefined);

	// Check if this is a subtask
	let isSubtask = $derived(!!task?.parentTaskId);
	let parentTask = $derived(isSubtask && task?.parentTaskId ? taskStore.getTask(task.parentTaskId) : undefined);

	// Subtasks for this task
	let subtasks = $derived(task ? taskStore.getSubtasksForTask(task.id) : []);
	let completedSubtasks = $derived(subtasks.filter((s) => s.status === 'completed').length);

	// Plan Mode state
	let planMode = $derived(taskStore.planMode);
	let isPlanModeActive = $derived(planMode?.taskId === taskIdParam);
	let taskContext = $derived<TaskContextInfo | undefined>(
		taskIdParam ? taskStore.getTaskContext(taskIdParam) : undefined
	);

	// Space config
	let spaceConfig = $derived.by(() => {
		if (!spaceParam || !isValidSpace(spaceParam)) return null;
		return SPACES[spaceParam as keyof typeof SPACES];
	});

	// Model selection
	let selectedModel = $derived(settingsStore.selectedModel || '');
	let effectiveModel = $derived(
		chatStore.activeConversation?.model || settingsStore.selectedModel || ''
	);

	// Chat state
	let activeConversation = $derived(chatStore.activeConversation);
	let messages = $derived(activeConversation?.messages || []);
	let isGenerating = $derived(chatStore.isStreaming);

	// UI state
	let isLoading = $state(true);
	let showSubtaskPanel = $state(true);
	let chatContainer = $state<HTMLDivElement | null>(null);

	// Load data on mount
	onMount(async () => {
		if (!spaceParam || !taskIdParam) {
			goto('/spaces');
			return;
		}

		// Load tasks for this space
		await taskStore.loadTasks(spaceParam);

		const loadedTask = taskStore.getTask(taskIdParam);
		if (!loadedTask) {
			toastStore.error('Task not found');
			goto(`/spaces/${spaceParam}`);
			return;
		}

		// Load task context for Plan Mode
		await taskStore.loadTaskContext(taskIdParam);

		// Set focused task
		taskStore.setFocusedTask(taskIdParam);

		// Load or create a conversation for this task
		await chatStore.refresh();

		// Find existing task conversation or create new
		const existingConv = chatStore.conversationList.find(
			(c) => c.taskId === taskIdParam
		);
		if (existingConv) {
			chatStore.setActiveConversation(existingConv.id);
		}

		isLoading = false;
	});

	// Scroll to bottom when messages change
	$effect(() => {
		if (messages.length && chatContainer) {
			const container = chatContainer;
			requestAnimationFrame(() => {
				if (container) {
					container.scrollTop = container.scrollHeight;
				}
			});
		}
	});

	// Handle model change
	function handleModelChange(modelId: string) {
		settingsStore.setSelectedModel(modelId);
	}

	// Handle send message
	async function handleSend(content: string, attachments?: FileAttachment[]) {
		if (!content.trim() && !attachments?.length) return;

		const modelToUse = chatStore.activeConversation?.model || settingsStore.selectedModel;
		if (!modelToUse) {
			toastStore.error('Please select a model first');
			return;
		}

		let conversationId = chatStore.activeConversation?.id;
		if (!conversationId) {
			// Create new conversation for this task
			conversationId = chatStore.createConversation(settingsStore.selectedModel, {
				spaceId: spaceParam || undefined,
				areaId: task?.areaId || undefined,
				taskId: taskIdParam || undefined
			});
		}

		// Add user message
		chatStore.addMessage(conversationId, { role: 'user', content, attachments });

		// Add placeholder assistant message
		const assistantMessageId = chatStore.addMessage(conversationId, {
			role: 'assistant',
			content: '',
			isStreaming: true
		});

		const controller = new AbortController();
		chatStore.setStreaming(true, controller);

		try {
			const conv = chatStore.getConversation(conversationId);
			const allMessages = (conv?.messages || []).filter((m) => !m.isStreaming && !m.error);
			const systemPrompt = settingsStore.systemPrompt?.trim();

			// Build API messages
			const apiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

			if (systemPrompt) {
				apiMessages.push({ role: 'system', content: systemPrompt });
			}

			// Add task context as system message
			const taskContextMsg = buildTaskSystemContext();
			if (taskContextMsg) {
				apiMessages.push({ role: 'system', content: taskContextMsg });
			}

			// Add conversation history
			for (const m of allMessages) {
				apiMessages.push({ role: m.role, content: m.content });
			}

			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: effectiveModel,
					messages: apiMessages,
					temperature: settingsStore.temperature,
					max_tokens: settingsStore.effectiveMaxTokens,
					searchEnabled: settingsStore.webSearchEnabled,
					thinkingEnabled: settingsStore.extendedThinkingEnabled && settingsStore.canUseExtendedThinking,
					thinkingBudgetTokens: settingsStore.thinkingBudgetTokens,
					space: spaceParam,
					areaId: task?.areaId,
					taskId: taskIdParam
				}),
				signal: controller.signal
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error?.message || 'Request failed');
			}

			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) throw new Error('No response body');

			let buffer = '';
			let collectedSources: Array<{ title: string; url: string; snippet: string }> = [];

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
									chatStore.updateMessage(conversationId!, assistantMessageId, {
										searchStatus: 'searching', searchQuery: parsed.query
									});
								} else if (parsed.status === 'thinking') {
									chatStore.updateMessage(conversationId!, assistantMessageId, {
										searchStatus: undefined, searchQuery: undefined
									});
								}
							} else if (parsed.type === 'sources_preview') {
								collectedSources = parsed.sources;
								chatStore.updateMessage(conversationId!, assistantMessageId, { sources: parsed.sources });
							} else if (parsed.type === 'thinking_start') {
								chatStore.updateMessage(conversationId!, assistantMessageId, { isThinking: true });
							} else if (parsed.type === 'thinking') {
								chatStore.appendToThinking(conversationId!, assistantMessageId, parsed.content);
							} else if (parsed.type === 'thinking_end') {
								chatStore.updateMessage(conversationId!, assistantMessageId, { isThinking: false });
							} else if (parsed.type === 'content') {
								chatStore.appendToMessage(conversationId!, assistantMessageId, parsed.content);
							} else if (parsed.type === 'sources') {
								collectedSources = parsed.sources;
							} else if (parsed.type === 'error') {
								throw new Error(parsed.error);
							} else if (parsed.choices?.[0]?.delta?.content) {
								chatStore.appendToMessage(conversationId!, assistantMessageId, parsed.choices[0].delta.content);
							}
						} catch (e) {
							if (e instanceof Error && e.message !== 'Unexpected token') {
								throw e;
							}
						}
					}
				}
			}

			chatStore.updateMessage(conversationId!, assistantMessageId, {
				isStreaming: false,
				isThinking: false,
				searchStatus: collectedSources.length > 0 ? 'complete' : undefined,
				sources: collectedSources.length > 0 ? collectedSources : undefined
			});

			// If in Plan Mode, increment exchange count
			if (isPlanModeActive && taskIdParam) {
				await taskStore.incrementExchangeCount(taskIdParam);
			}

		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				chatStore.updateMessage(conversationId!, assistantMessageId, { isStreaming: false });
			} else {
				chatStore.updateMessage(conversationId!, assistantMessageId, {
					isStreaming: false,
					error: err instanceof Error ? err.message : 'Unknown error'
				});
				toastStore.error(err instanceof Error ? err.message : 'Failed to get response');
			}
		} finally {
			chatStore.setStreaming(false);
		}
	}

	// Build system context for task
	function buildTaskSystemContext(): string {
		let context = '';

		if (task) {
			context += `Current Task: "${task.title}"`;
			if (task.priority === 'high') {
				context += ' (High Priority)';
			}
			if (task.dueDate) {
				context += `\nDue: ${task.dueDate.toLocaleDateString()}`;
			}
		}

		// Add subtask context if any
		if (subtasks.length > 0) {
			context += `\n\nSubtasks (${completedSubtasks}/${subtasks.length} complete):`;
			for (const st of subtasks) {
				const status = st.status === 'completed' ? '[x]' : '[ ]';
				context += `\n${status} ${st.title}`;
			}
		}

		return context;
	}

	// Handle stop generation
	function handleStop() {
		chatStore.stopStreaming();
	}

	// Navigate back to space
	function handleBack() {
		goto(`/spaces/${spaceParam}`);
	}

	// Navigate to subtask
	function handleSubtaskClick(subtaskId: string) {
		goto(`/spaces/${spaceParam}/task/${subtaskId}`);
	}

	// Navigate to parent task
	function handleParentClick() {
		if (parentTask) {
			goto(`/spaces/${spaceParam}/task/${parentTask.id}`);
		}
	}

	// Complete subtask (for action items)
	async function handleCompleteSubtask(subtaskId: string) {
		await taskStore.completeTask(subtaskId);
	}

	// Start Plan Mode
	async function handleStartPlanMode() {
		if (!task || !taskIdParam) return;

		// Create a new conversation for planning if needed
		let conversationId = chatStore.activeConversation?.id;
		if (!conversationId) {
			conversationId = chatStore.createConversation(settingsStore.selectedModel, {
				spaceId: spaceParam || undefined,
				areaId: task.areaId || undefined,
				taskId: taskIdParam
			});
		}

		await taskStore.startPlanMode(taskIdParam, conversationId);

		// Send initial planning message
		await handleSend(
			`I need help breaking down this task: "${task.title}". Can you ask me some clarifying questions to understand what needs to be done?`
		);
	}

	// Exit Plan Mode
	async function handleExitPlanMode() {
		await taskStore.exitPlanMode();
	}

	// Request proposal from AI
	async function handleRequestProposal() {
		await handleSend(
			"I'm ready for your suggestions. Please propose a breakdown of this task into clear subtasks."
		);
	}

	// Create subtasks from Plan Mode
	async function handleCreateSubtasks() {
		const created = await taskStore.createSubtasksFromPlanMode();
		if (created.length > 0) {
			toastStore.success(`Created ${created.length} subtask${created.length === 1 ? '' : 's'}`);
		}
	}

	// Update proposed subtask
	async function handleUpdateSubtask(id: string, title: string) {
		await taskStore.updateProposedSubtask(id, { title });
	}

	// Toggle proposed subtask
	async function handleToggleSubtask(id: string) {
		await taskStore.toggleProposedSubtask(id);
	}

	// Remove proposed subtask
	async function handleRemoveSubtask(id: string) {
		await taskStore.removeProposedSubtask(id);
	}

	// Add proposed subtask
	async function handleAddSubtask() {
		await taskStore.addProposedSubtask('New subtask');
	}
</script>

<svelte:head>
	<title>{task?.title || 'Task'} | {spaceConfig?.name || 'Space'} | StratAI</title>
</svelte:head>

{#if isLoading}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading task...</p>
	</div>
{:else if task}
	<div
		class="task-focus-page"
		style="--space-accent: {spaceConfig?.accentColor || '#3b82f6'}; --task-color: {task.color};"
	>
		<!-- Task Header -->
		<header class="task-header">
			<div class="header-left">
				<button type="button" class="back-button" onclick={handleBack} title="Back to space">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
					</svg>
				</button>

				<div class="task-info">
					<!-- Breadcrumb for subtasks -->
					{#if isSubtask && parentTask}
						<div class="breadcrumb">
							<button type="button" class="breadcrumb-link" onclick={handleParentClick}>
								{parentTask.title}
							</button>
							<span class="breadcrumb-sep">/</span>
						</div>
					{/if}

					<div class="task-title-row">
						<div class="task-color-dot" style="background: {task.color};"></div>
						<h1 class="task-title">{task.title}</h1>
						{#if task.priority === 'high'}
							<span class="priority-badge">HIGH</span>
						{/if}
						{#if task.status === 'planning'}
							<span class="planning-badge">
								<span class="planning-dot"></span>
								PLANNING
							</span>
						{/if}
					</div>

					{#if task.dueDate}
						<div class="task-due">
							Due {task.dueDate.toLocaleDateString()}
							{#if task.dueDateType === 'hard'}
								<span class="deadline-hard">(hard deadline)</span>
							{/if}
						</div>
					{/if}
				</div>
			</div>

			<div class="header-right">
				{#if subtasks.length > 0}
					<div class="progress-info">
						<span class="progress-text">{completedSubtasks}/{subtasks.length}</span>
						<div class="progress-bar">
							<div
								class="progress-fill"
								style="width: {(completedSubtasks / subtasks.length) * 100}%"
							></div>
						</div>
					</div>
				{/if}

				<ModelSelector selectedModel={effectiveModel} onchange={handleModelChange} />

				<button
					type="button"
					class="panel-toggle"
					class:active={showSubtaskPanel}
					onclick={() => (showSubtaskPanel = !showSubtaskPanel)}
					title={showSubtaskPanel ? 'Hide panel' : 'Show panel'}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" />
					</svg>
				</button>
			</div>
		</header>

		<!-- Main Content Area -->
		<div class="task-content" class:with-panel={showSubtaskPanel && !isPlanModeActive}>
			<!-- Chat Area -->
			<div class="chat-area">
				<div class="chat-messages" bind:this={chatContainer}>
					{#if messages.length === 0}
						<!-- Welcome State -->
						<div class="welcome-state" in:fade={{ duration: 300 }}>
							<div class="welcome-card">
								<div class="welcome-icon" style="background: {task.color}20;">
									<svg
										style="color: {task.color};"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
										/>
									</svg>
								</div>
								<h2 class="welcome-title">{task.title}</h2>
								<p class="welcome-desc">
									{#if subtasks.length > 0}
										Work through the subtasks or continue chatting about this task.
									{:else if isSubtask}
										Work on this subtask with AI assistance.
									{:else}
										Break this down into steps or start working directly.
									{/if}
								</p>

								{#if !isSubtask && subtasks.length === 0}
									<div class="welcome-actions">
										<button
											type="button"
											class="plan-button"
											onclick={handleStartPlanMode}
										>
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
												/>
											</svg>
											Help me plan this
										</button>
										<div class="or-divider">
											<span>or start chatting below</span>
										</div>
									</div>
								{/if}
							</div>

							<!-- Arrow pointing to input -->
							<div class="chat-pointer">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
								</svg>
							</div>
						</div>
					{:else}
						{#each messages as message, i (message.id || i)}
							<ChatMessage
								{message}
								messageIndex={i}
								showTimestamp={settingsStore.showTimestamps}
								onSecondOpinion={() => {}}
							/>
						{/each}
					{/if}
				</div>

				<!-- Chat Input -->
				<div class="chat-input-container" class:plan-mode={isPlanModeActive}>
					<ChatInput
						onsend={handleSend}
						onstop={handleStop}
						disabled={!selectedModel || isGenerating}
					/>
				</div>
			</div>

			<!-- Subtask Panel (when not in Plan Mode) -->
			{#if showSubtaskPanel && !isPlanModeActive}
				<aside class="subtask-panel" transition:fly={{ x: 300, duration: 200 }}>
					<div class="panel-header">
						<h3 class="panel-title">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
								/>
							</svg>
							Subtasks
						</h3>
						{#if subtasks.length > 0}
							<span class="panel-count">{completedSubtasks}/{subtasks.length}</span>
						{/if}
					</div>

					<div class="panel-content">
						{#if subtasks.length === 0}
							<div class="empty-subtasks">
								<p>No subtasks yet</p>
								{#if !isSubtask}
									<button type="button" class="add-subtask-hint" onclick={handleStartPlanMode}>
										Use "Help me plan" to create subtasks
									</button>
								{/if}
							</div>
						{:else}
							<div class="subtask-list">
								{#each subtasks as subtask (subtask.id)}
									{@const isCompleted = subtask.status === 'completed'}
									{@const isConversation = subtask.subtaskType === 'conversation'}
									<div
										class="subtask-item"
										class:completed={isCompleted}
										class:conversation={isConversation}
									>
										{#if subtask.subtaskType === 'action'}
											<button
												type="button"
												class="subtask-checkbox"
												class:checked={isCompleted}
												onclick={() => handleCompleteSubtask(subtask.id)}
												disabled={isCompleted}
											>
												{#if isCompleted}
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
														<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
													</svg>
												{/if}
											</button>
										{:else}
											<div class="subtask-icon">
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
													/>
												</svg>
											</div>
										{/if}

										<button
											type="button"
											class="subtask-title"
											class:strikethrough={isCompleted}
											onclick={() => handleSubtaskClick(subtask.id)}
											disabled={isCompleted || subtask.subtaskType === 'action'}
										>
											{subtask.title}
										</button>

										{#if isConversation && !isCompleted}
											<svg class="subtask-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
											</svg>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>

					{#if !isSubtask && subtasks.length === 0}
						<div class="panel-footer">
							<button type="button" class="plan-mode-cta" onclick={handleStartPlanMode}>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
								</svg>
								Help me plan this task
							</button>
						</div>
					{/if}
				</aside>
			{/if}
		</div>

		<!-- Plan Mode Panel -->
		{#if isPlanModeActive && planMode}
			<PlanModePanel
				{planMode}
				context={taskContext}
				onClose={handleExitPlanMode}
				onCreateSubtasks={handleCreateSubtasks}
				onUpdateSubtask={handleUpdateSubtask}
				onToggleSubtask={handleToggleSubtask}
				onRemoveSubtask={handleRemoveSubtask}
				onAddSubtask={handleAddSubtask}
				onRequestProposal={handleRequestProposal}
			/>
		{/if}
	</div>
{:else}
	<div class="error-container">
		<h1>Task not found</h1>
		<p>The task you're looking for doesn't exist.</p>
		<a href="/spaces/{spaceParam}" class="back-link">Back to space</a>
	</div>
{/if}

<style>
	.task-focus-page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #0f0f0f;
	}

	/* Loading State */
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		gap: 1rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.loading-spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-top-color: var(--space-accent, #3b82f6);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Error State */
	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		gap: 0.5rem;
		text-align: center;
	}

	.error-container h1 {
		font-size: 1.25rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
	}

	.error-container p {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.back-link {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		color: var(--space-accent, #3b82f6);
		background: rgba(59, 130, 246, 0.1);
		border-radius: 0.5rem;
		text-decoration: none;
	}

	.back-link:hover {
		background: rgba(59, 130, 246, 0.2);
	}

	/* Task Header */
	.task-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.02);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.back-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.05);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.back-button:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
	}

	.back-button svg {
		width: 1rem;
		height: 1rem;
	}

	.task-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
	}

	.breadcrumb-link {
		color: rgba(255, 255, 255, 0.4);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.breadcrumb-link:hover {
		color: rgba(255, 255, 255, 0.7);
		text-decoration: underline;
	}

	.breadcrumb-sep {
		color: rgba(255, 255, 255, 0.2);
	}

	.task-title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.task-color-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.task-title {
		font-size: 1rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
		margin: 0;
	}

	.priority-badge {
		padding: 0.125rem 0.375rem;
		font-size: 0.625rem;
		font-weight: 600;
		color: #fbbf24;
		background: rgba(251, 191, 36, 0.15);
		border-radius: 0.25rem;
	}

	.planning-badge {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.375rem;
		font-size: 0.625rem;
		font-weight: 600;
		color: #a855f7;
		background: rgba(168, 85, 247, 0.15);
		border-radius: 0.25rem;
	}

	.planning-dot {
		width: 0.375rem;
		height: 0.375rem;
		background: #a855f7;
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.task-due {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.deadline-hard {
		color: #ef4444;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.progress-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.progress-text {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.progress-bar {
		width: 4rem;
		height: 0.25rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 0.125rem;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--space-accent, #3b82f6);
		transition: width 0.3s ease;
	}

	.panel-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		color: rgba(255, 255, 255, 0.4);
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.panel-toggle:hover {
		color: rgba(255, 255, 255, 0.7);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.panel-toggle.active {
		color: var(--space-accent, #3b82f6);
		border-color: var(--space-accent, #3b82f6);
		background: rgba(59, 130, 246, 0.1);
	}

	.panel-toggle svg {
		width: 1rem;
		height: 1rem;
	}

	/* Main Content */
	.task-content {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.task-content.with-panel {
		gap: 0;
	}

	/* Chat Area */
	.chat-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.chat-messages {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.chat-input-container {
		padding: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.chat-input-container.plan-mode {
		background: rgba(168, 85, 247, 0.05);
		border-color: rgba(168, 85, 247, 0.2);
	}

	/* Welcome State */
	.welcome-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 2rem;
	}

	.welcome-card {
		text-align: center;
		max-width: 400px;
	}

	.welcome-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 4rem;
		height: 4rem;
		margin: 0 auto 1.5rem;
		border-radius: 1rem;
	}

	.welcome-icon svg {
		width: 2rem;
		height: 2rem;
	}

	.welcome-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 0.5rem 0;
	}

	.welcome-desc {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0 0 1.5rem 0;
		line-height: 1.5;
	}

	.welcome-actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.plan-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.875rem 1.5rem;
		font-size: 0.9375rem;
		font-weight: 500;
		color: white;
		background: var(--space-accent, #3b82f6);
		border: none;
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.plan-button:hover {
		filter: brightness(1.1);
	}

	.plan-button svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.or-divider {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.or-divider::before,
	.or-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: rgba(255, 255, 255, 0.1);
	}

	.or-divider span {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.chat-pointer {
		margin-top: 2rem;
		color: rgba(255, 255, 255, 0.3);
		animation: bounce 2s ease-in-out infinite;
	}

	.chat-pointer svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	@keyframes bounce {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(6px);
		}
	}

	/* Subtask Panel */
	.subtask-panel {
		width: 280px;
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.02);
		border-left: 1px solid rgba(255, 255, 255, 0.06);
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.panel-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
	}

	.panel-title svg {
		width: 1rem;
		height: 1rem;
		color: var(--space-accent, #3b82f6);
	}

	.panel-count {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.panel-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.empty-subtasks {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 2rem 1rem;
		text-align: center;
	}

	.empty-subtasks p {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0 0 1rem 0;
	}

	.add-subtask-hint {
		font-size: 0.75rem;
		color: var(--space-accent, #3b82f6);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.add-subtask-hint:hover {
		text-decoration: underline;
	}

	.subtask-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.subtask-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.subtask-item:hover:not(.completed) {
		background: rgba(255, 255, 255, 0.06);
	}

	.subtask-item.completed {
		opacity: 0.5;
	}

	.subtask-checkbox {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.125rem;
		height: 1.125rem;
		border: 1.5px solid rgba(255, 255, 255, 0.3);
		border-radius: 0.25rem;
		background: transparent;
		cursor: pointer;
		flex-shrink: 0;
		transition: all 0.15s ease;
	}

	.subtask-checkbox:hover:not(:disabled) {
		border-color: rgba(255, 255, 255, 0.5);
	}

	.subtask-checkbox.checked {
		background: #22c55e;
		border-color: #22c55e;
	}

	.subtask-checkbox svg {
		width: 0.75rem;
		height: 0.75rem;
		color: white;
	}

	.subtask-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
	}

	.subtask-icon svg {
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.subtask-title {
		flex: 1;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.8);
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		padding: 0;
	}

	.subtask-title:hover:not(:disabled) {
		color: rgba(255, 255, 255, 1);
	}

	.subtask-title.strikethrough {
		text-decoration: line-through;
		color: rgba(255, 255, 255, 0.4);
	}

	.subtask-title:disabled {
		cursor: default;
	}

	.subtask-arrow {
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.3);
	}

	.panel-footer {
		padding: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.plan-mode-cta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.625rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--space-accent, #3b82f6);
		background: rgba(59, 130, 246, 0.1);
		border: 1px dashed rgba(59, 130, 246, 0.3);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.plan-mode-cta:hover {
		background: rgba(59, 130, 246, 0.15);
		border-color: rgba(59, 130, 246, 0.5);
	}

	.plan-mode-cta svg {
		width: 1rem;
		height: 1rem;
	}

	/* Scrollbar */
	.chat-messages::-webkit-scrollbar,
	.panel-content::-webkit-scrollbar {
		width: 6px;
	}

	.chat-messages::-webkit-scrollbar-track,
	.panel-content::-webkit-scrollbar-track {
		background: transparent;
	}

	.chat-messages::-webkit-scrollbar-thumb,
	.panel-content::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.chat-messages::-webkit-scrollbar-thumb:hover,
	.panel-content::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
