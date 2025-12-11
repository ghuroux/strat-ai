<script lang="ts">
	import { tick, onMount } from 'svelte';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import ChatInput from '$lib/components/ChatInput.svelte';
	import WelcomeScreen from '$lib/components/chat/WelcomeScreen.svelte';
	import ConversationSummary from '$lib/components/chat/ConversationSummary.svelte';
	import SessionSeparator from '$lib/components/chat/SessionSeparator.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { ChatCompletionChunk } from '$lib/types/api';
	import type { FileAttachment } from '$lib/types/chat';

	// Svelte 5: Use $state for local reactive state
	let selectedModel = $state(settingsStore.selectedModel || '');
	let messagesContainer: HTMLElement | undefined = $state();
	let settingsOpen = $state(false);
	let isGeneratingSummary = $state(false);
	let isCompacting = $state(false);

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
	let continuationSummary = $derived(chatStore.activeConversation?.continuationSummary || null);
	let refreshedAt = $derived(chatStore.activeConversation?.refreshedAt || null);

	// Get parent conversation messages for continued conversations
	let parentConversation = $derived(
		chatStore.activeConversation?.continuedFromId
			? chatStore.getConversation(chatStore.activeConversation.continuedFromId)
			: null
	);
	let parentMessages = $derived(parentConversation?.messages || []);

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
	 * Format attachments as context for the LLM
	 */
	function formatAttachmentsForLLM(attachments: FileAttachment[]): string {
		let context = 'The user has attached the following document(s):\n\n';
		for (const att of attachments) {
			context += `--- ${att.filename} ---\n${att.content}\n---\n\n`;
			if (att.truncated) {
				context += '(Note: This document was truncated due to length)\n\n';
			}
		}
		context += 'Please reference these documents when answering the user\'s question.\n';
		return context;
	}

	async function handleSend(content: string, attachments?: FileAttachment[]) {
		if (!selectedModel) {
			toastStore.error('Please select a model first');
			return;
		}

		// Ensure we have an active conversation
		let conversationId = chatStore.activeConversation?.id;
		if (!conversationId) {
			conversationId = chatStore.createConversation(selectedModel);
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
			// Build messages array for API (user message already added to store above)
			// Get fresh messages from the conversation (not the derived value which may be stale)
			const conv = chatStore.getConversation(conversationId);
			const conversationMessages = (conv?.messages || [])
				.filter((m) => !m.isStreaming && !m.error)
				.map((m) => ({
					role: m.role,
					content: m.content
				}));

			// Prepend system prompt if configured
			const systemPrompt = settingsStore.systemPrompt?.trim();

			// Build attachment context if present
			const attachmentContext = attachments && attachments.length > 0
				? formatAttachmentsForLLM(attachments)
				: null;

			const apiMessages = [
				...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
				...(attachmentContext ? [{ role: 'system' as const, content: attachmentContext }] : []),
				...conversationMessages
			];

			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: selectedModel,
					messages: apiMessages,
					temperature: settingsStore.temperature,
					max_tokens: settingsStore.maxTokens,
					searchEnabled: settingsStore.webSearchEnabled,
					// Extended thinking for Claude models
					thinkingEnabled: settingsStore.extendedThinkingEnabled,
					thinkingBudgetTokens: settingsStore.thinkingBudgetTokens
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
							if (parsed.type === 'status') {
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

	function handleModelChange(model: string) {
		selectedModel = model;
		settingsStore.setSelectedModel(model);
		// Update current conversation's model if exists
		if (chatStore.activeConversation) {
			chatStore.updateConversationModel(chatStore.activeConversation.id, model);
		}
	}

	async function handleGenerateSummary() {
		const conversation = chatStore.activeConversation;
		if (!conversation || !selectedModel) return;

		isGeneratingSummary = true;

		try {
			const response = await fetch('/api/summarize', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: selectedModel,
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
		if (!conversation || !selectedModel) return;

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

			// Create a new continued conversation
			const newConversationId = chatStore.createContinuedConversation(
				conversation.id,
				summary,
				selectedModel
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
						model: selectedModel,
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
</script>

<svelte:head>
	<title>StratHost Chat</title>
</svelte:head>

<div class="h-screen flex flex-col overflow-hidden">
	<!-- Header -->
	<Header bind:selectedModel onModelChange={handleModelChange} onSettingsClick={() => settingsOpen = true} />

	<div class="flex-1 flex overflow-hidden">
		<!-- Sidebar -->
		<Sidebar onNewChat={handleNewChat} />

		<!-- Main Content -->
		<main class="flex-1 flex flex-col overflow-hidden bg-surface-950">
			<!-- Messages -->
			<div bind:this={messagesContainer} class="flex-1 overflow-y-auto p-4 md:p-6">
				<div class="max-w-4xl mx-auto">
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
						{#each messages as message (message.id)}
							<ChatMessage {message} showTimestamp={settingsStore.showTimestamps} />
						{/each}
						<!-- Summary section - shows at bottom when summary exists or is generating -->
						{#if currentSummary || isGeneratingSummary}
							<ConversationSummary
								summary={currentSummary}
								isGenerating={isGeneratingSummary}
								onGenerate={handleGenerateSummary}
								onDismiss={handleDismissSummary}
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
				oncompact={handleCompact}
				isGeneratingSummary={isGeneratingSummary}
				{isCompacting}
				disabled={!selectedModel}
			/>
		</main>
	</div>
</div>

<!-- Settings Panel -->
<SettingsPanel open={settingsOpen} onclose={() => settingsOpen = false} />
