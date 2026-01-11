<script lang="ts">
	/**
	 * TemplateSelector.svelte - Grid of page templates for selection
	 *
	 * Displays all page types in a grid with icons, labels, and descriptions.
	 * Based on DOCUMENT_SYSTEM.md Phase 4 specification.
	 */

	import type { PageType } from '$lib/types/page';
	import { getAllPageTypes, type PageTypeInfo } from '$lib/config/page-templates';

	// Props
	interface Props {
		selected?: PageType | null;
		onSelect: (type: PageType) => void;
	}

	let { selected = null, onSelect }: Props = $props();

	// Get all page types
	const pageTypes = getAllPageTypes();

	// Get SVG icon based on type
	function getIcon(iconName: string): string {
		switch (iconName) {
			case 'FileText':
				return 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8';
			case 'Users':
				return 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75';
			case 'Scale':
				return 'M3 6l9 3 9-3 M12 9v12 M3 18l9-3 9 3 M3 6v12 M21 6v12';
			case 'Lightbulb':
				return 'M12 2a7 7 0 0 1 4 12.7V18a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-3.3A7 7 0 0 1 12 2z M9 21h6';
			case 'Briefcase':
				return 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z M12 12v5';
			case 'Calendar':
				return 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M16 2v4 M8 2v4 M3 10h18';
			case 'Code':
				return 'M16 18l6-6-6-6 M8 6l-6 6 6 6';
			default:
				return 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6';
		}
	}

	function handleSelect(type: PageType) {
		onSelect(type);
	}
</script>

<div class="template-selector">
	<div class="template-grid">
		{#each pageTypes as pageType (pageType.type)}
			<button
				type="button"
				class="template-card"
				class:selected={selected === pageType.type}
				onclick={() => handleSelect(pageType.type)}
			>
				<div class="card-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d={getIcon(pageType.icon)} />
					</svg>
				</div>
				<div class="card-content">
					<h3 class="card-label">{pageType.label}</h3>
					<p class="card-description">{pageType.description}</p>
				</div>
				{#if selected === pageType.type}
					<div class="selected-indicator">
						<svg viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
						</svg>
					</div>
				{/if}
			</button>
		{/each}
	</div>
</div>

<style>
	.template-selector {
		width: 100%;
	}

	.template-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.75rem;
	}

	.template-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--card-bg);
		border: 2px solid var(--card-border);
		border-radius: 12px;
		cursor: pointer;
		transition: border-color 150ms ease, background-color 150ms ease, transform 100ms ease;
		text-align: left;
	}

	.template-card:hover {
		border-color: var(--editor-border-focus);
		background: color-mix(in srgb, var(--card-bg) 90%, var(--editor-border-focus));
	}

	.template-card:active {
		transform: scale(0.98);
	}

	.template-card.selected {
		border-color: var(--editor-border-focus);
		background: color-mix(in srgb, var(--card-bg) 85%, var(--editor-border-focus));
	}

	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--toolbar-button-hover);
		border-radius: 10px;
		color: var(--editor-text-secondary);
	}

	.template-card:hover .card-icon,
	.template-card.selected .card-icon {
		background: color-mix(in srgb, var(--editor-border-focus) 20%, transparent);
		color: var(--editor-border-focus);
	}

	.card-icon svg {
		width: 22px;
		height: 22px;
	}

	.card-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.card-label {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--editor-text);
		margin: 0;
	}

	.card-description {
		font-size: 0.8125rem;
		color: var(--editor-text-secondary);
		margin: 0;
		line-height: 1.4;
	}

	.selected-indicator {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		color: var(--editor-border-focus);
	}

	.selected-indicator svg {
		width: 20px;
		height: 20px;
	}
</style>
