<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Calendar, Github, Plug, Check, AlertCircle, Loader2, ExternalLink, Unplug } from 'lucide-svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { SERVICE_METADATA, type ServiceType, type IntegrationStatus } from '$lib/types/integrations';

	// ============================================================================
	// Types
	// ============================================================================

	interface IntegrationInfo {
		connected: boolean;
		status: IntegrationStatus;
		connectedAt: Date | null;
		lastError: string | null;
		displayName: string;
		description: string;
		tier: 'foundational' | 'contextual';
		icon: string;
		hasValidToken?: boolean;
		tokenExpiresAt?: Date | null;
		config?: {
			connectedEmail?: string;
			connectedName?: string;
		};
	}

	// ============================================================================
	// State
	// ============================================================================

	let integrations = $state<Map<ServiceType, IntegrationInfo>>(new Map());
	let isLoading = $state(true);
	let connectingService = $state<ServiceType | null>(null);
	let disconnectingService = $state<ServiceType | null>(null);
	let showDisconnectConfirm = $state<ServiceType | null>(null);

	// Available services (in order of display)
	const availableServices: ServiceType[] = ['calendar', 'github'];

	// ============================================================================
	// Lifecycle
	// ============================================================================

	onMount(async () => {
		await loadIntegrations();

		// Check for success/error messages from OAuth callback
		const urlParams = new URLSearchParams(window.location.search);
		const connected = urlParams.get('connected');
		const error = urlParams.get('error');

		if (connected) {
			toastStore.success(`${SERVICE_METADATA[connected as ServiceType]?.displayName || connected} connected successfully!`);
			// Clean URL
			window.history.replaceState({}, '', window.location.pathname);
		} else if (error) {
			toastStore.error(`Connection failed: ${error}`);
			window.history.replaceState({}, '', window.location.pathname);
		}
	});

	// ============================================================================
	// API Functions
	// ============================================================================

	async function loadIntegrations() {
		isLoading = true;
		try {
			// Load status for each available service
			for (const service of availableServices) {
				const response = await fetch(`/api/integrations/${service}`);
				if (response.ok) {
					const data = await response.json();
					integrations.set(service, data);
				}
			}
			// Trigger reactivity
			integrations = new Map(integrations);
		} catch (error) {
			console.error('Failed to load integrations:', error);
			toastStore.error('Failed to load integrations');
		} finally {
			isLoading = false;
		}
	}

	async function connectIntegration(service: ServiceType) {
		connectingService = service;
		try {
			const response = await fetch(`/api/integrations/${service}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					returnUrl: window.location.pathname + window.location.search
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to start connection');
			}

			const { authUrl } = await response.json();

			// Redirect to OAuth provider
			window.location.href = authUrl;
		} catch (error) {
			console.error('Failed to connect integration:', error);
			toastStore.error(error instanceof Error ? error.message : 'Failed to connect');
			connectingService = null;
		}
	}

	async function disconnectIntegration(service: ServiceType) {
		disconnectingService = service;
		try {
			const response = await fetch(`/api/integrations/${service}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to disconnect');
			}

			// Update local state
			const info = integrations.get(service);
			if (info) {
				integrations.set(service, {
					...info,
					connected: false,
					status: 'disconnected',
					connectedAt: null
				});
				integrations = new Map(integrations);
			}

			toastStore.success(`${SERVICE_METADATA[service].displayName} disconnected`);
		} catch (error) {
			console.error('Failed to disconnect integration:', error);
			toastStore.error(error instanceof Error ? error.message : 'Failed to disconnect');
		} finally {
			disconnectingService = null;
			showDisconnectConfirm = null;
		}
	}

	// ============================================================================
	// Helpers
	// ============================================================================

	function getIcon(iconName: string) {
		switch (iconName) {
			case 'Calendar': return Calendar;
			case 'Github': return Github;
			default: return Plug;
		}
	}

	function formatConnectedAt(date: Date | null | string): string {
		if (!date) return '';
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getStatusBadge(info: IntegrationInfo): { text: string; class: string } {
		if (info.status === 'connected' && info.hasValidToken !== false) {
			return { text: 'Connected', class: 'badge-success' };
		}
		if (info.status === 'error' || info.hasValidToken === false) {
			return { text: 'Needs Reconnection', class: 'badge-warning' };
		}
		if (info.status === 'expired') {
			return { text: 'Expired', class: 'badge-warning' };
		}
		return { text: 'Not Connected', class: 'badge-neutral' };
	}
</script>

<div class="settings-section">
	<div class="settings-section-header">
		<h2 class="settings-section-title">Integrations</h2>
		<p class="settings-section-desc">Connect external services to enhance your StratAI experience</p>
	</div>

	{#if isLoading}
		<div class="loading-state">
			<Loader2 class="animate-spin" size={24} />
			<span>Loading integrations...</span>
		</div>
	{:else}
		<!-- Foundational Integrations -->
		<div class="integration-group">
			<h3 class="group-title">Essential Integrations</h3>
			<p class="group-description">Core integrations for enhanced productivity</p>

			<div class="integration-cards">
				{#each availableServices.filter(s => SERVICE_METADATA[s].tier === 'foundational') as service}
					{@const info = integrations.get(service)}
					{@const metadata = SERVICE_METADATA[service]}
					{@const Icon = getIcon(metadata.icon)}
					{@const statusBadge = info ? getStatusBadge(info) : { text: 'Not Connected', class: 'badge-neutral' }}

					<div class="integration-card" class:connected={info?.connected}>
						<div class="card-header">
							<div class="card-icon">
								<Icon size={24} />
							</div>
							<div class="card-info">
								<h4 class="card-title">{metadata.displayName}</h4>
								<p class="card-description">{metadata.description}</p>
							</div>
						</div>

						<div class="card-status">
							<span class="status-badge {statusBadge.class}">
								{#if info?.connected && statusBadge.class === 'badge-success'}
									<Check size={12} />
								{:else if statusBadge.class === 'badge-warning'}
									<AlertCircle size={12} />
								{/if}
								{statusBadge.text}
							</span>

							{#if info?.connected && info.config?.connectedEmail}
								<span class="connected-account">
									{info.config.connectedEmail}
								</span>
							{/if}

							{#if info?.connectedAt}
								<span class="connected-date">
									Connected {formatConnectedAt(info.connectedAt)}
								</span>
							{/if}
						</div>

						<div class="card-actions">
							{#if info?.connected}
								{#if showDisconnectConfirm === service}
									<div class="confirm-actions" transition:fade={{ duration: 150 }}>
										<button
											type="button"
											class="btn-cancel"
											onclick={() => showDisconnectConfirm = null}
											disabled={disconnectingService === service}
										>
											Cancel
										</button>
										<button
											type="button"
											class="btn-danger"
											onclick={() => disconnectIntegration(service)}
											disabled={disconnectingService === service}
										>
											{#if disconnectingService === service}
												<Loader2 class="animate-spin" size={14} />
											{:else}
												<Unplug size={14} />
											{/if}
											{disconnectingService === service ? 'Disconnecting...' : 'Disconnect'}
										</button>
									</div>
								{:else}
									<button
										type="button"
										class="btn-reconnect"
										onclick={() => connectIntegration(service)}
										disabled={connectingService === service}
									>
										{#if connectingService === service}
											<Loader2 class="animate-spin" size={14} />
											Connecting...
										{:else}
											<ExternalLink size={14} />
											Reconnect
										{/if}
									</button>
									<button
										type="button"
										class="btn-disconnect"
										onclick={() => showDisconnectConfirm = service}
									>
										<Unplug size={14} />
									</button>
								{/if}
							{:else}
								<button
									type="button"
									class="btn-connect"
									onclick={() => connectIntegration(service)}
									disabled={connectingService === service}
								>
									{#if connectingService === service}
										<Loader2 class="animate-spin" size={16} />
										Connecting...
									{:else}
										<Plug size={16} />
										Connect
									{/if}
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Contextual Integrations -->
		<div class="integration-group">
			<h3 class="group-title">Additional Integrations</h3>
			<p class="group-description">Specialized integrations for specific workflows</p>

			<div class="integration-cards">
				{#each availableServices.filter(s => SERVICE_METADATA[s].tier === 'contextual') as service}
					{@const metadata = SERVICE_METADATA[service]}
					{@const Icon = getIcon(metadata.icon)}

					<div class="integration-card coming-soon">
						<div class="card-header">
							<div class="card-icon">
								<Icon size={24} />
							</div>
							<div class="card-info">
								<h4 class="card-title">{metadata.displayName}</h4>
								<p class="card-description">{metadata.description}</p>
							</div>
						</div>

						<div class="card-status">
							<span class="status-badge badge-coming-soon">
								Coming Soon
							</span>
						</div>

						<div class="card-actions">
							<button type="button" class="btn-connect" disabled>
								<Plug size={16} />
								Connect
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Info Section -->
	<div class="info-section">
		<h3 class="info-title">About Integrations</h3>
		<ul class="info-list">
			<li>Integrations allow StratAI to access external services on your behalf</li>
			<li>Your credentials are encrypted and stored securely</li>
			<li>You can disconnect integrations at any time</li>
			<li>Integration access can be limited to specific areas</li>
		</ul>
	</div>
</div>

<style>
	.settings-section {
		max-width: 700px;
	}

	.settings-section-header {
		margin-bottom: 2rem;
	}

	.settings-section-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-surface-100);
		margin-bottom: 0.25rem;
	}

	.settings-section-desc {
		font-size: 0.875rem;
		color: var(--color-surface-500);
	}

	/* Loading State */
	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 3rem;
		color: var(--color-surface-400);
		font-size: 0.875rem;
	}

	/* Integration Groups */
	.integration-group {
		margin-bottom: 2rem;
	}

	.group-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-surface-200);
		margin-bottom: 0.25rem;
	}

	.group-description {
		font-size: 0.8125rem;
		color: var(--color-surface-500);
		margin-bottom: 1rem;
	}

	/* Integration Cards */
	.integration-cards {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.integration-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.75rem;
		transition: border-color 0.15s ease;
	}

	.integration-card:hover {
		border-color: var(--color-surface-600);
	}

	.integration-card.connected {
		border-color: rgb(34 197 94 / 0.3);
	}

	.integration-card.coming-soon {
		opacity: 0.6;
	}

	.card-header {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: var(--color-surface-700);
		border-radius: 0.625rem;
		color: var(--color-surface-300);
		flex-shrink: 0;
	}

	.card-info {
		flex: 1;
		min-width: 0;
	}

	.card-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-surface-100);
		margin-bottom: 0.25rem;
	}

	.card-description {
		font-size: 0.8125rem;
		color: var(--color-surface-400);
		line-height: 1.4;
	}

	/* Status */
	.card-status {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: 9999px;
	}

	.badge-success {
		background: rgb(34 197 94 / 0.15);
		color: rgb(34 197 94);
	}

	.badge-warning {
		background: rgb(234 179 8 / 0.15);
		color: rgb(234 179 8);
	}

	.badge-neutral {
		background: var(--color-surface-700);
		color: var(--color-surface-400);
	}

	.badge-coming-soon {
		background: rgb(139 92 246 / 0.15);
		color: rgb(139 92 246);
	}

	.connected-account {
		font-size: 0.75rem;
		color: var(--color-surface-400);
	}

	.connected-date {
		font-size: 0.75rem;
		color: var(--color-surface-500);
	}

	/* Actions */
	.card-actions {
		display: flex;
		gap: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-surface-700);
	}

	.btn-connect {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: white;
		background: var(--color-primary-500);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-connect:hover:not(:disabled) {
		background: var(--color-primary-600);
	}

	.btn-connect:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-reconnect {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-surface-300);
		background: var(--color-surface-700);
		border: 1px solid var(--color-surface-600);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-reconnect:hover:not(:disabled) {
		color: var(--color-surface-100);
		background: var(--color-surface-600);
	}

	.btn-reconnect:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-disconnect {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		color: var(--color-surface-400);
		background: transparent;
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-disconnect:hover {
		color: rgb(239 68 68);
		border-color: rgb(239 68 68 / 0.5);
		background: rgb(239 68 68 / 0.1);
	}

	.confirm-actions {
		display: flex;
		gap: 0.5rem;
		width: 100%;
	}

	.btn-cancel {
		padding: 0.5rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-surface-400);
		background: transparent;
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-cancel:hover:not(:disabled) {
		color: var(--color-surface-200);
		border-color: var(--color-surface-600);
	}

	.btn-danger {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: white;
		background: rgb(220 38 38);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-danger:hover:not(:disabled) {
		background: rgb(185 28 28);
	}

	.btn-danger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Info Section */
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

	/* Mobile */
	@media (max-width: 480px) {
		.card-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.card-status {
			flex-direction: column;
			align-items: flex-start;
		}

		.card-actions {
			flex-direction: column;
		}

		.confirm-actions {
			flex-direction: column;
		}
	}
</style>
