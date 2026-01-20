<script lang="ts">
	/**
	 * PageCard.svelte - Card component for page list
	 *
	 * Displays a page in the Space-level Pages dashboard with:
	 * - Type icon (lucide-svelte)
	 * - Lock icon for private pages
	 * - Title (truncated at 50 chars)
	 * - Area badge
	 * - Word count
	 * - Relative timestamp
	 * - "Shared by [Name]" for pages not owned by user
	 * - Highlight animation for newly created pages
	 * - 3-dot menu with View/Share/Delete options
	 *
	 * Based on US-013 and PAGES_FIRST_CLASS_NAVIGATION.md
	 */

	import { goto } from '$app/navigation';
	import { FileEdit, Users, Scale, Lock, MoreVertical, Eye, Share2, Trash2 } from 'lucide-svelte';
	import type { Page, PageType } from '$lib/types/page';
	import { PAGE_TYPE_LABELS } from '$lib/types/page';

	// Extended Page type with metadata from API
	interface PageWithMetadata extends Page {
		areaName: string;
		areaSlug: string;
		creatorName: string | null;
		isOwnedByUser: boolean;
	}

	// Props
	interface Props {
		page: PageWithMetadata;
		highlight?: boolean;
		onclick?: () => void;
		onDelete?: (page: PageWithMetadata) => void;
		onShare?: (page: PageWithMetadata) => void;
	}

	let { page, highlight = false, onclick, onDelete, onShare }: Props = $props();

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

	// Handle view click (navigates to page editor)
	function handleViewClick(e: MouseEvent) {
		e.stopPropagation();
		menuOpen = false;
		const spaceSlug = page.spaceId; // Will be resolved by SvelteKit routing
		goto(`/spaces/${spaceSlug}/${page.areaSlug}/page/${page.id}`);
	}

	// Handle delete click
	function handleDeleteClick(e: MouseEvent) {
		e.stopPropagation();
		menuOpen = false;
		onDelete?.(page);
	}

	// Handle share click
	function handleShareClick(e: MouseEvent) {
		e.stopPropagation();
		menuOpen = false;
		onShare?.(page);
	}

	// Handle card click
	function handleCardClick() {
		if (onclick) {
			onclick();
		} else {
			// Default: navigate to page editor
			const spaceSlug = page.spaceId;
			goto(`/spaces/${spaceSlug}/${page.areaSlug}/page/${page.id}`);
		}
	}

	// Get type icon component
	function getTypeIcon(pageType: PageType) {
		switch (pageType) {
			case 'general':
			case 'proposal':
			case 'project_brief':
			case 'weekly_update':
			case 'technical_spec':
				return FileEdit;
			case 'meeting_notes':
				return Users;
			case 'decision_record':
				return Scale;
			default:
				return FileEdit;
		}
	}

	// Derived values
	const typeLabel = $derived(PAGE_TYPE_LABELS[page.pageType] || page.pageType);
	const typeIcon = $derived(getTypeIcon(page.pageType));
	const truncatedTitle = $derived(
		page.title.length > 50 ? page.title.substring(0, 50) + '...' : page.title
	);

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

	// Calculate word count (content length / 5)
	const wordCount = $derived(Math.ceil((page.wordCount || 0)));
</script>

<svelte:window onclick={handleClickOutside} />

<div class="page-card-wrapper">
	<button
		type="button"
		class="page-card"
		class:newly-created={highlight}
		onclick={handleCardClick}
	>
		<!-- Top row: Icon + Title + Lock -->
		<div class="card-header">
			<div class="card-icon">
				<svelte:component this={typeIcon} size={20} />
			</div>
			<h3 class="card-title">{truncatedTitle}</h3>
			{#if page.visibility === 'private'}
				<Lock class="lock-icon" size={14} />
			{/if}
		</div>

		<!-- Area badge -->
		<div class="area-badge">
			{page.areaName}
		</div>

		<!-- Metadata row: Type + Word count -->
		<div class="card-meta">
			<span class="page-type">{typeLabel}</span>
			<span class="separator">·</span>
			<span class="word-count">{wordCount} words</span>
		</div>

		<!-- Footer: Timestamp + Ownership -->
		<div class="card-footer">
			<span class="updated">{formatRelativeTime(page.updatedAt)}</span>
			{#if !page.isOwnedByUser && page.creatorName}
				<span class="shared-by">Shared by {page.creatorName}</span>
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
			<MoreVertical size={16} />
		</button>

		{#if menuOpen}
			<div class="menu-dropdown" role="menu">
				<button type="button" class="menu-item" onclick={handleViewClick} role="menuitem">
					<Eye size={16} />
					<span>View</span>
				</button>
				{#if onShare}
					<button type="button" class="menu-item" onclick={handleShareClick} role="menuitem">
						<Share2 size={16} />
						<span>Share</span>
					</button>
				{/if}
				{#if onDelete}
					<div class="menu-divider"></div>
					<button type="button" class="menu-item menu-item-danger" onclick={handleDeleteClick} role="menuitem">
						<Trash2 size={16} />
						<span>Delete</span>
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	/* Highlight animation for newly created pages */
	@keyframes highlight-pulse {
		0% {
			border-color: rgb(34, 197, 94);
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
		}
		50% {
			border-color: rgb(34, 197, 94);
			box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
		}
		100% {
			border-color: rgb(34, 197, 94);
			box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
		}
	}

	.page-card-wrapper {
		position: relative;
	}

	.page-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.25rem;
		padding-top: 1rem;
		background: rgb(255, 255, 255);
		background: var(--color-surface-card, rgb(255, 255, 255));
		border: 1px solid rgb(228, 228, 231);
		border: 1px solid var(--color-border, rgb(228, 228, 231));
		border-radius: 12px;
		cursor: pointer;
		transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
		text-align: left;
		width: 100%;
	}

	/* Theme-aware colors */
	@media (prefers-color-scheme: dark) {
		.page-card {
			background: rgb(24, 24, 27);
			background: var(--color-surface-card, rgb(24, 24, 27));
			border-color: rgb(63, 63, 70);
			border-color: var(--color-border, rgb(63, 63, 70));
		}
	}

	.page-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		border-color: rgb(161, 161, 170);
		border-color: var(--color-border-hover, rgb(161, 161, 170));
	}

	@media (prefers-color-scheme: dark) {
		.page-card:hover {
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
			border-color: rgb(113, 113, 122);
			border-color: var(--color-border-hover, rgb(113, 113, 122));
		}
	}

	.page-card.newly-created {
		animation: highlight-pulse 2s ease-out;
	}

	/* Card header with icon + title + lock */
	.card-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: rgb(244, 244, 245);
		border-radius: 8px;
		color: rgb(113, 113, 122);
		flex-shrink: 0;
	}

	@media (prefers-color-scheme: dark) {
		.card-icon {
			background: rgb(39, 39, 42);
			color: rgb(161, 161, 170);
		}
	}

	.card-title {
		flex: 1;
		font-size: 1rem;
		font-weight: 600;
		color: rgb(24, 24, 27);
		margin: 0;
		line-height: 1.5;
		min-width: 0;
	}

	@media (prefers-color-scheme: dark) {
		.card-title {
			color: rgb(250, 250, 250);
		}
	}

	.lock-icon {
		flex-shrink: 0;
		color: rgb(161, 161, 170);
		margin-top: 2px;
	}

	/* Area badge */
	.area-badge {
		display: inline-block;
		padding: 0.25rem 0.625rem;
		background: rgb(244, 244, 245);
		border: 1px solid rgb(228, 228, 231);
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgb(63, 63, 70);
		width: fit-content;
	}

	@media (prefers-color-scheme: dark) {
		.area-badge {
			background: rgb(39, 39, 42);
			border-color: rgb(63, 63, 70);
			color: rgb(212, 212, 216);
		}
	}

	/* Metadata row */
	.card-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: rgb(113, 113, 122);
	}

	@media (prefers-color-scheme: dark) {
		.card-meta {
			color: rgb(161, 161, 170);
		}
	}

	.page-type {
		font-weight: 500;
	}

	.separator {
		opacity: 0.5;
	}

	/* Footer */
	.card-footer {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: rgb(161, 161, 170);
	}

	@media (prefers-color-scheme: dark) {
		.card-footer {
			color: rgb(113, 113, 122);
		}
	}

	.shared-by {
		font-style: italic;
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
		color: rgb(161, 161, 170);
		cursor: pointer;
		opacity: 0;
		transition: opacity 150ms ease, background-color 100ms ease, color 100ms ease;
	}

	@media (prefers-color-scheme: dark) {
		.menu-button {
			color: rgb(113, 113, 122);
		}
	}

	.page-card-wrapper:hover .menu-button,
	.menu-button[aria-expanded="true"] {
		opacity: 1;
	}

	.menu-button:hover {
		background: rgb(244, 244, 245);
		color: rgb(24, 24, 27);
	}

	@media (prefers-color-scheme: dark) {
		.menu-button:hover {
			background: rgb(39, 39, 42);
			color: rgb(250, 250, 250);
		}
	}

	/* Dropdown menu */
	.menu-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 4px;
		min-width: 160px;
		background: rgb(255, 255, 255);
		border: 1px solid rgb(228, 228, 231);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		padding: 4px;
		z-index: 100;
	}

	@media (prefers-color-scheme: dark) {
		.menu-dropdown {
			background: rgb(24, 24, 27);
			border-color: rgb(63, 63, 70);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		}
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: none;
		background: transparent;
		color: rgb(39, 39, 42);
		font-size: 0.875rem;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 100ms ease;
		text-align: left;
	}

	@media (prefers-color-scheme: dark) {
		.menu-item {
			color: rgb(250, 250, 250);
		}
	}

	.menu-item:hover {
		background: rgb(244, 244, 245);
	}

	@media (prefers-color-scheme: dark) {
		.menu-item:hover {
			background: rgb(39, 39, 42);
		}
	}

	.menu-item-danger {
		color: #ef4444;
	}

	.menu-item-danger:hover {
		background: rgba(239, 68, 68, 0.1);
	}

	.menu-divider {
		height: 1px;
		background: rgb(228, 228, 231);
		margin: 4px 0;
	}

	@media (prefers-color-scheme: dark) {
		.menu-divider {
			background: rgb(63, 63, 70);
		}
	}
</style>
