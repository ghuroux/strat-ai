<script lang="ts">
	/**
	 * AreaCard - Clickable area card for Space Dashboard
	 *
	 * Premium, clean design with:
	 * - Area name and icon
	 * - Conversation count and last activity
	 * - Hover effects and visual feedback
	 * - Special styling for General area
	 * - Context menu for edit/delete
	 */
	import type { Area } from '$lib/types/areas';
	import AreaSharedIndicator from '$lib/components/areas/AreaSharedIndicator.svelte';

	interface Props {
		area: Area;
		conversationCount?: number;
		lastActivity?: Date | null;
		spaceColor?: string;
		memberCount?: number; // Phase 4
		onclick: () => void;
		onEdit?: (area: Area) => void;
		onDelete?: (area: Area) => void;
		onShare?: (area: Area) => void; // Phase 4
	}

	let {
		area,
		conversationCount = 0,
		lastActivity = null,
		spaceColor = '#3b82f6',
		memberCount,
		onclick,
		onEdit,
		onDelete,
		onShare
	}: Props = $props();

	// Menu state
	let showMenu = $state(false);

	function handleMenuClick(e: Event) {
		e.stopPropagation();
		showMenu = !showMenu;
	}

	function handleEdit(e: Event) {
		e.stopPropagation();
		showMenu = false;
		onEdit?.(area);
	}

	function handleDelete(e: Event) {
		e.stopPropagation();
		showMenu = false;
		onDelete?.(area);
	}

	function handleShare(e: Event) {
		e.stopPropagation();
		showMenu = false;
		onShare?.(area);
	}

	function closeMenu() {
		showMenu = false;
	}

	// Format relative time
	function formatRelativeTime(date: Date | null): string {
		if (!date) return '';

		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	let activityText = $derived(formatRelativeTime(lastActivity));
	let chatLabel = $derived(conversationCount === 1 ? 'chat' : 'chats');
	let cardColor = $derived(area.color || spaceColor);
</script>

<!-- Backdrop to close menu when clicking outside -->
{#if showMenu}
	<button
		type="button"
		class="menu-backdrop"
		onclick={closeMenu}
		aria-label="Close menu"
	></button>
{/if}

<button
	type="button"
	class="area-card"
	class:general={area.isGeneral}
	class:menu-open={showMenu}
	style="--card-color: {cardColor}"
	onclick={onclick}
>
	<!-- Menu button (visible on hover) -->
	{#if onEdit || (onDelete && !area.isGeneral)}
		<button
			type="button"
			class="menu-trigger"
			onclick={handleMenuClick}
			title="Options"
		>
			<svg viewBox="0 0 24 24" fill="currentColor">
				<circle cx="12" cy="6" r="1.5" />
				<circle cx="12" cy="12" r="1.5" />
				<circle cx="12" cy="18" r="1.5" />
			</svg>
		</button>

		<!-- Dropdown menu -->
		{#if showMenu}
			<div class="menu-dropdown">
				{#if onEdit}
					<button type="button" class="menu-item" onclick={handleEdit}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
						</svg>
						Edit
					</button>
				{/if}
				{#if onShare}
					<button type="button" class="menu-item" onclick={handleShare}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
						</svg>
						Share
					</button>
				{/if}
				{#if onDelete && !area.isGeneral}
					<button type="button" class="menu-item danger" onclick={handleDelete}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
						</svg>
						Delete
					</button>
				{/if}
			</div>
		{/if}
	{/if}

	<div class="card-header">
		<div class="card-icon">
			{#if area.icon}
				<span class="icon-emoji">{area.icon}</span>
			{:else if area.isGeneral}
				<!-- Inbox/Home icon for General area -->
				<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
				</svg>
			{:else}
				<!-- Folder icon for custom areas -->
				<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
				</svg>
			{/if}
		</div>
		<div class="card-title">
			<h3 class="title">{area.name}</h3>
			{#if area.isGeneral}
				<span class="badge">Default</span>
			{/if}
			{#if memberCount && memberCount > 1}
				<AreaSharedIndicator
					{memberCount}
					isRestricted={area.isRestricted ?? false}
					onClick={(e: MouseEvent) => {
						e.stopPropagation();
						onShare?.(area);
					}}
				/>
			{/if}
		</div>
	</div>

	<div class="card-meta">
		<span class="stat">
			{conversationCount} {chatLabel}
		</span>
		{#if activityText}
			<span class="separator">·</span>
			<span class="activity">{activityText}</span>
		{/if}
	</div>

	{#if area.context}
		<div class="card-context">
			<span class="context-indicator" title="Has context">
				<svg class="context-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Context added
			</span>
		</div>
	{/if}

	<div class="card-arrow">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
		</svg>
	</div>
</button>

<style>
	.area-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.25rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		min-height: 120px;
	}

	.area-card:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: color-mix(in srgb, var(--card-color) 40%, transparent);
		transform: translateY(-2px);
		box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.3);
	}

	/* Disable transform when menu is open to prevent flicker */
	.area-card.menu-open,
	.area-card.menu-open:hover {
		transform: none;
	}

	.area-card:focus-visible {
		outline: 2px solid var(--card-color);
		outline-offset: 2px;
	}

	.area-card.general {
		border-color: rgba(255, 255, 255, 0.12);
	}

	.card-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: color-mix(in srgb, var(--card-color) 15%, transparent);
		border-radius: 0.5rem;
		color: var(--card-color);
		flex-shrink: 0;
	}

	.icon-emoji {
		font-size: 1.25rem;
	}

	.icon-svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.card-title {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 0;
	}

	.title {
		font-size: 1rem;
		font-weight: 600;
		color: #fff;
		margin: 0;
		line-height: 1.3;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.375rem;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--card-color);
		background: color-mix(in srgb, var(--card-color) 15%, transparent);
		border-radius: 0.25rem;
		width: fit-content;
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.stat {
		color: rgba(255, 255, 255, 0.7);
	}

	.separator {
		color: rgba(255, 255, 255, 0.3);
	}

	.activity {
		color: rgba(255, 255, 255, 0.4);
	}

	.card-context {
		margin-top: auto;
	}

	.context-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.context-icon {
		width: 0.875rem;
		height: 0.875rem;
		color: var(--card-color);
		opacity: 0.7;
	}

	.card-arrow {
		position: absolute;
		top: 50%;
		right: 1rem;
		transform: translateY(-50%);
		width: 1.25rem;
		height: 1.25rem;
		color: rgba(255, 255, 255, 0.2);
		transition: all 0.2s ease;
	}

	.area-card:hover .card-arrow {
		color: var(--card-color);
		transform: translateY(-50%) translateX(4px);
	}

	/* Menu backdrop */
	.menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: transparent;
		border: none;
		cursor: default;
	}

	/* Menu trigger button */
	.menu-trigger {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		color: rgba(255, 255, 255, 0.3);
		cursor: pointer;
		opacity: 0;
		transition: all 0.15s ease;
		z-index: 10;
	}

	.menu-trigger svg {
		width: 1rem;
		height: 1rem;
	}

	.area-card:hover .menu-trigger,
	.area-card.menu-open .menu-trigger {
		opacity: 1;
	}

	.menu-trigger:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
	}

	/* Menu dropdown */
	.menu-dropdown {
		position: absolute;
		top: 2.5rem;
		right: 0.75rem;
		min-width: 120px;
		padding: 0.375rem;
		background: #1e1e1e;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		z-index: 50;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.625rem;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.8);
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-align: left;
	}

	.menu-item svg {
		width: 0.875rem;
		height: 0.875rem;
		flex-shrink: 0;
	}

	.menu-item:hover {
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
	}

	.menu-item.danger {
		color: #f87171;
	}

	.menu-item.danger:hover {
		background: rgba(239, 68, 68, 0.15);
		color: #fca5a5;
	}
</style>
