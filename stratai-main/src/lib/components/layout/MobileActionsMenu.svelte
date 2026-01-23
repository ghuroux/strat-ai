<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { MoreVertical } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	/**
	 * MobileActionsMenu - Dropdown overflow menu for mobile headers
	 *
	 * Provides a consistent "⋮" menu pattern for secondary actions.
	 * Follows the same visual style as AllSpacesDropdown.
	 *
	 * Usage:
	 * <MobileActionsMenu>
	 *     <button class="mobile-action-item" onclick={handleExport}>
	 *         <FileDown size={16} />
	 *         Export conversation
	 *     </button>
	 *     <button class="mobile-action-item" onclick={handleCreatePage}>
	 *         <FileText size={16} />
	 *         Create page
	 *     </button>
	 *     <div class="mobile-action-divider"></div>
	 *     <button class="mobile-action-item destructive" onclick={handleDelete}>
	 *         <Trash2 size={16} />
	 *         Delete
	 *     </button>
	 * </MobileActionsMenu>
	 */

	interface Props {
		/** Optional custom trigger icon size */
		iconSize?: number;
		/** Children (action items) */
		children: Snippet;
	}

	let { iconSize = 18, children }: Props = $props();

	let isOpen = $state(false);
	let buttonRef: HTMLButtonElement | undefined = $state();
	let menuRef: HTMLDivElement | undefined = $state();

	// Handle click outside to close
	function handleClickOutside(e: MouseEvent) {
		if (
			isOpen &&
			buttonRef &&
			menuRef &&
			!buttonRef.contains(e.target as Node) &&
			!menuRef.contains(e.target as Node)
		) {
			isOpen = false;
		}
	}

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}

	function toggleMenu() {
		isOpen = !isOpen;
	}

	// Close menu when an action is clicked (via event delegation)
	function handleMenuClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (target.closest('.mobile-action-item')) {
			// Small delay to allow the action to complete
			setTimeout(() => {
				isOpen = false;
			}, 50);
		}
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="mobile-actions-container">
	<!-- Trigger Button (⋮ icon) -->
	<button
		bind:this={buttonRef}
		type="button"
		onclick={toggleMenu}
		class="mobile-actions-trigger"
		aria-haspopup="true"
		aria-expanded={isOpen}
		aria-label="More actions"
	>
		<MoreVertical size={iconSize} />
	</button>

	<!-- Dropdown Menu -->
	{#if isOpen}
		<!-- Backdrop for mobile (helps with touch) -->
		<div class="mobile-actions-backdrop" transition:fade={{ duration: 100 }}></div>

		<div
			bind:this={menuRef}
			class="mobile-actions-menu"
			transition:fly={{ y: -8, duration: 150 }}
			onclick={handleMenuClick}
			role="menu"
		>
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.mobile-actions-container {
		position: relative;
	}

	.mobile-actions-trigger {
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

	.mobile-actions-trigger:hover {
		color: rgb(63, 63, 70);
		background: rgb(244, 244, 245);
	}

	:global(.dark) .mobile-actions-trigger {
		color: rgba(255, 255, 255, 0.5);
	}

	:global(.dark) .mobile-actions-trigger:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
	}

	.mobile-actions-backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
	}

	.mobile-actions-menu {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		min-width: 180px;
		max-width: 260px;
		padding: 0.375rem;
		background: white;
		border: 1px solid rgb(228, 228, 231);
		border-radius: 0.75rem;
		box-shadow:
			0 10px 40px rgba(0, 0, 0, 0.15),
			0 0 0 1px rgba(0, 0, 0, 0.05);
		z-index: 50;
		overflow: hidden;
	}

	:global(.dark) .mobile-actions-menu {
		background: rgb(24, 24, 27);
		border-color: rgb(63, 63, 70);
		box-shadow:
			0 10px 40px rgba(0, 0, 0, 0.4),
			0 0 0 1px rgba(255, 255, 255, 0.05);
	}

	/* Global styles for action items placed in the slot */
	:global(.mobile-action-item) {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgb(63, 63, 70);
		text-align: left;
		background: transparent;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	:global(.mobile-action-item:hover) {
		background: rgb(244, 244, 245);
	}

	:global(.dark .mobile-action-item) {
		color: rgb(228, 228, 231);
	}

	:global(.dark .mobile-action-item:hover) {
		background: rgb(39, 39, 42);
	}

	:global(.mobile-action-item.destructive) {
		color: rgb(220, 38, 38);
	}

	:global(.dark .mobile-action-item.destructive) {
		color: rgb(248, 113, 113);
	}

	:global(.mobile-action-item.destructive:hover) {
		background: rgb(254, 242, 242);
	}

	:global(.dark .mobile-action-item.destructive:hover) {
		background: rgba(220, 38, 38, 0.15);
	}

	:global(.mobile-action-item:disabled) {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(.mobile-action-item:disabled:hover) {
		background: transparent;
	}

	/* Divider for grouping actions */
	:global(.mobile-action-divider) {
		height: 1px;
		margin: 0.375rem 0;
		background: rgb(228, 228, 231);
	}

	:global(.dark .mobile-action-divider) {
		background: rgb(63, 63, 70);
	}

	/* Section header for grouping */
	:global(.mobile-action-header) {
		padding: 0.5rem 0.75rem 0.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: rgb(113, 113, 122);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	:global(.dark .mobile-action-header) {
		color: rgb(113, 113, 122);
	}
</style>
