<script lang="ts">
	import { slide } from 'svelte/transition';
	import MarkdownRenderer from './MarkdownRenderer.svelte';
	import type { StructuredSummary, SummaryPoint } from '$lib/types/chat';

	interface Props {
		summary: StructuredSummary | string | null;
		isGenerating?: boolean;
		onGenerate: () => void;
		onDismiss: () => void;
		onScrollToMessage?: (index: number) => void;
	}

	let { summary, isGenerating = false, onGenerate, onDismiss, onScrollToMessage }: Props = $props();

	let isCollapsed = $state(false);

	// Check if summary is structured format
	let isStructured = $derived(
		summary !== null && typeof summary === 'object' && 'points' in summary
	);

	// Get points array if structured, otherwise null
	let summaryPoints = $derived(
		isStructured ? (summary as StructuredSummary).points : null
	);

	// Convert legacy string summary to markdown for display
	let legacySummary = $derived(
		!isStructured && typeof summary === 'string' ? summary : null
	);

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleCollapse();
		}
	}

	function handlePointClick(point: SummaryPoint) {
		if (onScrollToMessage && point.messageIndices.length > 0) {
			// Scroll to the first referenced message
			onScrollToMessage(point.messageIndices[0]);
		}
	}

	function handlePointKeydown(e: KeyboardEvent, point: SummaryPoint) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handlePointClick(point);
		}
	}
</script>

<!-- Summary Card - only shown when summary exists or is generating -->
<div
	class="mt-4 rounded-xl border border-surface-700 bg-surface-800/50 overflow-hidden"
	transition:slide={{ duration: 200 }}
>
	<!-- Header - always visible -->
	<div class="flex items-center justify-between px-4 py-3">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="flex-1 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
			onclick={toggleCollapse}
			onkeydown={handleKeydown}
			role="button"
			tabindex="0"
		>
			<svg class="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			<span class="text-sm font-medium text-surface-200">Conversation Summary</span>
			{#if isGenerating}
				<span class="flex items-center gap-1.5 text-xs text-primary-400">
					<span class="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse"></span>
					Generating...
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<!-- Dismiss button -->
			<button
				type="button"
				class="p-1 rounded hover:bg-surface-600 text-surface-400 hover:text-surface-200 transition-colors"
				onclick={onDismiss}
				title="Dismiss summary"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
			<!-- Collapse toggle button -->
			<button
				type="button"
				class="p-1 rounded hover:bg-surface-600 text-surface-400 hover:text-surface-200 transition-colors"
				onclick={toggleCollapse}
				title={isCollapsed ? 'Expand' : 'Collapse'}
			>
				<svg
					class="w-4 h-4 transition-transform duration-200 {isCollapsed ? '' : 'rotate-180'}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Content -->
	{#if !isCollapsed}
		<div class="px-4 pb-4" transition:slide={{ duration: 150 }}>
			{#if isGenerating}
				<div class="flex items-center gap-3 py-2">
					<div class="flex gap-1">
						<span class="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
						<span class="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
						<span class="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
					</div>
					<span class="text-sm text-surface-400">Analyzing conversation...</span>
				</div>
			{:else if summaryPoints}
				<!-- Structured summary with clickable points -->
				<ul class="summary-points space-y-2">
					{#each summaryPoints as point, i (i)}
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<li
							class="summary-point flex items-start gap-2 text-sm text-surface-300 {point.messageIndices.length > 0 ? 'cursor-pointer hover:text-surface-100' : ''}"
							onclick={() => handlePointClick(point)}
							onkeydown={(e) => handlePointKeydown(e, point)}
							role={point.messageIndices.length > 0 ? 'button' : undefined}
							tabindex={point.messageIndices.length > 0 ? 0 : undefined}
						>
							<span class="flex-shrink-0 mt-1">
								{#if point.messageIndices.length > 0}
									<!-- Link icon for clickable points -->
									<svg class="w-3.5 h-3.5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
									</svg>
								{:else}
									<!-- Bullet for non-clickable points -->
									<span class="w-1.5 h-1.5 bg-surface-500 rounded-full inline-block"></span>
								{/if}
							</span>
							<span class="flex-1">{point.text}</span>
						</li>
					{/each}
				</ul>
			{:else if legacySummary}
				<!-- Legacy string summary - render with markdown -->
				<div class="summary-content text-sm text-surface-300">
					<MarkdownRenderer content={legacySummary} />
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.summary-point {
		transition: all 0.15s ease;
		padding: 0.375rem 0.5rem;
		margin: -0.375rem -0.5rem;
		border-radius: 0.375rem;
	}

	.summary-point:hover {
		background-color: rgba(var(--color-surface-700), 0.5);
	}

	.summary-point:focus-visible {
		outline: 2px solid rgba(var(--color-primary-400), 0.5);
		outline-offset: 2px;
	}
</style>
