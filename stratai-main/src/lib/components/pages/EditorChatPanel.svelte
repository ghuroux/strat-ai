<script lang="ts">
	/**
	 * EditorChatPanel.svelte - Collapsible chat panel for page discussions
	 *
	 * Phase 7 acceptance criteria:
	 * - P7-PT-*: Panel toggle functionality (350px width, smooth animation)
	 * - P7-CF-*: Chat functionality (input, send, messages, persistence)
	 * - P7-DC-*: Document context (AI knows document content)
	 * - P7-AC-*: Apply changes flow (detect, apply, preview)
	 */

	import type { Page, TipTapContent, PageType } from '$lib/types/page';
	import type { Message } from '$lib/types/chat';
	import { extractTextFromContent, PAGE_TYPE_LABELS } from '$lib/types/page';
	import { slide, fly } from 'svelte/transition';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import MarkdownRenderer from '$lib/components/chat/MarkdownRenderer.svelte';

	// Props
	interface Props {
		page: Page;
		onApplyChange?: (original: string, replacement: string) => void;
		onOpenChange?: (isOpen: boolean) => void;
	}

	let { page, onApplyChange, onOpenChange }: Props = $props();

	// State
	let isOpen = $state(false);
	let conversationId = $state<string | null>(null);
	let messages = $state<Message[]>([]);
	let inputValue = $state('');
	let isLoading = $state(false);
	let isStreaming = $state(false);
	let error = $state<string | null>(null);
	let abortController = $state<AbortController | null>(null);
	let messagesContainer: HTMLDivElement | undefined = $state();

	// Suggested changes parsed from AI responses
	interface SuggestedChange {
		original: string;
		replacement: string;
		reason: string;
	}
	let suggestedChanges = $state<SuggestedChange[]>([]);

	// Derived
	let documentText = $derived(extractTextFromContent(page.content));
	let pageTypeLabel = $derived(PAGE_TYPE_LABELS[page.pageType] || 'Page');

	// Open panel and initialize/load conversation
	async function openPanel() {
		isOpen = true;
		onOpenChange?.(true);
		if (!conversationId) {
			await initializeDiscussion();
		}
	}

	// Close panel
	function closePanel() {
		isOpen = false;
		onOpenChange?.(false);
	}

	// Initialize or get existing discussion conversation
	async function initializeDiscussion() {
		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/pages/${page.id}/discussion`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error(`Failed to initialize discussion: ${response.status}`);
			}

			const data = await response.json();
			conversationId = data.conversationId;

			// If not a new conversation, load existing messages
			if (!data.isNew && conversationId) {
				await loadMessages();
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to initialize discussion';
			console.error('Failed to initialize discussion:', err);
		} finally {
			isLoading = false;
		}
	}

	// Load messages for existing conversation
	async function loadMessages() {
		if (!conversationId) return;

		try {
			const response = await fetch(`/api/conversations/${conversationId}`);
			if (response.ok) {
				const data = await response.json();
				if (data.messages) {
					messages = data.messages;
					scrollToBottom();
				}
			}
		} catch (err) {
			console.error('Failed to load messages:', err);
		}
	}

	// Send message to AI
	async function sendMessage() {
		const content = inputValue.trim();
		if (!content || isStreaming || !conversationId) return;

		// Clear input and reset state
		inputValue = '';
		error = null;
		suggestedChanges = [];

		// Add user message to local state
		const userMessage: Message = {
			id: crypto.randomUUID(),
			role: 'user',
			content,
			timestamp: Date.now()
		};
		messages = [...messages, userMessage];
		scrollToBottom();

		// Add placeholder assistant message
		const assistantMessage: Message = {
			id: crypto.randomUUID(),
			role: 'assistant',
			content: '',
			timestamp: Date.now()
		};
		messages = [...messages, assistantMessage];
		const assistantIndex = messages.length - 1;

		isStreaming = true;
		abortController = new AbortController();

		try {
			// Build system prompt with document context
			const systemPrompt = buildDocumentSystemPrompt();

			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: messages.slice(0, -1).map(m => ({
						role: m.role,
						content: m.content
					})),
					model: settingsStore.selectedModel,
					systemPrompt,
					conversationId,
					stream: true
				}),
				signal: abortController.signal
			});

			if (!response.ok) {
				throw new Error(`Chat request failed: ${response.status}`);
			}

			const reader = response.body?.getReader();
			if (!reader) throw new Error('No response body');

			const decoder = new TextDecoder();
			let buffer = '';
			let fullResponse = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6);
						if (data === '[DONE]') continue;

						try {
							const parsed = JSON.parse(data);
							if (parsed.content) {
								fullResponse += parsed.content;
								// Update the assistant message content
								messages = messages.map((m, i) =>
									i === assistantIndex
										? { ...m, content: fullResponse }
										: m
								);
								scrollToBottom();
							}
						} catch {
							// Ignore parse errors for malformed chunks
						}
					}
				}
			}

			// Parse for suggested changes after streaming completes
			suggestedChanges = parseChangesFromResponse(fullResponse);
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				// Streaming was cancelled
			} else {
				error = err instanceof Error ? err.message : 'Failed to send message';
				// Remove the empty assistant message on error
				messages = messages.filter((_, i) => i !== assistantIndex);
			}
		} finally {
			isStreaming = false;
			abortController = null;
		}
	}

	// Build system prompt with document context
	function buildDocumentSystemPrompt(): string {
		return `You are helping the user work on a page titled "${page.title}".
Page type: ${pageTypeLabel}

Current content:
---
${documentText}
---

Help the user review, edit, or improve this page.
When suggesting changes, be specific:
- Quote the exact text to change using "Original:" format
- Provide the new text using "Replacement:" format
- Explain why the change improves the document

For spelling/grammar checks, list all issues found with corrections in the format:
Original: "misspeled word"
Replacement: "misspelled word"
Reason: Spelling correction

When suggesting multiple changes, format each one clearly so they can be applied individually.`;
	}

	// Parse suggested changes from AI response
	function parseChangesFromResponse(response: string): SuggestedChange[] {
		const changes: SuggestedChange[] = [];

		// Helper to strip surrounding quotes from captured text
		function stripQuotes(s: string): string {
			return s.replace(/^["'""']+|["'""']+$/g, '').trim();
		}

		// Pattern 1: "Original: X" / "Replacement: Y" / "Reason: Z"
		// Use [^\n]+ to capture full line content (everything except newline)
		// This avoids truncation issues with non-greedy .+? matching
		const pattern1 = /\*{0,2}Original:?\*{0,2}\s*([^\n]+)\n+\s*\*{0,2}Replacement:?\*{0,2}\s*([^\n]+)(?:\n+\s*\*{0,2}Reason:?\*{0,2}\s*([^\n]+))?/gi;
		let match: RegExpExecArray | null;

		while ((match = pattern1.exec(response)) !== null) {
			const original = stripQuotes(match[1].trim());
			const replacement = stripQuotes(match[2].trim());
			const reason = match[3]?.trim() || 'Suggested improvement';

			// Only add if original and replacement are different (actual change)
			if (original && replacement && original !== replacement) {
				changes.push({ original, replacement, reason });
			}
		}

		// Pattern 2: "Change 'X' to 'Y'" or "change "X" to "Y""
		const pattern2 = /[Cc]hange\s+["'""']([^"'""']+)["'""']\s+to\s+["'""']([^"'""']+)["'""']/g;
		let match2: RegExpExecArray | null;
		while ((match2 = pattern2.exec(response)) !== null) {
			const original = match2[1].trim();
			const replacement = match2[2].trim();
			// Avoid duplicates and ensure actual change
			if (original && replacement && original !== replacement) {
				const existing = changes.find(c => c.original === original);
				if (!existing) {
					changes.push({
						original,
						replacement,
						reason: 'Suggested change'
					});
				}
			}
		}

		return changes;
	}

	// Apply a single change
	function applyChange(change: SuggestedChange) {
		onApplyChange?.(change.original, change.replacement);
		// Remove the applied change from suggestions
		suggestedChanges = suggestedChanges.filter(c => c !== change);
	}

	// Apply all changes
	function applyAllChanges() {
		for (const change of suggestedChanges) {
			onApplyChange?.(change.original, change.replacement);
		}
		suggestedChanges = [];
	}

	// Handle keyboard input
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}

	// Stop streaming
	function stopStreaming() {
		abortController?.abort();
		isStreaming = false;
	}

	// Scroll to bottom of messages
	function scrollToBottom() {
		setTimeout(() => {
			if (messagesContainer) {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}
		}, 10);
	}
</script>

<!-- Toggle button (visible when panel is closed) -->
{#if !isOpen}
	<button
		type="button"
		class="chat-toggle-btn"
		onclick={openPanel}
		title="Chat about this page"
	>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
		</svg>
		<span>Chat about this page</span>
	</button>
{/if}

<!-- Chat Panel -->
{#if isOpen}
	<div class="chat-panel" transition:slide={{ duration: 200, axis: 'x' }}>
		<!-- Header -->
		<div class="chat-panel-header">
			<h3>Discussion</h3>
			<button
				type="button"
				class="close-btn"
				onclick={closePanel}
				title="Close"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 6L6 18" />
					<path d="M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Messages -->
		<div class="chat-panel-messages" bind:this={messagesContainer}>
			{#if isLoading}
				<div class="chat-loading">
					<div class="loading-spinner"></div>
					<span>Loading discussion...</span>
				</div>
			{:else if messages.length === 0}
				<div class="chat-empty">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
					</svg>
					<p>Ask questions about this page or request edits</p>
					<div class="quick-prompts">
						<button onclick={() => inputValue = 'Review this page for spelling and grammar errors'}>
							Check spelling
						</button>
						<button onclick={() => inputValue = 'Make this content more professional and formal'}>
							Make formal
						</button>
						<button onclick={() => inputValue = 'Summarize the key points'}>
							Summarize
						</button>
					</div>
				</div>
			{:else}
				{#each messages as message, index (message.id)}
					<div class="chat-message {message.role}">
						<div class="message-content">
							{#if message.role === 'assistant'}
								<MarkdownRenderer
									content={message.content || ''}
									isStreaming={isStreaming && index === messages.length - 1}
								/>
							{:else}
								{message.content || '...'}
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Suggested Changes -->
		{#if suggestedChanges.length > 0}
			<div class="suggested-changes" transition:fly={{ y: 20, duration: 200 }}>
				<div class="changes-header">
					<span>Suggested Changes ({suggestedChanges.length})</span>
					<button
						type="button"
						class="apply-all-btn"
						onclick={applyAllChanges}
					>
						Apply All
					</button>
				</div>
				<div class="changes-list">
					{#each suggestedChanges as change}
						<div class="change-item">
							<div class="change-preview">
								<span class="original">{change.original}</span>
								<span class="arrow">→</span>
								<span class="replacement">{change.replacement}</span>
							</div>
							<div class="change-reason">{change.reason}</div>
							<button
								type="button"
								class="apply-btn"
								onclick={() => applyChange(change)}
							>
								Apply
							</button>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Error message -->
		{#if error}
			<div class="chat-error">
				{error}
			</div>
		{/if}

		<!-- Input -->
		<div class="chat-panel-input">
			<textarea
				bind:value={inputValue}
				placeholder="Ask about this page..."
				disabled={isStreaming}
				onkeydown={handleKeydown}
				rows="2"
			></textarea>
			<div class="input-actions">
				{#if isStreaming}
					<button
						type="button"
						class="stop-btn"
						onclick={stopStreaming}
					>
						Stop
					</button>
				{:else}
					<button
						type="button"
						class="send-btn"
						onclick={sendMessage}
						disabled={!inputValue.trim()}
						title="Send message"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<line x1="22" y1="2" x2="11" y2="13" />
							<polygon points="22 2 15 22 11 13 2 9 22 2" />
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Toggle button */
	.chat-toggle-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: var(--chat-toggle-bg, rgba(59, 130, 246, 0.1));
		border: 1px solid var(--chat-toggle-border, rgba(59, 130, 246, 0.2));
		border-radius: 0.5rem;
		color: var(--chat-toggle-text, #60a5fa);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.chat-toggle-btn:hover {
		background: var(--chat-toggle-hover-bg, rgba(59, 130, 246, 0.15));
		border-color: var(--chat-toggle-hover-border, rgba(59, 130, 246, 0.3));
	}

	.chat-toggle-btn svg {
		width: 1rem;
		height: 1rem;
	}

	/* Chat Panel */
	.chat-panel {
		position: fixed;
		right: 0;
		top: 0;
		bottom: 0;
		width: 350px;
		background: var(--chat-panel-bg, #1a1a1a);
		border-left: 1px solid var(--chat-panel-border, #333);
		display: flex;
		flex-direction: column;
		z-index: 100;
	}

	.chat-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid var(--chat-panel-border, #333);
	}

	.chat-panel-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--chat-panel-title, #fff);
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		color: var(--chat-panel-close, rgba(255, 255, 255, 0.5));
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		background: var(--chat-panel-close-hover-bg, rgba(255, 255, 255, 0.1));
		color: var(--chat-panel-close-hover, #fff);
	}

	.close-btn svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	/* Messages area */
	.chat-panel-messages {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.chat-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2rem;
		color: var(--chat-loading-text, rgba(255, 255, 255, 0.5));
		font-size: 0.875rem;
	}

	.loading-spinner {
		width: 1.5rem;
		height: 1.5rem;
		border: 2px solid var(--chat-loading-spinner-bg, rgba(255, 255, 255, 0.1));
		border-top-color: var(--chat-loading-spinner, #60a5fa);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.chat-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2rem;
		text-align: center;
	}

	.chat-empty svg {
		width: 2.5rem;
		height: 2.5rem;
		color: var(--chat-empty-icon, rgba(255, 255, 255, 0.2));
	}

	.chat-empty p {
		margin: 0;
		color: var(--chat-empty-text, rgba(255, 255, 255, 0.5));
		font-size: 0.875rem;
	}

	.quick-prompts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.5rem;
		justify-content: center;
	}

	.quick-prompts button {
		padding: 0.375rem 0.75rem;
		background: var(--quick-prompt-bg, rgba(255, 255, 255, 0.05));
		border: 1px solid var(--quick-prompt-border, rgba(255, 255, 255, 0.1));
		border-radius: 1rem;
		color: var(--quick-prompt-text, rgba(255, 255, 255, 0.7));
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.quick-prompts button:hover {
		background: var(--quick-prompt-hover-bg, rgba(255, 255, 255, 0.1));
		border-color: var(--quick-prompt-hover-border, rgba(255, 255, 255, 0.2));
	}

	/* Messages */
	.chat-message {
		margin-bottom: 1rem;
	}

	.chat-message.user {
		text-align: right;
	}

	.chat-message.user .message-content {
		background: var(--chat-user-bg, #3b82f6);
		color: #fff;
		border-radius: 1rem 1rem 0.25rem 1rem;
		display: inline-block;
		text-align: left;
	}

	.chat-message.assistant .message-content {
		background: var(--chat-assistant-bg, rgba(255, 255, 255, 0.05));
		color: var(--chat-assistant-text, rgba(255, 255, 255, 0.9));
		border-radius: 1rem 1rem 1rem 0.25rem;
	}

	.message-content {
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		line-height: 1.5;
		word-wrap: break-word;
		max-width: 85%;
	}

	/* User messages keep pre-wrap for manual line breaks */
	.chat-message.user .message-content {
		white-space: pre-wrap;
	}

	/* Markdown content overrides for chat panel context */
	.chat-message.assistant .message-content :global(.markdown-content) {
		font-size: 0.875rem;
	}

	.chat-message.assistant .message-content :global(.markdown-content h1),
	.chat-message.assistant .message-content :global(.markdown-content h2),
	.chat-message.assistant .message-content :global(.markdown-content h3) {
		margin-top: 0.75em;
		margin-bottom: 0.375em;
	}

	.chat-message.assistant .message-content :global(.markdown-content h1) {
		font-size: 1.1em;
	}

	.chat-message.assistant .message-content :global(.markdown-content h2) {
		font-size: 1em;
	}

	.chat-message.assistant .message-content :global(.markdown-content h3) {
		font-size: 0.95em;
	}

	.chat-message.assistant .message-content :global(.markdown-content p) {
		margin-bottom: 0.5em;
	}

	.chat-message.assistant .message-content :global(.markdown-content ul),
	.chat-message.assistant .message-content :global(.markdown-content ol) {
		margin: 0.375em 0;
		padding-left: 1.25em;
	}

	.chat-message.assistant .message-content :global(.markdown-content li) {
		margin: 0.125em 0;
	}

	.chat-message.assistant .message-content :global(.markdown-content .code-block-wrapper) {
		margin: 0.5em 0;
	}

	.chat-message.assistant .message-content :global(.markdown-content pre) {
		font-size: 0.8em;
	}

	/* Ensure code blocks don't overflow */
	.chat-message.assistant .message-content :global(.markdown-content .code-block-wrapper),
	.chat-message.assistant .message-content :global(.markdown-content pre) {
		max-width: 100%;
		overflow-x: auto;
	}

	/* Suggested changes */
	.suggested-changes {
		border-top: 1px solid var(--chat-panel-border, #333);
		padding: 0.75rem;
		background: var(--changes-bg, rgba(59, 130, 246, 0.05));
	}

	.changes-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--changes-header-text, rgba(255, 255, 255, 0.7));
	}

	.apply-all-btn {
		padding: 0.25rem 0.5rem;
		background: var(--apply-all-bg, rgba(59, 130, 246, 0.2));
		border: none;
		border-radius: 0.25rem;
		color: var(--apply-all-text, #60a5fa);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.apply-all-btn:hover {
		background: var(--apply-all-hover-bg, rgba(59, 130, 246, 0.3));
	}

	.changes-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 150px;
		overflow-y: auto;
	}

	.change-item {
		padding: 0.5rem;
		background: var(--change-item-bg, rgba(255, 255, 255, 0.03));
		border-radius: 0.375rem;
		font-size: 0.75rem;
	}

	.change-preview {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: wrap;
	}

	.change-preview .original {
		color: var(--change-original, #ef4444);
		text-decoration: line-through;
	}

	.change-preview .arrow {
		color: var(--change-arrow, rgba(255, 255, 255, 0.3));
	}

	.change-preview .replacement {
		color: var(--change-replacement, #22c55e);
	}

	.change-reason {
		margin-top: 0.25rem;
		color: var(--change-reason-text, rgba(255, 255, 255, 0.5));
		font-size: 0.6875rem;
	}

	.apply-btn {
		margin-top: 0.375rem;
		padding: 0.25rem 0.5rem;
		background: var(--apply-btn-bg, rgba(34, 197, 94, 0.1));
		border: 1px solid var(--apply-btn-border, rgba(34, 197, 94, 0.3));
		border-radius: 0.25rem;
		color: var(--apply-btn-text, #22c55e);
		font-size: 0.6875rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.apply-btn:hover {
		background: var(--apply-btn-hover-bg, rgba(34, 197, 94, 0.2));
	}

	/* Error */
	.chat-error {
		padding: 0.75rem 1rem;
		background: var(--chat-error-bg, rgba(239, 68, 68, 0.1));
		border-top: 1px solid var(--chat-error-border, rgba(239, 68, 68, 0.2));
		color: var(--chat-error-text, #f87171);
		font-size: 0.8125rem;
	}

	/* Input area */
	.chat-panel-input {
		padding: 1rem;
		border-top: 1px solid var(--chat-panel-border, #333);
		background: var(--chat-input-area-bg, rgba(0, 0, 0, 0.2));
	}

	.chat-panel-input textarea {
		width: 100%;
		padding: 0.75rem;
		background: var(--chat-input-bg, rgba(255, 255, 255, 0.05));
		border: 1px solid var(--chat-input-border, rgba(255, 255, 255, 0.1));
		border-radius: 0.5rem;
		color: var(--chat-input-text, #fff);
		font-size: 0.875rem;
		font-family: inherit;
		resize: none;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.chat-panel-input textarea:focus {
		border-color: var(--chat-input-focus-border, #3b82f6);
	}

	.chat-panel-input textarea::placeholder {
		color: var(--chat-input-placeholder, rgba(255, 255, 255, 0.4));
	}

	.input-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.5rem;
	}

	.send-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		background: var(--send-btn-bg, #3b82f6);
		border: none;
		border-radius: 0.5rem;
		color: #fff;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.send-btn:hover:not(:disabled) {
		background: var(--send-btn-hover-bg, #2563eb);
	}

	.send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.send-btn svg {
		width: 1rem;
		height: 1rem;
	}

	.stop-btn {
		padding: 0.5rem 1rem;
		background: var(--stop-btn-bg, rgba(239, 68, 68, 0.1));
		border: 1px solid var(--stop-btn-border, rgba(239, 68, 68, 0.3));
		border-radius: 0.5rem;
		color: var(--stop-btn-text, #ef4444);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.stop-btn:hover {
		background: var(--stop-btn-hover-bg, rgba(239, 68, 68, 0.2));
	}

	/* Light mode overrides */
	:global(.light) .chat-panel,
	:global([data-theme='light']) .chat-panel {
		--chat-panel-bg: #ffffff;
		--chat-panel-border: #e5e7eb;
		--chat-panel-title: #111827;
		--chat-panel-close: rgba(0, 0, 0, 0.4);
		--chat-panel-close-hover-bg: rgba(0, 0, 0, 0.05);
		--chat-panel-close-hover: #111827;
		--chat-loading-text: rgba(0, 0, 0, 0.5);
		--chat-loading-spinner-bg: rgba(0, 0, 0, 0.1);
		--chat-loading-spinner: #3b82f6;
		--chat-empty-icon: rgba(0, 0, 0, 0.2);
		--chat-empty-text: rgba(0, 0, 0, 0.5);
		--quick-prompt-bg: rgba(0, 0, 0, 0.03);
		--quick-prompt-border: rgba(0, 0, 0, 0.1);
		--quick-prompt-text: rgba(0, 0, 0, 0.6);
		--quick-prompt-hover-bg: rgba(0, 0, 0, 0.06);
		--quick-prompt-hover-border: rgba(0, 0, 0, 0.15);
		--chat-assistant-bg: #f3f4f6;
		--chat-assistant-text: #111827;
		--changes-bg: rgba(59, 130, 246, 0.05);
		--changes-header-text: rgba(0, 0, 0, 0.7);
		--change-item-bg: rgba(0, 0, 0, 0.02);
		--change-arrow: rgba(0, 0, 0, 0.3);
		--change-reason-text: rgba(0, 0, 0, 0.5);
		--chat-input-area-bg: #f9fafb;
		--chat-input-bg: #ffffff;
		--chat-input-border: #e5e7eb;
		--chat-input-text: #111827;
		--chat-input-placeholder: rgba(0, 0, 0, 0.4);
	}

	:global(.light) .chat-toggle-btn,
	:global([data-theme='light']) .chat-toggle-btn {
		--chat-toggle-bg: rgba(59, 130, 246, 0.08);
		--chat-toggle-border: rgba(59, 130, 246, 0.15);
		--chat-toggle-text: #2563eb;
		--chat-toggle-hover-bg: rgba(59, 130, 246, 0.12);
		--chat-toggle-hover-border: rgba(59, 130, 246, 0.25);
	}
</style>
