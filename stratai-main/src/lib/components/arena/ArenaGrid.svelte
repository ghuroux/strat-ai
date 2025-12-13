<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		modelCount: number;
		children: Snippet;
	}

	let { modelCount, children }: Props = $props();
</script>

<div class="arena-grid" data-count={modelCount}>
	{@render children()}
</div>

<style>
	.arena-grid {
		display: grid;
		gap: 1rem;
		width: 100%;
	}

	/* 2 models - 2 columns */
	.arena-grid[data-count="2"] {
		grid-template-columns: repeat(2, 1fr);
	}

	/* 3 models - 3 columns */
	.arena-grid[data-count="3"] {
		grid-template-columns: repeat(3, 1fr);
	}

	/* 4 models - 2x2 grid */
	.arena-grid[data-count="4"] {
		grid-template-columns: repeat(2, 1fr);
	}

	/* Large screens - 4 models in a row */
	@media (min-width: 1280px) {
		.arena-grid[data-count="4"] {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	/* Tablet - 3 models becomes 2+1 */
	@media (max-width: 1024px) {
		.arena-grid[data-count="3"] {
			grid-template-columns: repeat(2, 1fr);
		}
		.arena-grid[data-count="3"] > :global(:last-child) {
			grid-column: span 2;
		}
	}

	/* Mobile - all stack */
	@media (max-width: 768px) {
		.arena-grid[data-count="2"],
		.arena-grid[data-count="3"],
		.arena-grid[data-count="4"] {
			grid-template-columns: 1fr;
		}
		.arena-grid[data-count="3"] > :global(:last-child) {
			grid-column: span 1;
		}
	}
</style>
