<script lang="ts">
	import { slide, fade, scale } from 'svelte/transition';
	import { cubicOut, cubicInOut, backOut } from 'svelte/easing';
	import MarkdownRenderer from './MarkdownRenderer.svelte';

	interface Props {
		thinking: string;
		isThinking?: boolean;
		hasContent?: boolean;
	}

	let { thinking, isThinking = false, hasContent = false }: Props = $props();

	let expanded = $state(true);
	let wasThinking = $state(false);
	let userToggled = $state(false);
	let hasAutoCollapsed = $state(false);

	// Auto-expand when thinking starts, auto-collapse when content arrives
	$effect(() => {
		if (isThinking && !wasThinking) {
			expanded = true;
			userToggled = false;
			hasAutoCollapsed = false;
		} else if (!isThinking && wasThinking && hasContent && !userToggled && !hasAutoCollapsed) {
			hasAutoCollapsed = true;
			setTimeout(() => {
				if (!userToggled) {
					expanded = false;
				}
			}, 600);
		}
		wasThinking = isThinking;
	});

	$effect(() => {
		if (hasContent && !isThinking && expanded && thinking && !userToggled && !hasAutoCollapsed) {
			hasAutoCollapsed = true;
			setTimeout(() => {
				if (!userToggled) {
					expanded = false;
				}
			}, 400);
		}
	});

	function toggleExpanded() {
		userToggled = true;
		expanded = !expanded;
	}

	let previewContent = $derived(() => {
		if (!thinking) return '';
		const lines = thinking.split('\n').filter(l => l.trim());
		const preview = lines.slice(0, 2).join(' ').slice(0, 120);
		return preview + (thinking.length > 120 ? '...' : '');
	});

	// Word count for display
	let wordCount = $derived(() => {
		if (!thinking) return 0;
		return thinking.split(/\s+/).filter(w => w.length > 0).length;
	});
</script>

<div
	class="thinking-container"
	class:is-active={isThinking}
	in:scale={{ duration: 400, start: 0.95, opacity: 0, easing: backOut }}
>
	<!-- Glass card -->
	<div class="thinking-card">
		<!-- Header (always visible) -->
		<button
			type="button"
			class="thinking-header"
			onclick={toggleExpanded}
		>
			<!-- Orb indicator -->
			<div class="thinking-orb">
				<div class="orb-glow"></div>
				<div class="orb-core">
					{#if isThinking}
						<div class="orb-pulse"></div>
					{/if}
					<svg class="orb-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
					</svg>
				</div>
			</div>

			<!-- Label and status -->
			<div class="header-content">
				<span class="header-label">
					{#if isThinking}
						<span class="label-text">Reasoning</span>
						<span class="thinking-dots">
							<span></span><span></span><span></span>
						</span>
					{:else}
						<span class="label-text">Thought Process</span>
					{/if}
				</span>
				{#if !expanded && !isThinking && wordCount() > 0}
					<span class="word-count" transition:fade={{ duration: 150 }}>
						{wordCount()} words
					</span>
				{/if}
			</div>

			<!-- Preview (when collapsed) -->
			{#if !expanded && !isThinking && thinking}
				<span class="header-preview" transition:fade={{ duration: 200 }}>
					{previewContent()}
				</span>
			{/if}

			<!-- Expand/collapse -->
			<svg
				class="expand-icon"
				class:rotated={expanded}
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
				class="thinking-content"
				transition:slide={{ duration: 350, easing: cubicInOut }}
			>
				<div class="content-wrapper">
					{#if isThinking && !thinking}
						<!-- Initial loading state -->
						<div class="loading-state" in:fade={{ duration: 200 }}>
							<div class="loading-dots">
								<span style="--i: 0"></span>
								<span style="--i: 1"></span>
								<span style="--i: 2"></span>
							</div>
							<span class="loading-text">Analyzing and reasoning...</span>
						</div>
					{:else}
						<div class="markdown-content" in:fade={{ duration: 150 }}>
							<MarkdownRenderer content={thinking} isStreaming={isThinking} />
						</div>
					{/if}
				</div>

				<!-- Progress bar when thinking -->
				{#if isThinking}
					<div class="progress-bar">
						<div class="progress-fill"></div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.thinking-container {
		--color-amber: 245, 158, 11;
		--color-orange: 249, 115, 22;
		margin-bottom: 12px;
	}

	/* Glass card */
	.thinking-card {
		background: linear-gradient(
			135deg,
			rgba(245, 158, 11, 0.06) 0%,
			rgba(30, 41, 59, 0.5) 100%
		);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(245, 158, 11, 0.15);
		border-radius: 14px;
		overflow: hidden;
		box-shadow:
			0 4px 20px -4px rgba(245, 158, 11, 0.15),
			0 0 0 1px rgba(255, 255, 255, 0.02) inset;
		transition: all 0.3s ease;
	}

	.is-active .thinking-card {
		border-color: rgba(245, 158, 11, 0.25);
		box-shadow:
			0 4px 24px -4px rgba(245, 158, 11, 0.25),
			0 0 0 1px rgba(255, 255, 255, 0.03) inset,
			0 0 40px -10px rgba(245, 158, 11, 0.2);
	}

	/* Header button */
	.thinking-header {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background 0.2s ease;
	}

	.thinking-header:hover {
		background: rgba(245, 158, 11, 0.05);
	}

	/* Orb indicator */
	.thinking-orb {
		position: relative;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.orb-glow {
		position: absolute;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: radial-gradient(
			circle,
			rgba(var(--color-amber), 0.25) 0%,
			transparent 70%
		);
		animation: glowPulse 2.5s ease-in-out infinite;
	}

	.orb-core {
		position: relative;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: linear-gradient(135deg, rgb(var(--color-amber)), rgb(var(--color-orange)));
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 16px rgba(var(--color-amber), 0.4);
		z-index: 1;
	}

	.orb-pulse {
		position: absolute;
		inset: -4px;
		border-radius: 50%;
		border: 2px solid rgba(var(--color-amber), 0.3);
		animation: pulseRing 2s ease-out infinite;
	}

	.orb-icon {
		width: 10px;
		height: 10px;
		color: white;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
	}

	.is-active .orb-core {
		animation: orbBreathing 2s ease-in-out infinite;
	}

	/* Header content */
	.header-content {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.header-label {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.label-text {
		font-size: 14px;
		font-weight: 600;
		background: linear-gradient(90deg, rgb(var(--color-amber)), rgb(var(--color-orange)));
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.is-active .label-text {
		background: linear-gradient(
			90deg,
			rgb(var(--color-amber)) 0%,
			rgb(var(--color-orange)) 50%,
			rgb(var(--color-amber)) 100%
		);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		animation: shimmer 2.5s ease-in-out infinite;
	}

	.word-count {
		font-size: 11px;
		color: rgba(var(--color-amber), 0.6);
		font-weight: 500;
	}

	.thinking-dots {
		display: inline-flex;
		gap: 2px;
		margin-left: 2px;
	}

	.thinking-dots span {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: rgb(var(--color-amber));
		opacity: 0.3;
		animation: dotPulse 1.4s ease-in-out infinite;
	}

	.thinking-dots span:nth-child(1) { animation-delay: 0s; }
	.thinking-dots span:nth-child(2) { animation-delay: 0.15s; }
	.thinking-dots span:nth-child(3) { animation-delay: 0.3s; }

	.header-preview {
		flex: 1;
		font-size: 12px;
		color: rgb(113, 113, 122);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 250px;
		margin-left: auto;
		padding-left: 16px;
	}

	.expand-icon {
		width: 16px;
		height: 16px;
		color: rgba(var(--color-amber), 0.6);
		transition: all 0.3s ease;
		flex-shrink: 0;
	}

	.expand-icon.rotated {
		transform: rotate(180deg);
	}

	.thinking-header:hover .expand-icon {
		color: rgb(var(--color-amber));
	}

	/* Content area */
	.thinking-content {
		border-top: 1px solid rgba(var(--color-amber), 0.1);
	}

	.content-wrapper {
		padding: 16px;
		max-height: 320px;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.content-wrapper::-webkit-scrollbar {
		width: 4px;
	}

	.content-wrapper::-webkit-scrollbar-track {
		background: transparent;
	}

	.content-wrapper::-webkit-scrollbar-thumb {
		background: rgba(var(--color-amber), 0.25);
		border-radius: 2px;
	}

	.content-wrapper::-webkit-scrollbar-thumb:hover {
		background: rgba(var(--color-amber), 0.4);
	}

	/* Loading state */
	.loading-state {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 0;
	}

	.loading-dots {
		display: flex;
		gap: 6px;
	}

	.loading-dots span {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgba(var(--color-amber), 0.7);
		animation: dotBounce 1s ease-in-out infinite;
		animation-delay: calc(var(--i) * 0.15s);
	}

	.loading-text {
		font-size: 13px;
		color: rgb(161, 161, 170);
	}

	/* Markdown content styling */
	.markdown-content {
		font-size: 13px;
		line-height: 1.6;
		color: rgb(161, 161, 170);
	}

	.markdown-content :global(h1),
	.markdown-content :global(h2),
	.markdown-content :global(h3) {
		font-size: 13px;
		font-weight: 600;
		color: rgb(212, 212, 216);
		margin-top: 12px;
		margin-bottom: 4px;
	}

	.markdown-content :global(p) {
		margin-bottom: 8px;
	}

	.markdown-content :global(ul),
	.markdown-content :global(ol) {
		margin-left: 16px;
		margin-bottom: 8px;
	}

	.markdown-content :global(code) {
		font-size: 12px;
		background: rgba(0, 0, 0, 0.2);
		padding: 2px 6px;
		border-radius: 4px;
	}

	/* Progress bar */
	.progress-bar {
		height: 2px;
		background: rgba(var(--color-amber), 0.1);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		width: 30%;
		background: linear-gradient(
			90deg,
			transparent,
			rgb(var(--color-amber)),
			rgb(var(--color-orange))
		);
		animation: progressSlide 1.8s ease-in-out infinite;
	}

	/* Animations */
	@keyframes glowPulse {
		0%, 100% {
			transform: scale(1);
			opacity: 0.6;
		}
		50% {
			transform: scale(1.2);
			opacity: 1;
		}
	}

	@keyframes pulseRing {
		0% {
			transform: scale(1);
			opacity: 0.5;
		}
		100% {
			transform: scale(2);
			opacity: 0;
		}
	}

	@keyframes orbBreathing {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
	}

	@keyframes shimmer {
		0%, 100% {
			background-position: -200% 0;
		}
		50% {
			background-position: 200% 0;
		}
	}

	@keyframes dotPulse {
		0%, 60%, 100% {
			opacity: 0.3;
		}
		30% {
			opacity: 1;
		}
	}

	@keyframes dotBounce {
		0%, 60%, 100% {
			transform: translateY(0);
		}
		30% {
			transform: translateY(-6px);
		}
	}

	@keyframes progressSlide {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(400%);
		}
	}

	/* Light mode */
	:global(html.light) .thinking-card {
		background: linear-gradient(
			135deg,
			rgba(245, 158, 11, 0.08) 0%,
			rgba(255, 255, 255, 0.95) 100%
		);
		border-color: rgba(245, 158, 11, 0.2);
		box-shadow:
			0 4px 20px -4px rgba(245, 158, 11, 0.1),
			0 1px 2px rgba(0, 0, 0, 0.05);
	}

	:global(html.light) .is-active .thinking-card {
		border-color: rgba(245, 158, 11, 0.35);
		box-shadow:
			0 4px 24px -4px rgba(245, 158, 11, 0.2),
			0 0 40px -10px rgba(245, 158, 11, 0.15);
	}

	:global(html.light) .thinking-header:hover {
		background: rgba(245, 158, 11, 0.08);
	}

	:global(html.light) .header-preview {
		color: rgb(82, 82, 91);
	}

	:global(html.light) .loading-text {
		color: rgb(82, 82, 91);
	}

	:global(html.light) .markdown-content {
		color: rgb(82, 82, 91);
	}

	:global(html.light) .markdown-content :global(h1),
	:global(html.light) .markdown-content :global(h2),
	:global(html.light) .markdown-content :global(h3) {
		color: rgb(39, 39, 42);
	}

	:global(html.light) .markdown-content :global(code) {
		background: rgba(0, 0, 0, 0.06);
	}
</style>
