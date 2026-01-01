<script lang="ts">
	import { tick, onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { fly, fade, slide } from 'svelte/transition';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import ChatInput from '$lib/components/ChatInput.svelte';
	import WelcomeScreen from '$lib/components/chat/WelcomeScreen.svelte';
	import ConversationSummary from '$lib/components/chat/ConversationSummary.svelte';
	import SessionSeparator from '$lib/components/chat/SessionSeparator.svelte';
	import ConversationItem from '$lib/components/layout/ConversationItem.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import SecondOpinionPanel from '$lib/components/chat/SecondOpinionPanel.svelte';
	import SecondOpinionModelSelect from '$lib/components/chat/SecondOpinionModelSelect.svelte';
	import ModelSelector from '$lib/components/ModelSelector.svelte';
	import SpaceIcon from '$lib/components/SpaceIcon.svelte';
	import AssistDropdown from '$lib/components/assists/AssistDropdown.svelte';
	import WorkingPanel from '$lib/components/assists/WorkingPanel.svelte';
	import TaskBadge from '$lib/components/tasks/TaskBadge.svelte';
	import FocusIndicator from '$lib/components/tasks/FocusIndicator.svelte';
	import TaskPanel from '$lib/components/tasks/TaskPanel.svelte';
	import FocusedTaskWelcome from '$lib/components/tasks/FocusedTaskWelcome.svelte';
	import PlanModePanel from '$lib/components/tasks/PlanModePanel.svelte';
	import AddContextModal from '$lib/components/tasks/AddContextModal.svelte';
	import ManageContextModal from '$lib/components/tasks/ManageContextModal.svelte';
	import { AreaPills as FocusAreaPills, AreaModal as FocusAreaModal } from '$lib/components/areas';
	import { SpaceModal } from '$lib/components/spaces';
	import BringToContextModal from '$lib/components/chat/BringToContextModal.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { documentStore } from '$lib/stores/documents.svelte';
	import { areaStore as focusAreaStore } from '$lib/stores/areas.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import type { Area as FocusArea, CreateAreaInput as CreateFocusAreaInput, UpdateAreaInput as UpdateFocusAreaInput } from '$lib/types/areas';
	import type { DocumentContextRole } from '$lib/types/documents';
	import type { TaskRelationshipType } from '$lib/types/tasks';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import { modelSupportsVision } from '$lib/config/model-capabilities';
	import { SPACES, isValidSpace } from '$lib/config/spaces';
	import { extractTasksFromContent, contentLooksLikeTaskList, contentAsksForConfirmation } from '$lib/utils/task-extraction';
	import { contentContainsProposal, extractProposedSubtasks } from '$lib/utils/subtask-extraction';
	import { detectUserReadiness } from '$lib/utils/plan-mode-validation';
	import { applyFocusColor } from '$lib/utils/focus-mode';
	import { generateGreeting } from '$lib/utils/greeting';
	import GreetingMessage from '$lib/components/chat/GreetingMessage.svelte';
	import type { SpaceType, FileAttachment, Conversation, Message } from '$lib/types/chat';
	import type { GreetingData, Task } from '$lib/types/tasks';

	// Get space from route param
	let spaceParam = $derived($page.params.space);

	// Get space from store (handles both system and custom spaces)
	let spaceFromStore = $derived.by(() => {
		if (!spaceParam) return null;
		return spacesStore.getSpaceBySlug(spaceParam);
	});

	// For backwards compatibility, also check system space config
	let currentSpace = $derived.by(() => {
		if (spaceParam && isValidSpace(spaceParam)) {
			return spaceParam as SpaceType;
		}
		// For custom spaces, use the slug as the "space" identifier
		if (spaceFromStore?.type === 'custom') {
			return spaceFromStore.slug as SpaceType;
		}
		return null;
	});

	let spaceConfig = $derived.by(() => {
		// Try system space config first
		if (currentSpace && SPACES[currentSpace as keyof typeof SPACES]) {
			return SPACES[currentSpace as keyof typeof SPACES];
		}
		// For custom spaces, create a config from store data
		if (spaceFromStore) {
			return {
				id: spaceFromStore.slug,
				name: spaceFromStore.name,
				icon: spaceFromStore.icon || '📁',
				accentColor: 'custom',
				description: spaceFromStore.context || 'Custom space'
			};
		}
		return null;
	});

	// Apply custom space color if available (for custom spaces not covered by layout)
	$effect(() => {
		if (spaceFromStore?.type === 'custom' && spaceFromStore?.color) {
			const color = spaceFromStore.color;
			// Set all space-related CSS variables for custom spaces
			document.documentElement.style.setProperty('--space-accent', color);
			document.documentElement.style.setProperty('--space-accent-muted', `color-mix(in srgb, ${color} 15%, transparent)`);
			document.documentElement.style.setProperty('--space-accent-ring', `color-mix(in srgb, ${color} 40%, transparent)`);
		}
		return () => {
			// Cleanup: remove custom space CSS variables when leaving
			document.documentElement.style.removeProperty('--space-accent');
			document.documentElement.style.removeProperty('--space-accent-muted');
			document.documentElement.style.removeProperty('--space-accent-ring');
		};
	});

	// Validate space and redirect if invalid (after spaces are loaded)
	$effect(() => {
		// Wait for spaces to load before validating
		if (!spacesStore.isLoaded()) return;

		if (spaceParam && !isValidSpace(spaceParam) && !spaceFromStore) {
			goto('/spaces');
		}
	});

	// Load spaces on mount
	onMount(() => {
		spacesStore.loadSpaces();
	});

	// Set active space in store when entering/leaving
	// Also clear active conversation if it doesn't belong to this space
	$effect(() => {
		if (currentSpace) {
			chatStore.setActiveSpaceId(currentSpace);

			// If active conversation doesn't belong to this space, clear it
			const activeConv = chatStore.activeConversation;
			if (activeConv && activeConv.spaceId !== currentSpace) {
				chatStore.setActiveConversation(null);
			}
		}
		return () => {
			chatStore.setActiveSpaceId(null);
		};
	});

	// Track previous conversation ID to detect actual conversation changes
	// This prevents selectedFocusAreaId from being reset on every conversation update (e.g., during streaming)
	let previousConversationId: string | null = null;

	// Sync focus area selection with active conversation
	// Only sync when conversation CHANGES, not on every update
	$effect(() => {
		const activeConv = chatStore.activeConversation;
		if (activeConv) {
			// Only sync focus area when conversation actually changes (different ID)
			const conversationChanged = activeConv.id !== previousConversationId;
			if (conversationChanged) {
				previousConversationId = activeConv.id;
				selectedFocusAreaId = activeConv.focusAreaId ?? null;
			}

			// Auto-focus on task if conversation is linked to one (Phase C navigation)
			// This handles the case when navigating from main to a task-linked conversation
			if (activeConv.taskId && !focusedTask) {
				const linkedTask = taskStore.getTaskForConversation(activeConv.id);
				if (linkedTask) {
					taskStore.setFocusedTask(linkedTask.id);
					chatStore.setFocusedTaskId(linkedTask.id);
				}
			}
		} else {
			previousConversationId = null;
		}
	});

	// Sidebar state
	let searchQuery = $state('');
	let searchInputRef: HTMLInputElement | undefined = $state();
	let isSearchFocused = $state(false);
	let openMenuId = $state<string | null>(null);

	// Chat state
	let messagesContainer: HTMLElement | undefined = $state();
	let selectedModel = $derived(settingsStore.selectedModel || '');
	let effectiveModel = $derived(
		chatStore.activeConversation?.model || settingsStore.selectedModel || ''
	);
	let settingsOpen = $state(false);
	let isGeneratingSummary = $state(false);
	let isCompacting = $state(false);
	let isGlobalDragging = $state(false);
	let globalDragCounter = $state(0);

	// Second Opinion state
	let showModelSelector = $state(false);
	let modelSelectorPosition = $state({ top: 0, left: 0 });
	let pendingSecondOpinionIndex = $state<number | null>(null);
	let secondOpinion = $derived(chatStore.secondOpinion);
	let isSecondOpinionOpen = $derived(chatStore.isSecondOpinionOpen);

	// Assist state
	let assistState = $derived(chatStore.assistState);
	let isAssistActive = $derived(chatStore.isAssistActive);

	// Task state
	let focusedTask = $derived(taskStore.focusedTask);
	let hasTasks = $derived(taskStore.hasTasks);
	let planMode = $derived(taskStore.planMode);
	let planningTask = $derived(taskStore.planningTask); // Full task for metadata access
	let showTaskPanel = $state(false);

	// Focus Area state
	let selectedFocusAreaId = $state<string | null>(null);
	let showFocusAreaModal = $state(false);
	let editingFocusArea = $state<ReturnType<typeof focusAreaStore.getFocusAreaById> | null>(null);
	let focusAreas = $derived.by(() => {
		if (!currentSpace) return [];
		return focusAreaStore.getFocusAreasForSpace(currentSpace);
	});
	let selectedFocusArea = $derived.by(() => {
		if (!selectedFocusAreaId) return null;
		return focusAreaStore.getFocusAreaById(selectedFocusAreaId) ?? null;
	});

	// Space modal state
	let showSpaceModal = $state(false);

	// Context modal state
	let showAddContextModal = $state(false);
	let contextModalTaskId = $state<string | null>(null);

	// Manage Context modal state
	let showManageContextModal = $state(false);

	// BringToContext modal state (Phase C - cross-context navigation)
	let showBringToContextModal = $state(false);
	let bringToContextConversation = $state<Conversation | null>(null);

	// Get context for focused task
	let taskDocuments = $derived.by(() => {
		if (!focusedTask) return [];
		return documentStore.getDocumentsForTask(focusedTask.id);
	});

	let taskRelatedTasks = $derived.by(() => {
		if (!focusedTask) return [];
		return taskStore.getRelatedTasks(focusedTask.id);
	});

	let taskContext = $derived.by(() => {
		if (!focusedTask) return undefined;
		return taskStore.getTaskContext(focusedTask.id);
	});

	// Greeting state
	let greeting = $state<GreetingData | null>(null);
	let greetingDismissed = $state(false);
	let showGreeting = $derived(
		greeting !== null &&
		!greetingDismissed &&
		!chatStore.activeConversation && // Only show on welcome screen
		currentSpace === 'work' // Only in work space
	);

	// Messages and conversation state
	let messages = $derived(chatStore.messages);
	let currentSummary = $derived(chatStore.activeConversation?.summary || null);
	let isContinuedConversation = $derived(!!chatStore.activeConversation?.continuedFromId);
	let continuationSummary = $derived(chatStore.activeConversation?.continuationSummary ?? undefined);
	let refreshedAt = $derived(chatStore.activeConversation?.refreshedAt || null);

	let parentConversation = $derived(
		chatStore.activeConversation?.continuedFromId
			? chatStore.getConversation(chatStore.activeConversation.continuedFromId)
			: null
	);
	let parentMessages = $derived(
		(parentConversation?.messages || []).filter((m) => m && m.id)
	);

	// Filter function defined first to avoid circular reference
	function filterByQuery(conversations: Conversation[], query: string): Conversation[] {
		const lowerQuery = query.toLowerCase();
		return conversations.filter((conv: Conversation) => {
			if (conv.title.toLowerCase().includes(lowerQuery)) return true;
			return conv.messages.some((m: Message) => m.content.toLowerCase().includes(lowerQuery));
		});
	}

	// Context-aware grouped conversations (Phase C)
	let grouped = $derived(chatStore.groupedConversations);

	// Space-filtered conversations with context awareness
	let filteredPinned = $derived.by((): Conversation[] => {
		const pinned = grouped.pinned;
		if (!searchQuery.trim()) return pinned;
		return filterByQuery(pinned, searchQuery);
	});
	let filteredCurrent = $derived.by((): Conversation[] => {
		const current = grouped.current;
		if (!searchQuery.trim()) return current;
		return filterByQuery(current, searchQuery);
	});
	let filteredOtherInSpace = $derived.by((): Conversation[] => {
		const otherInSpace = grouped.otherInSpace;
		if (!searchQuery.trim()) return otherInSpace;
		return filterByQuery(otherInSpace, searchQuery);
	});
	let filteredOtherContexts = $derived.by((): Conversation[] => {
		const other = grouped.otherContexts;
		if (!searchQuery.trim()) return other;
		return filterByQuery(other, searchQuery);
	});
	let hasResults = $derived(filteredPinned.length > 0 || filteredCurrent.length > 0 || filteredOtherInSpace.length > 0 || filteredOtherContexts.length > 0);
	let hasPinnedResults = $derived(filteredPinned.length > 0);
	let hasCurrentResults = $derived(filteredCurrent.length > 0);
	let hasOtherInSpace = $derived(filteredOtherInSpace.length > 0);
	let hasOtherContexts = $derived(filteredOtherContexts.length > 0);
	let spaceConversationCount = $derived(
		currentSpace ? chatStore.getSpaceConversationCount(currentSpace) : 0
	);

	// Collapsible state for sidebar sections
	let otherInSpaceExpanded = $state(false);
	let otherContextsExpanded = $state(false);

	// Apply saved theme on mount
	onMount(() => {
		applyTheme(settingsStore.theme);
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = () => {
			if (settingsStore.theme === 'system') {
				applyTheme('system');
			}
		};
		mediaQuery.addEventListener('change', handleChange);

		// Clean up focus mode on unmount
		return () => {
			mediaQuery.removeEventListener('change', handleChange);
			applyFocusColor(null);
		};
	});

	// Load tasks when space changes
	$effect(() => {
		if (currentSpace) {
			taskStore.loadTasks(currentSpace);
		}
	});

	// Load focus areas when space changes
	$effect(() => {
		if (currentSpace) {
			focusAreaStore.loadFocusAreas(currentSpace);
			// Clear selection when changing spaces
			selectedFocusAreaId = null;
		}
	});

	// Generate greeting when tasks are loaded (only for work space)
	$effect(() => {
		if (currentSpace === 'work' && !taskStore.isLoading && taskStore.taskList.length > 0) {
			const greetingData = generateGreeting(taskStore.taskList, currentSpace);
			greeting = greetingData;
		} else if (currentSpace !== 'work' || taskStore.taskList.length === 0) {
			greeting = null;
		}
	});

	// Apply focus mode color when focused task changes
	$effect(() => {
		const color = focusedTask?.color ?? null;
		applyFocusColor(color);

		// Add high-priority class for enhanced animation
		if (focusedTask?.priority === 'high') {
			document.documentElement.classList.add('high-priority');
		} else {
			document.documentElement.classList.remove('high-priority');
		}
	});

	// Load context when focused task changes
	$effect(() => {
		if (focusedTask) {
			documentStore.loadDocumentsForTask(focusedTask.id);
			taskStore.loadRelatedTasks(focusedTask.id);
			taskStore.loadTaskContext(focusedTask.id);
		}
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

	$effect(() => {
		if (messages.length) {
			scrollToBottom();
		}
	});

	// Guard to prevent reactive loop during proposal processing
	let processingProposal = false;

	// Detect AI subtask proposals in Plan Mode
	$effect(() => {
		// Only run when Plan Mode is active and in eliciting/proposing phase
		if (!planMode || planMode.phase === 'confirming') return;

		// Prevent re-entry during async processing
		if (processingProposal) return;

		// Get the last assistant message
		const lastMessage = messages[messages.length - 1];
		if (!lastMessage || lastMessage.role !== 'assistant') return;

		const content = typeof lastMessage.content === 'string' ? lastMessage.content : '';
		if (!content) return;

		// Check if the content contains a subtask proposal
		if (contentContainsProposal(content)) {
			// Extract proposed subtasks
			const proposedSubtasks = extractProposedSubtasks(content);
			if (proposedSubtasks.length >= 2) {
				// Set guard before async operations
				processingProposal = true;

				// Set the proposed subtasks and transition to confirming phase
				Promise.all([
					taskStore.setProposedSubtasks(proposedSubtasks),
					taskStore.setPlanModePhase('confirming')
				]).finally(() => {
					processingProposal = false;
				});
			}
		}
	});

	async function scrollToBottom() {
		await tick();
		if (messagesContainer) {
			messagesContainer.scrollTo({
				top: messagesContainer.scrollHeight,
				behavior: 'smooth'
			});
		}
	}

	async function scrollToMessage(index: number) {
		await tick();
		const messageElement = document.getElementById(`message-${index}`);
		if (messageElement && messagesContainer) {
			messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
			messageElement.classList.add('message-highlight');
			setTimeout(() => messageElement.classList.remove('message-highlight'), 2000);
		}
	}

	// Sidebar handlers
	function handleMenuToggle(id: string, isOpen: boolean) {
		openMenuId = isOpen ? id : null;
	}

	function closeAllMenus() {
		openMenuId = null;
	}

	function handleSidebarClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.menu-trigger') && !target.closest('.dropdown-menu')) {
			closeAllMenus();
		}
	}

	function handleConversationClick(id: string) {
		const conversation = chatStore.conversations.get(id);
		if (!conversation) return;

		// Check if conversation is in current context (Phase C)
		const inContext = chatStore.isConversationInCurrentContext(conversation);

		if (inContext) {
			// Open directly
			chatStore.setActiveConversation(id);

			// If conversation is linked to a task, enter deep work mode
			if (conversation.taskId) {
				const linkedTask = taskStore.getTaskForConversation(id);
				if (linkedTask) {
					handleFocusTask(linkedTask.id);
				}
			}
		} else {
			// Show "Bring to Context" modal
			bringToContextConversation = conversation;
			showBringToContextModal = true;
		}
	}

	function handleDeleteConversation(id: string) {
		chatStore.deleteConversation(id);
	}

	function handlePinConversation(id: string) {
		chatStore.togglePin(id);
	}

	function handleRenameConversation(id: string, newTitle: string) {
		chatStore.updateConversationTitle(id, newTitle);
	}

	function handleExportConversation(id: string) {
		const conversation = chatStore.conversations.get(id);
		if (!conversation) return;

		const date = new Date(conversation.createdAt);
		const dateStr = date.toLocaleDateString('en-US', {
			year: 'numeric', month: 'long', day: 'numeric'
		});

		let markdown = `# ${conversation.title}\n\n`;
		markdown += `**Model:** ${conversation.model}  \n`;
		markdown += `**Space:** ${spaceConfig?.name || 'Unknown'}  \n`;
		markdown += `**Date:** ${dateStr}\n\n---\n\n`;

		for (const message of conversation.messages) {
			markdown += `## ${message.role === 'user' ? 'User' : 'Assistant'}\n\n${message.content}\n\n`;
		}

		markdown += `---\n\n*Exported from StratAI - ${spaceConfig?.name} Space*\n`;

		const blob = new Blob([markdown], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${date.toISOString().split('T')[0]}.md`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function clearSearch() {
		searchQuery = '';
		searchInputRef?.focus();
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && searchQuery) {
			e.preventDefault();
			clearSearch();
		}
	}

	function closeSidebar() {
		settingsStore.setSidebarOpen(false);
	}

	// Drag handlers
	function handleGlobalDragEnter(e: DragEvent) {
		e.preventDefault();
		globalDragCounter++;
		if (e.dataTransfer?.types.includes('Files')) {
			isGlobalDragging = true;
		}
	}

	function handleGlobalDragLeave(e: DragEvent) {
		e.preventDefault();
		globalDragCounter--;
		if (globalDragCounter === 0) {
			isGlobalDragging = false;
		}
	}

	function handleGlobalDragOver(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'copy';
		}
	}

	function handleGlobalDrop(e: DragEvent) {
		isGlobalDragging = false;
		globalDragCounter = 0;
	}

	// Attachment helpers
	function formatTextAttachmentsForLLM(attachments: FileAttachment[]): string | null {
		const textAttachments = attachments.filter(att => att.content.type === 'text');
		if (textAttachments.length === 0) return null;

		let context = 'The user has attached the following document(s):\n\n';
		for (const att of textAttachments) {
			if (att.content.type === 'text') {
				context += `--- ${att.filename} ---\n${att.content.data}\n---\n\n`;
				if (att.truncated) {
					context += '(Note: This document was truncated due to length)\n\n';
				}
			}
		}
		context += 'Please reference these documents when answering the user\'s question.\n';
		return context;
	}

	function hasImageAttachments(attachments?: FileAttachment[]): boolean {
		return attachments?.some(att => att.content.type === 'image') || false;
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

	// Chat handlers
	// Define plan mode context type for explicit overrides
	interface ExplicitPlanModeContext {
		taskId: string;
		taskTitle: string;
		phase: 'eliciting' | 'proposing' | 'confirming';
		exchangeCount: number;
		priority: 'normal' | 'high';
		dueDate: string | null;
		dueDateType: 'hard' | 'soft' | null;
		createdAt: string;
	}

	async function handleSend(content: string, attachments?: FileAttachment[], explicitPlanModeContext?: ExplicitPlanModeContext) {
		// Note: Assist mode uses normal chat flow - the assist prompt is added via the API

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
		const isNewConversation = !conversationId;
		if (!conversationId) {
			// Create new conversation WITH current space and context
			conversationId = chatStore.createConversation(settingsStore.selectedModel, {
				spaceId: currentSpace || undefined,
				focusAreaId: selectedFocusAreaId || undefined,
				taskId: focusedTask?.id || undefined
			});
		}

		// Auto-link conversation to focused task (if applicable)
		if (focusedTask && conversationId) {
			const isFirstMessage = isNewConversation || (chatStore.getConversation(conversationId)?.messages.length ?? 0) === 0;
			const isAlreadyLinked = taskStore.isConversationLinked(conversationId);

			if (isFirstMessage && !isAlreadyLinked) {
				// Link this conversation to the focused task
				taskStore.linkConversation(focusedTask.id, conversationId);
				toastStore.success(`Linked to "${focusedTask.title}"`);
			}
		}

		// Plan Mode: Check for user readiness signals to transition to proposing phase
		if (planMode && planMode.phase === 'eliciting' && detectUserReadiness(content)) {
			console.log('[Plan Mode] User signaled readiness, transitioning to proposing phase');
			await taskStore.setPlanModePhase('proposing');
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

			// Prepare assist context if active
			const selectedTask = assistState?.selectedTaskId
				? assistState.tasks.find(t => t.id === assistState.selectedTaskId)
				: null;

			// Prepare focused task context (persistent task focus from taskStore)
			// For subtasks, include parent task info and source conversation ID for context injection
			const parentTask = focusedTask?.parentTaskId ? taskStore.getParentTask(focusedTask.id) : null;
			const focusedTaskContext = focusedTask ? {
				title: focusedTask.title,
				priority: focusedTask.priority,
				dueDate: focusedTask.dueDate?.toISOString().split('T')[0],
				dueDateType: focusedTask.dueDateType,
				// Subtask context for planning conversation injection
				isSubtask: !!focusedTask.parentTaskId,
				parentTaskTitle: parentTask?.title,
				sourceConversationId: focusedTask.source?.conversationId
			} : null;

			// Prepare Plan Mode context if active (includes task metadata for time/date awareness)
			// Use explicit override if provided (for kickoff message to avoid race condition)
			// Otherwise derive from store state
			let planModeContext: ExplicitPlanModeContext | null = null;

			// Debug: Log the current state of planMode and planningTask
			console.log('[Page] handleSend - Checking plan mode state:');
			console.log('[Page]   explicitPlanModeContext:', explicitPlanModeContext ? 'PROVIDED' : 'null');
			console.log('[Page]   planMode:', planMode ? `ACTIVE (phase=${planMode.phase}, taskId=${planMode.taskId})` : 'null');
			console.log('[Page]   planningTask:', planningTask ? `FOUND (id=${planningTask.id}, status=${planningTask.status})` : 'null');

			if (explicitPlanModeContext) {
				// Use the explicitly passed context (avoids race condition on kickoff)
				planModeContext = explicitPlanModeContext;
				console.log('[Page] Using EXPLICIT planModeContext:', planModeContext.phase);
			} else if (planMode && planningTask) {
				// Derive from store state (for subsequent messages)
				planModeContext = {
					taskId: planMode.taskId,
					taskTitle: planMode.taskTitle,
					phase: planMode.phase,
					exchangeCount: planMode.exchangeCount || 0,
					priority: planningTask.priority,
					dueDate: planningTask.dueDate?.toISOString() ?? null,
					dueDateType: planningTask.dueDateType ?? null,
					createdAt: planningTask.createdAt.toISOString()
				};
				console.log('[Page] Using DERIVED planModeContext:', planModeContext.phase, 'exchangeCount:', planModeContext.exchangeCount);
			} else {
				console.log('[Page] WARNING: No plan mode context available!');
				if (!planMode) console.log('[Page]   - planMode is falsy');
				if (!planningTask) console.log('[Page]   - planningTask is falsy');
			}

			console.log('[Page] Final planModeContext being sent:', planModeContext ? 'YES' : 'NO');

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
					space: currentSpace,
					focusAreaId: conv?.focusAreaId ?? focusedTask?.focusAreaId, // Use conversation's focusAreaId, or fall back to task's focusAreaId
					assistId: assistState?.assistId || null,
					assistPhase: assistState?.phase || null,
					assistTasks: assistState?.tasks.map(t => t.text) || null,
					assistFocusedTask: selectedTask?.text || null,
					focusedTask: focusedTaskContext,
					planMode: planModeContext
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

			// Task extraction for assist mode
			if (assistState?.isActive && assistState.phase === 'collecting') {
				// Get the completed message content
				const completedMessage = chatStore.getConversation(conversationId!)?.messages.find(m => m.id === assistantMessageId);
				if (completedMessage?.content) {
					// Check if the response looks like a task list
					if (contentLooksLikeTaskList(completedMessage.content)) {
						const extractedTasks = extractTasksFromContent(completedMessage.content);
						if (extractedTasks.length > 0) {
							// Set tasks in assist state (this moves to 'confirming' phase)
							chatStore.setAssistTasks(extractedTasks);
						}
					}
				}
			}

			// Plan Mode: Increment exchange count after successful AI response
			if (planMode && planMode.phase === 'eliciting') {
				await taskStore.incrementExchangeCount(planMode.taskId);
				console.log(`[Plan Mode] Exchange count incremented to ${(planMode.exchangeCount || 0) + 1}`);
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

	function handleStop() {
		chatStore.stopStreaming();
	}

	function handleNewChat() {
		if (!selectedModel) {
			toastStore.warning('Please select a model first');
			return;
		}
		// Create conversation with current space and context
		chatStore.createConversation(selectedModel, {
			spaceId: currentSpace || undefined,
			focusAreaId: selectedFocusAreaId || undefined,
			taskId: focusedTask?.id || undefined
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
		const conversation = chatStore.activeConversation;
		if (conversation) {
			chatStore.clearSummary(conversation.id);
		}
	}

	/**
	 * Trigger a new assistant response for an existing conversation
	 * Used by resend/regenerate to get a new response without adding a new user message
	 */
	async function triggerAssistantResponse(conversationId: string) {
		const modelToUse = chatStore.activeConversation?.model || settingsStore.selectedModel;
		if (!modelToUse) return;

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

			const apiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<unknown> }> = [];

			if (systemPrompt) {
				apiMessages.push({ role: 'system', content: systemPrompt });
			}

			for (const m of allMessages) {
				apiMessages.push({ role: m.role, content: m.content });
			}

			// Prepare focused task context (persistent task focus from taskStore)
			// For subtasks, include parent task info and source conversation ID for context injection
			const parentTask = focusedTask?.parentTaskId ? taskStore.getParentTask(focusedTask.id) : null;
			const focusedTaskContext = focusedTask ? {
				title: focusedTask.title,
				priority: focusedTask.priority,
				dueDate: focusedTask.dueDate?.toISOString().split('T')[0],
				dueDateType: focusedTask.dueDateType,
				// Subtask context for planning conversation injection
				isSubtask: !!focusedTask.parentTaskId,
				parentTaskTitle: parentTask?.title,
				sourceConversationId: focusedTask.source?.conversationId
			} : null;

			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: modelToUse,
					messages: apiMessages,
					temperature: settingsStore.temperature,
					max_tokens: settingsStore.effectiveMaxTokens,
					searchEnabled: settingsStore.webSearchEnabled,
					thinkingEnabled: settingsStore.extendedThinkingEnabled && settingsStore.canUseExtendedThinking,
					thinkingBudgetTokens: settingsStore.thinkingBudgetTokens,
					space: currentSpace,
					focusAreaId: conv?.focusAreaId, // Use conversation's saved focusAreaId
					focusedTask: focusedTaskContext
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

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const decoded = decoder.decode(value, { stream: true });
				buffer += decoded;
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					const data = line.slice(6);
					if (data === '[DONE]') continue;

					try {
						const parsed = JSON.parse(data);
						if (parsed.type === 'thinking_start') {
							chatStore.updateMessage(conversationId, assistantMessageId, { isThinking: true });
						} else if (parsed.type === 'thinking' && parsed.content) {
							chatStore.appendToThinking(conversationId, assistantMessageId, parsed.content);
						} else if (parsed.type === 'thinking_end') {
							chatStore.updateMessage(conversationId, assistantMessageId, { isThinking: false });
						} else if (parsed.type === 'content' && parsed.content) {
							chatStore.appendToMessage(conversationId, assistantMessageId, parsed.content);
						}
					} catch {
						// Skip invalid JSON
					}
				}
			}

			// Mark message as complete
			chatStore.updateMessage(conversationId, assistantMessageId, { isStreaming: false, isThinking: false });
		} catch (err) {
			if ((err as Error).name !== 'AbortError') {
				chatStore.updateMessage(conversationId, assistantMessageId, {
					isStreaming: false,
					error: (err as Error).message
				});
				toastStore.error((err as Error).message);
			}
		} finally {
			chatStore.setStreaming(false);
		}
	}

	/**
	 * Resend a user message - deletes subsequent messages and triggers new response
	 */
	async function handleResend(messageId: string) {
		const conversationId = chatStore.activeConversation?.id;
		if (!conversationId || !effectiveModel) return;

		const messageIndex = chatStore.getMessageIndex(conversationId, messageId);
		if (messageIndex === -1) return;

		// Delete all messages after this one
		chatStore.deleteMessagesFromIndex(conversationId, messageIndex + 1);

		// Trigger new assistant response
		await triggerAssistantResponse(conversationId);
	}

	/**
	 * Regenerate an assistant response - deletes this message and gets new response
	 */
	async function handleRegenerate(messageId: string) {
		const conversationId = chatStore.activeConversation?.id;
		if (!conversationId || !effectiveModel) return;

		const messageIndex = chatStore.getMessageIndex(conversationId, messageId);
		if (messageIndex === -1) return;

		// Delete this assistant message and any messages after it
		chatStore.deleteMessagesFromIndex(conversationId, messageIndex);

		// Trigger new assistant response
		await triggerAssistantResponse(conversationId);
	}

	// Second Opinion handlers (simplified)
	function handleSecondOpinionTrigger(messageIndex: number, event?: MouseEvent) {
		if (event) {
			const button = event.currentTarget as HTMLElement;
			const rect = button.getBoundingClientRect();
			modelSelectorPosition = { top: rect.bottom + 8, left: rect.left + rect.width / 2 };
		}
		pendingSecondOpinionIndex = messageIndex;
		showModelSelector = true;
	}

	async function handleSecondOpinionModelSelect(modelId: string) {
		showModelSelector = false;
		if (pendingSecondOpinionIndex === null) return;

		const conversationId = chatStore.activeConversation?.id;
		if (!conversationId) return;

		const sourceMessage = messages[pendingSecondOpinionIndex];
		if (!sourceMessage) return;

		chatStore.openSecondOpinion(sourceMessage.id, pendingSecondOpinionIndex, modelId);
		await streamSecondOpinion(conversationId, pendingSecondOpinionIndex, modelId);
		pendingSecondOpinionIndex = null;
	}

	async function streamSecondOpinion(conversationId: string, sourceMessageIndex: number, modelId: string) {
		const controller = new AbortController();
		chatStore.secondOpinionAbortController = controller;

		try {
			const response = await fetch('/api/chat/second-opinion', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					conversationId,
					sourceMessageIndex,
					modelId,
					thinkingEnabled: settingsStore.extendedThinkingEnabled,
					thinkingBudgetTokens: settingsStore.thinkingBudgetTokens
				}),
				signal: controller.signal
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
							if (e instanceof Error && !e.message.includes('Unexpected token')) {
								throw e;
							}
						}
					}
				}
			}

			chatStore.completeSecondOpinion();
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				chatStore.closeSecondOpinion();
			} else {
				chatStore.setSecondOpinionError(err instanceof Error ? err.message : 'Unknown error');
			}
		}
	}

	function handleUseSecondOpinionAnswer() {
		const opinion = chatStore.secondOpinion;
		if (!opinion?.content) return;

		let correctionMessage: string;
		if (opinion.guidance) {
			correctionMessage = `Based on a second opinion, please adjust your approach:\n\n${opinion.guidance}\n\nPlease continue with this direction.`;
		} else {
			correctionMessage = `I prefer this alternative approach:\n\n${opinion.content}\n\nLet's continue with this direction.`;
		}

		chatStore.closeSecondOpinion();
		handleSend(correctionMessage);
	}

	async function handleForkWithSecondOpinion() {
		const opinion = chatStore.secondOpinion;
		if (!opinion?.modelId || !opinion.content || opinion.sourceMessageIndex === undefined) return;

		const conversation = chatStore.activeConversation;
		if (!conversation) return;

		chatStore.closeSecondOpinion();

		const newConversationId = chatStore.createConversation(opinion.modelId, {
			spaceId: currentSpace || undefined,
			focusAreaId: selectedFocusAreaId || undefined,
			taskId: focusedTask?.id || undefined
		});

		const userMessageIndex = opinion.sourceMessageIndex - 1;
		if (userMessageIndex >= 0) {
			const messagesToCopy = conversation.messages.slice(0, userMessageIndex + 1);
			for (const msg of messagesToCopy) {
				chatStore.addMessage(newConversationId, {
					role: msg.role,
					content: msg.content,
					attachments: msg.attachments
				});
			}
		}

		chatStore.addMessage(newConversationId, {
			role: 'assistant',
			content: opinion.content,
			thinking: opinion.thinking || undefined
		});

		const firstUserMessage = conversation.messages.find(m => m.role === 'user');
		if (firstUserMessage) {
			const title = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
			chatStore.updateConversationTitle(newConversationId, title);
		}

		toastStore.success(`Forked conversation with ${modelCapabilitiesStore.getDisplayName(opinion.modelId)}`);
	}

	function closeModelSelector() {
		showModelSelector = false;
		pendingSecondOpinionIndex = null;
	}

	// Task handlers
	function handleFocusTask(taskId: string) {
		taskStore.setFocusedTask(taskId);

		// Enable deep work mode in sidebar (Phase C)
		chatStore.setFocusedTaskId(taskId);

		// Auto-select the task's focus area (if it has one)
		const task = taskStore.getTask(taskId);
		if (task?.focusAreaId) {
			selectedFocusAreaId = task.focusAreaId;
			focusAreaStore.selectFocusArea(currentSpace!, task.focusAreaId);
		}

		// Clear active conversation if it's not linked to this task
		// This ensures a clean context when focusing on a new task
		const activeConv = chatStore.activeConversation;
		if (activeConv) {
			const linkedTask = taskStore.getTaskForConversation(activeConv.id);
			if (!linkedTask || linkedTask.id !== taskId) {
				chatStore.setActiveConversation(null);
			}
		}
	}

	async function handleCompleteTask(taskId: string, notes?: string) {
		const task = await taskStore.completeTask(taskId, notes);
		if (task) {
			toastStore.success(`Completed: ${task.title}`);
		}
	}

	function handleSwitchTask() {
		// Open task panel to let user select a different task
		showTaskPanel = true;
	}

	function handleExitFocus() {
		taskStore.exitFocusMode();
		// Disable deep work mode in sidebar (Phase C)
		chatStore.setFocusedTaskId(null);
	}

	function handleOpenTaskPanel() {
		showTaskPanel = true;
	}

	async function handleStartPlanMode() {
		if (!focusedTask) return;

		// Start plan mode (async - persists to database)
		const success = await taskStore.startPlanMode(focusedTask.id);
		if (!success) {
			toastStore.error(taskStore.error || 'Failed to start plan mode');
			return;
		}

		// Build a natural kickoff message that invites elicitation
		// The system prompt instructs the AI to ask clarifying questions first
		let kickoffMessage = `I want to plan this out: "${focusedTask.title}"`;

		// Add context about urgency if there's a due date
		if (focusedTask.dueDate) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const due = new Date(focusedTask.dueDate);
			due.setHours(0, 0, 0, 0);
			const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

			if (diffDays < 0) {
				kickoffMessage += ` (this was due ${Math.abs(diffDays)} days ago)`;
			} else if (diffDays === 0) {
				kickoffMessage += ` (due today)`;
			} else if (diffDays === 1) {
				kickoffMessage += ` (due tomorrow)`;
			} else if (diffDays <= 3) {
				kickoffMessage += ` (due in ${diffDays} days)`;
			}
		}

		kickoffMessage += `. Help me think through this.`;

		// Give a brief moment for the UI to update
		await tick();

		// Build explicit plan mode context to avoid race condition with derived state
		// We know the exact state at kickoff: phase is 'eliciting', exchangeCount is 0
		const explicitContext: ExplicitPlanModeContext = {
			taskId: focusedTask.id,
			taskTitle: focusedTask.title,
			phase: 'eliciting', // Always eliciting at kickoff
			exchangeCount: 0, // Always 0 at kickoff
			priority: focusedTask.priority,
			dueDate: focusedTask.dueDate?.toISOString() ?? null,
			dueDateType: focusedTask.dueDateType ?? null,
			createdAt: focusedTask.createdAt.toISOString()
		};

		// Send the kickoff message with explicit plan mode context
		await handleSend(kickoffMessage, undefined, explicitContext);
	}

	async function handleExitPlanMode() {
		const success = await taskStore.exitPlanMode();
		if (!success) {
			toastStore.error(taskStore.error || 'Failed to exit plan mode');
		}
	}

	async function handleCreateSubtasksFromPlan() {
		try {
			await taskStore.createSubtasksFromPlanMode();
			toastStore.success('Subtasks created successfully');
		} catch (error) {
			console.error('Failed to create subtasks:', error);
			toastStore.error('Failed to create subtasks');
		}
	}

	async function handleUpdateProposedSubtask(id: string, title: string) {
		await taskStore.updateProposedSubtask(id, { title });
	}

	async function handleToggleProposedSubtask(id: string) {
		await taskStore.toggleProposedSubtask(id);
	}

	async function handleRemoveProposedSubtask(id: string) {
		await taskStore.removeProposedSubtask(id);
	}

	async function handleAddProposedSubtask() {
		await taskStore.addProposedSubtask('New subtask');
	}

	/**
	 * Handle user requesting to move to proposal phase from PlanModePanel
	 * User clicked "Ready for suggestions" button
	 */
	async function handleRequestProposal() {
		if (!planMode || !planningTask) return;

		// Transition to proposing phase
		await taskStore.setPlanModePhase('proposing');

		// Build explicit context with 'proposing' phase to avoid race condition
		const explicitContext: ExplicitPlanModeContext = {
			taskId: planMode.taskId,
			taskTitle: planMode.taskTitle,
			phase: 'proposing', // We just transitioned to proposing
			exchangeCount: planMode.exchangeCount || 0,
			priority: planningTask.priority,
			dueDate: planningTask.dueDate?.toISOString() ?? null,
			dueDateType: planningTask.dueDateType ?? null,
			createdAt: planningTask.createdAt.toISOString()
		};

		// Send a message to trigger the proposal with explicit context
		await handleSend('Go ahead and suggest a breakdown.', undefined, explicitContext);
	}

	// Context handlers
	function handleOpenAddContext() {
		if (!focusedTask) return;
		contextModalTaskId = focusedTask.id;
		showAddContextModal = true;
	}

	function handleTaskPanelAddContext(taskId: string) {
		contextModalTaskId = taskId;
		showAddContextModal = true;
	}

	function handleCloseAddContext() {
		showAddContextModal = false;
		contextModalTaskId = null;
	}

	async function handleLinkDocument(docId: string, role: DocumentContextRole) {
		const taskId = contextModalTaskId || focusedTask?.id;
		if (!taskId) return;
		await documentStore.linkToTask(docId, taskId, role);
		// Reload context for Plan Mode
		if (taskId === focusedTask?.id) {
			taskStore.clearTaskContext(taskId);
			await taskStore.loadTaskContext(taskId);
		}
	}

	async function handleUnlinkDocument(docId: string) {
		if (!focusedTask) return;
		await documentStore.unlinkFromTask(docId, focusedTask.id);
		// Reload context for Plan Mode
		taskStore.clearTaskContext(focusedTask.id);
		await taskStore.loadTaskContext(focusedTask.id);
	}

	async function handleLinkRelatedTask(targetId: string, type: TaskRelationshipType) {
		const taskId = contextModalTaskId || focusedTask?.id;
		if (!taskId) return;
		await taskStore.linkRelatedTask(taskId, targetId, type);
		// Reload context for Plan Mode
		if (taskId === focusedTask?.id) {
			taskStore.clearTaskContext(taskId);
			await taskStore.loadTaskContext(taskId);
		}
	}

	async function handleUnlinkRelatedTask(targetId: string) {
		if (!focusedTask) return;
		await taskStore.unlinkRelatedTask(focusedTask.id, targetId);
		// Reload context for Plan Mode
		taskStore.clearTaskContext(focusedTask.id);
		await taskStore.loadTaskContext(focusedTask.id);
	}

	function handleDocumentUploaded() {
		showAddContextModal = false;
		contextModalTaskId = null;
	}

	// Manage Context handlers
	function handleOpenManageContext() {
		showManageContextModal = true;
	}

	function handleCloseManageContext() {
		showManageContextModal = false;
	}

	async function handleUpdateTaskFocusArea(focusAreaId: string | null) {
		if (!focusedTask) return;

		// Update the task's focus area
		await taskStore.updateTask(focusedTask.id, { focusAreaId });

		// Update ALL conversations linked to this task
		// This ensures context consistency across all task-related chats
		const linkedConversations = chatStore.getConversationsForTask(focusedTask.id);
		for (const conv of linkedConversations) {
			chatStore.updateConversationContext(conv.id, { focusAreaId });
		}

		// Update local focus area selection
		selectedFocusAreaId = focusAreaId;
	}

	// Greeting handlers
	function handleGreetingFocusTask(task: Task) {
		handleFocusTask(task.id); // Reuse focus logic (clears unlinked conversations)
		greetingDismissed = true;
	}

	function handleGreetingOpenPanel() {
		showTaskPanel = true;
		greetingDismissed = true;
	}

	function handleGreetingDismiss() {
		greetingDismissed = true;
	}

	// Focus Area handlers
	function handleFocusAreaSelect(id: string | null) {
		selectedFocusAreaId = id;
		focusAreaStore.selectFocusArea(currentSpace!, id);
	}

	function handleAddFocusArea() {
		editingFocusArea = null;
		showFocusAreaModal = true;
	}

	function handleEditFocusArea(focusArea?: FocusArea) {
		// Accept focusArea from pill edit button, or fall back to selectedFocusArea
		const fa = focusArea || selectedFocusArea;
		if (fa) {
			editingFocusArea = fa;
			showFocusAreaModal = true;
		}
	}

	async function handleCreateFocusArea(input: CreateFocusAreaInput) {
		const created = await focusAreaStore.createFocusArea(input);
		if (created) {
			// Auto-select the newly created focus area
			selectedFocusAreaId = created.id;
			toastStore.success(`Created "${created.name}"`);
		}
	}

	async function handleUpdateFocusArea(id: string, input: UpdateFocusAreaInput) {
		const updated = await focusAreaStore.updateFocusArea(id, input);
		if (updated) {
			toastStore.success(`Updated "${updated.name}"`);
		}
	}

	async function handleDeleteFocusArea(id: string) {
		const focusArea = focusAreaStore.getFocusAreaById(id);
		const success = await focusAreaStore.deleteFocusArea(id);
		if (success) {
			// Clear selection if we deleted the selected focus area
			if (selectedFocusAreaId === id) {
				selectedFocusAreaId = null;
			}
			toastStore.success(`Deleted "${focusArea?.name}"`);
		}
	}

	function handleCloseFocusAreaModal() {
		showFocusAreaModal = false;
		editingFocusArea = null;
	}

	// Space handlers
	async function handleUpdateSpace(id: string, input: import('$lib/types/spaces').UpdateSpaceInput) {
		const updated = await spacesStore.updateSpace(id, input);
		if (updated) {
			toastStore.success('Space context updated');
		}
	}

	// BringToContext handlers (Phase C - cross-context navigation)
	function handleOpenInOrigin() {
		if (!bringToContextConversation) return;

		const conv = bringToContextConversation;
		showBringToContextModal = false;
		bringToContextConversation = null;

		// Navigate to the conversation's original context
		if (conv.spaceId) {
			// Navigate to the space and set the conversation active
			goto(`/spaces/${conv.spaceId}`);
			// Small delay to let the navigation complete
			setTimeout(() => {
				chatStore.setActiveConversation(conv.id);
				// If conversation is linked to a task, enter deep work mode
				if (conv.taskId) {
					const linkedTask = taskStore.getTaskForConversation(conv.id);
					if (linkedTask) {
						taskStore.setFocusedTask(linkedTask.id);
						chatStore.setFocusedTaskId(linkedTask.id);
					}
				}
			}, 100);
		} else {
			// Conversation is from main (no space)
			goto('/');
			setTimeout(() => {
				chatStore.setActiveConversation(conv.id);
			}, 100);
		}
	}

	function handleBringHere() {
		if (!bringToContextConversation) return;

		const conv = bringToContextConversation;
		showBringToContextModal = false;
		bringToContextConversation = null;

		// Update conversation's context to current space/focus area
		chatStore.updateConversationContext(conv.id, {
			spaceId: currentSpace || null,
			focusAreaId: selectedFocusAreaId,
			taskId: focusedTask?.id || null
		});

		// Now open it
		chatStore.setActiveConversation(conv.id);
		toastStore.success(`Moved "${conv.title}" to ${spaceConfig?.name || 'this context'}`);
	}

	function handleCloseBringToContext() {
		showBringToContextModal = false;
		bringToContextConversation = null;
	}

	// Assist handlers
	function handleAssistSelect(assistId: string) {
		if (!currentSpace) return;
		chatStore.activateAssist(assistId);
	}

	function handleAssistClose() {
		chatStore.deactivateAssist();
	}

	function handleConfirmTasks() {
		chatStore.confirmAssistTasks();
		// Optionally inject a priority question into the chat
		// For now, the AI prompt will handle asking about priority
	}

	function handleSelectTask(taskId: string) {
		chatStore.selectAssistTask(taskId);
		// The next message will use the focused phase prompt
	}

	async function handleAssistSend(content: string, attachments?: FileAttachment[]) {
		if (!assistState?.assistId || !currentSpace) return;

		const modelToUse = settingsStore.selectedModel;
		if (!modelToUse) {
			toastStore.error('Please select a model first');
			return;
		}

		// Set streaming state
		const controller = new AbortController();
		chatStore.setAssistStreaming(true, controller);

		try {
			// Build messages for the assist API
			const apiMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
				{ role: 'user', content }
			];

			const response = await fetch('/api/assist', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					assistId: assistState.assistId,
					messages: apiMessages,
					model: modelToUse,
					spaceId: currentSpace,
					focusAreaId: selectedFocusAreaId,
					thinkingEnabled: settingsStore.extendedThinkingEnabled && settingsStore.canUseExtendedThinking,
					thinkingBudgetTokens: settingsStore.thinkingBudgetTokens
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
								// Thinking started
							} else if (parsed.type === 'thinking') {
								chatStore.appendToAssistThinking(parsed.content);
							} else if (parsed.type === 'thinking_end') {
								// Thinking ended
							} else if (parsed.type === 'content') {
								chatStore.appendToAssistContent(parsed.content);
							} else if (parsed.type === 'error') {
								throw new Error(parsed.error);
							}
						} catch (e) {
							if (e instanceof Error && !e.message.includes('Unexpected token')) {
								throw e;
							}
						}
					}
				}
			}

			chatStore.completeAssist();
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				chatStore.deactivateAssist();
			} else {
				chatStore.setAssistError(err instanceof Error ? err.message : 'Unknown error');
				toastStore.error(err instanceof Error ? err.message : 'Failed to get response');
			}
		}
	}
</script>

<svelte:head>
	<title>{spaceConfig?.name || 'Space'} - StratAI</title>
</svelte:head>

<!-- Header -->
<header class="h-16 px-4 flex items-center border-b border-surface-800 bg-surface-900/80 backdrop-blur-xl overflow-visible relative z-40">
	<!-- Left: Sidebar Toggle & Logo -->
	<div class="flex items-center gap-3 min-w-0">
		<!-- Sidebar Toggle (mobile) -->
		<button
			type="button"
			class="btn-icon lg:hidden"
			onclick={() => settingsStore.toggleSidebar()}
			aria-label="Toggle sidebar"
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>

		<!-- Desktop Sidebar Toggle -->
		<button
			type="button"
			class="btn-icon hidden lg:flex"
			onclick={() => settingsStore.toggleSidebar()}
			aria-label="Toggle sidebar"
		>
			{#if settingsStore.sidebarOpen}
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
				</svg>
			{:else}
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
				</svg>
			{/if}
		</button>

		<!-- Logo with space indicator -->
		<a href="/" class="flex items-center gap-2 hover:opacity-90 transition-opacity">
			<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: var(--gradient-primary);">
				<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
				</svg>
			</div>
			<span class="font-bold text-lg text-gradient hidden sm:inline">StratAI</span>
		</a>

		<!-- Space Badge with Edit Button -->
		{#if spaceConfig && currentSpace}
			<div class="flex items-center gap-1">
				<div
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border"
					style="background: var(--space-accent-muted); border-color: var(--space-accent-ring); color: var(--space-accent);"
				>
					<SpaceIcon space={currentSpace} size="sm" />
					<span class="hidden sm:inline">{spaceConfig.name}</span>
				</div>
				<!-- Edit Space Context Button -->
				<button
					type="button"
					class="p-1.5 rounded-md text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-all"
					title="Edit space context"
					onclick={() => showSpaceModal = true}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
				</button>
			</div>

			<!-- Assist Dropdown -->
			<AssistDropdown space={currentSpace} onSelect={handleAssistSelect} />
		{/if}

		<!-- Spaces Link -->
		<a
			href="/spaces"
			class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
				   bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-surface-100
				   border border-surface-700 hover:border-surface-600 transition-all"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
			</svg>
			<span class="hidden sm:inline">Spaces</span>
		</a>
	</div>

	<!-- Center: Model Selector -->
	{#if !chatStore.messages || chatStore.messages.length === 0}
		<div class="flex-1 flex justify-center">
			<div class="w-full max-w-xs">
				<ModelSelector {selectedModel} disabled={chatStore.isStreaming} onchange={handleModelChange} />
			</div>
		</div>
	{:else}
		<div class="flex-1"></div>
	{/if}

	<!-- Right: Actions -->
	<div class="flex items-center gap-2">
		<!-- Task Badge (only in Work space for now) -->
		{#if currentSpace === 'work'}
			<FocusIndicator
				onCompleteTask={handleCompleteTask}
				onSwitchTask={handleSwitchTask}
				onExitFocus={handleExitFocus}
				onManageContext={handleOpenManageContext}
			/>
			<TaskBadge
				spaceId={currentSpace}
				onOpenPanel={handleOpenTaskPanel}
				onFocusTask={handleFocusTask}
				onCompleteTask={(id) => handleCompleteTask(id)}
			/>
		{/if}

		{#if chatStore.messages && chatStore.messages.length > 0 && chatStore.activeConversation}
			<span class="flex items-center gap-1.5 px-3 py-1.5 bg-surface-800 rounded-lg text-xs text-surface-400">
				<span class="w-2 h-2 rounded-full" style="background: var(--space-accent);"></span>
				{chatStore.activeConversation.model.split('/').pop()}
			</span>
		{/if}

		<button
			type="button"
			class="btn-icon"
			onclick={() => settingsOpen = true}
			aria-label="Open settings"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
		</button>

		<form action="/logout" method="GET">
			<button type="submit" class="btn-ghost text-sm flex items-center gap-2">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
				</svg>
				<span class="hidden sm:inline">Logout</span>
			</button>
		</form>
	</div>
</header>

<!-- Area Pills Bar (always show so users can add first area) -->
{#if currentSpace}
	<div class="focus-area-bar">
		<FocusAreaPills
			areas={focusAreas}
			selectedId={selectedFocusAreaId}
			onSelect={handleFocusAreaSelect}
			onAdd={handleAddFocusArea}
			onEdit={handleEditFocusArea}
			spaceColor={spaceConfig?.accentColor || '#6b7280'}
		/>
	</div>
{/if}

<div class="flex-1 flex overflow-hidden">
	<!-- Mobile backdrop -->
	{#if settingsStore.sidebarOpen}
		<button
			type="button"
			class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
			onclick={closeSidebar}
			transition:fade={{ duration: 200 }}
			aria-label="Close sidebar"
		></button>
	{/if}

	<!-- Space-aware Sidebar (hidden when assist is active) -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<aside
		class="fixed lg:relative z-50 h-full w-[280px] bg-surface-900 border-r border-surface-800
			   flex flex-col transform transition-transform duration-300 ease-out
			   {isAssistActive || planMode ? 'hidden' : settingsStore.sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:border-0 lg:overflow-hidden'}"
		onclick={handleSidebarClick}
	>
		<!-- New Chat Button (with space accent) -->
		<div class="p-4 border-b border-surface-800">
			<button
				type="button"
				class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200"
				style="background: var(--space-accent); color: white;"
				onclick={handleNewChat}
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				<span>New {spaceConfig?.name} Chat</span>
			</button>
		</div>

		<!-- Search -->
		<div class="px-4 py-3">
			<div class="relative">
				<svg
					class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-150
						   {isSearchFocused ? 'text-primary-400' : 'text-surface-500'}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					bind:this={searchInputRef}
					type="text"
					placeholder="Search {spaceConfig?.name?.toLowerCase()} chats..."
					class="w-full pl-10 pr-9 py-2 bg-surface-800 border border-surface-700 rounded-xl
						   text-sm text-surface-100 placeholder-surface-500
						   focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200"
					style="--tw-ring-color: var(--space-accent-ring);"
					bind:value={searchQuery}
					onfocus={() => (isSearchFocused = true)}
					onblur={() => (isSearchFocused = false)}
					onkeydown={handleSearchKeydown}
				/>
				{#if searchQuery}
					<button
						type="button"
						class="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full
							   text-surface-500 hover:text-surface-300 hover:bg-surface-700
							   transition-all duration-150"
						onclick={clearSearch}
						title="Clear search (Esc)"
						transition:fade={{ duration: 150 }}
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>
		</div>

		<!-- Conversation List -->
		<div class="flex-1 overflow-y-auto py-2 scrollbar-hide">
			{#if !hasResults}
				<div class="px-4 py-8 text-center text-surface-500">
					{#if searchQuery}
						<svg class="w-10 h-10 mx-auto mb-3 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						<p class="text-sm">No results for "{searchQuery}"</p>
						<p class="text-xs text-surface-600 mt-1">Try a different search term</p>
					{:else}
						<svg class="w-12 h-12 mx-auto mb-3 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
								d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
						</svg>
						<p class="text-sm">No {spaceConfig?.name?.toLowerCase()} conversations yet</p>
						<p class="text-xs text-surface-600 mt-1">Start a new chat to begin</p>
					{/if}
				</div>
			{:else}
				<!-- Pinned Section -->
				{#if hasPinnedResults}
					<div class="pinned-section" in:fly={{ y: -10, duration: 200 }}>
						<div class="section-header">
							<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
								<path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
							</svg>
							<span>Pinned</span>
						</div>
						{#each filteredPinned as conversation (conversation.id)}
							<ConversationItem
								{conversation}
								active={conversation.id === chatStore.activeConversationId}
								menuOpen={openMenuId === conversation.id}
								onMenuToggle={(isOpen) => handleMenuToggle(conversation.id, isOpen)}
								onclick={() => { closeAllMenus(); handleConversationClick(conversation.id); }}
								ondelete={() => handleDeleteConversation(conversation.id)}
								onpin={() => handlePinConversation(conversation.id)}
								onrename={(title) => handleRenameConversation(conversation.id, title)}
								onexport={() => handleExportConversation(conversation.id)}
								onFocusTask={handleFocusTask}
							/>
						{/each}
					</div>
					{#if hasCurrentResults}
						<div class="section-divider"></div>
					{/if}
				{/if}

				<!-- Current Context Section -->
				{#if hasCurrentResults}
					{#if hasPinnedResults}
						<div class="section-header mt-1">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span>Recent</span>
						</div>
					{/if}
					{#each filteredCurrent as conversation (conversation.id)}
						<ConversationItem
							{conversation}
							active={conversation.id === chatStore.activeConversationId}
							menuOpen={openMenuId === conversation.id}
							onMenuToggle={(isOpen) => handleMenuToggle(conversation.id, isOpen)}
							onclick={() => { closeAllMenus(); handleConversationClick(conversation.id); }}
							ondelete={() => handleDeleteConversation(conversation.id)}
							onpin={() => handlePinConversation(conversation.id)}
							onrename={(title) => handleRenameConversation(conversation.id, title)}
							onexport={() => handleExportConversation(conversation.id)}
							onFocusTask={handleFocusTask}
						/>
					{/each}
				{/if}

				<!-- Other In Space Section (collapsible) - Phase C: shown when focus area selected -->
				{#if hasOtherInSpace}
					<div class="section-divider"></div>
					<button
						type="button"
						class="section-header section-header-collapsible"
						onclick={() => (otherInSpaceExpanded = !otherInSpaceExpanded)}
					>
						<svg
							class="w-3.5 h-3.5 transform transition-transform duration-200"
							class:rotate-90={otherInSpaceExpanded}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
						<span>Other in {spaceConfig?.name || 'Space'}</span>
						<span class="section-count">{filteredOtherInSpace.length}</span>
					</button>
					{#if otherInSpaceExpanded}
						<div transition:slide={{ duration: 200 }}>
							{#each filteredOtherInSpace as conversation (conversation.id)}
								<ConversationItem
									{conversation}
									active={conversation.id === chatStore.activeConversationId}
									menuOpen={openMenuId === conversation.id}
									onMenuToggle={(isOpen) => handleMenuToggle(conversation.id, isOpen)}
									onclick={() => { closeAllMenus(); handleConversationClick(conversation.id); }}
									ondelete={() => handleDeleteConversation(conversation.id)}
									onpin={() => handlePinConversation(conversation.id)}
									onrename={(title) => handleRenameConversation(conversation.id, title)}
									onexport={() => handleExportConversation(conversation.id)}
									onFocusTask={handleFocusTask}
								/>
							{/each}
						</div>
					{/if}
				{/if}

				<!-- Other Contexts Section (collapsible) - Phase C -->
				{#if hasOtherContexts}
					<div class="section-divider"></div>
					<button
						type="button"
						class="section-header section-header-collapsible"
						onclick={() => (otherContextsExpanded = !otherContextsExpanded)}
					>
						<svg
							class="w-3.5 h-3.5 transform transition-transform duration-200"
							class:rotate-90={otherContextsExpanded}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
						</svg>
						<span>From Other Contexts</span>
						<span class="section-count">{filteredOtherContexts.length}</span>
					</button>
					{#if otherContextsExpanded}
						<div transition:slide={{ duration: 200 }}>
							{#each filteredOtherContexts as conversation (conversation.id)}
								<ConversationItem
									{conversation}
									active={conversation.id === chatStore.activeConversationId}
									menuOpen={openMenuId === conversation.id}
									onMenuToggle={(isOpen) => handleMenuToggle(conversation.id, isOpen)}
									onclick={() => { closeAllMenus(); handleConversationClick(conversation.id); }}
									ondelete={() => handleDeleteConversation(conversation.id)}
									onpin={() => handlePinConversation(conversation.id)}
									onrename={(title) => handleRenameConversation(conversation.id, title)}
									onexport={() => handleExportConversation(conversation.id)}
									onFocusTask={handleFocusTask}
								/>
							{/each}
						</div>
					{/if}
				{/if}
			{/if}
		</div>

		<!-- Footer -->
		<div class="p-4 border-t border-surface-800">
			<div class="flex items-center justify-between text-xs text-surface-500">
				<span>{spaceConversationCount} {spaceConfig?.name?.toLowerCase()} chat{spaceConversationCount === 1 ? '' : 's'}</span>
			</div>
		</div>
	</aside>

	<!-- Main Content -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<main
		class="flex-1 flex flex-col overflow-hidden bg-surface-950 relative transition-all duration-300"
		class:mr-[40vw]={isSecondOpinionOpen || (isAssistActive && assistState && (assistState.tasks.length > 0 || assistState.error)) || (showTaskPanel && !isAssistActive) || planMode}
		class:assist-mode={isAssistActive}
		class:plan-mode={planMode}
		ondragenter={handleGlobalDragEnter}
		ondragleave={handleGlobalDragLeave}
		ondragover={handleGlobalDragOver}
		ondrop={handleGlobalDrop}
	>
		<!-- Global drag indicator -->
		{#if isGlobalDragging}
			<div class="absolute inset-0 z-40 pointer-events-none">
				<div class="absolute inset-4 border-2 border-dashed rounded-2xl" style="border-color: var(--space-accent);"></div>
				<div class="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-surface-800/90 backdrop-blur-sm rounded-full border shadow-lg" style="border-color: var(--space-accent-ring);">
					<span class="text-sm text-surface-300 flex items-center gap-2">
						<svg class="w-4 h-4" style="color: var(--space-accent);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
						</svg>
						Drop file on the input below
					</span>
				</div>
			</div>
		{/if}

		<!-- Messages -->
		<div bind:this={messagesContainer} class="flex-1 overflow-y-auto p-4 md:p-6">
			<div class="max-w-4xl mx-auto">
				{#if messages.length === 0 && parentMessages.length === 0}
					{#if focusedTask && !isAssistActive && !planMode}
						<!-- Focused Task Welcome - replaces standard welcome when task is focused -->
						<FocusedTaskWelcome
							task={focusedTask}
							documents={taskDocuments}
							relatedTasks={taskRelatedTasks}
							onExitFocus={handleExitFocus}
							onOpenPanel={handleOpenTaskPanel}
							onStartPlanMode={handleStartPlanMode}
							onAddContext={handleOpenAddContext}
							onRemoveDocument={handleUnlinkDocument}
							onRemoveRelatedTask={handleUnlinkRelatedTask}
						/>
					{:else}
						<WelcomeScreen hasModel={!!selectedModel} onNewChat={handleNewChat} space={currentSpace} activeAssist={assistState?.assist} />

						<!-- Greeting for returning users with tasks -->
						{#if showGreeting && greeting}
							<div class="mt-6 border-t border-surface-800 pt-6">
								<GreetingMessage
									{greeting}
									onFocusTask={handleGreetingFocusTask}
									onOpenPanel={handleGreetingOpenPanel}
									onDismiss={handleGreetingDismiss}
								/>
							</div>
						{/if}
					{/if}
				{:else}
					{#if isContinuedConversation && parentMessages.length > 0}
						<div class="parent-messages opacity-70">
							{#each parentMessages as message (message.id)}
								<ChatMessage {message} showTimestamp={settingsStore.showTimestamps} />
							{/each}
						</div>
					{/if}

					{#if isContinuedConversation && refreshedAt}
						<SessionSeparator timestamp={refreshedAt} summaryPreview={continuationSummary} />
					{/if}

					{#each messages as message, index (message.id)}
						<ChatMessage
							{message}
							messageIndex={index}
							showTimestamp={settingsStore.showTimestamps}
							canEdit={!chatStore.isStreaming}
							onEditAndResend={async (messageId: string, newContent: string) => {
								const conv = chatStore.activeConversation;
								if (!conv) return;
								const msgIndex = chatStore.getMessageIndex(conv.id, messageId);
								if (msgIndex === -1) return;
								chatStore.updateMessageContent(conv.id, messageId, newContent);
								chatStore.deleteMessagesFromIndex(conv.id, msgIndex + 1);
								await triggerAssistantResponse(conv.id);
							}}
							onResend={handleResend}
							onRegenerate={handleRegenerate}
							onSecondOpinion={(idx, e) => handleSecondOpinionTrigger(idx, e)}
						/>
					{/each}

					{#if currentSummary || isGeneratingSummary}
						<ConversationSummary
							summary={currentSummary}
							isGenerating={isGeneratingSummary}
							onGenerate={handleGenerateSummary}
							onDismiss={handleDismissSummary}
							onScrollToMessage={scrollToMessage}
						/>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Input -->
		<ChatInput
			onsend={handleSend}
			onstop={handleStop}
			onsummarize={handleGenerateSummary}
			oncompact={() => {}}
			isGeneratingSummary={isGeneratingSummary}
			{isCompacting}
			disabled={!selectedModel}
		/>

		<!-- Plan Mode hint below chat input -->
		{#if planMode && planMode.phase === 'eliciting'}
			<p class="text-xs text-surface-500 mt-1 ml-2 mb-2">
				Share context about your task. Say "go ahead" when ready for suggestions.
			</p>
		{/if}
	</main>

	<!-- Second Opinion Panel -->
	{#if isSecondOpinionOpen && secondOpinion}
		<div class="fixed top-14 right-0 bottom-0 z-30">
			<SecondOpinionPanel
				content={secondOpinion.content}
				thinking={secondOpinion.thinking}
				isStreaming={secondOpinion.isStreaming}
				modelId={secondOpinion.modelId}
				error={secondOpinion.error}
				onUseAnswer={handleUseSecondOpinionAnswer}
				onFork={handleForkWithSecondOpinion}
				onClose={() => chatStore.closeSecondOpinion()}
			/>
		</div>
	{/if}

	<!-- Working Panel (Assists) - show when there are tasks or errors -->
	{#if isAssistActive && assistState && (assistState.tasks.length > 0 || assistState.error)}
		<div class="fixed top-16 right-0 bottom-0 z-30">
			<WorkingPanel
				assistState={assistState}
				onClose={handleAssistClose}
				onConfirmTasks={handleConfirmTasks}
				onSelectTask={handleSelectTask}
				onUpdateTask={(taskId, text) => chatStore.updateAssistTaskText(taskId, text)}
				onRemoveTask={(taskId) => chatStore.removeAssistTask(taskId)}
				onAddTask={(text) => chatStore.addAssistTask(text)}
			/>
		</div>
	{/if}

	<!-- Task Panel (CRUD mode) - show when user opens from badge -->
	{#if showTaskPanel && currentSpace && !isAssistActive}
		<div class="fixed top-16 right-0 bottom-0 z-30">
			<TaskPanel
				spaceId={currentSpace}
				focusAreaId={selectedFocusAreaId}
				onClose={() => showTaskPanel = false}
				onFocusTask={handleFocusTask}
				onAddContext={handleTaskPanelAddContext}
			/>
		</div>
	{/if}

	<!-- Plan Mode Panel - show when Plan Mode is active -->
	{#if planMode}
		<div class="fixed top-16 right-0 bottom-0 z-30">
			<PlanModePanel
				planMode={planMode}
				context={taskContext}
				onClose={handleExitPlanMode}
				onCreateSubtasks={handleCreateSubtasksFromPlan}
				onUpdateSubtask={handleUpdateProposedSubtask}
				onToggleSubtask={handleToggleProposedSubtask}
				onRemoveSubtask={handleRemoveProposedSubtask}
				onAddSubtask={handleAddProposedSubtask}
				onRequestProposal={handleRequestProposal}
			/>
		</div>
	{/if}
</div>

<!-- Second Opinion Model Selector -->
{#if showModelSelector}
	<div style="--dropdown-top: {modelSelectorPosition.top}px; --dropdown-left: {modelSelectorPosition.left}px;">
		<SecondOpinionModelSelect
			currentModel={effectiveModel}
			onSelect={handleSecondOpinionModelSelect}
			onClose={closeModelSelector}
		/>
	</div>
{/if}

<!-- Settings Panel -->
<SettingsPanel open={settingsOpen} onclose={() => settingsOpen = false} />

<!-- Area Modal -->
{#if currentSpace}
	<FocusAreaModal
		open={showFocusAreaModal}
		area={editingFocusArea}
		spaceId={currentSpace}
		onClose={handleCloseFocusAreaModal}
		onCreate={handleCreateFocusArea}
		onUpdate={handleUpdateFocusArea}
		onDelete={handleDeleteFocusArea}
	/>
{/if}

<!-- Space Context Modal -->
{#if spaceFromStore}
	<SpaceModal
		open={showSpaceModal}
		space={spaceFromStore}
		onClose={() => showSpaceModal = false}
		onCreate={async () => {}}
		onUpdate={handleUpdateSpace}
	/>
{/if}

<!-- Add Context Modal -->
{#if showAddContextModal && contextModalTaskId && currentSpace}
	<AddContextModal
		open={showAddContextModal}
		taskId={contextModalTaskId}
		spaceId={currentSpace}
		currentDocumentIds={taskDocuments.map(d => d.documentId)}
		currentRelatedTaskIds={taskRelatedTasks.map(t => t.task.id)}
		onClose={handleCloseAddContext}
		onLinkDocument={handleLinkDocument}
		onLinkRelatedTask={handleLinkRelatedTask}
		onUploadComplete={handleDocumentUploaded}
	/>
{/if}

<!-- Manage Context Modal -->
{#if showManageContextModal && focusedTask && currentSpace}
	<ManageContextModal
		open={showManageContextModal}
		taskId={focusedTask.id}
		spaceId={currentSpace}
		currentFocusAreaId={focusedTask.focusAreaId || null}
		onClose={handleCloseManageContext}
		onUpdateFocusArea={handleUpdateTaskFocusArea}
		onAddContext={handleOpenAddContext}
	/>
{/if}

<!-- BringToContext Modal (Phase C - cross-context navigation) -->
{#if showBringToContextModal && bringToContextConversation}
	<BringToContextModal
		conversation={bringToContextConversation}
		currentContext={{
			spaceId: currentSpace,
			focusAreaId: selectedFocusAreaId,
			taskId: focusedTask?.id
		}}
		onOpenInOrigin={handleOpenInOrigin}
		onBringHere={handleBringHere}
		onClose={handleCloseBringToContext}
	/>
{/if}

<style>
	/* Focus Area Pills Bar */
	.focus-area-bar {
		padding: 0.5rem 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	/* Subtle background tint when in assist mode */
	:global(main.assist-mode) {
		background: linear-gradient(
			135deg,
			rgba(59, 130, 246, 0.03) 0%,
			rgba(59, 130, 246, 0.01) 50%,
			transparent 100%
		);
	}

	/* For Work space (blue accent) - enhance the tint */
	:global(main.assist-mode::before) {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(
			ellipse at bottom center,
			rgba(59, 130, 246, 0.05) 0%,
			transparent 70%
		);
		z-index: 0;
	}

	/* Ensure content is above the tint */
	:global(main.assist-mode > *) {
		position: relative;
		z-index: 1;
	}

	/* Amber glow on the actual chat input field when in assist mode (not focused) */
	:global(main.assist-mode .chat-input-field:not(:focus-within)) {
		border-color: rgba(251, 191, 36, 0.5) !important;
		box-shadow:
			0 0 0 1px rgba(251, 191, 36, 0.3),
			0 0 12px rgba(251, 191, 36, 0.2),
			0 0 24px rgba(251, 191, 36, 0.1);
		animation: amber-border-pulse 2.5s ease-in-out infinite;
	}

	@keyframes amber-border-pulse {
		0%, 100% {
			box-shadow:
				0 0 0 1px rgba(251, 191, 36, 0.3),
				0 0 12px rgba(251, 191, 36, 0.2),
				0 0 24px rgba(251, 191, 36, 0.1);
		}
		50% {
			box-shadow:
				0 0 0 1px rgba(251, 191, 36, 0.5),
				0 0 18px rgba(251, 191, 36, 0.3),
				0 0 30px rgba(251, 191, 36, 0.15);
		}
	}

	/* Subtle background tint when in plan mode - uses space accent */
	:global(main.plan-mode) {
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--space-accent) 3%, transparent) 0%,
			color-mix(in srgb, var(--space-accent) 1%, transparent) 50%,
			transparent 100%
		);
	}

	/* Radial glow for plan mode */
	:global(main.plan-mode::before) {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(
			ellipse at bottom center,
			color-mix(in srgb, var(--space-accent) 5%, transparent) 0%,
			transparent 70%
		);
		z-index: 0;
	}

	/* Ensure content is above the tint in plan mode */
	:global(main.plan-mode > *) {
		position: relative;
		z-index: 1;
	}
</style>
