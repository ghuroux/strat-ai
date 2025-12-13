<script lang="ts">
	import MarkdownRenderer from '$lib/components/chat/MarkdownRenderer.svelte';
	import ThinkingDisplay from '$lib/components/chat/ThinkingDisplay.svelte';
	import AIResponseIndicator from '$lib/components/chat/AIResponseIndicator.svelte';
	import CodeBlockDownloader from '$lib/components/chat/CodeBlockDownloader.svelte';
	import type { ArenaResponse } from '$lib/stores/arena.svelte';
	import { MODEL_CAPABILITIES } from '$lib/config/model-capabilities';
	import { extractCodeBlocks } from '$lib/utils/codeBlocks';

	interface Props {
		response: ArenaResponse;
		modelName: string;
		modelId: string;
		provider: string;
		isWinner?: boolean;
		isUserVote?: boolean;
		score?: number;
		onVote: () => void;
		canVote?: boolean;
		blindMode?: boolean;
		hasVoted?: boolean;
	}

	let {
		response,
		modelName,
		modelId,
		provider,
		isWinner = false,
		isUserVote = false,
		score,
		onVote,
		canVote = false,
		blindMode = false,
		hasVoted = false
	}: Props = $props();

	// Determine if model name should be revealed
	let showModelName = $derived(!blindMode || hasVoted || isUserVote);

	// Determine AI state for indicator
	type AIState = 'processing' | 'reasoning' | 'searching' | 'generating' | 'complete';
	let aiState = $derived<AIState>(
		!response.isStreaming && !response.isThinking ? 'complete' :
		response.searchStatus === 'searching' ? 'searching' :
		response.isThinking ? 'reasoning' :
		response.isStreaming && response.content ? 'generating' :
		response.isStreaming ? 'processing' :
		'complete'
	);

	// Get provider color
	function getProviderColor(p: string): string {
		switch (p.toLowerCase()) {
			case 'anthropic':
				return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
			case 'openai':
				return 'bg-green-500/20 text-green-400 border-green-500/30';
			default:
				return 'bg-surface-600/50 text-surface-400 border-surface-500/30';
		}
	}

	// Format duration
	function formatDuration(ms?: number): string {
		if (!ms) return '';
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}

	// Format token count
	function formatTokens(count?: number): string {
		if (!count) return '-';
		if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
		return count.toString();
	}

	// Format cost
	function formatCost(cost?: number): string {
		if (!cost) return '-';
		if (cost < 0.01) return `$${cost.toFixed(4)}`;
		return `$${cost.toFixed(3)}`;
	}

	// Calculate estimated cost based on model pricing
	function calculateCost(): number | undefined {
		const metrics = response.metrics;
		if (!metrics?.inputTokens && !metrics?.outputTokens) return undefined;

		const caps = MODEL_CAPABILITIES[modelId];
		if (!caps?.pricing) return undefined;

		const inputCost = ((metrics.inputTokens || 0) / 1_000_000) * caps.pricing.input;
		const outputCost = ((metrics.outputTokens || 0) / 1_000_000) * caps.pricing.output;
		return inputCost + outputCost;
	}

	let estimatedCost = $derived(calculateCost());

	// Check for code blocks in content
	let hasCodeBlocks = $derived(
		response.content ? extractCodeBlocks(response.content).length > 0 : false
	);

	// Time to first token
	let timeToFirstToken = $derived(
		response.firstTokenAt && response.startedAt
			? response.firstTokenAt - response.startedAt
			: undefined
	);
</script>

<div
	class="arena-response-card flex flex-col h-full min-h-[400px] rounded-2xl border transition-all duration-300
		   {isWinner
			? 'bg-accent-500/5 border-accent-500/50 shadow-glow-accent'
			: isUserVote
				? 'bg-primary-500/5 border-primary-500/50 shadow-glow'
				: 'bg-surface-800 border-surface-700'}"
>
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-surface-700/50">
		<div class="flex items-center gap-2">
			{#if showModelName}
				<span class="px-2 py-0.5 rounded text-xs font-medium border {getProviderColor(provider)}">
					{provider}
				</span>
				<span class="font-medium text-surface-100 truncate">{modelName}</span>
			{:else}
				<span class="px-2 py-0.5 rounded text-xs font-medium border bg-surface-600/50 text-surface-400 border-surface-500/30">
					Hidden
				</span>
				<span class="font-medium text-surface-400 italic">Model {response.id.slice(0, 4)}</span>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<!-- Score badge -->
			{#if score !== undefined && showModelName}
				<span class="px-2 py-0.5 rounded text-xs font-medium
							 {score >= 8 ? 'bg-green-500/20 text-green-400' :
							  score >= 6 ? 'bg-amber-500/20 text-amber-400' :
							  'bg-red-500/20 text-red-400'}">
					{score}/10
				</span>
			{/if}

			<!-- Winner badge -->
			{#if isWinner && showModelName}
				<span class="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-500/20 text-accent-400">
					<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
					</svg>
					Winner
				</span>
			{/if}

			<!-- Duration -->
			{#if response.durationMs}
				<span class="text-xs text-surface-500">
					{formatDuration(response.durationMs)}
				</span>
			{/if}
		</div>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto p-4">
		{#if response.error}
			<!-- Error state -->
			<div class="flex items-center gap-2 text-red-400 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
				<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span class="text-sm">{response.error}</span>
			</div>
		{:else if aiState !== 'complete' && !response.content && !response.thinking}
			<!-- Loading state -->
			<AIResponseIndicator
				state={aiState}
				searchQuery={response.searchQuery}
				sources={response.sources}
			/>
		{:else}
			<!-- Thinking display (if any) -->
			{#if response.thinking}
				<ThinkingDisplay
					thinking={response.thinking}
					isThinking={response.isThinking}
					hasContent={!!response.content}
				/>
			{/if}

			<!-- Main content -->
			{#if response.content}
				<div class="prose prose-invert prose-sm max-w-none">
					<MarkdownRenderer content={response.content} />
				</div>

				<!-- Code block downloads -->
				{#if hasCodeBlocks && !response.isStreaming}
					<CodeBlockDownloader content={response.content} />
				{/if}
			{/if}

			<!-- Sources -->
			{#if response.sources && response.sources.length > 0}
				<div class="mt-4 pt-4 border-t border-surface-700/50">
					<div class="text-xs text-surface-500 mb-2">Sources ({response.sources.length})</div>
					<div class="space-y-1">
						{#each response.sources.slice(0, 3) as source}
							<a
								href={source.url}
								target="_blank"
								rel="noopener noreferrer"
								class="block text-xs text-primary-400 hover:text-primary-300 truncate"
							>
								{source.title}
							</a>
						{/each}
						{#if response.sources.length > 3}
							<span class="text-xs text-surface-500">+{response.sources.length - 3} more</span>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Streaming cursor -->
			{#if response.isStreaming && response.content}
				<span class="inline-block w-2 h-4 bg-primary-500 animate-pulse ml-0.5"></span>
			{/if}
		{/if}
	</div>

	<!-- Metrics bar -->
	{#if (response.metrics || timeToFirstToken || response.durationMs) && aiState === 'complete'}
		<div class="px-4 py-2 border-t border-surface-700/30 bg-surface-800/50">
			<div class="flex items-center justify-between text-xs text-surface-500">
				<div class="flex items-center gap-3">
					<!-- Tokens -->
					{#if response.metrics?.inputTokens || response.metrics?.outputTokens}
						<span class="flex items-center gap-1" title="Input / Output tokens">
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
							</svg>
							{formatTokens(response.metrics?.inputTokens)} / {formatTokens(response.metrics?.outputTokens)}
						</span>
					{/if}

					<!-- Time to first token -->
					{#if timeToFirstToken}
						<span class="flex items-center gap-1" title="Time to first token">
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
							{formatDuration(timeToFirstToken)} TTFT
						</span>
					{/if}
				</div>

				<!-- Cost -->
				{#if estimatedCost}
					<span class="flex items-center gap-1 text-surface-400" title="Estimated cost">
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{formatCost(estimatedCost)}
					</span>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Footer with vote button -->
	<div class="p-4 border-t border-surface-700/50">
		<button
			type="button"
			onclick={onVote}
			disabled={!canVote}
			class="w-full py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2
				   {isUserVote
					? 'bg-primary-500 text-white'
					: canVote
						? 'bg-surface-700 text-surface-300 hover:bg-surface-600 hover:text-surface-100'
						: 'bg-surface-800 text-surface-500 cursor-not-allowed'}"
		>
			{#if isUserVote}
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
				Your Pick
			{:else}
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
				</svg>
				Vote
			{/if}
		</button>
	</div>
</div>
