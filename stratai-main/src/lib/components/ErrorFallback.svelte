<script lang="ts">
	/**
	 * ErrorFallback — Reusable error boundary fallback UI
	 *
	 * Used inside <svelte:boundary> to show a recovery UI when a component
	 * subtree throws during rendering.
	 *
	 * Variants:
	 * - page: Full-area display (for route-level boundaries)
	 * - panel: Sidebar/panel display
	 * - inline: Compact display (for smaller sections)
	 */
	import { goto } from '$app/navigation';
	import { AlertTriangle, RefreshCw, Home } from 'lucide-svelte';

	interface Props {
		error: unknown;
		reset: () => void;
		variant?: 'page' | 'panel' | 'inline';
	}

	let { error, reset, variant = 'page' }: Props = $props();

	let errorMessage = $derived(
		error instanceof Error ? error.message : 'An unexpected error occurred'
	);
</script>

{#if variant === 'page'}
	<!-- Full page error display -->
	<div class="flex items-center justify-center min-h-[50vh] p-8">
		<div class="max-w-md w-full text-center">
			<div
				class="mx-auto w-14 h-14 rounded-2xl mb-5
				       bg-red-500/15 border border-red-500/30
				       flex items-center justify-center"
			>
				<AlertTriangle class="w-7 h-7 text-red-600 dark:text-red-400" />
			</div>

			<h2 class="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
				Something went wrong
			</h2>

			<p class="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
				{errorMessage}
			</p>

			<div class="flex items-center justify-center gap-3">
				<button
					onclick={() => goto('/')}
					class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
					       bg-zinc-100 dark:bg-zinc-800
					       hover:bg-zinc-200 dark:hover:bg-zinc-700
					       border border-zinc-300 dark:border-zinc-700
					       text-sm font-medium text-zinc-800 dark:text-zinc-200
					       transition-all duration-150"
				>
					<Home class="w-4 h-4" />
					Go Home
				</button>

				<button
					onclick={reset}
					class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
					       bg-primary-500 hover:bg-primary-600
					       text-sm font-medium text-white
					       transition-all duration-150"
				>
					<RefreshCw class="w-4 h-4" />
					Try Again
				</button>
			</div>
		</div>
	</div>
{:else if variant === 'panel'}
	<!-- Panel/sidebar error display -->
	<div class="flex flex-col items-center justify-center p-6 text-center">
		<div
			class="w-10 h-10 rounded-lg mb-3
			       bg-red-500/15 border border-red-500/30
			       flex items-center justify-center"
		>
			<AlertTriangle class="w-5 h-5 text-red-600 dark:text-red-400" />
		</div>

		<p class="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
			Failed to load
		</p>

		<p class="text-xs text-zinc-500 mb-3">
			{errorMessage}
		</p>

		<button
			onclick={reset}
			class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
			       text-xs font-medium
			       text-primary-600 dark:text-primary-400
			       hover:bg-primary-500/10
			       transition-colors"
		>
			<RefreshCw class="w-3.5 h-3.5" />
			Retry
		</button>
	</div>
{:else}
	<!-- Inline compact error display -->
	<div class="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
		<AlertTriangle class="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
		<span class="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{errorMessage}</span>
		<button
			onclick={reset}
			class="text-xs font-medium text-primary-600 dark:text-primary-400
			       hover:text-primary-700 dark:hover:text-primary-300
			       flex-shrink-0"
		>
			Retry
		</button>
	</div>
{/if}
