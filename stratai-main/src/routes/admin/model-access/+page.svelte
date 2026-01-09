<script lang="ts">
	import type { PageData } from './$types';
	import { formatContextWindow, getProviderDisplayName } from '$lib/config/model-capabilities';

	let { data }: { data: PageData } = $props();

	// Tier configuration
	const tierConfig = {
		basic: { name: 'Basic', color: 'var(--color-success-500)', bgColor: 'var(--color-success-500)' },
		standard: { name: 'Standard', color: 'var(--color-primary-500)', bgColor: 'var(--color-primary-500)' },
		premium: { name: 'Premium', color: 'var(--color-warning-500)', bgColor: 'var(--color-warning-500)' }
	};

	// Provider icons/colors
	const providerConfig: Record<string, { color: string; abbr: string }> = {
		anthropic: { color: '#D97706', abbr: 'ANT' },
		openai: { color: '#10A37F', abbr: 'OAI' },
		google: { color: '#4285F4', abbr: 'GGL' },
		meta: { color: '#0668E1', abbr: 'META' },
		amazon: { color: '#FF9900', abbr: 'AWS' },
		deepseek: { color: '#6366F1', abbr: 'DS' },
		mistral: { color: '#F97316', abbr: 'MIS' }
	};

	// State
	let enabledTiers = $state<Set<string>>(new Set(data.allowedTiers));
	let modelAssignments = $state<Record<string, string | null>>({ ...data.modelTierAssignments });
	let isSaving = $state(false);
	let saveMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let filterProvider = $state<string>('all');
	let filterTier = $state<string>('all');
	let searchQuery = $state('');

	// Track changes
	const hasChanges = $derived(() => {
		// Check tier changes
		const originalTiers = new Set(data.allowedTiers);
		if (enabledTiers.size !== originalTiers.size) return true;
		for (const tier of enabledTiers) {
			if (!originalTiers.has(tier)) return true;
		}

		// Check assignment changes
		const originalAssignments = data.modelTierAssignments;
		for (const [modelId, tier] of Object.entries(modelAssignments)) {
			if (originalAssignments[modelId] !== tier) return true;
		}

		return false;
	});

	// Group models by provider
	const providers = $derived(() => {
		const grouped: Record<string, typeof data.models> = {};
		for (const model of data.models) {
			if (!grouped[model.provider]) {
				grouped[model.provider] = [];
			}
			grouped[model.provider].push(model);
		}
		// Sort providers
		return Object.entries(grouped).sort(([a], [b]) => {
			const order = ['anthropic', 'openai', 'google', 'meta', 'amazon', 'deepseek', 'mistral'];
			return order.indexOf(a) - order.indexOf(b);
		});
	});

	// Filter models
	const filteredModels = $derived(() => {
		return data.models.filter((model) => {
			// Provider filter
			if (filterProvider !== 'all' && model.provider !== filterProvider) return false;

			// Tier filter
			const effectiveTier = getEffectiveTier(model.id);
			if (filterTier !== 'all') {
				if (filterTier === 'disabled' && effectiveTier !== null) return false;
				if (filterTier !== 'disabled' && effectiveTier !== filterTier) return false;
			}

			// Search filter
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				return (
					model.displayName.toLowerCase().includes(query) ||
					model.id.toLowerCase().includes(query) ||
					model.provider.toLowerCase().includes(query)
				);
			}

			return true;
		});
	});

	// Get effective tier for a model (considering assignments and defaults)
	function getEffectiveTier(modelId: string): string | null {
		if (modelAssignments[modelId] !== undefined) {
			return modelAssignments[modelId];
		}
		const model = data.models.find((m) => m.id === modelId);
		return model?.tier ?? null;
	}

	function toggleTier(tier: string) {
		const newSet = new Set(enabledTiers);
		if (newSet.has(tier)) {
			if (newSet.size <= 1) {
				saveMessage = { type: 'error', text: 'At least one tier must be enabled' };
				setTimeout(() => (saveMessage = null), 3000);
				return;
			}
			newSet.delete(tier);
		} else {
			newSet.add(tier);
		}
		enabledTiers = newSet;
		saveMessage = null;
	}

	function setModelTier(modelId: string, tier: string | null) {
		modelAssignments = { ...modelAssignments, [modelId]: tier };
		saveMessage = null;
	}

	function resetModelTier(modelId: string) {
		const newAssignments = { ...modelAssignments };
		delete newAssignments[modelId];
		modelAssignments = newAssignments;
		saveMessage = null;
	}

	async function handleSave() {
		if (!hasChanges()) return;

		isSaving = true;
		saveMessage = null;

		try {
			const response = await fetch('/api/admin/model-access', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					allowedTiers: Array.from(enabledTiers),
					modelTierAssignments: modelAssignments
				})
			});

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to save');
			}

			saveMessage = { type: 'success', text: 'Model access settings saved' };
			// Update baseline
			data.allowedTiers = Array.from(enabledTiers);
			data.modelTierAssignments = { ...modelAssignments };
		} catch (err) {
			saveMessage = { type: 'error', text: err instanceof Error ? err.message : 'Failed to save' };
		} finally {
			isSaving = false;
		}
	}

	function formatPrice(pricing: { input: number; output: number } | null): string {
		if (!pricing) return '-';
		return `$${pricing.input}/$${pricing.output}`;
	}
</script>

<svelte:head>
	<title>Model Access | Admin | StratAI</title>
</svelte:head>

<div class="model-access-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">Model Access</h1>
			<p class="page-description">Control which models your organization can access and their tier assignments.</p>
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

	<!-- Tier Toggles -->
	<div class="tiers-section">
		<h2 class="section-title">Organization Tiers</h2>
		<p class="section-description">
			Enable or disable entire tiers. Disabled tiers block access to all models in that tier.
		</p>

		<div class="tier-toggles">
			{#each Object.entries(tierConfig) as [tierId, config]}
				{@const isEnabled = enabledTiers.has(tierId)}
				{@const modelCount = data.models.filter((m) => getEffectiveTier(m.id) === tierId).length}
				<button
					class="tier-toggle"
					class:enabled={isEnabled}
					style="--tier-color: {config.color}"
					onclick={() => toggleTier(tierId)}
				>
					<div class="tier-toggle-header">
						<span class="tier-name">{config.name}</span>
						<span class="tier-count">{modelCount} models</span>
					</div>
					<div class="tier-toggle-switch" class:on={isEnabled}>
						<div class="switch-knob"></div>
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- Models Section -->
	<div class="models-section">
		<div class="models-header">
			<h2 class="section-title">All Models ({data.models.length})</h2>
			<div class="filters">
				<input
					type="text"
					class="search-input"
					placeholder="Search models..."
					bind:value={searchQuery}
				/>
				<select class="filter-select" bind:value={filterProvider}>
					<option value="all">All Providers</option>
					{#each providers() as [provider]}
						<option value={provider}>{getProviderDisplayName(provider)}</option>
					{/each}
				</select>
				<select class="filter-select" bind:value={filterTier}>
					<option value="all">All Tiers</option>
					<option value="basic">Basic</option>
					<option value="standard">Standard</option>
					<option value="premium">Premium</option>
					<option value="disabled">Disabled</option>
				</select>
			</div>
		</div>

		<div class="models-table-wrapper">
			<table class="models-table">
				<thead>
					<tr>
						<th class="col-model">Model</th>
						<th class="col-context">Context</th>
						<th class="col-output">Output</th>
						<th class="col-features">Features</th>
						<th class="col-price">Price (in/out)</th>
						<th class="col-tier">Tier</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredModels() as model (model.id)}
						{@const effectiveTier = getEffectiveTier(model.id)}
						{@const isDisabled = effectiveTier === null}
						{@const tierDisabled = effectiveTier && !enabledTiers.has(effectiveTier)}
						{@const providerInfo = providerConfig[model.provider] || { color: '#888', abbr: '?' }}
						<tr class:disabled={isDisabled || tierDisabled}>
							<td class="col-model">
								<div class="model-info">
									<span class="provider-badge" style="background: {providerInfo.color}">{providerInfo.abbr}</span>
									<div class="model-details">
										<span class="model-name">{model.displayName}</span>
										<span class="model-id">{model.id}</span>
									</div>
								</div>
							</td>
							<td class="col-context">{formatContextWindow(model.contextWindow)}</td>
							<td class="col-output">{formatContextWindow(model.maxOutputTokens)}</td>
							<td class="col-features">
								<div class="features">
									{#if model.supportsThinking}
										<span class="feature-badge thinking" title="Extended Thinking">T</span>
									{/if}
									{#if model.supportsVision}
										<span class="feature-badge vision" title="Vision/Images">V</span>
									{/if}
									{#if model.supportsTools}
										<span class="feature-badge tools" title="Tool Use">F</span>
									{/if}
								</div>
							</td>
							<td class="col-price">{formatPrice(model.pricing)}</td>
							<td class="col-tier">
								<div class="tier-select-wrapper">
									<select
										class="tier-select"
										value={effectiveTier || 'disabled'}
										onchange={(e) => {
											const value = e.currentTarget.value;
											setModelTier(model.id, value === 'disabled' ? null : value);
										}}
									>
										<option value="basic">Basic</option>
										<option value="standard">Standard</option>
										<option value="premium">Premium</option>
										<option value="disabled">Disabled</option>
									</select>
									{#if modelAssignments[model.id] !== undefined}
										<button
											class="reset-btn"
											title="Reset to default ({model.defaultTier})"
											onclick={() => resetModelTier(model.id)}
										>
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
											</svg>
										</button>
									{/if}
								</div>
								{#if tierDisabled}
									<span class="tier-warning">Tier disabled</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if filteredModels().length === 0}
			<div class="no-results">
				<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p>No models match your filters</p>
			</div>
		{/if}
	</div>

	<!-- Legend -->
	<div class="legend">
		<h3>Feature Legend</h3>
		<div class="legend-items">
			<div class="legend-item">
				<span class="feature-badge thinking">T</span>
				<span>Extended Thinking / Reasoning</span>
			</div>
			<div class="legend-item">
				<span class="feature-badge vision">V</span>
				<span>Vision / Image Input</span>
			</div>
			<div class="legend-item">
				<span class="feature-badge tools">F</span>
				<span>Function / Tool Calling</span>
			</div>
		</div>
	</div>

	{#if data.groupsWithOverrides.length > 0}
		<div class="overrides-section">
			<h2 class="section-title">Group Tier Overrides</h2>
			<p class="section-description">
				Groups with custom tier restrictions.
			</p>

			<div class="overrides-list">
				{#each data.groupsWithOverrides as group}
					<div class="override-row">
						<div class="group-info">
							<span class="group-name">{group.name}</span>
							<span class="member-count">{group.memberCount} member{group.memberCount === 1 ? '' : 's'}</span>
						</div>
						<div class="group-tiers">
							{#each ['basic', 'standard', 'premium'] as tier}
								{@const hasAccess = group.allowedTiers.includes(tier)}
								<span class="tier-badge" class:active={hasAccess} class:inactive={!hasAccess}>
									{tierConfig[tier as keyof typeof tierConfig].name}
								</span>
							{/each}
						</div>
						<a href="/admin/groups/{group.id}?tab=details" class="btn-link">Edit</a>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.model-access-page {
		max-width: 1400px;
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
		to { transform: rotate(360deg); }
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

	/* Tiers Section */
	.tiers-section {
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
		padding: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.section-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-surface-100);
		margin-bottom: 0.25rem;
	}

	.section-description {
		font-size: 0.8125rem;
		color: var(--color-surface-400);
		margin-bottom: 1rem;
	}

	.tier-toggles {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.tier-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem;
		min-width: 160px;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tier-toggle.enabled {
		border-color: var(--tier-color);
	}

	.tier-toggle-header {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.tier-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-surface-100);
	}

	.tier-count {
		font-size: 0.6875rem;
		color: var(--color-surface-400);
	}

	.tier-toggle-switch {
		width: 36px;
		height: 20px;
		background: var(--color-surface-700);
		border-radius: 10px;
		position: relative;
		transition: background 0.2s ease;
	}

	.tier-toggle-switch.on {
		background: var(--tier-color);
	}

	.switch-knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		background: white;
		border-radius: 50%;
		transition: transform 0.2s ease;
	}

	.tier-toggle-switch.on .switch-knob {
		transform: translateX(16px);
	}

	/* Models Section */
	.models-section {
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
		padding: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.models-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.filters {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.search-input {
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		color: var(--color-surface-100);
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.375rem;
		outline: none;
		min-width: 180px;
	}

	.search-input:focus {
		border-color: var(--color-primary-500);
	}

	.filter-select {
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		color: var(--color-surface-100);
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.375rem;
		cursor: pointer;
	}

	.models-table-wrapper {
		overflow-x: auto;
	}

	.models-table {
		width: 100%;
		border-collapse: collapse;
	}

	.models-table th {
		padding: 0.625rem 0.75rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-surface-400);
		text-align: left;
		border-bottom: 1px solid var(--color-surface-700);
	}

	.models-table td {
		padding: 0.625rem 0.75rem;
		font-size: 0.8125rem;
		color: var(--color-surface-300);
		border-bottom: 1px solid var(--color-surface-800);
	}

	.models-table tr:hover td {
		background: var(--color-surface-800);
	}

	.models-table tr.disabled td {
		opacity: 0.5;
	}

	.col-model { min-width: 240px; }
	.col-context { min-width: 80px; }
	.col-output { min-width: 80px; }
	.col-features { min-width: 80px; }
	.col-price { min-width: 100px; }
	.col-tier { min-width: 150px; }

	.model-info {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.provider-badge {
		padding: 0.25rem 0.375rem;
		font-size: 0.5625rem;
		font-weight: 700;
		color: white;
		border-radius: 0.25rem;
		flex-shrink: 0;
	}

	.model-details {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.model-name {
		font-weight: 500;
		color: var(--color-surface-100);
	}

	.model-id {
		font-size: 0.6875rem;
		color: var(--color-surface-500);
		font-family: monospace;
	}

	.features {
		display: flex;
		gap: 0.25rem;
	}

	.feature-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		font-size: 0.625rem;
		font-weight: 700;
		border-radius: 0.25rem;
	}

	.feature-badge.thinking {
		color: var(--color-primary-300);
		background: color-mix(in srgb, var(--color-primary-500) 20%, transparent);
	}

	.feature-badge.vision {
		color: var(--color-success-300);
		background: color-mix(in srgb, var(--color-success-500) 20%, transparent);
	}

	.feature-badge.tools {
		color: var(--color-warning-300);
		background: color-mix(in srgb, var(--color-warning-500) 20%, transparent);
	}

	.tier-select-wrapper {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.tier-select {
		padding: 0.375rem 0.5rem;
		font-size: 0.75rem;
		color: var(--color-surface-100);
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.reset-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		padding: 0;
		color: var(--color-surface-400);
		background: transparent;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.reset-btn:hover {
		color: var(--color-surface-200);
		background: var(--color-surface-700);
	}

	.tier-warning {
		font-size: 0.625rem;
		color: var(--color-warning-400);
		margin-top: 0.25rem;
	}

	.no-results {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem;
		color: var(--color-surface-500);
	}

	/* Legend */
	.legend {
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
		padding: 1rem 1.25rem;
		margin-bottom: 1.5rem;
	}

	.legend h3 {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-surface-400);
		margin-bottom: 0.75rem;
	}

	.legend-items {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: var(--color-surface-300);
	}

	/* Overrides Section */
	.overrides-section {
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
		padding: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.overrides-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.override-row {
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

	.group-tiers {
		display: flex;
		gap: 0.375rem;
	}

	.tier-badge {
		font-size: 0.6875rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-weight: 500;
	}

	.tier-badge.active {
		color: var(--color-primary-300);
		background: color-mix(in srgb, var(--color-primary-500) 20%, transparent);
	}

	.tier-badge.inactive {
		color: var(--color-surface-500);
		background: var(--color-surface-800);
		text-decoration: line-through;
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

	/* =========================================
	   Light Mode Overrides
	   Note: app.css inverts surface colors in light mode
	   (surface-100 = dark, surface-900 = light)
	   So we only override backgrounds here, not text colors
	   ========================================= */

	/* Sections - need explicit white backgrounds */
	:global(.light) .tiers-section,
	:global(.light) .models-section,
	:global(.light) .legend,
	:global(.light) .overrides-section {
		background: white;
		border-color: #e4e4e7;
	}

	/* Tier Toggles */
	:global(.light) .tier-toggle {
		background: #fafafa;
		border-color: #d4d4d8;
	}

	:global(.light) .tier-toggle:hover {
		background: #f4f4f5;
	}

	:global(.light) .tier-toggle.enabled {
		border-color: var(--tier-color);
		background: white;
	}

	:global(.light) .tier-toggle-switch:not(.on) {
		background: #d4d4d8;
	}

	:global(.light) .switch-knob {
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
	}

	/* Search Input */
	:global(.light) .search-input {
		background: white;
		border-color: #d4d4d8;
		color: #18181b;
	}

	:global(.light) .search-input::placeholder {
		color: #a1a1aa;
	}

	:global(.light) .search-input:focus {
		border-color: var(--color-primary-500);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	/* Filter Selects */
	:global(.light) .filter-select {
		background: white;
		border-color: #d4d4d8;
		color: #18181b;
	}

	:global(.light) .filter-select:hover {
		border-color: #a1a1aa;
	}

	/* Table */
	:global(.light) .models-table th {
		border-bottom-color: #e4e4e7;
	}

	:global(.light) .models-table td {
		border-bottom-color: #f4f4f5;
	}

	:global(.light) .models-table tr:hover td {
		background: #fafafa;
	}

	/* Tier Select in Table */
	:global(.light) .tier-select {
		background: white;
		border-color: #d4d4d8;
		color: #18181b;
	}

	:global(.light) .tier-select:hover {
		border-color: #a1a1aa;
	}

	:global(.light) .tier-select:focus {
		border-color: var(--color-primary-500);
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
		outline: none;
	}

	:global(.light) .reset-btn:hover {
		background: #f4f4f5;
	}

	/* Override Row */
	:global(.light) .override-row {
		background: #fafafa;
		border-color: #e4e4e7;
	}

	:global(.light) .tier-badge.inactive {
		background: #f4f4f5;
	}

	/* Save Messages */
	:global(.light) .save-message.success {
		color: var(--color-success-700);
		background: color-mix(in srgb, var(--color-success-500) 10%, white);
	}

	:global(.light) .save-message.error {
		color: var(--color-error-700);
		background: color-mix(in srgb, var(--color-error-500) 10%, white);
	}
</style>
