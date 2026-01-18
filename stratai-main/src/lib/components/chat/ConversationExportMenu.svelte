<script lang="ts">
	/**
	 * ConversationExportMenu.svelte - Export dropdown for task conversations
	 *
	 * Provides options to download conversation as Markdown, JSON, or Plain Text.
	 *
	 * US-002 Acceptance Criteria:
	 * - Export button appears in task conversation header (header-right section)
	 * - Uses dropdown menu pattern similar to ExportMenu.svelte
	 * - Button icon: download icon (lucide-svelte Download)
	 * - Dropdown shows three format options: Markdown, JSON, Plain Text
	 * - Clicking format option triggers API call to /api/conversations/export/[id]?format=X
	 * - Browser downloads file automatically via window.location.href
	 * - Button disabled with tooltip when conversation has no messages
	 * - Error toast shown if export fails (uses toastStore)
	 * - Dropdown closes after selection
	 * - Uses Svelte 5 runes ($state, $effect) - NOT Svelte 4 stores
	 */

	import { fly } from 'svelte/transition';
	import { Download, FileText, FileCode, FileDown } from 'lucide-svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	// Props
	interface Props {
		conversationId: string | null;
		hasMessages: boolean;
	}

	let { conversationId, hasMessages }: Props = $props();

	// State
	let isOpen = $state(false);
	let menuRef: HTMLDivElement | null = $state(null);

	// Derived: whether export is available
	let canExport = $derived(!!conversationId && hasMessages);

	// Close menu when clicking outside
	$effect(() => {
		if (!isOpen) return;

		function handleClickOutside(event: MouseEvent) {
			if (menuRef && !menuRef.contains(event.target as Node)) {
				isOpen = false;
			}
		}

		function handleEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				isOpen = false;
			}
		}

		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleEscape);
		};
	});

	/**
	 * Export the conversation in the specified format
	 * File downloads automatically via window.location.href
	 * Dropdown closes after selection
	 */
	function exportAs(format: 'markdown' | 'json' | 'plaintext') {
		if (!conversationId) {
			toastStore.error('No conversation to export');
			isOpen = false;
			return;
		}

		try {
			// Trigger download by navigating to export URL
			window.location.href = `/api/conversations/export/${conversationId}?format=${format}`;
			isOpen = false;
		} catch {
			toastStore.error('Failed to export conversation');
			isOpen = false;
		}
	}

	function toggleMenu() {
		if (canExport) {
			isOpen = !isOpen;
		}
	}
</script>

<div class="export-menu" bind:this={menuRef}>
	<button
		type="button"
		class="export-button"
		class:disabled={!canExport}
		onclick={toggleMenu}
		aria-haspopup="true"
		aria-expanded={isOpen}
		disabled={!canExport}
		title={canExport ? 'Export conversation' : 'No messages to export'}
	>
		<Download size={16} />
		<span class="button-text">Export</span>
		<!-- Chevron icon -->
		<svg
			class="chevron"
			class:open={isOpen}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<polyline points="6 9 12 15 18 9" />
		</svg>
	</button>

	{#if isOpen}
		<div class="dropdown" role="menu" transition:fly={{ y: -5, duration: 150 }}>
			<button
				type="button"
				class="dropdown-item"
				onclick={() => exportAs('markdown')}
				role="menuitem"
			>
				<FileText size={16} />
				<span>Markdown (.md)</span>
			</button>

			<button type="button" class="dropdown-item" onclick={() => exportAs('json')} role="menuitem">
				<FileCode size={16} />
				<span>JSON (.json)</span>
			</button>

			<button
				type="button"
				class="dropdown-item"
				onclick={() => exportAs('plaintext')}
				role="menuitem"
			>
				<FileDown size={16} />
				<span>Plain Text (.txt)</span>
			</button>
		</div>
	{/if}
</div>

<style>
	.export-menu {
		position: relative;
	}

	.export-button {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		background: transparent;
		border: 1px solid var(--export-border, rgba(255, 255, 255, 0.15));
		border-radius: 0.375rem;
		color: var(--export-text, rgba(255, 255, 255, 0.8));
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.export-button:hover:not(:disabled) {
		background: var(--export-hover-bg, rgba(255, 255, 255, 0.08));
		border-color: var(--export-hover-border, rgba(255, 255, 255, 0.2));
	}

	.export-button:disabled,
	.export-button.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.button-text {
		display: none;
	}

	@media (min-width: 640px) {
		.button-text {
			display: inline;
		}
	}

	.export-button .chevron {
		width: 0.875rem;
		height: 0.875rem;
		transition: transform 0.15s ease;
	}

	.export-button .chevron.open {
		transform: rotate(180deg);
	}

	.dropdown {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		min-width: 160px;
		background: var(--dropdown-bg, #1a1a1f);
		border: 1px solid var(--dropdown-border, rgba(255, 255, 255, 0.1));
		border-radius: 0.5rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
		padding: 0.25rem;
		z-index: 50;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		color: var(--dropdown-item-text, rgba(255, 255, 255, 0.8));
		font-size: 0.8125rem;
		text-align: left;
		cursor: pointer;
		transition: all 0.1s ease;
	}

	.dropdown-item:hover {
		background: var(--dropdown-item-hover, rgba(255, 255, 255, 0.08));
		color: var(--dropdown-item-hover-text, rgba(255, 255, 255, 1));
	}

	.dropdown-item :global(svg) {
		flex-shrink: 0;
		color: var(--dropdown-item-icon, rgba(255, 255, 255, 0.5));
	}

	.dropdown-item:hover :global(svg) {
		color: var(--dropdown-item-hover-icon, rgba(255, 255, 255, 0.8));
	}

	/* Light mode overrides */
	:global(.light) .export-menu,
	:global([data-theme='light']) .export-menu {
		--export-border: rgba(0, 0, 0, 0.15);
		--export-text: rgba(0, 0, 0, 0.7);
		--export-hover-bg: rgba(0, 0, 0, 0.05);
		--export-hover-border: rgba(0, 0, 0, 0.2);
		--dropdown-bg: #ffffff;
		--dropdown-border: rgba(0, 0, 0, 0.1);
		--dropdown-item-text: rgba(0, 0, 0, 0.7);
		--dropdown-item-hover: rgba(0, 0, 0, 0.05);
		--dropdown-item-hover-text: rgba(0, 0, 0, 0.9);
		--dropdown-item-icon: rgba(0, 0, 0, 0.4);
		--dropdown-item-hover-icon: rgba(0, 0, 0, 0.7);
	}
</style>
