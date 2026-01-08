<script lang="ts">
	import { ThumbsUp, SkipForward } from 'lucide-svelte';
	import type { ArenaModel } from '$lib/stores/arena.svelte';

	interface Props {
		models: ArenaModel[];
		onVote: (modelId: string) => void;
		onSkip: () => void;
	}

	let { models, onVote, onSkip }: Props = $props();

	// Provider color mapping
	function getProviderColor(provider: string): string {
		switch (provider.toLowerCase()) {
			case 'anthropic':
				return 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30';
			case 'openai':
				return 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30';
			case 'google':
				return 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30';
			case 'meta':
				return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/30';
			case 'deepseek':
				return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30';
			case 'mistral':
				return 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30';
			default:
				return 'bg-surface-600/50 text-surface-400 border-surface-500/30 hover:bg-surface-600';
		}
	}
</script>

<div class="voting-prompt mt-8 p-6 rounded-2xl bg-surface-800/50 border border-surface-700">
	<div class="text-center mb-6">
		<div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-500/20 mb-3">
			<ThumbsUp class="w-6 h-6 text-primary-400" />
		</div>
		<h3 class="text-lg font-semibold text-surface-100">Pick your winner</h3>
		<p class="mt-1 text-sm text-surface-400">
			Which response was most helpful? Your vote helps improve rankings.
		</p>
	</div>

	<div class="grid grid-cols-2 md:grid-cols-{models.length} gap-3 mb-4">
		{#each models as model}
			<button
				type="button"
				onclick={() => onVote(model.id)}
				class="group p-4 rounded-xl border transition-all duration-200
					border-surface-600 hover:border-surface-500 hover:bg-surface-700/50
					hover:scale-[1.02] active:scale-[0.98]"
			>
				<div class="flex flex-col items-center gap-2">
					<span class="px-2 py-0.5 rounded text-xs font-medium border {getProviderColor(model.provider)}">
						{model.provider}
					</span>
					<span class="text-sm font-medium text-surface-200 text-center">
						{model.displayName}
					</span>
					<div class="mt-2 px-3 py-1.5 rounded-lg bg-surface-700 text-xs text-surface-400 group-hover:bg-primary-500/20 group-hover:text-primary-300 transition-colors">
						Vote
					</div>
				</div>
			</button>
		{/each}
	</div>

	<div class="text-center">
		<button
			type="button"
			onclick={onSkip}
			class="inline-flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors"
		>
			<SkipForward class="w-3.5 h-3.5" />
			Skip voting
		</button>
	</div>
</div>
