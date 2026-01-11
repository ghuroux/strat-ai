<script lang="ts">
	import { fly } from 'svelte/transition';
	import { settingsStore } from '$lib/stores/settings.svelte';

	type Theme = 'dark' | 'light' | 'system';

	interface Props {
		displayName: string | null;
		role: 'owner' | 'admin' | 'member';
	}

	let { displayName, role }: Props = $props();

	let isOpen = $state(false);
	let buttonRef: HTMLButtonElement | undefined = $state();
	let dropdownRef: HTMLDivElement | undefined = $state();

	// Can access admin panel?
	let canAccessAdmin = $derived(role === 'owner' || role === 'admin');

	// Display text - use display name or fallback to "User"
	let displayText = $derived(displayName || 'User');

	// Current theme
	let currentTheme = $derived(settingsStore.theme);

	function handleClickOutside(e: MouseEvent) {
		if (
			isOpen &&
			buttonRef &&
			dropdownRef &&
			!buttonRef.contains(e.target as Node) &&
			!dropdownRef.contains(e.target as Node)
		) {
			isOpen = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}

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

	function getThemeLabel(theme: Theme): string {
		return theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark';
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="user-menu-container">
	<button
		bind:this={buttonRef}
		onclick={() => (isOpen = !isOpen)}
		class="user-trigger"
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		<span class="user-name">{displayText}</span>
		<svg
			class="chevron"
			class:rotate={isOpen}
			width="12"
			height="12"
			viewBox="0 0 12 12"
			fill="none"
		>
			<path
				d="M2.5 4.5L6 8L9.5 4.5"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>

	{#if isOpen}
		<div bind:this={dropdownRef} class="user-dropdown" transition:fly={{ y: -8, duration: 150 }}>
			{#if canAccessAdmin}
				<a href="/admin" class="dropdown-item" onclick={() => (isOpen = false)}>
					<svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
						/>
					</svg>
					Admin
				</a>
			{/if}

			<a href="/settings" class="dropdown-item" onclick={() => (isOpen = false)}>
				<svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
				Settings
			</a>

			<!-- Theme Toggle - Inline options -->
			<div class="theme-section">
				<div class="theme-label">
					<svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
							d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
					</svg>
					Theme
				</div>
				<div class="theme-options">
					<button
						type="button"
						class="theme-option"
						class:active={currentTheme === 'light'}
						onclick={() => setTheme('light')}
						title="Light mode"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
								d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
						</svg>
					</button>
					<button
						type="button"
						class="theme-option"
						class:active={currentTheme === 'dark'}
						onclick={() => setTheme('dark')}
						title="Dark mode"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
								d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
						</svg>
					</button>
					<button
						type="button"
						class="theme-option"
						class:active={currentTheme === 'system'}
						onclick={() => setTheme('system')}
						title="System preference"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
								d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
					</button>
				</div>
			</div>

			<div class="dropdown-divider"></div>

			<form action="/logout" method="GET" class="logout-form">
				<button type="submit" class="dropdown-item danger">
					<svg class="item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
					Logout
				</button>
			</form>
		</div>
	{/if}
</div>

<style>
	.user-menu-container {
		position: relative;
	}

	.user-trigger {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		background: transparent;
		border: 1px solid transparent;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.user-trigger:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.user-name {
		max-width: 150px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chevron {
		transition: transform 0.2s ease;
		opacity: 0.6;
	}

	.chevron.rotate {
		transform: rotate(180deg);
	}

	.user-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		min-width: 160px;
		background: #18181b;
		border: 1px solid #3f3f46;
		border-radius: 0.75rem;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
		z-index: 50;
		overflow: hidden;
		padding: 0.375rem;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.9);
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		text-decoration: none;
		transition: background 0.15s ease;
	}

	.dropdown-item:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.dropdown-item.danger {
		color: #f87171;
	}

	.dropdown-item.danger:hover {
		background: rgba(248, 113, 113, 0.1);
	}

	.item-icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.dropdown-divider {
		height: 1px;
		background: #3f3f46;
		margin: 0.375rem 0;
	}

	.logout-form {
		display: contents;
	}

	/* Theme section - inline style */
	.theme-section {
		padding: 0.375rem 0.75rem;
	}

	.theme-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		margin-bottom: 0.5rem;
	}

	.theme-options {
		display: flex;
		gap: 0.25rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.5rem;
		padding: 0.25rem;
	}

	.theme-option {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
		color: rgba(255, 255, 255, 0.6);
	}

	.theme-option:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.9);
	}

	.theme-option.active {
		background: rgba(59, 130, 246, 0.2);
		color: #60a5fa;
	}

	.theme-option svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	/* Light mode styles */
	:global(html.light) .user-trigger {
		color: rgba(0, 0, 0, 0.8);
	}

	:global(html.light) .user-trigger:hover {
		background: rgba(0, 0, 0, 0.05);
		border-color: rgba(0, 0, 0, 0.1);
	}

	:global(html.light) .user-dropdown {
		background: #ffffff;
		border-color: #e4e4e7;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
	}

	:global(html.light) .dropdown-item {
		color: rgba(0, 0, 0, 0.8);
	}

	:global(html.light) .dropdown-item:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	:global(html.light) .dropdown-item.danger {
		color: #dc2626;
	}

	:global(html.light) .dropdown-item.danger:hover {
		background: rgba(220, 38, 38, 0.08);
	}

	:global(html.light) .dropdown-divider {
		background: #e4e4e7;
	}

	:global(html.light) .theme-label {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .theme-options {
		background: rgba(0, 0, 0, 0.05);
	}

	:global(html.light) .theme-option {
		color: rgba(0, 0, 0, 0.5);
	}

	:global(html.light) .theme-option:hover {
		background: rgba(0, 0, 0, 0.08);
		color: rgba(0, 0, 0, 0.8);
	}

	:global(html.light) .theme-option.active {
		background: rgba(59, 130, 246, 0.15);
		color: #2563eb;
	}
</style>
