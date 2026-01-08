<script lang="ts">
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';
	import MoveChatModal from '$lib/components/chat/MoveChatModal.svelte';
	import { moveChatModalStore } from '$lib/stores/moveChatModal.svelte';

	// Svelte 5: Use @render for slots with Snippets
	let { children } = $props();
</script>

<div class="min-h-screen" style="background: #0f0f11;">
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
