<script lang="ts">
	import type { ProductBadge } from '$lib/types/commerce';

	interface Props {
		badge: ProductBadge;
	}

	let { badge }: Props = $props();

	const badgeConfig: Record<ProductBadge, { label: string; bgClass: string; textClass: string; icon?: string }> = {
		best_value: {
			label: 'Best Value',
			bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
			textClass: 'text-emerald-700 dark:text-emerald-400',
			icon: '⚖️'
		},
		cheapest: {
			label: 'Lowest Price',
			bgClass: 'bg-blue-100 dark:bg-blue-900/30',
			textClass: 'text-blue-700 dark:text-blue-400'
		},
		highest_rated: {
			label: 'Top Rated',
			bgClass: 'bg-amber-100 dark:bg-amber-900/30',
			textClass: 'text-amber-700 dark:text-amber-400'
		},
		most_reviews: {
			label: 'Most Reviews',
			bgClass: 'bg-purple-100 dark:bg-purple-900/30',
			textClass: 'text-purple-700 dark:text-purple-400'
		},
		// Price tier badges
		budget: {
			label: 'Budget Pick',
			bgClass: 'bg-zinc-100 dark:bg-zinc-800',
			textClass: 'text-zinc-700 dark:text-zinc-300',
			icon: '🏷️'
		},
		sweet_spot: {
			label: 'Best Value',
			bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
			textClass: 'text-emerald-700 dark:text-emerald-400',
			icon: '⚖️'
		},
		premium: {
			label: 'Premium',
			bgClass: 'bg-amber-100 dark:bg-amber-900/30',
			textClass: 'text-amber-700 dark:text-amber-400',
			icon: '✨'
		}
	};

	const config = $derived(badgeConfig[badge]);
</script>

<span
	class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium {config.bgClass} {config.textClass}"
>
	{#if config.icon}<span>{config.icon}</span>{/if}
	{config.label}
</span>
