<script lang="ts">
	import { fade, scale, fly } from 'svelte/transition';
	import { cubicOut, backOut, cubicInOut } from 'svelte/easing';

	/**
	 * Unified AI Response Indicator
	 *
	 * A single, elegant component that handles all AI response states
	 * with smooth transitions and a premium feel.
	 *
	 * States flow:
	 * 1. Processing (brief) → 2. Reasoning/Searching → 3. Generating
	 */

	type AIState = 'processing' | 'reasoning' | 'searching' | 'reading_document' | 'browsing' | 'generating' | 'complete';

	interface Props {
		state: AIState;
		searchQuery?: string;
		sources?: Array<{ title: string; url: string }>;
		thinkingPreview?: string;
	}

	let { state, searchQuery, sources = [], thinkingPreview }: Props = $props();

	// Derived state for visual properties
	let isActive = $derived(state !== 'complete');
	let showOrb = $derived(state !== 'complete');
	let visibleSources = $derived(sources.slice(0, 5));

	function getDomain(url: string): string {
		try {
			return new URL(url).hostname.replace('www.', '');
		} catch {
			return '';
		}
	}

	// Status messages based on state
	let statusMessage = $derived(() => {
		switch (state) {
			case 'processing': return 'Processing';
			case 'reasoning': return 'Reasoning';
			case 'searching': return 'Searching';
			case 'reading_document': return 'Reading';
			case 'browsing': return 'Browsing';
			case 'generating': return 'Writing';
			default: return '';
		}
	});

	let statusSubmessage = $derived(() => {
		switch (state) {
			case 'processing': return 'Understanding your request';
			case 'reasoning': return 'Thinking through the problem';
			case 'searching': return searchQuery ? `"${searchQuery}"` : 'the web';
			case 'reading_document': return searchQuery ? `"${searchQuery}"` : 'reference documents';
			case 'browsing': return searchQuery ? searchQuery : 'retailer sites';
			case 'generating': return 'Crafting response';
			default: return '';
		}
	});
</script>

{#if isActive}
	<div
		class="ai-indicator"
		class:state-processing={state === 'processing'}
		class:state-reasoning={state === 'reasoning'}
		class:state-searching={state === 'searching'}
		class:state-reading-document={state === 'reading_document'}
		class:state-browsing={state === 'browsing'}
		class:state-generating={state === 'generating'}
		in:scale={{ duration: 400, start: 0.9, opacity: 0, easing: backOut }}
		out:fade={{ duration: 300, easing: cubicOut }}
	>
		<!-- Main container with glass effect -->
		<div class="indicator-card">
			<!-- The Orb -->
			{#if showOrb}
				<div class="orb-container">
					<!-- Ambient glow layers -->
					<div class="orb-glow orb-glow-1"></div>
					<div class="orb-glow orb-glow-2"></div>
					<div class="orb-glow orb-glow-3"></div>

					<!-- Pulse rings -->
					<div class="pulse-ring ring-1"></div>
					<div class="pulse-ring ring-2"></div>
					<div class="pulse-ring ring-3"></div>

					<!-- Core orb -->
					<div class="orb-core">
						<div class="orb-inner"></div>
						<div class="orb-shine"></div>

						<!-- State-specific icons -->
						{#if state === 'searching'}
							<svg class="orb-icon search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						{:else if state === 'reasoning'}
							<svg class="orb-icon brain-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
							</svg>
						{:else if state === 'reading_document'}
							<svg class="orb-icon document-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						{:else if state === 'generating'}
							<svg class="orb-icon pen-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
							</svg>
						{/if}
					</div>

					<!-- Orbiting particles for searching state -->
					{#if state === 'searching'}
						<div class="orbit-track">
							<div class="orbit-particle particle-1"></div>
							<div class="orbit-particle particle-2"></div>
							<div class="orbit-particle particle-3"></div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Status content -->
			<div class="status-content">
				<!-- Primary status -->
				<div class="status-primary">
					<span class="status-label">{statusMessage()}</span>
					<span class="status-dots">
						<span class="dot"></span>
						<span class="dot"></span>
						<span class="dot"></span>
					</span>
				</div>

				<!-- Secondary status / context -->
				{#if statusSubmessage()}
					<div class="status-secondary" in:fly={{ y: 4, duration: 200, delay: 100 }}>
						{statusSubmessage()}
					</div>
				{/if}

				<!-- Source favicon parade (searching state) -->
				{#if state === 'searching' && visibleSources.length > 0}
					<div class="source-parade" in:fly={{ y: 8, duration: 300, delay: 200 }}>
						{#each visibleSources as source, i}
							{@const domain = getDomain(source.url)}
							<div
								class="source-favicon"
								style="--delay: {i * 80}ms"
								title={source.title}
							>
								{#if domain}
									<img
										src="https://www.google.com/s2/favicons?domain={domain}&sz=32"
										alt=""
										loading="eager"
									/>
								{:else}
									<svg class="w-3 h-3 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
									</svg>
								{/if}
							</div>
						{/each}
						{#if sources.length > 5}
							<span class="source-more">+{sources.length - 5}</span>
						{/if}
					</div>
				{/if}

				<!-- Thinking preview (reasoning state) -->
				{#if state === 'reasoning' && thinkingPreview}
					<div class="thinking-preview" in:fly={{ y: 8, duration: 300, delay: 150 }}>
						<span class="preview-text">{thinkingPreview}</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Subtle progress track -->
		<div class="progress-track">
			<div class="progress-fill"></div>
			<div class="progress-glow"></div>
		</div>
	</div>
{/if}

<style>
	.ai-indicator {
		--orb-size: 32px;
		--color-primary: 59, 130, 246; /* blue */
		--color-secondary: 6, 182, 212; /* cyan */
		--color-glow: rgba(59, 130, 246, 0.4);
		position: relative;
		padding: 16px 0 20px;
	}

	/* State-specific color themes */
	.state-processing {
		--color-primary: 59, 130, 246;
		--color-secondary: 99, 102, 241;
		--color-glow: rgba(59, 130, 246, 0.35);
	}

	.state-reasoning {
		--color-primary: 245, 158, 11;
		--color-secondary: 249, 115, 22;
		--color-glow: rgba(245, 158, 11, 0.35);
	}

	.state-searching {
		--color-primary: 139, 92, 246;
		--color-secondary: 6, 182, 212;
		--color-glow: rgba(139, 92, 246, 0.35);
	}

	.state-reading-document {
		--color-primary: 249, 115, 22;
		--color-secondary: 251, 146, 60;
		--color-glow: rgba(249, 115, 22, 0.35);
	}

	.state-generating {
		--color-primary: 34, 197, 94;
		--color-secondary: 20, 184, 166;
		--color-glow: rgba(34, 197, 94, 0.35);
	}

	/* Glass card container */
	.indicator-card {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		padding: 16px 20px;
		background: linear-gradient(
			135deg,
			rgba(30, 41, 59, 0.6) 0%,
			rgba(30, 41, 59, 0.4) 100%
		);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 16px;
		box-shadow:
			0 4px 24px -4px rgba(0, 0, 0, 0.3),
			0 0 0 1px rgba(255, 255, 255, 0.03) inset,
			0 1px 0 rgba(255, 255, 255, 0.05) inset;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.state-reasoning .indicator-card {
		background: linear-gradient(
			135deg,
			rgba(245, 158, 11, 0.08) 0%,
			rgba(30, 41, 59, 0.5) 100%
		);
		border-color: rgba(245, 158, 11, 0.15);
	}

	.state-searching .indicator-card {
		background: linear-gradient(
			135deg,
			rgba(139, 92, 246, 0.08) 0%,
			rgba(30, 41, 59, 0.5) 100%
		);
		border-color: rgba(139, 92, 246, 0.15);
	}

	.state-reading-document .indicator-card {
		background: linear-gradient(
			135deg,
			rgba(249, 115, 22, 0.08) 0%,
			rgba(30, 41, 59, 0.5) 100%
		);
		border-color: rgba(249, 115, 22, 0.15);
	}

	/* Orb Container */
	.orb-container {
		position: relative;
		width: var(--orb-size);
		height: var(--orb-size);
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Ambient glow layers */
	.orb-glow {
		position: absolute;
		border-radius: 50%;
		pointer-events: none;
	}

	.orb-glow-1 {
		width: 60px;
		height: 60px;
		background: radial-gradient(
			circle,
			rgba(var(--color-primary), 0.15) 0%,
			transparent 70%
		);
		animation: glowPulse 3s ease-in-out infinite;
	}

	.orb-glow-2 {
		width: 48px;
		height: 48px;
		background: radial-gradient(
			circle,
			rgba(var(--color-secondary), 0.2) 0%,
			transparent 60%
		);
		animation: glowPulse 3s ease-in-out infinite 0.5s;
	}

	.orb-glow-3 {
		width: 36px;
		height: 36px;
		background: radial-gradient(
			circle,
			rgba(var(--color-primary), 0.25) 0%,
			transparent 50%
		);
		animation: glowPulse 3s ease-in-out infinite 1s;
	}

	/* Pulse rings */
	.pulse-ring {
		position: absolute;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 1.5px solid rgba(var(--color-primary), 0.4);
		animation: ringExpand 2.5s ease-out infinite;
	}

	.ring-1 { animation-delay: 0s; }
	.ring-2 { animation-delay: 0.8s; }
	.ring-3 { animation-delay: 1.6s; }

	/* Core orb */
	.orb-core {
		position: relative;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: linear-gradient(
			135deg,
			rgb(var(--color-primary)) 0%,
			rgb(var(--color-secondary)) 100%
		);
		box-shadow:
			0 0 20px var(--color-glow),
			0 0 40px var(--color-glow),
			0 2px 8px rgba(0, 0, 0, 0.3);
		animation: orbBreathing 2.5s ease-in-out infinite;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
		transition: all 0.4s ease;
	}

	.orb-inner {
		position: absolute;
		inset: 3px;
		border-radius: 50%;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.3) 0%,
			transparent 50%
		);
		opacity: 0.8;
	}

	.orb-shine {
		position: absolute;
		top: 3px;
		left: 5px;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.6);
		filter: blur(1px);
	}

	/* Orb icons */
	.orb-icon {
		width: 10px;
		height: 10px;
		color: white;
		position: relative;
		z-index: 2;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
	}

	.search-icon {
		animation: iconPulse 1.5s ease-in-out infinite;
	}

	.brain-icon {
		animation: iconGlow 2s ease-in-out infinite;
	}

	.pen-icon {
		animation: iconBob 1.2s ease-in-out infinite;
	}

	.document-icon {
		animation: documentScan 2s ease-in-out infinite;
	}

	/* Orbiting particles */
	.orbit-track {
		position: absolute;
		width: 36px;
		height: 36px;
		animation: orbitSpin 4s linear infinite;
	}

	.orbit-particle {
		position: absolute;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-secondary)));
		box-shadow: 0 0 8px var(--color-glow);
	}

	.particle-1 {
		top: 0;
		left: 50%;
		transform: translateX(-50%);
	}

	.particle-2 {
		bottom: 4px;
		right: 2px;
	}

	.particle-3 {
		bottom: 4px;
		left: 2px;
	}

	/* Status content */
	.status-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-top: 2px;
	}

	.status-primary {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.status-label {
		font-size: 15px;
		font-weight: 600;
		background: linear-gradient(
			90deg,
			rgb(var(--color-primary)) 0%,
			rgb(var(--color-secondary)) 50%,
			rgb(var(--color-primary)) 100%
		);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		animation: shimmer 2.5s ease-in-out infinite;
	}

	.status-dots {
		display: flex;
		gap: 3px;
		margin-left: 2px;
	}

	.status-dots .dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: rgb(var(--color-primary));
		opacity: 0.4;
		animation: dotBounce 1.4s ease-in-out infinite;
	}

	.status-dots .dot:nth-child(1) { animation-delay: 0s; }
	.status-dots .dot:nth-child(2) { animation-delay: 0.15s; }
	.status-dots .dot:nth-child(3) { animation-delay: 0.3s; }

	.status-secondary {
		font-size: 13px;
		color: rgb(161, 161, 170);
		max-width: 280px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Source parade */
	.source-parade {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 8px;
		padding-top: 10px;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.source-favicon {
		width: 24px;
		height: 24px;
		border-radius: 6px;
		background: rgba(30, 41, 59, 0.8);
		border: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		opacity: 0;
		transform: scale(0.6) translateY(4px);
		animation: faviconReveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
		animation-delay: var(--delay);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.source-favicon img {
		width: 16px;
		height: 16px;
	}

	.source-more {
		font-size: 11px;
		font-weight: 500;
		color: rgb(113, 113, 122);
		padding: 0 6px;
	}

	/* Thinking preview */
	.thinking-preview {
		margin-top: 8px;
		padding: 10px 12px;
		background: rgba(245, 158, 11, 0.06);
		border: 1px solid rgba(245, 158, 11, 0.12);
		border-radius: 10px;
		max-width: 320px;
	}

	.preview-text {
		font-size: 12px;
		color: rgba(250, 204, 21, 0.8);
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Progress track */
	.progress-track {
		position: absolute;
		bottom: 0;
		left: 20px;
		right: 20px;
		height: 2px;
		background: rgba(var(--color-primary), 0.1);
		border-radius: 1px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		width: 35%;
		background: linear-gradient(
			90deg,
			transparent 0%,
			rgb(var(--color-primary)) 50%,
			rgb(var(--color-secondary)) 100%
		);
		border-radius: 1px;
		animation: progressSlide 2s ease-in-out infinite;
	}

	.progress-glow {
		position: absolute;
		top: -4px;
		height: 10px;
		width: 15%;
		background: radial-gradient(
			ellipse at center,
			rgba(var(--color-primary), 0.4) 0%,
			transparent 70%
		);
		animation: progressGlow 2s ease-in-out infinite;
	}

	/* ============================================
	   ANIMATIONS
	   ============================================ */

	@keyframes glowPulse {
		0%, 100% {
			transform: scale(1);
			opacity: 0.6;
		}
		50% {
			transform: scale(1.15);
			opacity: 1;
		}
	}

	@keyframes ringExpand {
		0% {
			transform: scale(1);
			opacity: 0.6;
		}
		100% {
			transform: scale(2.8);
			opacity: 0;
		}
	}

	@keyframes orbBreathing {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.08);
		}
	}

	@keyframes iconPulse {
		0%, 100% {
			opacity: 0.9;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.1);
		}
	}

	@keyframes iconGlow {
		0%, 100% {
			filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3));
		}
		50% {
			filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.6));
		}
	}

	@keyframes iconBob {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-1px);
		}
	}

	@keyframes documentScan {
		0%, 100% {
			transform: translateY(0) scale(1);
			opacity: 0.9;
		}
		25% {
			transform: translateY(-1px) scale(1.05);
			opacity: 1;
		}
		50% {
			transform: translateY(0) scale(1);
			opacity: 0.9;
		}
		75% {
			transform: translateY(1px) scale(1.05);
			opacity: 1;
		}
	}

	@keyframes orbitSpin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
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

	@keyframes dotBounce {
		0%, 60%, 100% {
			transform: translateY(0);
			opacity: 0.4;
		}
		30% {
			transform: translateY(-4px);
			opacity: 1;
		}
	}

	@keyframes faviconReveal {
		0% {
			opacity: 0;
			transform: scale(0.6) translateY(4px);
		}
		100% {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	@keyframes progressSlide {
		0% {
			transform: translateX(-120%);
		}
		100% {
			transform: translateX(350%);
		}
	}

	@keyframes progressGlow {
		0% {
			transform: translateX(-100%);
			opacity: 0;
		}
		30% {
			opacity: 1;
		}
		100% {
			transform: translateX(800%);
			opacity: 0;
		}
	}

	/* ============================================
	   LIGHT MODE
	   ============================================ */

	:global(html.light) .indicator-card {
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.9) 0%,
			rgba(248, 250, 252, 0.85) 100%
		);
		border-color: rgba(0, 0, 0, 0.06);
		box-shadow:
			0 4px 24px -4px rgba(0, 0, 0, 0.1),
			0 0 0 1px rgba(0, 0, 0, 0.03) inset;
	}

	:global(html.light) .state-reasoning .indicator-card {
		background: linear-gradient(
			135deg,
			rgba(245, 158, 11, 0.1) 0%,
			rgba(255, 255, 255, 0.9) 100%
		);
		border-color: rgba(245, 158, 11, 0.2);
	}

	:global(html.light) .state-searching .indicator-card {
		background: linear-gradient(
			135deg,
			rgba(139, 92, 246, 0.1) 0%,
			rgba(255, 255, 255, 0.9) 100%
		);
		border-color: rgba(139, 92, 246, 0.2);
	}

	:global(html.light) .state-reading-document .indicator-card {
		background: linear-gradient(
			135deg,
			rgba(249, 115, 22, 0.1) 0%,
			rgba(255, 255, 255, 0.9) 100%
		);
		border-color: rgba(249, 115, 22, 0.2);
	}

	:global(html.light) .status-secondary {
		color: rgb(82, 82, 91);
	}

	:global(html.light) .source-favicon {
		background: rgba(248, 250, 252, 0.95);
		border-color: rgba(0, 0, 0, 0.08);
	}

	:global(html.light) .thinking-preview {
		background: rgba(245, 158, 11, 0.08);
		border-color: rgba(245, 158, 11, 0.2);
	}

	:global(html.light) .preview-text {
		color: rgba(180, 83, 9, 0.9);
	}

	:global(html.light) .progress-track {
		background: rgba(var(--color-primary), 0.08);
	}
</style>
