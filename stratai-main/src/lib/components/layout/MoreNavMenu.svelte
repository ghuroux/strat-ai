<script lang="ts">
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { getSpaceDisplayName } from '$lib/utils/space-display';
	import type { Space } from '$lib/types/spaces';

	interface Props {
		currentUserId: string;
		currentSpaceSlug?: string | null;
	}

	let { currentUserId, currentSpaceSlug = null }: Props = $props();

	let isOpen = $state(false);
	let buttonRef: HTMLButtonElement | undefined = $state();
	let dropdownRef: HTMLDivElement | undefined = $state();

	// Get pinned and unpinned spaces
	let pinnedSpaces = $derived(spacesStore.getPinnedSpaces());
	let unpinnedOwnedSpaces = $derived(spacesStore.getUnpinnedOwnedSpaces(currentUserId));
	let unpinnedSharedSpaces = $derived(spacesStore.getUnpinnedSharedSpaces(currentUserId));
	let hasUnpinnedSpaces = $derived(unpinnedOwnedSpaces.length > 0 || unpinnedSharedSpaces.length > 0);

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function navigateToSpace(space: Space) {
		isOpen = false;
		goto(`/spaces/${space.slug}`);
	}

	function navigateToSpaces() {
		isOpen = false;
		goto('/spaces');
	}

	// Handle click outside to close
	function handleClickOutside(e: MouseEvent) {
		if (
			isOpen &&
			buttonRef &&
			dropdownRef &&
			!buttonRef.contains(e.target as Node) &&
			!dropdownRef.contains(e.target as Node)
		) {
			isOpen = false;
		}
	}

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			isOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

<div class="relative">
	<button
		bind:this={buttonRef}
		type="button"
		onclick={toggleDropdown}
		class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
		       text-sm font-medium
		       text-surface-300 hover:text-surface-100
		       hover:bg-surface-800 transition-colors"
		aria-haspopup="true"
		aria-expanded={isOpen}
		title="Switch spaces"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
		</svg>
		<span class="hidden sm:inline">Spaces</span>
		<svg
			class="w-3 h-3 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isOpen}
		<div
			bind:this={dropdownRef}
			class="absolute z-50 top-full right-0 mt-2
			       min-w-[240px] max-w-[280px]
			       bg-surface-800 border border-surface-700 rounded-xl
			       shadow-xl overflow-hidden"
			transition:fly={{ y: -8, duration: 150 }}
		>
			{#if hasUnpinnedSpaces || pinnedSpaces.length > 0}
				<!-- Pinned Spaces Section (for quick access) -->
				{#if pinnedSpaces.length > 0}
					<div class="py-2 border-b border-surface-700/50">
						<div class="px-3 py-1.5 text-xs font-semibold text-surface-500 uppercase tracking-wider">
							Pinned
						</div>
						{#each pinnedSpaces as space (space.id)}
							<button
								onclick={() => navigateToSpace(space)}
								class="w-full px-3 py-2 text-left flex items-center gap-2.5
								       text-sm text-surface-200
								       hover:bg-surface-700 transition-colors
								       {currentSpaceSlug === space.slug ? 'bg-surface-700/50' : ''}"
								style="--space-color: {space.color || '#6b7280'}"
							>
								<div class="w-2 h-2 rounded-full flex-shrink-0"
								     style="background: var(--space-color)"></div>
								<span class="flex-1 truncate">{getSpaceDisplayName(space, currentUserId)}</span>
							</button>
						{/each}
					</div>
				{/if}

				<!-- Your Spaces Section (unpinned owned spaces) -->
				{#if unpinnedOwnedSpaces.length > 0}
					<div class="py-2 border-b border-surface-700/50">
						<div class="px-3 py-1.5 text-xs font-semibold text-surface-500 uppercase tracking-wider">
							Your Spaces
						</div>
						{#each unpinnedOwnedSpaces as space (space.id)}
							<button
								onclick={() => navigateToSpace(space)}
								class="w-full px-3 py-2 text-left flex items-center gap-2.5
								       text-sm text-surface-200
								       hover:bg-surface-700 transition-colors"
								style="--space-color: {space.color || '#6b7280'}"
							>
								<div class="w-2 h-2 rounded-full flex-shrink-0"
								     style="background: var(--space-color)"></div>
								<span class="flex-1 truncate">{getSpaceDisplayName(space, currentUserId)}</span>
							</button>
						{/each}
					</div>
				{/if}

				<!-- Shared With You Section (unpinned shared spaces) -->
				{#if unpinnedSharedSpaces.length > 0}
					<div class="py-2 border-b border-surface-700/50">
						<div class="px-3 py-1.5 text-xs font-semibold text-surface-500 uppercase tracking-wider">
							Shared With You
						</div>
						{#each unpinnedSharedSpaces as space (space.id)}
							<button
								onclick={() => navigateToSpace(space)}
								class="w-full px-3 py-2 text-left flex items-center gap-2.5
								       text-sm text-surface-200
								       hover:bg-surface-700 transition-colors"
								style="--space-color: {space.color || '#6b7280'}"
							>
								<div class="w-2 h-2 rounded-full flex-shrink-0"
								     style="background: var(--space-color)"></div>
								<span class="flex-1 truncate">{getSpaceDisplayName(space, currentUserId)}</span>
							</button>
						{/each}
					</div>
				{/if}
			{/if}

			<!-- Footer: View All Spaces -->
			<div class="py-2">
				<button
					onclick={navigateToSpaces}
					class="w-full px-3 py-2.5 text-left flex items-center gap-2.5
					       text-sm font-medium text-primary-400
					       hover:bg-surface-700 transition-colors"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
					</svg>
					View All Spaces
				</button>
			</div>
		</div>
	{/if}
</div>
