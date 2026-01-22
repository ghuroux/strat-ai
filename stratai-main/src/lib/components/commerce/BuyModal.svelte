<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { X, Check, Loader2, AlertCircle, CreditCard, ExternalLink, Eye, Bot } from 'lucide-svelte';
	import {
		buyState,
		closeBuyModal,
		startAgenticPurchase,
		confirmPayment,
		setPurchaseSuccess,
		setPurchaseError,
		retryPurchase,
		getOrderConfirmation
	} from '$lib/stores/buy.svelte';
	import type { PurchaseStatus } from '$lib/types/commerce';
	import ProductPrice from './ProductPrice.svelte';

	// Derived states from buy store
	let isOpen = $derived(buyState.isOpen);
	let product = $derived(buyState.product);
	let status = $derived(buyState.status);
	let currentStep = $derived(buyState.currentStep);
	let stepDescription = $derived(buyState.stepDescription);
	let orderId = $derived(buyState.orderId);
	let orderUrl = $derived(buyState.orderUrl);
	let estimatedDelivery = $derived(buyState.estimatedDelivery);
	let total = $derived(buyState.total);
	let error = $derived(buyState.error);
	let errorCode = $derived(buyState.errorCode);
	let newPrice = $derived(buyState.newPrice);
	let screenshotBase64 = $derived(buyState.screenshotBase64);
	let checkoutTotal = $derived(buyState.checkoutTotal);
	let iteration = $derived(buyState.iteration);

	// Step labels for progress display
	const stepLabels: Record<PurchaseStatus, string> = {
		authenticating: 'Signing in...',
		adding_to_cart: 'Adding to cart...',
		checkout: 'Processing checkout...',
		awaiting_payment: 'Ready for confirmation',
		complete: 'Order complete!',
		failed: 'Purchase failed'
	};

	// Site config for display
	const siteConfig: Record<string, { name: string; color: string }> = {
		takealot: { name: 'Takealot', color: 'bg-blue-500' },
		amazon: { name: 'Amazon', color: 'bg-orange-500' }
	};

	// Screenshot preview toggle
	let showScreenshot = $state(false);

	function handleConfirmPurchase() {
		if (!product) return;
		startAgenticPurchase();
	}

	async function handleConfirmPayment() {
		await confirmPayment();
	}

	function handleClose() {
		closeBuyModal();
	}

	function handleRetry() {
		retryPurchase();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && status !== 'processing' && status !== 'confirming') {
			handleClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && status !== 'processing' && status !== 'confirming') {
			handleClose();
		}
	}

	function toggleScreenshot() {
		showScreenshot = !showScreenshot;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && product}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="buy-modal-title"
	>
		<!-- Modal -->
		<div
			class="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden"
			in:fly={{ y: 20, duration: 300, easing: cubicOut }}
			out:fly={{ y: -10, duration: 200 }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
				<div class="flex items-center gap-2">
					<Bot size={20} class="text-blue-500" />
					<h2 id="buy-modal-title" class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
						{#if status === 'success'}
							Order Confirmed
						{:else if status === 'error'}
							Purchase Failed
						{:else if status === 'processing' || status === 'confirming'}
							AI Shopping Assistant
						{:else if status === 'awaiting_payment'}
							Confirm Purchase
						{:else}
							Buy with AI
						{/if}
					</h2>
				</div>
				{#if status !== 'processing' && status !== 'confirming'}
					<button
						type="button"
						onclick={handleClose}
						class="p-1 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
						aria-label="Close"
					>
						<X size={20} />
					</button>
				{/if}
			</div>

			<!-- Content -->
			<div class="p-4">
				{#if status === 'confirm'}
					<!-- Confirmation state - Show product details -->
					<div class="space-y-4">
						<!-- Product Preview -->
						<div class="flex gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
							{#if product.imageBase64 || product.imageUrl}
								<div class="w-20 h-20 flex-shrink-0 bg-white dark:bg-zinc-800 rounded overflow-hidden">
									<img
										src={product.imageBase64 ? `data:image/png;base64,${product.imageBase64}` : product.imageUrl}
										alt={product.name}
										class="w-full h-full object-contain"
									/>
								</div>
							{/if}
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
									{product.name}
								</p>
								<div class="mt-1">
									<span class="{siteConfig[product.site]?.color || 'bg-zinc-500'} text-white text-xs font-medium px-2 py-0.5 rounded">
										{siteConfig[product.site]?.name || product.site}
									</span>
								</div>
								<div class="mt-2">
									<ProductPrice price={product.price} currency={product.currency} />
								</div>
							</div>
						</div>

						<!-- AI Shopping Assistant Info -->
						<div class="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
							<Bot size={18} class="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
							<div class="text-sm text-blue-700 dark:text-blue-300">
								<p class="font-medium">AI-Powered Checkout</p>
								<p class="text-blue-600 dark:text-blue-400 mt-0.5">
									Claude will navigate checkout for you. You'll see real-time screenshots and must confirm before payment.
								</p>
							</div>
						</div>

						<!-- Warning -->
						<div class="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
							<AlertCircle size={18} class="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
							<div class="text-sm text-amber-700 dark:text-amber-300">
								<p class="font-medium">Real Purchase</p>
								<p class="text-amber-600 dark:text-amber-400 mt-0.5">
									This will place a real order using your saved payment method on {siteConfig[product.site]?.name || product.site}.
								</p>
							</div>
						</div>
					</div>

				{:else if status === 'processing' || status === 'confirming'}
					<!-- Processing state - Show AI progress with screenshot -->
					<div class="space-y-4">
						<!-- Status Header -->
						<div class="text-center">
							<div class="w-12 h-12 mx-auto mb-3 relative">
								<div class="absolute inset-0 rounded-full border-4 border-zinc-200 dark:border-zinc-700"></div>
								<div class="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin"></div>
							</div>
							<p class="text-lg font-medium text-zinc-900 dark:text-zinc-100">
								{stepDescription || (currentStep ? stepLabels[currentStep] : 'Processing...')}
							</p>
							{#if iteration > 0}
								<p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
									Step {iteration}
								</p>
							{/if}
						</div>

						<!-- Screenshot Preview -->
						{#if screenshotBase64}
							<div class="space-y-2">
								<button
									type="button"
									onclick={toggleScreenshot}
									class="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
								>
									<span class="flex items-center gap-2">
										<Eye size={16} />
										{showScreenshot ? 'Hide' : 'Show'} browser view
									</span>
									<span class="text-xs text-zinc-400">Live preview</span>
								</button>

								{#if showScreenshot}
									<div class="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700" in:fly={{ y: -10, duration: 200 }}>
										<img
											src={`data:image/jpeg;base64,${screenshotBase64}`}
											alt="Browser view"
											class="w-full h-auto"
										/>
									</div>
								{/if}
							</div>
						{/if}

						<!-- Progress steps -->
						<div class="space-y-2 max-w-xs mx-auto">
							{#each ['authenticating', 'adding_to_cart', 'checkout'] as step, stepIndex}
								{@const steps = ['authenticating', 'adding_to_cart', 'checkout']}
								{@const currentIndex = currentStep ? steps.indexOf(currentStep) : -1}
								{@const isComplete = currentIndex > stepIndex}
								{@const isCurrent = currentStep === step}
								<div class="flex items-center gap-2">
									{#if isComplete}
										<Check size={16} class="text-green-500" />
									{:else if isCurrent}
										<Loader2 size={16} class="text-blue-500 animate-spin" />
									{:else}
										<div class="w-4 h-4 rounded-full border-2 border-zinc-300 dark:border-zinc-600"></div>
									{/if}
									<span class="text-sm {isCurrent ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-500 dark:text-zinc-400'}">
										{stepLabels[step as PurchaseStatus]}
									</span>
								</div>
							{/each}
						</div>

						<p class="text-center text-xs text-zinc-500 dark:text-zinc-400">
							Please don't close this window. AI is navigating the checkout process.
						</p>
					</div>

				{:else if status === 'awaiting_payment'}
					<!-- Awaiting Payment Confirmation - Show checkout preview -->
					<div class="space-y-4">
						<!-- Success indicator -->
						<div class="text-center">
							<div class="w-12 h-12 mx-auto mb-3 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
								<Check size={24} class="text-green-600 dark:text-green-400" />
							</div>
							<p class="text-lg font-medium text-zinc-900 dark:text-zinc-100">
								Ready to Complete Purchase
							</p>
							<p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
								AI has prepared your order. Please review and confirm.
							</p>
						</div>

						<!-- Order Total -->
						{#if checkoutTotal}
							<div class="text-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
								<p class="text-sm text-zinc-600 dark:text-zinc-400">Order Total</p>
								<p class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
									R{checkoutTotal.toFixed(2)}
								</p>
							</div>
						{/if}

						<!-- Screenshot Preview -->
						{#if screenshotBase64}
							<div class="space-y-2">
								<button
									type="button"
									onclick={toggleScreenshot}
									class="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
								>
									<span class="flex items-center gap-2">
										<Eye size={16} />
										{showScreenshot ? 'Hide' : 'View'} checkout page
									</span>
								</button>

								{#if showScreenshot}
									<div class="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700" in:fly={{ y: -10, duration: 200 }}>
										<img
											src={`data:image/jpeg;base64,${screenshotBase64}`}
											alt="Checkout page"
											class="w-full h-auto"
										/>
									</div>
								{/if}
							</div>
						{/if}

						<!-- Final Warning -->
						<div class="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
							<AlertCircle size={18} class="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
							<div class="text-sm text-amber-700 dark:text-amber-300">
								<p class="font-medium">Final Step</p>
								<p class="text-amber-600 dark:text-amber-400 mt-0.5">
									Clicking "Complete Purchase" will submit your order and charge your payment method.
								</p>
							</div>
						</div>
					</div>

				{:else if status === 'success'}
					<!-- Success state -->
					<div class="text-center py-6">
						<div class="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
							<Check size={32} class="text-green-600 dark:text-green-400" />
						</div>
						<p class="text-lg font-medium text-zinc-900 dark:text-zinc-100">
							Purchase Complete!
						</p>

						{#if orderId}
							<p class="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
								Order ID: <span class="font-mono font-medium text-zinc-900 dark:text-zinc-100">{orderId}</span>
							</p>
						{/if}

						{#if estimatedDelivery}
							<p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
								Estimated delivery: <span class="font-medium text-zinc-900 dark:text-zinc-100">{estimatedDelivery}</span>
							</p>
						{/if}

						{#if total}
							<div class="mt-3">
								<ProductPrice price={total} currency={product.currency} />
							</div>
						{/if}

						{#if orderUrl}
							<a
								href={orderUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
							>
								View order on {siteConfig[product.site]?.name || product.site}
								<ExternalLink size={14} />
							</a>
						{/if}
					</div>

				{:else if status === 'error'}
					<!-- Error state -->
					<div class="text-center py-6">
						<div class="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
							<AlertCircle size={32} class="text-red-600 dark:text-red-400" />
						</div>
						<p class="text-lg font-medium text-zinc-900 dark:text-zinc-100">
							Purchase Failed
						</p>
						<p class="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
							{error}
						</p>

						{#if errorCode === 'PRICE_CHANGED' && newPrice}
							<div class="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
								<p class="text-sm text-amber-700 dark:text-amber-300">
									New price: <ProductPrice price={newPrice} currency={product.currency} />
								</p>
							</div>
						{/if}

						<!-- Screenshot for debugging -->
						{#if screenshotBase64}
							<div class="mt-4">
								<button
									type="button"
									onclick={toggleScreenshot}
									class="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
								>
									{showScreenshot ? 'Hide' : 'Show'} last screenshot
								</button>
								{#if showScreenshot}
									<div class="mt-2 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
										<img
											src={`data:image/jpeg;base64,${screenshotBase64}`}
											alt="Error state"
											class="w-full h-auto"
										/>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
				{#if status === 'confirm'}
					<div class="flex gap-2">
						<button
							type="button"
							onclick={handleClose}
							class="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onclick={handleConfirmPurchase}
							class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
						>
							<Bot size={16} />
							Start AI Checkout
						</button>
					</div>

				{:else if status === 'awaiting_payment'}
					<div class="flex gap-2">
						<button
							type="button"
							onclick={handleClose}
							class="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onclick={handleConfirmPayment}
							class="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-2"
						>
							<CreditCard size={16} />
							Complete Purchase
						</button>
					</div>

				{:else if status === 'success'}
					<button
						type="button"
						onclick={handleClose}
						class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
					>
						Done
					</button>

				{:else if status === 'error'}
					<div class="flex gap-2">
						<button
							type="button"
							onclick={handleClose}
							class="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onclick={handleRetry}
							class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
						>
							Try Again
						</button>
					</div>

				{:else if status === 'processing' || status === 'confirming'}
					<p class="text-center text-sm text-zinc-500 dark:text-zinc-400">
						{status === 'confirming' ? 'Completing your purchase...' : 'AI is navigating checkout...'}
					</p>
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
