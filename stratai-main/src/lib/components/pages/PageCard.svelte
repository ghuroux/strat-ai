<script lang="ts">
	/**
	 * PageCard.svelte - Card component for page list
	 *
	 * Displays a page in the list with:
	 * - Type icon
	 * - Title
	 * - Type label and word count
	 * - Last updated time
	 * - Visibility indicator
	 * - 3-dot menu with Share and Delete options
	 *
	 * Based on DOCUMENT_SYSTEM.md Section 4.7
	 */

	import type { Page, PageType } from '$lib/types/page';
	import { PAGE_TYPE_LABELS, PAGE_TYPE_ICONS } from '$lib/types/page';

	// Props
	interface Props {
		page: Page;
		onclick?: () => void;
		onDelete?: (page: Page) => void;
		onShare?: (page: Page) => void;
	}

	let { page, onclick, onDelete, onShare }: Props = $props();

	// Menu state
	let menuOpen = $state(false);
	let menuButtonRef = $state<HTMLButtonElement | null>(null);

	// Toggle menu
	function toggleMenu(e: MouseEvent) {
		e.stopPropagation();
		menuOpen = !menuOpen;
	}

	// Close menu when clicking outside
	function handleClickOutside(e: MouseEvent) {
		if (menuOpen && menuButtonRef && !menuButtonRef.contains(e.target as Node)) {
			menuOpen = false;
		}
	}

	// Handle delete click
	function handleDeleteClick(e: MouseEvent) {
		e.stopPropagation();
		menuOpen = false;
		onDelete?.(page);
	}

	// Handle share click
	// TODO: Implement sharing functionality - for now just shows a placeholder toast
	function handleShareClick(e: MouseEvent) {
		e.stopPropagation();
		menuOpen = false;
		onShare?.(page);
	}

	// Get type info
	const typeLabel = $derived(PAGE_TYPE_LABELS[page.pageType] || page.pageType);
	const typeIcon = $derived(PAGE_TYPE_ICONS[page.pageType] || 'FileText');

	// Format relative time
	function formatRelativeTime(date: Date): string {
		const now = new Date();
		const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diff < 60) return 'Just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
		return date.toLocaleDateString();
	}

	// Get icon SVG based on type
	function getIconPath(icon: string): string {
		switch (icon) {
			case 'FileText':
				return 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8';
			case 'Users':
				return 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75';
			case 'Scale':
				return 'M12 3v18 M5 8l7-5 7 5 M5 8v6c0 1.5 3.5 3 7 3s7-1.5 7-3V8';
			case 'FileEdit':
				return 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z';
			case 'Briefcase':
				return 'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16';
			case 'Calendar':
				return 'M16 2v4 M8 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z';
			case 'Code':
				return 'M16 18l6-6-6-6 M8 6l-6 6 6 6';
			default:
				return 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8';
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="page-card-wrapper">
	<button type="button" class="page-card" {onclick}>
		<div class="card-icon">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<path d={getIconPath(typeIcon)} />
			</svg>
		</div>

		<div class="card-content">
			<h3 class="card-title">{page.title}</h3>
			<div class="card-meta">
				<span class="page-type">{typeLabel}</span>
				<span class="separator">·</span>
				<span class="word-count">{page.wordCount} words</span>
			</div>
		</div>

		<div class="card-footer">
			<span class="updated">{formatRelativeTime(page.updatedAt)}</span>
			{#if page.visibility === 'private'}
				<svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
					<path d="M7 11V7a5 5 0 0 1 10 0v4" />
				</svg>
			{/if}
		</div>
	</button>

	<!-- 3-dot menu button -->
	<div class="menu-container">
		<button
			type="button"
			class="menu-button"
			bind:this={menuButtonRef}
			onclick={toggleMenu}
			aria-label="Page options"
			aria-expanded={menuOpen}
		>
			<svg viewBox="0 0 24 24" fill="currentColor">
				<circle cx="12" cy="5" r="1.5" />
				<circle cx="12" cy="12" r="1.5" />
				<circle cx="12" cy="19" r="1.5" />
			</svg>
		</button>

		{#if menuOpen}
			<div class="menu-dropdown" role="menu">
				<!-- TODO: Implement sharing functionality - currently shows placeholder -->
				<button type="button" class="menu-item" onclick={handleShareClick} role="menuitem">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="18" cy="5" r="3" />
						<circle cx="6" cy="12" r="3" />
						<circle cx="18" cy="19" r="3" />
						<line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
						<line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
					</svg>
					<span>Share</span>
				</button>
				<div class="menu-divider"></div>
				<button type="button" class="menu-item menu-item-danger" onclick={handleDeleteClick} role="menuitem">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="3 6 5 6 21 6" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						<line x1="10" y1="11" x2="10" y2="17" />
						<line x1="14" y1="11" x2="14" y2="17" />
					</svg>
					<span>Delete</span>
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.page-card-wrapper {
		position: relative;
	}

	.page-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.25rem;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		border-radius: 12px;
		cursor: pointer;
		transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
		text-align: left;
		width: 100%;
	}

	.page-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		border-color: var(--editor-border-focus);
	}

	/* Menu container */
	.menu-container {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		z-index: 10;
	}

	.menu-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: none;
		background: transparent;
		border-radius: 6px;
		color: var(--editor-text-muted);
		cursor: pointer;
		opacity: 0;
		transition: opacity 150ms ease, background-color 100ms ease, color 100ms ease;
	}

	.page-card-wrapper:hover .menu-button,
	.menu-button[aria-expanded="true"] {
		opacity: 1;
	}

	.menu-button:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	.menu-button svg {
		width: 16px;
		height: 16px;
	}

	/* Dropdown menu */
	.menu-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 4px;
		min-width: 160px;
		background: var(--editor-bg);
		border: 1px solid var(--editor-border);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		padding: 4px;
		z-index: 100;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: none;
		background: transparent;
		color: var(--editor-text);
		font-size: 0.875rem;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 100ms ease;
		text-align: left;
	}

	.menu-item:hover {
		background: var(--toolbar-button-hover);
	}

	.menu-item svg {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.menu-item-danger {
		color: #ef4444;
	}

	.menu-item-danger:hover {
		background: rgba(239, 68, 68, 0.1);
	}

	.menu-divider {
		height: 1px;
		background: var(--editor-border);
		margin: 4px 0;
	}

	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--toolbar-button-hover);
		border-radius: 8px;
		color: var(--editor-text-secondary);
	}

	.card-icon svg {
		width: 20px;
		height: 20px;
	}

	.card-content {
		flex: 1;
		min-width: 0;
	}

	.card-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--editor-text);
		margin: 0 0 0.25rem 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: var(--editor-text-secondary);
	}

	.page-type {
		font-weight: 500;
	}

	.separator {
		opacity: 0.5;
	}

	.card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.75rem;
		color: var(--editor-text-muted);
	}

	.lock-icon {
		width: 14px;
		height: 14px;
	}
</style>
