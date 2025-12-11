<script lang="ts">
	/**
	 * ThinkingIndicator - A modern, premium thinking animation
	 * Features: Glowing orb with pulse rings and subtle text
	 */
</script>

<div class="thinking-container">
	<!-- Animated orb with glow -->
	<div class="orb-container">
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
	<span class="thinking-text">Thinking</span>
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
</style>
