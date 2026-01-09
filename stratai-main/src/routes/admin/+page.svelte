<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Redirect to overview page
	onMount(() => {
		goto('/admin/overview', { replaceState: true });
	});
</script>

<div class="flex items-center justify-center h-64">
	<p class="text-surface-400">Redirecting to dashboard...</p>
</div>
