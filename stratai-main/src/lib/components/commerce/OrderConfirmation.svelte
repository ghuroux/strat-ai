<script lang="ts">
	import type { CommerceOrderConfirmation } from '$lib/types/commerce';
	import ProductPrice from './ProductPrice.svelte';

	interface Props {
		order: CommerceOrderConfirmation;
	}

	let { order }: Props = $props();
</script>

<div class="order-confirmation bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
	{#if order.success}
		<!-- Success State -->
		<div class="text-center mb-4">
			<div class="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
				<svg class="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
				Order Confirmed!
			</h3>
			{#if order.orderId}
				<p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
					Order ID: <span class="font-mono">{order.orderId}</span>
				</p>
			{/if}
		</div>

		<!-- Order Details -->
		<div class="space-y-3 border-t border-zinc-200 dark:border-zinc-700 pt-4">
			{#if order.estimatedDelivery}
				<div class="flex justify-between items-center">
					<span class="text-sm text-zinc-600 dark:text-zinc-400">Estimated Delivery</span>
					<span class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
						{new Date(order.estimatedDelivery).toLocaleDateString('en-ZA', {
							weekday: 'long',
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
					</span>
				</div>
			{/if}

			{#if order.total > 0}
				<div class="flex justify-between items-center">
					<span class="text-sm text-zinc-600 dark:text-zinc-400">Total</span>
					<ProductPrice price={order.total} currency={order.currency} />
				</div>
			{/if}
		</div>

		<!-- Note -->
		<p class="text-xs text-zinc-500 mt-4 text-center">
			A confirmation email has been sent to your registered email address.
		</p>
	{:else}
		<!-- Error State -->
		<div class="text-center">
			<div class="w-16 h-16 mx-auto mb-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
				<svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</div>
			<h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
				Order Failed
			</h3>
			<p class="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
				{order.error || 'Something went wrong. Please try again.'}
			</p>
		</div>
	{/if}
</div>
