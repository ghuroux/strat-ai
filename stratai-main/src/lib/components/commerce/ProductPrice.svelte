<script lang="ts">
	interface Props {
		price: number;
		currency?: string;
		size?: 'sm' | 'md' | 'lg';
	}

	let { price, currency = 'ZAR', size = 'md' }: Props = $props();

	const currencySymbols: Record<string, string> = {
		ZAR: 'R',
		USD: '$',
		EUR: '€',
		GBP: '£'
	};

	const symbol = $derived(currencySymbols[currency] || currency);

	const sizeClasses: Record<string, string> = {
		sm: 'text-sm font-medium',
		md: 'text-lg font-semibold',
		lg: 'text-2xl font-bold'
	};
</script>

<span class="text-zinc-900 dark:text-zinc-100 {sizeClasses[size]}">
	{symbol}{price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
</span>
