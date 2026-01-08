<script lang="ts">
	/**
	 * Area Page - Chat interface within an Area
	 *
	 * Features:
	 * - Full chat experience scoped to this area
	 * - Area context injected into prompts
	 * - Conversations created with areaId
	 * - Navigation back to space dashboard
	 */
	import { tick, onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import ChatInput from '$lib/components/ChatInput.svelte';
	import ChatMessageList from '$lib/components/chat/ChatMessageList.svelte';
	import AreaWelcomeScreen from '$lib/components/chat/AreaWelcomeScreen.svelte';
	import ConversationDrawer from '$lib/components/chat/ConversationDrawer.svelte';
	import TaskContextBanner from '$lib/components/chat/TaskContextBanner.svelte';
	import ConversationSummary from '$lib/components/chat/ConversationSummary.svelte';
	import SessionSeparator from '$lib/components/chat/SessionSeparator.svelte';
	import ModelSelector from '$lib/components/ModelSelector.svelte';
	import ModelBadge from '$lib/components/ModelBadge.svelte';
	import SecondOpinionPanel from '$lib/components/chat/SecondOpinionPanel.svelte';
	import SecondOpinionModelSelect from '$lib/components/chat/SecondOpinionModelSelect.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import { TasksPanel, ContextPanel, TaskSuggestionCard } from '$lib/components/areas';
	import TaskModal from '$lib/components/spaces/TaskModal.svelte';
	import { parseTaskSuggestions, parseDueDate, type TaskSuggestion } from '$lib/utils/task-suggestion-parser';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { documentStore } from '$lib/stores/documents.svelte';
	import type { CreateTaskInput, Task } from '$lib/types/tasks';
	import { areaStore } from '$lib/stores/areas.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import { modelSupportsVision } from '$lib/config/model-capabilities';
	import { SPACES, isValidSpace } from '$lib/config/spaces';
	import type { FileAttachment } from '$lib/types/chat';
	import type { Area } from '$lib/types/areas';
	import type { Space, SystemSpaceSlug } from '$lib/types/spaces';
	import { isSystemSpace as checkIsSystemSpace } from '$lib/types/spaces';
	import SpaceIcon from '$lib/components/SpaceIcon.svelte';

	// Route params
	let spaceParam = $derived($page.params.space);
	let areaParam = $derived($page.params.area);

	// Load space (system or custom)
	let spaceFromStore = $derived.by(() => {
		if (!spaceParam) return null;
		return spacesStore.getSpaceBySlug(spaceParam);
	});

	let isSystemSpace = $derived(spaceParam ? isValidSpace(spaceParam) : false);

	let spaceConfig = $derived.by(() => {
		if (isSystemSpace && spaceParam) {
			const config = SPACES[spaceParam as keyof typeof SPACES];
			return {
				id: spaceParam,
				slug: spaceParam,
				name: config.name,
				icon: config.icon,
				color: config.accentColor,
				context: '',
				type: 'system' as const
			};
		}
		if (spaceFromStore) {
			return spaceFromStore;
		}
		return null;
	});

	// Construct Space object
	let space = $derived.by((): Space | null => {
		if (!spaceConfig) return null;
		return {
			id: spaceConfig.id || spaceParam || '',
			slug: spaceConfig.slug || spaceParam || '',
			name: spaceConfig.name || 'Space',
			type: spaceConfig.type || 'custom',
			icon: spaceConfig.icon,
			color: spaceConfig.color,
			context: spaceConfig.context,
			orderIndex: 0,
			userId: 'admin',
			createdAt: new Date(),
			updatedAt: new Date()
		};
	});

	// Always use proper space ID from store for API calls and store operations
	// This ensures consistency with database IDs vs URL slugs
	let properSpaceId = $derived(spaceFromStore?.id ?? '');

	// Load area (uses proper space ID for lookup)
	let area = $derived.by((): Area | null => {
		if (!properSpaceId || !areaParam) return null;
		return areaStore.getAreaBySlug(properSpaceId, areaParam) ?? null;
	});

	// Derive colors
	let spaceColor = $derived(space?.color || '#3b82f6');
	let areaColor = $derived(area?.color || spaceColor);

	// Chat state
	let messagesContainer: HTMLElement | undefined = $state();
	let selectedModel = $derived(settingsStore.selectedModel || '');
	let effectiveModel = $derived(
		chatStore.activeConversation?.model || settingsStore.selectedModel || ''
	);
	let settingsOpen = $state(false);
	let isGeneratingSummary = $state(false);
	let isLoading = $state(true);
	let drawerOpen = $state(false);

	// Second Opinion state
	let showModelSelector = $state(false);
	let modelSelectorPosition = $state({ top: 0, left: 0 });
	let pendingSecondOpinionIndex = $state<number | null>(null);
	let secondOpinion = $derived(chatStore.secondOpinion);
	let isSecondOpinionOpen = $derived(chatStore.isSecondOpinionOpen);

	// Messages and conversation state
	let messages = $derived(chatStore.messages);
	let currentSummary = $derived(chatStore.activeConversation?.summary || null);
	let isContinuedConversation = $derived(!!chatStore.activeConversation?.continuedFromId);
	let continuationSummary = $derived(chatStore.activeConversation?.continuationSummary ?? undefined);

	let parentConversation = $derived(
		chatStore.activeConversation?.continuedFromId
			? chatStore.getConversation(chatStore.activeConversation.continuedFromId)
			: null
	);
	let parentMessages = $derived(
		(parentConversation?.messages || []).filter((m) => m && m.id)
	);

	// Linked task for the current conversation (for context banner)
	let linkedTask = $derived.by(() => {
		const taskId = chatStore.activeConversation?.taskId;
		if (!taskId) return null;
		return taskStore.getTask(taskId);
	});

	// Tasks in this area (active/planning only)
	let areaTasks = $derived.by(() => {
		if (!area?.id) return [];
		return taskStore.getTasksForAreaId(area.id)
			.filter(t => t.status === 'active' || t.status === 'planning')
			.slice(0, 5);
	});

	// Conversations in this area (for welcome screen)
	let areaConversations = $derived.by(() => {
		if (!area?.id) return [];
		return chatStore.getConversationsByArea(area.id);
	});

	// Conversations from other areas in same space
	let otherAreaConversations = $derived(chatStore.groupedConversations.otherInSpace);

	// All areas in this space (for area lookup in drawer, uses proper space ID)
	let allAreasInSpace = $derived(properSpaceId ? areaStore.getAreasForSpace(properSpaceId) : []);

	// Task info lookup for drawer badges (includes subtask info)
	function getTaskInfo(taskId: string): { id: string; title: string; color?: string; isSubtask?: boolean; parentTaskTitle?: string } | null {
		const task = taskStore.getTask(taskId);
		if (!task) return null;

		// Check if this is a subtask and get parent info
		if (task.parentTaskId) {
			const parentTask = taskStore.getTask(task.parentTaskId);
			return {
				id: task.id,
				title: task.title,
				color: task.color,
				isSubtask: true,
				parentTaskTitle: parentTask?.title
			};
		}

		return { id: task.id, title: task.title, color: task.color };
	}

	// Panel states
	let tasksPanelOpen = $state(false);
	let contextPanelOpen = $state(false);
	let taskModalOpen = $state(false);

	// Task suggestion state
	let dismissedSuggestions = $state<Set<string>>(new Set()); // Message IDs with dismissed suggestions
	let pendingSuggestion = $state<TaskSuggestion | null>(null); // Suggestion waiting to create task

	// Parse suggestions from the last assistant message
	let currentSuggestionInfo = $derived.by(() => {
		if (!messages.length) return null;

		// Find the last assistant message that's not streaming
		for (let i = messages.length - 1; i >= 0; i--) {
			const msg = messages[i];
			if (msg.role === 'assistant' && !msg.isStreaming && msg.content) {
				// Skip if already dismissed
				if (dismissedSuggestions.has(msg.id)) return null;

				const { suggestions } = parseTaskSuggestions(msg.content);
				if (suggestions.length > 0) {
					return {
						messageId: msg.id,
						messageIndex: i,
						suggestion: suggestions[0] // Only show first suggestion
					};
				}
				// Only check the last assistant message
				break;
			}
		}
		return null;
	});

	// Counts for header badges
	let areaTaskCount = $derived(areaTasks.length);
	let spaceDocCount = $derived.by(() => {
		if (!properSpaceId) return 0;
		return documentStore.getDocuments(properSpaceId).length;
	});

	// All areas for TaskModal (uses proper space ID)
	let allAreas = $derived(properSpaceId ? areaStore.getAreasForSpace(properSpaceId) : []);

	// Apply area color
	$effect(() => {
		if (areaColor) {
			document.documentElement.style.setProperty('--space-accent', areaColor);
			document.documentElement.style.setProperty('--space-accent-muted', `color-mix(in srgb, ${areaColor} 15%, transparent)`);
			document.documentElement.style.setProperty('--space-accent-ring', `color-mix(in srgb, ${areaColor} 40%, transparent)`);
		}
		return () => {
			document.documentElement.style.removeProperty('--space-accent');
			document.documentElement.style.removeProperty('--space-accent-muted');
			document.documentElement.style.removeProperty('--space-accent-ring');
		};
	});

	// Set active space in store
	$effect(() => {
		if (spaceParam) {
			chatStore.setActiveSpaceId(spaceParam);
		}
		return () => {
			chatStore.setActiveSpaceId(null);
		};
	});

	// Set selected area in store (for groupedConversations filtering)
	$effect(() => {
		if (area?.id) {
			chatStore.setSelectedAreaId(area.id);
		}
		return () => {
			chatStore.setSelectedAreaId(null);
		};
	});

	// Load data on mount
	onMount(async () => {
		if (!spaceParam || !areaParam) {
			goto('/spaces');
			return;
		}

		// Load spaces first to get proper IDs
		await spacesStore.loadSpaces();
		const loadedSpace = spacesStore.getSpaceBySlug(spaceParam);
		if (!loadedSpace) {
			toastStore.error('Space not found');
			goto('/spaces');
			return;
		}

		// Load areas, chat, tasks, and documents using proper space ID
		await Promise.all([
			areaStore.loadAreas(loadedSpace.id),
			chatStore.refresh(),
			taskStore.loadTasks(loadedSpace.id),
			documentStore.loadDocuments(loadedSpace.id)
		]);

		// Validate area exists (use proper space ID for lookup)
		const loadedArea = areaStore.getAreaBySlug(loadedSpace.id, areaParam);
		if (!loadedArea) {
			toastStore.error('Area not found');
			goto(`/spaces/${spaceParam}`);
			return;
		}

		// Check for conversation query param
		const conversationId = $page.url.searchParams.get('conversation');
		if (conversationId) {
			chatStore.setActiveConversation(conversationId);
		} else {
			// Context isolation: If current active conversation doesn't belong to this area,
			// clear it so the Welcome Screen shows (user can continue via "Continue where you left off")
			const currentConv = chatStore.activeConversation;
			if (currentConv && currentConv.areaId !== loadedArea.id) {
				chatStore.setActiveConversation(null);
			}
		}

		isLoading = false;
	});

	// Auto-scroll to bottom when messages change
	$effect(() => {
		if (messages.length > 0) {
			tick().then(scrollToBottom);
		}
	});

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	// Chat handlers
	function hasImageAttachments(attachments?: FileAttachment[]): boolean {
		return attachments?.some(att => att.content.type === 'image') || false;
	}

	function formatTextAttachmentsForLLM(attachments: FileAttachment[]): string {
		const textAttachments = attachments.filter(att => att.content.type === 'text');
		if (textAttachments.length === 0) return '';

		let context = 'The user has attached the following documents:\n\n';
		for (const att of textAttachments) {
			context += `--- ${att.filename} ---\n`;
			if (att.content.type === 'text') {
				context += att.content.data + '\n\n';
				if (att.truncated) {
					context += '(Note: This document was truncated due to length)\n\n';
				}
			}
		}
		context += 'Please reference these documents when answering the user\'s question.\n';
		return context;
	}

	function buildVisionMessage(
		textContent: string,
		attachments: FileAttachment[]
	): Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; format?: string } }> {
		const contentBlocks: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; format?: string } }> = [];

		for (const att of attachments) {
			if (att.content.type === 'image') {
				contentBlocks.push({
					type: 'image_url',
					image_url: {
						url: `data:${att.content.mediaType};base64,${att.content.data}`,
						format: att.content.mediaType
					}
				});
			}
		}

		for (const att of attachments) {
			if (att.content.type === 'text') {
				contentBlocks.push({
					type: 'text',
					text: `[Document: ${att.filename}]\n${att.content.data}${att.truncated ? '\n(Note: Document truncated due to length)' : ''}`
				});
			}
		}

		if (textContent.trim()) {
			contentBlocks.push({ type: 'text', text: textContent });
		}

		return contentBlocks;
	}

	async function handleSend(content: string, attachments?: FileAttachment[]) {
		if (chatStore.isSecondOpinionOpen) {
			chatStore.closeSecondOpinion();
		}

		const modelToUse = chatStore.activeConversation?.model || settingsStore.selectedModel;
		if (!modelToUse) {
			toastStore.error('Please select a model first');
			return;
		}

		const hasImages = hasImageAttachments(attachments);
		if (hasImages && !modelSupportsVision(modelToUse)) {
			const modelName = modelCapabilitiesStore.getDisplayName(modelToUse);
			toastStore.error(`${modelName} does not support image analysis.`);
			return;
		}

		let conversationId = chatStore.activeConversation?.id;
		if (!conversationId) {
			// Create new conversation with area context
			conversationId = chatStore.createConversation(settingsStore.selectedModel, {
				spaceId: spaceParam || undefined,
				areaId: area?.id || undefined
			});
		}

		chatStore.addMessage(conversationId, { role: 'user', content, attachments });

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
			const hasImages = hasImageAttachments(attachments);

			const apiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<unknown> }> = [];

			if (systemPrompt) {
				apiMessages.push({ role: 'system', content: systemPrompt });
			}

			if (attachments && !hasImages) {
				const textContext = formatTextAttachmentsForLLM(attachments);
				if (textContext) {
					apiMessages.push({ role: 'system', content: textContext });
				}
			}

			const historyMessages = hasImages ? allMessages.slice(0, -1) : allMessages;
			for (const m of historyMessages) {
				apiMessages.push({ role: m.role, content: m.content });
			}

			if (hasImages && attachments) {
				const visionContent = buildVisionMessage(content, attachments);
				apiMessages.push({ role: 'user', content: visionContent });
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
					areaId: area?.id
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
								} else if (parsed.status === 'reading_document') {
									chatStore.updateMessage(conversationId!, assistantMessageId, {
										searchStatus: 'reading_document', searchQuery: parsed.query
									});
								} else if (parsed.status === 'processing') {
									chatStore.updateMessage(conversationId!, assistantMessageId, {
										searchStatus: 'searching', searchQuery: undefined
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

	function handleStop() {
		chatStore.stopStreaming();
	}

	function handleNewChat() {
		if (!selectedModel) {
			toastStore.warning('Please select a model first');
			return;
		}
		chatStore.createConversation(selectedModel, {
			spaceId: spaceParam || undefined,
			areaId: area?.id || undefined
		});
	}

	function handleModelChange(model: string) {
		settingsStore.setSelectedModel(model);
		if (chatStore.activeConversation) {
			chatStore.updateConversationModel(chatStore.activeConversation.id, model);
		}
	}

	async function handleGenerateSummary() {
		const conversation = chatStore.activeConversation;
		if (!conversation || !effectiveModel) return;

		isGeneratingSummary = true;

		try {
			const response = await fetch('/api/summarize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: effectiveModel,
					messages: conversation.messages.map(m => ({ role: m.role, content: m.content }))
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error?.message || 'Failed to generate summary');
			}

			const { summary } = await response.json();
			chatStore.setSummary(conversation.id, summary);
			scrollToBottom();
		} catch (err) {
			toastStore.error(err instanceof Error ? err.message : 'Failed to generate summary');
		} finally {
			isGeneratingSummary = false;
		}
	}

	function handleDismissSummary() {
		// Summary dismissal is handled by the ConversationSummary component's close action
		// The summary remains in the conversation but is collapsed
	}

	// Second opinion handlers
	function handleSecondOpinionTrigger(messageIndex: number, event?: MouseEvent) {
		pendingSecondOpinionIndex = messageIndex;
		if (event) {
			const rect = (event.target as HTMLElement).getBoundingClientRect();
			modelSelectorPosition = {
				top: rect.bottom + 8,
				left: rect.left
			};
		}
		showModelSelector = true;
	}

	async function handleSecondOpinionModelSelect(modelId: string) {
		showModelSelector = false;
		if (pendingSecondOpinionIndex === null) return;

		const conversation = chatStore.activeConversation;
		if (!conversation) return;

		const messageIndex = pendingSecondOpinionIndex;
		const sourceMessage = messages[messageIndex];
		if (!sourceMessage) return;

		chatStore.openSecondOpinion(sourceMessage.id, messageIndex, modelId);

		try {
			const contextMessages = messages.slice(0, messageIndex).map(m => ({
				role: m.role,
				content: m.content
			}));

			const response = await fetch('/api/chat/second-opinion', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					conversationId: conversation.id,
					sourceMessageIndex: messageIndex,
					modelId,
					messages: contextMessages
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error?.message || 'Failed to get second opinion');
			}

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

							if (parsed.type === 'thinking') {
								chatStore.appendToSecondOpinionThinking(parsed.content);
							} else if (parsed.type === 'content') {
								chatStore.appendToSecondOpinion(parsed.content);
							} else if (parsed.type === 'error') {
								throw new Error(parsed.error);
							}
						} catch (e) {
							if (e instanceof Error && e.message !== 'Unexpected token') {
								throw e;
							}
						}
					}
				}
			}

			chatStore.completeSecondOpinion();
		} catch (err) {
			chatStore.setSecondOpinionError(err instanceof Error ? err.message : 'Unknown error');
		}

		pendingSecondOpinionIndex = null;
	}

	function handleCloseSecondOpinion() {
		chatStore.closeSecondOpinion();
	}

	function handleUseSecondOpinion() {
		if (!secondOpinion?.content) return;
		handleSend(`Based on this guidance, please revise your previous answer:\n\n${secondOpinion.content}`);
		chatStore.closeSecondOpinion();
	}

	function handleForkWithSecondOpinion() {
		if (!secondOpinion || !secondOpinion.modelId) return;
		chatStore.createConversation(secondOpinion.modelId, {
			spaceId: spaceParam || undefined,
			areaId: area?.id || undefined
		});
		chatStore.closeSecondOpinion();
	}

	// Navigation
	function goToSpaceDashboard() {
		goto(`/spaces/${spaceParam}`);
	}

	function goToTask(taskId: string) {
		goto(`/spaces/${spaceParam}/task/${taskId}`);
	}

	// Handle area context/document updates from ContextPanel
	async function handleAreaUpdate(areaId: string, updates: { context?: string; contextDocumentIds?: string[] }) {
		await areaStore.updateArea(areaId, updates);
	}

	// Task creation handler (from TasksPanel)
	async function handleCreateTask(input: CreateTaskInput): Promise<Task | null> {
		// Pre-fill with current area if not specified
		const taskInput: CreateTaskInput = {
			...input,
			areaId: input.areaId || area?.id
		};
		return taskStore.createTask(taskInput);
	}

	// Task suggestion handlers
	function handleAcceptSuggestion(suggestion: TaskSuggestion) {
		// Store the suggestion and open TaskModal with pre-filled values
		pendingSuggestion = suggestion;
		taskModalOpen = true;
	}

	function handleDismissSuggestion() {
		if (currentSuggestionInfo) {
			// Add to dismissed set
			dismissedSuggestions = new Set([...dismissedSuggestions, currentSuggestionInfo.messageId]);
		}
	}

	// Modified task creation to handle suggestions
	async function handleCreateTaskFromModal(input: CreateTaskInput): Promise<Task | null> {
		const result = await handleCreateTask(input);
		if (result && pendingSuggestion && currentSuggestionInfo) {
			// Task created from suggestion - dismiss the card
			dismissedSuggestions = new Set([...dismissedSuggestions, currentSuggestionInfo.messageId]);
			pendingSuggestion = null;
			toastStore.success('Task created from suggestion');
		}
		return result;
	}

	// Get pre-filled values for TaskModal from pending suggestion
	let suggestionPreFill = $derived.by(() => {
		if (!pendingSuggestion) return undefined;
		const dueDate = pendingSuggestion.dueDate ? parseDueDate(pendingSuggestion.dueDate) : null;
		return {
			title: pendingSuggestion.title,
			priority: pendingSuggestion.priority,
			dueDate: dueDate || undefined
		};
	});

	// Continue an existing chat
	function handleContinueChat(conversationId: string) {
		chatStore.setActiveConversation(conversationId);
	}

	// Pin/unpin a conversation
	function handlePinConversation(conversationId: string, pinned: boolean) {
		// togglePin will flip the current state
		const conv = chatStore.getConversation(conversationId);
		if (conv && conv.pinned !== pinned) {
			chatStore.togglePin(conversationId);
		}
	}

	// Move conversation to current area
	function handleMoveToArea(conversationId: string) {
		if (!area?.id) return;
		chatStore.updateConversationContext(conversationId, { areaId: area.id });
		toastStore.success('Conversation moved to ' + area.name);
	}

	// Open Task Focus mode for the linked task
	// Preserve the current conversation so the user sees the same one in task focus
	function handleOpenTaskFocus() {
		if (!linkedTask) return;
		const convId = chatStore.activeConversation?.id;
		const url = `/spaces/${spaceParam}/task/${linkedTask.id}${convId ? `?conversationId=${convId}` : ''}`;
		goto(url);
	}

	// ============================================
	// Message Edit/Resend/Regenerate handlers
	// ============================================

	/**
	 * Trigger a fresh assistant response for the current conversation
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

			const apiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
			const systemPrompt = settingsStore.systemPrompt?.trim();
			if (systemPrompt) {
				apiMessages.push({ role: 'system', content: systemPrompt });
			}
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
					areaId: area?.id
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
	 * Edit a message and resend from that point
	 */
	async function handleEditAndResend(messageId: string, newContent: string) {
		const conversationId = chatStore.activeConversation?.id;
		if (!conversationId) return;

		// Update the message content
		chatStore.updateMessageContent(conversationId, messageId, newContent);

		// Get message index and delete all subsequent messages
		const messageIndex = chatStore.getMessageIndex(conversationId, messageId);
		if (messageIndex !== -1) {
			chatStore.deleteMessagesFromIndex(conversationId, messageIndex + 1);
		}

		// Trigger fresh response
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

		// Find the last assistant message and delete it
		const conv = chatStore.getConversation(conversationId);
		if (!conv) return;

		const lastAssistantIndex = [...conv.messages].reverse().findIndex(m => m.role === 'assistant');
		if (lastAssistantIndex !== -1) {
			const actualIndex = conv.messages.length - 1 - lastAssistantIndex;
			chatStore.deleteMessagesFromIndex(conversationId, actualIndex);
		}

		await triggerAssistantResponse();
	}

	// ============================================
	// Conversation Management handlers
	// ============================================

	// Conversation menu state
	let showConversationMenu = $state(false);
	let isRenaming = $state(false);
	let renameValue = $state('');

	function handleRenameConversation() {
		const conv = chatStore.activeConversation;
		if (!conv) return;
		renameValue = conv.title || 'Untitled';
		isRenaming = true;
		showConversationMenu = false;
	}

	function handleSaveRename() {
		const conv = chatStore.activeConversation;
		if (!conv || !renameValue.trim()) return;
		chatStore.updateConversationTitle(conv.id, renameValue.trim());
		isRenaming = false;
		renameValue = '';
	}

	function handleCancelRename() {
		isRenaming = false;
		renameValue = '';
	}

	function handleExportConversation() {
		const conv = chatStore.activeConversation;
		if (!conv) return;
		showConversationMenu = false;

		// Build markdown export
		const lines: string[] = [];
		lines.push(`# ${conv.title || 'Conversation'}`);
		lines.push('');
		lines.push(`**Model:** ${conv.model}`);
		lines.push(`**Date:** ${new Date(conv.createdAt).toLocaleString()}`);
		if (space?.name) lines.push(`**Space:** ${space.name}`);
		if (area?.name) lines.push(`**Area:** ${area.name}`);
		lines.push('');
		lines.push('---');
		lines.push('');

		for (const message of conv.messages) {
			const roleLabel = message.role === 'user' ? '**You:**' : '**Assistant:**';
			lines.push(roleLabel);
			lines.push('');
			lines.push(message.content);
			lines.push('');
		}

		const markdown = lines.join('\n');
		const blob = new Blob([markdown], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${(conv.title || 'conversation').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		toastStore.success('Conversation exported');
	}

	function handleDeleteConversation() {
		const conv = chatStore.activeConversation;
		if (!conv) return;
		showConversationMenu = false;

		chatStore.deleteConversation(conv.id);
		toastStore.success('Conversation deleted');
	}

	// ============================================
	// Drawer-specific handlers (by conversation ID)
	// ============================================

	function handleDrawerRename(convId: string, newTitle: string) {
		chatStore.updateConversationTitle(convId, newTitle);
		toastStore.success('Conversation renamed');
	}

	function handleDrawerExport(convId: string) {
		const conv = chatStore.getConversation(convId);
		if (!conv) return;

		// Build markdown export
		const lines: string[] = [];
		lines.push(`# ${conv.title || 'Conversation'}`);
		lines.push('');
		lines.push(`**Model:** ${conv.model}`);
		lines.push(`**Date:** ${new Date(conv.createdAt).toLocaleString()}`);
		if (space?.name) lines.push(`**Space:** ${space.name}`);
		if (area?.name) lines.push(`**Area:** ${area.name}`);
		lines.push('');
		lines.push('---');
		lines.push('');

		for (const message of conv.messages) {
			const roleLabel = message.role === 'user' ? '**You:**' : '**Assistant:**';
			lines.push(roleLabel);
			lines.push('');
			lines.push(message.content);
			lines.push('');
		}

		const markdown = lines.join('\n');
		const blob = new Blob([markdown], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${(conv.title || 'conversation').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		toastStore.success('Conversation exported');
	}

	function handleDrawerDelete(convId: string) {
		chatStore.deleteConversation(convId);
		toastStore.success('Conversation deleted');
	}
</script>

<svelte:head>
	<title>{area?.name || 'Area'} - {space?.name || 'Space'} | StratAI</title>
</svelte:head>

{#if isLoading}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading...</p>
	</div>
{:else if space && area}
	<div class="area-page" style="--area-color: {areaColor}">
		<!-- Header -->
		<header class="area-header">
			<div class="header-left">
				<button type="button" class="back-button" onclick={goToSpaceDashboard} title="Back to {space.name}">
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
					</svg>
				</button>
				<div class="breadcrumb">
					<button type="button" class="breadcrumb-space" onclick={goToSpaceDashboard}>
						{#if checkIsSystemSpace(space.slug)}
							<SpaceIcon space={space.slug as SystemSpaceSlug} size="sm" class="space-icon-svg" />
						{:else if space.icon}
							<span class="space-icon">{space.icon}</span>
						{/if}
						{space.name}
					</button>
					<span class="breadcrumb-separator">/</span>
					<button type="button" class="breadcrumb-area" style="--badge-color: {areaColor}" onclick={() => chatStore.setActiveConversation(null)}>
						{#if area.icon}<span class="area-icon">{area.icon}</span>{/if}
						{area.name}
					</button>
				</div>
			</div>

			<!-- Tools cluster (Chats/Tasks/Docs panel toggles) -->
			<div class="header-tools">
				<button
					type="button"
					class="tool-button"
					onclick={() => drawerOpen = true}
					title="Conversations ({areaConversations.length})"
				>
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
						<path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
					</svg>
					{#if areaConversations.length > 0}
						<span class="tool-badge">{areaConversations.length}</span>
					{/if}
				</button>
				<button
					type="button"
					class="tool-button"
					onclick={() => tasksPanelOpen = true}
					title="Tasks ({areaTaskCount})"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
					</svg>
					{#if areaTaskCount > 0}
						<span class="tool-badge">{areaTaskCount}</span>
					{/if}
				</button>
				<button
					type="button"
					class="tool-button"
					onclick={() => contextPanelOpen = true}
					title="Context ({spaceDocCount} docs)"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
					</svg>
					{#if spaceDocCount > 0}
						<span class="tool-badge">{spaceDocCount}</span>
					{/if}
				</button>
			</div>

			<div class="header-right">
				<!-- Model: Selector when no messages, Badge when locked -->
				{#if messages.length === 0}
					<ModelSelector
						selectedModel={effectiveModel}
						onchange={handleModelChange}
					/>
				{:else}
					<ModelBadge model={effectiveModel} />
				{/if}
				<button
					type="button"
					class="new-chat-button"
					onclick={handleNewChat}
					title="New chat in this area"
				>
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
					</svg>
				</button>
				<button
					type="button"
					class="settings-button"
					onclick={() => settingsOpen = true}
					title="Settings"
				>
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
					</svg>
				</button>
			</div>
		</header>

		<!-- Main chat area -->
		<main class="chat-area" class:with-panel={isSecondOpinionOpen}>
			<!-- Task context banner (if conversation is linked to a task) - full width -->
			{#if linkedTask && messages.length > 0}
				<TaskContextBanner
					taskId={linkedTask.id}
					taskTitle={linkedTask.title}
					taskColor={linkedTask.color}
					onOpenTaskFocus={handleOpenTaskFocus}
				/>
			{/if}

			<ChatMessageList bind:containerRef={messagesContainer}>
				{#if messages.length === 0}
					<AreaWelcomeScreen
						{area}
						recentConversations={areaConversations}
						hasModel={!!selectedModel}
						onNewChat={handleNewChat}
						onContinueChat={handleContinueChat}
					/>
				{:else}
					<!-- Continuation indicator -->
					{#if isContinuedConversation && chatStore.activeConversation?.refreshedAt}
						<SessionSeparator timestamp={chatStore.activeConversation.refreshedAt} summaryPreview={continuationSummary} />
					{/if}

					<!-- Messages -->
					{#each messages as message, i (message.id)}
						<div in:fly={{ y: 20, duration: 200, delay: i * 50 }}>
							<ChatMessage
								{message}
								messageIndex={i}
								showTimestamp={settingsStore.showTimestamps}
								canEdit={message.role === 'user' && !chatStore.isStreaming}
								onEditAndResend={handleEditAndResend}
								onResend={handleResend}
								onRegenerate={handleRegenerate}
								onSecondOpinion={handleSecondOpinionTrigger}
							/>
							<!-- Task suggestion card (appears after assistant message with suggestion) -->
							{#if currentSuggestionInfo && currentSuggestionInfo.messageIndex === i}
								<div class="suggestion-container">
									<TaskSuggestionCard
										suggestion={currentSuggestionInfo.suggestion}
										areaColor={areaColor}
										onAccept={handleAcceptSuggestion}
										onDismiss={handleDismissSuggestion}
									/>
								</div>
							{/if}
						</div>
					{/each}

					<!-- Summary -->
					{#if currentSummary}
						<ConversationSummary
							summary={currentSummary}
							isGenerating={isGeneratingSummary}
							onDismiss={handleDismissSummary}
							onGenerate={handleGenerateSummary}
						/>
					{/if}
				{/if}
			</ChatMessageList>

			<!-- Chat input -->
			<div class="input-container">
				<ChatInput
					onsend={handleSend}
					onstop={handleStop}
					disabled={!selectedModel}
				/>
			</div>
		</main>

		<!-- Second Opinion Panel -->
		{#if isSecondOpinionOpen && secondOpinion}
			<div class="panel-container" transition:fly={{ x: 300, duration: 200 }}>
				<SecondOpinionPanel
					content={secondOpinion.content}
					thinking={secondOpinion.thinking}
					modelId={secondOpinion.modelId}
					isStreaming={secondOpinion.isStreaming}
					error={secondOpinion.error}
					onClose={handleCloseSecondOpinion}
					onUseAnswer={handleUseSecondOpinion}
					onFork={handleForkWithSecondOpinion}
				/>
			</div>
		{/if}

		<!-- Model selector dropdown for second opinion -->
		{#if showModelSelector}
			<div
				class="model-selector-overlay"
				onclick={() => showModelSelector = false}
				onkeydown={(e) => e.key === 'Escape' && (showModelSelector = false)}
				role="button"
				tabindex="-1"
			></div>
			<div
				class="model-selector-dropdown"
				style="top: {modelSelectorPosition.top}px; left: {modelSelectorPosition.left}px"
			>
				<SecondOpinionModelSelect
					currentModel={effectiveModel}
					onSelect={handleSecondOpinionModelSelect}
					onClose={() => showModelSelector = false}
				/>
			</div>
		{/if}

		<!-- Settings Panel -->
		{#if settingsOpen}
			<SettingsPanel open={true} onclose={() => settingsOpen = false} />
		{/if}

		<!-- Conversation Drawer -->
		<ConversationDrawer
			open={drawerOpen}
			{area}
			allAreas={allAreasInSpace}
			conversations={areaConversations}
			{otherAreaConversations}
			activeConversationId={chatStore.activeConversation?.id ?? null}
			{getTaskInfo}
			onClose={() => drawerOpen = false}
			onSelectConversation={handleContinueChat}
			onNewChat={handleNewChat}
			onPinConversation={handlePinConversation}
			onMoveToArea={handleMoveToArea}
			onRenameConversation={handleDrawerRename}
			onExportConversation={handleDrawerExport}
			onDeleteConversation={handleDrawerDelete}
		/>

		<!-- Tasks Panel -->
		<TasksPanel
			isOpen={tasksPanelOpen}
			areaId={area.id}
			spaceColor={areaColor}
			onClose={() => tasksPanelOpen = false}
			onAddTask={() => taskModalOpen = true}
			onTaskClick={(task) => goToTask(task.id)}
		/>

		<!-- Context Panel -->
		{#if area}
			<ContextPanel
				isOpen={contextPanelOpen}
				{area}
				spaceId={properSpaceId}
				spaceColor={areaColor}
				onClose={() => contextPanelOpen = false}
				onAreaUpdate={handleAreaUpdate}
			/>
		{/if}

		<!-- Task Modal -->
		<TaskModal
			open={taskModalOpen}
			spaceId={properSpaceId}
			areas={allAreas}
			spaceColor={areaColor}
			initialValues={suggestionPreFill}
			onClose={() => {
				taskModalOpen = false;
				pendingSuggestion = null;
			}}
			onCreate={handleCreateTaskFromModal}
		/>
	</div>
{:else}
	<div class="error-container">
		<h1>Area not found</h1>
		<p>The area you're looking for doesn't exist.</p>
		<a href="/spaces/{spaceParam}" class="back-link">Back to space</a>
	</div>
{/if}

<style>
	.area-page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--bg-primary, #0a0a0f);
	}

	/* Header */
	.area-header {
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
		gap: 0.5rem;
	}

	.back-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		color: rgba(255, 255, 255, 0.5);
		background: transparent;
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.back-button:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
	}

	.back-button svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.breadcrumb-space {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		color: rgba(255, 255, 255, 0.5);
		background: transparent;
		transition: color 0.15s ease;
	}

	.breadcrumb-space:hover {
		color: rgba(255, 255, 255, 0.9);
	}

	.space-icon {
		font-size: 1rem;
	}

	/* SVG space icon styling */
	:global(.space-icon-svg) {
		flex-shrink: 0;
		opacity: 0.8;
	}

	.breadcrumb-separator {
		color: rgba(255, 255, 255, 0.2);
	}

	.breadcrumb-area {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.5rem;
		font-weight: 500;
		color: var(--badge-color, var(--area-color));
		background: color-mix(in srgb, var(--badge-color, var(--area-color)) 15%, transparent);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.breadcrumb-area:hover {
		background: color-mix(in srgb, var(--badge-color, var(--area-color)) 25%, transparent);
	}

	.area-icon {
		font-size: 0.875rem;
	}

	/* Tools cluster */
	.header-tools {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.tool-button {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.tool-button:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.1);
		color: var(--area-color);
	}

	.tool-button svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	.tool-badge {
		position: absolute;
		top: -0.125rem;
		right: -0.125rem;
		min-width: 1rem;
		height: 1rem;
		padding: 0 0.25rem;
		font-size: 0.625rem;
		font-weight: 600;
		line-height: 1rem;
		text-align: center;
		color: #fff;
		background: color-mix(in srgb, var(--area-color) 85%, #000);
		border-radius: 9999px;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.new-chat-button,
	.settings-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.new-chat-button:hover,
	.settings-button:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.new-chat-button svg,
	.settings-button svg {
		width: 1rem;
		height: 1rem;
	}

	/* Main chat area - edge-to-edge background */
	.chat-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		transition: margin-right 0.2s ease;
		background: var(--bg-chat, #0f0f11);
	}

	.chat-area.with-panel {
		margin-right: 40vw;
	}

	.suggestion-container {
		padding: 0 2rem;
		max-width: 48rem;
		margin: 0 auto;
	}

	.input-container {
		padding: 1rem 2rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		background: var(--bg-chat, #0f0f11);
	}

	/* Conversation menu */
	.conversation-menu-container {
		position: relative;
	}

	.menu-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.menu-button:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.menu-button svg {
		width: 1rem;
		height: 1rem;
	}

	.menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
	}

	.conversation-menu {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		min-width: 160px;
		padding: 0.375rem;
		background: var(--bg-secondary, #18181b);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
		z-index: 50;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.8);
		background: transparent;
		border-radius: 0.375rem;
		text-align: left;
		transition: all 0.1s ease;
	}

	.menu-item:hover {
		color: rgba(255, 255, 255, 1);
		background: rgba(255, 255, 255, 0.08);
	}

	.menu-item.danger {
		color: #ef4444;
	}

	.menu-item.danger:hover {
		background: rgba(239, 68, 68, 0.15);
	}

	.menu-item svg {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	/* Rename dialog */
	.rename-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 60;
	}

	.rename-dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 90%;
		max-width: 400px;
		padding: 1.5rem;
		background: var(--bg-secondary, #18181b);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
		z-index: 70;
	}

	.rename-dialog h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
	}

	.rename-input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		outline: none;
		transition: all 0.15s ease;
	}

	.rename-input:focus {
		border-color: var(--area-color, #3b82f6);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--area-color, #3b82f6) 20%, transparent);
	}

	.rename-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.btn-cancel,
	.btn-save {
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.btn-cancel {
		color: rgba(255, 255, 255, 0.7);
		background: rgba(255, 255, 255, 0.08);
	}

	.btn-cancel:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.12);
	}

	.btn-save {
		color: white;
		background: var(--area-color, #3b82f6);
	}

	.btn-save:hover {
		filter: brightness(1.1);
	}

	/* Panels */
	.panel-container {
		position: fixed;
		top: 0;
		right: 0;
		width: 40vw;
		height: 100vh;
		background: var(--bg-secondary, #111118);
		border-left: 1px solid rgba(255, 255, 255, 0.1);
		z-index: 50;
	}

	/* Model selector dropdown */
	.model-selector-overlay {
		position: fixed;
		inset: 0;
		z-index: 40;
	}

	.model-selector-dropdown {
		position: fixed;
		z-index: 45;
		background: var(--bg-secondary, #111118);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
	}

	/* Loading and error states */
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

	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		gap: 1rem;
		text-align: center;
		padding: 2rem;
	}

	.error-container h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin: 0;
	}

	.error-container p {
		font-size: 0.9375rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.back-link {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--space-accent, #3b82f6);
		background: rgba(59, 130, 246, 0.1);
		border-radius: 0.375rem;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.back-link:hover {
		background: rgba(59, 130, 246, 0.2);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.chat-area.with-panel {
			margin-right: 0;
		}

		.panel-container {
			width: 100vw;
		}
	}
</style>
