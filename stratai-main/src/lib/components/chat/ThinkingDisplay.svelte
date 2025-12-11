<script lang="ts">
	import { slide, fade, scale } from 'svelte/transition';
	import { cubicOut, cubicInOut, backOut } from 'svelte/easing';
	import MarkdownRenderer from './MarkdownRenderer.svelte';

	interface Props {
		thinking: string;
		isThinking?: boolean;
		hasContent?: boolean; // Whether main content has started streaming
	}

	let { thinking, isThinking = false, hasContent = false }: Props = $props();

	let expanded = $state(true);
	let wasThinking = $state(false);
	let showCollapseAnimation = $state(false);
	let userToggled = $state(false); // Track if user manually toggled
	let hasAutoCollapsed = $state(false); // Track if we've already auto-collapsed

	// Auto-expand when thinking starts, auto-collapse when content arrives
	$effect(() => {
		if (isThinking && !wasThinking) {
			// Thinking just started - expand and reset flags
			expanded = true;
			showCollapseAnimation = false;
			userToggled = false;
			hasAutoCollapsed = false;
		} else if (!isThinking && wasThinking && hasContent && !userToggled && !hasAutoCollapsed) {
			// Thinking just ended and content is coming - trigger collapse animation
			// Only if user hasn't manually toggled and we haven't auto-collapsed yet
			showCollapseAnimation = true;
			hasAutoCollapsed = true;
			// Delay collapse for dramatic effect
			setTimeout(() => {
				if (!userToggled) {
					expanded = false;
				}
			}, 400);
		}
		wasThinking = isThinking;
	});

	// Also collapse when content starts (if thinking already ended)
	$effect(() => {
		if (hasContent && !isThinking && expanded && thinking && !userToggled && !hasAutoCollapsed) {
			showCollapseAnimation = true;
			hasAutoCollapsed = true;
			setTimeout(() => {
				if (!userToggled) {
					expanded = false;
				}
			}, 300);
		}
	});

	function toggleExpanded() {
		userToggled = true; // Mark as user-controlled
		expanded = !expanded;
		showCollapseAnimation = false;
	}

	let previewContent = $derived(() => {
		if (!thinking) return '';
		const lines = thinking.split('\n').filter(l => l.trim());
		const preview = lines.slice(0, 2).join(' ').slice(0, 150);
		return preview + (thinking.length > 150 ? '...' : '');
	});
</script>

<div
	class="thinking-display mb-4 {showCollapseAnimation ? 'collapse-animation' : ''}"
	in:scale={{ duration: 400, start: 0.95, opacity: 0, easing: backOut }}
>
	<!-- Header button -->
	<button
		type="button"
		class="thinking-header w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl
			   border transition-all duration-300 group
			   {isThinking
				   ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-amber-500/30 shadow-lg shadow-amber-500/10'
				   : 'bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-amber-500/10 border-amber-500/20 hover:border-amber-500/30'}"
		onclick={toggleExpanded}
	>
		<!-- Thinking icon with animation -->
		<div class="relative flex-shrink-0">
			<div class="w-5 h-5 flex items-center justify-center">
				{#if isThinking}
					<!-- Animated thinking indicator with glow -->
					<div class="absolute inset-0 rounded-full bg-amber-400/40 animate-ping"></div>
					<div class="absolute inset-[-2px] rounded-full bg-amber-400/20 animate-pulse"></div>
					<svg class="w-5 h-5 text-amber-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
					</svg>
				{:else}
					<!-- Completed thinking icon with subtle glow -->
					<div class="absolute inset-[-4px] rounded-full bg-amber-400/10"></div>
					<svg class="w-5 h-5 text-amber-400/80 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
					</svg>
				{/if}
			</div>
		</div>

		<!-- Label -->
		<span class="text-sm font-medium {isThinking ? 'text-amber-300' : 'text-amber-400/80'}">
			{#if isThinking}
				<span class="inline-flex items-center gap-1">
					Thinking
					<span class="thinking-dots">
						<span>.</span><span>.</span><span>.</span>
					</span>
				</span>
			{:else}
				Thought Process
			{/if}
		</span>

		<!-- Spacer -->
		<div class="flex-1"></div>

		<!-- Preview text when collapsed -->
		{#if !expanded && !isThinking && thinking}
			<span
				class="text-xs text-surface-500 truncate max-w-[200px] hidden sm:block"
				transition:fade={{ duration: 200 }}
			>
				{previewContent()}
			</span>
		{/if}

		<!-- Expand/Collapse chevron -->
		<svg
			class="w-4 h-4 transition-all duration-300 ease-out
				   {isThinking ? 'text-amber-400' : 'text-amber-400/60 group-hover:text-amber-400'}
				   {expanded ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	<!-- Expandable content -->
	{#if expanded}
		<div
			class="mt-2 rounded-xl border border-amber-500/20 bg-surface-900/80 overflow-hidden
				   {isThinking ? 'ring-1 ring-amber-500/20' : ''}"
			transition:slide={{ duration: 350, easing: cubicInOut }}
		>
			<!-- Scrollable content wrapper -->
			<div class="thinking-content-scroll p-4">
				{#if isThinking && !thinking}
					<!-- Initial loading state -->
					<div class="flex items-center gap-3" in:fade={{ duration: 200 }}>
						<div class="flex gap-1.5">
							<div class="w-2 h-2 rounded-full bg-amber-400/70 animate-bounce" style="animation-delay: 0ms"></div>
							<div class="w-2 h-2 rounded-full bg-amber-400/70 animate-bounce" style="animation-delay: 150ms"></div>
							<div class="w-2 h-2 rounded-full bg-amber-400/70 animate-bounce" style="animation-delay: 300ms"></div>
						</div>
						<span class="text-sm text-surface-400">Reasoning through the problem...</span>
					</div>
				{:else}
					<div class="thinking-markdown text-sm" in:fade={{ duration: 150 }}>
						<MarkdownRenderer content={thinking} isStreaming={isThinking} />
					</div>
				{/if}
			</div>

			<!-- Progress bar when thinking -->
			{#if isThinking}
				<div class="h-0.5 bg-surface-800 overflow-hidden">
					<div class="h-full bg-gradient-to-r from-amber-500/50 via-orange-400/70 to-amber-500/50 thinking-progress"></div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.thinking-header {
		background-size: 200% 100%;
	}

	.thinking-header:hover {
		box-shadow: 0 0 25px -5px rgba(251, 191, 36, 0.2);
	}

	.thinking-content-scroll {
		max-height: 300px;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.thinking-content-scroll::-webkit-scrollbar {
		width: 4px;
	}

	.thinking-content-scroll::-webkit-scrollbar-track {
		background: transparent;
	}

	.thinking-content-scroll::-webkit-scrollbar-thumb {
		background: rgba(251, 191, 36, 0.3);
		border-radius: 2px;
	}

	.thinking-content-scroll::-webkit-scrollbar-thumb:hover {
		background: rgba(251, 191, 36, 0.5);
	}

	/* Tone down markdown styling inside thinking block */
	.thinking-markdown :global(h1),
	.thinking-markdown :global(h2),
	.thinking-markdown :global(h3) {
		font-size: 0.875rem;
		font-weight: 600;
		margin-top: 0.75rem;
		margin-bottom: 0.25rem;
		color: rgb(212 212 216);
	}

	.thinking-markdown :global(p) {
		margin-bottom: 0.5rem;
		color: rgb(161 161 170);
	}

	.thinking-markdown :global(ul),
	.thinking-markdown :global(ol) {
		margin-left: 1rem;
		margin-bottom: 0.5rem;
	}

	/* Animated thinking dots */
	.thinking-dots span {
		animation: dotPulse 1.4s ease-in-out infinite;
		opacity: 0.3;
	}

	.thinking-dots span:nth-child(1) {
		animation-delay: 0s;
	}

	.thinking-dots span:nth-child(2) {
		animation-delay: 0.2s;
	}

	.thinking-dots span:nth-child(3) {
		animation-delay: 0.4s;
	}

	@keyframes dotPulse {
		0%, 60%, 100% {
			opacity: 0.3;
		}
		30% {
			opacity: 1;
		}
	}

	/* Progress bar animation */
	.thinking-progress {
		width: 30%;
		animation: progressSlide 1.5s ease-in-out infinite;
	}

	@keyframes progressSlide {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(400%);
		}
	}

	/* Collapse animation class */
	.collapse-animation {
		animation: collapseGlow 0.4s ease-out forwards;
	}

	@keyframes collapseGlow {
		0% {
			filter: brightness(1);
		}
		50% {
			filter: brightness(1.2);
		}
		100% {
			filter: brightness(1);
		}
	}
</style>
