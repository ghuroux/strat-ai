<script lang="ts">
	import { AdminLayout } from '$lib/components/admin';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<svelte:head>
	<title>Admin | StratAI</title>
</svelte:head>

<AdminLayout organizationName={data.organization?.name || 'Organization'}>
	{@render children()}
</AdminLayout>
