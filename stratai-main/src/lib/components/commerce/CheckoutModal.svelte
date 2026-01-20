<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { checkoutState, closeCheckout, startProcessing, setConfirmation, setError } from '$lib/stores/checkout.svelte';
	import type { CommerceOrderConfirmation } from '$lib/types/commerce';
	import CheckoutPreview from './CheckoutPreview.svelte';
	import OrderConfirmation from './OrderConfirmation.svelte';

	// Derived states from checkout store
	let isOpen = $derived(checkoutState.isOpen);
	let preview = $derived(checkoutState.preview);
	let site = $derived(checkoutState.site);
	let isProcessing = $derived(checkoutState.isProcessing);
	let confirmation = $derived(checkoutState.confirmation);
	let error = $derived(checkoutState.error);

	async function handleConfirm() {
		if (!site || !checkoutState.sessionId) return;

		startProcessing();

		try {
			// Call MCP Commerce server directly from client (demo mode)
			const response = await fetch('http://localhost:9223/tools/checkout/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					site,
					sessionId: checkoutState.sessionId,
					confirmPurchase: true
				})
			});

			const result = await response.json();
			if (result.success && result.data) {
				setConfirmation(result.data as CommerceOrderConfirmation);
			} else {
				setError(result.error || 'Purchase failed');
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Purchase failed');
		}
	}

	function handleCancel() {
		closeCheckout();
	}

	function handleClose() {
		closeCheckout();
	}

	// Close on escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isProcessing) {
			handleClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 150 }}
		onclick={!isProcessing ? handleClose : undefined}
		role="dialog"
		aria-modal="true"
		aria-labelledby="checkout-title"
	>
		<!-- Modal -->
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="fixed inset-0 z-50 flex items-center justify-center p-4"
			onclick={(e) => e.stopPropagation()}
		>
			<div
				class="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden"
				in:fly={{ y: 20, duration: 300, easing: cubicOut }}
				out:fly={{ y: -10, duration: 200 }}
			>
				<!-- Header -->
				<div class="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
					<h2 id="checkout-title" class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
						{#if confirmation}
							Order {confirmation.success ? 'Confirmed' : 'Failed'}
						{:else}
							Checkout
						{/if}
					</h2>
					{#if !isProcessing}
						<button
							type="button"
							onclick={handleClose}
							class="p-1 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
							aria-label="Close"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</div>

				<!-- Content -->
				<div class="p-4">
					{#if confirmation}
						<OrderConfirmation order={confirmation} />
					{:else if preview}
						{#if isProcessing}
							<!-- Processing state -->
							<div class="text-center py-8">
								<div class="w-16 h-16 mx-auto mb-4 relative">
									<div class="absolute inset-0 rounded-full border-4 border-zinc-200 dark:border-zinc-700"></div>
									<div class="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin"></div>
								</div>
								<p class="text-lg font-medium text-zinc-900 dark:text-zinc-100">
									Processing Payment
								</p>
								<p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
									Please wait while we complete your purchase...
								</p>
							</div>
						{:else}
							<!-- Checkout preview -->
							<CheckoutPreview
								{preview}
								onConfirm={handleConfirm}
								onCancel={handleCancel}
							/>
						{/if}
					{/if}

					{#if error}
						<div class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
							<p class="text-sm text-red-700 dark:text-red-400">
								{error}
							</p>
						</div>
					{/if}
				</div>

				<!-- Footer for confirmation state -->
				{#if confirmation}
					<div class="px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
						<button
							type="button"
							onclick={handleClose}
							class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
						>
							Done
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
