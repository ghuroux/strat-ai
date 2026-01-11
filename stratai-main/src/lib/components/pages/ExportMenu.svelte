<script lang="ts">
	/**
	 * ExportMenu.svelte - Export dropdown for pages
	 *
	 * Provides options to download page as Markdown or Word document.
	 *
	 * Phase 9 acceptance criteria:
	 * - P9-EM-01: Download button visible (button in document header)
	 * - P9-EM-02: Dropdown shows options (Markdown and Word options)
	 * - P9-EM-03: Clicking option downloads (file downloads immediately)
	 * - P9-EM-04: Menu closes after selection (dropdown closes)
	 */

	import { fly } from 'svelte/transition';

	// Props
	interface Props {
		pageId: string;
	}

	let { pageId }: Props = $props();

	// State
	let isOpen = $state(false);
	let menuRef: HTMLDivElement | null = $state(null);

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
	 * Export the page in the specified format
	 * P9-EM-03: File downloads immediately
	 * P9-EM-04: Menu closes after selection
	 */
	function exportAs(format: 'markdown' | 'docx') {
		// Trigger download by navigating to export URL
		window.location.href = `/api/pages/export/${pageId}?format=${format}`;
		isOpen = false;
	}

	function toggleMenu() {
		isOpen = !isOpen;
	}
</script>

<!-- P9-EM-01: Download button visible -->
<div class="export-menu" bind:this={menuRef}>
	<button
		type="button"
		class="export-button"
		onclick={toggleMenu}
		aria-haspopup="true"
		aria-expanded={isOpen}
		title="Download page"
	>
		<!-- Download icon -->
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" y1="15" x2="12" y2="3" />
		</svg>
		<span>Download</span>
		<!-- Chevron icon -->
		<svg class="chevron" class:open={isOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="6 9 12 15 18 9" />
		</svg>
	</button>

	<!-- P9-EM-02: Dropdown shows options -->
	{#if isOpen}
		<div
			class="dropdown"
			role="menu"
			transition:fly={{ y: -5, duration: 150 }}
		>
			<button
				type="button"
				class="dropdown-item"
				onclick={() => exportAs('markdown')}
				role="menuitem"
			>
				<!-- Markdown icon -->
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
					<line x1="16" y1="13" x2="8" y2="13" />
					<line x1="16" y1="17" x2="8" y2="17" />
					<polyline points="10 9 9 9 8 9" />
				</svg>
				<span>Markdown (.md)</span>
			</button>

			<button
				type="button"
				class="dropdown-item"
				onclick={() => exportAs('docx')}
				role="menuitem"
			>
				<!-- Word icon -->
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
					<path d="M9 13h6" />
					<path d="M9 17h3" />
				</svg>
				<span>Word (.docx)</span>
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

	.export-button:hover {
		background: var(--export-hover-bg, rgba(255, 255, 255, 0.08));
		border-color: var(--export-hover-border, rgba(255, 255, 255, 0.2));
	}

	.export-button svg {
		width: 1rem;
		height: 1rem;
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

	.dropdown-item svg {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: var(--dropdown-item-icon, rgba(255, 255, 255, 0.5));
	}

	.dropdown-item:hover svg {
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
