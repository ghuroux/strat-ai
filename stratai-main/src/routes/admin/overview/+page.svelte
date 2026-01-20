<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Format currency
	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2
		}).format(value);
	}

	// Format trend percentage
	function formatTrend(value: number): string {
		if (value > 0) return `+${value}%`;
		if (value < 0) return `${value}%`;
		return '0%';
	}

	// Get trend class
	function getTrendClass(value: number): string {
		if (value > 0) return 'positive';
		if (value < 0) return 'negative';
		return 'neutral';
	}

	// Calculate max value for chart scaling
	const maxRequests = $derived.by(() => {
		if (data.dailyUsage.length === 0) return 100;
		return Math.max(...data.dailyUsage.map((d) => d.totalRequests), 1);
	});

	// Format date for chart labels
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { weekday: 'short' });
	}
</script>

<svelte:head>
	<title>Dashboard | Admin | StratAI</title>
</svelte:head>

<div class="dashboard">
	<h1 class="page-title">Dashboard</h1>

	<!-- Stats Cards -->
	<div class="stats-grid">
		<div class="stat-card">
			<span class="stat-label">Active Users</span>
			<span class="stat-value">{data.stats.activeUsers}<span class="stat-suffix">/{data.stats.totalUsers}</span></span>
			<span class="stat-trend neutral">Last 7 days</span>
		</div>

		<div class="stat-card">
			<span class="stat-label">Requests Today</span>
			<span class="stat-value">{data.stats.requestsToday.toLocaleString()}</span>
			<span class="stat-trend {getTrendClass(data.stats.requestsTrend)}">{formatTrend(data.stats.requestsTrend)} vs yesterday</span>
		</div>

		<div class="stat-card">
			<span class="stat-label">Spend (MTD)</span>
			<span class="stat-value">{formatCurrency(data.stats.spendDollars)}</span>
			{#if data.stats.budgetPercent !== null}
				<span class="stat-trend {data.stats.budgetPercent >= 80 ? 'negative' : 'neutral'}">{data.stats.budgetPercent}% of budget</span>
			{:else}
				<span class="stat-trend neutral">No budget set</span>
			{/if}
		</div>

		<div class="stat-card">
			<span class="stat-label">Groups</span>
			<span class="stat-value">{data.stats.groupCount}</span>
			<a href="/admin/groups" class="stat-link">Manage groups</a>
		</div>
	</div>

	<!-- Content Grid -->
	<div class="content-grid">
		<!-- Usage Trend Chart -->
		<div class="card usage-chart">
			<h2 class="card-title">Usage Trend (7 days)</h2>
			{#if data.dailyUsage.length === 0}
				<div class="chart-placeholder">
					<svg class="w-16 h-16 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
					</svg>
					<p>No usage data yet</p>
				</div>
			{:else}
				<div class="chart-container">
					<div class="chart-bars">
						{#each data.dailyUsage as day}
							{@const heightPercent = (day.totalRequests / maxRequests) * 100}
							<div class="bar-column">
								<div class="bar-value">{day.totalRequests}</div>
								<div class="bar" style="height: {Math.max(heightPercent, 2)}%"></div>
								<div class="bar-label">{formatDate(day.date)}</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Quick Actions -->
		<div class="card quick-actions">
			<h2 class="card-title">Quick Actions</h2>
			<div class="actions-list">
				<a href="/admin/members" class="action-link">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
					</svg>
					Invite User
				</a>
				<a href="/admin/groups" class="action-link">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
					</svg>
					Manage Groups
				</a>
				<a href="/admin/usage" class="action-link">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
					</svg>
					View Usage
				</a>
				<a href="/admin/budgets" class="action-link">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					Set Budgets
				</a>
				<a href="/admin/settings" class="action-link">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					Settings
				</a>
			</div>
		</div>
	</div>

	<!-- Summary Cards -->
	<div class="summary-grid">
		<div class="card summary-card">
			<div class="summary-icon">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</div>
			<div class="summary-content">
				<h3>Model Access</h3>
				<p>Control which AI models your organization can use</p>
				<a href="/admin/model-access" class="summary-link">Configure</a>
			</div>
		</div>

		<div class="card summary-card">
			<div class="summary-icon warning">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			</div>
			<div class="summary-content">
				<h3>Budget Management</h3>
				<p>Set spending limits and receive alerts</p>
				<a href="/admin/budgets" class="summary-link">Configure</a>
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard {
		max-width: 1200px;
		margin: 0 auto;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-surface-100);
		margin-bottom: 1.5rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1.25rem;
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
	}

	.stat-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-surface-400);
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-surface-100);
	}

	.stat-suffix {
		font-size: 1rem;
		font-weight: 500;
		color: var(--color-surface-400);
	}

	.stat-trend {
		font-size: 0.8125rem;
	}

	.stat-trend.positive {
		color: var(--color-success-400);
	}

	.stat-trend.negative {
		color: var(--color-error-400);
	}

	.stat-trend.neutral {
		color: var(--color-surface-400);
	}

	.stat-link {
		font-size: 0.8125rem;
		color: var(--color-primary-400);
		text-decoration: none;
	}

	.stat-link:hover {
		text-decoration: underline;
	}

	.content-grid {
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	@media (max-width: 768px) {
		.content-grid {
			grid-template-columns: 1fr;
		}
	}

	.card {
		padding: 1.25rem;
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
	}

	.card-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-surface-200);
		margin-bottom: 1rem;
	}

	.chart-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: var(--color-surface-500);
		gap: 0.75rem;
	}

	.chart-placeholder p {
		font-size: 0.875rem;
	}

	.chart-container {
		height: 200px;
		display: flex;
		flex-direction: column;
	}

	.chart-bars {
		flex: 1;
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.bar-column {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
		min-width: 0;
	}

	.bar-value {
		font-size: 0.6875rem;
		color: var(--color-surface-400);
		font-weight: 500;
	}

	.bar {
		width: 100%;
		max-width: 40px;
		background: var(--color-primary-500);
		border-radius: 0.25rem 0.25rem 0 0;
		transition: height 0.3s ease;
	}

	.bar-label {
		font-size: 0.6875rem;
		color: var(--color-surface-500);
	}

	.actions-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.action-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-300);
		background: var(--color-surface-800);
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.action-link:hover {
		color: var(--color-surface-100);
		background: var(--color-surface-700);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
	}

	.summary-card {
		display: flex;
		gap: 1rem;
	}

	.summary-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: 0.5rem;
		background: color-mix(in srgb, var(--color-primary-500) 15%, transparent);
		color: var(--color-primary-400);
		flex-shrink: 0;
	}

	.summary-icon.warning {
		background: color-mix(in srgb, var(--color-warning-500) 15%, transparent);
		color: var(--color-warning-400);
	}

	.summary-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.summary-content h3 {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-surface-100);
	}

	.summary-content p {
		font-size: 0.8125rem;
		color: var(--color-surface-400);
	}

	.summary-link {
		font-size: 0.8125rem;
		color: var(--color-primary-400);
		text-decoration: none;
		margin-top: 0.25rem;
	}

	.summary-link:hover {
		text-decoration: underline;
	}
</style>
