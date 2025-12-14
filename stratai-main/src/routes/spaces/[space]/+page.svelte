<script lang="ts">
	import { tick, onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
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
	import { chatStore } from '$lib/stores/chat.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import { modelSupportsVision } from '$lib/config/model-capabilities';
	import { SPACES, isValidSpace, type ENABLED_SPACES } from '$lib/config/spaces';
	import type { SpaceType, FileAttachment } from '$lib/types/chat';

	// Get space from route param
	let spaceParam = $derived($page.params.space);
	let currentSpace = $derived.by(() => {
		if (spaceParam && isValidSpace(spaceParam)) {
			return spaceParam as SpaceType;
		}
		return null;
	});
	let spaceConfig = $derived(currentSpace ? SPACES[currentSpace] : null);

	// Validate space and redirect if invalid
	$effect(() => {
		if (spaceParam && !isValidSpace(spaceParam)) {
			goto('/spaces');
		}
	});

	// Set active space in store when entering/leaving
	// Also clear active conversation if it doesn't belong to this space
	$effect(() => {
		if (currentSpace) {
			chatStore.setActiveSpace(currentSpace);

			// If active conversation doesn't belong to this space, clear it
			const activeConv = chatStore.activeConversation;
			if (activeConv && activeConv.space !== currentSpace) {
				chatStore.setActiveConversation(null);
			}
		}
		return () => {
			chatStore.setActiveSpace(null);
		};
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

	// Space-filtered conversations
	let filteredPinned = $derived.by(() => {
		const pinned = chatStore.pinnedConversationsBySpace;
		if (!searchQuery.trim()) return pinned;
		return filterByQuery(pinned, searchQuery);
	});
	let filteredUnpinned = $derived.by(() => {
		const unpinned = chatStore.unpinnedConversationsBySpace;
		if (!searchQuery.trim()) return unpinned;
		return filterByQuery(unpinned, searchQuery);
	});
	let hasResults = $derived(filteredPinned.length > 0 || filteredUnpinned.length > 0);
	let hasPinnedResults = $derived(filteredPinned.length > 0);
	let spaceConversationCount = $derived(
		currentSpace ? chatStore.getSpaceConversationCount(currentSpace) : 0
	);

	function filterByQuery(conversations: typeof filteredPinned, query: string) {
		const lowerQuery = query.toLowerCase();
		return conversations.filter((conv) => {
			if (conv.title.toLowerCase().includes(lowerQuery)) return true;
			return conv.messages.some((m) => m.content.toLowerCase().includes(lowerQuery));
		});
	}

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

	$effect(() => {
		if (messages.length) {
			scrollToBottom();
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
		chatStore.setActiveConversation(id);
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
			// Create new conversation WITH current space
			conversationId = chatStore.createConversation(settingsStore.selectedModel, currentSpace || undefined);
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
					space: currentSpace
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
		// Create conversation with current space
		chatStore.createConversation(selectedModel, currentSpace || undefined);
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

		const newConversationId = chatStore.createConversation(opinion.modelId, currentSpace || undefined);

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

		<!-- Space Badge -->
		{#if spaceConfig && currentSpace}
			<div
				class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border"
				style="background: var(--space-accent-muted); border-color: var(--space-accent-ring); color: var(--space-accent);"
			>
				<SpaceIcon space={currentSpace} size="sm" />
				<span class="hidden sm:inline">{spaceConfig.name}</span>
			</div>
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

	<!-- Space-aware Sidebar -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<aside
		class="fixed lg:relative z-50 h-full w-[280px] bg-surface-900 border-r border-surface-800
			   flex flex-col transform transition-transform duration-300 ease-out
			   {settingsStore.sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:border-0 lg:overflow-hidden'}"
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
							/>
						{/each}
					</div>
					{#if filteredUnpinned.length > 0}
						<div class="section-divider"></div>
					{/if}
				{/if}

				{#if filteredUnpinned.length > 0}
					{#if hasPinnedResults}
						<div class="section-header mt-1">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span>Recent</span>
						</div>
					{/if}
					{#each filteredUnpinned as conversation (conversation.id)}
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
						/>
					{/each}
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
		class:mr-[40vw]={isSecondOpinionOpen}
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
					<WelcomeScreen hasModel={!!selectedModel} onNewChat={handleNewChat} space={currentSpace} />
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
							onEditAndResend={(messageId: string, newContent: string) => {
								const conv = chatStore.activeConversation;
								if (!conv) return;
								const msgIndex = chatStore.getMessageIndex(conv.id, messageId);
								if (msgIndex === -1) return;
								chatStore.updateMessageContent(conv.id, messageId, newContent);
								chatStore.deleteMessagesFromIndex(conv.id, msgIndex + 1);
								// Trigger response handled by effect
							}}
							onResend={() => {}}
							onRegenerate={() => {}}
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
