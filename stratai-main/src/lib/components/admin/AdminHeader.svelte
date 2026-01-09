<script lang="ts">
	import { page } from '$app/stores';
	import UserMenu from '../layout/UserMenu.svelte';

	interface Props {
		organizationName?: string;
		onMenuToggle?: () => void;
	}

	let { organizationName = 'Organization', onMenuToggle }: Props = $props();

	// Get user data from page data (set by +layout.server.ts)
	let userData = $derived($page.data.user as { displayName: string | null; role: 'owner' | 'admin' | 'member' } | null);
</script>

<header class="admin-header">
	<!-- Left: Back link and org name -->
	<div class="header-left">
		<!-- Mobile menu toggle -->
		<button
			type="button"
			class="menu-toggle lg:hidden"
			onclick={onMenuToggle}
			aria-label="Toggle menu"
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>

		<!-- Back to app -->
		<a href="/" class="back-link">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
			</svg>
			<span>Back to StratAI</span>
		</a>

		<span class="header-separator"></span>

		<h1 class="org-title">{organizationName} Admin</h1>
	</div>

	<!-- Right: User menu -->
	<div class="header-right">
		{#if userData}
			<UserMenu displayName={userData.displayName} role={userData.role} />
		{/if}
	</div>
</header>

<style>
	.admin-header {
		height: 4rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1.5rem;
		background: var(--color-surface-900);
		border-bottom: 1px solid var(--color-surface-800);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.menu-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		color: var(--color-surface-400);
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.menu-toggle:hover {
		color: var(--color-surface-100);
		background: var(--color-surface-800);
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-400);
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.back-link:hover {
		color: var(--color-surface-100);
		background: var(--color-surface-800);
	}

	.back-link span {
		display: none;
	}

	@media (min-width: 640px) {
		.back-link span {
			display: inline;
		}
	}

	.header-separator {
		width: 1px;
		height: 1.5rem;
		background: var(--color-surface-700);
	}

	.org-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-surface-100);
	}

	@media (min-width: 1024px) {
		.menu-toggle {
			display: none;
		}
	}
</style>
