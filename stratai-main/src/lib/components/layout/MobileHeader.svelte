<script lang="ts">
	import { ChevronLeft } from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	/**
	 * MobileHeader - Standardized mobile navigation header
	 *
	 * Only visible on mobile (< 768px). Desktop views should use their own headers.
	 *
	 * Usage:
	 * <MobileHeader title="Task Name" breadcrumb="Parent Task" onBack={() => goto('/spaces')}>
	 *     <button class="mobile-header-action">...</button>
	 *     <ModelSelector />
	 * </MobileHeader>
	 */

	interface Props {
		/** Main title to display (will be truncated) */
		title: string;
		/** Optional breadcrumb text above title (e.g., parent task name) */
		breadcrumb?: string;
		/** Callback when back button is clicked */
		onBack?: () => void;
		/** Optional accent color for styling */
		accentColor?: string;
		/** Hide the back button entirely */
		hideBack?: boolean;
	}

	let { title, breadcrumb, onBack, accentColor, hideBack = false }: Props = $props();

	// Derive whether to show back button
	let showBack = $derived(!hideBack && !!onBack);
</script>

<!-- Mobile-only header (hidden on md: and up) -->
<header
	class="mobile-header md:hidden"
	style:--accent-color={accentColor || '#3b82f6'}
	transition:fade={{ duration: 100 }}
>
	<!-- Left: Back button -->
	<div class="mobile-header-left">
		{#if showBack}
			<button type="button" class="mobile-back-btn" onclick={onBack} aria-label="Go back">
				<ChevronLeft size={20} />
			</button>
		{/if}
	</div>

	<!-- Center: Title & breadcrumb -->
	<div class="mobile-header-center">
		{#if breadcrumb}
			<span class="mobile-breadcrumb">{breadcrumb}</span>
		{/if}
		<h1 class="mobile-title">{title}</h1>
	</div>

	<!-- Right: Action icons (slot) -->
	<div class="mobile-header-right">
		<slot />
	</div>
</header>

<style>
	.mobile-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem;
		background: rgb(250, 250, 250);
		border-bottom: 1px solid rgb(228, 228, 231);
		min-height: 3.5rem;
	}

	/* Hide on desktop (768px+) */
	@media (min-width: 768px) {
		.mobile-header {
			display: none;
		}
	}

	:global(.dark) .mobile-header {
		background: rgb(24, 24, 27);
		border-bottom-color: rgba(255, 255, 255, 0.06);
	}

	.mobile-header-left {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.mobile-back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		color: rgb(113, 113, 122);
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.mobile-back-btn:hover {
		color: rgb(63, 63, 70);
		background: rgb(244, 244, 245);
	}

	:global(.dark) .mobile-back-btn {
		color: rgba(255, 255, 255, 0.5);
	}

	:global(.dark) .mobile-back-btn:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
	}

	.mobile-header-center {
		flex: 1;
		min-width: 0; /* Allow text truncation */
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.mobile-breadcrumb {
		font-size: 0.6875rem;
		color: rgb(161, 161, 170);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(.dark) .mobile-breadcrumb {
		color: rgba(255, 255, 255, 0.4);
	}

	.mobile-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: rgb(24, 24, 27);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(.dark) .mobile-title {
		color: rgba(255, 255, 255, 0.95);
	}

	.mobile-header-right {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	/* Global styles for action buttons placed in the slot */
	:global(.mobile-header-action) {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 2.25rem;
		height: 2.25rem;
		padding: 0 0.5rem;
		color: rgb(113, 113, 122);
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
		font-size: 0.8125rem;
		font-weight: 500;
	}

	:global(.mobile-header-action:hover) {
		color: rgb(63, 63, 70);
		background: rgb(244, 244, 245);
	}

	:global(.dark .mobile-header-action) {
		color: rgba(255, 255, 255, 0.5);
	}

	:global(.dark .mobile-header-action:hover) {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
	}

	/* Primary action variant (e.g., "Mark Complete") */
	:global(.mobile-header-action.primary) {
		color: white;
		background: var(--accent-color, #22c55e);
	}

	:global(.mobile-header-action.primary:hover) {
		filter: brightness(1.1);
	}

	/* Icon-only action */
	:global(.mobile-header-action.icon-only) {
		padding: 0;
		width: 2.25rem;
	}
</style>
