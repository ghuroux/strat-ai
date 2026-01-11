<script lang="ts">
	/**
	 * Admin Routing Analytics Page
	 *
	 * Displays AUTO model routing statistics, tier distribution, and recent decisions.
	 */

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Format relative time
	function formatRelativeTime(isoString: string): string {
		const date = new Date(isoString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}

	// Get tier color
	function getTierColor(tier: string): string {
		switch (tier) {
			case 'simple':
				return 'var(--color-success-400)';
			case 'medium':
				return 'var(--color-warning-400)';
			case 'complex':
				return 'var(--color-error-400)';
			default:
				return 'var(--color-surface-400)';
		}
	}

	// Get tier label
	function getTierLabel(tier: string): string {
		switch (tier) {
			case 'simple':
				return 'Simple';
			case 'medium':
				return 'Medium';
			case 'complex':
				return 'Complex';
			default:
				return tier;
		}
	}

	// Extract model display name
	function getModelDisplayName(model: string): string {
		return model
			.replace(/-\d{8}$/, '')
			.replace(/^anthropic\//, '')
			.replace(/^openai\//, '')
			.replace(/^google\//, '');
	}

	// Tier bar widths
	const maxTierCount = $derived(
		Math.max(
			data.routing.stats.tierDistribution.simple,
			data.routing.stats.tierDistribution.medium,
			data.routing.stats.tierDistribution.complex,
			1
		)
	);
</script>

<svelte:head>
	<title>AUTO Routing | Admin | StratAI</title>
</svelte:head>

<div class="routing-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">AUTO Routing Analytics</h1>
			<p class="page-description">Monitor intelligent model selection patterns, cost savings, and routing behavior.</p>
		</div>
		<div class="period-selector">
			<a href="?period=7" class="period-btn" class:active={data.routing.period === 7}>7 days</a>
			<a href="?period=30" class="period-btn" class:active={data.routing.period === 30}>30 days</a>
			<a href="?period=90" class="period-btn" class:active={data.routing.period === 90}>90 days</a>
		</div>
	</header>

	<!-- Stats Cards -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-label">AUTO Requests</div>
			<div class="stat-value">{data.routing.stats.totalDecisions.toLocaleString()}</div>
			<div class="stat-breakdown">
				{data.routing.stats.autoUsagePercent}% of all requests
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Avg Complexity</div>
			<div class="stat-value">{data.routing.stats.avgScore}</div>
			<div class="stat-breakdown">
				score out of 100
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Avg Confidence</div>
			<div class="stat-value">{Math.round(data.routing.stats.avgConfidence * 100)}%</div>
			<div class="stat-breakdown">
				routing certainty
			</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Est. Savings</div>
			<div class="stat-value highlight">{data.routing.stats.formattedSavings}</div>
			<div class="stat-breakdown">
				vs always using Sonnet
			</div>
		</div>
	</div>

	<!-- Tier Distribution Section -->
	<section class="section">
		<div class="section-header">
			<h2 class="section-title">Tier Distribution</h2>
			<span class="section-count">{data.routing.stats.totalDecisions} routing decision{data.routing.stats.totalDecisions === 1 ? '' : 's'}</span>
		</div>

		{#if data.routing.stats.totalDecisions > 0}
			<div class="tier-bars">
				<div class="tier-bar-row">
					<div class="tier-label">
						<span class="tier-dot" style="background: {getTierColor('simple')}"></span>
						Simple (Haiku)
					</div>
					<div class="tier-bar-container">
						<div
							class="tier-bar"
							style="width: {(data.routing.stats.tierDistribution.simple / maxTierCount) * 100}%; background: {getTierColor('simple')}"
						></div>
					</div>
					<div class="tier-stats">
						<span class="tier-count">{data.routing.stats.tierDistribution.simple}</span>
						<span class="tier-percent">({data.routing.stats.tierPercentages.simple}%)</span>
					</div>
				</div>

				<div class="tier-bar-row">
					<div class="tier-label">
						<span class="tier-dot" style="background: {getTierColor('medium')}"></span>
						Medium (Sonnet)
					</div>
					<div class="tier-bar-container">
						<div
							class="tier-bar"
							style="width: {(data.routing.stats.tierDistribution.medium / maxTierCount) * 100}%; background: {getTierColor('medium')}"
						></div>
					</div>
					<div class="tier-stats">
						<span class="tier-count">{data.routing.stats.tierDistribution.medium}</span>
						<span class="tier-percent">({data.routing.stats.tierPercentages.medium}%)</span>
					</div>
				</div>

				<div class="tier-bar-row">
					<div class="tier-label">
						<span class="tier-dot" style="background: {getTierColor('complex')}"></span>
						Complex (Opus)
					</div>
					<div class="tier-bar-container">
						<div
							class="tier-bar"
							style="width: {(data.routing.stats.tierDistribution.complex / maxTierCount) * 100}%; background: {getTierColor('complex')}"
						></div>
					</div>
					<div class="tier-stats">
						<span class="tier-count">{data.routing.stats.tierDistribution.complex}</span>
						<span class="tier-percent">({data.routing.stats.tierPercentages.complex}%)</span>
					</div>
				</div>
			</div>
		{:else}
			<div class="empty-section">
				<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 15.5m14.8-.2l.008.008M5 14.5L5 18m14.8-2.7V18m-14.8 0l.75.75M19.8 18l-.75.75" />
				</svg>
				<p>No AUTO routing data yet</p>
				<span>Select AUTO in the model selector to start using intelligent routing</span>
			</div>
		{/if}
	</section>

	<!-- Model Distribution & Override Frequency -->
	{#if data.routing.stats.totalDecisions > 0}
		<div class="two-col-grid">
			<!-- Model Distribution -->
			<section class="section">
				<div class="section-header">
					<h2 class="section-title">Models Selected</h2>
				</div>

				{#if data.routing.stats.modelDistribution.length > 0}
					<div class="mini-list">
						{#each data.routing.stats.modelDistribution as model}
							<div class="mini-list-item">
								<span class="mini-list-label">{getModelDisplayName(model.model)}</span>
								<span class="mini-list-value">{model.count} <span class="mini-list-percent">({model.percentage.toFixed(1)}%)</span></span>
							</div>
						{/each}
					</div>
				{:else}
					<div class="empty-state-small">No model data</div>
				{/if}
			</section>

			<!-- Override Frequency -->
			<section class="section">
				<div class="section-header">
					<h2 class="section-title">Override Frequency</h2>
				</div>

				{#if data.routing.stats.overrideFrequency.length > 0}
					<div class="mini-list">
						{#each data.routing.stats.overrideFrequency as override}
							<div class="mini-list-item">
								<span class="mini-list-label override-label">{override.override.replace(/_/g, ' ')}</span>
								<span class="mini-list-value">{override.count} <span class="mini-list-percent">({override.percentage.toFixed(1)}%)</span></span>
							</div>
						{/each}
					</div>
				{:else}
					<div class="empty-state-small">No overrides applied</div>
				{/if}
			</section>
		</div>
	{/if}

	<!-- Recent Decisions Section -->
	<section class="section">
		<div class="section-header">
			<h2 class="section-title">Recent Routing Decisions</h2>
			<span class="section-count">Last {data.routing.decisions.length} decisions</span>
		</div>

		{#if data.routing.decisions.length > 0}
			<div class="table-wrapper">
				<table class="decisions-table">
					<thead>
						<tr>
							<th>Time</th>
							<th>Tier</th>
							<th>Score</th>
							<th>Model</th>
							<th>Conf.</th>
							<th>Patterns</th>
							<th>Overrides</th>
							<th class="text-right">Tokens</th>
							<th class="text-right">Cost</th>
						</tr>
					</thead>
					<tbody>
						{#each data.routing.decisions as decision}
							<tr>
								<td class="time-cell">{formatRelativeTime(decision.createdAt)}</td>
								<td>
									<span class="tier-badge" style="background: color-mix(in srgb, {getTierColor(decision.tier)} 20%, transparent); color: {getTierColor(decision.tier)}">
										{getTierLabel(decision.tier)}
									</span>
								</td>
								<td class="score-cell">{decision.score}</td>
								<td class="model-cell">{getModelDisplayName(decision.selectedModel)}</td>
								<td class="conf-cell">{Math.round(decision.confidence * 100)}%</td>
								<td class="patterns-cell">
									{#if decision.detectedPatterns.length > 0}
										<span class="patterns-text">{decision.detectedPatterns.slice(0, 3).join(', ')}{decision.detectedPatterns.length > 3 ? '...' : ''}</span>
									{:else}
										<span class="no-data">-</span>
									{/if}
								</td>
								<td class="overrides-cell">
									{#if decision.overrides.length > 0}
										<span class="override-badge">{decision.overrides.join(', ')}</span>
									{:else}
										<span class="no-data">-</span>
									{/if}
								</td>
								<td class="text-right tokens-cell">
									{#if decision.responseTokens}
										{decision.responseTokens.toLocaleString()}
									{:else}
										<span class="no-data">-</span>
									{/if}
								</td>
								<td class="text-right cost-cell">
									{#if decision.estimatedCost}
										{decision.estimatedCost}
									{:else}
										<span class="no-data">-</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="empty-section">
				<svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
				</svg>
				<p>No routing decisions yet</p>
				<span>Decisions will appear here after using AUTO mode</span>
			</div>
		{/if}
	</section>

	<!-- Performance Stats -->
	{#if data.routing.stats.totalDecisions > 0}
		<section class="section performance-section">
			<div class="section-header">
				<h2 class="section-title">Performance</h2>
			</div>
			<div class="performance-grid">
				<div class="perf-stat">
					<div class="perf-label">Avg Routing Time</div>
					<div class="perf-value">{data.routing.stats.avgRoutingTimeMs.toFixed(2)}ms</div>
				</div>
				<div class="perf-stat">
					<div class="perf-label">Success Rate</div>
					<div class="perf-value">{data.routing.stats.successRate}%</div>
				</div>
			</div>
		</section>
	{/if}
</div>

<style>
	.routing-page {
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

	/* Tier Bars */
	.tier-bars {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.tier-bar-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.tier-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 140px;
		font-size: 0.875rem;
		color: var(--color-surface-300);
	}

	.tier-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
	}

	.tier-bar-container {
		flex: 1;
		height: 1.5rem;
		background: var(--color-surface-800);
		border-radius: 0.25rem;
		overflow: hidden;
	}

	.tier-bar {
		height: 100%;
		border-radius: 0.25rem;
		transition: width 0.3s ease;
	}

	.tier-stats {
		min-width: 100px;
		text-align: right;
	}

	.tier-count {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-200);
	}

	.tier-percent {
		font-size: 0.75rem;
		color: var(--color-surface-500);
		margin-left: 0.25rem;
	}

	/* Two Column Grid */
	.two-col-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	@media (max-width: 768px) {
		.two-col-grid {
			grid-template-columns: 1fr;
		}
	}

	.two-col-grid .section {
		margin-bottom: 0;
	}

	/* Mini List */
	.mini-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.mini-list-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-surface-800);
	}

	.mini-list-item:last-child {
		border-bottom: none;
	}

	.mini-list-label {
		font-size: 0.8125rem;
		color: var(--color-surface-300);
		font-family: monospace;
	}

	.mini-list-label.override-label {
		text-transform: capitalize;
		font-family: inherit;
	}

	.mini-list-value {
		font-size: 0.875rem;
		color: var(--color-surface-200);
		font-weight: 500;
	}

	.mini-list-percent {
		font-size: 0.75rem;
		color: var(--color-surface-500);
	}

	/* Table */
	.table-wrapper {
		overflow-x: auto;
	}

	.decisions-table {
		width: 100%;
		border-collapse: collapse;
	}

	.decisions-table th {
		padding: 0.625rem 0.75rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-surface-400);
		text-align: left;
		border-bottom: 1px solid var(--color-surface-700);
	}

	.decisions-table td {
		padding: 0.625rem 0.75rem;
		font-size: 0.8125rem;
		color: var(--color-surface-300);
		border-bottom: 1px solid var(--color-surface-800);
	}

	.decisions-table tr:hover td {
		background: var(--color-surface-800);
	}

	.text-right {
		text-align: right;
	}

	.time-cell {
		color: var(--color-surface-500);
		white-space: nowrap;
	}

	.tier-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.score-cell {
		font-weight: 500;
	}

	.model-cell {
		font-family: monospace;
		font-size: 0.75rem;
		color: var(--color-surface-200);
	}

	.conf-cell {
		color: var(--color-surface-400);
	}

	.patterns-cell {
		max-width: 150px;
	}

	.patterns-text {
		font-size: 0.75rem;
		color: var(--color-surface-400);
	}

	.overrides-cell {
		max-width: 120px;
	}

	.override-badge {
		font-size: 0.6875rem;
		color: var(--color-warning-400);
		background: color-mix(in srgb, var(--color-warning-400) 15%, transparent);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		text-transform: capitalize;
	}

	.tokens-cell, .cost-cell {
		font-family: monospace;
		font-size: 0.75rem;
	}

	.no-data {
		color: var(--color-surface-600);
	}

	/* Performance Section */
	.performance-section {
		background: var(--color-surface-850);
	}

	.performance-grid {
		display: flex;
		gap: 2rem;
	}

	.perf-stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.perf-label {
		font-size: 0.75rem;
		color: var(--color-surface-400);
	}

	.perf-value {
		font-size: 1.125rem;
		font-weight: 600;
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

	.empty-state-small {
		padding: 1rem;
		text-align: center;
		color: var(--color-surface-500);
		font-size: 0.8125rem;
	}
</style>
