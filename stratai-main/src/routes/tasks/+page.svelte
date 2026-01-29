<!--
	Global Tasks Dashboard

	Cross-space task aggregation at /tasks.
	Supports query params: ?space=slug&status=active
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import GlobalTaskDashboard from '$lib/components/tasks/GlobalTaskDashboard.svelte';

	// Get user data from layout data
	let userData = $derived(
		$page.data.user as {
			displayName: string | null;
			role: 'owner' | 'admin' | 'member';
		} | null
	);

	// Spaces list
	let spaces = $derived(spacesStore.getAllSpaces());

	onMount(() => {
		spacesStore.loadSpaces();
	});
</script>

<svelte:head>
	<title>Tasks | StratAI</title>
</svelte:head>

<GlobalTaskDashboard {spaces} user={userData} />
