<script lang="ts">
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';

	// Svelte 5: Use @render for slots with Snippets
	let { children } = $props();
</script>

<div class="min-h-screen" style="background: #0f0f11;">
	{@render children()}
</div>

<Toast />
