<script lang="ts">
	/**
	 * SpaceRoleBadge.svelte - Space member role badge
	 *
	 * Displays space member roles with color-coding and icons.
	 * Mirrors AreaRoleBadge pattern.
	 */

	import { Crown, Shield, User, Eye } from 'lucide-svelte';
	import type { SpaceRole } from '$lib/types/space-memberships';
	import { SPACE_ROLE_LABELS, SPACE_ROLE_DESCRIPTIONS } from '$lib/types/space-memberships';

	interface Props {
		role: SpaceRole;
		size?: 'sm' | 'md';
		showTooltip?: boolean;
	}

	let { role, size = 'md', showTooltip = true }: Props = $props();

	// Get the appropriate icon for each role
	function getRoleIcon(role: SpaceRole) {
		switch (role) {
			case 'owner':
				return Crown;
			case 'admin':
				return Shield;
			case 'member':
				return User;
			case 'guest':
				return Eye;
		}
	}

	let RoleIcon = $derived(getRoleIcon(role));
	let tooltip = $derived(showTooltip ? SPACE_ROLE_DESCRIPTIONS[role] : undefined);
</script>

<span
	class="role-badge"
	class:size-sm={size === 'sm'}
	class:size-md={size === 'md'}
	data-role={role}
	title={tooltip}
>
	<svelte:component this={RoleIcon} size={14} strokeWidth={2} />
	<span class="role-label">{SPACE_ROLE_LABELS[role]}</span>
</span>

<style>
	.role-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
		transition: opacity 0.15s ease;
	}

	.role-badge.size-sm {
		padding: 0.125rem 0.375rem;
		font-size: 0.6875rem;
		gap: 0.2rem;
	}

	.role-badge.size-sm :global(svg) {
		width: 12px;
		height: 12px;
	}

	.role-badge[data-role='owner'] {
		background: var(--role-owner-bg);
		color: var(--role-owner);
	}

	.role-badge[data-role='admin'] {
		background: var(--role-admin-bg);
		color: var(--role-admin);
	}

	.role-badge[data-role='member'] {
		background: var(--role-member-bg);
		color: var(--role-member);
	}

	.role-badge[data-role='guest'] {
		background: var(--role-viewer-bg);
		color: var(--role-viewer);
	}

	.role-label {
		line-height: 1;
	}
</style>
