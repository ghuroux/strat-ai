<script lang="ts">
	interface Props {
		rating: number;
		reviewCount?: number;
	}

	let { rating, reviewCount }: Props = $props();

	// Calculate full stars, half star, and empty stars
	const fullStars = $derived(Math.floor(rating));
	const hasHalfStar = $derived(rating % 1 >= 0.5);
	const emptyStars = $derived(5 - fullStars - (hasHalfStar ? 1 : 0));
</script>

<div class="flex items-center gap-1">
	<div class="flex items-center" aria-label="Rating: {rating} out of 5 stars">
		{#each Array(fullStars) as _}
			<svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
				<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
			</svg>
		{/each}
		{#if hasHalfStar}
			<svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
				<defs>
					<linearGradient id="half-star">
						<stop offset="50%" stop-color="currentColor" />
						<stop offset="50%" stop-color="transparent" />
					</linearGradient>
				</defs>
				<path fill="url(#half-star)" stroke="currentColor" stroke-width="0.5" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
			</svg>
		{/if}
		{#each Array(emptyStars) as _}
			<svg class="w-4 h-4 text-zinc-300 dark:text-zinc-600" fill="currentColor" viewBox="0 0 20 20">
				<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
			</svg>
		{/each}
	</div>
	<span class="text-sm text-zinc-600 dark:text-zinc-400">
		{rating.toFixed(1)}
	</span>
	{#if reviewCount}
		<span class="text-sm text-zinc-500">
			({reviewCount.toLocaleString()})
		</span>
	{/if}
</div>
