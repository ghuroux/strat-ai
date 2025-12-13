<script lang="ts">
	import type { ArenaJudgment, ArenaModel } from '$lib/stores/arena.svelte';

	interface Props {
		judgment?: ArenaJudgment | null;
		isJudging?: boolean;
		models: ArenaModel[];
		userVote?: string;
	}

	let { judgment, isJudging = false, models, userVote }: Props = $props();

	// Get model display name
	function getModelName(modelId: string): string {
		const model = models.find((m) => m.id === modelId);
		return model?.displayName || modelId;
	}

	// Get provider color
	function getProviderColor(modelId: string): string {
		const model = models.find((m) => m.id === modelId);
		const provider = model?.provider || 'unknown';
		switch (provider.toLowerCase()) {
			case 'anthropic':
				return 'text-orange-400';
			case 'openai':
				return 'text-green-400';
			default:
				return 'text-surface-400';
		}
	}

	// Sort models by score (descending)
	let rankedModels = $derived(() => {
		if (!judgment?.scores) return [];
		return Object.entries(judgment.scores)
			.sort(([, a], [, b]) => b - a)
			.map(([modelId, score], index) => ({
				modelId,
				score,
				rank: index + 1,
				name: getModelName(modelId),
				isWinner: modelId === judgment?.winnerId,
				isUserPick: modelId === userVote
			}));
	});

	// Check if user agreed with AI
	let userAgreed = $derived(() => {
		if (!userVote || !judgment?.winnerId) return null;
		return userVote === judgment.winnerId;
	});
</script>

<div class="arena-judgment mt-6 rounded-2xl border border-surface-700 overflow-hidden">
	<!-- Header -->
	<div class="p-4 bg-surface-800/50 border-b border-surface-700">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: var(--gradient-primary);">
				<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</div>
			<div>
				<h3 class="font-semibold text-surface-100">AI Judge Analysis</h3>
				<p class="text-sm text-surface-400">Evaluated by Claude Sonnet 4.5</p>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="p-6 bg-surface-900">
		{#if isJudging}
			<!-- Loading state -->
			<div class="flex flex-col items-center justify-center py-8">
				<div class="w-8 h-8 rounded-full border-2 border-accent-500 border-t-transparent animate-spin mb-4"></div>
				<p class="text-surface-400">Analyzing responses...</p>
			</div>
		{:else if judgment}
			<!-- Winner announcement -->
			<div class="text-center mb-6">
				{#if judgment.winnerId}
					<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/20 border border-accent-500/30 mb-2">
						<svg class="w-5 h-5 text-accent-400" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
						</svg>
						<span class="font-semibold text-accent-400">Winner</span>
					</div>
					<h4 class="text-2xl font-bold text-gradient">{getModelName(judgment.winnerId)}</h4>
				{:else}
					<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-700 mb-2">
						<span class="font-semibold text-surface-300">It's a Tie!</span>
					</div>
				{/if}
			</div>

			<!-- User agreement indicator -->
			{#if userVote}
				<div class="flex justify-center mb-6">
					{#if userAgreed() === true}
						<div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-sm">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
							You agreed with the AI judge!
						</div>
					{:else if userAgreed() === false}
						<div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-400 text-sm">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							You picked {getModelName(userVote)} instead
						</div>
					{/if}
				</div>
			{/if}

			<!-- Rankings -->
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
				{#each rankedModels() as ranked}
					<div
						class="p-3 rounded-xl text-center transition-all
							   {ranked.isWinner
								? 'bg-accent-500/10 border border-accent-500/30'
								: 'bg-surface-800 border border-surface-700'}"
					>
						<div class="text-2xl font-bold mb-1
									{ranked.rank === 1 ? 'text-accent-400' :
									 ranked.rank === 2 ? 'text-surface-300' :
									 'text-surface-500'}">
							#{ranked.rank}
						</div>
						<div class="text-sm font-medium text-surface-200 truncate mb-1">
							{ranked.name}
						</div>
						<div class="text-lg font-semibold
									{ranked.score >= 8 ? 'text-green-400' :
									 ranked.score >= 6 ? 'text-amber-400' :
									 'text-red-400'}">
							{ranked.score}/10
						</div>
						{#if ranked.isUserPick}
							<div class="mt-1 text-xs text-primary-400">Your pick</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Analysis -->
			<div class="p-4 rounded-xl bg-surface-800/50 border border-surface-700">
				<h5 class="text-sm font-medium text-surface-300 mb-2 flex items-center gap-2">
					<svg class="w-4 h-4 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					Analysis
				</h5>
				<p class="text-surface-400 text-sm leading-relaxed whitespace-pre-wrap">{judgment.analysis}</p>
			</div>

			<!-- Criteria -->
			{#if judgment.criteria && judgment.criteria.length > 0}
				<div class="mt-4 flex flex-wrap gap-2">
					<span class="text-xs text-surface-500">Evaluated on:</span>
					{#each judgment.criteria as criterion}
						<span class="px-2 py-0.5 rounded text-xs bg-surface-800 text-surface-400 border border-surface-700">
							{criterion}
						</span>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>
