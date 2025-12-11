<script lang="ts">
	interface Props {
		query?: string;
	}

	let { query }: Props = $props();
</script>

<div class="searching-indicator flex items-center gap-3 py-3">
	<!-- Animated search icon -->
	<div class="relative">
		<svg class="w-5 h-5 text-primary-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
		<!-- Orbiting dot animation -->
		<div class="search-orbit"></div>
	</div>

	<!-- Search text with query -->
	<div class="flex flex-col">
		<span class="text-sm text-surface-300 font-medium">Searching the web</span>
		{#if query}
			<span class="text-xs text-surface-500 truncate max-w-[200px]">"{query}"</span>
		{/if}
	</div>

	<!-- Progress bar animation -->
	<div class="flex-1 h-1 bg-surface-700 rounded-full overflow-hidden ml-2">
		<div class="search-progress-bar h-full bg-gradient-to-r from-primary-600 to-accent-500"></div>
	</div>
</div>

<style>
	.search-orbit {
		position: absolute;
		width: 6px;
		height: 6px;
		background: linear-gradient(135deg, var(--color-primary-400), var(--color-accent-400));
		border-radius: 50%;
		animation: orbit 1.5s linear infinite;
	}

	@keyframes orbit {
		0% {
			transform: rotate(0deg) translateX(12px) rotate(0deg);
			opacity: 0.8;
		}
		50% {
			opacity: 1;
		}
		100% {
			transform: rotate(360deg) translateX(12px) rotate(-360deg);
			opacity: 0.8;
		}
	}

	.search-progress-bar {
		width: 30%;
		animation: progress 1.5s ease-in-out infinite;
	}

	@keyframes progress {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(400%);
		}
	}
</style>
