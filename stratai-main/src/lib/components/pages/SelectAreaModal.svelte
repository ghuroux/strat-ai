<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import type { Area } from '$lib/types/areas';

	interface Props {
		isOpen: boolean;
		areas: Area[];
		onSelect: (areaSlug: string) => void;
		onClose: () => void;
	}

	let { isOpen, areas, onSelect, onClose }: Props = $props();

	// Local state
	let selectedAreaSlug = $state<string>('');

	// Derived state
	let canContinue = $derived(selectedAreaSlug !== '');

	// Event handlers
	function handleContinue() {
		if (canContinue) {
			onSelect(selectedAreaSlug);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4
		       bg-black/50 dark:bg-black/60 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="select-area-modal-title"
	>
		<!-- Modal -->
		<div
			class="w-full max-w-md
			       bg-white dark:bg-zinc-900
			       border border-zinc-200 dark:border-zinc-700/50
			       rounded-xl shadow-2xl"
			transition:fly={{ y: 20, duration: 200 }}
			onclick={(e) => e.stopPropagation()}
			role="document"
		>
			<!-- Header -->
			<div class="p-5 border-b border-zinc-200 dark:border-zinc-700/50">
				<h3 id="select-area-modal-title" class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
					Create New Page
				</h3>
			</div>

			<!-- Content -->
			<div class="p-5 space-y-4">
				<p class="text-sm text-zinc-600 dark:text-zinc-400">
					Pages belong to an area. Which area should this page be created in?
				</p>

				<!-- Area selector -->
				<div>
					<label for="area-select" class="block text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2">
						Select Area
					</label>
					<select
						id="area-select"
						bind:value={selectedAreaSlug}
						class="w-full px-3 py-2 rounded-lg
						       bg-zinc-100 dark:bg-zinc-800
						       border border-zinc-300 dark:border-zinc-700
						       text-sm text-zinc-900 dark:text-zinc-100
						       focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/50
						       disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<option value="" disabled>Choose an area...</option>
						{#each areas as area (area.id)}
							<option value={area.slug}>
								{area.name}
							</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-end gap-3 p-4
			            border-t border-zinc-100 dark:border-zinc-700/30
			            bg-zinc-50/50 dark:bg-zinc-900/50">
				<button
					type="button"
					onclick={onClose}
					class="px-4 py-2 rounded-lg
					       bg-zinc-100 dark:bg-zinc-800
					       hover:bg-zinc-200 dark:hover:bg-zinc-700
					       border border-zinc-300 dark:border-zinc-600
					       text-sm font-medium text-zinc-800 dark:text-zinc-200
					       transition-all duration-150"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={handleContinue}
					disabled={!canContinue}
					class="px-4 py-2.5 rounded-lg
					       bg-primary-500 hover:bg-primary-600
					       text-sm font-medium text-white
					       transition-all duration-150
					       disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Continue
				</button>
			</div>
		</div>
	</div>
{/if}
