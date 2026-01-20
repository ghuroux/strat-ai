<script lang="ts">
	import type { CommerceProductWithBadges } from '$lib/types/commerce';
	import ProductBadge from './ProductBadge.svelte';
	import ProductRating from './ProductRating.svelte';
	import ProductPrice from './ProductPrice.svelte';

	interface Props {
		product: CommerceProductWithBadges;
		onViewDetails?: (product: CommerceProductWithBadges) => void;
		onAddToCart?: (product: CommerceProductWithBadges) => void;
	}

	let { product, onViewDetails, onAddToCart }: Props = $props();

	const siteConfig: Record<string, { name: string; color: string }> = {
		takealot: { name: 'Takealot', color: 'bg-blue-500' },
		amazon: { name: 'Amazon', color: 'bg-orange-500' }
	};

	const site = $derived(siteConfig[product.site] || { name: product.site, color: 'bg-zinc-500' });
</script>

<div
	class="flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
>
	<!-- Image Section -->
	<div class="relative aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
		{#if product.imageBase64}
			<img
				src="data:image/png;base64,{product.imageBase64}"
				alt={product.name}
				class="w-full h-full object-contain p-2"
			/>
		{:else if product.imageUrl}
			<img
				src={product.imageUrl}
				alt={product.name}
				class="w-full h-full object-contain p-2"
				onerror={(e) => {
					const target = e.target as HTMLImageElement;
					target.style.display = 'none';
				}}
			/>
		{:else}
			<div class="text-zinc-400 dark:text-zinc-500">
				<svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
			</div>
		{/if}

		<!-- Site Badge -->
		<div class="absolute top-2 left-2">
			<span class="{site.color} text-white text-xs font-medium px-2 py-0.5 rounded">
				{site.name}
			</span>
		</div>

		<!-- Stock Status -->
		{#if !product.inStock}
			<div class="absolute inset-0 bg-black/50 flex items-center justify-center">
				<span class="bg-red-500 text-white text-sm font-medium px-3 py-1 rounded">
					Out of Stock
				</span>
			</div>
		{/if}
	</div>

	<!-- Content Section -->
	<div class="flex flex-col flex-1 p-3 gap-2">
		<!-- Badges -->
		{#if product.badges && product.badges.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each product.badges as badge}
					<ProductBadge {badge} />
				{/each}
			</div>
		{/if}

		<!-- Product Name -->
		<h3 class="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2" title={product.name}>
			{product.name}
		</h3>

		<!-- Rating -->
		{#if product.rating}
			<ProductRating rating={product.rating} reviewCount={product.reviewCount} />
		{/if}

		<!-- Price -->
		<div class="mt-auto pt-2">
			<ProductPrice price={product.price} currency={product.currency} />
		</div>

		<!-- Actions -->
		<div class="flex gap-2 mt-2">
			{#if onViewDetails}
				<button
					type="button"
					onclick={() => onViewDetails?.(product)}
					class="flex-1 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
				>
					View
				</button>
			{/if}
			{#if onAddToCart && product.inStock}
				<button
					type="button"
					onclick={() => onAddToCart?.(product)}
					class="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
				>
					Add to Cart
				</button>
			{/if}
		</div>
	</div>
</div>
