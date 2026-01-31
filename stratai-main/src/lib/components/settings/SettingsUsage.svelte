<script lang="ts">
	/**
	 * SettingsUsage - Personal usage statistics component
	 *
	 * Displays the user's LLM usage data including:
	 * - Summary stats (requests, tokens, cost, cache savings)
	 * - Model breakdown chart
	 * - Detailed model usage table
	 */

	import { onMount } from 'svelte';
	import UsageChart from '$lib/components/admin/UsageChart.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

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

	interface RecentRequest {
		id: string;
		requestType: string;
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		cacheReadTokens: number;
		estimatedCostMillicents: number;
		formattedCost: string;
		createdAt: string;
	}

	// State
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let selectedPeriod = $state(30);
	let stats = $state<UsageStats | null>(null);
	let modelBreakdown = $state<ModelBreakdown[]>([]);

	// Expanded row state
	let expandedModel = $state<string | null>(null);
	let recentRequests = $state<RecentRequest[]>([]);
	let isLoadingRequests = $state(false);

	// Period options
	const periods = [
		{ value: 7, label: '7d' },
		{ value: 30, label: '30d' },
		{ value: 90, label: '90d' }
	];

	// Derived values
	const cachePercentage = $derived(() => {
		if (!stats || stats.totalTokens === 0) return 0;
		return Math.round((stats.cacheReadTokens / stats.totalTokens) * 100);
	});

	// Prepare chart data from model breakdown
	const chartData = $derived(
		modelBreakdown.map((m) => ({
			label: formatModelName(m.model),
			value: m.estimatedCostMillicents
		}))
	);

	/**
	 * Format model name for display
	 * Shortens long model names like "claude-3-5-sonnet-20241022" to "claude-3-5-sonnet"
	 */
	function formatModelName(model: string): string {
		// Remove date suffixes like -20241022
		return model.replace(/-\d{8}$/, '');
	}

	/**
	 * Format token counts with K/M suffix
	 */
	function formatTokens(count: number): string {
		if (count >= 1_000_000) {
			return `${(count / 1_000_000).toFixed(1)}M`;
		} else if (count >= 1_000) {
			return `${(count / 1_000).toFixed(1)}K`;
		}
		return count.toLocaleString();
	}

	/**
	 * Fetch usage data from API
	 */
	async function fetchUsage(period: number) {
		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/user/usage?period=${period}`);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error?.message || 'Failed to load usage data');
			}

			const data = await response.json();
			stats = data.stats;
			modelBreakdown = data.modelBreakdown;
		} catch (e) {
			console.error('Failed to fetch usage:', e);
			error = e instanceof Error ? e.message : 'Failed to load usage data';
			toastStore.error('Failed to load usage data');
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Handle period change
	 */
	function handlePeriodChange(period: number) {
		selectedPeriod = period;
		expandedModel = null; // Collapse expanded row on period change
		recentRequests = [];
		fetchUsage(period);
	}

	/**
	 * Fetch recent requests for a specific model
	 */
	async function fetchRecentRequests(model: string) {
		isLoadingRequests = true;

		try {
			const response = await fetch(`/api/user/usage/requests?model=${encodeURIComponent(model)}&limit=10`);

			if (!response.ok) {
				throw new Error('Failed to load recent requests');
			}

			const data = await response.json();
			recentRequests = data.requests;
		} catch (e) {
			console.error('Failed to fetch recent requests:', e);
			recentRequests = [];
			toastStore.error('Failed to load recent requests');
		} finally {
			isLoadingRequests = false;
		}
	}

	/**
	 * Handle row click to expand/collapse
	 */
	function handleRowClick(model: string) {
		if (expandedModel === model) {
			// Collapse if already expanded
			expandedModel = null;
			recentRequests = [];
		} else {
			// Expand and fetch recent requests
			expandedModel = model;
			fetchRecentRequests(model);
		}
	}

	/**
	 * Format date/time for display
	 */
	function formatDateTime(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	/**
	 * Get request type label
	 */
	function getRequestTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			chat: 'Chat',
			arena: 'Arena',
			'second-opinion': '2nd Opinion',
			summarization: 'Summary'
		};
		return labels[type] || type;
	}

	// Load initial data
	onMount(() => {
		fetchUsage(selectedPeriod);
	});
</script>

<div class="max-w-3xl">
	<!-- Header with period selector -->
	<div class="flex items-start justify-between mb-6">
		<div>
			<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Usage Statistics</h2>
			<p class="text-sm text-zinc-600 dark:text-zinc-400">View your AI usage and costs</p>
		</div>
		<div class="period-selector">
			{#each periods as period}
				<button
					type="button"
					class="period-btn"
					class:active={selectedPeriod === period.value}
					onclick={() => handlePeriodChange(period.value)}
					disabled={isLoading}
				>
					{period.label}
				</button>
			{/each}
		</div>
	</div>

	{#if isLoading}
		<!-- Loading state -->
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p class="text-sm text-zinc-500 dark:text-zinc-400 mt-3">Loading usage data...</p>
		</div>
	{:else if error}
		<!-- Error state -->
		<div class="error-container">
			<svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
			<button type="button" class="retry-btn" onclick={() => fetchUsage(selectedPeriod)}>
				Try again
			</button>
		</div>
	{:else if stats && stats.totalRequests === 0}
		<!-- Empty state -->
		<div class="empty-container">
			<svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
			</svg>
			<p class="text-sm text-zinc-600 dark:text-zinc-400 mt-3">No usage data in the last {selectedPeriod} days</p>
			<p class="text-xs text-zinc-500 dark:text-zinc-500 mt-1">Start chatting with AI to see your usage statistics</p>
		</div>
	{:else if stats}
		<!-- Stats cards -->
		<div class="stats-grid">
			<!-- Total Requests -->
			<div class="stat-card">
				<div class="stat-label">Requests</div>
				<div class="stat-value">{stats.totalRequests.toLocaleString()}</div>
			</div>

			<!-- Total Tokens -->
			<div class="stat-card">
				<div class="stat-label">Tokens</div>
				<div class="stat-value">{formatTokens(stats.totalTokens)}</div>
				<div class="stat-detail">
					<span class="token-in">{formatTokens(stats.promptTokens)} in</span>
					<span class="token-sep">/</span>
					<span class="token-out">{formatTokens(stats.completionTokens)} out</span>
				</div>
			</div>

			<!-- Estimated Cost -->
			<div class="stat-card">
				<div class="stat-label">Estimated Cost</div>
				<div class="stat-value">{stats.formattedCost}</div>
			</div>

			<!-- Cache Savings -->
			<div class="stat-card">
				<div class="stat-label">Cache Savings</div>
				<div class="stat-value">{cachePercentage()}%</div>
				<div class="stat-detail">
					{formatTokens(stats.cacheReadTokens)} cached tokens
				</div>
			</div>
		</div>

		{#if modelBreakdown.length > 0}
			<!-- Model Breakdown Section -->
			<div class="breakdown-section">
				<h3 class="section-title">Model Breakdown</h3>

				<!-- Chart -->
				<div class="chart-container">
					<UsageChart
						type="bar"
						data={chartData}
						height={Math.min(200, modelBreakdown.length * 32 + 20)}
						formatValue={(v) => `$${(v / 100000).toFixed(4)}`}
					/>
				</div>

				<!-- Detailed Table -->
				<div class="table-container">
					<table class="usage-table">
						<thead>
							<tr>
								<th class="text-left">Model</th>
								<th class="text-right">Requests</th>
								<th class="text-right">Input</th>
								<th class="text-right">Output</th>
								<th class="text-right">Cost</th>
								<th class="w-8"></th>
							</tr>
						</thead>
						<tbody>
							{#each modelBreakdown as model}
								<!-- Model row -->
								<tr
									class="model-row"
									class:expanded={expandedModel === model.model}
									onclick={() => handleRowClick(model.model)}
								>
									<td class="model-name">{formatModelName(model.model)}</td>
									<td class="text-right">{model.totalRequests.toLocaleString()}</td>
									<td class="text-right">{formatTokens(model.promptTokens)}</td>
									<td class="text-right">{formatTokens(model.completionTokens)}</td>
									<td class="text-right cost">{model.formattedCost}</td>
									<td class="expand-cell">
										<svg
											class="expand-icon"
											class:rotated={expandedModel === model.model}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
										</svg>
									</td>
								</tr>

								<!-- Expanded row with recent requests -->
								{#if expandedModel === model.model}
									<tr class="expanded-row">
										<td colspan="6">
											<div class="expanded-content">
												<div class="expanded-header">
													<span class="expanded-title">Last 10 Requests</span>
													{#if isLoadingRequests}
														<span class="loading-text">Loading...</span>
													{/if}
												</div>

												{#if !isLoadingRequests && recentRequests.length === 0}
													<p class="no-requests">No recent requests found</p>
												{:else if !isLoadingRequests}
													<div class="requests-list">
														{#each recentRequests as request}
															<div class="request-item">
																<div class="request-main">
																	<span class="request-type">{getRequestTypeLabel(request.requestType)}</span>
																	<span class="request-time">{formatDateTime(request.createdAt)}</span>
																</div>
																<div class="request-details">
																	<span class="request-tokens">
																		<span class="token-in">{formatTokens(request.promptTokens)}</span>
																		<span class="token-arrow">→</span>
																		<span class="token-out">{formatTokens(request.completionTokens)}</span>
																	</span>
																	{#if request.cacheReadTokens > 0}
																		<span class="request-cache">
																			<svg class="cache-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
																			</svg>
																			{formatTokens(request.cacheReadTokens)} cached
																		</span>
																	{/if}
																	<span class="request-cost">{request.formattedCost}</span>
																</div>
															</div>
														{/each}
													</div>
												{/if}
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	/* Period selector */
	.period-selector {
		display: flex;
		gap: 0.25rem;
		padding: 0.25rem;
		background: theme('colors.zinc.100');
		border-radius: 0.5rem;
	}

	:global(.dark) .period-selector {
		background: theme('colors.zinc.800');
	}

	.period-btn {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: theme('colors.zinc.600');
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	:global(.dark) .period-btn {
		color: theme('colors.zinc.400');
	}

	.period-btn:hover:not(:disabled) {
		color: theme('colors.zinc.900');
		background: theme('colors.zinc.200');
	}

	:global(.dark) .period-btn:hover:not(:disabled) {
		color: theme('colors.zinc.100');
		background: theme('colors.zinc.700');
	}

	.period-btn.active {
		color: theme('colors.zinc.900');
		background: white;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .period-btn.active {
		color: theme('colors.zinc.100');
		background: theme('colors.zinc.700');
	}

	.period-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Loading state */
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
	}

	.loading-spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid theme('colors.zinc.200');
		border-top-color: theme('colors.primary.500');
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	:global(.dark) .loading-spinner {
		border-color: theme('colors.zinc.700');
		border-top-color: theme('colors.primary.400');
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Error state */
	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	.error-icon {
		width: 2.5rem;
		height: 2.5rem;
		color: theme('colors.red.500');
		margin-bottom: 0.75rem;
	}

	.retry-btn {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: theme('colors.primary.600');
		background: theme('colors.primary.500 / 10%');
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.retry-btn:hover {
		background: theme('colors.primary.500 / 20%');
	}

	:global(.dark) .retry-btn {
		color: theme('colors.primary.400');
	}

	/* Empty state */
	.empty-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	.empty-icon {
		width: 3rem;
		height: 3rem;
		color: theme('colors.zinc.300');
	}

	:global(.dark) .empty-icon {
		color: theme('colors.zinc.600');
	}

	/* Stats grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
	}

	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.stat-card {
		padding: 1rem;
		background: theme('colors.zinc.100 / 50%');
		border: 1px solid theme('colors.zinc.200');
		border-radius: 0.75rem;
	}

	:global(.dark) .stat-card {
		background: theme('colors.zinc.800 / 50%');
		border-color: theme('colors.zinc.700');
	}

	.stat-label {
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		color: theme('colors.zinc.500');
		margin-bottom: 0.25rem;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 600;
		color: theme('colors.zinc.900');
		line-height: 1.2;
	}

	:global(.dark) .stat-value {
		color: theme('colors.zinc.100');
	}

	.stat-detail {
		font-size: 0.75rem;
		color: theme('colors.zinc.500');
		margin-top: 0.25rem;
	}

	.token-in {
		color: theme('colors.blue.500');
	}

	.token-sep {
		margin: 0 0.25rem;
		color: theme('colors.zinc.400');
	}

	.token-out {
		color: theme('colors.emerald.500');
	}

	/* Breakdown section */
	.breakdown-section {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid theme('colors.zinc.200');
	}

	:global(.dark) .breakdown-section {
		border-top-color: theme('colors.zinc.800');
	}

	.section-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: theme('colors.zinc.900');
		margin-bottom: 1rem;
	}

	:global(.dark) .section-title {
		color: theme('colors.zinc.100');
	}

	/* Chart container */
	.chart-container {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: theme('colors.zinc.100 / 50%');
		border: 1px solid theme('colors.zinc.200');
		border-radius: 0.75rem;
	}

	:global(.dark) .chart-container {
		background: theme('colors.zinc.800 / 50%');
		border-color: theme('colors.zinc.700');
	}

	/* Table */
	.table-container {
		overflow-x: auto;
		border: 1px solid theme('colors.zinc.200');
		border-radius: 0.75rem;
	}

	:global(.dark) .table-container {
		border-color: theme('colors.zinc.700');
	}

	.usage-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.usage-table th {
		padding: 0.75rem 1rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: theme('colors.zinc.500');
		background: theme('colors.zinc.100 / 50%');
		border-bottom: 1px solid theme('colors.zinc.200');
	}

	:global(.dark) .usage-table th {
		background: theme('colors.zinc.800 / 50%');
		border-bottom-color: theme('colors.zinc.700');
	}

	.usage-table td {
		padding: 0.75rem 1rem;
		color: theme('colors.zinc.700');
		border-bottom: 1px solid theme('colors.zinc.100');
	}

	:global(.dark) .usage-table td {
		color: theme('colors.zinc.300');
		border-bottom-color: theme('colors.zinc.800');
	}

	.usage-table tr:last-child td {
		border-bottom: none;
	}

	.usage-table tr:hover td {
		background: theme('colors.zinc.50');
	}

	:global(.dark) .usage-table tr:hover td {
		background: theme('colors.zinc.800 / 50%');
	}

	.model-name {
		font-weight: 500;
		color: theme('colors.zinc.900');
	}

	:global(.dark) .model-name {
		color: theme('colors.zinc.100');
	}

	.cost {
		font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
		color: theme('colors.emerald.600');
	}

	:global(.dark) .cost {
		color: theme('colors.emerald.400');
	}

	/* Clickable model rows */
	.model-row {
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.model-row:hover td {
		background: theme('colors.zinc.50');
	}

	:global(.dark) .model-row:hover td {
		background: theme('colors.zinc.800 / 50%');
	}

	.model-row.expanded td {
		background: theme('colors.primary.500 / 5%');
		border-bottom-color: transparent;
	}

	:global(.dark) .model-row.expanded td {
		background: theme('colors.primary.500 / 10%');
	}

	.expand-cell {
		padding-right: 0.75rem !important;
	}

	.expand-icon {
		width: 1rem;
		height: 1rem;
		color: theme('colors.zinc.400');
		transition: transform 0.2s ease;
	}

	.expand-icon.rotated {
		transform: rotate(180deg);
	}

	/* Expanded row */
	.expanded-row td {
		padding: 0 !important;
		background: theme('colors.zinc.50');
		border-bottom: 1px solid theme('colors.zinc.200');
	}

	:global(.dark) .expanded-row td {
		background: theme('colors.zinc.900 / 50%');
		border-bottom-color: theme('colors.zinc.700');
	}

	.expanded-content {
		padding: 1rem;
	}

	.expanded-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.expanded-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: theme('colors.zinc.500');
	}

	.loading-text {
		font-size: 0.75rem;
		color: theme('colors.zinc.400');
	}

	.no-requests {
		font-size: 0.8125rem;
		color: theme('colors.zinc.500');
		text-align: center;
		padding: 1rem;
	}

	/* Request list */
	.requests-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.request-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.625rem 0.75rem;
		background: white;
		border: 1px solid theme('colors.zinc.200');
		border-radius: 0.5rem;
		font-size: 0.8125rem;
	}

	:global(.dark) .request-item {
		background: theme('colors.zinc.800');
		border-color: theme('colors.zinc.700');
	}

	.request-main {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.request-type {
		padding: 0.125rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		background: theme('colors.zinc.100');
		color: theme('colors.zinc.600');
		border-radius: 0.25rem;
	}

	:global(.dark) .request-type {
		background: theme('colors.zinc.700');
		color: theme('colors.zinc.300');
	}

	.request-time {
		color: theme('colors.zinc.500');
	}

	.request-details {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.request-tokens {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
		font-size: 0.75rem;
	}

	.token-arrow {
		color: theme('colors.zinc.400');
	}

	.request-cache {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: theme('colors.amber.500');
	}

	.cache-icon {
		width: 0.75rem;
		height: 0.75rem;
	}

	.request-cost {
		font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
		font-weight: 500;
		color: theme('colors.emerald.600');
	}

	:global(.dark) .request-cost {
		color: theme('colors.emerald.400');
	}

	/* Responsive adjustments for expanded content */
	@media (max-width: 640px) {
		.request-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.request-details {
			width: 100%;
			justify-content: space-between;
		}
	}
</style>
