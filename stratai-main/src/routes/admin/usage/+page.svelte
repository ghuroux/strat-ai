<script lang="ts">
	/**
	 * Admin Usage Page
	 *
	 * Displays organization-wide LLM usage statistics with drill-down by user and model.
	 */

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// State
	let expandedUserId = $state<string | null>(null);
	let userModelData = $state<Record<string, Array<{
		model: string;
		totalRequests: number;
		totalTokens: number;
		promptTokens: number;
		completionTokens: number;
		cacheReadTokens: number;
		estimatedCostMillicents: number;
		formattedCost: string;
	}>>>({});
	let loadingUserId = $state<string | null>(null);

	// Format large numbers
	function formatNumber(num: number): string {
		if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
		if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
		return num.toLocaleString();
	}

	// Extract display name from model ID
	function getModelDisplayName(model: string): string {
		return model
			.replace(/-\d{8}$/, '') // Remove date suffix like -20250514
			.replace(/^anthropic\//, '')
			.replace(/^openai\//, '')
			.replace(/^bedrock\//, '')
			.replace(/^google\//, '');
	}

	// Calculate cache savings percentage
	const cacheSavingsPercent = $derived(
		data.usage.stats.promptTokens > 0
			? Math.round((data.usage.stats.cacheReadTokens / data.usage.stats.promptTokens) * 100)
			: 0
	);

	// Max values for bar widths
	const maxUserTokens = $derived(
		Math.max(...data.usage.userBreakdown.map((u) => u.totalTokens), 1)
	);
	const maxModelTokens = $derived(
		Math.max(...data.usage.modelBreakdown.map((m) => m.totalTokens), 1)
	);

	// Toggle user expansion and fetch model data
	async function toggleUserExpand(userId: string) {
		if (expandedUserId === userId) {
			expandedUserId = null;
			return;
		}

		expandedUserId = userId;

		// Fetch model breakdown if not already loaded
		if (!userModelData[userId]) {
			loadingUserId = userId;
			try {
				const response = await fetch(`/api/admin/usage/user/${userId}?period=${data.usage.period}`);
				if (response.ok) {
					const result = await response.json();
					userModelData = { ...userModelData, [userId]: result.modelBreakdown };
				}
			} catch (err) {
				console.error('Failed to load user model breakdown:', err);
			} finally {
				loadingUserId = null;
			}
		}
	}
</script>

<svelte:head>
	<title>Usage | Admin | StratAI</title>
</svelte:head>

<div class="usage-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Usage</h1>
			<p class="page-description">Monitor LLM token consumption, costs, and usage patterns across your organization.</p>
		</div>
		<div class="period-selector">
			<a href="?period=7" class="period-btn" class:active={data.usage.period === 7}>7 days</a>
			<a href="?period=30" class="period-btn" class:active={data.usage.period === 30}>30 days</a>
			<a href="?period=90" class="period-btn" class:active={data.usage.period === 90}>90 days</a>
		</div>
	</header>

	<!-- Stats Cards -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-label">Total Requests</div>
			<div class="stat-value">{formatNumber(data.usage.stats.totalRequests)}</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Total Tokens</div>
			<div class="stat-value">{formatNumber(data.usage.stats.totalTokens)}</div>
			<div class="stat-breakdown">
				<span>In: {formatNumber(data.usage.stats.promptTokens)}</span>
				<span class="divider">|</span>
				<span>Out: {formatNumber(data.usage.stats.completionTokens)}</span>
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Estimated Cost</div>
			<div class="stat-value">{data.usage.stats.formattedCost}</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Cache Savings</div>
			<div class="stat-value highlight">{cacheSavingsPercent}%</div>
			<div class="stat-breakdown">
				{formatNumber(data.usage.stats.cacheReadTokens)} tokens cached
			</div>
		</div>
	</div>

	<!-- User Breakdown Section -->
	<section class="section">
		<div class="section-header">
			<h2 class="section-title">Usage by User</h2>
			<span class="section-count">{data.usage.userBreakdown.length} user{data.usage.userBreakdown.length === 1 ? '' : 's'}</span>
		</div>

		{#if data.usage.userBreakdown.length > 0}
			<div class="user-list">
				{#each data.usage.userBreakdown as user (user.userId)}
					{@const isExpanded = expandedUserId === user.userId}
					{@const isLoading = loadingUserId === user.userId}
					{@const barWidth = (user.totalTokens / maxUserTokens) * 100}
					{@const models = userModelData[user.userId] || []}

					<div class="user-item" class:expanded={isExpanded}>
						<button class="user-row" onclick={() => toggleUserExpand(user.userId)}>
							<div class="user-expand-icon" class:expanded={isExpanded}>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="9 18 15 12 9 6"></polyline>
								</svg>
							</div>
							<div class="user-info">
								<span class="user-name">{user.displayName || user.username}</span>
								<span class="user-requests">{formatNumber(user.totalRequests)} requests</span>
							</div>
							<div class="user-bar-container">
								<div class="user-bar" style="width: {barWidth}%"></div>
								<span class="user-bar-label">{formatNumber(user.totalTokens)}</span>
							</div>
							<div class="user-cost">{user.formattedCost}</div>
						</button>

						{#if isExpanded}
							<div class="user-models">
								{#if isLoading}
									<div class="loading-state">
										<svg class="spinner" viewBox="0 0 24 24">
											<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="60" stroke-linecap="round" />
										</svg>
										Loading model breakdown...
									</div>
								{:else if models.length > 0}
									<table class="models-table">
										<thead>
											<tr>
												<th>Model</th>
												<th class="text-right">Requests</th>
												<th class="text-right">Input</th>
												<th class="text-right">Output</th>
												<th class="text-right">Cached</th>
												<th class="text-right">Cost</th>
											</tr>
										</thead>
										<tbody>
											{#each models as model}
												<tr>
													<td class="model-name">{getModelDisplayName(model.model)}</td>
													<td class="text-right">{formatNumber(model.totalRequests)}</td>
													<td class="text-right">{formatNumber(model.promptTokens)}</td>
													<td class="text-right">{formatNumber(model.completionTokens)}</td>
													<td class="text-right cache-value">{formatNumber(model.cacheReadTokens)}</td>
													<td class="text-right">{model.formattedCost}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								{:else}
									<div class="empty-state">No model usage data</div>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-section">
				<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
				</svg>
				<p>No user activity yet</p>
				<span>Start using the AI assistant to see usage statistics</span>
			</div>
		{/if}
	</section>

	<!-- Model Breakdown Section -->
	<section class="section">
		<div class="section-header">
			<h2 class="section-title">Usage by Model</h2>
			<span class="section-count">{data.usage.modelBreakdown.length} model{data.usage.modelBreakdown.length === 1 ? '' : 's'}</span>
		</div>

		{#if data.usage.modelBreakdown.length > 0}
			<div class="model-bars">
				{#each data.usage.modelBreakdown as model}
					{@const barWidth = (model.totalTokens / maxModelTokens) * 100}
					<div class="model-bar-row">
						<div class="model-bar-name">{getModelDisplayName(model.model)}</div>
						<div class="model-bar-container">
							<div class="model-bar" style="width: {barWidth}%"></div>
						</div>
						<div class="model-bar-value">{formatNumber(model.totalTokens)}</div>
					</div>
				{/each}
			</div>

			<div class="table-wrapper">
				<table class="full-table">
					<thead>
						<tr>
							<th>Model</th>
							<th class="text-right">Requests</th>
							<th class="text-right">Input Tokens</th>
							<th class="text-right">Output Tokens</th>
							<th class="text-right">Cached Tokens</th>
							<th class="text-right">Est. Cost</th>
						</tr>
					</thead>
					<tbody>
						{#each data.usage.modelBreakdown as model}
							<tr>
								<td class="model-cell">{getModelDisplayName(model.model)}</td>
								<td class="text-right">{formatNumber(model.totalRequests)}</td>
								<td class="text-right">{formatNumber(model.promptTokens)}</td>
								<td class="text-right">{formatNumber(model.completionTokens)}</td>
								<td class="text-right cache-value">{formatNumber(model.cacheReadTokens)}</td>
								<td class="text-right">{model.formattedCost}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="empty-section">
				<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 15.5m14.8-.2l.008.008M5 14.5L5 18m14.8-2.7V18m-14.8 0l.75.75M19.8 18l-.75.75" />
				</svg>
				<p>No model usage data yet</p>
				<span>Usage statistics will appear here after conversations</span>
			</div>
		{/if}
	</section>
</div>

<style>
	.usage-page {
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-surface-100);
		margin-bottom: 0.25rem;
	}

	.page-description {
		color: var(--color-surface-400);
	}

	.period-selector {
		display: flex;
		background: var(--color-surface-800);
		border-radius: 0.5rem;
		padding: 0.25rem;
	}

	.period-btn {
		padding: 0.5rem 0.875rem;
		font-size: 0.8125rem;
		color: var(--color-surface-400);
		text-decoration: none;
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.period-btn:hover {
		color: var(--color-surface-200);
	}

	.period-btn.active {
		background: var(--color-surface-700);
		color: white;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.stat-card {
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
		padding: 1.25rem;
	}

	.stat-label {
		font-size: 0.8125rem;
		color: var(--color-surface-400);
		margin-bottom: 0.5rem;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-surface-100);
	}

	.stat-value.highlight {
		color: var(--color-success-400);
	}

	.stat-breakdown {
		font-size: 0.75rem;
		color: var(--color-surface-500);
		margin-top: 0.375rem;
	}

	.stat-breakdown .divider {
		margin: 0 0.375rem;
		opacity: 0.5;
	}

	/* Sections */
	.section {
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
		padding: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.section-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-surface-100);
	}

	.section-count {
		font-size: 0.8125rem;
		color: var(--color-surface-400);
	}

	/* User List */
	.user-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.user-item {
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.user-item.expanded {
		border-color: var(--color-primary-500);
	}

	.user-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		width: 100%;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.user-row:hover {
		background: var(--color-surface-700);
	}

	.user-expand-icon {
		color: var(--color-surface-400);
		transition: transform 0.2s ease;
	}

	.user-expand-icon.expanded {
		transform: rotate(90deg);
	}

	.user-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 160px;
	}

	.user-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-100);
	}

	.user-requests {
		font-size: 0.75rem;
		color: var(--color-surface-500);
	}

	.user-bar-container {
		flex: 1;
		height: 1.75rem;
		background: var(--color-surface-700);
		border-radius: 0.25rem;
		position: relative;
		overflow: hidden;
	}

	.user-bar {
		height: 100%;
		background: linear-gradient(90deg, var(--color-primary-600), var(--color-primary-500));
		border-radius: 0.25rem;
		transition: width 0.3s ease;
	}

	.user-bar-label {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		padding: 0 0.625rem;
		font-size: 0.75rem;
		color: white;
		font-weight: 500;
	}

	.user-cost {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-300);
		min-width: 70px;
		text-align: right;
	}

	/* User Models Expandable */
	.user-models {
		border-top: 1px solid var(--color-surface-700);
		padding: 1rem;
		background: var(--color-surface-850);
	}

	.loading-state {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		color: var(--color-surface-400);
		font-size: 0.8125rem;
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.models-table {
		width: 100%;
		border-collapse: collapse;
	}

	.models-table th {
		padding: 0.5rem 0.75rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-surface-500);
		text-align: left;
		border-bottom: 1px solid var(--color-surface-700);
	}

	.models-table td {
		padding: 0.625rem 0.75rem;
		font-size: 0.8125rem;
		color: var(--color-surface-300);
		border-bottom: 1px solid var(--color-surface-800);
	}

	.models-table td.model-name {
		font-family: monospace;
		font-size: 0.75rem;
		color: var(--color-surface-200);
	}

	.text-right {
		text-align: right;
	}

	.cache-value {
		color: var(--color-success-400);
	}

	/* Model Bars */
	.model-bars {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		margin-bottom: 1.5rem;
	}

	.model-bar-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.model-bar-name {
		font-size: 0.8125rem;
		color: var(--color-surface-300);
		font-family: monospace;
		min-width: 180px;
	}

	.model-bar-container {
		flex: 1;
		height: 1.25rem;
		background: var(--color-surface-800);
		border-radius: 0.25rem;
		overflow: hidden;
	}

	.model-bar {
		height: 100%;
		background: linear-gradient(90deg, var(--color-primary-600), var(--color-primary-400));
		border-radius: 0.25rem;
		transition: width 0.3s ease;
	}

	.model-bar-value {
		font-size: 0.8125rem;
		color: var(--color-surface-400);
		min-width: 60px;
		text-align: right;
	}

	/* Full Table */
	.table-wrapper {
		overflow-x: auto;
	}

	.full-table {
		width: 100%;
		border-collapse: collapse;
	}

	.full-table th {
		padding: 0.625rem 0.75rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-surface-400);
		text-align: left;
		border-bottom: 1px solid var(--color-surface-700);
	}

	.full-table td {
		padding: 0.625rem 0.75rem;
		font-size: 0.8125rem;
		color: var(--color-surface-300);
		border-bottom: 1px solid var(--color-surface-800);
	}

	.full-table tr:hover td {
		background: var(--color-surface-800);
	}

	.full-table .model-cell {
		font-family: monospace;
		font-size: 0.75rem;
		color: var(--color-surface-200);
	}

	/* Empty States */
	.empty-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 3rem;
		text-align: center;
	}

	.empty-icon {
		width: 3rem;
		height: 3rem;
		color: var(--color-surface-600);
	}

	.empty-section p {
		font-size: 0.9375rem;
		color: var(--color-surface-400);
	}

	.empty-section span {
		font-size: 0.8125rem;
		color: var(--color-surface-500);
	}

	.empty-state {
		padding: 1rem;
		text-align: center;
		color: var(--color-surface-500);
		font-size: 0.8125rem;
	}
</style>
