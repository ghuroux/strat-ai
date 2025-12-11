<script lang="ts">
	import { scale, fade } from 'svelte/transition';
	import { backOut, cubicOut } from 'svelte/easing';

	interface Props {
		timestamp: number;
		summaryPreview?: string;
	}

	let { timestamp, summaryPreview }: Props = $props();

	let formattedTime = $derived(
		new Date(timestamp).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit'
		})
	);

	let formattedDate = $derived(
		new Date(timestamp).toLocaleDateString([], {
			month: 'short',
			day: 'numeric'
		})
	);

	// Check if today
	let isToday = $derived(() => {
		const today = new Date();
		const ts = new Date(timestamp);
		return (
			today.getDate() === ts.getDate() &&
			today.getMonth() === ts.getMonth() &&
			today.getFullYear() === ts.getFullYear()
		);
	});

	let showDetails = $state(false);
</script>

<div
	class="session-separator relative py-8 my-6 select-none"
	in:scale={{ duration: 600, start: 0.85, easing: backOut }}
>
	<!-- Background glow effect -->
	<div class="absolute inset-0 flex items-center justify-center overflow-hidden">
		<div class="glow-orb"></div>
	</div>

	<!-- Gradient lines -->
	<div class="relative flex items-center">
		<!-- Left gradient line -->
		<div class="flex-1 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-primary-500/60"></div>

		<!-- Center pill -->
		<button
			type="button"
			onclick={() => (showDetails = !showDetails)}
			class="relative mx-4 group"
		>
			<!-- Outer glow ring -->
			<div class="absolute -inset-1 rounded-full bg-gradient-to-r from-primary-500/20 via-cyan-500/20 to-primary-500/20 blur-sm opacity-75"></div>

			<!-- Main pill -->
			<div
				class="relative px-4 py-2 rounded-full
					   bg-gradient-to-r from-surface-900 via-surface-800 to-surface-900
					   border border-primary-500/30
					   flex items-center gap-2.5
					   shadow-lg shadow-primary-500/10
					   hover:shadow-primary-500/20 hover:border-primary-500/50
					   transition-all duration-300"
			>
				<!-- Sparkle icon -->
				<div class="relative">
					<svg
						class="w-4 h-4 text-primary-400"
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
					</svg>
					<!-- Sparkle animation -->
					<svg
						class="absolute inset-0 w-4 h-4 text-cyan-400 animate-ping opacity-50"
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
					</svg>
				</div>

				<!-- Text -->
				<span class="text-xs font-medium bg-gradient-to-r from-primary-300 via-cyan-300 to-primary-300 bg-clip-text text-transparent">
					Session Refreshed
				</span>

				<!-- Timestamp -->
				<div class="flex items-center gap-1 text-[10px] text-surface-500">
					<span>{isToday() ? 'Today' : formattedDate}</span>
					<span class="text-surface-600">•</span>
					<span>{formattedTime}</span>
				</div>

				<!-- Expand indicator -->
				{#if summaryPreview}
					<svg
						class="w-3 h-3 text-surface-500 transition-transform duration-200 {showDetails ? 'rotate-180' : ''}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				{/if}
			</div>
		</button>

		<!-- Right gradient line -->
		<div class="flex-1 h-px bg-gradient-to-l from-transparent via-primary-500/40 to-primary-500/60"></div>
	</div>

	<!-- Summary preview (expandable) -->
	{#if summaryPreview && showDetails}
		<div
			class="mt-4 mx-auto max-w-2xl"
			in:fade={{ duration: 200 }}
		>
			<div
				class="px-4 py-3 rounded-lg
					   bg-surface-800/50 border border-surface-700/50
					   text-xs text-surface-400 leading-relaxed"
			>
				<div class="flex items-center gap-2 mb-2 text-surface-500">
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<span class="font-medium">Context Summary</span>
				</div>
				<p class="whitespace-pre-wrap">{summaryPreview}</p>
			</div>
		</div>
	{/if}

	<!-- Decorative particles -->
	<div class="absolute left-1/4 top-1/2 -translate-y-1/2">
		<div class="particle particle-1"></div>
	</div>
	<div class="absolute right-1/4 top-1/2 -translate-y-1/2">
		<div class="particle particle-2"></div>
	</div>
	<div class="absolute left-1/3 top-1/3">
		<div class="particle particle-3"></div>
	</div>
	<div class="absolute right-1/3 bottom-1/3">
		<div class="particle particle-4"></div>
	</div>
</div>

<style>
	.glow-orb {
		width: 200px;
		height: 40px;
		background: radial-gradient(
			ellipse at center,
			rgba(59, 130, 246, 0.15) 0%,
			rgba(6, 182, 212, 0.1) 30%,
			transparent 70%
		);
		filter: blur(20px);
		animation: glowPulse 3s ease-in-out infinite;
	}

	@keyframes glowPulse {
		0%, 100% {
			opacity: 0.5;
			transform: scale(1);
		}
		50% {
			opacity: 0.8;
			transform: scale(1.1);
		}
	}

	.particle {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: linear-gradient(135deg, #3b82f6, #06b6d4);
		opacity: 0;
		animation: particleFloat 4s ease-in-out infinite;
	}

	.particle-1 { animation-delay: 0s; }
	.particle-2 { animation-delay: 1s; }
	.particle-3 { animation-delay: 2s; }
	.particle-4 { animation-delay: 3s; }

	@keyframes particleFloat {
		0%, 100% {
			opacity: 0;
			transform: translateY(0) scale(0);
		}
		20% {
			opacity: 0.6;
			transform: translateY(-10px) scale(1);
		}
		80% {
			opacity: 0.6;
			transform: translateY(-20px) scale(1);
		}
		100% {
			opacity: 0;
			transform: translateY(-30px) scale(0);
		}
	}

	/* Light mode */
	:global(html.light) .glow-orb {
		background: radial-gradient(
			ellipse at center,
			rgba(59, 130, 246, 0.1) 0%,
			rgba(6, 182, 212, 0.05) 30%,
			transparent 70%
		);
	}
</style>
