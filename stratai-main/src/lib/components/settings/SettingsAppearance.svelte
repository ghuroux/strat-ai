<script lang="ts">
	import { userStore } from '$lib/stores/user.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { applyTheme } from '$lib/utils/theme';
	import type { ThemePreference } from '$lib/types/user';

	let selectedTheme = $state<ThemePreference>(userStore.user?.preferences?.theme ?? settingsStore.theme);
	let isSaving = $state(false);

	// Sync with user store
	$effect(() => {
		const theme = userStore.user?.preferences?.theme;
		if (theme) {
			selectedTheme = theme;
		}
	});

	async function saveTheme(theme: ThemePreference) {
		if (isSaving) return;

		selectedTheme = theme;
		isSaving = true;

		// Apply theme immediately (local)
		settingsStore.setTheme(theme);
		applyTheme(theme);

		try {
			// Save to database (persisted)
			const response = await fetch('/api/user/preferences', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ theme })
			});

			if (!response.ok) {
				throw new Error('Failed to save theme');
			}

			const result = await response.json();
			userStore.setPreferences(result.preferences);
			toastStore.success('Theme preference saved');
		} catch (error) {
			console.error('Failed to save theme:', error);
			toastStore.error('Failed to save theme preference');
		} finally {
			isSaving = false;
		}
	}

	const themes: { value: ThemePreference; label: string; description: string; icon: string }[] = [
		{
			value: 'dark',
			label: 'Dark',
			description: 'Dark theme for low-light environments',
			icon: 'moon'
		},
		{
			value: 'light',
			label: 'Light',
			description: 'Light theme for bright environments',
			icon: 'sun'
		},
		{
			value: 'system',
			label: 'System',
			description: 'Automatically match your system settings',
			icon: 'desktop'
		}
	];

	const icons: Record<string, string> = {
		moon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
		sun: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
		desktop:
			'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
	};
</script>

<div class="settings-section">
	<div class="settings-section-header">
		<h2 class="settings-section-title">Appearance</h2>
		<p class="settings-section-desc">Customize the look and feel of the application</p>
	</div>

	<div class="subsection">
		<h3 class="subsection-title">Theme</h3>
		<p class="subsection-description">
			Select your preferred color theme. This setting will be remembered even if you clear your browser cache.
		</p>

		<div class="theme-options">
			{#each themes as theme}
				<label class="theme-card" class:selected={selectedTheme === theme.value}>
					<input
						type="radio"
						name="theme"
						value={theme.value}
						checked={selectedTheme === theme.value}
						onchange={() => saveTheme(theme.value)}
					/>
					<div class="theme-preview {theme.value}">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d={icons[theme.icon]}
							/>
						</svg>
					</div>
					<div class="theme-info">
						<span class="theme-label">{theme.label}</span>
						<span class="theme-description">{theme.description}</span>
					</div>
					<div class="theme-check">
						{#if selectedTheme === theme.value}
							<svg fill="currentColor" viewBox="0 0 24 24">
								<path
									fill-rule="evenodd"
									d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
									clip-rule="evenodd"
								/>
							</svg>
						{/if}
					</div>
				</label>
			{/each}
		</div>

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

	.theme-options {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.theme-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: rgb(var(--color-surface-800) / 0.5);
		border: 1px solid rgb(var(--color-surface-700));
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.theme-card:hover {
		background: rgb(var(--color-surface-800));
		border-color: rgb(var(--color-surface-600));
	}

	.theme-card.selected {
		background: rgb(var(--color-primary-500) / 0.1);
		border-color: rgb(var(--color-primary-500) / 0.5);
	}

	.theme-card input[type='radio'] {
		display: none;
	}

	.theme-preview {
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.75rem;
		flex-shrink: 0;
	}

	.theme-preview svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.theme-preview.dark {
		background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
		color: #94a3b8;
		border: 1px solid #334155;
	}

	.theme-preview.light {
		background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
		color: #64748b;
		border: 1px solid #cbd5e1;
	}

	.theme-preview.system {
		background: linear-gradient(135deg, #f8fafc 0%, #1e293b 100%);
		color: #94a3b8;
		border: 1px solid #475569;
	}

	.theme-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.theme-label {
		font-size: 0.9375rem;
		font-weight: 500;
		color: rgb(var(--color-surface-100));
	}

	.theme-description {
		font-size: 0.8125rem;
		color: rgb(var(--color-surface-500));
	}

	.theme-check {
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgb(var(--color-primary-500));
	}

	.theme-check svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.save-status {
		margin-top: 1rem;
		font-size: 0.875rem;
		color: rgb(var(--color-surface-500));
	}
</style>
