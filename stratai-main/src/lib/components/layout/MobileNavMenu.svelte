<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { getSpaceDisplayName } from '$lib/utils/space-display';
	import type { Space } from '$lib/types/spaces';

	interface Props {
		open: boolean;
		currentUserId: string;
		currentSpaceSlug?: string | null;
		onClose: () => void;
	}

	let { open, currentUserId, currentSpaceSlug = null, onClose }: Props = $props();

	let pinnedSpaces = $derived(spacesStore.getPinnedSpaces());
	let unpinnedOwnedSpaces = $derived(spacesStore.getUnpinnedOwnedSpaces(currentUserId));
	let unpinnedSharedSpaces = $derived(spacesStore.getUnpinnedSharedSpaces(currentUserId));

	function navigateToSpace(space: Space) {
		onClose();
		goto(`/spaces/${space.slug}`);
	}

	function navigateToRoute(path: string) {
		onClose();
		goto(path);
	}
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
		transition:fade={{ duration: 200 }}
		onclick={onClose}
		role="presentation"
	/>

	<!-- Drawer -->
	<nav
		class="fixed top-0 left-0 bottom-0 z-50 w-[280px]
		       bg-zinc-900 border-r border-zinc-700
		       flex flex-col sm:hidden"
		transition:fly={{ x: -280, duration: 250 }}
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Header -->
		<div class="flex items-center justify-between p-4
		            border-b border-zinc-700">
			<h2 class="text-lg font-semibold text-zinc-100">Navigation</h2>
			<button
				type="button"
				onclick={onClose}
				class="w-8 h-8 rounded-lg flex items-center justify-center
				       text-zinc-400 hover:text-zinc-100
				       hover:bg-zinc-800 transition-colors"
				aria-label="Close menu"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto py-2">
			<!-- Quick Actions: Main Chat, Arena -->
			<div class="px-2 mb-4">
				<button
					onclick={() => navigateToRoute('/')}
					class="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3
					       text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
					</svg>
					<span class="font-medium">Main Chat</span>
				</button>
				<button
					onclick={() => navigateToRoute('/arena')}
					class="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3
					       text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
					<span class="font-medium">Arena</span>
				</button>
			</div>

			<!-- Pinned Spaces -->
			{#if pinnedSpaces.length > 0}
				<div class="px-2 mb-4">
					<div class="px-3 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
						Pinned Spaces
					</div>
					{#each pinnedSpaces as space (space.id)}
						<button
							onclick={() => navigateToSpace(space)}
							class="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3
							       text-zinc-300 hover:bg-zinc-800 transition-colors
							       {currentSpaceSlug === space.slug ? 'bg-zinc-800/70' : ''}"
							style="--space-color: {space.color || '#6b7280'}"
						>
							<div class="w-2 h-2 rounded-full" style="background: var(--space-color)"></div>
							<span class="flex-1 truncate font-medium">{getSpaceDisplayName(space, currentUserId)}</span>
						</button>
					{/each}
				</div>
			{/if}

			<!-- Your Spaces -->
			{#if unpinnedOwnedSpaces.length > 0}
				<div class="px-2 mb-4">
					<div class="px-3 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
						Your Spaces
					</div>
					{#each unpinnedOwnedSpaces as space (space.id)}
						<button
							onclick={() => navigateToSpace(space)}
							class="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3
							       text-zinc-300 hover:bg-zinc-800 transition-colors"
							style="--space-color: {space.color || '#6b7280'}"
						>
							<div class="w-2 h-2 rounded-full" style="background: var(--space-color)"></div>
							<span class="flex-1 truncate">{getSpaceDisplayName(space, currentUserId)}</span>
						</button>
					{/each}
				</div>
			{/if}

			<!-- Shared With You -->
			{#if unpinnedSharedSpaces.length > 0}
				<div class="px-2 mb-4">
					<div class="px-3 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
						Shared With You
					</div>
					{#each unpinnedSharedSpaces as space (space.id)}
						<button
							onclick={() => navigateToSpace(space)}
							class="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3
							       text-zinc-300 hover:bg-zinc-800 transition-colors"
							style="--space-color: {space.color || '#6b7280'}"
						>
							<div class="w-2 h-2 rounded-full" style="background: var(--space-color)"></div>
							<span class="flex-1 truncate">{getSpaceDisplayName(space, currentUserId)}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="border-t border-zinc-700 p-4">
			<a
				href="/spaces"
				onclick={onClose}
				class="w-full px-3 py-2.5 rounded-lg
				       flex items-center justify-center gap-2
				       bg-primary-500 hover:bg-primary-600
				       text-sm font-medium text-white transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
				</svg>
				Manage Spaces
			</a>
		</div>
	</nav>
{/if}
