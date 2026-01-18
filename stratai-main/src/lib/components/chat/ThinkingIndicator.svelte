<script lang="ts">
	/**
	 * ThinkingIndicator - A modern, premium thinking animation
	 * Features: Glowing orb with pulse rings and subtle text with elapsed time
	 */

	import { generationActivityStore } from '$lib/stores/generationActivity.svelte';

	/**
	 * Format elapsed seconds into human-readable time
	 * < 60s: "15s"
	 * >= 60s: "1m 15s"
	 */
	function formatElapsedTime(seconds: number): string {
		if (seconds < 60) {
			return `${seconds}s`;
		}

		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	}
</script>

<div class="thinking-container">
	<!-- Animated orb with glow -->
	<div class="orb-container" class:paused={!generationActivityStore.isGenerating}>
		<!-- Pulse rings -->
		<div class="pulse-ring pulse-ring-1"></div>
		<div class="pulse-ring pulse-ring-2"></div>
		<div class="pulse-ring pulse-ring-3"></div>

		<!-- Central orb -->
		<div class="orb">
			<div class="orb-inner"></div>
		</div>
	</div>

	<!-- Subtle text -->
	<span class="thinking-text" class:paused={!generationActivityStore.isGenerating}>
		Thinking
		{#if generationActivityStore.elapsedSeconds > 0}
			<span class="elapsed-time">({formatElapsedTime(generationActivityStore.elapsedSeconds)})</span>
		{/if}
	</span>
</div>

<style>
	.thinking-container {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 0;
	}

	.orb-container {
		position: relative;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.orb {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: linear-gradient(135deg, #1a6dff 0%, #00dcd5 100%);
		position: relative;
		z-index: 10;
		animation: orbPulse 2s ease-in-out infinite;
	}

	.orb-inner {
		position: absolute;
		inset: 2px;
		border-radius: 50%;
		background: linear-gradient(135deg, #4691ff 0%, #26f5ef 100%);
		animation: innerGlow 2s ease-in-out infinite;
	}

	.pulse-ring {
		position: absolute;
		border-radius: 50%;
		border: 1px solid;
		border-color: rgba(26, 109, 255, 0.4);
		animation: pulseRing 2s ease-out infinite;
	}

	.pulse-ring-1 {
		width: 12px;
		height: 12px;
		animation-delay: 0s;
	}

	.pulse-ring-2 {
		width: 12px;
		height: 12px;
		animation-delay: 0.5s;
	}

	.pulse-ring-3 {
		width: 12px;
		height: 12px;
		animation-delay: 1s;
	}

	.thinking-text {
		font-size: 14px;
		font-weight: 500;
		background: linear-gradient(90deg, #a1a1aa 0%, #71717a 50%, #a1a1aa 100%);
		background-size: 200% 100%;
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		animation: shimmerText 2s ease-in-out infinite;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.elapsed-time {
		animation: fadeIn 0.3s ease-in-out;
	}

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

	@keyframes innerGlow {
		0%, 100% {
			opacity: 0.7;
		}
		50% {
			opacity: 1;
		}
	}

	@keyframes pulseRing {
		0% {
			transform: scale(1);
			opacity: 0.6;
		}
		100% {
			transform: scale(3);
			opacity: 0;
		}
	}

	@keyframes shimmerText {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}

	@keyframes fadeIn {
		0% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}

	/* Animation control based on isGenerating state */
	.paused,
	.paused :global(*) {
		animation-play-state: paused !important;
	}
</style>
