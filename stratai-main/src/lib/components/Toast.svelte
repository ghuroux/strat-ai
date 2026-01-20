<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { toastStore } from '$lib/stores/toast.svelte';

	const typeStyles: Record<string, string> = {
		success: 'bg-green-600/90 border-green-500/50',
		error: 'bg-red-600/90 border-red-500/50',
		info: 'bg-primary-600/90 border-primary-500/50',
		warning: 'bg-yellow-600/90 border-yellow-500/50',
		discovery: 'bg-gradient-to-r from-purple-600/95 via-pink-600/95 to-amber-500/95 border-purple-400/50 discovery-toast'
	};
</script>

<div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
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
					{:else if toast.type === 'discovery'}
						<!-- Special sparkle icon for discoveries -->
						<div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center discovery-icon">
							<svg class="w-4 h-4 text-amber-200" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z" />
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
