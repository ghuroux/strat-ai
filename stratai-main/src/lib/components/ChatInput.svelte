<script lang="ts">
	import { chatStore } from '$lib/stores/chat.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import SearchToggle from './chat/SearchToggle.svelte';
	import ThinkingToggle from './chat/ThinkingToggle.svelte';
	import SummarizeButton from './chat/SummarizeButton.svelte';
	import FileUploadButton from './chat/FileUploadButton.svelte';
	import FilePreview from './chat/FilePreview.svelte';
	import ContextIndicator from './chat/ContextIndicator.svelte';
	import type { FileAttachment } from '$lib/types/chat';
	import {
		calculateConversationTokens,
		getContextUsagePercent,
		getContextWindowSize
	} from '$lib/services/tokenEstimation';

	// Svelte 5: Use $props with callback props instead of createEventDispatcher
	let {
		disabled = false,
		onsend,
		onstop,
		onsummarize,
		oncompact,
		isGeneratingSummary = false,
		isCompacting = false
	}: {
		disabled?: boolean;
		onsend?: (message: string, attachments?: FileAttachment[]) => void;
		onstop?: () => void;
		onsummarize?: () => void;
		oncompact?: () => void;
		isGeneratingSummary?: boolean;
		isCompacting?: boolean;
	} = $props();

	// Pending file attachments
	let pendingAttachments = $state<FileAttachment[]>([]);

	let webSearchFeatureEnabled = $derived(settingsStore.webSearchFeatureEnabled);
	let searchEnabled = $derived(settingsStore.webSearchEnabled);
	let thinkingEnabled = $derived(settingsStore.extendedThinkingEnabled);

	// Show summarize button when conversation has 6+ messages
	let showSummarizeButton = $derived(chatStore.messages.length >= 6);
	let hasSummary = $derived(!!chatStore.activeConversation?.summary);

	// Context window usage calculation
	let currentModel = $derived(chatStore.activeConversation?.model || settingsStore.selectedModel);
	let contextWindowSize = $derived(getContextWindowSize(currentModel));
	let continuationSummary = $derived(chatStore.activeConversation?.continuationSummary || '');
	let estimatedTokens = $derived(
		calculateConversationTokens(chatStore.messages, settingsStore.systemPrompt, continuationSummary)
	);
	let contextUsagePercent = $derived(
		getContextUsagePercent(estimatedTokens, currentModel)
	);
	let showContextIndicator = $derived(
		chatStore.messages.length > 0 && contextUsagePercent >= settingsStore.contextThresholdPercent
	);

	// Svelte 5: Use $state for local reactive state
	let input = $state('');
	let textarea: HTMLTextAreaElement | undefined = $state();
	let isFocused = $state(false);

	let charCount = $derived(input.length);
	let hasAttachments = $derived(pendingAttachments.length > 0);
	let canSend = $derived((input.trim().length > 0 || hasAttachments) && !disabled && !chatStore.isStreaming);

	function handleSubmit() {
		if (!canSend) return;
		onsend?.(input.trim(), pendingAttachments.length > 0 ? [...pendingAttachments] : undefined);
		input = '';
		pendingAttachments = [];
		// Reset textarea height to single row
		if (textarea) {
			textarea.style.height = '';
		}
	}

	function handleFileUpload(file: FileAttachment) {
		pendingAttachments = [...pendingAttachments, file];
	}

	function removeAttachment(id: string) {
		pendingAttachments = pendingAttachments.filter(a => a.id !== id);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && settingsStore.sendOnEnter) {
			e.preventDefault();
			handleSubmit();
		}
	}

	function autoResize() {
		if (textarea) {
			textarea.style.height = 'auto';
			textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
		}
	}

	function handleStop() {
		onstop?.();
	}
</script>

<div class="border-t border-surface-800 p-4 bg-surface-900/80 backdrop-blur-xl">
	<div class="max-w-4xl mx-auto">
		<!-- Input container with gradient border on focus -->
		<div
			class="relative rounded-2xl transition-all duration-300
				   {isFocused ? 'gradient-border shadow-glow' : ''}"
		>
			<div class="flex items-end gap-3 bg-surface-800 rounded-2xl p-3 {isFocused ? '' : 'border border-surface-700'}">
				<!-- File upload button -->
				<FileUploadButton
					disabled={disabled || chatStore.isStreaming}
					onupload={handleFileUpload}
				/>

				<div class="flex-1 relative">
					<!-- File preview above textarea -->
					{#if hasAttachments}
						<FilePreview attachments={pendingAttachments} onremove={removeAttachment} />
					{/if}

					<textarea
						bind:this={textarea}
						bind:value={input}
						onkeydown={handleKeydown}
						oninput={autoResize}
						onfocus={() => (isFocused = true)}
						onblur={() => (isFocused = false)}
						placeholder={chatStore.isStreaming ? 'AI is responding...' : 'Type a message... (Shift+Enter for new line)'}
						rows="1"
						class="w-full bg-transparent text-surface-100 placeholder-surface-500
							   resize-none focus:outline-none leading-relaxed"
						disabled={disabled || chatStore.isStreaming}
					></textarea>
				</div>

				<!-- Actions -->
				<div class="flex items-center gap-2">
					<!-- Summarize Button (only shown when 6+ messages) -->
					{#if showSummarizeButton}
						<div class="relative group">
							<SummarizeButton
								disabled={disabled || chatStore.isStreaming}
								isGenerating={isGeneratingSummary}
								{hasSummary}
								onclick={() => onsummarize?.()}
							/>
						</div>
					{/if}

					<!-- Extended Thinking Toggle (for Claude models) -->
					<div class="relative group">
						<ThinkingToggle disabled={disabled || chatStore.isStreaming} />
					</div>

					<!-- Web Search Toggle (only shown when feature is enabled) -->
					{#if webSearchFeatureEnabled}
						<div class="relative group">
							<SearchToggle disabled={disabled || chatStore.isStreaming} />
						</div>
					{/if}

					{#if chatStore.isStreaming}
						<button
							type="button"
							onclick={handleStop}
							class="flex items-center justify-center w-10 h-10 rounded-xl
								   bg-red-600 hover:bg-red-700 text-white
								   transition-all duration-200 hover:scale-105"
							title="Stop generating"
						>
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<rect x="6" y="6" width="12" height="12" rx="2" />
							</svg>
						</button>
					{:else}
						<button
							type="button"
							onclick={handleSubmit}
							disabled={!canSend}
							class="flex items-center justify-center w-10 h-10 rounded-xl
								   transition-all duration-200
								   {canSend
									? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white hover:scale-105 shadow-glow-sm'
									: 'bg-surface-700 text-surface-500 cursor-not-allowed'}"
							title="Send message"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
								/>
							</svg>
						</button>
					{/if}
				</div>
			</div>
		</div>

		<!-- Footer hints -->
		<div class="flex items-center justify-between mt-2 px-1">
			<div class="flex items-center gap-4 text-xs text-surface-500">
				{#if !chatStore.isStreaming}
					<span>
						<kbd class="px-1.5 py-0.5 bg-surface-800 rounded text-surface-400">Enter</kbd> to send
					</span>
					{#if thinkingEnabled}
						<span class="flex items-center gap-1.5 text-amber-400">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
							</svg>
							Extended thinking
						</span>
					{/if}
					{#if webSearchFeatureEnabled && searchEnabled}
						<span class="flex items-center gap-1.5 text-primary-400">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
							</svg>
							Web search
						</span>
					{/if}
					{#if !thinkingEnabled && !(webSearchFeatureEnabled && searchEnabled)}
						<span>
							<kbd class="px-1.5 py-0.5 bg-surface-800 rounded text-surface-400">Shift+Enter</kbd> new line
						</span>
					{/if}
				{:else}
					<span class="flex items-center gap-2">
						<span class="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
						Generating response...
					</span>
				{/if}
			</div>

			<!-- Right side: Context indicator or char count -->
			<div class="flex items-center gap-3">
				{#if showContextIndicator}
					<ContextIndicator
						usagePercent={contextUsagePercent}
						{estimatedTokens}
						{contextWindowSize}
						{isCompacting}
						oncompact={() => oncompact?.()}
						disabled={disabled || chatStore.isStreaming}
					/>
				{/if}
				{#if charCount > 0}
					<span class="text-xs text-surface-500">{charCount} chars</span>
				{/if}
			</div>
		</div>
	</div>
</div>
