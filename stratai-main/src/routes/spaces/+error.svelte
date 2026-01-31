<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { AlertTriangle, RefreshCw, FileQuestion, LayoutDashboard } from 'lucide-svelte';

	let status = $derived($page.status);
	let message = $derived($page.error?.message || 'Something went wrong');
	let is404 = $derived(status === 404);
</script>

<div class="flex items-center justify-center p-8 min-h-[60vh]">
	<div class="max-w-md w-full text-center">
		<div
			class="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-5
			       {is404
				? 'bg-amber-500/15 border border-amber-500/30'
				: 'bg-red-500/15 border border-red-500/30'}"
		>
			{#if is404}
				<FileQuestion class="w-7 h-7 text-amber-600 dark:text-amber-400" />
			{:else}
				<AlertTriangle class="w-7 h-7 text-red-600 dark:text-red-400" />
			{/if}
		</div>

		{#if status}
			<p class="text-sm font-medium text-zinc-500 mb-2">Error {status}</p>
		{/if}

		<h2 class="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
			{#if is404}
				Space or area not found
			{:else}
				Something went wrong
			{/if}
		</h2>

		<p class="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
			{#if is404}
				This space or area doesn't exist, or you may not have access.
			{:else}
				{message}
			{/if}
		</p>

		<div class="flex items-center justify-center gap-3">
			<button
				onclick={() => goto('/spaces')}
				class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
				       bg-zinc-100 dark:bg-zinc-800
				       hover:bg-zinc-200 dark:hover:bg-zinc-700
				       border border-zinc-300 dark:border-zinc-700
				       text-sm font-medium text-zinc-800 dark:text-zinc-200
				       transition-all duration-150"
			>
				<LayoutDashboard class="w-4 h-4" />
				All Spaces
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
