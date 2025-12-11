<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';

	type Theme = 'dark' | 'light' | 'system';

	const themes: { value: Theme; label: string; icon: string }[] = [
		{ value: 'light', label: 'Light', icon: 'sun' },
		{ value: 'dark', label: 'Dark', icon: 'moon' },
		{ value: 'system', label: 'System', icon: 'monitor' }
	];

	let currentTheme = $derived(settingsStore.theme);

	function setTheme(theme: Theme) {
		settingsStore.setTheme(theme);
		applyTheme(theme);
	}

	function applyTheme(theme: Theme) {
		const root = document.documentElement;

		if (theme === 'system') {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			root.classList.toggle('light', !prefersDark);
			root.classList.toggle('dark', prefersDark);
		} else {
			root.classList.toggle('light', theme === 'light');
			root.classList.toggle('dark', theme === 'dark');
		}
	}
</script>

<div class="space-y-3">
	<span class="block text-sm font-medium text-surface-300">Theme</span>
	<div class="flex gap-2">
		{#each themes as theme}
			<button
				type="button"
				onclick={() => setTheme(theme.value)}
				class="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200
					   {currentTheme === theme.value
						   ? 'border-primary-500 bg-primary-500/10 text-primary-400'
						   : 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600 hover:text-surface-300'}"
			>
				{#if theme.icon === 'sun'}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
							d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
					</svg>
				{:else if theme.icon === 'moon'}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
							d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
					</svg>
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
							d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
				{/if}
				<span class="text-xs font-medium">{theme.label}</span>
			</button>
		{/each}
	</div>
</div>
