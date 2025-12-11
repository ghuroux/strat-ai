<script lang="ts">
	import { slide } from 'svelte/transition';

	interface Props {
		summary: string | null;
		isGenerating?: boolean;
		onGenerate: () => void;
		onDismiss: () => void;
	}

	let { summary, isGenerating = false, onGenerate, onDismiss }: Props = $props();

	let isCollapsed = $state(false);

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleCollapse();
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
			{:else if summary}
				<div class="prose prose-sm prose-invert max-w-none">
					<ul class="space-y-1.5 text-sm text-surface-300 list-disc list-inside pl-1">
						{#each summary.split('\n').filter(line => line.trim()) as point}
							<li>{point.replace(/^[-•*]\s*/, '')}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}
</div>
