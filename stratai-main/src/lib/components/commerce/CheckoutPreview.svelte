<script lang="ts">
	import type { CommerceCheckoutPreview } from '$lib/types/commerce';
	import ProductPrice from './ProductPrice.svelte';

	interface Props {
		preview: CommerceCheckoutPreview;
		onConfirm?: () => void;
		onCancel?: () => void;
	}

	let { preview, onConfirm, onCancel }: Props = $props();
</script>

<div class="checkout-preview bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
	<!-- Header -->
	<div class="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
		<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
			Checkout Preview
		</h3>
		<p class="text-sm text-zinc-600 dark:text-zinc-400">
			Review your order before confirming
		</p>
	</div>

	<!-- Items -->
	<div class="p-4 space-y-3">
		{#each preview.items as item}
			<div class="flex justify-between items-start gap-3">
				<div class="flex-1 min-w-0">
					<p class="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
						{item.name}
					</p>
					<p class="text-xs text-zinc-500">
						Qty: {item.quantity}
					</p>
				</div>
				<ProductPrice price={item.price * item.quantity} currency={preview.currency} size="sm" />
			</div>
		{/each}
	</div>

	<!-- Totals -->
	<div class="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 space-y-2">
		<div class="flex justify-between text-sm">
			<span class="text-zinc-600 dark:text-zinc-400">Subtotal</span>
			<ProductPrice price={preview.subtotal} currency={preview.currency} size="sm" />
		</div>
		<div class="flex justify-between text-sm">
			<span class="text-zinc-600 dark:text-zinc-400">Shipping</span>
			{#if preview.shipping > 0}
				<ProductPrice price={preview.shipping} currency={preview.currency} size="sm" />
			{:else}
				<span class="text-emerald-600 dark:text-emerald-400 font-medium">Free</span>
			{/if}
		</div>
		{#if preview.tax > 0}
			<div class="flex justify-between text-sm">
				<span class="text-zinc-600 dark:text-zinc-400">Tax</span>
				<ProductPrice price={preview.tax} currency={preview.currency} size="sm" />
			</div>
		{/if}
		<div class="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
			<span class="font-semibold text-zinc-900 dark:text-zinc-100">Total</span>
			<ProductPrice price={preview.total} currency={preview.currency} size="md" />
		</div>
	</div>

	<!-- Payment Method -->
	{#if preview.savedPaymentAvailable}
		<div class="px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
			<div class="flex items-center gap-2 text-sm">
				<svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
				</svg>
				<span class="text-zinc-600 dark:text-zinc-400">
					Using saved payment method
				</span>
			</div>
		</div>
	{/if}

	<!-- Actions -->
	{#if onConfirm || onCancel}
		<div class="px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 flex gap-2">
			{#if onCancel}
				<button
					type="button"
					onclick={onCancel}
					class="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
				>
					Cancel
				</button>
			{/if}
			{#if onConfirm}
				<button
					type="button"
					onclick={onConfirm}
					class="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
				>
					Confirm Purchase
				</button>
			{/if}
		</div>
	{/if}
</div>
