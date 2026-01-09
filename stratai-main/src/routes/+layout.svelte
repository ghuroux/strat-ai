<script lang="ts">
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';
	import MoveChatModal from '$lib/components/chat/MoveChatModal.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import { moveChatModalStore } from '$lib/stores/moveChatModal.svelte';
	import { commandPaletteStore } from '$lib/stores/commandPalette.svelte';

	// Svelte 5: Use @render for slots with Snippets
	let { children } = $props();

	/**
	 * Global keyboard shortcut handler for Command Palette
	 * ⌘K (Mac) or Ctrl+K (Windows/Linux)
	 */
	function handleGlobalKeydown(e: KeyboardEvent) {
		// Check for ⌘K or Ctrl+K
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			commandPaletteStore.toggle();
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="min-h-screen bg-surface-950">
	{@render children()}
</div>

<Toast />

<!-- Global Move Chat Modal -->
{#if moveChatModalStore.isOpen && moveChatModalStore.conversation}
	<MoveChatModal
		conversation={moveChatModalStore.conversation}
		onMove={(spaceId, areaId) => moveChatModalStore.move(spaceId, areaId)}
		onClose={() => moveChatModalStore.close()}
	/>
{/if}

<!-- Global Command Palette -->
<CommandPalette />
