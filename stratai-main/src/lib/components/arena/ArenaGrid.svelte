<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		modelCount: number;
		hasFocused?: boolean;
		children: Snippet;
	}

	let { modelCount, hasFocused = false, children }: Props = $props();
</script>

<div class="arena-grid" data-count={modelCount} data-focused={hasFocused}>
	{@render children()}
</div>

<style>
	.arena-grid {
		display: grid;
		gap: 1rem;
		width: 100%;
		transition: all 0.3s ease;
	}

	/* 2 models - 2 columns */
	.arena-grid[data-count="2"] {
		grid-template-columns: repeat(2, 1fr);
	}

	/* 3 models - 2x2 grid (last cell empty or spans) */
	.arena-grid[data-count="3"] {
		grid-template-columns: repeat(2, 1fr);
	}

	/* 4 models - 2x2 grid (always, for readability) */
	.arena-grid[data-count="4"] {
		grid-template-columns: repeat(2, 1fr);
	}

	/* When in focus mode, switch to single column for proper layout */
	.arena-grid[data-focused="true"] {
		grid-template-columns: 1fr;
	}

	/* Tablet - keep 2 columns */
	@media (max-width: 1024px) {
		.arena-grid[data-count="2"],
		.arena-grid[data-count="3"],
		.arena-grid[data-count="4"] {
			grid-template-columns: repeat(2, 1fr);
		}

		.arena-grid[data-focused="true"] {
			grid-template-columns: 1fr;
		}
	}

	/* Mobile - stack to single column */
	@media (max-width: 768px) {
		.arena-grid[data-count="2"],
		.arena-grid[data-count="3"],
		.arena-grid[data-count="4"] {
			grid-template-columns: 1fr;
		}
	}
</style>
