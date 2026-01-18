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
	import ChatMessageList from '$lib/components/chat/ChatMessageList.svelte';
	import ConversationExportMenu from '$lib/components/chat/ConversationExportMenu.svelte';
	import ModelSelector from '$lib/components/ModelSelector.svelte';
	import ModelBadge from '$lib/components/ModelBadge.svelte';
	import PlanModePanel from '$lib/components/tasks/PlanModePanel.svelte';
	import PlanModeConfirmation from '$lib/components/tasks/PlanModeConfirmation.svelte';
	import SubtaskDashboard from '$lib/components/tasks/SubtaskDashboard.svelte';
	import SubtaskWelcome from '$lib/components/tasks/SubtaskWelcome.svelte';
	import TaskContextPanel from '$lib/components/tasks/TaskContextPanel.svelte';
	import TaskApproachModal from '$lib/components/tasks/TaskApproachModal.svelte';
	import TaskWorkWelcome from '$lib/components/tasks/TaskWorkWelcome.svelte';
	import CompleteTaskModal from '$lib/components/tasks/CompleteTaskModal.svelte';
	import TaskPlanningModelModal from '$lib/components/tasks/TaskPlanningModelModal.svelte';
	import type { Task, ProposedSubtask, SubtaskType } from '$lib/types/tasks';
	import type { SpaceType, Message, FileAttachment } from '$lib/types/chat';
	import type { TaskContextInfo } from '$lib/utils/context-builder';
	import { contentContainsProposal, extractProposedSubtasks } from '$lib/utils/subtask-extraction';

	// Route params
	let spaceParam = $derived($page.params.space);
	let taskIdParam = $derived($page.params.taskId);

	// Query params - used for forcing specific view mode or conversation
	let viewParam = $derived($page.url.searchParams.get('view'));
	let conversationIdParam = $derived($page.url.searchParams.get('conversationId'));

	// Task from store
	let task = $derived(taskIdParam ? taskStore.getTask(taskIdParam) : undefined);

	// Check if this is a subtask
	let isSubtask = $derived(!!task?.parentTaskId);
	let parentTask = $derived(isSubtask && task?.parentTaskId ? taskStore.getTask(task.parentTaskId) : undefined);

	// Subtasks for this task
	let subtasks = $derived(task ? taskStore.getSubtasksForTask(task.id) : []);
	let completedSubtasks = $derived(subtasks.filter((s) => s.status === 'completed').length);

	// Sibling subtasks (when viewing a subtask, shows other subtasks from parent)
	let siblingSubtasks = $derived(
		isSubtask && parentTask ? taskStore.getSubtasksForTask(parentTask.id) : []
	);

	// Panel subtasks - show siblings when on subtask, children otherwise
	let panelSubtasks = $derived(isSubtask ? siblingSubtasks : subtasks);
	let panelCompletedCount = $derived(panelSubtasks.filter((s) => s.status === 'completed').length);

	// Plan Mode state
	let planMode = $derived(taskStore.planMode);
	let isPlanModeActive = $derived(planMode?.taskId === taskIdParam);
	let taskContext = $derived<TaskContextInfo | undefined>(
		taskIdParam ? taskStore.getTaskContext(taskIdParam) : undefined
	);

	// Plan completion state - shows confirmation after subtask creation
	let planJustCompleted = $derived(taskStore.planJustCompleted);
	let showPlanConfirmation = $derived(
		planJustCompleted?.taskId === taskIdParam && (planJustCompleted?.subtaskCount ?? 0) > 0
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
	let visibleMessages = $derived(messages.filter(m => !m.hidden));
	let isGenerating = $derived(chatStore.isStreaming);

	// UI state
	let isLoading = $state(true);
	let showSubtaskPanel = $state(true);
	let subtaskPanelInitialized = $state(false);
	let chatContainer = $state<HTMLElement | undefined>(undefined);
	let showCompleteModal = $state(false);
	let showSubtaskWelcome = $state(true);
	let showPlanningModelModal = $state(false);
	let isCreatingSubtasks = $state(false);

	// Multi-conversation support for subtasks
	let taskConversations = $derived(
		taskIdParam ? chatStore.getConversationsForTask(taskIdParam) : []
	);
	let hasExistingConversations = $derived(taskConversations.length > 0);

	// Panel collapsed state - persisted per task in localStorage
	let contextPanelCollapsed = $state(false);

	// Load panel collapsed state from localStorage
	$effect(() => {
		if (taskIdParam && typeof window !== 'undefined') {
			const stored = localStorage.getItem(`task-panel-collapsed-${taskIdParam}`);
			if (stored !== null) {
				contextPanelCollapsed = stored === 'true';
			}
		}
	});

	// Persist panel collapsed state
	function setContextPanelCollapsed(collapsed: boolean) {
		contextPanelCollapsed = collapsed;
		if (taskIdParam && typeof window !== 'undefined') {
			localStorage.setItem(`task-panel-collapsed-${taskIdParam}`, String(collapsed));
		}
	}

	// Initialize subtask panel state - collapsed by default for subtasks
	$effect(() => {
		if (task && !subtaskPanelInitialized) {
			// Subtasks: panel collapsed by default (shows siblings when expanded)
			// Parent tasks: panel expanded by default (shows children)
			showSubtaskPanel = !isSubtask;
			subtaskPanelInitialized = true;
		}
	});

	// Show full-page confirming view when in confirming phase with proposed subtasks
	let showConfirmingView = $derived(
		isPlanModeActive &&
		planMode?.phase === 'confirming' &&
		(planMode?.proposedSubtasks?.length ?? 0) > 0
	);

	// Incomplete subtasks for modal
	let incompleteSubtasks = $derived(subtasks.filter((s) => s.status !== 'completed'));

	// Task completion state (for read-only mode)
	let isTaskCompleted = $derived(task?.status === 'completed');

	// Work Unit detection (parent task without subtasks)
	let isWorkUnit = $derived(!isSubtask && subtasks.length === 0);

	// Show approach modal on first visit to a parent task without subtasks/conversations
	let shouldShowApproachModal = $derived(
		task &&
		!task.approachChosenAt &&
		task.linkedConversationIds.length === 0 &&
		subtasks.length === 0 &&
		task.status !== 'planning' &&
		!isSubtask
	);

	// Show work welcome after choosing "Work directly", before first message
	let shouldShowWorkWelcome = $derived(
		task &&
		task.approachChosenAt &&
		!hasExistingConversations &&
		task.status !== 'planning' &&
		!isSubtask &&
		subtasks.length === 0
	);

	// Show context panel for work units
	// Panel stays visible during planning (shows "Cancel Planning" button)
	// Panel naturally hides when subtasks are created (isWorkUnit becomes false)
	let shouldShowWorkUnitPanel = $derived(
		isWorkUnit &&
		task?.approachChosenAt
	);

	// View mode: 'dashboard' shows subtask cards, 'chat' shows conversation
	// Default to 'dashboard' when parent task has subtasks
	let viewMode = $state<'dashboard' | 'chat'>('chat');
	let viewModeInitializedForTask = $state<string | null>(null);

	// Should show dashboard? Only for parent tasks with subtasks
	let shouldShowDashboard = $derived(!isSubtask && subtasks.length > 0);

	// Initialize view mode from query param or auto-switch to dashboard
	// Runs once per task (resets when navigating to a different task)
	$effect(() => {
		if (task && taskIdParam && viewModeInitializedForTask !== taskIdParam) {
			// Reset to chat first, then determine correct view
			viewMode = 'chat';

			// Check for explicit view query param first
			if (viewParam === 'dashboard' && shouldShowDashboard) {
				viewMode = 'dashboard';
			} else if (shouldShowDashboard && visibleMessages.length === 0) {
				// Auto-switch to dashboard for parent tasks with subtasks but no messages
				viewMode = 'dashboard';
			}

			viewModeInitializedForTask = taskIdParam;
		}
	});

	// Track current task ID to detect navigation between tasks
	let currentTaskId = $state<string | null>(null);

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

		// Load conversations
		await chatStore.refresh();

		// Set active conversation - prefer explicit conversationId param (from navigation)
		// Otherwise fall back to most recent conversation for this task
		const requestedConvId = $page.url.searchParams.get('conversationId');
		if (requestedConvId) {
			// Verify the conversation exists and belongs to this task
			const conv = chatStore.getConversation(requestedConvId);
			if (conv && conv.taskId === taskIdParam) {
				chatStore.setActiveConversation(requestedConvId);
			} else {
				// Fallback to most recent if requested conv is invalid
				const taskConvs = chatStore.getConversationsForTask(taskIdParam);
				chatStore.setActiveConversation(taskConvs.length > 0 ? taskConvs[0].id : null);
			}
		} else {
			// No explicit conversation - use most recent for this task
			const taskConvs = chatStore.getConversationsForTask(taskIdParam);
			chatStore.setActiveConversation(taskConvs.length > 0 ? taskConvs[0].id : null);
		}

		// Set current task ID (for subsequent navigation detection)
		currentTaskId = taskIdParam;

		isLoading = false;
	});

	// React to task navigation - load correct conversation when taskId changes
	$effect(() => {
		const newTaskId = taskIdParam;
		if (!newTaskId || isLoading) return;

		// Helper to set conversation - respects conversationId param if valid
		function setConversationForTask(taskId: string) {
			const requestedConvId = conversationIdParam;
			if (requestedConvId) {
				const conv = chatStore.getConversation(requestedConvId);
				if (conv && conv.taskId === taskId) {
					chatStore.setActiveConversation(requestedConvId);
					return;
				}
			}
			// Fallback to most recent conversation for this task
			const taskConvs = chatStore.getConversationsForTask(taskId);
			chatStore.setActiveConversation(taskConvs.length > 0 ? taskConvs[0].id : null);
		}

		// Only run when task actually changes (not on initial load)
		if (currentTaskId && currentTaskId !== newTaskId) {
			// Task changed - update focus and find conversation
			taskStore.setFocusedTask(newTaskId);
			taskStore.loadTaskContext(newTaskId);
			setConversationForTask(newTaskId);
			currentTaskId = newTaskId;
		} else if (!currentTaskId && newTaskId) {
			// Initial load via effect - find conversation for this task
			setConversationForTask(newTaskId);
			currentTaskId = newTaskId;
		}
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

	// Format relative time (for completion timestamps)
	function formatRelativeTime(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}

	// Handle model change
	function handleModelChange(modelId: string) {
		settingsStore.setSelectedModel(modelId);
	}

	// Handle send message
	async function handleSend(content: string, attachments?: FileAttachment[], options?: { hidden?: boolean }) {
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
			// Set as active so UI displays messages
			chatStore.setActiveConversation(conversationId);
		}

		// Add user message
		chatStore.addMessage(conversationId, { role: 'user', content, attachments, hidden: options?.hidden });

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

			// Detect if user is confirming readiness for proposal (transition to 'proposing' phase)
			// This ensures the AI gets the proposing prompt and no token limit
			let effectivePhase = planMode?.phase;
			if (isPlanModeActive && planMode?.phase === 'eliciting') {
				const lowerContent = content.toLowerCase().trim();
				const confirmationPatterns = [
					/^yes\b/,
					/^yeah\b/,
					/^yep\b/,
					/^go ahead/,
					/^please do/,
					/^do it/,
					/^sounds good/,
					/^ready/,
					/^let'?s do/,
					/^proceed/,
					/^ok\b/,
					/^okay\b/,
					/^sure\b/,
					/breakdown/,
					/suggest/,
					/propose/
				];
				const isConfirmation = confirmationPatterns.some(p => p.test(lowerContent));
				if (isConfirmation) {
					// Transition to proposing phase BEFORE the API call
					await taskStore.setPlanModePhase('proposing');
					effectivePhase = 'proposing';
					console.log('[Plan Mode] User confirmed readiness, transitioning to proposing phase');
				}
			}

			// Build planMode context if Plan Mode is active
			const planModePayload = isPlanModeActive && planMode ? {
				taskId: taskIdParam,
				taskTitle: task?.title || '',
				description: task?.description,
				phase: effectivePhase,
				exchangeCount: planMode.exchangeCount,
				priority: task?.priority,
				dueDate: task?.dueDate ? task.dueDate.toISOString() : undefined,
				dueDateType: task?.dueDateType,
				createdAt: task?.createdAt ? task.createdAt.toISOString() : undefined
			} : undefined;

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
					taskId: taskIdParam,
					planMode: planModePayload
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

			// Check for subtask proposals in AI response
			// Only process AI proposals when user explicitly entered Plan Mode
			// Planning mode requires explicit user action ("Help me plan this" button)
			// This prevents automatic state changes from normal conversations
			if (taskIdParam && isPlanModeActive) {
				const finalConv = chatStore.getConversation(conversationId!);
				const finalMessage = finalConv?.messages.find(m => m.id === assistantMessageId);

				if (finalMessage?.content) {
					const hasProposal = contentContainsProposal(finalMessage.content);

					if (hasProposal) {
						const extracted = extractProposedSubtasks(finalMessage.content);

						if (extracted.length > 0) {
							await taskStore.setProposedSubtasks(extracted);

							// Generate synopsis in background (non-blocking)
							generateSynopsis(extracted);

							await taskStore.setPlanModePhase('confirming');
							toastStore.success(`Extracted ${extracted.length} subtasks!`);
						}
					} else {
						// If we're in 'proposing' phase but AI didn't output a valid proposal,
						// revert back to 'eliciting' so conversation can continue normally
						if (planMode?.phase === 'proposing') {
							console.log('[Plan Mode] AI did not output valid proposal, reverting to eliciting');
							await taskStore.setPlanModePhase('eliciting');
						}
						// Increment exchange count for tracking conversation depth
						await taskStore.incrementExchangeCount(taskIdParam);
					}
				}
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

	/**
	 * Trigger a fresh assistant response (for edit/resend/regenerate)
	 */
	async function triggerAssistantResponse() {
		const conversationId = chatStore.activeConversation?.id;
		if (!conversationId) return;

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

			const apiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
			if (systemPrompt) {
				apiMessages.push({ role: 'system', content: systemPrompt });
			}
			const taskContextMsg = buildTaskSystemContext();
			if (taskContextMsg) {
				apiMessages.push({ role: 'system', content: taskContextMsg });
			}
			for (const m of allMessages) {
				apiMessages.push({ role: m.role, content: m.content });
			}

			// Build planMode context if Plan Mode is active
			const planModePayload = isPlanModeActive && planMode ? {
				taskId: taskIdParam,
				taskTitle: task?.title || '',
				description: task?.description,
				phase: planMode.phase,
				exchangeCount: planMode.exchangeCount,
				priority: task?.priority,
				dueDate: task?.dueDate ? task.dueDate.toISOString() : undefined,
				dueDateType: task?.dueDateType,
				createdAt: task?.createdAt ? task.createdAt.toISOString() : undefined
			} : undefined;

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
					taskId: taskIdParam,
					planMode: planModePayload
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
							if (parsed.type === 'thinking_start') {
								chatStore.updateMessage(conversationId, assistantMessageId, { isThinking: true });
							} else if (parsed.type === 'thinking') {
								chatStore.appendToThinking(conversationId, assistantMessageId, parsed.content);
							} else if (parsed.type === 'thinking_end') {
								chatStore.updateMessage(conversationId, assistantMessageId, { isThinking: false });
							} else if (parsed.type === 'content') {
								chatStore.appendToMessage(conversationId, assistantMessageId, parsed.content);
							} else if (parsed.type === 'sources') {
								collectedSources = parsed.sources;
							} else if (parsed.type === 'error') {
								throw new Error(parsed.error);
							} else if (parsed.choices?.[0]?.delta?.content) {
								chatStore.appendToMessage(conversationId, assistantMessageId, parsed.choices[0].delta.content);
							}
						} catch (e) {
							if (e instanceof Error && e.message !== 'Unexpected token') {
								throw e;
							}
						}
					}
				}
			}

			chatStore.updateMessage(conversationId, assistantMessageId, {
				isStreaming: false,
				isThinking: false,
				sources: collectedSources.length > 0 ? collectedSources : undefined
			});

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

	/**
	 * Edit a message and resend
	 */
	async function handleEditAndResend(messageId: string, newContent: string) {
		const conversationId = chatStore.activeConversation?.id;
		if (!conversationId) return;

		chatStore.updateMessageContent(conversationId, messageId, newContent);
		const messageIndex = chatStore.getMessageIndex(conversationId, messageId);
		if (messageIndex !== -1) {
			chatStore.deleteMessagesFromIndex(conversationId, messageIndex + 1);
		}

		await triggerAssistantResponse();
	}

	/**
	 * Resend from a specific message (keeps original content)
	 */
	async function handleResend(messageId: string) {
		const conversationId = chatStore.activeConversation?.id;
		if (!conversationId) return;

		const messageIndex = chatStore.getMessageIndex(conversationId, messageId);
		if (messageIndex !== -1) {
			chatStore.deleteMessagesFromIndex(conversationId, messageIndex + 1);
		}

		await triggerAssistantResponse();
	}

	/**
	 * Regenerate the last assistant response
	 */
	async function handleRegenerate() {
		const conversationId = chatStore.activeConversation?.id;
		if (!conversationId) return;

		const conv = chatStore.getConversation(conversationId);
		if (!conv) return;

		const lastAssistantIndex = [...conv.messages].reverse().findIndex(m => m.role === 'assistant');
		if (lastAssistantIndex !== -1) {
			const actualIndex = conv.messages.length - 1 - lastAssistantIndex;
			chatStore.deleteMessagesFromIndex(conversationId, actualIndex);
		}

		await triggerAssistantResponse();
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

		// Add rich subtask context if available (from Plan Mode)
		if (isSubtask && task?.contextSummary) {
			try {
				const subtaskContext = JSON.parse(task.contextSummary);
				context += '\n\n--- Subtask Context ---';
				if (subtaskContext.whyImportant) {
					context += `\nWhy this matters: ${subtaskContext.whyImportant}`;
				}
				if (subtaskContext.definitionOfDone) {
					context += `\nDefinition of done: ${subtaskContext.definitionOfDone}`;
				}
				if (subtaskContext.hints && subtaskContext.hints.length > 0) {
					context += '\nHints:';
					for (const hint of subtaskContext.hints) {
						context += `\n- ${hint}`;
					}
				}
				context += '\n--- End Subtask Context ---';
			} catch {
				// Ignore parse errors
			}
		}

		// Add subtask list for parent tasks
		if (!isSubtask && subtasks.length > 0) {
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

	// Navigate to parent task (goes to dashboard view if parent has subtasks)
	function handleParentClick() {
		if (parentTask) {
			// Parent task likely has subtasks (since we're on a subtask), show dashboard
			goto(`/spaces/${spaceParam}/task/${parentTask.id}?view=dashboard`);
		}
	}

	// Complete subtask (for action items)
	async function handleCompleteSubtask(subtaskId: string) {
		await taskStore.completeTask(subtaskId);
	}

	// LocalStorage keys for task planning modal
	const PLANNING_STORAGE_KEY_LAST_MODEL = 'stratai-task-planning-model';
	const PLANNING_STORAGE_KEY_SKIP_MODAL = 'stratai-task-planning-skip-modal';

	// Check if we should skip the model selection modal
	function shouldSkipPlanningModal(): { skip: boolean; savedModel: string | null } {
		if (typeof window === 'undefined') return { skip: false, savedModel: null };
		const skipModal = localStorage.getItem(PLANNING_STORAGE_KEY_SKIP_MODAL) === 'true';
		const savedModel = localStorage.getItem(PLANNING_STORAGE_KEY_LAST_MODEL);
		return { skip: skipModal && !!savedModel, savedModel };
	}

	// Handle "Help me plan this" button click
	function handlePlanButtonClick() {
		const { skip, savedModel } = shouldSkipPlanningModal();
		if (skip && savedModel) {
			// Skip modal and use saved model
			handleStartPlanMode(savedModel);
		} else {
			// Show model selection modal
			showPlanningModelModal = true;
		}
	}

	// Handle model selection from modal
	function handlePlanningModelSelect(modelId: string) {
		showPlanningModelModal = false;
		handleStartPlanMode(modelId);
	}

	// Handle "Work directly" choice from approach modal
	async function handleChooseWork() {
		if (!taskIdParam) return;
		await taskStore.setApproachChosen(taskIdParam);
		// Work welcome will automatically show based on shouldShowWorkWelcome
	}

	// Handle "Break into subtasks" choice from approach modal
	function handleChoosePlan() {
		// First set approach chosen so modal doesn't reappear
		if (taskIdParam) {
			taskStore.setApproachChosen(taskIdParam);
		}
		// Show the model selection modal for planning
		showPlanningModelModal = true;
	}

	// Handle quick start from work welcome (prepopulate and send)
	async function handleWorkQuickStart(prompt: string) {
		await handleSend(prompt);
	}

	// Handle cancel planning mode (from context panel)
	async function handleCancelPlanMode() {
		await taskStore.exitPlanMode();
		toastStore.info('Exited planning mode');
	}

	// Start Plan Mode with specified model
	async function handleStartPlanMode(modelId?: string) {
		if (!task || !taskIdParam) return;

		const planningModel = modelId || settingsStore.selectedModel;

		// Check existing conversation for context preservation
		const existingConv = chatStore.activeConversation;
		const existingMessages = existingConv?.messages.filter(m => !m.isStreaming && !m.error) || [];
		const hasExistingContext = existingMessages.length > 0;
		const isSwitchingModels = existingConv && existingConv.model !== planningModel;

		let conversationId: string;

		if (hasExistingContext && isSwitchingModels) {
			// Switching models - create new conversation with history preserved
			conversationId = chatStore.createConversation(planningModel, {
				spaceId: spaceParam || undefined,
				areaId: task.areaId || undefined,
				taskId: taskIdParam
			});

			// Copy message history for context continuity
			for (const msg of existingMessages) {
				chatStore.addMessage(conversationId, {
					role: msg.role,
					content: msg.content,
					attachments: msg.attachments,
					hidden: msg.hidden
				});
			}
		} else if (hasExistingContext && !isSwitchingModels) {
			// Same model with existing context - reuse conversation
			conversationId = existingConv!.id;
		} else {
			// No existing context - create fresh conversation
			conversationId = chatStore.createConversation(planningModel, {
				spaceId: spaceParam || undefined,
				areaId: task.areaId || undefined,
				taskId: taskIdParam
			});
		}

		chatStore.setActiveConversation(conversationId);

		const result = await taskStore.startPlanMode(taskIdParam, conversationId);
		if (!result.success) {
			toastStore.error('Failed to start Plan Mode');
			return;
		}

		// Show toast if there are other tasks in planning
		if (result.existingPlanningCount > 0) {
			toastStore.info(`Now planning "${task.title}". ${result.existingPlanningCount + 1} tasks in planning.`);
		}

		// Send appropriate planning message based on context
		if (hasExistingContext) {
			// Continue from existing context - ask model to proceed with planning
			await handleSend(
				`Based on our discussion above, please help me break down "${task.title}" into actionable subtasks. What would be a good breakdown based on what we've discussed?`
			);
		} else {
			// Fresh start - ask clarifying questions first
			await handleSend(
				`I need help breaking down this task: "${task.title}". Can you ask me some clarifying questions to understand what needs to be done?`
			);
		}
	}

	// Exit Plan Mode
	async function handleExitPlanMode() {
		await taskStore.exitPlanMode();
	}

	// Generate synopsis for the proposed subtasks (fast, non-blocking)
	async function generateSynopsis(subtasks: ProposedSubtask[]) {
		if (!task || !taskIdParam) return;

		try {
			// Get recent conversation messages for context
			const conv = chatStore.activeConversation;
			const recentMessages = (conv?.messages || [])
				.filter(m => !m.hidden && !m.isStreaming && !m.error)
				.slice(-10)
				.map(m => ({ role: m.role, content: m.content }));

			const response = await fetch('/api/plan-synopsis', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					taskTitle: task.title,
					conversationMessages: recentMessages,
					proposedSubtasks: subtasks.map(s => ({ title: s.title, type: s.type }))
				}),
				signal: AbortSignal.timeout(5000) // 5 second timeout
			});

			if (response.ok) {
				const synopsis = await response.json();
				await taskStore.setSynopsis(synopsis);
			}
		} catch (err) {
			// Graceful degradation - continue without synopsis
			console.warn('Synopsis generation failed:', err);
		}
	}

	// Continue refining - go back to chat with AI help
	async function handleContinueRefining() {
		// Ensure we're in chat view mode
		viewMode = 'chat';

		// Clear proposed subtasks and synopsis
		await taskStore.setProposedSubtasks([]);
		await taskStore.setSynopsis(null);

		// Go back to eliciting phase
		await taskStore.setPlanModePhase('eliciting');

		// Ensure we have a conversation (might not be active during confirming phase)
		let conversationId = chatStore.activeConversation?.id;
		if (!conversationId) {
			// Try to use the planning conversation from planMode state
			const planConvId = planMode?.conversationId;
			if (planConvId) {
				chatStore.setActiveConversation(planConvId);
			} else if (task) {
				// Fallback: find existing conversation for this task
				const existingConv = chatStore.conversationList.find(c => c.taskId === taskIdParam);
				if (existingConv) {
					chatStore.setActiveConversation(existingConv.id);
				}
			}
		}

		// Send a hidden prompt to trigger AI to help refine
		const refinementPrompt = `I'd like to continue refining this task breakdown. The proposed subtasks aren't quite what I need. Please ask me clarifying questions to understand what adjustments I'd like to make - whether that's adding, removing, combining, reordering, or changing the type of subtasks.`;

		await handleSend(refinementPrompt, undefined, { hidden: true });
	}

	// Request proposal from AI
	async function handleRequestProposal() {
		await handleSend(
			"I'm ready for your suggestions. Please propose a breakdown of this task into clear subtasks."
		);
	}

	// Create subtasks from Plan Mode
	async function handleCreateSubtasks() {
		isCreatingSubtasks = true;
		try {
			const created = await taskStore.createSubtasksFromPlanMode();
			if (created.length > 0) {
				toastStore.success(`Created ${created.length} subtask${created.length === 1 ? '' : 's'}`);
			}
		} finally {
			isCreatingSubtasks = false;
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

	// Switch to dashboard view
	function handleSwitchToDashboard() {
		viewMode = 'dashboard';
	}

	// Manually add a subtask (not through Plan Mode)
	function handleManualAddSubtask() {
		// For now, start plan mode to add subtasks
		// Could be enhanced to show a quick-add modal later
		handlePlanButtonClick();
	}

	// Handle completing a subtask (conversation type)
	async function handleCompleteCurrentSubtask() {
		if (!task) return;
		await taskStore.completeTask(task.id);
		toastStore.success('Subtask completed!');
		// Navigate to parent task dashboard to see progress
		if (parentTask) {
			goto(`/spaces/${spaceParam}/task/${parentTask.id}?view=dashboard`);
		}
	}

	// Handle starting first subtask from plan confirmation
	function handleStartFirstSubtask() {
		const firstSubtaskId = planJustCompleted?.firstSubtaskId;
		taskStore.clearPlanJustCompleted();
		if (firstSubtaskId) {
			goto(`/spaces/${spaceParam}/task/${firstSubtaskId}`);
		}
	}

	// Handle viewing dashboard from plan confirmation
	function handleViewDashboard() {
		taskStore.clearPlanJustCompleted();
		viewMode = 'dashboard';
	}

	// Handle opening the complete task modal
	function handleOpenCompleteModal() {
		if (incompleteSubtasks.length > 0) {
			showCompleteModal = true;
		} else {
			// No incomplete subtasks, complete directly
			handleCompleteTaskOnly();
		}
	}

	// Complete all subtasks and the parent task
	async function handleCompleteAll() {
		if (!task) return;
		// Complete all incomplete subtasks first
		for (const subtask of incompleteSubtasks) {
			await taskStore.completeTask(subtask.id);
		}
		// Then complete the parent task
		await taskStore.completeTask(task.id);
		showCompleteModal = false;
		toastStore.success('Task and all subtasks completed!');
		goto(`/spaces/${spaceParam}`);
	}

	// Complete only the parent task
	async function handleCompleteTaskOnly() {
		if (!task) return;
		await taskStore.completeTask(task.id);
		showCompleteModal = false;
		toastStore.success('Task completed!');
		goto(`/spaces/${spaceParam}`);
	}

	// Reopen a completed task
	async function handleReopenTask() {
		if (!task) return;
		const reopened = await taskStore.reopenTask(task.id);
		if (reopened) {
			toastStore.success('Task reopened');
		}
	}

	// Dismiss subtask welcome
	function handleDismissSubtaskWelcome() {
		showSubtaskWelcome = false;
	}

	// Start working (dismiss welcome and collapse panel)
	function handleStartWorking() {
		showSubtaskWelcome = false;
		// Auto-collapse panel when starting to work
		if (hasExistingConversations) {
			setContextPanelCollapsed(true);
		}
	}

	// Handle conversation selection from TaskContextPanel
	function handleSelectConversation(conversationId: string) {
		chatStore.setActiveConversation(conversationId);
	}

	// Handle new chat creation from TaskContextPanel
	function handleNewChat() {
		const newConvId = chatStore.createConversation(settingsStore.selectedModel, {
			spaceId: spaceParam || undefined,
			areaId: task?.areaId || undefined,
			taskId: taskIdParam || undefined
		});
		chatStore.setActiveConversation(newConvId);
	}

	// Handle panel toggle
	function handleTogglePanelCollapse() {
		setContextPanelCollapsed(!contextPanelCollapsed);
	}

	// Handle quick action from panel (prepopulate input)
	function handleQuickAction(action: string) {
		// If panel is expanded, collapse it when quick action is used
		if (!contextPanelCollapsed) {
			setContextPanelCollapsed(true);
		}
	}

	// Auto-collapse panel when first message is sent
	$effect(() => {
		if (isSubtask && hasExistingConversations && visibleMessages.length > 0 && !contextPanelCollapsed) {
			// Panel should auto-collapse once conversation has messages
			// But only do this once per task visit, not on every message
			const autoCollapsedKey = `task-panel-auto-collapsed-${taskIdParam}`;
			if (typeof window !== 'undefined' && !sessionStorage.getItem(autoCollapsedKey)) {
				setContextPanelCollapsed(true);
				sessionStorage.setItem(autoCollapsedKey, 'true');
			}
		}
	});
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
				<!-- Complete buttons -->
				{#if isSubtask && task.subtaskType === 'conversation' && task.status !== 'completed'}
					<button type="button" class="complete-button" onclick={handleCompleteCurrentSubtask}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
						</svg>
						Mark Complete
					</button>
				{:else if !isSubtask && task.status !== 'completed'}
					<button type="button" class="complete-button" onclick={handleOpenCompleteModal}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
						</svg>
						Complete Task
					</button>
				{/if}

				{#if shouldShowDashboard && viewMode === 'chat'}
					<!-- Back to dashboard button when in chat view -->
					<button
						type="button"
						class="back-to-dashboard"
						onclick={handleSwitchToDashboard}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
						</svg>
						Subtasks
					</button>
				{/if}

				{#if subtasks.length > 0 && viewMode === 'chat'}
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

				{#if viewMode === 'chat'}
					<!-- Model: Selector when no messages, Badge when locked -->
					{#if messages.length === 0}
						<ModelSelector selectedModel={effectiveModel} onchange={handleModelChange} />
					{:else}
						<ModelBadge model={effectiveModel} />
					{/if}

					<!-- Export conversation -->
					<ConversationExportMenu
						conversationId={activeConversation?.id ?? null}
						hasMessages={messages.length > 0}
					/>
				{/if}

				{#if viewMode === 'chat' && !isPlanModeActive && panelSubtasks.length > 0}
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
				{/if}
			</div>
		</header>

		<!-- Main Content Area -->
		<div class="task-content" class:with-panel={showSubtaskPanel && !isPlanModeActive && !showConfirmingView && viewMode === 'chat' && panelSubtasks.length > 0}>
			{#if showPlanConfirmation && task}
				<!-- Plan Completion Confirmation View -->
				<PlanModeConfirmation
					{task}
					{subtasks}
					synopsis={planJustCompleted?.synopsis}
					spaceParam={spaceParam || ''}
					onStartFirstSubtask={handleStartFirstSubtask}
					onViewDashboard={handleViewDashboard}
				/>
			{:else if showConfirmingView && planMode && task}
				<!-- Full-page Confirming View (replaces side panel) -->
				<div class="confirming-view">
					<div class="confirming-container">
						{#if isCreatingSubtasks}
							<!-- Loading State -->
							<div class="confirming-loading">
								<div class="loading-spinner large"></div>
								<p class="loading-text">Working on your subtasks...</p>
								<p class="loading-subtext">Generating context and creating subtasks</p>
							</div>
						{:else}
							<!-- Review Breakdown -->
							<div class="confirming-header">
								<div class="confirming-icon">
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
									</svg>
								</div>
								<h2 class="confirming-title">Review Breakdown</h2>
								<p class="confirming-subtitle">
									{planMode.proposedSubtasks?.length ?? 0} subtasks for "{task.title}"
								</p>
							</div>

							<!-- Synopsis Card (when available) -->
							{#if task.planningData?.synopsis}
								<div class="synopsis-card">
									<div class="synopsis-header">
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
										</svg>
										<span>Why this breakdown</span>
									</div>
									<p class="synopsis-reasoning">{task.planningData.synopsis.reasoning}</p>
									<p class="synopsis-getting-started">
										<strong>Getting started:</strong> {task.planningData.synopsis.gettingStarted}
									</p>
								</div>
							{/if}

							<!-- Proposed Subtasks List -->
							<div class="proposed-list">
								{#each planMode.proposedSubtasks ?? [] as subtask (subtask.id)}
									{@const isConfirmed = subtask.confirmed !== false}
									<div class="proposed-item" class:disabled={!isConfirmed}>
										<button
											type="button"
											class="proposed-checkbox"
											class:checked={isConfirmed}
											onclick={() => handleToggleSubtask(subtask.id)}
										>
											{#if isConfirmed}
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
													<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
												</svg>
											{/if}
										</button>
										<span class="proposed-type-badge" class:action={subtask.type === 'action'}>
											{subtask.type === 'action' ? 'Action' : 'Chat'}
										</span>
										<input
											type="text"
											class="proposed-title-input"
											value={subtask.title}
											onchange={(e) => handleUpdateSubtask(subtask.id, e.currentTarget.value)}
											disabled={!isConfirmed}
										/>
										<button
											type="button"
											class="proposed-remove"
											onclick={() => handleRemoveSubtask(subtask.id)}
											title="Remove subtask"
										>
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
											</svg>
										</button>
									</div>
								{/each}
							</div>

							<!-- Add Subtask Button -->
							<button type="button" class="add-subtask-btn" onclick={handleAddSubtask}>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
								</svg>
								Add subtask
							</button>

							<!-- Action Buttons -->
							<div class="confirming-actions">
								<button type="button" class="btn-primary" onclick={handleCreateSubtasks}>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
									</svg>
									Create {(planMode.proposedSubtasks ?? []).filter(s => s.confirmed !== false).length} Subtasks
								</button>
								<button type="button" class="btn-secondary" onclick={handleContinueRefining}>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
									</svg>
									Keep Planning
								</button>
							</div>
						{/if}
					</div>
				</div>
			{:else if shouldShowDashboard && viewMode === 'dashboard'}
				<!-- Subtask Dashboard View -->
				<SubtaskDashboard
					{task}
					{subtasks}
					spaceParam={spaceParam || ''}
					onAddSubtask={handleManualAddSubtask}
					onCompleteTask={handleOpenCompleteModal}
				/>
			{:else}
				<!-- Chat Area with optional Context Panel -->
				<div class="chat-area-wrapper">
					<!-- Context Panel for subtasks with existing conversations -->
					{#if isSubtask && parentTask && hasExistingConversations}
						<TaskContextPanel
							subtask={task}
							{parentTask}
							conversations={taskConversations}
							activeConversationId={activeConversation?.id || null}
							collapsed={contextPanelCollapsed}
							isCompleted={isTaskCompleted}
							onSelectConversation={handleSelectConversation}
							onNewChat={handleNewChat}
							onToggleCollapse={handleTogglePanelCollapse}
							onQuickAction={handleQuickAction}
						/>
					{:else if shouldShowWorkUnitPanel && task}
						<!-- Context Panel for work units (parent tasks without subtasks) -->
						<TaskContextPanel
							{task}
							isWorkUnit={true}
							isPlanningMode={isPlanModeActive}
							conversations={taskConversations}
							activeConversationId={activeConversation?.id || null}
							collapsed={contextPanelCollapsed}
							isCompleted={isTaskCompleted}
							onSelectConversation={handleSelectConversation}
							onNewChat={handleNewChat}
							onToggleCollapse={handleTogglePanelCollapse}
							onQuickAction={handleQuickAction}
							onStartPlanMode={handlePlanButtonClick}
							onCancelPlanMode={handleCancelPlanMode}
						/>
					{/if}

					<div class="chat-area">
						<!-- Completion Banner for completed tasks -->
						{#if isTaskCompleted}
							<div class="completion-banner" transition:fly={{ y: -20, duration: 200 }}>
								<div class="completion-info">
									<svg class="completion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span class="completion-text">
										This {isSubtask ? 'subtask' : 'task'} is complete
										{#if task?.completedAt}
											<span class="completion-time">· Completed {formatRelativeTime(new Date(task.completedAt))}</span>
										{/if}
									</span>
								</div>
								<button type="button" class="reopen-btn" onclick={handleReopenTask}>
									Reopen
								</button>
							</div>
						{/if}

					<ChatMessageList bind:containerRef={chatContainer}>
						{#if visibleMessages.length === 0}
							<!-- Welcome State -->
							{#if isSubtask && parentTask && !hasExistingConversations && showSubtaskWelcome}
								<!-- First visit: Subtask Welcome with context (centered) -->
								<SubtaskWelcome
									subtask={task}
									{parentTask}
									onStartWorking={handleStartWorking}
									onSeeParent={handleParentClick}
									onDismiss={handleDismissSubtaskWelcome}
								/>
							{:else if shouldShowWorkWelcome && task}
								<!-- Work Unit Welcome (after choosing "Work directly") -->
								<TaskWorkWelcome
									{task}
									onQuickStart={handleWorkQuickStart}
								/>
						{:else}
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

									{#if !isSubtask && subtasks.length === 0 && !task.approachChosenAt}
										<div class="welcome-actions">
											<button
												type="button"
												class="plan-button"
												onclick={handlePlanButtonClick}
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
						{/if}
					{:else}
						{#each visibleMessages as message, i (message.id || i)}
							<ChatMessage
								{message}
								messageIndex={i}
								showTimestamp={settingsStore.showTimestamps}
								canEdit={message.role === 'user' && !chatStore.isStreaming}
								onEditAndResend={handleEditAndResend}
								onResend={handleResend}
								onRegenerate={handleRegenerate}
								onSecondOpinion={() => {}}
							/>
						{/each}
					{/if}
				</ChatMessageList>

					<!-- Chat Input -->
					<div class="chat-input-container" class:plan-mode={isPlanModeActive} class:completed={isTaskCompleted}>
						<ChatInput
							onsend={handleSend}
							onstop={handleStop}
							disabled={!selectedModel || isGenerating || isTaskCompleted}
							placeholder={isTaskCompleted ? 'Reopen to continue chatting...' : undefined}
						/>
					</div>
				</div>
			</div>

			<!-- Subtask Panel (when not in Plan Mode, only in chat view) -->
			{#if showSubtaskPanel && !isPlanModeActive && viewMode === 'chat' && panelSubtasks.length > 0}
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
							{isSubtask ? 'Related Subtasks' : 'Subtasks'}
						</h3>
						{#if panelSubtasks.length > 0}
							<span class="panel-count">{panelCompletedCount}/{panelSubtasks.length}</span>
						{/if}
					</div>

					<div class="panel-content">
						<div class="subtask-list">
								{#each panelSubtasks as panelSubtask (panelSubtask.id)}
									{@const isCompleted = panelSubtask.status === 'completed'}
									{@const isConversation = panelSubtask.subtaskType === 'conversation'}
									{@const isCurrent = panelSubtask.id === taskIdParam}
									<div
										class="subtask-item"
										class:completed={isCompleted}
										class:conversation={isConversation}
										class:current={isCurrent}
									>
										{#if panelSubtask.subtaskType === 'action'}
											<button
												type="button"
												class="subtask-checkbox"
												class:checked={isCompleted}
												onclick={() => handleCompleteSubtask(panelSubtask.id)}
												disabled={isCompleted}
											>
												{#if isCompleted}
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
														<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
													</svg>
												{/if}
											</button>
										{:else}
											<div class="subtask-icon" class:current={isCurrent}>
												{#if isCurrent}
													<svg viewBox="0 0 24 24" fill="currentColor">
														<circle cx="12" cy="12" r="4" />
													</svg>
												{:else}
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
														/>
													</svg>
												{/if}
											</div>
										{/if}

										<button
											type="button"
											class="subtask-title"
											class:strikethrough={isCompleted}
											class:current={isCurrent}
											onclick={() => handleSubtaskClick(panelSubtask.id)}
											disabled={isCompleted || (panelSubtask.subtaskType === 'action' && !isCurrent)}
										>
											{panelSubtask.title}
										</button>

										{#if isConversation && !isCompleted && !isCurrent}
											<svg class="subtask-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
												<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
											</svg>
										{/if}
									</div>
								{/each}
						</div>
					</div>
				</aside>
			{/if}
			{/if}
		</div>

		<!-- Plan Mode Panel - DISABLED -->
		<!-- The full-page confirming view handles subtask review -->
		<!-- During eliciting/proposing: clean conversation experience -->

		<!-- Complete Task Modal -->
		{#if showCompleteModal && task}
			<CompleteTaskModal
				{task}
				{incompleteSubtasks}
				onCompleteAll={handleCompleteAll}
				onCompleteTaskOnly={handleCompleteTaskOnly}
				onCancel={() => (showCompleteModal = false)}
			/>
		{/if}

		<!-- Task Planning Model Selection Modal -->
		{#if task}
			<TaskPlanningModelModal
				open={showPlanningModelModal}
				taskTitle={task.title}
				onSelect={handlePlanningModelSelect}
				onCancel={() => (showPlanningModelModal = false)}
			/>
		{/if}

		<!-- Task Approach Modal (first visit to parent task without subtasks) -->
		{#if task && shouldShowApproachModal}
			<TaskApproachModal
				open={true}
				taskTitle={task.title}
				taskColor={task.color}
				onChooseWork={handleChooseWork}
				onChoosePlan={handleChoosePlan}
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

	.complete-button {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: white;
		background: #22c55e;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.complete-button:hover {
		background: #16a34a;
	}

	.complete-button svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.back-to-dashboard {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.back-to-dashboard:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.back-to-dashboard svg {
		width: 0.875rem;
		height: 0.875rem;
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

	/* Chat Area Wrapper - contains optional panel + chat */
	.chat-area-wrapper {
		display: flex;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	/* Chat Area */
	.chat-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.chat-input-container.plan-mode {
		background: rgba(168, 85, 247, 0.05);
		border-top: 1px solid rgba(168, 85, 247, 0.2);
	}

	.chat-input-container.completed {
		opacity: 0.6;
	}

	/* Completion Banner */
	.completion-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		background: rgba(34, 197, 94, 0.1);
		border-bottom: 1px solid rgba(34, 197, 94, 0.2);
	}

	.completion-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.completion-icon {
		width: 1.25rem;
		height: 1.25rem;
		color: #22c55e;
	}

	.completion-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
	}

	.completion-time {
		color: rgba(255, 255, 255, 0.5);
	}

	.reopen-btn {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.reopen-btn:hover {
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.25);
		color: #fff;
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
		width: 320px;
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

	.subtask-item.current {
		background: rgba(var(--space-accent-rgb, 59, 130, 246), 0.15);
		border-left: 2px solid var(--space-accent, #3b82f6);
	}

	.subtask-icon.current {
		color: var(--space-accent, #3b82f6);
	}

	.subtask-title.current {
		color: var(--space-accent, #3b82f6);
		font-weight: 500;
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

	/* Scrollbar */
	.panel-content::-webkit-scrollbar {
		width: 6px;
	}

	.panel-content::-webkit-scrollbar-track {
		background: transparent;
	}

	.panel-content::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.panel-content::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	/* Full-page Confirming View */
	.confirming-view {
		flex: 1;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 2rem 1rem;
		overflow-y: auto;
	}

	.confirming-container {
		width: 100%;
		max-width: 600px;
	}

	.confirming-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	.loading-spinner.large {
		width: 3rem;
		height: 3rem;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: var(--space-accent, #3b82f6);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.loading-text {
		font-size: 1.125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		margin: 1.5rem 0 0.5rem 0;
	}

	.loading-subtext {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.confirming-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.confirming-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3.5rem;
		height: 3.5rem;
		margin: 0 auto 1rem;
		background: rgba(168, 85, 247, 0.15);
		border-radius: 1rem;
	}

	.confirming-icon svg {
		width: 1.75rem;
		height: 1.75rem;
		color: #a855f7;
	}

	.confirming-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
		margin: 0 0 0.375rem 0;
	}

	.confirming-subtitle {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.proposed-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.proposed-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.75rem;
		transition: all 0.15s ease;
	}

	.proposed-item:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.proposed-item.disabled {
		opacity: 0.5;
	}

	.proposed-checkbox {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 0.25rem;
		background: transparent;
		cursor: pointer;
		flex-shrink: 0;
		transition: all 0.15s ease;
	}

	.proposed-checkbox:hover {
		border-color: rgba(255, 255, 255, 0.5);
	}

	.proposed-checkbox.checked {
		background: var(--space-accent, #3b82f6);
		border-color: var(--space-accent, #3b82f6);
	}

	.proposed-checkbox svg {
		width: 0.875rem;
		height: 0.875rem;
		color: white;
	}

	.proposed-type-badge {
		flex-shrink: 0;
		padding: 0.125rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		border-radius: 0.25rem;
		background: rgba(59, 130, 246, 0.15);
		color: #60a5fa;
	}

	.proposed-type-badge.action {
		background: rgba(34, 197, 94, 0.15);
		color: #4ade80;
	}

	.proposed-title-input {
		flex: 1;
		min-width: 0;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
		background: transparent;
		border: none;
		outline: none;
		padding: 0.25rem 0;
	}

	.proposed-title-input:focus {
		color: rgba(255, 255, 255, 1);
	}

	.proposed-title-input:disabled {
		color: rgba(255, 255, 255, 0.4);
	}

	.proposed-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		color: rgba(255, 255, 255, 0.3);
		background: none;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		opacity: 0;
		transition: all 0.15s ease;
	}

	.proposed-item:hover .proposed-remove {
		opacity: 1;
	}

	.proposed-remove:hover {
		color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
	}

	.proposed-remove svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.add-subtask-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		background: transparent;
		border: 1px dashed rgba(255, 255, 255, 0.15);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
		margin-bottom: 2rem;
	}

	.add-subtask-btn:hover {
		color: rgba(255, 255, 255, 0.8);
		border-color: rgba(255, 255, 255, 0.3);
		background: rgba(255, 255, 255, 0.02);
	}

	.add-subtask-btn svg {
		width: 1rem;
		height: 1rem;
	}

	.confirming-actions {
		display: flex;
		gap: 0.75rem;
	}

	.confirming-actions .btn-primary {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
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

	.confirming-actions .btn-primary:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	.confirming-actions .btn-primary svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	.confirming-actions .btn-secondary {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		font-size: 0.9375rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.confirming-actions .btn-secondary:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.15);
	}

	/* Synopsis Card */
	.synopsis-card {
		margin-bottom: 1.5rem;
		padding: 1rem 1.25rem;
		background: rgba(168, 85, 247, 0.08);
		border: 1px solid rgba(168, 85, 247, 0.2);
		border-radius: 0.75rem;
	}

	.synopsis-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #a855f7;
	}

	.synopsis-header svg {
		width: 1rem;
		height: 1rem;
	}

	.synopsis-reasoning {
		font-size: 0.875rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.85);
		margin: 0 0 0.75rem 0;
	}

	.synopsis-getting-started {
		font-size: 0.8125rem;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.6);
		margin: 0;
	}

	.synopsis-getting-started strong {
		color: rgba(255, 255, 255, 0.75);
	}
</style>
