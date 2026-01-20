<script lang="ts">
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { getSpaceDisplayName } from '$lib/utils/space-display';
	import AllSpacesDropdown from './AllSpacesDropdown.svelte';
	import type { Space } from '$lib/types/spaces';

	interface Props {
		currentUserId: string;
		currentSpaceSlug?: string | null;
	}

	let { currentUserId, currentSpaceSlug = null }: Props = $props();

	// Derived states from store
	let pinnedSpaces = $derived(spacesStore.getPinnedSpaces());

	// Context menu state
	let showContextMenu = $state(false);
	let contextMenuSpace = $state<Space | null>(null);
	let contextMenuX = $state(0);
	let contextMenuY = $state(0);

	function handleContextMenu(e: MouseEvent, space: Space) {
		e.preventDefault();
		contextMenuSpace = space;
		contextMenuX = e.clientX;
		contextMenuY = e.clientY;
		showContextMenu = true;
	}

	function closeContextMenu() {
		showContextMenu = false;
		contextMenuSpace = null;
	}

	async function handleUnpinFromMenu() {
		if (contextMenuSpace) {
			await spacesStore.unpinSpace(contextMenuSpace.id);
		}
		closeContextMenu();
	}

	// Handle click outside to close context menu
	function handleClickOutside() {
		if (showContextMenu) {
			closeContextMenu();
		}
	}

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && showContextMenu) {
			closeContextMenu();
		}
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<nav class="space-nav-tabs">
	<!-- Pinned Space Tabs -->
	{#each pinnedSpaces as space (space.id)}
		<a
			href="/spaces/{space.slug}"
			class="space-nav-item"
			class:active={currentSpaceSlug === space.slug}
			style="--space-color: {space.color || '#6b7280'}"
			oncontextmenu={(e) => handleContextMenu(e, space)}
			title={getSpaceDisplayName(space, currentUserId)}
		>
			<span class="space-color-dot"></span>
			<span class="space-name">{getSpaceDisplayName(space, currentUserId)}</span>
		</a>
	{/each}

	<!-- Show separator if there are pinned spaces (desktop only) -->
	{#if pinnedSpaces.length > 0}
		<span class="space-nav-separator hidden lg:inline-block"></span>
	{/if}

	<!-- All Spaces Dropdown (Desktop ≥1024px only) -->
	<div class="hidden lg:block">
		<AllSpacesDropdown {currentUserId} {currentSpaceSlug} />
	</div>
</nav>

<!-- Context Menu -->
{#if showContextMenu && contextMenuSpace}
	<div
		class="context-menu"
		style="left: {contextMenuX}px; top: {contextMenuY}px"
		onclick={(e) => e.stopPropagation()}
		role="menu"
	>
		<button
			type="button"
			class="context-menu-item"
			onclick={handleUnpinFromMenu}
			role="menuitem"
		>
			<svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
			</svg>
			Unpin from navigation
		</button>
	</div>
{/if}

<style>
	.space-nav-tabs {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.space-nav-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
		text-decoration: none;
		max-width: 10rem;
	}

	.space-nav-item:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.05);
	}

	.space-nav-item.active {
		color: var(--space-color, #fff);
		background: color-mix(in srgb, var(--space-color, #3b82f6) 15%, transparent);
	}

	.space-color-dot {
		width: 0.5rem;
		height: 0.5rem;
		background: var(--space-color, #6b7280);
		border-radius: 50%;
		flex-shrink: 0;
	}

	.space-name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.space-nav-separator {
		width: 1px;
		height: 1rem;
		background: rgba(255, 255, 255, 0.15);
		margin: 0 0.25rem;
	}

	/* Context Menu */
	.context-menu {
		position: fixed;
		min-width: 180px;
		background: #18181b;
		border: 1px solid #3f3f46;
		border-radius: 0.5rem;
		box-shadow:
			0 10px 40px rgba(0, 0, 0, 0.4),
			0 0 0 1px rgba(255, 255, 255, 0.05);
		z-index: 100;
		padding: 0.25rem;
		overflow: hidden;
	}

	.context-menu-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #e4e4e7;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		text-align: left;
		transition: background-color 0.15s ease;
	}

	.context-menu-item:hover {
		background: #27272a;
	}

	.menu-icon {
		width: 1rem;
		height: 1rem;
		color: #71717a;
	}

	.context-menu-item:hover .menu-icon {
		color: #f87171;
	}
</style>
