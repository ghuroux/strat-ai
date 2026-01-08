<script lang="ts">
	import { Trophy, Check, AlertCircle, ChevronDown, ChevronUp, FileText } from 'lucide-svelte';
	import type { ArenaJudgment, ArenaModel } from '$lib/stores/arena.svelte';

	interface Props {
		judgment?: ArenaJudgment | null;
		isJudging?: boolean;
		models: ArenaModel[];
		userVote?: string;
	}

	let { judgment, isJudging = false, models, userVote }: Props = $props();
	let analysisExpanded = $state(false);

	// Get model display name
	function getModelName(modelId: string): string {
		const model = models.find((m) => m.id === modelId);
		return model?.displayName || modelId;
	}

	// Get provider badge color
	function getProviderColor(modelId: string): string {
		const model = models.find((m) => m.id === modelId);
		const provider = model?.provider || 'unknown';
		switch (provider.toLowerCase()) {
			case 'anthropic':
				return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
			case 'openai':
				return 'bg-green-500/20 text-green-400 border-green-500/30';
			case 'google':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
			case 'meta':
				return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
			case 'deepseek':
				return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
			default:
				return 'bg-surface-600/50 text-surface-400 border-surface-500/30';
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
				provider: models.find(m => m.id === modelId)?.provider || 'unknown',
				isWinner: modelId === judgment?.winnerId,
				isUserPick: modelId === userVote
			}));
	});

	// Get max score for bar chart scaling
	let maxScore = $derived(() => {
		const scores = rankedModels();
		return scores.length > 0 ? Math.max(...scores.map(r => r.score)) : 10;
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
			<div class="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary-500 to-accent-500">
				<Trophy class="w-5 h-5 text-white" />
			</div>
			<div>
				<h3 class="font-semibold text-surface-100">AI Judge Verdict</h3>
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
			<!-- User pick and Judge comparison -->
			{#if userVote}
				<div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 p-4 rounded-xl bg-surface-800/50">
					<div class="text-center">
						<span class="text-xs text-surface-500 uppercase tracking-wider">Your Pick</span>
						<div class="mt-1 font-semibold text-surface-100">{getModelName(userVote)}</div>
					</div>
					<div class="hidden sm:block text-2xl text-surface-600">vs</div>
					<div class="text-center">
						<span class="text-xs text-surface-500 uppercase tracking-wider">AI Judge</span>
						<div class="mt-1 font-semibold text-accent-400">{judgment.winnerId ? getModelName(judgment.winnerId) : 'Tie'}</div>
					</div>
				</div>

				<!-- Agreement indicator -->
				<div class="flex justify-center mb-6">
					{#if userAgreed() === true}
						<div class="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-400">
							<Check class="w-4 h-4" />
							<span class="font-medium">You agreed with the judge!</span>
						</div>
					{:else if userAgreed() === false}
						<div class="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-400">
							<AlertCircle class="w-4 h-4" />
							<span class="font-medium">Different picks - interesting perspective!</span>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Winner announcement (when user skipped voting) -->
				<div class="text-center mb-6">
					{#if judgment.winnerId}
						<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/20 border border-accent-500/30 mb-2">
							<Trophy class="w-4 h-4 text-accent-400" />
							<span class="font-semibold text-accent-400">Winner</span>
						</div>
						<h4 class="text-2xl font-bold text-gradient">{getModelName(judgment.winnerId)}</h4>
					{:else}
						<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-700 mb-2">
							<span class="font-semibold text-surface-300">It's a Tie!</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Score Bar Chart -->
			<div class="space-y-3 mb-6">
				<h4 class="text-sm font-medium text-surface-400">Rankings</h4>
				{#each rankedModels() as ranked}
					<div class="flex items-center gap-3">
						<span class="w-6 text-sm font-bold {ranked.rank === 1 ? 'text-accent-400' : 'text-surface-500'}">
							#{ranked.rank}
						</span>
						<div class="flex-1">
							<div class="flex items-center justify-between mb-1">
								<div class="flex items-center gap-2">
									<span class="px-1.5 py-0.5 rounded text-[10px] font-medium border {getProviderColor(ranked.modelId)}">
										{ranked.provider}
									</span>
									<span class="text-sm font-medium text-surface-200">
										{ranked.name}
									</span>
									{#if ranked.isUserPick}
										<span class="text-xs text-primary-400">(your pick)</span>
									{/if}
								</div>
								<span class="text-sm font-semibold {ranked.score >= 8 ? 'text-green-400' : ranked.score >= 6 ? 'text-amber-400' : 'text-red-400'}">
									{ranked.score}/10
								</span>
							</div>
							<div class="h-2 rounded-full bg-surface-800 overflow-hidden">
								<div
									class="h-full rounded-full transition-all duration-500 {ranked.rank === 1 ? 'bg-gradient-to-r from-primary-500 to-accent-500' : 'bg-surface-600'}"
									style="width: {(ranked.score / 10) * 100}%"
								></div>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Expandable Analysis -->
			<div class="rounded-xl border border-surface-700 overflow-hidden">
				<button
					type="button"
					onclick={() => analysisExpanded = !analysisExpanded}
					class="w-full flex items-center justify-between p-4 bg-surface-800/50 hover:bg-surface-800 transition-colors"
				>
					<div class="flex items-center gap-2 text-sm font-medium text-surface-300">
						<FileText class="w-4 h-4 text-surface-500" />
						Detailed Analysis
					</div>
					{#if analysisExpanded}
						<ChevronUp class="w-4 h-4 text-surface-500" />
					{:else}
						<ChevronDown class="w-4 h-4 text-surface-500" />
					{/if}
				</button>
				{#if analysisExpanded}
					<div class="p-4 bg-surface-900 border-t border-surface-700">
						<p class="text-surface-400 text-sm leading-relaxed whitespace-pre-wrap">{judgment.analysis}</p>

						<!-- Criteria -->
						{#if judgment.criteria && judgment.criteria.length > 0}
							<div class="mt-4 pt-4 border-t border-surface-700/50">
								<div class="flex flex-wrap gap-2 items-center">
									<span class="text-xs text-surface-500">Evaluated on:</span>
									{#each judgment.criteria as criterion}
										<span class="px-2 py-0.5 rounded text-xs bg-surface-800 text-surface-400 border border-surface-700">
											{criterion}
										</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
