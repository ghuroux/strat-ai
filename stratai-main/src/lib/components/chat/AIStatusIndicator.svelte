<script lang="ts">
	import { fade, fly } from 'svelte/transition';

	interface Props {
		status: 'thinking' | 'searching' | 'processing' | 'calendar' | 'email';
		query?: string;
		sources?: Array<{ title: string; url: string }>;
	}

	let { status, query, sources = [] }: Props = $props();

	function getDomain(url: string): string {
		try {
			return new URL(url).hostname;
		} catch {
			return '';
		}
	}

	// Show up to 4 source favicons during search
	let visibleSources = $derived(sources.slice(0, 4));
</script>

<div class="ai-status-container" in:fade={{ duration: 200 }}>
	<!-- Main orb area -->
	<div class="orb-area">
		<!-- Pulse rings (always present, intensity varies by state) -->
		<div class="pulse-ring pulse-ring-1" class:searching={status === 'searching'} class:calendar={status === 'calendar'} class:email={status === 'email'}></div>
		<div class="pulse-ring pulse-ring-2" class:searching={status === 'searching'} class:calendar={status === 'calendar'} class:email={status === 'email'}></div>
		<div class="pulse-ring pulse-ring-3" class:searching={status === 'searching'} class:calendar={status === 'calendar'} class:email={status === 'email'}></div>

		<!-- Central orb -->
		<div class="orb" class:searching={status === 'searching'} class:calendar={status === 'calendar'} class:email={status === 'email'}>
			<div class="orb-inner"></div>

			<!-- Search icon overlay when searching -->
			{#if status === 'searching'}
				<svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" in:fade={{ duration: 200 }}>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2.5"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
			{/if}

			<!-- Calendar icon overlay when checking calendar -->
			{#if status === 'calendar'}
				<svg class="calendar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" in:fade={{ duration: 200 }}>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			{/if}

			<!-- Envelope icon overlay when sending email -->
			{#if status === 'email'}
				<svg class="email-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" in:fade={{ duration: 200 }}>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
					/>
				</svg>
			{/if}
		</div>

		<!-- Orbiting elements when searching -->
		{#if status === 'searching'}
			<div class="orbit-track">
				<div class="orbit-dot orbit-dot-1"></div>
				<div class="orbit-dot orbit-dot-2"></div>
			</div>
		{/if}

		<!-- Orbiting elements when checking calendar -->
		{#if status === 'calendar'}
			<div class="orbit-track calendar-orbit">
				<div class="orbit-dot calendar-dot orbit-dot-1"></div>
				<div class="orbit-dot calendar-dot orbit-dot-2"></div>
			</div>
		{/if}

		<!-- Orbiting elements when sending email -->
		{#if status === 'email'}
			<div class="orbit-track email-orbit">
				<div class="orbit-dot email-dot orbit-dot-1"></div>
				<div class="orbit-dot email-dot orbit-dot-2"></div>
			</div>
		{/if}
	</div>

	<!-- Status content -->
	<div class="status-content">
		<!-- Status text -->
		<div class="status-text-area">
			{#if status === 'thinking'}
				<span class="status-label" in:fade={{ duration: 150 }}>Thinking</span>
			{:else if status === 'searching'}
				<span class="status-label searching" in:fade={{ duration: 150 }}>Searching the web</span>
				{#if query}
					<span class="query-text" in:fly={{ y: 5, duration: 200, delay: 100 }}>"{query}"</span>
				{/if}
			{:else if status === 'calendar'}
				<span class="status-label calendar" in:fade={{ duration: 150 }}>Checking calendar</span>
				{#if query}
					<span class="query-text" in:fly={{ y: 5, duration: 200, delay: 100 }}>"{query}"</span>
				{/if}
			{:else if status === 'email'}
				<span class="status-label email" in:fade={{ duration: 150 }}>Sending email</span>
				{#if query}
					<span class="query-text" in:fly={{ y: 5, duration: 200, delay: 100 }}>"{query}"</span>
				{/if}
			{:else if status === 'processing'}
				<span class="status-label" in:fade={{ duration: 150 }}>Processing results</span>
			{/if}
		</div>

		<!-- Favicon parade when we have sources -->
		{#if status === 'searching' && visibleSources.length > 0}
			<div class="favicon-parade" in:fly={{ x: -10, duration: 300, delay: 200 }}>
				{#each visibleSources as source, i}
					{@const domain = getDomain(source.url)}
					<div
						class="favicon-item"
						style="animation-delay: {i * 150}ms"
						title={source.title}
					>
						{#if domain}
							<img
								src="https://www.google.com/s2/favicons?domain={domain}&sz=32"
								alt=""
								class="favicon-img"
								loading="eager"
							/>
						{:else}
							<div class="favicon-placeholder">
								<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
								</svg>
							</div>
						{/if}
					</div>
				{/each}
				{#if sources.length > 4}
					<div class="favicon-more">+{sources.length - 4}</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Progress bar (only when searching) -->
	{#if status === 'searching'}
		<div class="progress-track" in:fade={{ duration: 200 }}>
			<div class="progress-bar"></div>
			<div class="progress-glow"></div>
		</div>
	{/if}
</div>

<style>
	.ai-status-container {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		padding: 12px 0;
		position: relative;
	}

	/* Orb Area */
	.orb-area {
		position: relative;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.orb {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: linear-gradient(135deg, #1a6dff 0%, #00dcd5 100%);
		position: relative;
		z-index: 10;
		animation: orbPulse 2s ease-in-out infinite;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s ease;
	}

	.orb.searching {
		width: 20px;
		height: 20px;
		background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%);
		animation: orbPulseSearch 1.5s ease-in-out infinite;
	}

	.orb.calendar {
		width: 20px;
		height: 20px;
		background: linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%);
		animation: orbPulseCalendar 1.5s ease-in-out infinite;
	}

	.orb.email {
		width: 20px;
		height: 20px;
		background: linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ea580c 100%);
		animation: orbPulseEmail 1.5s ease-in-out infinite;
	}

	.orb-inner {
		position: absolute;
		inset: 2px;
		border-radius: 50%;
		background: linear-gradient(135deg, #4691ff 0%, #26f5ef 100%);
		animation: innerGlow 2s ease-in-out infinite;
		transition: opacity 0.3s;
	}

	.orb.searching .orb-inner {
		opacity: 0.3;
	}

	.search-icon {
		width: 10px;
		height: 10px;
		color: white;
		position: relative;
		z-index: 2;
		animation: searchIconPulse 1s ease-in-out infinite;
	}

	.calendar-icon {
		width: 11px;
		height: 11px;
		color: white;
		position: relative;
		z-index: 2;
		animation: searchIconPulse 1s ease-in-out infinite;
	}

	.email-icon {
		width: 11px;
		height: 11px;
		color: white;
		position: relative;
		z-index: 2;
		animation: searchIconPulse 1s ease-in-out infinite;
	}

	/* Pulse Rings */
	.pulse-ring {
		position: absolute;
		border-radius: 50%;
		border: 1px solid rgba(26, 109, 255, 0.4);
		animation: pulseRing 2s ease-out infinite;
		width: 14px;
		height: 14px;
	}

	.pulse-ring.searching {
		border-color: rgba(139, 92, 246, 0.5);
		animation: pulseRingSearch 1.5s ease-out infinite;
	}

	.pulse-ring.calendar {
		border-color: rgba(16, 185, 129, 0.5);
		animation: pulseRingCalendar 1.5s ease-out infinite;
	}

	.pulse-ring.email {
		border-color: rgba(245, 158, 11, 0.5);
		animation: pulseRingEmail 1.5s ease-out infinite;
	}

	.pulse-ring-1 { animation-delay: 0s; }
	.pulse-ring-2 { animation-delay: 0.5s; }
	.pulse-ring-3 { animation-delay: 1s; }

	/* Orbit Track */
	.orbit-track {
		position: absolute;
		width: 28px;
		height: 28px;
		animation: orbitRotate 3s linear infinite;
	}

	.orbit-dot {
		position: absolute;
		width: 4px;
		height: 4px;
		background: linear-gradient(135deg, #8b5cf6, #06b6d4);
		border-radius: 50%;
		box-shadow: 0 0 6px rgba(139, 92, 246, 0.6);
	}

	.orbit-dot-1 {
		top: 0;
		left: 50%;
		transform: translateX(-50%);
	}

	.orbit-dot-2 {
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
	}

	.orbit-dot.calendar-dot {
		background: linear-gradient(135deg, #10b981, #14b8a6);
		box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
	}

	.orbit-dot.email-dot {
		background: linear-gradient(135deg, #f59e0b, #f97316);
		box-shadow: 0 0 6px rgba(245, 158, 11, 0.6);
	}

	.calendar-orbit {
		animation: orbitRotate 4s linear infinite;
	}

	.email-orbit {
		animation: orbitRotate 3.5s linear infinite;
	}

	/* Status Content */
	.status-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.status-text-area {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.status-label {
		font-size: 14px;
		font-weight: 500;
		background: linear-gradient(90deg, #a1a1aa 0%, #71717a 50%, #a1a1aa 100%);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		animation: shimmerText 2s ease-in-out infinite;
	}

	.status-label.searching {
		background: linear-gradient(90deg, #60a5fa 0%, #a78bfa 50%, #60a5fa 100%);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
	}

	.status-label.calendar {
		background: linear-gradient(90deg, #34d399 0%, #2dd4bf 50%, #34d399 100%);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
	}

	.status-label.email {
		background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
	}

	.query-text {
		font-size: 12px;
		color: #71717a;
		max-width: 250px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Favicon Parade */
	.favicon-parade {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 0;
	}

	.favicon-item {
		width: 20px;
		height: 20px;
		border-radius: 4px;
		background: rgba(30, 41, 59, 0.8);
		border: 1px solid rgba(71, 85, 105, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		animation: faviconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
		opacity: 0;
		transform: scale(0.5);
	}

	.favicon-img {
		width: 14px;
		height: 14px;
	}

	.favicon-placeholder {
		color: #64748b;
	}

	.favicon-more {
		font-size: 10px;
		color: #64748b;
		padding: 0 4px;
		font-weight: 500;
	}

	/* Progress Track */
	.progress-track {
		position: absolute;
		bottom: 0;
		left: 42px;
		right: 0;
		height: 2px;
		background: rgba(51, 65, 85, 0.5);
		border-radius: 1px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		width: 40%;
		background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
		border-radius: 1px;
		animation: progressSlide 2s ease-in-out infinite;
	}

	.progress-glow {
		position: absolute;
		top: -2px;
		height: 6px;
		width: 20%;
		background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.4) 0%, transparent 70%);
		animation: progressGlow 2s ease-in-out infinite;
	}

	/* Animations */
	@keyframes orbPulse {
		0%, 100% {
			transform: scale(1);
			box-shadow: 0 0 10px rgba(26, 109, 255, 0.5), 0 0 20px rgba(0, 220, 213, 0.3);
		}
		50% {
			transform: scale(1.1);
			box-shadow: 0 0 15px rgba(26, 109, 255, 0.7), 0 0 30px rgba(0, 220, 213, 0.5);
		}
	}

	@keyframes orbPulseSearch {
		0%, 100% {
			transform: scale(1);
			box-shadow: 0 0 12px rgba(59, 130, 246, 0.6), 0 0 24px rgba(139, 92, 246, 0.4);
		}
		50% {
			transform: scale(1.15);
			box-shadow: 0 0 18px rgba(59, 130, 246, 0.8), 0 0 36px rgba(139, 92, 246, 0.6);
		}
	}

	@keyframes orbPulseCalendar {
		0%, 100% {
			transform: scale(1);
			box-shadow: 0 0 12px rgba(16, 185, 129, 0.6), 0 0 24px rgba(20, 184, 166, 0.4);
		}
		50% {
			transform: scale(1.15);
			box-shadow: 0 0 18px rgba(16, 185, 129, 0.8), 0 0 36px rgba(20, 184, 166, 0.6);
		}
	}

	@keyframes orbPulseEmail {
		0%, 100% {
			transform: scale(1);
			box-shadow: 0 0 12px rgba(245, 158, 11, 0.6), 0 0 24px rgba(249, 115, 22, 0.4);
		}
		50% {
			transform: scale(1.15);
			box-shadow: 0 0 18px rgba(245, 158, 11, 0.8), 0 0 36px rgba(249, 115, 22, 0.6);
		}
	}

	@keyframes innerGlow {
		0%, 100% { opacity: 0.7; }
		50% { opacity: 1; }
	}

	@keyframes pulseRing {
		0% {
			transform: scale(1);
			opacity: 0.6;
		}
		100% {
			transform: scale(2.5);
			opacity: 0;
		}
	}

	@keyframes pulseRingSearch {
		0% {
			transform: scale(1);
			opacity: 0.7;
		}
		100% {
			transform: scale(2.2);
			opacity: 0;
		}
	}

	@keyframes pulseRingCalendar {
		0% {
			transform: scale(1);
			opacity: 0.7;
		}
		100% {
			transform: scale(2.2);
			opacity: 0;
		}
	}

	@keyframes pulseRingEmail {
		0% {
			transform: scale(1);
			opacity: 0.7;
		}
		100% {
			transform: scale(2.2);
			opacity: 0;
		}
	}

	@keyframes searchIconPulse {
		0%, 100% { opacity: 0.9; }
		50% { opacity: 1; }
	}

	@keyframes orbitRotate {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@keyframes shimmerText {
		0% { background-position: -200% 0; }
		100% { background-position: 200% 0; }
	}

	@keyframes faviconPop {
		0% {
			opacity: 0;
			transform: scale(0.5);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes progressSlide {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(300%); }
	}

	@keyframes progressGlow {
		0% {
			transform: translateX(-100%);
			opacity: 0;
		}
		50% {
			opacity: 1;
		}
		100% {
			transform: translateX(500%);
			opacity: 0;
		}
	}

	/* Light Mode Overrides */
	:global(html.light) .status-label {
		background: linear-gradient(90deg, #52525b 0%, #3f3f46 50%, #52525b 100%);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
	}

	:global(html.light) .status-label.searching {
		background: linear-gradient(90deg, #2563eb 0%, #7c3aed 50%, #2563eb 100%);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
	}

	:global(html.light) .query-text {
		color: #52525b;
	}

	:global(html.light) .favicon-item {
		background: rgba(244, 244, 245, 0.9);
		border: 1px solid rgba(212, 212, 216, 0.8);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	:global(html.light) .favicon-placeholder {
		color: #a1a1aa;
	}

	:global(html.light) .favicon-more {
		color: #71717a;
	}

	:global(html.light) .progress-track {
		background: rgba(228, 228, 231, 0.8);
	}

	:global(html.light) .pulse-ring {
		border-color: rgba(37, 99, 235, 0.3);
	}

	:global(html.light) .pulse-ring.searching {
		border-color: rgba(124, 58, 237, 0.4);
	}

	:global(html.light) .pulse-ring.calendar {
		border-color: rgba(5, 150, 105, 0.4);
	}

	:global(html.light) .orbit-dot {
		box-shadow: 0 0 6px rgba(124, 58, 237, 0.5);
	}

	:global(html.light) .orbit-dot.calendar-dot {
		box-shadow: 0 0 6px rgba(5, 150, 105, 0.5);
	}

	:global(html.light) .status-label.calendar {
		background: linear-gradient(90deg, #059669 0%, #0d9488 50%, #059669 100%);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
	}

	:global(html.light) .pulse-ring.email {
		border-color: rgba(217, 119, 6, 0.4);
	}

	:global(html.light) .orbit-dot.email-dot {
		box-shadow: 0 0 6px rgba(217, 119, 6, 0.5);
	}

	:global(html.light) .status-label.email {
		background: linear-gradient(90deg, #d97706 0%, #b45309 50%, #d97706 100%);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
	}
</style>
