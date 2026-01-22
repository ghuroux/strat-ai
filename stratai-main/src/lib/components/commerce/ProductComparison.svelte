<script lang="ts">
	import type { CommerceProductWithBadges, PriceTier, ProductBadge } from '$lib/types/commerce';
	import ProductCard from './ProductCard.svelte';

	interface Props {
		query: string;
		products: CommerceProductWithBadges[];
		onViewDetails?: (product: CommerceProductWithBadges) => void;
		onAddToCart?: (product: CommerceProductWithBadges) => void;
	}

	let { query, products, onViewDetails, onAddToCart }: Props = $props();

	/**
	 * Assign price tiers to products based on their position in the price range.
	 * Bottom third = budget, middle third = sweet_spot, top third = premium
	 */
	function assignPriceTiers(prods: CommerceProductWithBadges[]): CommerceProductWithBadges[] {
		if (prods.length === 0) return prods;

		// Sort by price to determine tiers
		const sorted = [...prods].sort((a, b) => a.price - b.price);
		const third = Math.ceil(sorted.length / 3);

		// Create a map of product id+site to tier
		const tierMap = new Map<string, PriceTier>();
		sorted.forEach((p, i) => {
			const key = `${p.id}-${p.site}`;
			if (i < third) {
				tierMap.set(key, 'budget');
			} else if (i < third * 2) {
				tierMap.set(key, 'sweet_spot');
			} else {
				tierMap.set(key, 'premium');
			}
		});

		// Apply tiers to products (maintaining original order)
		return prods.map(p => {
			const key = `${p.id}-${p.site}`;
			const tier = tierMap.get(key);

			// Add price tier badge if not already present
			const badges = [...p.badges];
			if (tier && !badges.includes(tier as ProductBadge)) {
				badges.push(tier as ProductBadge);
			}

			return {
				...p,
				priceTier: tier,
				badges
			};
		});
	}

	// Dedupe products by id + site to prevent duplicate key errors
	const uniqueProducts = $derived(() => {
		const seen = new Set<string>();
		return products.filter(p => {
			const key = `${p.id}-${p.site}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	});

	// Products with price tiers assigned
	const productsWithTiers = $derived(() => assignPriceTiers(uniqueProducts()));

	// Count products by site
	const siteCounts = $derived(() => {
		const counts: Record<string, number> = {};
		for (const p of uniqueProducts()) {
			counts[p.site] = (counts[p.site] || 0) + 1;
		}
		return counts;
	});
</script>

<div class="commerce-comparison">
	<!-- Header -->
	<div class="flex items-center justify-between mb-3">
		<div>
			<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
				Search Results
			</h3>
			<p class="text-sm text-zinc-600 dark:text-zinc-400">
				Found {uniqueProducts().length} products for "{query}"
				{#if Object.keys(siteCounts()).length > 1}
					<span class="text-zinc-500">
						({Object.entries(siteCounts()).map(([site, count]) => `${count} from ${site}`).join(', ')})
					</span>
				{/if}
			</p>
		</div>
	</div>

	<!-- Product Grid -->
	{#if productsWithTiers().length > 0}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
			{#each productsWithTiers() as product (product.id + '-' + product.site)}
				<ProductCard
					{product}
					{onViewDetails}
					{onAddToCart}
				/>
			{/each}
		</div>
	{:else}
		<div class="text-center py-8">
			<div class="text-zinc-400 dark:text-zinc-500 mb-2">
				<svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>
			<p class="text-zinc-600 dark:text-zinc-400">
				No products found for "{query}"
			</p>
			<p class="text-sm text-zinc-500 mt-1">
				Try a different search term or adjust your filters
			</p>
		</div>
	{/if}
</div>

