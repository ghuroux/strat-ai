<script lang="ts">
	/**
	 * UsageDashboard - Visual usage statistics dashboard
	 *
	 * Displays token usage, costs, and breakdowns by model and user.
	 */

	import UsageChart from './UsageChart.svelte';

	interface UsageStats {
		totalRequests: number;
		totalTokens: number;
		promptTokens: number;
		completionTokens: number;
		cacheCreationTokens: number;
		cacheReadTokens: number;
		estimatedCostMillicents: number;
		formattedCost: string;
	}

	interface ModelBreakdown {
		model: string;
		totalRequests: number;
		totalTokens: number;
		promptTokens: number;
		completionTokens: number;
		cacheReadTokens: number;
		estimatedCostMillicents: number;
		formattedCost: string;
	}

	interface UserBreakdown {
		userId: string;
		displayName: string | null;
		username: string;
		totalRequests: number;
		totalTokens: number;
		estimatedCostMillicents: number;
		formattedCost: string;
	}

	interface DailyUsage {
		date: string;
		totalRequests: number;
		totalTokens: number;
		promptTokens: number;
		completionTokens: number;
		cacheReadTokens: number;
	}

	interface Props {
		stats: UsageStats;
		modelBreakdown: ModelBreakdown[];
		userBreakdown: UserBreakdown[];
		dailyUsage: DailyUsage[];
		period: number;
	}

	let { stats, modelBreakdown, userBreakdown, dailyUsage, period }: Props = $props();

	// Format date for display
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	// Format large numbers
	function formatNumber(num: number): string {
		if (num >= 1000000) {
			return (num / 1000000).toFixed(1) + 'M';
		} else if (num >= 1000) {
			return (num / 1000).toFixed(1) + 'K';
		}
		return num.toLocaleString();
	}

	// Extract display name from model ID
	function getModelDisplayName(model: string): string {
		// Remove date suffixes and provider prefixes
		return model
			.replace(/-\d{8}$/, '') // Remove date suffix like -20250514
			.replace(/^anthropic\//, '')
			.replace(/^openai\//, '')
			.replace(/^bedrock\//, '');
	}

	// Calculate max tokens for user breakdown bars
	const maxUserTokens = $derived(Math.max(...userBreakdown.map((u) => u.totalTokens), 1));

	// Prepare chart data
	const modelChartData = $derived(
		modelBreakdown.slice(0, 8).map((m, i) => ({
			label: getModelDisplayName(m.model),
			value: m.totalTokens
		}))
	);

	const dailyChartData = $derived(
		dailyUsage.map((d) => ({
			label: formatDate(d.date),
			value: d.totalTokens
		}))
	);

	// Calculate cache savings percentage
	const cacheSavingsPercent = $derived(
		stats.promptTokens > 0 ? Math.round((stats.cacheReadTokens / stats.promptTokens) * 100) : 0
	);
</script>

<div class="usage-dashboard space-y-6">
	<!-- Period Selector -->
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-semibold">Usage Overview</h3>
		<div class="flex gap-1 bg-surface-800 rounded-lg p-1">
			<a
				href="?period=7"
				class="px-3 py-1 text-sm rounded-md transition-colors {period === 7 ? 'bg-surface-700 text-white' : 'text-surface-400 hover:text-white'}"
			>
				7 days
			</a>
			<a
				href="?period=30"
				class="px-3 py-1 text-sm rounded-md transition-colors {period === 30 ? 'bg-surface-700 text-white' : 'text-surface-400 hover:text-white'}"
			>
				30 days
			</a>
			<a
				href="?period=90"
				class="px-3 py-1 text-sm rounded-md transition-colors {period === 90 ? 'bg-surface-700 text-white' : 'text-surface-400 hover:text-white'}"
			>
				90 days
			</a>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
		<div class="stat-card bg-surface-800/50 rounded-lg p-4">
			<div class="text-surface-400 text-sm mb-1">Total Requests</div>
			<div class="text-2xl font-bold">{formatNumber(stats.totalRequests)}</div>
		</div>
		<div class="stat-card bg-surface-800/50 rounded-lg p-4">
			<div class="text-surface-400 text-sm mb-1">Total Tokens</div>
			<div class="text-2xl font-bold">{formatNumber(stats.totalTokens)}</div>
		</div>
		<div class="stat-card bg-surface-800/50 rounded-lg p-4">
			<div class="text-surface-400 text-sm mb-1">Est. Cost</div>
			<div class="text-2xl font-bold">{stats.formattedCost}</div>
		</div>
		<div class="stat-card bg-surface-800/50 rounded-lg p-4">
			<div class="text-surface-400 text-sm mb-1">Cache Savings</div>
			<div class="text-2xl font-bold text-green-400">{cacheSavingsPercent}%</div>
			<div class="text-xs text-surface-500 mt-1">{formatNumber(stats.cacheReadTokens)} tokens cached</div>
		</div>
	</div>

	<!-- Charts Row -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Daily Usage Chart -->
		<div class="bg-surface-800/30 rounded-lg p-4">
			<h4 class="text-sm font-medium text-surface-300 mb-4">Daily Usage</h4>
			{#if dailyChartData.length > 0}
				<UsageChart type="line" data={dailyChartData} height={180} formatValue={(v) => formatNumber(v) + ' tokens'} />
			{:else}
				<div class="flex items-center justify-center h-[180px] text-surface-500 text-sm">
					No data yet - start chatting to see usage!
				</div>
			{/if}
		</div>

		<!-- Model Breakdown Chart -->
		<div class="bg-surface-800/30 rounded-lg p-4">
			<h4 class="text-sm font-medium text-surface-300 mb-4">Usage by Model</h4>
			{#if modelChartData.length > 0}
				<UsageChart type="bar" data={modelChartData} height={180} formatValue={(v) => formatNumber(v) + ' tokens'} />
			{:else}
				<div class="flex items-center justify-center h-[180px] text-surface-500 text-sm">
					No model usage data yet
				</div>
			{/if}
		</div>
	</div>

	<!-- User Breakdown Table -->
	<div class="bg-surface-800/30 rounded-lg p-4">
		<h4 class="text-sm font-medium text-surface-300 mb-4">Usage by User</h4>
		{#if userBreakdown.length > 0}
			<div class="space-y-3">
				{#each userBreakdown as user}
					{@const barWidth = (user.totalTokens / maxUserTokens) * 100}
					<div class="flex items-center gap-4">
						<div class="w-32 truncate text-sm">
							{user.displayName || user.username}
						</div>
						<div class="flex-1 h-6 bg-surface-700/50 rounded overflow-hidden relative">
							<div
								class="h-full bg-blue-500/60 rounded transition-all duration-500"
								style="width: {barWidth}%"
							></div>
							<span class="absolute inset-0 flex items-center px-2 text-xs text-white/80">
								{formatNumber(user.totalTokens)} tokens
							</span>
						</div>
						<div class="w-20 text-right text-sm text-surface-400">
							{user.formattedCost}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-8 text-surface-500 text-sm">
				No user activity yet
			</div>
		{/if}
	</div>

	<!-- Model Breakdown Table (detailed) -->
	<div class="bg-surface-800/30 rounded-lg p-4">
		<h4 class="text-sm font-medium text-surface-300 mb-4">Model Details</h4>
		{#if modelBreakdown.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="text-left text-surface-400 border-b border-surface-700">
							<th class="pb-2 font-medium">Model</th>
							<th class="pb-2 font-medium text-right">Requests</th>
							<th class="pb-2 font-medium text-right">Input</th>
							<th class="pb-2 font-medium text-right">Output</th>
							<th class="pb-2 font-medium text-right">Cached</th>
							<th class="pb-2 font-medium text-right">Cost</th>
						</tr>
					</thead>
					<tbody>
						{#each modelBreakdown as model}
							<tr class="border-b border-surface-700/50">
								<td class="py-2 font-mono text-xs">{getModelDisplayName(model.model)}</td>
								<td class="py-2 text-right">{formatNumber(model.totalRequests)}</td>
								<td class="py-2 text-right">{formatNumber(model.promptTokens)}</td>
								<td class="py-2 text-right">{formatNumber(model.completionTokens)}</td>
								<td class="py-2 text-right text-green-400">{formatNumber(model.cacheReadTokens)}</td>
								<td class="py-2 text-right">{model.formattedCost}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="text-center py-8 text-surface-500 text-sm">
				No model usage data yet
			</div>
		{/if}
	</div>
</div>
