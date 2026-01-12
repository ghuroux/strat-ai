<script lang="ts">
	/**
	 * AreaRoleBadge.svelte - Reusable role badge component
	 *
	 * Displays member roles with color-coding, icons, and optional tooltips.
	 * Used in member lists, headers, and anywhere role indication is needed.
	 */

	import { Crown, Settings, Edit, Eye, Link } from 'lucide-svelte';
	import type { AreaMemberRole } from '$lib/types/area-memberships';
	import { getRoleLabel, getRoleDescription } from '$lib/types/area-memberships';

	interface Props {
		role: AreaMemberRole | 'inherited';
		size?: 'sm' | 'md';
		showTooltip?: boolean;
	}

	let { role, size = 'md', showTooltip = true }: Props = $props();

	// Get the appropriate icon for each role
	function getRoleIcon(role: AreaMemberRole | 'inherited') {
		switch (role) {
			case 'owner':
				return Crown;
			case 'admin':
				return Settings;
			case 'member':
				return Edit;
			case 'viewer':
				return Eye;
			case 'inherited':
				return Link;
		}
	}

	let RoleIcon = $derived(getRoleIcon(role));
	let tooltip = $derived(showTooltip ? getRoleDescription(role) : undefined);
</script>

<span
	class="role-badge"
	class:size-sm={size === 'sm'}
	class:size-md={size === 'md'}
	data-role={role}
	title={tooltip}
>
	<svelte:component this={RoleIcon} size={14} strokeWidth={2} />
	<span class="role-label">{getRoleLabel(role)}</span>
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

	.role-badge[data-role='viewer'] {
		background: var(--role-viewer-bg);
		color: var(--role-viewer);
	}

	.role-badge[data-role='inherited'] {
		background: var(--role-inherited-bg);
		color: var(--role-inherited);
	}

	.role-label {
		line-height: 1;
	}
</style>
