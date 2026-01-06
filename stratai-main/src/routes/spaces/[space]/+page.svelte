<script lang="ts">
	/**
	 * Space Dashboard Page
	 *
	 * Navigation hub for a space - no chat here.
	 * Users navigate to areas to start/continue conversations.
	 *
	 * Features:
	 * - Area cards for navigation
	 * - Create new areas
	 * - Recent activity overview
	 * - Active tasks section
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { SpaceDashboard, SpaceModal } from '$lib/components/spaces';
	import { AreaModal } from '$lib/components/areas';
	import { areaStore } from '$lib/stores/areas.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Space } from '$lib/types/spaces';
	import type { Area, CreateAreaInput, UpdateAreaInput } from '$lib/types/areas';
	import type { CreateTaskInput, Task } from '$lib/types/tasks';

	// Get space from route param (slug from URL)
	let spaceParam = $derived($page.params.space);

	// Get space from store - ALWAYS use this for the proper ID
	let spaceFromStore = $derived.by(() => {
		if (!spaceParam) return null;
		return spacesStore.getSpaceBySlug(spaceParam);
	});

	// Space object for the dashboard - always from store
	let space = $derived.by((): Space | null => {
		return spaceFromStore ?? null;
	});

	// Get areas for this space using proper ID
	let areas = $derived.by(() => {
		if (!spaceFromStore) return [];
		return areaStore.getAreasForSpace(spaceFromStore.id);
	});

	// Areas with stats (conversation count, last activity)
	let areasWithStats = $derived.by(() => {
		return areas.map((area) => {
			// Get conversations for this area
			const conversations = chatStore.getConversationsByArea(area.id);
			const lastConv = conversations[0]; // Already sorted by updatedAt

			return {
				...area,
				conversationCount: conversations.length,
				lastActivity: lastConv ? new Date(lastConv.updatedAt) : null
			};
		});
	});

	// Get recent conversations for this space (using proper ID)
	let recentConversations = $derived.by(() => {
		if (!spaceFromStore) return [];
		// Filter conversations by proper space ID
		return chatStore.conversationList
			.filter((c) => c.spaceId === spaceFromStore.id)
			.slice(0, 10);
	});

	// Get active tasks for this space (parent tasks only, not subtasks, using proper ID)
	let activeTasks = $derived.by(() => {
		if (!spaceFromStore) return [];
		return taskStore
			.getTasksForSpaceId(spaceFromStore.id)
			.filter((t) => (t.status === 'active' || t.status === 'planning') && !t.parentTaskId)
			.slice(0, 10);
	});

	// UI state
	let showAreaModal = $state(false);
	let editingArea = $state<Area | null>(null);
	let showSpaceModal = $state(false);
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

		// Load data in parallel using proper space ID
		await Promise.all([
			areaStore.loadAreas(space.id),
			chatStore.refresh(),
			taskStore.loadTasks(space.id)
		]);

		isLoading = false;
	});

	// Area modal handlers
	function handleCreateArea() {
		editingArea = null;
		showAreaModal = true;
	}

	async function handleAreaCreate(input: CreateAreaInput) {
		const created = await areaStore.createArea(input);
		if (created) {
			toastStore.success(`Created "${created.name}"`);
			showAreaModal = false;
			// Navigate to the new area
			goto(`/spaces/${spaceParam}/${created.slug}`);
		}
	}

	async function handleAreaUpdate(id: string, updates: UpdateAreaInput) {
		const updated = await areaStore.updateArea(id, updates);
		if (updated) {
			toastStore.success('Area updated');
			showAreaModal = false;
		}
	}

	async function handleAreaDelete(id: string) {
		const success = await areaStore.deleteArea(id);
		if (success) {
			toastStore.success('Area deleted');
			showAreaModal = false;
		}
	}

	function handleCloseAreaModal() {
		showAreaModal = false;
		editingArea = null;
	}

	// Space settings handlers
	function handleOpenSettings() {
		showSpaceModal = true;
	}

	function handleCloseSpaceModal() {
		showSpaceModal = false;
	}

	async function handleSpaceUpdate(id: string, updates: any) {
		await spacesStore.updateSpace(id, updates);
		showSpaceModal = false;
	}

	// Task handlers
	function handleTaskClick(task: any) {
		// Navigate to task focus mode
		goto(`/spaces/${spaceParam}/task/${task.id}`);
	}

	async function handleCreateTask(input: CreateTaskInput): Promise<Task | null> {
		const created = await taskStore.createTask(input);
		if (created) {
			toastStore.success(`Task "${input.title}" created`);
		}
		return created;
	}
</script>

<svelte:head>
	<title>{space?.name || 'Space'} | StratAI</title>
</svelte:head>

{#if isLoading}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading...</p>
	</div>
{:else if space}
	<SpaceDashboard
		{space}
		areas={areasWithStats}
		{recentConversations}
		{activeTasks}
		spaceSlug={spaceParam || ''}
		onCreateArea={handleCreateArea}
		onOpenSettings={handleOpenSettings}
		onTaskClick={handleTaskClick}
		onCreateTask={handleCreateTask}
	/>

	<!-- Area Modal -->
	<AreaModal
		open={showAreaModal}
		area={editingArea}
		spaceId={spaceFromStore?.id || ''}
		onClose={handleCloseAreaModal}
		onCreate={handleAreaCreate}
		onUpdate={handleAreaUpdate}
		onDelete={handleAreaDelete}
	/>

	<!-- Space Settings Modal -->
	{#if spaceFromStore}
		<SpaceModal
			open={showSpaceModal}
			space={spaceFromStore}
			onClose={handleCloseSpaceModal}
			onCreate={async () => {}}
			onUpdate={handleSpaceUpdate}
		/>
	{/if}
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
