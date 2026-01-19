<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { AlertTriangle, Home, RefreshCw } from 'lucide-svelte';
</script>

<div class="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
	<div class="max-w-md w-full text-center">
		<div
			class="mx-auto w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30
                flex items-center justify-center mb-6"
		>
			<AlertTriangle class="w-8 h-8 text-red-500" />
		</div>

		{#if $page.status}
			<p class="text-sm font-medium text-zinc-500 mb-2">Error {$page.status}</p>
		{/if}

		<h1 class="text-2xl font-bold text-zinc-100 mb-3">Something went wrong</h1>

		<p class="text-sm text-zinc-400 mb-8 leading-relaxed">
			{$page.error?.message || "We couldn't complete that action. Please try again or return home."}
		</p>

		<div class="flex items-center justify-center gap-3">
			<button
				onclick={() => goto('/')}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
               bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
               text-sm font-medium text-zinc-200
               transition-all duration-150"
			>
				<Home class="w-4 h-4" />
				Go Home
			</button>

			<button
				onclick={() => location.reload()}
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
