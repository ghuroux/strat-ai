<script lang="ts">
	import { Swords, History, Trophy } from 'lucide-svelte';

	type Tab = 'battle' | 'results' | 'rankings';

	interface Props {
		activeTab: Tab;
		onTabChange: (tab: Tab) => void;
	}

	let { activeTab, onTabChange }: Props = $props();

	const tabs: Array<{ id: Tab; label: string; icon: typeof Swords; enabled: boolean; comingSoon?: boolean }> = [
		{ id: 'battle', label: 'Battle', icon: Swords, enabled: true },
		{ id: 'results', label: 'My Results', icon: History, enabled: true, comingSoon: true },
		{ id: 'rankings', label: 'Rankings', icon: Trophy, enabled: true, comingSoon: true }
	];
</script>

<div class="flex items-center gap-1 p-1 bg-surface-800/50 rounded-xl border border-surface-700">
	{#each tabs as tab}
		<button
			type="button"
			onclick={() => onTabChange(tab.id)}
			class="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
				{activeTab === tab.id
					? 'bg-surface-700 text-surface-100 shadow-sm'
					: 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'}"
		>
			<tab.icon class="w-4 h-4" />
			<span>{tab.label}</span>
			{#if tab.comingSoon}
				<span class="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-medium bg-primary-500/20 text-primary-400 rounded-full">
					soon
				</span>
			{/if}
		</button>
	{/each}
</div>
