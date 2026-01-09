<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { toastStore } from '$lib/stores/toast.svelte';

	const typeStyles: Record<string, string> = {
		success: 'bg-green-600/90 border-green-500/50',
		error: 'bg-red-600/90 border-red-500/50',
		info: 'bg-primary-600/90 border-primary-500/50',
		warning: 'bg-yellow-600/90 border-yellow-500/50'
	};
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
	{#each toastStore.toasts as toast (toast.id)}
		<div
			in:fly={{ y: 50, duration: 300, easing: (t) => t * (2 - t) }}
			out:fade={{ duration: 200 }}
			class="px-4 py-3 rounded-xl border shadow-xl backdrop-blur-xl {typeStyles[toast.type]} max-w-sm"
		>
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-3">
					{#if toast.type === 'success'}
						<div class="w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center">
							<svg class="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						</div>
					{:else if toast.type === 'error'}
						<div class="w-6 h-6 rounded-full bg-red-500/30 flex items-center justify-center">
							<svg class="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</div>
					{:else if toast.type === 'warning'}
						<div class="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center">
							<svg class="w-4 h-4 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
					{:else}
						<div class="w-6 h-6 rounded-full bg-primary-500/30 flex items-center justify-center">
							<svg class="w-4 h-4 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
					{/if}
					<p class="text-white text-sm font-medium">{toast.message}</p>
				</div>
				<button
					onclick={() => toastStore.remove(toast.id)}
					class="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
					aria-label="Dismiss notification"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	{/each}
</div>
