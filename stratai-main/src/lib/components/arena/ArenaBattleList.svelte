<script lang="ts">
	import { arenaStore, type ArenaBattle } from '$lib/stores/arena.svelte';

	interface Props {
		battles?: ArenaBattle[];
		activeBattleId?: string | null;
		onSelectBattle?: (battleId: string) => void;
		onNewBattle?: () => void;
	}

	let { battles, activeBattleId, onSelectBattle, onNewBattle }: Props = $props();

	// Get battles sorted by date (newest first)
	// Use provided battles or fall back to store
	let sortedBattles = $derived(
		(battles || [...arenaStore.battles.values()]).sort((a, b) => b.createdAt - a.createdAt)
	);

	// Format relative time
	function formatRelativeTime(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;

		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return 'Just now';
	}

	// Get status badge color
	function getStatusColor(status: ArenaBattle['status']): string {
		switch (status) {
			case 'streaming':
				return 'bg-primary-500/20 text-primary-400';
			case 'judging':
				return 'bg-amber-500/20 text-amber-400';
			case 'judged':
				return 'bg-green-500/20 text-green-400';
			case 'complete':
				return 'bg-surface-600 text-surface-300';
			default:
				return 'bg-surface-700 text-surface-400';
		}
	}

	// Get winner name
	function getWinnerName(battle: ArenaBattle): string | null {
		if (!battle.aiJudgment?.winnerId) return null;
		const winner = battle.models.find((m) => m.id === battle.aiJudgment?.winnerId);
		return winner?.displayName || null;
	}

	function handleClearHistory() {
		if (confirm('Clear all battle history? This cannot be undone.')) {
			arenaStore.clearHistory();
		}
	}
</script>

<div class="arena-battle-list w-64 h-full flex flex-col bg-surface-900 border-r border-surface-800">
	<!-- Header with New Battle button -->
	<div class="p-3 border-b border-surface-700">
		<button
			type="button"
			onclick={() => onNewBattle?.()}
			class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
				   bg-gradient-to-r from-primary-500 to-accent-500 text-white
				   hover:shadow-glow transition-all duration-200"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
			</svg>
			New Battle
		</button>
	</div>

	<!-- Section Header -->
	<div class="flex items-center justify-between px-4 py-2 border-b border-surface-800">
		<span class="text-xs font-medium text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
				/>
			</svg>
			History
		</span>
		{#if sortedBattles.length > 0}
			<button
				type="button"
				onclick={handleClearHistory}
				class="text-xs text-surface-500 hover:text-surface-300 transition-colors"
			>
				Clear
			</button>
		{/if}
	</div>

	<!-- Battle List -->
	<div class="flex-1 overflow-y-auto">
		{#if sortedBattles.length === 0}
			<div class="p-4 text-center text-surface-500">
				<svg
					class="w-12 h-12 mx-auto mb-3 text-surface-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
				<p class="text-sm">No battles yet</p>
				<p class="text-xs mt-1">Start a battle to see history</p>
			</div>
		{:else}
			<div class="divide-y divide-surface-800">
				{#each sortedBattles as battle (battle.id)}
					<button
						type="button"
						onclick={() => onSelectBattle?.(battle.id)}
						class="w-full text-left p-3 hover:bg-surface-800/50 transition-colors
							   {activeBattleId === battle.id ? 'bg-surface-800' : ''}"
					>
						<!-- Prompt preview -->
						<p class="text-sm text-surface-200 line-clamp-2 mb-2">
							{battle.prompt}
						</p>

						<!-- Meta info -->
						<div class="flex items-center justify-between text-xs">
							<div class="flex items-center gap-2">
								<!-- Model count -->
								<span class="text-surface-500">
									{battle.models.length} models
								</span>

								<!-- Status -->
								<span class="px-1.5 py-0.5 rounded {getStatusColor(battle.status)}">
									{battle.status}
								</span>
							</div>

							<!-- Time -->
							<span class="text-surface-500">
								{formatRelativeTime(battle.createdAt)}
							</span>
						</div>

						<!-- Winner (if judged) -->
						{#if battle.aiJudgment?.winnerId}
							{@const winnerName = getWinnerName(battle)}
							{#if winnerName}
								<div class="mt-2 flex items-center gap-1.5 text-xs text-accent-400">
									<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
										<path
											d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
										/>
									</svg>
									{winnerName}
								</div>
							{/if}
						{:else if battle.aiJudgment && !battle.aiJudgment.winnerId}
							<div class="mt-2 flex items-center gap-1.5 text-xs text-surface-400">
								<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 12h.01M12 12h.01M16 12h.01"
									/>
								</svg>
								Tie
							</div>
						{/if}

						<!-- User vote indicator -->
						{#if battle.userVote}
							{@const votedModel = battle.models.find((m) => m.id === battle.userVote)}
							{#if votedModel}
								<div class="mt-1 flex items-center gap-1.5 text-xs text-primary-400">
									<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										/>
									</svg>
									You picked {votedModel.displayName}
								</div>
							{/if}
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Footer stats -->
	{#if sortedBattles.length > 0}
		<div class="px-4 py-2 border-t border-surface-800 text-xs text-surface-500">
			{sortedBattles.length} battle{sortedBattles.length !== 1 ? 's' : ''} saved
		</div>
	{/if}
</div>
