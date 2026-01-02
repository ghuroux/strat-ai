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
	import { SPACES, isValidSpace } from '$lib/config/spaces';
	import type { Space } from '$lib/types/spaces';
	import type { Area, CreateAreaInput, UpdateAreaInput } from '$lib/types/areas';
	import type { SpaceType } from '$lib/types/chat';

	// Get space from route param
	let spaceParam = $derived($page.params.space);

	// Get space from store (handles both system and custom spaces)
	let spaceFromStore = $derived.by(() => {
		if (!spaceParam) return null;
		return spacesStore.getSpaceBySlug(spaceParam);
	});

	// Determine if this is a valid system space
	let isSystemSpace = $derived(spaceParam ? isValidSpace(spaceParam) : false);

	// Get space config (for system spaces) or construct from store (for custom)
	let spaceConfig = $derived.by(() => {
		if (isSystemSpace && spaceParam) {
			const config = SPACES[spaceParam as keyof typeof SPACES];
			return {
				id: spaceParam,
				slug: spaceParam,
				name: config.name,
				icon: config.icon,
				color: config.accentColor,
				context: '',
				type: 'system' as const
			} satisfies Partial<Space>;
		}
		if (spaceFromStore) {
			return spaceFromStore;
		}
		return null;
	});

	// Construct a Space object for the dashboard
	let space = $derived.by((): Space | null => {
		if (!spaceConfig) return null;
		return {
			id: spaceConfig.id || spaceParam || '',
			slug: spaceConfig.slug || spaceParam || '',
			name: spaceConfig.name || 'Space',
			type: spaceConfig.type || 'custom',
			icon: spaceConfig.icon,
			color: spaceConfig.color,
			context: spaceConfig.context,
			orderIndex: 0,
			userId: 'admin',
			createdAt: new Date(),
			updatedAt: new Date()
		};
	});

	// Get areas for this space
	let areas = $derived.by(() => {
		if (!spaceParam) return [];
		return areaStore.getAreasForSpace(spaceParam);
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

	// Get recent conversations for this space
	let recentConversations = $derived.by(() => {
		if (!spaceParam) return [];
		// Filter conversations by space ID
		return chatStore.conversationList
			.filter((c) => c.spaceId === spaceParam)
			.slice(0, 10);
	});

	// Get active tasks for this space
	let activeTasks = $derived.by(() => {
		if (!spaceParam) return [];
		return taskStore
			.getTasksForSpaceId(spaceParam)
			.filter((t) => t.status === 'active' || t.status === 'planning')
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

		// Validate space exists
		if (!isSystemSpace && !spaceFromStore) {
			// Try loading spaces first
			await spacesStore.loadSpaces();
			const loaded = spacesStore.getSpaceBySlug(spaceParam);
			if (!loaded) {
				toastStore.error('Space not found');
				goto('/spaces');
				return;
			}
		}

		// Load data in parallel
		await Promise.all([
			areaStore.loadAreas(spaceParam),
			chatStore.refresh(),
			taskStore.loadTasks(spaceParam)
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
	/>

	<!-- Area Modal -->
	<AreaModal
		open={showAreaModal}
		area={editingArea}
		spaceId={spaceParam || ''}
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
