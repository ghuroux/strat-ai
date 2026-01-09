<script lang="ts">
	import AdminHeader from './AdminHeader.svelte';
	import AdminSidebar from './AdminSidebar.svelte';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		organizationName?: string;
		children: import('svelte').Snippet;
	}

	let { organizationName = 'Organization', children }: Props = $props();

	// Mobile sidebar state
	let mobileMenuOpen = $state(false);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<div class="admin-layout">
	<AdminHeader {organizationName} onMenuToggle={toggleMobileMenu} />

	<div class="admin-body">
		<!-- Desktop sidebar -->
		<AdminSidebar />

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
					<AdminSidebar />
				</div>
			</div>
		{/if}

		<!-- Main content -->
		<main class="admin-content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.admin-layout {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--color-surface-950);
	}

	.admin-body {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.admin-content {
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
	.mobile-sidebar :global(.admin-sidebar) {
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
