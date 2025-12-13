<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { arenaStore, type ArenaBattle } from '$lib/stores/arena.svelte';
	import ArenaBattleItem from './ArenaBattleItem.svelte';

	interface Props {
		battles?: ArenaBattle[];
		activeBattleId?: string | null;
		onSelectBattle?: (battleId: string) => void;
		onNewBattle?: () => void;
		onRerunBattle?: (battle: ArenaBattle) => void;
	}

	let { battles, activeBattleId, onSelectBattle, onNewBattle, onRerunBattle }: Props = $props();

	let openMenuId = $state<string | null>(null);

	// Get battles from props or store, split by pinned status
	let pinnedBattles = $derived.by(() => {
		const allBattles = battles || [...arenaStore.battles.values()];
		return allBattles.filter((b) => b.pinned).sort((a, b) => b.createdAt - a.createdAt);
	});

	let unpinnedBattles = $derived.by(() => {
		const allBattles = battles || [...arenaStore.battles.values()];
		return allBattles.filter((b) => !b.pinned).sort((a, b) => b.createdAt - a.createdAt);
	});

	let hasBattles = $derived(pinnedBattles.length > 0 || unpinnedBattles.length > 0);
	let hasPinnedBattles = $derived(pinnedBattles.length > 0);
	let totalBattles = $derived(pinnedBattles.length + unpinnedBattles.length);

	function handleMenuToggle(id: string, isOpen: boolean) {
		openMenuId = isOpen ? id : null;
	}

	function closeAllMenus() {
		openMenuId = null;
	}

	function handleBattleClick(id: string) {
		closeAllMenus();
		onSelectBattle?.(id);
	}

	function handleDeleteBattle(id: string) {
		arenaStore.deleteBattle(id);
	}

	function handlePinBattle(id: string) {
		arenaStore.togglePin(id);
	}

	function handleRenameBattle(id: string, newTitle: string) {
		arenaStore.updateBattleTitle(id, newTitle);
	}

	function handleRerunBattle(id: string) {
		const battle = arenaStore.battles.get(id);
		if (!battle) return;
		onRerunBattle?.(battle);
	}

	function handleExportBattle(id: string) {
		const battle = arenaStore.battles.get(id);
		if (!battle) return;

		// Convert battle to markdown
		const date = new Date(battle.createdAt);
		const dateStr = date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

		const title = battle.title || battle.prompt.slice(0, 50);
		let markdown = `# Arena Battle: ${title}\n\n`;
		markdown += `**Date:** ${dateStr}  \n`;
		markdown += `**Models:** ${battle.models.map((m) => m.displayName).join(', ')}  \n`;
		markdown += `**Status:** ${battle.status}\n\n`;
		markdown += `---\n\n`;
		markdown += `## Prompt\n\n${battle.prompt}\n\n`;
		markdown += `---\n\n`;

		// Add each model's response
		for (const response of battle.responses) {
			const model = battle.models.find((m) => m.id === response.modelId);
			markdown += `## ${model?.displayName || response.modelId}\n\n`;

			if (response.thinking) {
				markdown += `### Thinking\n\n${response.thinking}\n\n`;
			}

			markdown += `### Response\n\n${response.content}\n\n`;

			if (response.error) {
				markdown += `**Error:** ${response.error}\n\n`;
			}

			markdown += `---\n\n`;
		}

		// Add judgment if present
		if (battle.aiJudgment) {
			markdown += `## AI Judgment\n\n`;
			if (battle.aiJudgment.winnerId) {
				const winner = battle.models.find((m) => m.id === battle.aiJudgment?.winnerId);
				markdown += `**Winner:** ${winner?.displayName || 'Unknown'}\n\n`;
			} else {
				markdown += `**Result:** Tie\n\n`;
			}
			markdown += `### Analysis\n\n${battle.aiJudgment.analysis}\n\n`;

			if (battle.aiJudgment.scores) {
				markdown += `### Scores\n\n`;
				for (const [modelId, score] of Object.entries(battle.aiJudgment.scores)) {
					const model = battle.models.find((m) => m.id === modelId);
					markdown += `- **${model?.displayName || modelId}:** ${score}/10\n`;
				}
				markdown += `\n`;
			}
		}

		// Add user vote if present
		if (battle.userVote) {
			const votedModel = battle.models.find((m) => m.id === battle.userVote);
			markdown += `## User Vote\n\n`;
			markdown += `You picked: **${votedModel?.displayName || 'Unknown'}**\n\n`;
		}

		markdown += `---\n\n*Exported from StratAI Arena*\n`;

		// Trigger download
		const blob = new Blob([markdown], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
		a.download = `arena-battle-${safeTitle}-${date.toISOString().split('T')[0]}.md`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function handleClearHistory() {
		if (confirm('Clear all battle history? This cannot be undone.')) {
			arenaStore.clearHistory();
		}
	}

	// Close menu when clicking outside
	function handleListClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.menu-trigger') && !target.closest('.dropdown-menu')) {
			closeAllMenus();
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div
	class="arena-battle-list w-64 h-full flex flex-col bg-surface-900 border-r border-surface-800"
	onclick={handleListClick}
>
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
		{#if hasBattles}
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
		{#if !hasBattles}
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
			<!-- Pinned Section -->
			{#if hasPinnedBattles}
				<div class="pinned-section" in:fly={{ y: -10, duration: 200 }}>
					<div class="section-header">
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
							<path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
						</svg>
						<span>Pinned</span>
					</div>
					{#each pinnedBattles as battle (battle.id)}
						<ArenaBattleItem
							{battle}
							active={battle.id === activeBattleId}
							menuOpen={openMenuId === battle.id}
							onMenuToggle={(isOpen) => handleMenuToggle(battle.id, isOpen)}
							onclick={() => handleBattleClick(battle.id)}
							ondelete={() => handleDeleteBattle(battle.id)}
							onpin={() => handlePinBattle(battle.id)}
							onrename={(title) => handleRenameBattle(battle.id, title)}
							onexport={() => handleExportBattle(battle.id)}
							onrerun={() => handleRerunBattle(battle.id)}
						/>
					{/each}
				</div>

				<!-- Divider -->
				{#if unpinnedBattles.length > 0}
					<div class="section-divider"></div>
				{/if}
			{/if}

			<!-- Recent/Unpinned Section -->
			{#if unpinnedBattles.length > 0}
				{#if hasPinnedBattles}
					<div class="section-header mt-1">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>Recent</span>
					</div>
				{/if}
				{#each unpinnedBattles as battle (battle.id)}
					<ArenaBattleItem
						{battle}
						active={battle.id === activeBattleId}
						menuOpen={openMenuId === battle.id}
						onMenuToggle={(isOpen) => handleMenuToggle(battle.id, isOpen)}
						onclick={() => handleBattleClick(battle.id)}
						ondelete={() => handleDeleteBattle(battle.id)}
						onpin={() => handlePinBattle(battle.id)}
						onrename={(title) => handleRenameBattle(battle.id, title)}
						onexport={() => handleExportBattle(battle.id)}
						onrerun={() => handleRerunBattle(battle.id)}
					/>
				{/each}
			{/if}
		{/if}
	</div>

	<!-- Footer stats -->
	{#if hasBattles}
		<div class="px-4 py-2 border-t border-surface-800 text-xs text-surface-500">
			{totalBattles} battle{totalBattles !== 1 ? 's' : ''} saved
		</div>
	{/if}
</div>

<style>
	.section-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: #71717a;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.section-divider {
		height: 1px;
		margin: 0.25rem 0.75rem;
		background-color: #27272a;
	}
</style>
