<script lang="ts">
	import { fly } from 'svelte/transition';
	import MarkdownRenderer from './MarkdownRenderer.svelte';
	import ThinkingDisplay from './ThinkingDisplay.svelte';
	import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';

	interface Props {
		content: string;
		thinking: string;
		isStreaming: boolean;
		modelId: string | null;
		error: string | null;
		onUseAnswer: () => void;
		onFork: () => void;
		onClose: () => void;
	}

	let { content, thinking, isStreaming, modelId, error, onUseAnswer, onFork, onClose }: Props = $props();

	// Get model display info
	let displayName = $derived(modelId ? modelCapabilitiesStore.getDisplayName(modelId) : 'Model');
	let provider = $derived(modelId ? modelCapabilitiesStore.getProvider(modelId) : 'openai');

	// Provider colors for badge
	const providerColors: Record<string, { bg: string; text: string; border: string }> = {
		anthropic: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
		openai: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
		google: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
		meta: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
		amazon: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
		deepseek: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
		mistral: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' }
	};

	let colors = $derived(providerColors[provider] || providerColors.openai);

	// Provider display names
	const providerNames: Record<string, string> = {
		anthropic: 'Anthropic',
		openai: 'OpenAI',
		google: 'Google',
		meta: 'Meta',
		amazon: 'Amazon',
		deepseek: 'DeepSeek',
		mistral: 'Mistral'
	};

	let providerDisplayName = $derived(providerNames[provider] || provider);

	// Handle keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<aside
	class="second-opinion-panel w-[40vw] min-w-80 max-w-2xl h-full flex flex-col bg-surface-900/95 backdrop-blur-sm border-l border-surface-700 shadow-2xl"
	transition:fly={{ x: 600, duration: 300, opacity: 1 }}
>
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-surface-700">
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-2">
				<svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
				</svg>
				<span class="font-semibold text-surface-100">Second Opinion</span>
			</div>
		</div>

		<button
			type="button"
			onclick={onClose}
			class="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-colors"
			title="Close (Esc)"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Model Badge -->
	<div class="px-4 py-3 border-b border-surface-800">
		<div class="flex items-center gap-2">
			<div class={`px-2.5 py-1 rounded-lg text-sm font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
				{displayName}
			</div>
			<span class="text-xs text-surface-500">{providerDisplayName}</span>
		</div>
	</div>

	<!-- Content Area -->
	<div class="flex-1 overflow-y-auto p-4">
		{#if error}
			<!-- Error State -->
			<div class="flex flex-col items-center justify-center h-full text-center">
				<div class="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
					<svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<p class="text-red-400 font-medium mb-1">Failed to get second opinion</p>
				<p class="text-sm text-surface-500">{error}</p>
			</div>
		{:else if !content && !thinking && isStreaming}
			<!-- Loading State -->
			<div class="flex flex-col items-center justify-center h-full">
				<div class="relative">
					<div class="w-8 h-8 border-2 border-primary-500/30 rounded-full"></div>
					<div class="absolute inset-0 w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
				</div>
				<p class="mt-4 text-sm text-surface-400">Getting second opinion...</p>
			</div>
		{:else}
			<!-- Thinking Block -->
			{#if thinking}
				<div class="mb-4">
					<ThinkingDisplay thinking={thinking} isThinking={isStreaming && !content} hasContent={!!content} />
				</div>
			{/if}

			<!-- Response Content -->
			{#if content}
				<div class="prose prose-invert prose-sm max-w-none">
					<MarkdownRenderer {content} isStreaming={isStreaming} />
				</div>
			{/if}

			<!-- Streaming indicator -->
			{#if isStreaming && content}
				<div class="mt-4 flex items-center gap-2 text-xs text-surface-500">
					<div class="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></div>
					<span>Generating...</span>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Action Buttons -->
	{#if content && !isStreaming && !error}
		<div class="p-4 border-t border-surface-700 space-y-2">
			<button
				type="button"
				onclick={onUseAnswer}
				class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
					   bg-gradient-to-r from-primary-500 to-accent-500 text-white
					   hover:shadow-glow transition-all duration-200"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				Use This Answer
			</button>

			<button
				type="button"
				onclick={onFork}
				class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
					   bg-surface-700 text-surface-200 hover:bg-surface-600 transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
				</svg>
				Continue with {displayName}
			</button>
		</div>
	{/if}

	<!-- Dismiss hint when streaming -->
	{#if isStreaming}
		<div class="px-4 py-2 border-t border-surface-800 text-center">
			<span class="text-xs text-surface-500">Press Esc or send a message to close</span>
		</div>
	{/if}
</aside>

<style>
	.second-opinion-panel {
		/* Premium glassmorphism effect */
		box-shadow:
			-4px 0 24px rgba(0, 0, 0, 0.3),
			inset 1px 0 0 rgba(255, 255, 255, 0.05);
	}

	/* Smooth scrollbar */
	.second-opinion-panel :global(::-webkit-scrollbar) {
		width: 6px;
	}

	.second-opinion-panel :global(::-webkit-scrollbar-track) {
		background: transparent;
	}

	.second-opinion-panel :global(::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
	}

	.second-opinion-panel :global(::-webkit-scrollbar-thumb:hover) {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
