<script lang="ts">
	/**
	 * GuidedCreationBanner.svelte - Banner shown during guided page creation
	 *
	 * Displayed at top of chat when user is in guided creation mode.
	 * Shows the page type being created, topic, and controls.
	 *
	 * Phase 8 acceptance criteria:
	 * - P8-GF-01: Banner appears in guided mode ("Creating: [type]" banner visible)
	 * - P8-GF-05: Generate button appears (button visible after confirmation)
	 * - P8-GF-06: Cancel exits guided mode (returns to normal chat)
	 */

	import type { PageType } from '$lib/types/page';
	import { PAGE_TYPE_LABELS } from '$lib/types/page';
	import { fly } from 'svelte/transition';

	// Props
	interface Props {
		pageType: PageType;
		topic: string;
		readyToGenerate: boolean;
		isGenerating: boolean;
		onCancel: () => void;
		onGenerate: () => void;
	}

	let { pageType, topic, readyToGenerate, isGenerating, onCancel, onGenerate }: Props = $props();

	let pageTypeLabel = $derived(PAGE_TYPE_LABELS[pageType] || 'Page');

	// Truncate topic if too long
	let displayTopic = $derived(() => {
		if (topic.length > 40) {
			return topic.substring(0, 37) + '...';
		}
		return topic;
	});
</script>

<div
	class="guided-banner"
	in:fly={{ y: -20, duration: 200 }}
	out:fly={{ y: -20, duration: 150 }}
>
	<!-- Icon -->
	<div class="banner-icon">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<path d="M14 2v6h6" />
			<path d="M16 13H8" />
			<path d="M16 17H8" />
			<path d="M10 9H8" />
		</svg>
	</div>

	<!-- Info -->
	<div class="banner-info">
		<span class="banner-label">Creating:</span>
		<span class="banner-type">{pageTypeLabel}</span>
		{#if topic}
			<span class="banner-separator">-</span>
			<span class="banner-topic" title={topic}>{displayTopic()}</span>
		{/if}
	</div>

	<!-- Actions -->
	<div class="banner-actions">
		{#if readyToGenerate}
			<button
				type="button"
				class="generate-button"
				onclick={onGenerate}
				disabled={isGenerating}
			>
				{#if isGenerating}
					<span class="spinner"></span>
					Generating...
				{:else}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 5v14" />
						<path d="m19 12-7 7-7-7" />
					</svg>
					Generate Document
				{/if}
			</button>
		{/if}

		<button
			type="button"
			class="cancel-button"
			onclick={onCancel}
			disabled={isGenerating}
			title="Cancel guided creation"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M18 6L6 18" />
				<path d="M6 6l12 12" />
			</svg>
			Cancel
		</button>
	</div>
</div>

<style>
	.guided-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: var(--guided-banner-bg, rgba(147, 51, 234, 0.1));
		border: 1px solid var(--guided-banner-border, rgba(147, 51, 234, 0.2));
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	.banner-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 1.25rem;
		height: 1.25rem;
		color: var(--guided-banner-icon, #a855f7);
	}

	.banner-icon svg {
		width: 100%;
		height: 100%;
	}

	.banner-info {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex: 1;
		min-width: 0;
		font-size: 0.875rem;
	}

	.banner-label {
		color: var(--guided-banner-text-muted, rgba(255, 255, 255, 0.6));
	}

	.banner-type {
		color: var(--guided-banner-text, rgba(255, 255, 255, 0.9));
		font-weight: 600;
	}

	.banner-separator {
		color: var(--guided-banner-text-muted, rgba(255, 255, 255, 0.4));
	}

	.banner-topic {
		color: var(--guided-banner-text, rgba(255, 255, 255, 0.8));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 200px;
	}

	.banner-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.generate-button {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background: var(--guided-generate-bg, #a855f7);
		border: none;
		border-radius: 0.375rem;
		color: white;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.generate-button:hover:not(:disabled) {
		background: var(--guided-generate-hover, #9333ea);
	}

	.generate-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.generate-button svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.cancel-button {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.625rem;
		background: transparent;
		border: 1px solid var(--guided-cancel-border, rgba(255, 255, 255, 0.2));
		border-radius: 0.375rem;
		color: var(--guided-cancel-text, rgba(255, 255, 255, 0.7));
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.cancel-button:hover:not(:disabled) {
		background: var(--guided-cancel-hover-bg, rgba(255, 255, 255, 0.1));
		color: var(--guided-cancel-hover-text, rgba(255, 255, 255, 0.9));
	}

	.cancel-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.cancel-button svg {
		width: 0.75rem;
		height: 0.75rem;
	}

	/* Spinner animation */
	.spinner {
		display: inline-block;
		width: 0.875rem;
		height: 0.875rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 50%;
		border-top-color: white;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Light mode overrides */
	:global(.light) .guided-banner,
	:global([data-theme='light']) .guided-banner {
		--guided-banner-bg: rgba(147, 51, 234, 0.08);
		--guided-banner-border: rgba(147, 51, 234, 0.15);
		--guided-banner-icon: #9333ea;
		--guided-banner-text: rgba(0, 0, 0, 0.85);
		--guided-banner-text-muted: rgba(0, 0, 0, 0.5);
		--guided-generate-bg: #9333ea;
		--guided-generate-hover: #7c3aed;
		--guided-cancel-border: rgba(0, 0, 0, 0.2);
		--guided-cancel-text: rgba(0, 0, 0, 0.6);
		--guided-cancel-hover-bg: rgba(0, 0, 0, 0.05);
		--guided-cancel-hover-text: rgba(0, 0, 0, 0.8);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.guided-banner {
			flex-wrap: wrap;
		}

		.banner-info {
			flex: 1 1 100%;
			order: 1;
		}

		.banner-icon {
			order: 0;
		}

		.banner-actions {
			order: 2;
			width: 100%;
			justify-content: flex-end;
			margin-top: 0.5rem;
		}

		.banner-topic {
			max-width: 150px;
		}
	}
</style>
