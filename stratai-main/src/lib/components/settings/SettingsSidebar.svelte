<script lang="ts">
	interface Props {
		activeSection: string;
		onSectionChange: (section: string) => void;
	}

	let { activeSection, onSectionChange }: Props = $props();

	// Navigation sections
	const navSections = [
		{
			label: 'PREFERENCES',
			items: [
				{ id: 'general', label: 'General', icon: 'home' },
				{ id: 'appearance', label: 'Appearance', icon: 'color-swatch' }
			]
		},
		{
			label: 'ACCOUNT',
			items: [{ id: 'profile', label: 'Profile', icon: 'user' }]
		},
		{
			label: 'AI',
			items: [{ id: 'ai-preferences', label: 'Chat Preferences', icon: 'sparkles' }]
		},
		{
			label: 'HELP',
			items: [{ id: 'shortcuts', label: 'Keyboard Shortcuts', icon: 'command' }]
		},
		{
			label: 'DATA',
			items: [{ id: 'privacy', label: 'Privacy & Export', icon: 'shield-check' }]
		}
	];

	// Icon paths
	const icons: Record<string, string> = {
		home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
		'color-swatch':
			'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
		user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
		sparkles:
			'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
		command:
			'M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z',
		'shield-check':
			'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
	};

	function handleClick(sectionId: string) {
		onSectionChange(sectionId);
	}
</script>

<aside class="settings-sidebar">
	<nav class="sidebar-nav">
		{#each navSections as section}
			<div class="nav-section">
				<span class="nav-section-label">{section.label}</span>
				{#each section.items as item}
					<button
						type="button"
						class="nav-item"
						class:active={activeSection === item.id}
						onclick={() => handleClick(item.id)}
					>
						<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d={icons[item.icon]}
							/>
						</svg>
						{item.label}
					</button>
				{/each}
			</div>
		{/each}
	</nav>
</aside>

<style>
	.settings-sidebar {
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
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-300);
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		text-align: left;
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
		.settings-sidebar {
			display: none;
		}
	}
</style>
