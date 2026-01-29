<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { AlertTriangle, Home, RefreshCw, Search, FileQuestion } from 'lucide-svelte';

	let status = $derived($page.status);
	let message = $derived($page.error?.message || 'Something went wrong');
	let is404 = $derived(status === 404);
</script>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
	<div class="max-w-md w-full text-center">
		<!-- Icon -->
		<div
			class="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6
			       {is404
				? 'bg-amber-500/15 border border-amber-500/30'
				: 'bg-red-500/15 border border-red-500/30'}"
		>
			{#if is404}
				<FileQuestion class="w-8 h-8 text-amber-600 dark:text-amber-400" />
			{:else}
				<AlertTriangle class="w-8 h-8 text-red-600 dark:text-red-400" />
			{/if}
		</div>

		<!-- Status code -->
		{#if status}
			<p class="text-sm font-medium text-zinc-500 mb-2">Error {status}</p>
		{/if}

		<!-- Title -->
		<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
			{#if is404}
				Page not found
			{:else}
				Something went wrong
			{/if}
		</h1>

		<!-- Description -->
		<p class="text-sm text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
			{#if is404}
				The page you're looking for doesn't exist or may have been moved.
			{:else}
				{message}
			{/if}
		</p>

		<!-- Actions -->
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

			{#if is404}
				<button
					onclick={() => goto('/tasks')}
					class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
					       bg-primary-500 hover:bg-primary-600
					       text-sm font-medium text-white
					       transition-all duration-150"
				>
					<Search class="w-4 h-4" />
					Browse Tasks
				</button>
			{:else}
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
			{/if}
		</div>
	</div>
</div>
