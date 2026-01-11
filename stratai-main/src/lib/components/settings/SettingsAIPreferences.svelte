<script lang="ts">
	import { userStore } from '$lib/stores/user.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { MODEL_CAPABILITIES } from '$lib/config/model-capabilities';

	interface ModelOption {
		id: string;
		displayName: string;
		provider: string;
		description?: string;
	}

	// Get available models grouped by provider
	const modelsByProvider = $derived.by(() => {
		const grouped: Record<string, ModelOption[]> = {};

		for (const [id, caps] of Object.entries(MODEL_CAPABILITIES)) {
			const provider = caps.provider;
			if (!grouped[provider]) {
				grouped[provider] = [];
			}
			grouped[provider].push({
				id,
				displayName: caps.displayName,
				provider: caps.provider,
				description: caps.description
			});
		}

		// Sort providers: anthropic first, then alphabetically
		const sortedProviders = Object.keys(grouped).sort((a, b) => {
			if (a === 'anthropic') return -1;
			if (b === 'anthropic') return 1;
			return a.localeCompare(b);
		});

		return sortedProviders.map((provider) => ({
			provider,
			models: grouped[provider].sort((a, b) => a.displayName.localeCompare(b.displayName))
		}));
	});

	// Current selection
	let selectedModel = $state(userStore.user?.preferences?.defaultModel ?? '');
	let isSaving = $state(false);

	// Sync with user store
	$effect(() => {
		const model = userStore.user?.preferences?.defaultModel;
		if (model !== undefined) {
			selectedModel = model ?? '';
		}
	});

	async function saveDefaultModel(modelId: string | null) {
		if (isSaving) return;

		selectedModel = modelId ?? '';
		isSaving = true;

		// Also update local settings store for immediate effect
		if (modelId) {
			settingsStore.setSelectedModel(modelId);
		}

		try {
			const response = await fetch('/api/user/preferences', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ defaultModel: modelId })
			});

			if (!response.ok) {
				throw new Error('Failed to save preference');
			}

			const result = await response.json();
			userStore.setPreferences(result.preferences);
			toastStore.success('Default model preference saved');
		} catch (error) {
			console.error('Failed to save default model:', error);
			toastStore.error('Failed to save preference');
		} finally {
			isSaving = false;
		}
	}

	function handleModelChange(e: Event) {
		const value = (e.target as HTMLSelectElement).value;
		saveDefaultModel(value || null);
	}

	function formatProviderName(provider: string): string {
		const names: Record<string, string> = {
			anthropic: 'Anthropic',
			openai: 'OpenAI',
			meta: 'Meta',
			amazon: 'Amazon',
			deepseek: 'DeepSeek',
			mistral: 'Mistral',
			google: 'Google'
		};
		return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
	}
</script>

<div class="settings-section">
	<div class="settings-section-header">
		<h2 class="settings-section-title">Chat Preferences</h2>
		<p class="settings-section-desc">Configure your default AI chat settings</p>
	</div>

	<div class="subsection">
		<h3 class="subsection-title">Default Model</h3>
		<p class="subsection-description">
			Choose which model to use by default for new conversations. This setting will persist even if you clear your browser cache.
		</p>

		<div class="model-select-wrapper">
			<select class="model-select" value={selectedModel} onchange={handleModelChange}>
				<option value="">No default (use last selected)</option>
				{#each modelsByProvider as group}
					<optgroup label={formatProviderName(group.provider)}>
						{#each group.models as model}
							<option value={model.id}>{model.displayName}</option>
						{/each}
					</optgroup>
				{/each}
			</select>
		</div>

		{#if selectedModel}
			{@const caps = MODEL_CAPABILITIES[selectedModel]}
			{#if caps}
				<div class="model-info">
					<span class="model-description">{caps.description || 'No description available'}</span>
					<div class="model-badges">
						{#if caps.supportsThinking}
							<span class="badge thinking">Extended Thinking</span>
						{/if}
						{#if caps.supportsVision}
							<span class="badge vision">Vision</span>
						{/if}
						{#if caps.supportsTools}
							<span class="badge tools">Tools</span>
						{/if}
					</div>
				</div>
			{/if}
		{/if}

		{#if isSaving}
			<p class="save-status">Saving...</p>
		{/if}
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
	}

	.subsection-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-surface-200);
		margin-bottom: 0.25rem;
	}

	.subsection-description {
		font-size: 0.8125rem;
		color: var(--color-surface-500);
		margin-bottom: 1rem;
	}

	.model-select-wrapper {
		position: relative;
	}

	.model-select {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 0.9375rem;
		background: rgb(var(--color-surface-800));
		border: 1px solid rgb(var(--color-surface-700));
		border-radius: 0.5rem;
		color: rgb(var(--color-surface-100));
		cursor: pointer;
		transition: all 0.15s ease;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		background-size: 1.25rem;
		padding-right: 2.5rem;
	}

	.model-select:hover {
		border-color: rgb(var(--color-surface-600));
	}

	.model-select:focus {
		outline: none;
		border-color: rgb(var(--color-primary-500));
		box-shadow: 0 0 0 2px rgb(var(--color-primary-500) / 0.2);
	}

	.model-select optgroup {
		font-weight: 600;
		color: var(--color-surface-400);
	}

	.model-select option {
		padding: 0.5rem;
		background: rgb(var(--color-surface-800));
		color: rgb(var(--color-surface-100));
	}

	.model-info {
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: rgb(var(--color-surface-800) / 0.5);
		border-radius: 0.5rem;
	}

	.model-description {
		display: block;
		font-size: 0.8125rem;
		color: var(--color-surface-400);
		margin-bottom: 0.5rem;
	}

	.model-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.badge {
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 500;
		border-radius: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.badge.thinking {
		background: rgb(168 85 247 / 0.15);
		color: rgb(168 85 247);
	}

	.badge.vision {
		background: rgb(59 130 246 / 0.15);
		color: rgb(59 130 246);
	}

	.badge.tools {
		background: rgb(34 197 94 / 0.15);
		color: rgb(34 197 94);
	}

	.save-status {
		margin-top: 0.75rem;
		font-size: 0.875rem;
		color: rgb(var(--color-surface-500));
	}
</style>
