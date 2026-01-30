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
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { SpaceDashboard, SpaceModal, SpaceSettingsPanel } from '$lib/components/spaces';
	import { AreaModal, AreaEditPanel, DeleteAreaModal } from '$lib/components/areas';
	import SpaceConversationsDrawer from '$lib/components/spaces/SpaceConversationsDrawer.svelte';
	import SelectAreaModal from '$lib/components/pages/SelectAreaModal.svelte';
	import DeleteConversationModal from '$lib/components/chat/DeleteConversationModal.svelte';
	import Header from '$lib/components/layout/Header.svelte';
	import MobileHeader from '$lib/components/layout/MobileHeader.svelte';
	import MobileActionsMenu from '$lib/components/layout/MobileActionsMenu.svelte';
	import UserMenu from '$lib/components/layout/UserMenu.svelte';
	import { Settings, MessageSquare } from 'lucide-svelte';
	import { areaStore } from '$lib/stores/areas.svelte';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import type { Space } from '$lib/types/spaces';
	import type { Area, CreateAreaInput, UpdateAreaInput } from '$lib/types/areas';
	import type { CreateTaskInput, Task } from '$lib/types/tasks';
	import type { Conversation } from '$lib/types/chat';

	// Get space from route param (slug from URL)
	let spaceParam = $derived($page.params.space);

	// User data for mobile header
	let userData = $derived($page.data.user as { displayName: string | null; role: 'owner' | 'admin' | 'member' } | null);

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
			// Get conversations for this area (simple areaId filter)
			const conversations = chatStore.getConversationsByArea(area.id);
			const lastConv = conversations[0]; // Already sorted by updatedAt

			return {
				...area,
				conversationCount: conversations.length,
				lastActivity: lastConv ? new Date(lastConv.updatedAt) : null
			};
		});
	});

	// Get recent conversations for this space (using area IDs as proxy)
	let recentConversations = $derived.by(() => {
		if (!spaceFromStore) return [];

		const areaIds = new Set(areas.map(a => a.id));

		// Filter by conversations that belong to any area in this space
		return chatStore.conversationList
			.filter((c) => c.areaId && areaIds.has(c.areaId))
			.slice(0, 10);
	});

	// Get all conversations for this space (for conversations drawer)
	// Filter by conversations that belong to any area in this space
	let spaceConversations = $derived.by(() => {
		if (!spaceFromStore) return [];

		const areaIds = new Set(areas.map(a => a.id));

		return chatStore.conversationList
			.filter((c) => c.areaId && areaIds.has(c.areaId))
			.sort((a, b) => b.updatedAt - a.updatedAt);
	});

	// Get active tasks for this space (parent tasks only, not subtasks, using proper ID)
	let activeTasks = $derived.by(() => {
		if (!spaceFromStore) return [];
		return taskStore
			.getTasksForSpaceId(spaceFromStore.id)
			.filter((t) => (t.status === 'active' || t.status === 'planning') && !t.parentTaskId)
			.slice(0, 10);
	});

	// Phase 6: Get shared areas (only for org spaces)
	let sharedAreas = $derived.by(() => {
		if (!spaceFromStore || spaceFromStore.spaceType !== 'organization') return [];
		return areaStore.getSharedAreas();
	});

	// UI state
	let showAreaModal = $state(false);
	let showAreaEditPanel = $state(false);
	let editingArea = $state<Area | null>(null);
	let showSpaceModal = $state(false);
	let showSettingsPanel = $state(false);
	let isLoading = $state(true);

	// Delete area modal state
	let showDeleteAreaModal = $state(false);
	let deletingArea = $state<Area | null>(null);

	// Space conversations drawer state
	let showConversationsDrawer = $state(false);
	let showNewChatAreaModal = $state(false);

	// Delete conversation modal state
	let showDeleteConversationModal = $state(false);
	let deletingConversation = $state<Conversation | null>(null);

	// Computed counts for the area being deleted
	let deletingAreaConversationCount = $derived.by(() => {
		if (!deletingArea) return 0;
		return chatStore.getConversationsByArea(deletingArea.id).length;
	});

	let deletingAreaTaskCount = $derived.by(() => {
		if (!deletingArea) return 0;
		return taskStore.getTasksForAreaId(deletingArea.id).length;
	});

	// Track the currently loaded space ID to avoid redundant loads
	let loadedSpaceId = $state<string | null>(null);

	// Load data when space changes (handles both initial mount and navigation)
	$effect(() => {
		const currentSpaceParam = spaceParam;
		if (!currentSpaceParam) {
			goto('/spaces');
			return;
		}

		// Run async loading in the effect
		(async () => {
			// Ensure spaces are loaded first to get proper IDs
			await spacesStore.loadSpaces();
			const space = spacesStore.getSpaceBySlug(currentSpaceParam);
			if (!space) {
				toastStore.error('Space not found');
				goto('/spaces');
				return;
			}

			// Skip if we already loaded this space's data
			if (loadedSpaceId === space.id) {
				isLoading = false;
				return;
			}

			isLoading = true;

			// Load data in parallel using proper space ID
			const loadPromises = [
				areaStore.loadAreas(space.id),
				chatStore.refresh(),
				taskStore.loadTasks(space.id)
			];

			// Phase 6: Load shared areas for org spaces
			if (space.spaceType === 'organization') {
				loadPromises.push(areaStore.loadSharedAreas());
			}

			await Promise.all(loadPromises);

			loadedSpaceId = space.id;
			isLoading = false;
		})();
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
			// Panel shows its own toast, modal doesn't
			if (showAreaModal) {
				toastStore.success('Area updated');
				showAreaModal = false;
			}
			// Panel closes itself and shows toast
		}
	}

	async function handleAreaDelete(id: string) {
		// Open delete modal instead of deleting directly
		const area = areaStore.getAreaById(id);
		if (area) {
			deletingArea = area;
			showDeleteAreaModal = true;
		}
		showAreaModal = false;
	}

	async function handleConfirmAreaDelete(deleteContent: boolean) {
		if (!deletingArea) return;

		const areaName = deletingArea.name;
		const success = await areaStore.deleteArea(deletingArea.id, { deleteContent });

		if (success) {
			const message = deleteContent
				? `"${areaName}" and all its content deleted`
				: `"${areaName}" deleted. Content moved to General.`;
			toastStore.success(message);
		}

		showDeleteAreaModal = false;
		deletingArea = null;
	}

	function handleCloseDeleteAreaModal() {
		showDeleteAreaModal = false;
		deletingArea = null;
	}

	function handleCloseAreaModal() {
		showAreaModal = false;
		editingArea = null;
	}

	// Handlers for area card menu
	function handleEditArea(area: Area) {
		editingArea = area;
		showAreaEditPanel = true;
	}

	function handleCloseAreaEditPanel() {
		showAreaEditPanel = false;
		editingArea = null;
	}

	function handleDeleteAreaFromCard(area: Area) {
		// Skip AreaModal, go directly to delete confirmation
		deletingArea = area;
		showDeleteAreaModal = true;
	}

	// Space settings handlers
	function handleCloseSpaceModal() {
		showSpaceModal = false;
	}

	async function handleSpaceUpdate(id: string, updates: any) {
		await spacesStore.updateSpace(id, updates);
	}

	async function handleSpaceDelete(id: string) {
		const success = await spacesStore.deleteSpace(id);
		if (success) {
			toastStore.success('Space deleted');
			goto('/spaces');
		}
	}

	// Space conversations drawer handlers
	function handleSelectConversation(conv: Conversation) {
		if (!conv.areaId) return;

		// Find the area
		const area = areas.find(a => a.id === conv.areaId);
		if (!area) return;

		// Navigate to area with conversation ID in query param
		goto(`/spaces/${spaceParam}/${area.slug}?conversation=${conv.id}`);
	}

	function handleNewChatAreaSelect(areaSlug: string) {
		showNewChatAreaModal = false;
		goto(`/spaces/${spaceParam}/${areaSlug}`);
	}

	function handleToggleConversations() {
		settingsStore.toggleSpaceConversations();
	}

	// Conversation actions
	function handlePinConversation(id: string, pinned: boolean) {
		chatStore.togglePin(id);
	}

	function handleRenameConversation(id: string, newTitle: string) {
		chatStore.updateConversationTitle(id, newTitle);
		toastStore.success('Conversation renamed');
	}

	function handleExportConversation(id: string) {
		const json = chatStore.exportConversation(id);
		if (json) {
			const blob = new Blob([json], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `conversation-${id}.json`;
			a.click();
			URL.revokeObjectURL(url);
			toastStore.success('Conversation exported');
		}
	}

	function handleDeleteConversation(id: string) {
		// Find the conversation and show confirmation modal
		const conversation = chatStore.getConversation(id);
		if (conversation) {
			deletingConversation = conversation;
			showDeleteConversationModal = true;
		}
	}

	async function handleConfirmDeleteConversation() {
		if (!deletingConversation) return;
		await chatStore.deleteConversation(deletingConversation.id);
		// Toast is shown by the store itself
		showDeleteConversationModal = false;
		deletingConversation = null;
	}

	function handleCloseDeleteConversationModal() {
		showDeleteConversationModal = false;
		deletingConversation = null;
	}

	// Sync drawer state with settings store
	$effect(() => {
		showConversationsDrawer = settingsStore.spaceConversationsOpen;
	});

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

<div class="page-container">
	<!-- Mobile Header (visible < 768px) -->
	<MobileHeader
		title={space?.name || 'Space'}
		onBack={() => goto('/spaces')}
	>
		<!-- Conversations toggle -->
		<button
			class="mobile-header-action"
			onclick={handleToggleConversations}
			aria-label="Toggle conversations"
		>
			<MessageSquare size={18} />
		</button>

		<!-- Space settings -->
		<MobileActionsMenu>
			<button class="mobile-action-item" onclick={() => showSettingsPanel = true}>
				<Settings size={16} />
				Space Settings
			</button>
		</MobileActionsMenu>

		<!-- User Menu (icon only for mobile) -->
		{#if userData}
			<UserMenu displayName={userData.displayName} role={userData.role} iconOnly />
		{/if}
	</MobileHeader>

	<!-- Desktop Header (hidden on mobile) -->
	<div class="hidden md:block">
		<Header onSettingsClick={() => showSettingsPanel = true} />
	</div>

	{#if space}
		<SpaceDashboard
			{space}
			areas={areasWithStats}
			{recentConversations}
			{activeTasks}
			{sharedAreas}
			spaceSlug={spaceParam || ''}
			{isLoading}
			onCreateArea={handleCreateArea}
			onEditArea={handleEditArea}
			onDeleteArea={handleDeleteAreaFromCard}
			onTaskClick={handleTaskClick}
			onCreateTask={handleCreateTask}
		/>
	{:else if isLoading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<p>Loading...</p>
		</div>
	{:else}
		<div class="error-container">
			<h1>Space not found</h1>
			<p>The space you're looking for doesn't exist.</p>
			<a href="/spaces" class="back-link">Back to spaces</a>
		</div>
	{/if}

	<!-- Modals - must be outside the if/else to always render -->
	<AreaModal
		open={showAreaModal}
		area={null}
		spaceId={spaceFromStore?.id || ''}
		isOrgSpace={spaceFromStore?.spaceType === 'organization'}
		onClose={handleCloseAreaModal}
		onCreate={handleAreaCreate}
		onUpdate={handleAreaUpdate}
		onDelete={handleAreaDelete}
	/>

	{#if editingArea && spaceFromStore}
		<AreaEditPanel
			isOpen={showAreaEditPanel}
			area={editingArea}
			spaceId={spaceFromStore.id}
			spaceColor={spaceFromStore.color}
			onClose={handleCloseAreaEditPanel}
			onUpdate={handleAreaUpdate}
		/>
	{/if}

	<DeleteAreaModal
		open={showDeleteAreaModal}
		area={deletingArea}
		conversationCount={deletingAreaConversationCount}
		taskCount={deletingAreaTaskCount}
		spaceColor={spaceFromStore?.color}
		onClose={handleCloseDeleteAreaModal}
		onConfirm={handleConfirmAreaDelete}
	/>

	<DeleteConversationModal
		open={showDeleteConversationModal}
		conversation={deletingConversation}
		onClose={handleCloseDeleteConversationModal}
		onConfirm={handleConfirmDeleteConversation}
	/>

	{#if spaceFromStore}
		<SpaceSettingsPanel
			isOpen={showSettingsPanel}
			space={spaceFromStore}
			onClose={() => showSettingsPanel = false}
			onUpdate={handleSpaceUpdate}
			onDelete={handleSpaceDelete}
		/>
	{/if}

	{#if spaceFromStore}
		<SpaceModal
			open={showSpaceModal}
			space={spaceFromStore}
			onClose={handleCloseSpaceModal}
			onCreate={async () => {}}
			onUpdate={handleSpaceUpdate}
		/>
	{/if}

	<!-- Space Conversations Drawer -->
	{#if spaceFromStore}
		<SpaceConversationsDrawer
			open={showConversationsDrawer}
			space={spaceFromStore}
			{areas}
			conversations={spaceConversations}
			onClose={handleToggleConversations}
			onSelectConversation={handleSelectConversation}
			onNewChat={() => showNewChatAreaModal = true}
			onPinConversation={handlePinConversation}
			onRenameConversation={handleRenameConversation}
			onExportConversation={handleExportConversation}
			onDeleteConversation={handleDeleteConversation}
		/>
	{/if}

	<!-- Select Area Modal (for New Chat) -->
	<SelectAreaModal
		isOpen={showNewChatAreaModal}
		{areas}
		onSelect={handleNewChatAreaSelect}
		onClose={() => showNewChatAreaModal = false}
	/>
</div>

<style>
	.page-container {
		height: 100vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* SpaceDashboard fills remaining space */
	.page-container :global(.dashboard) {
		flex: 1;
		overflow-y: auto;
	}
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
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
		flex: 1;
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
