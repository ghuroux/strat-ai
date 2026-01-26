<script lang="ts">
	import { fly, fade, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Message } from '$lib/types/chat';
	import AIResponseIndicator from './chat/AIResponseIndicator.svelte';
	import MarkdownRenderer from './chat/MarkdownRenderer.svelte';
	import AttachmentDisplay from './chat/AttachmentDisplay.svelte';
	import DownloadButton from './chat/DownloadButton.svelte';
	import ThinkingDisplay from './chat/ThinkingDisplay.svelte';
	import CodeBlockDownloader from './chat/CodeBlockDownloader.svelte';
	import { ResponseContextBadge } from './chat/context-transparency';
	import { extractCodeBlocks } from '$lib/utils/codeBlocks';
	import { ProductComparison, CheckoutPreview, OrderConfirmation } from './commerce';
	import type { CommerceProductWithBadges } from '$lib/types/commerce';

	// Svelte 5: Use $props instead of export let
	let {
		message,
		messageIndex,
		showTimestamp = true,
		canEdit = true,
		onEditAndResend,
		onResend,
		onRegenerate,
		onSecondOpinion,
		onCreatePage,
		onBuyProduct
	}: {
		message: Message;
		messageIndex?: number;
		showTimestamp?: boolean;
		canEdit?: boolean;
		onEditAndResend?: (messageId: string, newContent: string) => void;
		onResend?: (messageId: string) => void;
		onRegenerate?: (messageId: string) => void;
		onSecondOpinion?: (messageIndex: number, event?: MouseEvent) => void;
		onCreatePage?: (messageId: string) => void;
		onBuyProduct?: (product: CommerceProductWithBadges) => void;
	} = $props();

	// Svelte 5: Use $derived for computed values
	// Message objects are now immutable (new references on each update), so these work correctly
	let isUser = $derived(message.role === 'user');
	let isStreamingEmpty = $derived(message.isStreaming && !message.content);
	let isStreaming = $derived(message.isStreaming && !!message.content);
	let isSearching = $derived(message.searchStatus === 'searching');
	let isReadingDocument = $derived(message.searchStatus === 'reading_document');
	let isBrowsing = $derived(message.searchStatus === 'browsing');
	let isLoadingContext = $derived(message.contextStatus === 'loading');
	let hasSources = $derived(message.sources && message.sources.length > 0);
	let hasAttachments = $derived(message.attachments && message.attachments.length > 0);
	let displayContent = $derived(message.content);
	// Extended thinking
	let hasThinking = $derived(!!message.thinking);
	let isThinking = $derived(!!message.isThinking);
	let hasContent = $derived(!!message.content);
	// Commerce content
	let hasCommerce = $derived(!!message.commerce);

	// Context transparency - show badge for completed assistant messages with context
	let hasUsedContext = $derived(
		!isUser &&
		!message.isStreaming &&
		message.usedContext &&
		(message.usedContext.documents.length > 0 ||
		 message.usedContext.notes.included ||
		 message.usedContext.tasks.length > 0)
	);

	// Code blocks detection for download feature
	let hasCodeBlocks = $derived(
		displayContent ? extractCodeBlocks(displayContent).length > 0 : false
	);

	// Unified AI state for the indicator
	type AIState = 'processing' | 'reasoning' | 'searching' | 'reading_document' | 'browsing' | 'generating' | 'loading_context' | 'complete';
	let aiState = $derived<AIState>(
		!message.isStreaming && !isThinking && !isLoadingContext ? 'complete' :
		isLoadingContext ? 'loading_context' :
		isSearching ? 'searching' :
		isReadingDocument ? 'reading_document' :
		isBrowsing ? 'browsing' :
		isThinking ? 'reasoning' :
		isStreaming ? 'generating' :
		isStreamingEmpty ? 'processing' :
		'complete'
	);

	// Context info for the loading_context state
	let contextInfo = $derived(message.usedContext ? {
		documents: message.usedContext.documents.map(d => ({ filename: d.filename })),
		notes: { included: message.usedContext.notes.included },
		tasks: message.usedContext.tasks.map(t => ({ title: t.title }))
	} : undefined);

	// Show the unified indicator (not during extended thinking - that has its own display)
	let showUnifiedIndicator = $derived(
		(aiState === 'processing' || aiState === 'searching' || aiState === 'reading_document' || aiState === 'browsing' || aiState === 'loading_context') && !isThinking && !hasThinking
	);

	// Track if this is the first content after thinking (for animation)
	let showContentReveal = $state(false);
	let wasThinking = $state(false);

	$effect(() => {
		if (hasThinking && !isThinking && hasContent && wasThinking) {
			// Thinking just completed and content is appearing - trigger reveal animation
			showContentReveal = true;
			setTimeout(() => {
				showContentReveal = false;
			}, 600);
		}
		wasThinking = isThinking;
	});

	let copied = $state(false);
	let showCopyButton = $state(false);
	let sourcesExpanded = $state(false);

	// Edit mode state
	let isEditing = $state(false);
	let editContent = $state('');

	function startEditing() {
		editContent = message.content;
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
		editContent = '';
	}

	function saveAndResend() {
		if (editContent.trim() && onEditAndResend) {
			onEditAndResend(message.id, editContent.trim());
			isEditing = false;
			editContent = '';
		}
	}

	function handleResend() {
		if (onResend) {
			onResend(message.id);
		}
	}

	function handleRegenerate() {
		if (onRegenerate) {
			onRegenerate(message.id);
		}
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			cancelEditing();
		} else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			saveAndResend();
		}
	}

	// Sources display logic
	const INITIAL_SOURCES_COUNT = 3;
	let visibleSources = $derived(
		message.sources
			? sourcesExpanded
				? message.sources
				: message.sources.slice(0, INITIAL_SOURCES_COUNT)
			: []
	);
	let hasMoreSources = $derived(
		message.sources ? message.sources.length > INITIAL_SOURCES_COUNT : false
	);
	let remainingSourcesCount = $derived(
		message.sources ? message.sources.length - INITIAL_SOURCES_COUNT : 0
	);

	function formatTime(timestamp: number): string {
		return new Date(timestamp).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getDomain(url: string): string {
		try {
			return new URL(url).hostname;
		} catch {
			return '';
		}
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(displayContent);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			console.error('Failed to copy');
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	id={messageIndex !== undefined ? `message-${messageIndex}` : undefined}
	class="flex gap-3 mb-6 group {isUser ? 'flex-row-reverse' : 'flex-row'}"
	in:fly={{ y: 20, duration: 300, delay: 50 }}
	onmouseenter={() => (showCopyButton = true)}
	onmouseleave={() => (showCopyButton = false)}
	role="article"
	aria-label="{isUser ? 'Your message' : 'AI response'}"
>
	<!-- Avatar -->
	<div class="flex-shrink-0">
		{#if isUser}
			<div class="avatar-user">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
					/>
				</svg>
			</div>
		{:else}
			<div class="avatar-assistant">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
					/>
				</svg>
			</div>
		{/if}
	</div>

	<!-- Message Content -->
	<div class="message-container {isUser ? 'items-end' : 'items-start'} flex flex-col">
		<!-- Role label -->
		<span class="text-xs font-medium text-surface-500 mb-1 {isUser ? 'text-right' : 'text-left'}">
			{isUser ? 'You' : 'StratAI'}
		</span>

		<!-- Message bubble -->
		<div class="relative {isUser ? 'message-user' : 'message-assistant'}">
			{#if message.error}
				<div class="flex items-start gap-2 text-red-300">
					<svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<div>
						<span class="font-medium">Error:</span>
						{message.error}
					</div>
				</div>
			{:else}
				{#if isUser}
					<!-- User attachments display -->
					{#if hasAttachments && message.attachments}
						<AttachmentDisplay attachments={message.attachments} />
					{/if}

					{#if isEditing}
						<!-- Inline edit mode -->
						<div class="edit-mode w-full">
							<textarea
								bind:value={editContent}
								onkeydown={handleEditKeydown}
								class="w-full min-h-[80px] p-3 bg-surface-800 border border-surface-600 rounded-lg text-white resize-y focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all"
								placeholder="Edit your message..."
							></textarea>
							<div class="flex items-center justify-between mt-2 gap-2">
								<span class="text-xs text-surface-500">
									{#if navigator?.platform?.includes('Mac')}
										⌘+Enter to save
									{:else}
										Ctrl+Enter to save
									{/if}
								</span>
								<div class="flex gap-2">
									<button
										type="button"
										onclick={cancelEditing}
										class="px-3 py-1.5 text-sm rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-white transition-all"
									>
										Cancel
									</button>
									<button
										type="button"
										onclick={saveAndResend}
										disabled={!editContent.trim()}
										class="px-3 py-1.5 text-sm rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
									>
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
										</svg>
										Save & Resend
									</button>
								</div>
							</div>
						</div>
					{:else}
						<div class="whitespace-pre-wrap break-words leading-relaxed">
							{displayContent}
						</div>
					{/if}
				{:else}
					<!-- Unified AI Response Indicator (processing/searching/loading_context states) -->
					{#if showUnifiedIndicator}
						<AIResponseIndicator
							state={aiState}
							searchQuery={message.searchQuery}
							sources={message.sources || []}
							{contextInfo}
						/>
					{/if}

					<!-- Extended thinking display (Claude models) -->
					{#if hasThinking || isThinking}
						<ThinkingDisplay thinking={message.thinking || ''} {isThinking} {hasContent} />
					{/if}

					<!-- Search indicator when also showing thinking -->
					{#if isSearching && (hasThinking || isThinking)}
						<div class="mt-3">
							<AIResponseIndicator
								state="searching"
								searchQuery={message.searchQuery}
								sources={message.sources || []}
							/>
						</div>
					{/if}

					<!-- Main response content with reveal animation -->
					{#if displayContent}
						<div
							class="response-content {showContentReveal ? 'content-reveal' : ''}"
							class:mt-3={hasThinking && !isThinking}
							class:mt-2={isSearching && !hasThinking}
						>
							<MarkdownRenderer content={displayContent} {isStreaming} />
						</div>

						<!-- Code block downloads (only when streaming is complete) -->
						{#if hasCodeBlocks && !isStreaming && !isStreamingEmpty}
							<CodeBlockDownloader content={displayContent} />
						{/if}
					{/if}

					<!-- Commerce content (product search results, checkout, etc.) -->
					{#if hasCommerce && message.commerce}
						<div class="commerce-content mt-4" in:fly={{ y: 20, duration: 300 }}>
							{#if message.commerce.type === 'search_results' && message.commerce.searchResults}
								<ProductComparison
									query={message.commerce.searchResults.query}
									products={message.commerce.searchResults.products}
									onAddToCart={onBuyProduct}
								/>
							{:else if message.commerce.type === 'checkout_preview' && message.commerce.checkoutPreview}
								<CheckoutPreview preview={message.commerce.checkoutPreview} />
							{:else if message.commerce.type === 'order_confirmation' && message.commerce.orderConfirmation}
								<OrderConfirmation order={message.commerce.orderConfirmation} />
							{/if}
						</div>
					{/if}
				{/if}

				<!-- Sources section -->
				{#if hasSources && message.sources}
					<div class="sources-section mt-4 pt-3 border-t border-surface-700">
						<div class="flex items-center gap-2 text-sm text-surface-400 mb-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
							</svg>
							<span class="font-medium">Sources</span>
							<span class="text-surface-500 text-xs">({message.sources.length})</span>
						</div>
						<ul class="sources-list space-y-2">
							{#each visibleSources as source, i (source.url)}
								{@const domain = getDomain(source.url)}
								<li
									class="source-item"
									in:fly={{ y: 10, duration: 200, delay: sourcesExpanded ? i * 30 : 0 }}
								>
									<a
										href={source.url}
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center gap-2.5 text-sm text-primary-400 hover:text-primary-300 transition-colors group"
									>
										<!-- Favicon -->
										<span class="relative flex-shrink-0 w-4 h-4 rounded overflow-hidden bg-surface-700 flex items-center justify-center">
											{#if domain}
												<img
													src="https://www.google.com/s2/favicons?domain={domain}&sz=32"
													alt=""
													class="w-4 h-4 relative z-10"
													loading="lazy"
													onload={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '1'; }}
													style="opacity: 0; transition: opacity 0.2s"
												/>
											{/if}
											<!-- Fallback globe icon (shown when no domain or as background) -->
											<svg class="w-3 h-3 text-surface-500 absolute z-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
											</svg>
										</span>
										<span class="truncate flex-1">{source.title}</span>
										<svg class="w-3.5 h-3.5 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
										</svg>
									</a>
								</li>
							{/each}
						</ul>

						<!-- See more/less button -->
						{#if hasMoreSources}
							<button
								type="button"
								class="sources-toggle mt-2 flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-300 transition-colors"
								onclick={() => sourcesExpanded = !sourcesExpanded}
							>
								<svg
									class="w-3.5 h-3.5 transition-transform duration-200"
									class:rotate-180={sourcesExpanded}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
								{#if sourcesExpanded}
									<span>Show less</span>
								{:else}
									<span>See {remainingSourcesCount} more source{remainingSourcesCount === 1 ? '' : 's'}</span>
								{/if}
							</button>
						{/if}
					</div>
				{/if}
			{/if}

			<!-- Action buttons -->
			{#if !isStreamingEmpty && !message.error && displayContent && showCopyButton && !isEditing}
				<div
					class="absolute -bottom-2 {isUser ? '-left-8' : '-right-8'} flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
					transition:fade={{ duration: 150 }}
				>
					{#if isUser}
						<!-- User message actions: Edit, Resend, Copy -->
						{#if canEdit && onEditAndResend}
							<button
								type="button"
								class="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-400 hover:text-white transition-all"
								onclick={startEditing}
								title="Edit message"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
								</svg>
							</button>
						{/if}
						{#if canEdit && onResend}
							<button
								type="button"
								class="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-400 hover:text-white transition-all"
								onclick={handleResend}
								title="Resend message"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
								</svg>
							</button>
						{/if}
					{:else}
						<!-- Assistant message actions: Regenerate, Download -->
						{#if canEdit && onRegenerate}
							<button
								type="button"
								class="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-400 hover:text-white transition-all"
								onclick={handleRegenerate}
								title="Regenerate response"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
							</button>
						{/if}
						{#if onSecondOpinion && messageIndex !== undefined}
							<button
								type="button"
								class="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-400 hover:text-white transition-all"
								onclick={(e) => onSecondOpinion(messageIndex, e)}
								title="Get second opinion"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
										d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
								</svg>
							</button>
						{/if}
						<DownloadButton content={displayContent} messageId={message.id} />
						{#if onCreatePage}
							<button
								type="button"
								class="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-400 hover:text-white transition-all"
								onclick={() => onCreatePage(message.id)}
								title="Create page from response"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
										d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
								</svg>
							</button>
						{/if}
					{/if}

					<!-- Copy button (for all messages) -->
					<button
						type="button"
						class="p-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-400 hover:text-white transition-all"
						onclick={copyToClipboard}
						title="Copy message"
					>
						{#if copied}
							<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
								/>
							</svg>
						{/if}
					</button>
				</div>
			{/if}
		</div>

		<!-- Context transparency badge (assistant messages only) -->
		{#if hasUsedContext && message.usedContext}
			<ResponseContextBadge usedContext={message.usedContext} />
		{/if}

		<!-- Timestamp -->
		{#if showTimestamp && !isStreamingEmpty}
			<span class="text-xs text-surface-600 mt-1.5 {isUser ? 'text-right' : 'text-left'}">
				{formatTime(message.timestamp)}
			</span>
		{/if}
	</div>
</div>

<style>
	/* Content reveal animation after thinking completes */
	.response-content {
		animation: fadeSlideIn 0.4s ease-out forwards;
	}

	.content-reveal {
		animation: contentReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	@keyframes fadeSlideIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes contentReveal {
		0% {
			opacity: 0;
			transform: translateY(12px);
			filter: blur(4px);
		}
		50% {
			filter: blur(0px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
			filter: blur(0px);
		}
	}

	/* Message highlight animation for summary anchor navigation */
	:global(.message-highlight) {
		animation: messageHighlight 2s ease-out forwards;
	}

	@keyframes messageHighlight {
		0% {
			background-color: rgba(var(--color-primary-500), 0.3);
			box-shadow: 0 0 0 4px rgba(var(--color-primary-500), 0.2);
			border-radius: 0.75rem;
		}
		70% {
			background-color: rgba(var(--color-primary-500), 0.15);
			box-shadow: 0 0 0 4px rgba(var(--color-primary-500), 0.1);
		}
		100% {
			background-color: transparent;
			box-shadow: none;
		}
	}
</style>
