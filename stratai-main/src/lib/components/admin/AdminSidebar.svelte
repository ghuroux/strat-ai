<script lang="ts">
	import { page } from '$app/stores';

	// Navigation sections following design document
	const navSections = [
		{
			label: 'OVERVIEW',
			items: [
				{ href: '/admin/overview', label: 'Dashboard', icon: 'home' }
			]
		},
		{
			label: 'PEOPLE',
			items: [
				{ href: '/admin/members', label: 'Members', icon: 'users' },
				{ href: '/admin/groups', label: 'Groups', icon: 'user-group' }
			]
		},
		{
			label: 'ACCESS',
			items: [
				{ href: '/admin/model-access', label: 'Model Tiers', icon: 'sparkles' }
			]
		},
		{
			label: 'USAGE',
			items: [
				{ href: '/admin/usage', label: 'Usage', icon: 'chart-bar' },
				{ href: '/admin/budgets', label: 'Budgets', icon: 'currency-dollar' }
			]
		},
		{
			label: 'SETTINGS',
			items: [
				{ href: '/admin/settings', label: 'General', icon: 'cog' }
			]
		}
	];

	// Check if nav item is active (current path starts with href)
	function isActive(href: string): boolean {
		const path = $page.url.pathname;
		// Exact match for overview (which is also /admin)
		if (href === '/admin/overview') {
			return path === '/admin' || path === '/admin/overview';
		}
		return path.startsWith(href);
	}

	// Icon component paths
	const icons: Record<string, string> = {
		'home': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
		'users': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
		'user-group': 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
		'sparkles': 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
		'chart-bar': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
		'currency-dollar': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		'cog': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
	};
</script>

<aside class="admin-sidebar">
	<nav class="sidebar-nav">
		{#each navSections as section}
			<div class="nav-section">
				<span class="nav-section-label">{section.label}</span>
				{#each section.items as item}
					<a
						href={item.href}
						class="nav-item"
						class:active={isActive(item.href)}
					>
						<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={icons[item.icon]} />
						</svg>
						{item.label}
					</a>
				{/each}
			</div>
		{/each}
	</nav>
</aside>

<style>
	.admin-sidebar {
		width: 240px;
		flex-shrink: 0;
		background: var(--color-surface-900);
		border-right: 1px solid var(--color-surface-800);
		overflow-y: auto;
	}

	.sidebar-nav {
		padding: 1rem 0.75rem;
	}

	.nav-section {
		margin-bottom: 1.5rem;
	}

	.nav-section:last-child {
		margin-bottom: 0;
	}

	.nav-section-label {
		display: block;
		padding: 0 0.75rem;
		margin-bottom: 0.5rem;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-surface-400);
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-300);
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.nav-item:hover {
		color: var(--color-surface-100);
		background: var(--color-surface-800);
	}

	.nav-item.active {
		color: var(--color-primary-400);
		background: color-mix(in srgb, var(--color-primary-500) 15%, transparent);
	}

	.nav-icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	/* Mobile: sidebar hidden by default */
	@media (max-width: 1023px) {
		.admin-sidebar {
			display: none;
		}
	}
</style>
