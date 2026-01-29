<script lang="ts">
	/**
	 * VersionHistoryPanel.svelte - Version history side panel
	 *
	 * Shows all version snapshots for a page with View and Restore actions.
	 * Follows PageAuditLog.svelte pattern for panel layout and data loading.
	 *
	 * Phase 3: Page Lifecycle - Version Management
	 */

	import { onMount } from 'svelte';
	import { X, Clock, Eye, RotateCcw } from 'lucide-svelte';
	import { pageStore } from '$lib/stores/pages.svelte';
	import type { PageVersion } from '$lib/types/page';

	interface Props {
		pageId: string;
		currentVersion?: number;
		onClose: () => void;
		onViewVersion: (version: PageVersion) => void;
		onRestoreVersion: (versionNumber: number) => void;
	}

	let { pageId, currentVersion, onClose, onViewVersion, onRestoreVersion }: Props = $props();

	let isLoading = $state(true);

	onMount(async () => {
		isLoading = true;
		await pageStore.loadVersions(pageId);
		isLoading = false;
	});

	// Get versions from store (sorted DESC by version_number already)
	let versions = $derived(pageStore.getVersions(pageId));

	// Format relative time
	function formatRelativeTime(date: Date | string): string {
		const now = new Date();
		const d = typeof date === 'string' ? new Date(date) : date;
		if (isNaN(d.getTime())) return 'Unknown';
		const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

		if (diff < 60) return 'Just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

		return d.toLocaleDateString();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="version-panel">
	<!-- Header -->
	<header class="panel-header">
		<h3>Version History</h3>
		<button type="button" class="close-btn" onclick={onClose} aria-label="Close version history">
			<X size={18} />
		</button>
	</header>

	<!-- Version list -->
	<div class="version-list">
		{#if isLoading}
			<div class="loading-state">
				<div class="spinner"></div>
				<span>Loading versions...</span>
			</div>
		{:else if versions.length === 0}
			<div class="empty-state">
				<Clock size={32} strokeWidth={1.5} />
				<span>No version history</span>
				<span class="empty-hint">Finalize the page to create the first version.</span>
			</div>
		{:else}
			{#each versions as version (version.id)}
				{@const isCurrent = version.versionNumber === currentVersion}
				<div class="version-card" class:current={isCurrent}>
					<div class="version-header">
						<div class="version-label">
							<span class="version-number">v{version.versionNumber}</span>
							{#if isCurrent}
								<span class="current-tag">current</span>
							{/if}
						</div>
						<span class="version-date">{formatRelativeTime(version.createdAt)}</span>
					</div>

					{#if version.changeSummary}
						<p class="version-summary">{version.changeSummary}</p>
					{/if}

					<div class="version-meta">
						<span class="version-words">{version.wordCount} words</span>
					</div>

					<div class="version-actions">
						<button
							type="button"
							class="action-btn view-btn"
							onclick={() => onViewVersion(version)}
							title="Preview this version"
						>
							<Eye size={14} />
							View
						</button>
						{#if !isCurrent}
							<button
								type="button"
								class="action-btn restore-btn"
								onclick={() => onRestoreVersion(version.versionNumber)}
								title="Restore this version"
							>
								<RotateCcw size={14} />
								Restore
							</button>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.version-panel {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--editor-bg);
	}

	/* Header */
	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--editor-border);
	}

	.panel-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--editor-text);
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--editor-text-secondary);
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 100ms ease, color 100ms ease;
	}

	.close-btn:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	/* Version list */
	.version-list {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	/* Loading state */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		color: var(--editor-text-secondary);
		font-size: 0.875rem;
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--editor-border);
		border-top-color: var(--editor-border-focus);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 3rem 1rem;
		color: var(--editor-text-secondary);
		font-size: 0.875rem;
		text-align: center;
	}

	.empty-hint {
		font-size: 0.8125rem;
		opacity: 0.7;
	}

	/* Version card */
	.version-card {
		padding: 0.875rem;
		border: 1px solid var(--editor-border);
		border-radius: 8px;
		margin-bottom: 0.75rem;
		transition: border-color 150ms ease;
	}

	.version-card:hover {
		border-color: var(--editor-border-focus);
	}

	.version-card.current {
		border-color: rgba(34, 197, 94, 0.3);
		background: rgba(34, 197, 94, 0.04);
	}

	.version-card:last-child {
		margin-bottom: 0;
	}

	.version-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.375rem;
	}

	.version-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.version-number {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--editor-text);
	}

	.current-tag {
		font-size: 0.6875rem;
		font-weight: 500;
		color: #22c55e;
		background: rgba(34, 197, 94, 0.12);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.version-date {
		font-size: 0.8125rem;
		color: var(--editor-text-secondary);
	}

	.version-summary {
		font-size: 0.8125rem;
		color: var(--editor-text-secondary);
		font-style: italic;
		margin: 0 0 0.375rem;
		line-height: 1.4;
	}

	.version-meta {
		font-size: 0.75rem;
		color: var(--editor-text-muted);
		margin-bottom: 0.625rem;
	}

	.version-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		border: 1px solid var(--editor-border);
		background: transparent;
		color: var(--editor-text-secondary);
		font-size: 0.8125rem;
		font-weight: 500;
		border-radius: 6px;
		cursor: pointer;
		transition: all 100ms ease;
	}

	.view-btn:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
		border-color: var(--editor-border-focus);
	}

	.restore-btn:hover {
		background: rgba(245, 158, 11, 0.1);
		color: #f59e0b;
		border-color: rgba(245, 158, 11, 0.4);
	}
</style>
