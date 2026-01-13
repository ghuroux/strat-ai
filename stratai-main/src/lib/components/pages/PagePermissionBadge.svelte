<script lang="ts">
	/**
	 * PagePermissionBadge.svelte - Reusable permission badge component
	 *
	 * Displays page permissions with color-coding, icons, and optional tooltips.
	 * Used in share lists, headers, and anywhere permission indication is needed.
	 * Pattern: Follows AreaRoleBadge.svelte for consistency.
	 */

	import { Eye, Edit, Shield } from 'lucide-svelte';
	import type { PagePermission } from '$lib/types/page-sharing';
	import { PAGE_PERMISSION_LABELS, PAGE_PERMISSION_DESCRIPTIONS } from '$lib/types/page-sharing';

	interface Props {
		permission: PagePermission;
		size?: 'sm' | 'md';
		showTooltip?: boolean;
	}

	let { permission, size = 'md', showTooltip = true }: Props = $props();

	// Get the appropriate icon for each permission
	function getPermissionIcon(permission: PagePermission) {
		switch (permission) {
			case 'viewer':
				return Eye;
			case 'editor':
				return Edit;
			case 'admin':
				return Shield;
		}
	}

	let PermissionIcon = $derived(getPermissionIcon(permission));
	let tooltip = $derived(showTooltip ? PAGE_PERMISSION_DESCRIPTIONS[permission] : undefined);
</script>

<span
	class="permission-badge"
	class:size-sm={size === 'sm'}
	class:size-md={size === 'md'}
	data-permission={permission}
	title={tooltip}
>
	<svelte:component this={PermissionIcon} size={14} strokeWidth={2} />
	<span class="permission-label">{PAGE_PERMISSION_LABELS[permission]}</span>
</span>

<style>
	.permission-badge {
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

	.permission-badge.size-sm {
		padding: 0.125rem 0.375rem;
		font-size: 0.6875rem;
		gap: 0.2rem;
	}

	.permission-badge.size-sm :global(svg) {
		width: 12px;
		height: 12px;
	}

	.permission-badge[data-permission='viewer'] {
		background: var(--permission-viewer-bg);
		color: var(--permission-viewer);
	}

	.permission-badge[data-permission='editor'] {
		background: var(--permission-editor-bg);
		color: var(--permission-editor);
	}

	.permission-badge[data-permission='admin'] {
		background: var(--permission-admin-bg);
		color: var(--permission-admin);
	}

	.permission-label {
		line-height: 1;
	}
</style>
