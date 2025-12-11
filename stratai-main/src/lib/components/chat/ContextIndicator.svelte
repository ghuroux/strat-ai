<script lang="ts">
	import { scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { getContextStatus, formatTokenCount, type ContextStatus } from '$lib/services/tokenEstimation';

	interface Props {
		usagePercent: number;
		estimatedTokens: number;
		contextWindowSize: number;
		isCompacting?: boolean;
		oncompact: () => void;
		disabled?: boolean;
	}

	let {
		usagePercent,
		estimatedTokens,
		contextWindowSize,
		isCompacting = false,
		oncompact,
		disabled = false
	}: Props = $props();

	// Determine status based on usage
	let status: ContextStatus = $derived(getContextStatus(usagePercent));

	// Color configurations for each status - matching the inline indicator style
	const statusConfig = {
		safe: {
			text: 'text-emerald-400',
			hoverBg: 'hover:bg-emerald-500/10',
			iconColor: 'text-emerald-400'
		},
		warning: {
			text: 'text-amber-400',
			hoverBg: 'hover:bg-amber-500/10',
			iconColor: 'text-amber-400'
		},
		critical: {
			text: 'text-red-400',
			hoverBg: 'hover:bg-red-500/10',
			iconColor: 'text-red-400'
		}
	};

	let config = $derived(statusConfig[status]);

	// Format display percentage
	let displayPercent = $derived(Math.round(usagePercent));
</script>

<div
	class="context-indicator flex items-center gap-1.5"
	in:scale={{ duration: 200, start: 0.9, easing: backOut }}
>
	<!-- Inline context info - matches Extended thinking / Web search style -->
	<span class="flex items-center gap-1.5 text-xs {config.text}">
		<!-- Small circular progress indicator -->
		<span class="relative w-4 h-4 flex items-center justify-center">
			<svg class="w-full h-full -rotate-90" viewBox="0 0 20 20">
				<!-- Background track -->
				<circle
					cx="10"
					cy="10"
					r="7"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="opacity-20"
				/>
				<!-- Progress arc -->
				<circle
					cx="10"
					cy="10"
					r="7"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-dasharray={2 * Math.PI * 7}
					stroke-dashoffset={2 * Math.PI * 7 - (usagePercent / 100) * 2 * Math.PI * 7}
					class="transition-all duration-300"
				/>
			</svg>
			{#if status === 'critical'}
				<span class="absolute inset-0 rounded-full animate-ping opacity-30 bg-red-400"></span>
			{/if}
		</span>

		<span class="font-medium">{displayPercent}%</span>
		<span class="text-surface-500 text-[10px]">
			{formatTokenCount(estimatedTokens)}/{formatTokenCount(contextWindowSize)}
		</span>
	</span>

	<!-- Compact button - subtle, appears inline -->
	<button
		type="button"
		onclick={() => oncompact()}
		disabled={disabled || isCompacting}
		class="compact-btn p-1 rounded-md transition-all duration-200
			   {config.hoverBg} {config.text}
			   disabled:opacity-40 disabled:cursor-not-allowed
			   hover:scale-105 active:scale-95"
		title="Compact conversation"
	>
		{#if isCompacting}
			<svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle
					class="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="3"
				/>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				/>
			</svg>
		{:else}
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
				/>
			</svg>
		{/if}
	</button>
</div>

<style>
	.compact-btn {
		opacity: 0.6;
	}

	.compact-btn:hover {
		opacity: 1;
	}

	.context-indicator:hover .compact-btn {
		opacity: 1;
	}
</style>
