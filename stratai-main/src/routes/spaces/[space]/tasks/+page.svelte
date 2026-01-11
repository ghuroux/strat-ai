<script lang="ts">
	/**
	 * Task Dashboard Page
	 *
	 * Dedicated view for all tasks in a space with time-based grouping.
	 * Route: /spaces/[space]/tasks
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { areaStore } from '$lib/stores/areas.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import TaskDashboard from '$lib/components/tasks/TaskDashboard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Get space from route param (slug from URL)
	let spaceParam = $derived($page.params.space);

	// Get space from store - ALWAYS use this for the proper ID
	let spaceFromStore = $derived.by(() => {
		if (!spaceParam) return null;
		return spacesStore.getSpaceBySlug(spaceParam);
	});

	// Get space config - always use proper ID from store
	let spaceConfig = $derived.by(() => {
		if (!spaceFromStore) return null;
		return {
			id: spaceFromStore.id,  // Always use proper ID from database
			slug: spaceFromStore.slug,
			name: spaceFromStore.name,
			color: spaceFromStore.color || '#3b82f6'
		};
	});

	// Get areas for this space using proper ID
	let areas = $derived.by(() => {
		if (!spaceFromStore) return [];
		return areaStore.getAreasForSpace(spaceFromStore.id);
	});

	// UI state
	let isLoading = $state(true);

	// Load data on mount
	onMount(async () => {
		if (!spaceParam) {
			goto('/spaces');
			return;
		}

		// Ensure spaces are loaded first to get proper IDs
		await spacesStore.loadSpaces();
		const space = spacesStore.getSpaceBySlug(spaceParam);
		if (!space) {
			toastStore.error('Space not found');
			goto('/spaces');
			return;
		}

		// Load areas and tasks using proper space ID
		await Promise.all([
			areaStore.loadAreas(space.id),
			taskStore.loadTasks(space.id)
		]);

		isLoading = false;
	});
</script>

<svelte:head>
	<title>Tasks - {spaceConfig?.name || 'Space'} | StratAI</title>
</svelte:head>

{#if isLoading}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading tasks...</p>
	</div>
{:else if spaceConfig}
	<TaskDashboard
		spaceId={spaceConfig.id}
		spaceSlug={spaceConfig.slug}
		spaceColor={spaceConfig.color}
		spaceName={spaceConfig.name}
		{areas}
		user={data.user}
	/>
{:else}
	<div class="error-container">
		<h1>Space not found</h1>
		<p>The space you're looking for doesn't exist.</p>
		<a href="/spaces" class="back-link">Back to spaces</a>
	</div>
{/if}

<style>
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 1rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.loading-spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-top-color: var(--space-accent, #3b82f6);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 1rem;
		text-align: center;
		padding: 2rem;
	}

	.error-container h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin: 0;
	}

	.error-container p {
		font-size: 0.9375rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	.back-link {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--space-accent, #3b82f6);
		background: rgba(59, 130, 246, 0.1);
		border-radius: 0.375rem;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.back-link:hover {
		background: rgba(59, 130, 246, 0.2);
	}
</style>
