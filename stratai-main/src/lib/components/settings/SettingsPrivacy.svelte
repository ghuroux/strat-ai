<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';

	let isExporting = $state(false);
	let isClearing = $state(false);
	let showClearConfirm = $state(false);

	async function exportData() {
		if (isExporting) return;
		isExporting = true;

		try {
			toastStore.info('Preparing your data export...');

			// In a real implementation, this would call an API to generate the export
			// For now, we'll show a placeholder message
			await new Promise((resolve) => setTimeout(resolve, 1000));

			toastStore.success('Data export feature coming soon!');
		} catch (error) {
			console.error('Failed to export data:', error);
			toastStore.error('Failed to export data');
		} finally {
			isExporting = false;
		}
	}

	function confirmClearHistory() {
		showClearConfirm = true;
	}

	function cancelClear() {
		showClearConfirm = false;
	}

	async function clearHistory() {
		if (isClearing) return;
		isClearing = true;

		try {
			// In a real implementation, this would call an API to clear all conversations
			// For now, we'll show a placeholder message
			await new Promise((resolve) => setTimeout(resolve, 1000));

			showClearConfirm = false;
			toastStore.success('Clear history feature coming soon!');
		} catch (error) {
			console.error('Failed to clear history:', error);
			toastStore.error('Failed to clear history');
		} finally {
			isClearing = false;
		}
	}
</script>

<div class="settings-section">
	<div class="settings-section-header">
		<h2 class="settings-section-title">Privacy & Export</h2>
		<p class="settings-section-desc">Manage your data and privacy settings</p>
	</div>

	<!-- Export Data -->
	<div class="subsection">
		<h3 class="subsection-title">Export Your Data</h3>
		<p class="subsection-description">
			Download a copy of all your data including conversations, tasks, and documents.
		</p>

		<button
			type="button"
			class="action-button"
			onclick={exportData}
			disabled={isExporting}
		>
			<svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
				/>
			</svg>
			{isExporting ? 'Preparing...' : 'Export All Data'}
		</button>

		<p class="action-note">
			Your export will include all conversations, tasks, documents, and settings in JSON format.
		</p>
	</div>

	<!-- Clear History -->
	<div class="subsection danger-zone">
		<h3 class="subsection-title danger">Danger Zone</h3>

		<div class="danger-item">
			<div class="danger-info">
				<h4 class="danger-item-title">Clear Conversation History</h4>
				<p class="danger-item-description">
					Permanently delete all your conversations. This cannot be undone.
				</p>
			</div>

			{#if showClearConfirm}
				<div class="confirm-actions">
					<button
						type="button"
						class="cancel-button"
						onclick={cancelClear}
						disabled={isClearing}
					>
						Cancel
					</button>
					<button
						type="button"
						class="danger-confirm-button"
						onclick={clearHistory}
						disabled={isClearing}
					>
						{isClearing ? 'Clearing...' : 'Yes, Delete All'}
					</button>
				</div>
			{:else}
				<button
					type="button"
					class="danger-button"
					onclick={confirmClearHistory}
				>
					Clear History
				</button>
			{/if}
		</div>
	</div>

	<!-- Data Retention Info -->
	<div class="info-section">
		<h3 class="info-title">Data Retention</h3>
		<ul class="info-list">
			<li>Conversations are stored securely and associated with your account</li>
			<li>Documents you upload are encrypted at rest</li>
			<li>Usage analytics are anonymized and used to improve the service</li>
			<li>You can request full account deletion by contacting support</li>
		</ul>
	</div>
</div>

<style>
	.settings-section {
		max-width: 600px;
	}

	.settings-section-header {
		margin-bottom: 2rem;
	}

	.settings-section-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: rgb(var(--color-surface-100));
		margin-bottom: 0.25rem;
	}

	.settings-section-desc {
		font-size: 0.875rem;
		color: rgb(var(--color-surface-500));
	}

	.subsection {
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid rgb(var(--color-surface-800));
	}

	.subsection:last-of-type {
		border-bottom: none;
	}

	.subsection-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-surface-200);
		margin-bottom: 0.25rem;
	}

	.subsection-title.danger {
		color: rgb(239 68 68);
	}

	.subsection-description {
		font-size: 0.8125rem;
		color: var(--color-surface-500);
		margin-bottom: 1rem;
	}

	.action-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-100);
		background: rgb(var(--color-surface-800));
		border: 1px solid rgb(var(--color-surface-700));
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-button:hover:not(:disabled) {
		background: rgb(var(--color-surface-700));
		border-color: rgb(var(--color-surface-600));
	}

	.action-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-icon {
		width: 1.125rem;
		height: 1.125rem;
	}

	.action-note {
		margin-top: 0.75rem;
		font-size: 0.75rem;
		color: var(--color-surface-500);
	}

	.danger-zone {
		background: rgb(239 68 68 / 0.05);
		border: 1px solid rgb(239 68 68 / 0.2);
		border-radius: 0.75rem;
		padding: 1.25rem;
	}

	.danger-item {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1rem;
	}

	.danger-info {
		flex: 1;
	}

	.danger-item-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-200);
		margin-bottom: 0.25rem;
	}

	.danger-item-description {
		font-size: 0.8125rem;
		color: var(--color-surface-500);
	}

	.danger-button {
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgb(239 68 68);
		background: transparent;
		border: 1px solid rgb(239 68 68 / 0.5);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.danger-button:hover {
		background: rgb(239 68 68 / 0.1);
		border-color: rgb(239 68 68);
	}

	.confirm-actions {
		display: flex;
		gap: 0.5rem;
	}

	.cancel-button {
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-surface-400);
		background: transparent;
		border: 1px solid rgb(var(--color-surface-700));
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.cancel-button:hover:not(:disabled) {
		color: var(--color-surface-200);
		border-color: rgb(var(--color-surface-600));
	}

	.danger-confirm-button {
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: white;
		background: rgb(220 38 38);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.danger-confirm-button:hover:not(:disabled) {
		background: rgb(185 28 28);
	}

	.danger-confirm-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.info-section {
		margin-top: 2rem;
		padding: 1rem;
		background: rgb(var(--color-surface-800) / 0.3);
		border-radius: 0.75rem;
	}

	.info-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-surface-300);
		margin-bottom: 0.75rem;
	}

	.info-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.info-list li {
		font-size: 0.8125rem;
		color: var(--color-surface-400);
		padding-left: 1.25rem;
		position: relative;
	}

	.info-list li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.5rem;
		width: 0.375rem;
		height: 0.375rem;
		background: var(--color-surface-600);
		border-radius: 50%;
	}

	@media (max-width: 480px) {
		.danger-item {
			flex-direction: column;
			align-items: stretch;
		}

		.confirm-actions {
			justify-content: flex-end;
		}
	}
</style>
