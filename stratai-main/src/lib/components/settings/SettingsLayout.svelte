<script lang="ts">
	import SettingsHeader from './SettingsHeader.svelte';
	import SettingsSidebar from './SettingsSidebar.svelte';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		activeSection: string;
		onSectionChange: (section: string) => void;
		children: import('svelte').Snippet;
	}

	let { activeSection, onSectionChange, children }: Props = $props();

	// Mobile sidebar state
	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	function handleSectionChange(section: string) {
		onSectionChange(section);
		closeMobileMenu();
	}
</script>

<div class="settings-layout">
	<SettingsHeader onMenuToggle={toggleMobileMenu} />

	<div class="settings-body">
		<!-- Desktop sidebar -->
		<SettingsSidebar {activeSection} onSectionChange={handleSectionChange} />

		<!-- Mobile sidebar overlay -->
		{#if mobileMenuOpen}
			<div class="mobile-overlay" transition:fade={{ duration: 150 }}>
				<button
					type="button"
					class="overlay-backdrop"
					onclick={closeMobileMenu}
					aria-label="Close menu"
				></button>
				<div class="mobile-sidebar" transition:fly={{ x: -240, duration: 200 }}>
					<SettingsSidebar {activeSection} onSectionChange={handleSectionChange} />
				</div>
			</div>
		{/if}

		<!-- Main content -->
		<main class="settings-content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.settings-layout {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--color-surface-950);
	}

	.settings-body {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.settings-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	/* Mobile overlay */
	.mobile-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
	}

	.overlay-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		border: none;
		cursor: pointer;
	}

	.mobile-sidebar {
		position: relative;
		z-index: 1;
		width: 240px;
		height: 100%;
		background: var(--color-surface-900);
	}

	/* Show sidebar as slide-over component on mobile */
	.mobile-sidebar :global(.settings-sidebar) {
		display: block;
		width: 100%;
		height: 100%;
		border-right: none;
	}

	@media (min-width: 1024px) {
		.mobile-overlay {
			display: none;
		}
	}
</style>
