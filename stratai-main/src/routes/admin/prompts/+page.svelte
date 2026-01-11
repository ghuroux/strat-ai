<script lang="ts">
	/**
	 * Admin System Prompt Inspector
	 *
	 * Visualizes system prompts for different contexts with token breakdown.
	 * Helps with debugging, optimization, and billing verification.
	 */

	import type { PageData } from './$types';
	import type {
		PromptAnalysis,
		PromptComponent,
		DocumentBreakdown,
		PromptWarning,
		CacheOptimizationAnalysis,
		CacheRecommendation
	} from '$lib/server/services/prompt-analyzer';

	let { data }: { data: PageData } = $props();

	// State
	let selectedModel = $state(data.models[0]?.id || 'claude-sonnet-4-5');
	let selectedSpaceId = $state<string | undefined>(undefined);
	let selectedAreaId = $state<string | undefined>(undefined);
	let selectedTaskId = $state<string | undefined>(undefined);

	let analysis = $state<PromptAnalysis | null>(null);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let hasAnalyzed = $state(false); // Track if user has run initial analysis

	// Areas for selected space (loaded dynamically)
	let areas = $state<Array<{ id: string; name: string }>>([]);
	let loadingAreas = $state(false);

	// Auto-reanalyze when selections change (after first manual analysis)
	// Use regular variables (not $state) to avoid triggering the effect
	let prevModel: string | undefined;
	let prevSpaceId: string | undefined;
	let prevAreaId: string | undefined;

	$effect(() => {
		// Only track the selection values
		const model = selectedModel;
		const space = selectedSpaceId;
		const area = selectedAreaId;

		// Check if any selection actually changed
		const modelChanged = prevModel !== undefined && model !== prevModel;
		const spaceChanged = prevSpaceId !== undefined && space !== prevSpaceId;
		const areaChanged = prevAreaId !== undefined && area !== prevAreaId;

		// Update previous values (non-reactive assignment)
		prevModel = model;
		prevSpaceId = space;
		prevAreaId = area;

		// Only reanalyze if something changed and we've done initial analysis
		if (!hasAnalyzed) return;
		if (!modelChanged && !spaceChanged && !areaChanged) return;

		// Don't trigger during area loading (space change triggers area reset)
		if (spaceChanged) {
			// Wait for areas to load before reanalyzing
			setTimeout(() => {
				if (!loadingAreas) analyzePrompt();
			}, 200);
		} else {
			analyzePrompt();
		}
	});

	// Expanded sections
	let expandedComponents = $state<Set<string>>(new Set());

	// Load areas when space changes
	async function loadAreasForSpace(spaceId: string) {
		loadingAreas = true;
		selectedAreaId = undefined;
		areas = [];

		try {
			const response = await fetch(`/api/areas?spaceId=${encodeURIComponent(spaceId)}`);
			if (response.ok) {
				const result = await response.json();
				areas = result.areas || [];
			}
		} catch (err) {
			console.error('Failed to load areas:', err);
		} finally {
			loadingAreas = false;
		}
	}

	// Handle space change
	function handleSpaceChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const spaceId = select.value || undefined;
		selectedSpaceId = spaceId;
		selectedAreaId = undefined;
		selectedTaskId = undefined;

		if (spaceId) {
			loadAreasForSpace(spaceId);
		} else {
			areas = [];
		}
	}

	// Handle area change
	function handleAreaChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		selectedAreaId = select.value || undefined;
		selectedTaskId = undefined;
	}

	// Analyze prompt
	async function analyzePrompt() {
		isLoading = true;
		error = null;

		const params = new URLSearchParams({ model: selectedModel });
		if (selectedSpaceId) params.set('spaceId', selectedSpaceId);
		if (selectedAreaId) params.set('areaId', selectedAreaId);
		if (selectedTaskId) params.set('taskId', selectedTaskId);

		try {
			const response = await fetch(`/api/admin/debug/system-prompt?${params}`);
			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || 'Failed to analyze prompt');
			}
			analysis = await response.json();
			hasAnalyzed = true; // Enable auto-reanalyze on future selection changes
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
			analysis = null;
		} finally {
			isLoading = false;
		}
	}

	// Toggle component expansion
	function toggleComponent(name: string) {
		const newSet = new Set(expandedComponents);
		if (newSet.has(name)) {
			newSet.delete(name);
		} else {
			newSet.add(name);
		}
		expandedComponents = newSet;
	}

	// Format token count
	function formatTokens(tokens: number): string {
		if (tokens >= 1000) {
			return (tokens / 1000).toFixed(1) + 'K';
		}
		return tokens.toLocaleString();
	}

	// Get color for component type
	function getComponentColor(type: string): string {
		switch (type) {
			case 'platform':
				return '#3b82f6'; // blue
			case 'space':
				return '#8b5cf6'; // purple
			case 'area':
				return '#10b981'; // green
			case 'areaNotes':
				return '#14b8a6'; // teal
			case 'document':
				return '#f59e0b'; // amber
			case 'task':
				return '#ef4444'; // red
			default:
				return '#6b7280'; // gray
		}
	}

	// Get warning severity color
	function getWarningColor(severity: string): string {
		switch (severity) {
			case 'critical':
				return '#ef4444';
			case 'warning':
				return '#f59e0b';
			default:
				return '#3b82f6';
		}
	}

	// Calculate bar width for token breakdown
	function getBarWidth(tokens: number, total: number): number {
		return total > 0 ? (tokens / total) * 100 : 0;
	}

	// Get cache status color
	function getCacheStatusColor(status: string): string {
		switch (status) {
			case 'excellent':
				return '#10b981'; // green
			case 'good':
				return '#3b82f6'; // blue
			case 'needs-attention':
				return '#f59e0b'; // amber
			case 'not-available':
				return '#6b7280'; // gray
			default:
				return '#6b7280';
		}
	}

	// Get cache status label
	function getCacheStatusLabel(status: string): string {
		switch (status) {
			case 'excellent':
				return 'Excellent';
			case 'good':
				return 'Good';
			case 'needs-attention':
				return 'Needs Attention';
			case 'not-available':
				return 'Not Available';
			default:
				return status;
		}
	}

	// Get priority color for recommendations
	function getPriorityColor(priority: string): string {
		switch (priority) {
			case 'high':
				return '#ef4444'; // red
			case 'medium':
				return '#f59e0b'; // amber
			case 'low':
				return '#10b981'; // green
			default:
				return '#6b7280';
		}
	}

	// Get mechanism display name
	function getMechanismLabel(mechanism: string): string {
		switch (mechanism) {
			case 'explicit':
				return 'Explicit (cache_control)';
			case 'automatic':
				return 'Automatic (prefix)';
			case 'none':
				return 'Not Available';
			default:
				return mechanism;
		}
	}
</script>

<svelte:head>
	<title>Prompt Inspector | Admin | StratAI</title>
</svelte:head>

<div class="prompts-page">
	<header class="page-header">
		<div>
			<h1 class="page-title">System Prompt Inspector</h1>
			<p class="page-description">
				Analyze system prompts for different contexts. See token breakdown and cost estimates.
			</p>
		</div>
	</header>

	<!-- Context Selectors -->
	<div class="selectors-section">
		<div class="selectors-grid">
			<div class="selector-group">
				<label for="model-select" class="selector-label">Model</label>
				<select
					id="model-select"
					class="selector"
					bind:value={selectedModel}
				>
					{#each data.models as model}
						<option value={model.id}>
							{model.displayName} ({formatTokens(model.contextWindow)} ctx)
						</option>
					{/each}
				</select>
			</div>

			<div class="selector-group">
				<label for="space-select" class="selector-label">Space</label>
				<select
					id="space-select"
					class="selector"
					onchange={handleSpaceChange}
				>
					<option value="">None (Base prompt only)</option>
					{#each data.spaces as space}
						<option value={space.id}>{space.name}</option>
					{/each}
				</select>
			</div>

			<div class="selector-group">
				<label for="area-select" class="selector-label">Area</label>
				<select
					id="area-select"
					class="selector"
					disabled={!selectedSpaceId || loadingAreas}
					onchange={handleAreaChange}
				>
					<option value="">
						{loadingAreas ? 'Loading...' : selectedSpaceId ? 'None' : 'Select a space first'}
					</option>
					{#each areas as area}
						<option value={area.id}>{area.name}</option>
					{/each}
				</select>
			</div>

			<div class="selector-group action-group">
				<button
					class="analyze-btn"
					onclick={analyzePrompt}
					disabled={isLoading}
				>
					{#if isLoading}
						<span class="spinner"></span>
						Analyzing...
					{:else}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						Analyze Prompt
					{/if}
				</button>
			</div>
		</div>
	</div>

	{#if error}
		<div class="error-banner">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			{error}
		</div>
	{/if}

	{#if analysis}
		<!-- Stats Bar -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-label">Total Tokens</div>
				<div class="stat-value">{formatTokens(analysis.totalTokens)}</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Estimated Cost</div>
				<div class="stat-value">{analysis.estimatedCost.formatted}</div>
				<div class="stat-breakdown">System prompt only</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Context Window</div>
				<div class="stat-value" class:warning={analysis.contextWindowUsage > 30} class:critical={analysis.contextWindowUsage > 50}>
					{analysis.contextWindowUsage.toFixed(0)}%
				</div>
				<div class="stat-breakdown">{formatTokens(analysis.context.contextWindow - analysis.totalTokens)} remaining</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Documents</div>
				<div class="stat-value">{analysis.documents.length}</div>
				{#if analysis.documentTotalTokens > 0}
					<div class="stat-breakdown">{formatTokens(analysis.documentTotalTokens)} tokens</div>
				{/if}
			</div>
		</div>

		<!-- Cache Optimization Section -->
		<section class="section cache-section">
			<div class="section-header">
				<h2 class="section-title">Cache Optimization</h2>
				<div class="cache-status-badge" style="--status-color: {getCacheStatusColor(analysis.cacheOptimization.status)}">
					{getCacheStatusLabel(analysis.cacheOptimization.status)}
				</div>
			</div>

			<div class="cache-overview">
				<div class="cache-score-container">
					<div class="cache-score-ring" style="--score: {analysis.cacheOptimization.score}; --score-color: {getCacheStatusColor(analysis.cacheOptimization.status)}">
						<span class="cache-score-value">{analysis.cacheOptimization.score}</span>
					</div>
					<div class="cache-score-details">
						<span class="cache-provider">{analysis.cacheOptimization.provider}</span>
						<span class="cache-mechanism">{getMechanismLabel(analysis.cacheOptimization.mechanism)}</span>
					</div>
				</div>

				<div class="cache-stats">
					<div class="cache-stat">
						<span class="cache-stat-label">Potential Savings</span>
						<span class="cache-stat-value savings">{analysis.cacheOptimization.potentialSavings.percentage}</span>
					</div>
					<div class="cache-stat">
						<span class="cache-stat-label">Cacheable Tokens</span>
						<span class="cache-stat-value">{formatTokens(analysis.cacheOptimization.cacheableTokens)}</span>
					</div>
					<div class="cache-stat">
						<span class="cache-stat-label">Cacheable %</span>
						<span class="cache-stat-value">{analysis.cacheOptimization.cacheablePercentage.toFixed(0)}%</span>
					</div>
				</div>
			</div>

			<!-- Score Breakdown -->
			{#if analysis.cacheOptimization.scoreBreakdown.length > 0}
				<div class="cache-breakdown">
					<h3 class="cache-subsection-title">Score Breakdown</h3>
					<div class="score-factors">
						{#each analysis.cacheOptimization.scoreBreakdown as factor}
							<div class="score-factor">
								<div class="score-factor-header">
									<span class="score-factor-name">{factor.factor}</span>
									<span class="score-factor-score">{factor.score}/{factor.maxScore}</span>
								</div>
								<div class="score-factor-bar">
									<div class="score-factor-fill" style="width: {(factor.score / factor.maxScore) * 100}%"></div>
								</div>
								<span class="score-factor-note">{factor.note}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Recommendations -->
			{#if analysis.cacheOptimization.recommendations.length > 0}
				<div class="cache-recommendations">
					<h3 class="cache-subsection-title">Recommendations</h3>
					<div class="recommendations-list">
						{#each analysis.cacheOptimization.recommendations as rec}
							<div class="recommendation-item" style="--priority-color: {getPriorityColor(rec.priority)}">
								<div class="recommendation-priority">
									<span class="priority-dot"></span>
									<span class="priority-label">{rec.priority}</span>
								</div>
								<div class="recommendation-content">
									<span class="recommendation-title">{rec.title}</span>
									<span class="recommendation-description">{rec.description}</span>
									{#if rec.potentialSavings}
										<span class="recommendation-savings">{rec.potentialSavings}</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Savings Description -->
			<div class="cache-savings-note">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="16" x2="12" y2="12" />
					<line x1="12" y1="8" x2="12.01" y2="8" />
				</svg>
				<span>{analysis.cacheOptimization.potentialSavings.description}</span>
			</div>
		</section>

		<!-- Warnings -->
		{#if analysis.warnings.length > 0}
			<div class="warnings-section">
				{#each analysis.warnings as warning}
					<div class="warning-item" style="--warning-color: {getWarningColor(warning.severity)}">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
							<line x1="12" y1="9" x2="12" y2="13" />
							<line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
						<div class="warning-content">
							<span class="warning-message">{warning.message}</span>
							{#if warning.details}
								<span class="warning-details">{warning.details}</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Token Breakdown Bar -->
		<section class="section">
			<div class="section-header">
				<h2 class="section-title">Token Breakdown</h2>
				<span class="section-count">{analysis.components.length} components</span>
			</div>

			<div class="token-bar-container">
				<div class="token-bar">
					{#each analysis.components as component}
						{@const width = getBarWidth(component.tokens, analysis.totalTokens)}
						{#if width > 0.5}
							<div
								class="token-segment"
								style="width: {width}%; background: {getComponentColor(component.type)}"
								title="{component.name}: {formatTokens(component.tokens)} tokens"
							></div>
						{/if}
					{/each}
				</div>
			</div>

			<div class="token-legend">
				{#each analysis.components as component}
					<div class="legend-item">
						<span class="legend-color" style="background: {getComponentColor(component.type)}"></span>
						<span class="legend-label">{component.type}</span>
						<span class="legend-value">{formatTokens(component.tokens)}</span>
					</div>
				{/each}
			</div>
		</section>

		<!-- Component Details -->
		<section class="section">
			<div class="section-header">
				<h2 class="section-title">Prompt Components</h2>
			</div>

			<div class="components-list">
				{#each analysis.components as component}
					{@const isExpanded = expandedComponents.has(component.name)}
					<div class="component-item">
						<button
							class="component-header"
							onclick={() => toggleComponent(component.name)}
						>
							<div class="component-expand-icon" class:expanded={isExpanded}>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="9 18 15 12 9 6"></polyline>
								</svg>
							</div>
							<span class="component-color" style="background: {getComponentColor(component.type)}"></span>
							<span class="component-name">{component.name}</span>
							<span class="component-tokens">{formatTokens(component.tokens)} tokens</span>
						</button>

						{#if isExpanded}
							<div class="component-content">
								<pre>{component.content}</pre>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>

		<!-- Document Breakdown -->
		{#if analysis.documents.length > 0}
			<section class="section">
				<div class="section-header">
					<h2 class="section-title">Document Breakdown</h2>
					<span class="section-count">{analysis.documents.length} document{analysis.documents.length === 1 ? '' : 's'}</span>
				</div>

				<div class="documents-list">
					{#each analysis.documents as doc}
						<div class="document-item">
							<div class="document-icon">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
									<polyline points="14 2 14 8 20 8" />
								</svg>
							</div>
							<div class="document-info">
								<span class="document-name">{doc.filename}</span>
								<span class="document-meta">
									{formatTokens(doc.tokens)} tokens in prompt
									{#if doc.hasSummary}
										<span class="document-badge summary">Using summary</span>
									{/if}
								</span>
							</div>
							<div class="document-stats">
								{#if doc.hasSummary}
									<span class="doc-stat">Summary: {formatTokens(doc.summaryTokens)}</span>
									<span class="doc-stat">Full: {formatTokens(doc.fullContentTokens)}</span>
								{:else}
									<span class="doc-stat">{doc.charCount.toLocaleString()} chars</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Full Prompt Preview -->
		<section class="section">
			<div class="section-header">
				<h2 class="section-title">Full System Prompt</h2>
				<button class="copy-btn" onclick={() => navigator.clipboard.writeText(analysis?.fullPrompt || '')}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
						<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
					</svg>
					Copy
				</button>
			</div>
			<div class="full-prompt-container">
				<pre class="full-prompt">{analysis.fullPrompt}</pre>
			</div>
		</section>
	{:else if !isLoading}
		<!-- Empty State -->
		<div class="empty-state">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
			</svg>
			<h3>Inspect System Prompts</h3>
			<p>Select a model and optionally a space/area, then click "Analyze Prompt" to see the full system prompt breakdown.</p>
		</div>
	{/if}
</div>

<style>
	.prompts-page {
		max-width: 1200px;
	}

	/* Header */
	.page-header {
		margin-bottom: 1.5rem;
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

	/* Selectors */
	.selectors-section {
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
		padding: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.selectors-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr auto;
		gap: 1rem;
		align-items: end;
	}

	@media (max-width: 768px) {
		.selectors-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 480px) {
		.selectors-grid {
			grid-template-columns: 1fr;
		}
	}

	.selector-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.selector-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-surface-400);
	}

	.selector {
		padding: 0.625rem 0.875rem;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		color: var(--color-surface-100);
		font-size: 0.875rem;
		cursor: pointer;
	}

	.selector:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-group {
		justify-content: flex-end;
	}

	.analyze-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: var(--color-primary-600);
		border: none;
		border-radius: 0.5rem;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.analyze-btn:hover:not(:disabled) {
		background: var(--color-primary-500);
	}

	.analyze-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Error */
	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 0.5rem;
		color: #f87171;
		margin-bottom: 1.5rem;
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

	.stat-value.warning {
		color: #f59e0b;
	}

	.stat-value.critical {
		color: #ef4444;
	}

	.stat-breakdown {
		font-size: 0.75rem;
		color: var(--color-surface-500);
		margin-top: 0.375rem;
	}

	/* Warnings */
	.warnings-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.warning-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: color-mix(in srgb, var(--warning-color) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--warning-color) 30%, transparent);
		border-radius: 0.5rem;
		color: var(--warning-color);
	}

	.warning-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.warning-message {
		font-weight: 500;
	}

	.warning-details {
		font-size: 0.8125rem;
		opacity: 0.8;
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

	/* Token Breakdown Bar */
	.token-bar-container {
		margin-bottom: 1rem;
	}

	.token-bar {
		display: flex;
		height: 2rem;
		background: var(--color-surface-800);
		border-radius: 0.375rem;
		overflow: hidden;
	}

	.token-segment {
		transition: width 0.3s ease;
	}

	.token-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
	}

	.legend-color {
		width: 12px;
		height: 12px;
		border-radius: 2px;
	}

	.legend-label {
		color: var(--color-surface-400);
		text-transform: capitalize;
	}

	.legend-value {
		color: var(--color-surface-200);
		font-weight: 500;
	}

	/* Components List */
	.components-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.component-item {
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.component-header {
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

	.component-header:hover {
		background: var(--color-surface-700);
	}

	.component-expand-icon {
		color: var(--color-surface-400);
		transition: transform 0.2s ease;
	}

	.component-expand-icon.expanded {
		transform: rotate(90deg);
	}

	.component-color {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.component-name {
		flex: 1;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-100);
	}

	.component-tokens {
		font-size: 0.8125rem;
		color: var(--color-surface-400);
	}

	.component-content {
		padding: 0 1rem 1rem;
		border-top: 1px solid var(--color-surface-700);
	}

	.component-content pre {
		margin: 0;
		padding: 1rem;
		background: var(--color-surface-900);
		border-radius: 0.375rem;
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--color-surface-300);
		white-space: pre-wrap;
		word-break: break-word;
		max-height: 400px;
		overflow-y: auto;
	}

	/* Documents List */
	.documents-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.document-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
	}

	.document-icon {
		color: var(--color-surface-400);
	}

	.document-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.document-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-100);
	}

	.document-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--color-surface-400);
	}

	.document-badge {
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.6875rem;
		text-transform: uppercase;
		font-weight: 500;
	}

	.document-badge.summary {
		background: rgba(16, 185, 129, 0.15);
		color: #34d399;
	}

	.document-stats {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.125rem;
	}

	.doc-stat {
		font-size: 0.75rem;
		color: var(--color-surface-400);
	}

	/* Full Prompt */
	.copy-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.375rem;
		color: var(--color-surface-300);
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.copy-btn:hover {
		background: var(--color-surface-700);
		color: var(--color-surface-100);
	}

	.full-prompt-container {
		max-height: 500px;
		overflow-y: auto;
		background: var(--color-surface-800);
		border-radius: 0.5rem;
	}

	.full-prompt {
		margin: 0;
		padding: 1rem;
		font-size: 0.75rem;
		line-height: 1.6;
		color: var(--color-surface-300);
		white-space: pre-wrap;
		word-break: break-word;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		color: var(--color-surface-400);
	}

	.empty-state svg {
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-surface-200);
		margin-bottom: 0.5rem;
	}

	.empty-state p {
		max-width: 400px;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	/* Cache Optimization Section */
	.cache-section {
		background: var(--color-surface-900);
	}

	.cache-status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		background: color-mix(in srgb, var(--status-color) 15%, transparent);
		color: var(--status-color);
		border: 1px solid color-mix(in srgb, var(--status-color) 30%, transparent);
	}

	.cache-overview {
		display: flex;
		gap: 2rem;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}

	@media (max-width: 640px) {
		.cache-overview {
			flex-direction: column;
			gap: 1.5rem;
		}
	}

	.cache-score-container {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.cache-score-ring {
		position: relative;
		width: 72px;
		height: 72px;
		border-radius: 50%;
		background: conic-gradient(
			var(--score-color) calc(var(--score) * 3.6deg),
			var(--color-surface-700) calc(var(--score) * 3.6deg)
		);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.cache-score-ring::before {
		content: '';
		position: absolute;
		inset: 6px;
		border-radius: 50%;
		background: var(--color-surface-900);
	}

	.cache-score-value {
		position: relative;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-surface-100);
	}

	.cache-score-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.cache-provider {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-surface-100);
	}

	.cache-mechanism {
		font-size: 0.8125rem;
		color: var(--color-surface-400);
	}

	.cache-stats {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.cache-stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.cache-stat-label {
		font-size: 0.75rem;
		color: var(--color-surface-400);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.cache-stat-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-surface-100);
	}

	.cache-stat-value.savings {
		color: #10b981;
	}

	.cache-breakdown,
	.cache-recommendations {
		margin-bottom: 1.5rem;
	}

	.cache-subsection-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-surface-200);
		margin-bottom: 0.75rem;
	}

	.score-factors {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.score-factor {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.score-factor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.score-factor-name {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-surface-200);
	}

	.score-factor-score {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-surface-300);
	}

	.score-factor-bar {
		height: 6px;
		background: var(--color-surface-700);
		border-radius: 3px;
		overflow: hidden;
	}

	.score-factor-fill {
		height: 100%;
		background: var(--color-primary-500);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.score-factor-note {
		font-size: 0.75rem;
		color: var(--color-surface-400);
	}

	.recommendations-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.recommendation-item {
		display: flex;
		gap: 1rem;
		padding: 0.875rem 1rem;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		border-left: 3px solid var(--priority-color);
	}

	.recommendation-priority {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		min-width: 48px;
	}

	.priority-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--priority-color);
	}

	.priority-label {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--priority-color);
	}

	.recommendation-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.recommendation-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-100);
	}

	.recommendation-description {
		font-size: 0.8125rem;
		color: var(--color-surface-400);
		line-height: 1.5;
	}

	.recommendation-savings {
		font-size: 0.75rem;
		font-weight: 500;
		color: #10b981;
	}

	.cache-savings-note {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: var(--color-surface-800);
		border-radius: 0.5rem;
		font-size: 0.8125rem;
		color: var(--color-surface-400);
		line-height: 1.5;
	}

	.cache-savings-note svg {
		flex-shrink: 0;
		margin-top: 0.125rem;
		opacity: 0.7;
	}

	/* Light mode */
	:global(html.light) .page-title,
	:global(html.light) .section-title,
	:global(html.light) .stat-value,
	:global(html.light) .component-name,
	:global(html.light) .document-name {
		color: var(--color-surface-900);
	}

	:global(html.light) .page-description,
	:global(html.light) .selector-label,
	:global(html.light) .stat-label,
	:global(html.light) .section-count,
	:global(html.light) .component-tokens,
	:global(html.light) .legend-label,
	:global(html.light) .document-meta,
	:global(html.light) .doc-stat {
		color: var(--color-surface-600);
	}

	:global(html.light) .selectors-section,
	:global(html.light) .section,
	:global(html.light) .stat-card {
		background: white;
		border-color: var(--color-surface-200);
	}

	:global(html.light) .selector,
	:global(html.light) .component-item,
	:global(html.light) .document-item,
	:global(html.light) .token-bar,
	:global(html.light) .full-prompt-container {
		background: var(--color-surface-100);
		border-color: var(--color-surface-200);
	}

	:global(html.light) .selector {
		color: var(--color-surface-900);
	}

	:global(html.light) .component-header:hover,
	:global(html.light) .copy-btn:hover {
		background: var(--color-surface-200);
	}

	:global(html.light) .component-content pre,
	:global(html.light) .full-prompt {
		background: var(--color-surface-100);
		color: var(--color-surface-700);
	}

	:global(html.light) .legend-value {
		color: var(--color-surface-800);
	}

	:global(html.light) .empty-state h3 {
		color: var(--color-surface-800);
	}

	/* Light mode - Cache Optimization */
	:global(html.light) .cache-section {
		background: white;
	}

	:global(html.light) .cache-score-ring::before {
		background: white;
	}

	:global(html.light) .cache-score-ring {
		background: conic-gradient(
			var(--score-color) calc(var(--score) * 3.6deg),
			var(--color-surface-200) calc(var(--score) * 3.6deg)
		);
	}

	:global(html.light) .cache-score-value,
	:global(html.light) .cache-provider,
	:global(html.light) .cache-stat-value,
	:global(html.light) .cache-subsection-title,
	:global(html.light) .score-factor-name,
	:global(html.light) .recommendation-title {
		color: var(--color-surface-900);
	}

	:global(html.light) .cache-mechanism,
	:global(html.light) .cache-stat-label,
	:global(html.light) .score-factor-note,
	:global(html.light) .score-factor-score,
	:global(html.light) .recommendation-description,
	:global(html.light) .cache-savings-note {
		color: var(--color-surface-600);
	}

	:global(html.light) .score-factor-bar {
		background: var(--color-surface-200);
	}

	:global(html.light) .recommendation-item,
	:global(html.light) .cache-savings-note {
		background: var(--color-surface-100);
		border-color: var(--color-surface-200);
	}
</style>
