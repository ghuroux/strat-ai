<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Form state
	let monthlyBudget = $state<string>(data.monthlyBudget?.toString() || '');
	let budgetAlertThreshold = $state(data.budgetAlertThreshold);
	let budgetHardLimit = $state(data.budgetHardLimit);

	let isSaving = $state(false);
	let saveMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// Calculate usage percentage
	const usagePercentage = $derived(() => {
		if (!data.monthlyBudget || data.monthlyBudget === 0) return 0;
		return Math.min((data.currentUsageDollars / data.monthlyBudget) * 100, 100);
	});

	// Check for changes
	const hasChanges = $derived(() => {
		const originalBudget = data.monthlyBudget?.toString() || '';
		return (
			monthlyBudget !== originalBudget ||
			budgetAlertThreshold !== data.budgetAlertThreshold ||
			budgetHardLimit !== data.budgetHardLimit
		);
	});

	// Progress bar color based on usage
	const progressColor = $derived(() => {
		const pct = usagePercentage();
		if (pct >= 90) return 'var(--color-error-500)';
		if (pct >= budgetAlertThreshold) return 'var(--color-warning-500)';
		return 'var(--color-primary-500)';
	});

	async function handleSave() {
		if (!hasChanges()) return;

		isSaving = true;
		saveMessage = null;

		try {
			const response = await fetch('/api/admin/budgets', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : null,
					budgetAlertThreshold,
					budgetHardLimit
				})
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to save');
			}

			saveMessage = { type: 'success', text: 'Budget settings saved' };
			// Update baseline
			data.monthlyBudget = monthlyBudget ? parseFloat(monthlyBudget) : null;
			data.budgetAlertThreshold = budgetAlertThreshold;
			data.budgetHardLimit = budgetHardLimit;
		} catch (err) {
			saveMessage = { type: 'error', text: err instanceof Error ? err.message : 'Failed to save' };
		} finally {
			isSaving = false;
		}
	}

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2
		}).format(value);
	}
</script>

<svelte:head>
	<title>Budgets | Admin | StratAI</title>
</svelte:head>

<div class="budgets-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Budgets</h1>
			<p class="page-description">Set spending limits and alerts for your organization.</p>
		</div>
		{#if hasChanges()}
			<button class="btn-primary" onclick={handleSave} disabled={isSaving}>
				{#if isSaving}
					<svg class="spinner" viewBox="0 0 24 24">
						<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="60" stroke-linecap="round" />
					</svg>
					Saving...
				{:else}
					Save Changes
				{/if}
			</button>
		{/if}
	</header>

	{#if saveMessage}
		<div class="save-message {saveMessage.type}">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				{#if saveMessage.type === 'success'}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				{:else}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				{/if}
			</svg>
			{saveMessage.text}
		</div>
	{/if}

	<!-- Organization Budget -->
	<div class="budget-card">
		<h2 class="card-title">Organization Budget</h2>
		<p class="card-description">Set a monthly spending limit for your entire organization.</p>

		<div class="budget-form">
			<div class="form-row">
				<div class="form-group">
					<label for="monthly-budget">Monthly Limit</label>
					<div class="input-with-unit">
						<span class="unit">$</span>
						<input
							type="number"
							id="monthly-budget"
							bind:value={monthlyBudget}
							placeholder="No limit"
							min="0"
							step="0.01"
						/>
						<span class="currency">USD</span>
					</div>
					<span class="hint">Leave empty for no limit</span>
				</div>
				<div class="form-group">
					<label for="alert-threshold">Alert Threshold</label>
					<div class="input-with-unit">
						<input
							type="number"
							id="alert-threshold"
							bind:value={budgetAlertThreshold}
							min="0"
							max="100"
						/>
						<span class="unit-right">%</span>
					</div>
					<span class="hint">Notify when usage exceeds this</span>
				</div>
			</div>

			{#if data.monthlyBudget}
				<div class="current-usage">
					<div class="usage-info">
						<span class="label">Current Month Usage:</span>
						<span class="value">
							{formatCurrency(data.currentUsageDollars)} ({usagePercentage().toFixed(1)}%)
						</span>
					</div>
					<div class="progress-bar">
						<div
							class="progress-fill"
							style="width: {usagePercentage()}%; background: {progressColor()}"
						></div>
						{#if budgetAlertThreshold < 100}
							<div class="threshold-marker" style="left: {budgetAlertThreshold}%"></div>
						{/if}
					</div>
					<div class="budget-labels">
						<span>{formatCurrency(0)}</span>
						<span>{formatCurrency(data.monthlyBudget)}</span>
					</div>
				</div>
			{:else}
				<div class="no-budget-set">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>No budget limit set. Current month spend: {formatCurrency(data.currentUsageDollars)}</span>
				</div>
			{/if}

			<div class="options">
				<label class="checkbox-option">
					<input type="checkbox" bind:checked={budgetHardLimit} />
					<span>Hard limit (block requests when budget exceeded)</span>
				</label>
			</div>
		</div>
	</div>

	<!-- Group Budgets -->
	<div class="budget-card">
		<h2 class="card-title">Group Budgets</h2>
		<p class="card-description">Set individual spending limits for teams and departments.</p>

		{#if data.allGroups.length === 0}
			<div class="empty-groups">
				<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
				<p>Create groups to set team-specific budgets</p>
				<a href="/admin/groups" class="btn-secondary">Manage Groups</a>
			</div>
		{:else}
			<div class="groups-list">
				{#each data.allGroups as group}
					<div class="group-row">
						<div class="group-info">
							<span class="group-name">{group.name}</span>
							<span class="member-count">{group.memberCount} member{group.memberCount === 1 ? '' : 's'}</span>
						</div>
						<div class="group-budget">
							{#if group.monthlyBudget}
								<span class="budget-value">{formatCurrency(group.monthlyBudget)}/mo</span>
							{:else}
								<span class="no-limit">No limit</span>
							{/if}
						</div>
						<a href="/admin/groups/{group.id}?tab=details" class="btn-link">
							Edit
						</a>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="info-banner">
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
		<p>
			Group budgets are enforced independently from the organization budget.
			A group can hit their limit before the org budget is exhausted.
		</p>
	</div>
</div>

<style>
	.budgets-page {
		max-width: 800px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
		gap: 1rem;
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

	.btn-primary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: var(--color-primary-500);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-primary-600);
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.save-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		margin-bottom: 1.5rem;
	}

	.save-message.success {
		color: var(--color-success-300);
		background: color-mix(in srgb, var(--color-success-500) 15%, transparent);
		border: 1px solid var(--color-success-500);
	}

	.save-message.error {
		color: var(--color-error-300);
		background: color-mix(in srgb, var(--color-error-500) 15%, transparent);
		border: 1px solid var(--color-error-500);
	}

	.budget-card {
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.card-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-surface-100);
		margin-bottom: 0.25rem;
	}

	.card-description {
		font-size: 0.875rem;
		color: var(--color-surface-400);
		margin-bottom: 1.25rem;
	}

	.budget-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	@media (max-width: 640px) {
		.form-row {
			grid-template-columns: 1fr;
		}
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.form-group label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-surface-300);
	}

	.form-group .hint {
		font-size: 0.75rem;
		color: var(--color-surface-500);
	}

	.input-with-unit {
		display: flex;
		align-items: center;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		overflow: hidden;
		transition: border-color 0.15s ease;
	}

	.input-with-unit:focus-within {
		border-color: var(--color-primary-500);
	}

	.input-with-unit .unit {
		padding: 0.5rem 0.75rem;
		background: var(--color-surface-700);
		color: var(--color-surface-400);
		font-size: 0.875rem;
	}

	.input-with-unit .unit-right {
		padding: 0.5rem 0.75rem;
		background: var(--color-surface-700);
		color: var(--color-surface-400);
		font-size: 0.875rem;
	}

	.input-with-unit .currency {
		padding: 0.5rem 0.75rem;
		color: var(--color-surface-400);
		font-size: 0.875rem;
	}

	.input-with-unit input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		color: var(--color-surface-100);
		background: transparent;
		border: none;
		outline: none;
	}

	.input-with-unit input::placeholder {
		color: var(--color-surface-500);
	}

	.current-usage {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--color-surface-800);
		border-radius: 0.5rem;
	}

	.usage-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.usage-info .label {
		font-size: 0.875rem;
		color: var(--color-surface-400);
	}

	.usage-info .value {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-100);
	}

	.progress-bar {
		position: relative;
		height: 8px;
		background: var(--color-surface-700);
		border-radius: 4px;
		overflow: visible;
	}

	.progress-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 0.3s ease, background 0.3s ease;
	}

	.threshold-marker {
		position: absolute;
		top: -2px;
		width: 2px;
		height: 12px;
		background: var(--color-warning-500);
		border-radius: 1px;
	}

	.budget-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		color: var(--color-surface-500);
	}

	.no-budget-set {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-surface-800);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-surface-400);
	}

	.options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.checkbox-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.875rem;
		color: var(--color-surface-300);
		cursor: pointer;
	}

	.checkbox-option input[type="checkbox"] {
		width: 1rem;
		height: 1rem;
		accent-color: var(--color-primary-500);
		cursor: pointer;
	}

	/* Group budgets */
	.groups-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.group-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
	}

	.group-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.group-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-100);
	}

	.member-count {
		font-size: 0.75rem;
		color: var(--color-surface-400);
	}

	.group-budget {
		min-width: 100px;
		text-align: right;
	}

	.budget-value {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-100);
	}

	.no-limit {
		font-size: 0.8125rem;
		color: var(--color-surface-500);
	}

	.btn-link {
		font-size: 0.8125rem;
		color: var(--color-primary-400);
		text-decoration: none;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		transition: background 0.15s ease;
	}

	.btn-link:hover {
		background: var(--color-surface-700);
	}

	.empty-groups {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 2rem;
		color: var(--color-surface-500);
		text-align: center;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-300);
		background: transparent;
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		cursor: pointer;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.btn-secondary:hover {
		color: var(--color-surface-100);
		border-color: var(--color-surface-600);
	}

	.info-banner {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		background: color-mix(in srgb, var(--color-primary-500) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-primary-500) 20%, transparent);
		border-radius: 0.5rem;
		color: var(--color-primary-300);
	}

	.info-banner svg {
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.info-banner p {
		font-size: 0.875rem;
		line-height: 1.5;
	}
</style>
