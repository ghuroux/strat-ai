<script lang="ts">
	/**
	 * NewContentIndicator - Premium pill for streaming scroll UX
	 *
	 * Shows when user scrolls away during AI streaming to indicate
	 * new content is available below. Clicking jumps to new content.
	 *
	 * Part of the "Anchor & Follow" scroll pattern.
	 */
	import { fly } from 'svelte/transition';
	import { ChevronDown } from 'lucide-svelte';

	interface Props {
		/** Whether the indicator should be visible */
		visible: boolean;
		/** Called when user clicks to scroll to new content */
		onclick: () => void;
	}

	let { visible, onclick }: Props = $props();
</script>

{#if visible}
	<div class="new-content-indicator-container">
		<button
			class="new-content-pill"
			onclick={onclick}
			transition:fly={{ y: 20, duration: 200 }}
		>
			<ChevronDown size={16} />
			<span>New content</span>
		</button>
	</div>
{/if}

<style>
	.new-content-indicator-container {
		position: absolute;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 20;
		pointer-events: none;
	}

	.new-content-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border-radius: 9999px;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		pointer-events: auto;
		transition: all 150ms ease;

		/* Dark mode (default) */
		background: rgba(var(--color-primary-500-rgb, 59, 130, 246), 0.15);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(var(--color-primary-500-rgb, 59, 130, 246), 0.3);
		color: rgb(var(--color-primary-400-rgb, 96, 165, 250));
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -2px rgba(0, 0, 0, 0.1);
	}

	/* Light mode */
	:global(.light) .new-content-pill {
		background: rgba(var(--color-primary-500-rgb, 59, 130, 246), 0.1);
		border-color: rgba(var(--color-primary-500-rgb, 59, 130, 246), 0.25);
		color: rgb(var(--color-primary-600-rgb, 37, 99, 235));
	}

	.new-content-pill:hover {
		transform: translateY(-2px);
		background: rgba(var(--color-primary-500-rgb, 59, 130, 246), 0.25);
		border-color: rgba(var(--color-primary-500-rgb, 59, 130, 246), 0.5);
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -4px rgba(0, 0, 0, 0.1);
	}

	:global(.light) .new-content-pill:hover {
		background: rgba(var(--color-primary-500-rgb, 59, 130, 246), 0.2);
		border-color: rgba(var(--color-primary-500-rgb, 59, 130, 246), 0.4);
	}

	.new-content-pill:active {
		transform: translateY(0);
	}
</style>
