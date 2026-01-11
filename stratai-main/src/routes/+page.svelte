<script lang="ts">
	import { tick, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import ChatInput from '$lib/components/ChatInput.svelte';
	import ChatMessageList from '$lib/components/chat/ChatMessageList.svelte';
	import WelcomeScreen from '$lib/components/chat/WelcomeScreen.svelte';
	import ConversationSummary from '$lib/components/chat/ConversationSummary.svelte';
	import SessionSeparator from '$lib/components/chat/SessionSeparator.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import SecondOpinionPanel from '$lib/components/chat/SecondOpinionPanel.svelte';
	import SecondOpinionModelSelect from '$lib/components/chat/SecondOpinionModelSelect.svelte';
	import BringToContextModal from '$lib/components/chat/BringToContextModal.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { modelSupportsVision } from '$lib/config/model-capabilities';
	import type { ChatCompletionChunk } from '$lib/types/api';
	import type { FileAttachment, Conversation } from '$lib/types/chat';

	// Svelte 5: Use $state for local reactive state
	let messagesContainer: HTMLElement | undefined = $state();

	// Selected model from settings (used for new conversations and model selector)
	let selectedModel = $derived(settingsStore.selectedModel || '');

	// Effective model: Use conversation's model if it exists, otherwise fall back to settings
	// This ensures mid-conversation model changes in settings don't affect existing chats
	let effectiveModel = $derived(
		chatStore.activeConversation?.model || settingsStore.selectedModel || ''
	);

	// AUTO mode detection and routing state
	let isAutoMode = $derived(effectiveModel.toLowerCase() === 'auto');
	let routedModel = $derived(chatStore.routedModel);
	let autoProvider = $derived(chatStore.autoProvider);

	let settingsOpen = $state(false);
	let isGeneratingSummary = $state(false);
	let isCompacting = $state(false);

	// Global drag state for drop zone indicator
	let isGlobalDragging = $state(false);
	let globalDragCounter = $state(0);
	let chatInputRef: { triggerFileDrop?: (files: FileList) => void } | undefined = $state();

	// Second Opinion state
	let showModelSelector = $state(false);
	let modelSelectorPosition = $state({ top: 0, left: 0 });
	let pendingSecondOpinionIndex = $state<number | null>(null);
	let secondOpinion = $derived(chatStore.secondOpinion);
	let isSecondOpinionOpen = $derived(chatStore.isSecondOpinionOpen);

	// Bring to Context Modal state (Phase C)
	let showBringToContextModal = $state(false);
	let bringToContextConversation = $state<Conversation | null>(null);

	// Apply saved theme on mount
	onMount(() => {
		applyTheme(settingsStore.theme);

		// Listen for system theme changes
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

	// Svelte 5: Direct access to store's $derived property (properly reactive now)
	let messages = $derived(chatStore.messages);
	let currentSummary = $derived(chatStore.activeConversation?.summary || null);
	let isContinuedConversation = $derived(!!chatStore.activeConversation?.continuedFromId);
	let continuationSummary = $derived(chatStore.activeConversation?.continuationSummary ?? undefined);
	let refreshedAt = $derived(chatStore.activeConversation?.refreshedAt || null);

	// Get parent conversation messages for continued conversations
	let parentConversation = $derived(
		chatStore.activeConversation?.continuedFromId
			? chatStore.getConversation(chatStore.activeConversation.continuedFromId)
			: null
	);
	// Filter out any messages without IDs to prevent {#each} key errors
	let parentMessages = $derived(
		(parentConversation?.messages || []).filter((m) => m && m.id)
	);

	// Svelte 5: Use $effect for side effects
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

	/**
	 * Scroll to a specific message by its index and highlight it
	 */
	async function scrollToMessage(index: number) {
		await tick();
		const messageElement = document.getElementById(`message-${index}`);
		if (messageElement && messagesContainer) {
			// Scroll the message into view
			messageElement.scrollIntoView({
				behavior: 'smooth',
				block: 'center'
			});

			// Add highlight animation
			messageElement.classList.add('message-highlight');
			setTimeout(() => {
				messageElement.classList.remove('message-highlight');
			}, 2000);
		}
	}

	// Global drag handlers for visual indicator
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
		// Let the ChatInput handle the actual drop
		// This just resets the visual state
		isGlobalDragging = false;
		globalDragCounter = 0;
	}

	/**
	 * Format text attachments as context for the LLM (document files only)
	 */
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

	/**
	 * Check if attachments contain any images
	 */
	function hasImageAttachments(attachments?: FileAttachment[]): boolean {
		return attachments?.some(att => att.content.type === 'image') || false;
	}

	/**
	 * Build a vision-compatible user message with image content blocks
	 * Uses OpenAI format (image_url) which LiteLLM converts to provider-native format
	 * Using separate 'format' field for MIME type (more reliable for Anthropic/Bedrock)
	 */
	function buildVisionMessage(
		textContent: string,
		attachments: FileAttachment[]
	): Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; format?: string } }> {
		const contentBlocks: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; format?: string } }> = [];

		// Add images first (Claude performs better with images before text)
		// Using OpenAI format with LiteLLM's format extension for MIME type
		// LiteLLM will convert this to the appropriate format for each provider
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

		// Add text documents as text blocks
		for (const att of attachments) {
			if (att.content.type === 'text') {
				contentBlocks.push({
					type: 'text',
					text: `[Document: ${att.filename}]\n${att.content.data}${att.truncated ? '\n(Note: Document truncated due to length)' : ''}`
				});
			}
		}

		// Add the user's message text
		if (textContent.trim()) {
			contentBlocks.push({
				type: 'text',
				text: textContent
			});
		}

		return contentBlocks;
	}

	async function handleSend(content: string, attachments?: FileAttachment[]) {
		// Auto-close second opinion panel when user sends a new message
		if (chatStore.isSecondOpinionOpen) {
			chatStore.closeSecondOpinion();
		}

		// Check if we have a valid model to use
		// For existing conversations, use the conversation's model
		// For new conversations, use the settings model
		const modelToUse = chatStore.activeConversation?.model || settingsStore.selectedModel;
		if (!modelToUse) {
			toastStore.error('Please select a model first');
			return;
		}

		// Validate image attachments against model capabilities (check the model that will actually be used)
		const hasImages = hasImageAttachments(attachments);
		if (hasImages && !modelSupportsVision(modelToUse)) {
			const modelName = modelCapabilitiesStore.getDisplayName(modelToUse);
			toastStore.error(`${modelName} does not support image analysis. Please select a vision-capable model.`);
			return;
		}

		// Ensure we have an active conversation
		let conversationId = chatStore.activeConversation?.id;
		if (!conversationId) {
			// New conversation - use settings model
			conversationId = chatStore.createConversation(settingsStore.selectedModel);
		}

		// Add user message with attachments
		chatStore.addMessage(conversationId, {
			role: 'user',
			content,
			attachments
		});

		// Add placeholder assistant message
		const assistantMessageId = chatStore.addMessage(conversationId, {
			role: 'assistant',
			content: '',
			isStreaming: true
		});

		// Start streaming
		const controller = new AbortController();
		chatStore.setStreaming(true, controller);

		try {
			// Build messages array for API
			const conv = chatStore.getConversation(conversationId);
			const allMessages = (conv?.messages || []).filter((m) => !m.isStreaming && !m.error);

			// Prepend system prompt if configured
			const systemPrompt = settingsStore.systemPrompt?.trim();

			// Check if this message has images - need vision format
			const hasImages = hasImageAttachments(attachments);

			// Build API messages with proper format for vision/non-vision
			const apiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<unknown> }> = [];

			// Add system prompt
			if (systemPrompt) {
				apiMessages.push({ role: 'system', content: systemPrompt });
			}

			// Add text document context as system message (for non-image attachments)
			if (attachments && !hasImages) {
				const textContext = formatTextAttachmentsForLLM(attachments);
				if (textContext) {
					apiMessages.push({ role: 'system', content: textContext });
				}
			}

			// Add conversation history (all messages except the last user message if it has images)
			const historyMessages = hasImages ? allMessages.slice(0, -1) : allMessages;
			for (const m of historyMessages) {
				apiMessages.push({ role: m.role, content: m.content });
			}

			// If we have images, add the last user message with vision format
			if (hasImages && attachments) {
				const visionContent = buildVisionMessage(content, attachments);
				apiMessages.push({ role: 'user', content: visionContent });
			}

			// Clear previous routing state before new request
			if (isAutoMode) {
				chatStore.clearRoutingState();
			}

			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: effectiveModel,
					messages: apiMessages,
					temperature: settingsStore.temperature,
					max_tokens: settingsStore.effectiveMaxTokens, // Use effective max respecting model limits
					searchEnabled: settingsStore.webSearchEnabled,
					// Extended thinking - only enable if model supports it
					thinkingEnabled: settingsStore.extendedThinkingEnabled && settingsStore.canUseExtendedThinking,
					thinkingBudgetTokens: settingsStore.thinkingBudgetTokens,
					// AUTO mode routing params
					...(isAutoMode && {
						provider: autoProvider,
						currentModel: routedModel, // Previous model for cache coherence
						conversationTurn: Math.floor(chatStore.messages.length / 2) + 1
					})
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

							// Handle new extended format
							if (parsed.type === 'routing') {
								// AUTO mode routing decision from backend
								chatStore.setRoutedModel(parsed.selectedModel);
								chatStore.setRoutingDecision({
									tier: parsed.tier,
									score: parsed.score,
									confidence: parsed.confidence,
									overrides: parsed.overrides || []
								});
							} else if (parsed.type === 'status') {
								if (parsed.status === 'searching') {
									chatStore.updateMessage(conversationId!, assistantMessageId, {
										searchStatus: 'searching',
										searchQuery: parsed.query
									});
								} else if (parsed.status === 'processing') {
									// Sources have been found, now processing with LLM
									chatStore.updateMessage(conversationId!, assistantMessageId, {
										searchStatus: 'searching', // Keep showing search UI but with sources
										searchQuery: undefined
									});
								} else if (parsed.status === 'thinking') {
									chatStore.updateMessage(conversationId!, assistantMessageId, {
										searchStatus: undefined,
										searchQuery: undefined
									});
								}
							} else if (parsed.type === 'sources_preview') {
								// Early sources preview - show in search animation
								collectedSources = parsed.sources;
								chatStore.updateMessage(conversationId!, assistantMessageId, {
									sources: parsed.sources
								});
							} else if (parsed.type === 'thinking_start') {
								// Claude is starting to think
								chatStore.updateMessage(conversationId!, assistantMessageId, {
									isThinking: true
								});
							} else if (parsed.type === 'thinking') {
								// Append to thinking content
								chatStore.appendToThinking(conversationId!, assistantMessageId, parsed.content);
							} else if (parsed.type === 'thinking_end') {
								// Thinking phase is complete, now generating response
								chatStore.updateMessage(conversationId!, assistantMessageId, {
									isThinking: false
								});
							} else if (parsed.type === 'content') {
								chatStore.appendToMessage(conversationId!, assistantMessageId, parsed.content);
							} else if (parsed.type === 'sources') {
								collectedSources = parsed.sources;
							} else if (parsed.type === 'error') {
								throw new Error(parsed.error);
							} else if (parsed.choices?.[0]?.delta?.content) {
								// Standard OpenAI format
								chatStore.appendToMessage(conversationId!, assistantMessageId, parsed.choices[0].delta.content);
							}
						} catch (e) {
							// Skip invalid JSON unless it's a thrown error
							if (e instanceof Error && e.message !== 'Unexpected token') {
								throw e;
							}
						}
					}
				}
			}

			// Mark message as complete with sources
			chatStore.updateMessage(conversationId!, assistantMessageId, {
				isStreaming: false,
				isThinking: false,
				searchStatus: collectedSources.length > 0 ? 'complete' : undefined,
				sources: collectedSources.length > 0 ? collectedSources : undefined
			});
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				// User stopped the stream
				chatStore.updateMessage(conversationId!, assistantMessageId, {
					isStreaming: false
				});
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
		chatStore.createConversation(selectedModel);
	}

	// Phase C: Cross-context navigation handlers
	function handleShowBringToContext(conversation: Conversation) {
		bringToContextConversation = conversation;
		showBringToContextModal = true;
	}

	function handleOpenInOrigin() {
		if (!bringToContextConversation) return;

		const conv = bringToContextConversation;
		showBringToContextModal = false;
		bringToContextConversation = null;

		// Navigate to the conversation's origin space
		if (conv.spaceId) {
			const space = spacesStore.getSpaceById(conv.spaceId);
			if (space) {
				// Set active conversation before navigating
				chatStore.setActiveConversation(conv.id);
				goto(`/spaces/${space.slug}`);
			}
		} else {
			// Already in main, just open the conversation
			chatStore.setActiveConversation(conv.id);
		}
	}

	function handleBringHere() {
		if (!bringToContextConversation) return;

		const conv = bringToContextConversation;
		showBringToContextModal = false;
		bringToContextConversation = null;

		// Update conversation context to current (main = no space)
		chatStore.updateConversationContext(conv.id, {
			spaceId: null,
			areaId: null,
			taskId: null
		});

		// Open the conversation
		chatStore.setActiveConversation(conv.id);
		toastStore.success('Moved conversation to Main');
	}

	function handleCloseBringToContext() {
		showBringToContextModal = false;
		bringToContextConversation = null;
	}

	function handleModelChange(model: string) {
		settingsStore.setSelectedModel(model);
		// Update current conversation's model if exists
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
					messages: conversation.messages.map(m => ({
						role: m.role,
						content: m.content
					}))
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error?.message || 'Failed to generate summary');
			}

			const { summary } = await response.json();
			chatStore.setSummary(conversation.id, summary);
			// Scroll to bottom to show the summary
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
	 * Compact the current conversation by summarizing and creating a new session
	 */
	async function handleCompact() {
		const conversation = chatStore.activeConversation;
		if (!conversation || !effectiveModel) return;

		isCompacting = true;

		try {
			// Call the compact API to get a summary
			const response = await fetch('/api/compact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: conversation.messages.map((m) => ({
						role: m.role,
						content: m.content
					}))
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error?.message || 'Failed to compact conversation');
			}

			const { summary, continuationSystemPrompt } = await response.json();

			// Create a new continued conversation (inherits the original conversation's model)
			const newConversationId = chatStore.createContinuedConversation(
				conversation.id,
				summary,
				effectiveModel
			);

			// Now send a message to the AI to acknowledge the continuation
			// We'll use the continuation system prompt and ask for acknowledgment
			const controller = new AbortController();
			chatStore.setStreaming(true, controller);

			// Add placeholder assistant message
			const assistantMessageId = chatStore.addMessage(newConversationId, {
				role: 'assistant',
				content: '',
				isStreaming: true
			});

			try {
				const chatResponse = await fetch('/api/chat', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						model: effectiveModel,
						messages: [
							{ role: 'system', content: continuationSystemPrompt },
							{
								role: 'user',
								content:
									"I've just refreshed our session to manage the context window. Please briefly acknowledge that you have the context and are ready to continue our conversation."
							}
						],
						temperature: settingsStore.temperature,
						max_tokens: 500 // Keep acknowledgment concise
					}),
					signal: controller.signal
				});

				if (!chatResponse.ok) {
					const error = await chatResponse.json();
					throw new Error(error.error?.message || 'Failed to get acknowledgment');
				}

				// Parse SSE stream
				const reader = chatResponse.body?.getReader();
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
								if (parsed.type === 'content') {
									chatStore.appendToMessage(newConversationId, assistantMessageId, parsed.content);
								} else if (parsed.choices?.[0]?.delta?.content) {
									chatStore.appendToMessage(
										newConversationId,
										assistantMessageId,
										parsed.choices[0].delta.content
									);
								}
							} catch {
								// Skip invalid JSON
							}
						}
					}
				}

				chatStore.updateMessage(newConversationId, assistantMessageId, {
					isStreaming: false
				});
			} catch (err) {
				if (err instanceof Error && err.name === 'AbortError') {
					chatStore.updateMessage(newConversationId, assistantMessageId, {
						isStreaming: false
					});
				} else {
					chatStore.updateMessage(newConversationId, assistantMessageId, {
						isStreaming: false,
						error: err instanceof Error ? err.message : 'Unknown error'
					});
				}
			} finally {
				chatStore.setStreaming(false);
			}

			toastStore.success('Session refreshed successfully');
		} catch (err) {
			toastStore.error(err instanceof Error ? err.message : 'Failed to compact conversation');
		} finally {
			isCompacting = false;
		}
	}

	/**
	 * Trigger an assistant response based on the current conversation state
	 * Extracted for reuse in edit/resend/regenerate flows
	 */
	async function triggerAssistantResponse(conversationId: string) {
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

			// Get the last user message to check for attachments
			const lastUserMessage = allMessages.filter((m) => m.role === 'user').pop();
			const attachments = lastUserMessage?.attachments;
			const hasImages = hasImageAttachments(attachments);

			// Build API messages with proper format for vision/non-vision
			const apiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<unknown> }> = [];

			// Add system prompt
			if (systemPrompt) {
				apiMessages.push({ role: 'system', content: systemPrompt });
			}

			// Add text document context as system message (only when no images)
			if (attachments && !hasImages) {
				const textContext = formatTextAttachmentsForLLM(attachments);
				if (textContext) {
					apiMessages.push({ role: 'system', content: textContext });
				}
			}

			// Add conversation history
			if (hasImages && lastUserMessage) {
				// Add all messages except the last user message
				const historyMessages = allMessages.slice(0, allMessages.lastIndexOf(lastUserMessage));
				for (const m of historyMessages) {
					apiMessages.push({ role: m.role, content: m.content });
				}
				// Add the last user message with vision format
				const visionContent = buildVisionMessage(lastUserMessage.content, attachments!);
				apiMessages.push({ role: 'user', content: visionContent });
			} else {
				// No images, use simple string format
				for (const m of allMessages) {
					apiMessages.push({ role: m.role, content: m.content });
				}
			}

			// Clear previous routing state before new request
			if (isAutoMode) {
				chatStore.clearRoutingState();
			}

			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: effectiveModel,
					messages: apiMessages,
					temperature: settingsStore.temperature,
					max_tokens: settingsStore.effectiveMaxTokens, // Use effective max respecting model limits
					searchEnabled: settingsStore.webSearchEnabled,
					// Extended thinking - only enable if model supports it
					thinkingEnabled: settingsStore.extendedThinkingEnabled && settingsStore.canUseExtendedThinking,
					thinkingBudgetTokens: settingsStore.thinkingBudgetTokens,
					// AUTO mode routing params
					...(isAutoMode && {
						provider: autoProvider,
						currentModel: routedModel, // Previous model for cache coherence
						conversationTurn: Math.floor(chatStore.messages.length / 2) + 1
					})
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

							if (parsed.type === 'routing') {
								// AUTO mode routing decision from backend
								chatStore.setRoutedModel(parsed.selectedModel);
								chatStore.setRoutingDecision({
									tier: parsed.tier,
									score: parsed.score,
									confidence: parsed.confidence,
									overrides: parsed.overrides || []
								});
							} else if (parsed.type === 'status') {
								if (parsed.status === 'searching') {
									chatStore.updateMessage(conversationId, assistantMessageId, {
										searchStatus: 'searching',
										searchQuery: parsed.query
									});
								} else if (parsed.status === 'processing') {
									chatStore.updateMessage(conversationId, assistantMessageId, {
										searchStatus: 'searching',
										searchQuery: undefined
									});
								} else if (parsed.status === 'thinking') {
									chatStore.updateMessage(conversationId, assistantMessageId, {
										searchStatus: undefined,
										searchQuery: undefined
									});
								}
							} else if (parsed.type === 'sources_preview') {
								collectedSources = parsed.sources;
								chatStore.updateMessage(conversationId, assistantMessageId, {
									sources: parsed.sources
								});
							} else if (parsed.type === 'thinking_start') {
								chatStore.updateMessage(conversationId, assistantMessageId, {
									isThinking: true
								});
							} else if (parsed.type === 'thinking') {
								chatStore.appendToThinking(conversationId, assistantMessageId, parsed.content);
							} else if (parsed.type === 'thinking_end') {
								chatStore.updateMessage(conversationId, assistantMessageId, {
									isThinking: false
								});
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
				searchStatus: collectedSources.length > 0 ? 'complete' : undefined,
				sources: collectedSources.length > 0 ? collectedSources : undefined
			});
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				chatStore.updateMessage(conversationId, assistantMessageId, {
					isStreaming: false
				});
			} else {
				chatStore.updateMessage(conversationId, assistantMessageId, {
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
	 * Edit a user message and resend it
	 */
	async function handleEditAndResend(messageId: string, newContent: string) {
		const conversationId = chatStore.activeConversation?.id;
		if (!conversationId || !effectiveModel) return;

		const messageIndex = chatStore.getMessageIndex(conversationId, messageId);
		if (messageIndex === -1) return;

		// Update the message content (preserves attachments)
		chatStore.updateMessageContent(conversationId, messageId, newContent);

		// Delete all messages after this one
		chatStore.deleteMessagesFromIndex(conversationId, messageIndex + 1);

		// Trigger new assistant response
		await triggerAssistantResponse(conversationId);
	}

	/**
	 * Resend a user message as-is (clears subsequent messages)
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
	 * Regenerate an assistant response
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

	/**
	 * Second Opinion - Trigger model selector for a specific message
	 */
	function handleSecondOpinionTrigger(messageIndex: number, event?: MouseEvent) {
		// Position the dropdown near the trigger button
		if (event) {
			const button = event.currentTarget as HTMLElement;
			const rect = button.getBoundingClientRect();
			modelSelectorPosition = {
				top: rect.bottom + 8,
				left: rect.left + rect.width / 2
			};
		}

		pendingSecondOpinionIndex = messageIndex;
		showModelSelector = true;
	}

	/**
	 * Second Opinion - User selected a model
	 */
	async function handleSecondOpinionModelSelect(modelId: string) {
		showModelSelector = false;

		if (pendingSecondOpinionIndex === null) return;

		const conversationId = chatStore.activeConversation?.id;
		if (!conversationId) return;

		const sourceMessage = messages[pendingSecondOpinionIndex];
		if (!sourceMessage) return;

		// Open the second opinion panel
		chatStore.openSecondOpinion(sourceMessage.id, pendingSecondOpinionIndex, modelId);

		// Stream the second opinion
		await streamSecondOpinion(conversationId, pendingSecondOpinionIndex, modelId);

		pendingSecondOpinionIndex = null;
	}

	/**
	 * Second Opinion - Stream response from the API
	 */
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

							if (parsed.type === 'thinking_start') {
								// Thinking is starting
							} else if (parsed.type === 'thinking') {
								chatStore.appendToSecondOpinionThinking(parsed.content);
							} else if (parsed.type === 'thinking_end') {
								// Thinking complete
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
				// User cancelled - just close
				chatStore.closeSecondOpinion();
			} else {
				chatStore.setSecondOpinionError(
					err instanceof Error ? err.message : 'Unknown error'
				);
			}
		}
	}

	/**
	 * Second Opinion - Use this answer (inject as corrective user message)
	 * Uses extracted Key Guidance for concise, token-efficient injection
	 */
	function handleUseSecondOpinionAnswer() {
		const opinion = chatStore.secondOpinion;
		if (!opinion?.content) return;

		let correctionMessage: string;

		if (opinion.guidance) {
			// Use the extracted Key Guidance section (concise, actionable)
			correctionMessage = `Based on a second opinion, please adjust your approach:\n\n${opinion.guidance}\n\nPlease continue with this direction.`;
		} else {
			// Fallback to full content if no guidance section was found
			// (shouldn't happen often, but graceful degradation)
			correctionMessage = `I prefer this alternative approach:\n\n${opinion.content}\n\nLet's continue with this direction.`;
		}

		// Close the panel first
		chatStore.closeSecondOpinion();

		// Send as new user message (will trigger assistant response)
		handleSend(correctionMessage);
	}

	/**
	 * Second Opinion - Fork conversation with the second opinion model
	 */
	async function handleForkWithSecondOpinion() {
		const opinion = chatStore.secondOpinion;
		if (!opinion?.modelId || !opinion.content || opinion.sourceMessageIndex === undefined) return;

		const conversation = chatStore.activeConversation;
		if (!conversation) return;

		// Close the panel
		chatStore.closeSecondOpinion();

		// Create a new conversation with the second opinion model
		const newConversationId = chatStore.createConversation(opinion.modelId);

		// Copy messages up to (and including) the user message that prompted the source response
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

		// Add the second opinion response as the assistant message
		chatStore.addMessage(newConversationId, {
			role: 'assistant',
			content: opinion.content,
			thinking: opinion.thinking || undefined
		});

		// Update the conversation title based on the first user message
		const firstUserMessage = conversation.messages.find(m => m.role === 'user');
		if (firstUserMessage) {
			const title = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
			chatStore.updateConversationTitle(newConversationId, title);
		}

		toastStore.success(`Forked conversation with ${modelCapabilitiesStore.getDisplayName(opinion.modelId)}`);
	}

	/**
	 * Close model selector dropdown
	 */
	function closeModelSelector() {
		showModelSelector = false;
		pendingSecondOpinionIndex = null;
	}
</script>

<svelte:head>
	<title>StratAI</title>
</svelte:head>

<div class="h-screen flex flex-col overflow-hidden">
	<!-- Header -->
	<Header
		onModelChange={handleModelChange}
		onProviderChange={(provider) => chatStore.setAutoProvider(provider)}
		onSettingsClick={() => settingsOpen = true}
	/>

	<div class="flex-1 flex overflow-hidden">
		<!-- Sidebar -->
		<Sidebar onNewChat={handleNewChat} onShowBringToContext={handleShowBringToContext} />

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
					<div class="absolute inset-4 border-2 border-dashed border-primary-500/40 rounded-2xl"></div>
					<div class="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-surface-800/90 backdrop-blur-sm rounded-full border border-primary-500/30 shadow-lg">
						<span class="text-sm text-surface-300 flex items-center gap-2">
							<svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
							</svg>
							Drop file on the input below
						</span>
					</div>
				</div>
			{/if}
			<!-- Messages -->
			<ChatMessageList bind:containerRef={messagesContainer}>
				{#if messages.length === 0 && parentMessages.length === 0}
					<WelcomeScreen hasModel={!!selectedModel} onNewChat={handleNewChat} />
				{:else}
					<!-- Parent conversation messages (for continued conversations) -->
					{#if isContinuedConversation && parentMessages.length > 0}
						<div class="parent-messages opacity-70">
							{#each parentMessages as message (message.id)}
								<ChatMessage {message} showTimestamp={settingsStore.showTimestamps} />
							{/each}
						</div>
					{/if}

					<!-- Session separator for continued conversations -->
					{#if isContinuedConversation && refreshedAt}
						<SessionSeparator
							timestamp={refreshedAt}
							summaryPreview={continuationSummary}
						/>
					{/if}

					<!-- Current conversation messages -->
					{#each messages as message, index (message.id)}
						<ChatMessage
							{message}
							messageIndex={index}
							showTimestamp={settingsStore.showTimestamps}
							canEdit={!chatStore.isStreaming}
							onEditAndResend={handleEditAndResend}
							onResend={handleResend}
							onRegenerate={handleRegenerate}
							onSecondOpinion={(idx, e) => handleSecondOpinionTrigger(idx, e)}
						/>
					{/each}
					<!-- Summary section - shows at bottom when summary exists or is generating -->
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
			</ChatMessageList>

			<!-- Input -->
			<ChatInput
				onsend={handleSend}
				onstop={handleStop}
				onsummarize={handleGenerateSummary}
				oncompact={handleCompact}
				isGeneratingSummary={isGeneratingSummary}
				{isCompacting}
				disabled={!selectedModel}
			/>
		</main>

		<!-- Second Opinion Panel (fixed right) -->
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
</div>

<!-- Second Opinion Model Selector Dropdown -->
{#if showModelSelector}
	<div
		style="--dropdown-top: {modelSelectorPosition.top}px; --dropdown-left: {modelSelectorPosition.left}px;"
	>
		<SecondOpinionModelSelect
			currentModel={effectiveModel}
			onSelect={handleSecondOpinionModelSelect}
			onClose={closeModelSelector}
		/>
	</div>
{/if}

<!-- Settings Panel -->
<SettingsPanel open={settingsOpen} onclose={() => settingsOpen = false} />

<!-- Bring to Context Modal (Phase C) -->
{#if showBringToContextModal && bringToContextConversation}
	<BringToContextModal
		conversation={bringToContextConversation}
		currentContext={{ spaceId: null, areaId: null, taskId: null }}
		onOpenInOrigin={handleOpenInOrigin}
		onBringHere={handleBringHere}
		onClose={handleCloseBringToContext}
	/>
{/if}
