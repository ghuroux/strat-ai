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
	// For Space-level views, we need area context and ownership info
	interface PageWithMetadata extends Page {
		areaName?: string;
		areaSlug?: string;
		creatorName?: string | null;
		isOwnedByUser?: boolean;
	}

	// Props
	interface Props {
		page: PageWithMetadata;
		spaceSlug?: string; // Space slug for navigation (required for Space-level views)
		highlight?: boolean;
		onclick?: () => void;
		onDelete?: (page: PageWithMetadata) => void;
		onShare?: (page: PageWithMetadata) => void;
	}

	let { page, spaceSlug, highlight = false, onclick, onDelete, onShare }: Props = $props();

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
		if (spaceSlug && page.areaSlug) {
			goto(`/spaces/${spaceSlug}/${page.areaSlug}/pages/${page.id}`);
		}
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
		} else if (spaceSlug && page.areaSlug) {
			// Default: navigate to page editor (only if we have routing info)
			goto(`/spaces/${spaceSlug}/${page.areaSlug}/pages/${page.id}`);
		}
	}

	// Derived values
	const typeLabel = $derived(PAGE_TYPE_LABELS[page.pageType] || page.pageType);

	// Format relative time (handles both Date objects and ISO strings from API)
	function formatRelativeTime(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		const now = new Date();
		const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

		if (diff < 60) return 'Just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
		return d.toLocaleDateString();
	}

	// Calculate word count (content length / 5)
	const wordCount = $derived(Math.ceil((page.wordCount || 0)));
</script>

<svelte:window onclick={handleClickOutside} />

<div class="group relative">
	<button
		type="button"
		class="page-card flex flex-col gap-3 p-5 pt-4 w-full text-left cursor-pointer
			   bg-white dark:bg-zinc-900
			   border border-zinc-200 dark:border-zinc-700
			   rounded-xl
			   transition-all duration-150
			   hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/30
			   hover:border-zinc-400 dark:hover:border-zinc-600"
		class:newly-created={highlight}
		onclick={handleCardClick}
	>
		<!-- Top row: Icon + Title -->
		<div class="flex items-start gap-3">
			<div class="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0
						bg-zinc-100 dark:bg-zinc-800
						text-zinc-500 dark:text-zinc-400">
				{#if page.pageType === 'meeting_notes'}
					<Users size={20} />
				{:else if page.pageType === 'decision_record'}
					<Scale size={20} />
				{:else}
					<FileEdit size={20} />
				{/if}
			</div>
			<h3 class="flex-1 text-base font-semibold leading-snug min-w-0 pr-6
					   text-zinc-900 dark:text-zinc-100
					   line-clamp-2">
				{page.title}
			</h3>
		</div>

		<!-- Area badge (only shown in Space-level views) -->
		{#if page.areaName}
			<div class="inline-block w-fit px-2.5 py-1 rounded-full text-xs font-medium
						bg-zinc-100 dark:bg-zinc-800
						border border-zinc-200 dark:border-zinc-700
						text-zinc-600 dark:text-zinc-400">
				{page.areaName}
			</div>
		{/if}

		<!-- Metadata row: Type + Word count -->
		<div class="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
			<span class="font-medium">{typeLabel}</span>
			<span class="opacity-50">·</span>
			<span>{wordCount} words</span>
		</div>

		<!-- Footer: Lock + Timestamp + Ownership -->
		<div class="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
			{#if page.visibility === 'private'}
				<Lock size={12} class="flex-shrink-0" />
			{/if}
			<span>{formatRelativeTime(page.updatedAt)}</span>
			{#if page.isOwnedByUser === false && page.creatorName}
				<span class="italic">Shared by {page.creatorName}</span>
			{/if}
		</div>
	</button>

	<!-- 3-dot menu button -->
	<div class="absolute top-3 right-3 z-10">
		<button
			type="button"
			class="flex items-center justify-center w-7 h-7 rounded-md
				   text-zinc-400 dark:text-zinc-500
				   opacity-0 group-hover:opacity-100 aria-expanded:opacity-100
				   hover:bg-zinc-100 dark:hover:bg-zinc-800
				   hover:text-zinc-900 dark:hover:text-zinc-100
				   transition-all duration-150"
			bind:this={menuButtonRef}
			onclick={toggleMenu}
			aria-label="Page options"
			aria-expanded={menuOpen}
		>
			<MoreVertical size={16} />
		</button>

		{#if menuOpen}
			<div class="absolute top-full right-0 mt-1 min-w-40 p-1 z-50
						bg-white dark:bg-zinc-900
						border border-zinc-200 dark:border-zinc-700
						rounded-lg shadow-lg shadow-black/10 dark:shadow-black/30"
				 role="menu">
				<button
					type="button"
					class="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-left text-sm
						   text-zinc-700 dark:text-zinc-200
						   hover:bg-zinc-100 dark:hover:bg-zinc-800
						   transition-colors"
					onclick={handleViewClick}
					role="menuitem"
				>
					<Eye size={16} />
					<span>View</span>
				</button>
				{#if onShare}
					<button
						type="button"
						class="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-left text-sm
							   text-zinc-700 dark:text-zinc-200
							   hover:bg-zinc-100 dark:hover:bg-zinc-800
							   transition-colors"
						onclick={handleShareClick}
						role="menuitem"
					>
						<Share2 size={16} />
						<span>Share</span>
					</button>
				{/if}
				{#if onDelete}
					<div class="my-1 h-px bg-zinc-200 dark:bg-zinc-700"></div>
					<button
						type="button"
						class="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-left text-sm
							   text-red-600 dark:text-red-400
							   hover:bg-red-500/10
							   transition-colors"
						onclick={handleDeleteClick}
						role="menuitem"
					>
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

	.page-card.newly-created {
		animation: highlight-pulse 2s ease-out;
	}
</style>
