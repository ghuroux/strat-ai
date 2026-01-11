<script lang="ts">
	/**
	 * PageSuggestion.svelte - Inline suggestion for creating a page from chat
	 *
	 * Appears after AI messages that contain document-worthy content.
	 * Provides a subtle, non-intrusive prompt to save content as a page.
	 *
	 * Phase 6 acceptance criteria:
	 * - P6-UI-01: Appears after qualifying message
	 * - P6-UI-02: Has FileText icon
	 * - P6-UI-03: Clear text ("This looks like something worth keeping")
	 * - P6-UI-04: "Save as Page" button visible
	 * - P6-UI-05: Dismiss button (X) visible
	 * - P6-UI-06: Clicking "Save" opens modal
	 * - P6-UI-07: Clicking dismiss hides suggestion
	 * - P6-UI-08/09: Light/dark mode styling
	 * - P6-UI-10: Subtle, non-intrusive design
	 */

	import type { PageType } from '$lib/types/page';
	import { PAGE_TYPE_LABELS } from '$lib/types/page';
	import { fly } from 'svelte/transition';

	// Props
	interface Props {
		pageType: PageType;
		confidence: number;
		onAccept: () => void;
		onDismiss: () => void;
	}

	let { pageType, confidence, onAccept, onDismiss }: Props = $props();

	// Get a contextual message based on the detected page type
	let suggestionMessage = $derived.by(() => {
		switch (pageType) {
			case 'decision_record':
				return 'This looks like a decision worth documenting.';
			case 'meeting_notes':
				return 'This has action items you might want to save.';
			case 'proposal':
				return 'This looks like a proposal worth keeping.';
			case 'project_brief':
				return 'This project overview could be useful later.';
			case 'weekly_update':
				return 'This update might be worth saving.';
			case 'technical_spec':
				return 'This technical content could be useful as a reference.';
			default:
				return 'This looks like something worth keeping.';
		}
	});

	let pageTypeLabel = $derived(PAGE_TYPE_LABELS[pageType] || 'Page');
</script>

<div
	class="page-suggestion"
	in:fly={{ y: 10, duration: 200 }}
	out:fly={{ y: -10, duration: 150 }}
>
	<!-- Icon -->
	<div class="suggestion-icon">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<path d="M14 2v6h6" />
			<path d="M16 13H8" />
			<path d="M16 17H8" />
			<path d="M10 9H8" />
		</svg>
	</div>

	<!-- Message -->
	<span class="suggestion-text">{suggestionMessage}</span>

	<!-- Save button -->
	<button
		type="button"
		class="suggestion-action"
		onclick={onAccept}
	>
		Save as {pageTypeLabel}
	</button>

	<!-- Dismiss button -->
	<button
		type="button"
		class="suggestion-dismiss"
		onclick={onDismiss}
		title="Dismiss"
	>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M18 6L6 18" />
			<path d="M6 6l12 12" />
		</svg>
	</button>
</div>

<style>
	.page-suggestion {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.875rem;
		margin-top: 0.75rem;
		background: var(--suggestion-bg, rgba(59, 130, 246, 0.08));
		border: 1px solid var(--suggestion-border, rgba(59, 130, 246, 0.15));
		border-radius: 0.5rem;
		font-size: 0.8125rem;
		max-width: fit-content;
	}

	.suggestion-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 1.125rem;
		height: 1.125rem;
		color: var(--suggestion-icon, #3b82f6);
	}

	.suggestion-icon svg {
		width: 100%;
		height: 100%;
	}

	.suggestion-text {
		color: var(--suggestion-text, rgba(255, 255, 255, 0.7));
		white-space: nowrap;
	}

	.suggestion-action {
		padding: 0.25rem 0.625rem;
		background: var(--suggestion-button-bg, rgba(59, 130, 246, 0.15));
		border: none;
		border-radius: 0.375rem;
		color: var(--suggestion-button-text, #60a5fa);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.suggestion-action:hover {
		background: var(--suggestion-button-hover, rgba(59, 130, 246, 0.25));
		color: var(--suggestion-button-text-hover, #93c5fd);
	}

	.suggestion-dismiss {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 1.25rem;
		height: 1.25rem;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 0.25rem;
		color: var(--suggestion-dismiss, rgba(255, 255, 255, 0.4));
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.suggestion-dismiss:hover {
		background: var(--suggestion-dismiss-hover-bg, rgba(255, 255, 255, 0.1));
		color: var(--suggestion-dismiss-hover, rgba(255, 255, 255, 0.7));
	}

	.suggestion-dismiss svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	/* Light mode overrides */
	:global(.light) .page-suggestion,
	:global([data-theme='light']) .page-suggestion {
		--suggestion-bg: rgba(59, 130, 246, 0.06);
		--suggestion-border: rgba(59, 130, 246, 0.12);
		--suggestion-icon: #2563eb;
		--suggestion-text: rgba(0, 0, 0, 0.6);
		--suggestion-button-bg: rgba(59, 130, 246, 0.1);
		--suggestion-button-text: #2563eb;
		--suggestion-button-hover: rgba(59, 130, 246, 0.18);
		--suggestion-button-text-hover: #1d4ed8;
		--suggestion-dismiss: rgba(0, 0, 0, 0.35);
		--suggestion-dismiss-hover-bg: rgba(0, 0, 0, 0.06);
		--suggestion-dismiss-hover: rgba(0, 0, 0, 0.6);
	}

	/* Responsive: Stack on small screens */
	@media (max-width: 480px) {
		.page-suggestion {
			flex-wrap: wrap;
			gap: 0.375rem;
		}

		.suggestion-text {
			flex: 1 1 100%;
			order: 1;
			white-space: normal;
			margin-left: 1.625rem;
		}

		.suggestion-icon {
			order: 0;
		}

		.suggestion-action {
			order: 2;
			margin-left: 1.625rem;
		}

		.suggestion-dismiss {
			order: 0;
			position: absolute;
			top: 0.5rem;
			right: 0.5rem;
		}

		.page-suggestion {
			position: relative;
			padding-right: 2rem;
		}
	}
</style>
