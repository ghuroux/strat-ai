<script lang="ts">
	import { fly, fade, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Message } from '$lib/types/chat';
	import AIStatusIndicator from './chat/AIStatusIndicator.svelte';
	import MarkdownRenderer from './chat/MarkdownRenderer.svelte';
	import AttachmentDisplay from './chat/AttachmentDisplay.svelte';
	import DownloadButton from './chat/DownloadButton.svelte';
	import ThinkingDisplay from './chat/ThinkingDisplay.svelte';

	// Svelte 5: Use $props instead of export let
	let { message, showTimestamp = true }: { message: Message; showTimestamp?: boolean } = $props();

	// Svelte 5: Use $derived for computed values
	// Message objects are now immutable (new references on each update), so these work correctly
	let isUser = $derived(message.role === 'user');
	let isStreamingEmpty = $derived(message.isStreaming && !message.content);
	let isStreaming = $derived(message.isStreaming && !!message.content);
	let isSearching = $derived(message.searchStatus === 'searching');
	let hasSources = $derived(message.sources && message.sources.length > 0);
	let hasAttachments = $derived(message.attachments && message.attachments.length > 0);
	let displayContent = $derived(message.content);
	// Extended thinking
	let hasThinking = $derived(!!message.thinking);
	let isThinking = $derived(!!message.isThinking);
	let hasContent = $derived(!!message.content);

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
			{isUser ? 'You' : 'StratHost AI'}
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
					<div class="whitespace-pre-wrap break-words leading-relaxed">
						{displayContent}
					</div>
				{:else}
					<!-- Extended thinking display (Claude models) - shows FIRST -->
					{#if hasThinking || isThinking}
						<ThinkingDisplay thinking={message.thinking || ''} {isThinking} {hasContent} />
					{/if}

					<!-- Search status indicator - shows BELOW thinking when searching -->
					{#if isSearching}
						<div class:mt-3={hasThinking || isThinking}>
							<AIStatusIndicator status="searching" query={message.searchQuery} sources={message.sources || []} />
						</div>
					{:else if isStreamingEmpty && !isThinking && !hasThinking}
						<!-- Generic thinking indicator (only when NOT using extended thinking) -->
						<AIStatusIndicator status="thinking" />
					{/if}

					<!-- Main response content with reveal animation -->
					{#if displayContent}
						<div
							class="response-content {showContentReveal ? 'content-reveal' : ''}"
							class:mt-2={hasThinking && !isThinking}
						>
							<MarkdownRenderer content={displayContent} {isStreaming} />
						</div>
					{:else if !isThinking && !hasThinking && !isSearching}
						<!-- Only show empty MarkdownRenderer if no thinking or searching -->
						<MarkdownRenderer content={displayContent} {isStreaming} />
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

			<!-- Action buttons (copy + download) -->
			{#if !isStreamingEmpty && !message.error && displayContent && showCopyButton}
				<div
					class="absolute -top-2 {isUser ? '-left-8' : '-right-8'} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
					transition:fade={{ duration: 150 }}
				>
					<!-- Copy button -->
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

					<!-- Download button (only for assistant messages) -->
					{#if !isUser}
						<DownloadButton content={displayContent} messageId={message.id} />
					{/if}
				</div>
			{/if}
		</div>

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
</style>
