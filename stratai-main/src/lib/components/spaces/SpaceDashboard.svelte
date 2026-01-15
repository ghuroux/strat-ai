<script lang="ts">
	/**
	 * SpaceDashboard - Navigation hub for a space
	 *
	 * Two-column layout reflecting "two reasons to visit Spaces":
	 * - Left: Areas (context-rich discussions)
	 * - Right: Tasks (execute to-do list)
	 * - Below: Recent activity across both
	 *
	 * No chat here - chat lives in area pages
	 */
	import { goto } from '$app/navigation';
	import AreaCard from './AreaCard.svelte';
	import CreateAreaCard from './CreateAreaCard.svelte';
	import RecentActivitySection from './RecentActivitySection.svelte';
	import TasksSection from './TasksSection.svelte';
	import TaskPanel from './TaskPanel.svelte';
	import DeleteConfirmModal from './DeleteConfirmModal.svelte';
	import SpaceIcon from '$lib/components/SpaceIcon.svelte';
	import ShareAreaModal from '$lib/components/areas/ShareAreaModal.svelte';
	import ShareSpaceModal from './ShareSpaceModal.svelte';
	import SharedWithMeSection from './SharedWithMeSection.svelte';
	import { getSpaceIconPath } from '$lib/config/space-icons';
	import { spacesStore } from '$lib/stores/spaces.svelte';
	import { userStore } from '$lib/stores/user.svelte';
	import { canManageSpaceMembers } from '$lib/types/space-memberships';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { areaStore } from '$lib/stores/areas.svelte';
	import type { Area, SharedAreaInfo } from '$lib/types/areas';
	import type { Space } from '$lib/types/spaces';
	import type { Conversation } from '$lib/types/chat';
	import type { SpaceType } from '$lib/types/chat';
	import type { Task, CreateTaskInput } from '$lib/types/tasks';

	interface AreaWithStats extends Area {
		conversationCount?: number;
		lastActivity?: Date | null;
	}

	interface Props {
		space: Space;
		areas: AreaWithStats[];
		recentConversations: Conversation[];
		activeTasks: Task[];
		spaceSlug: string;
		sharedAreas?: SharedAreaInfo[]; // Phase 6: Areas from other spaces shared with user
		onCreateArea: () => void;
		onEditArea?: (area: Area) => void;
		onDeleteArea?: (area: Area) => void;
		onTaskClick?: (task: Task) => void;
		onCreateTask?: (input: CreateTaskInput) => Promise<Task | null>;
	}

	let {
		space,
		areas,
		recentConversations,
		activeTasks,
		spaceSlug,
		sharedAreas = [],
		onCreateArea,
		onEditArea,
		onDeleteArea,
		onTaskClick,
		onCreateTask
	}: Props = $props();

	// Task panel state
	let showTaskPanel = $state(false);
	let editingTask = $state<Task | null>(null);

	// Delete confirmation modal state
	let showDeleteModal = $state(false);
	let deletingTask = $state<Task | null>(null);

	// Phase 4: Share modal state
	let showShareModal = $state(false);
	let sharingArea = $state<Area | null>(null);

	// Space members modal state
	let showMembersModal = $state(false);

	// Derive space color
	let spaceColor = $derived(space.color || '#3b82f6');

	// Check if this is a custom space (has an icon stored as a name, not a system space)
	let isCustomSpace = $derived(space.type === 'custom');

	// Get appropriate description for the space
	let spaceDescription = $derived.by(() => {
		if (space.spaceType === 'organization') {
			return 'Organization shared workspace';
		}
		return space.context || `Your ${space.name.toLowerCase()} space`;
	});

	// Space members for member button
	let currentUserId = $derived(userStore.id ?? null);
	let userSpaceRole = $derived.by(() => {
		if (!space?.id || !currentUserId) return null;
		return spacesStore.getUserRoleInSpace(space.id, currentUserId);
	});
	let canManageMembers = $derived(canManageSpaceMembers(userSpaceRole));
	let memberCount = $derived(spacesStore.getMembersForSpace(space.id).length);

	// Load space members when component mounts
	$effect(() => {
		if (space?.id) {
			spacesStore.loadMembers(space.id);
		}
	});

	// Load area members for member count badges
	$effect(() => {
		for (const area of areas) {
			// loadMembers has internal caching, won't refetch if already loaded
			areaStore.loadMembers(area.id);
		}
	});

	// Phase 4: Areas with member counts
	let areasWithCounts = $derived.by(() => {
		return areas.map((area) => ({
			...area,
			memberCount: areaStore.getMembersForArea(area.id).length
		}));
	});

	// Recent conversations only (for quick resume) - includes area chats and subtask chats
	// Show 10 items initially, with option to show more
	// Sort by lastViewedAt (when user actually opened) not updatedAt (when modified)
	let maxRecentItems = $state(10);
	let recentActivity = $derived.by(() => {
		return recentConversations
			.filter((conv) => conv.lastViewedAt) // Only show conversations user has actually viewed
			.map((conv) => {
				const area = areas.find((a) => a.id === conv.areaId);
				// Find associated task if this is a task conversation (use taskStore to include subtasks)
				const task = conv.taskId ? taskStore.getTask(conv.taskId) : null;
				// Check if it's a subtask and get parent task info
				const isSubtask = !!(task?.parentTaskId);
				const parentTask = isSubtask ? taskStore.getTask(task.parentTaskId!) : null;

				return {
					type: 'chat' as const,
					id: conv.id,
					title: conv.title || 'Untitled conversation',
					areaId: conv.areaId ?? undefined,
					areaName: area?.name,
					areaColor: area?.color || spaceColor,
					taskId: conv.taskId ?? undefined,
					taskTitle: task?.title,
					isSubtask,
					parentTaskTitle: parentTask?.title,
					timestamp: new Date(conv.lastViewedAt!)
				};
			})
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
	});

	let displayedActivity = $derived(recentActivity.slice(0, maxRecentItems));
	let hasMoreActivity = $derived(recentActivity.length > maxRecentItems);

	function handleAreaClick(area: Area) {
		goto(`/spaces/${spaceSlug}/${area.slug}`);
	}

	// Phase 4: Handle share area
	function handleShareArea(area: Area) {
		sharingArea = area;
		showShareModal = true;
	}

	function handleActivityClick(item: { type: string; id: string; areaId?: string; taskId?: string }) {
		if (item.taskId) {
			// Task-associated conversation (subtask chat) - navigate to task page
			goto(`/spaces/${spaceSlug}/task/${item.taskId}`);
		} else if (item.areaId) {
			// Area conversation - navigate to area with conversation ID
			const area = areas.find((a) => a.id === item.areaId);
			if (area) {
				goto(`/spaces/${spaceSlug}/${area.slug}?conversation=${item.id}`);
			}
		}
	}

	function handleShowMoreActivity() {
		maxRecentItems += 10;
	}

	function handleTaskClick(task: Task) {
		if (onTaskClick) {
			onTaskClick(task);
		} else {
			// Default: navigate to task focus mode
			goto(`/spaces/${spaceSlug}/task/${task.id}`);
		}
	}

	function handleOpenTaskPanel() {
		showTaskPanel = true;
	}

	async function handleCreateTask(input: CreateTaskInput): Promise<Task | null> {
		if (onCreateTask) {
			return await onCreateTask(input);
		}
		return null;
	}

	function handleViewAllTasks() {
		// Navigate to tasks page for this space
		goto(`/spaces/${spaceSlug}/tasks`);
	}

	function handleEditTask(task: Task) {
		editingTask = task;
		showTaskPanel = true;
	}

	function handleDeleteTask(task: Task) {
		// Open delete confirmation modal
		deletingTask = task;
		showDeleteModal = true;
	}

	async function handleConfirmDelete(deleteConversations: boolean) {
		if (!deletingTask) return;

		await taskStore.deleteTask(deletingTask.id, { deleteConversations });
		showDeleteModal = false;
		deletingTask = null;
	}

	function handleCloseDeleteModal() {
		showDeleteModal = false;
		deletingTask = null;
	}

	function handleStartPlanMode(task: Task) {
		// Navigate to task page to start plan mode
		goto(`/spaces/${spaceSlug}/task/${task.id}?plan=true`);
	}

	function handleCloseTaskPanel() {
		showTaskPanel = false;
		editingTask = null;
	}
</script>

<div class="dashboard" style="--space-color: {spaceColor}">
	<!-- Header -->
	<header class="dashboard-header">
		<div class="header-content">
			<div class="space-info">
				<div class="space-icon-wrapper">
					{#if isCustomSpace && space.icon}
						<!-- Custom space with icon -->
						<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d={getSpaceIconPath(space.icon)} />
						</svg>
					{:else if isCustomSpace}
						<!-- Custom space without icon (folder) -->
						<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d={getSpaceIconPath(undefined)} />
						</svg>
					{:else}
						<SpaceIcon space={spaceSlug as SpaceType} size="xl" />
					{/if}
				</div>
				<div class="space-text">
					<h1 class="space-name">{space.name}</h1>
					<p class="space-description">{spaceDescription}</p>
				</div>
			</div>
			<!-- Quick nav links -->
			<nav class="space-nav">
				<a href="/spaces/{spaceSlug}/tasks" class="nav-link">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					Tasks
				</a>
				<a href="/spaces/{spaceSlug}/documents" class="nav-link">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
					</svg>
					Documents
				</a>
				<button class="nav-link members-btn" onclick={() => (showMembersModal = true)}>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
					</svg>
					Members
					{#if memberCount > 0}
						<span class="member-count-badge">{memberCount}</span>
					{/if}
				</button>
			</nav>
		</div>
	</header>

	<!-- Main content: Two-column layout -->
	<main class="dashboard-content">
		<!-- Phase 6: Shared with Me (org spaces only) -->
		{#if space.spaceType === 'organization' && sharedAreas.length > 0}
			<SharedWithMeSection {sharedAreas} />
		{/if}

		<div class="main-columns">
			<!-- Left Column: Areas (Context-rich discussions) -->
			<section class="areas-section">
				<header class="section-header">
					<h2 class="section-title">Areas</h2>
					<span class="section-count">{areas.length}</span>
				</header>

				<div class="areas-grid">
					{#each areasWithCounts as area (area.id)}
						<AreaCard
							{area}
							conversationCount={area.conversationCount ?? 0}
							lastActivity={area.lastActivity ?? null}
							{spaceColor}
							memberCount={area.memberCount}
							onclick={() => handleAreaClick(area)}
							onEdit={onEditArea}
							onDelete={onDeleteArea}
							onShare={handleShareArea}
						/>
					{/each}
					<CreateAreaCard {spaceColor} onclick={onCreateArea} />
				</div>
			</section>

			<!-- Right Column: Tasks (Execute to-do list) -->
			<TasksSection
				tasks={activeTasks}
				{areas}
				{spaceColor}
				spaceParam={spaceSlug}
				onTaskClick={handleTaskClick}
				onOpenTaskModal={handleOpenTaskPanel}
				onViewAllTasks={handleViewAllTasks}
				onEditTask={handleEditTask}
				onDeleteTask={handleDeleteTask}
				onStartPlanMode={handleStartPlanMode}
			/>
		</div>

		<!-- Recent Conversations (below both columns) -->
		<div class="activity-sections">
			{#if displayedActivity.length > 0}
				<RecentActivitySection
					items={displayedActivity}
					title="Recent Conversations"
					onItemClick={handleActivityClick}
					emptyMessage="No recent conversations"
				/>
				{#if hasMoreActivity}
					<button type="button" class="show-more-activity" onclick={handleShowMoreActivity}>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
						</svg>
						Show more conversations
					</button>
				{/if}
			{:else if areas.length === 0 && activeTasks.length === 0}
				<div class="empty-dashboard">
					<div class="empty-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
							/>
						</svg>
					</div>
					<h3 class="empty-title">Ready to get started?</h3>
					<p class="empty-text">
						Create an area for focused discussions, or add a task to your to-do list.
					</p>
				</div>
			{/if}
		</div>
	</main>
</div>

<!-- Task Panel -->
<TaskPanel
	isOpen={showTaskPanel}
	spaceId={space.id}
	{areas}
	{spaceColor}
	task={editingTask}
	onClose={handleCloseTaskPanel}
	onCreate={handleCreateTask}
/>

<!-- Delete Confirmation Modal -->
<DeleteConfirmModal
	open={showDeleteModal}
	task={deletingTask}
	{spaceColor}
	onClose={handleCloseDeleteModal}
	onConfirm={handleConfirmDelete}
/>

<!-- Phase 4: Share Area Modal -->
<ShareAreaModal
	open={showShareModal}
	area={sharingArea}
	onClose={() => {
		showShareModal = false;
		sharingArea = null;
	}}
/>

<!-- Space Members Modal -->
<ShareSpaceModal
	open={showMembersModal}
	{space}
	onClose={() => {
		showMembersModal = false;
	}}
/>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		/* flex: 1 and overflow-y: auto set by parent page */
		padding-top: 1.5rem;
		padding-bottom: 2rem;
	}

	/* Content centering via child selector - allows full-width scrolling */
	.dashboard > :global(*) {
		max-width: 1200px;
		margin-left: auto;
		margin-right: auto;
		padding-left: 2rem;
		padding-right: 2rem;
		width: 100%;
		box-sizing: border-box;
	}

	/* Header */
	.dashboard-header {
		margin-bottom: 2rem;
	}

	.header-content {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.space-info {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.space-icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		background: color-mix(in srgb, var(--space-color) 15%, transparent);
		border-radius: 0.75rem;
		color: var(--space-color);
	}

	.space-text {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.space-name {
		font-size: 1.75rem;
		font-weight: 700;
		color: #fff;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.space-description {
		font-size: 0.9375rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
		max-width: 400px;
		line-height: 1.5;
	}

	/* Quick nav links */
	.space-nav {
		display: flex;
		gap: 0.5rem;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.nav-link:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.12);
	}

	.nav-link svg {
		width: 1rem;
		height: 1rem;
	}

	.members-btn {
		cursor: pointer;
	}

	.member-count-badge {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 9999px;
		color: rgba(255, 255, 255, 0.8);
	}

	/* Content */
	.dashboard-content {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	/* Two-column layout */
	.main-columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		align-items: start;
	}

	/* Areas Section (left column) */
	.areas-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.section-title {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	.section-count {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 9999px;
		color: rgba(255, 255, 255, 0.5);
	}

	.areas-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	/* Activity Sections */
	.activity-sections {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.show-more-activity {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.show-more-activity:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.show-more-activity svg {
		width: 1rem;
		height: 1rem;
	}

	/* Empty State */
	.empty-dashboard {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 2rem;
		text-align: center;
	}

	.empty-icon {
		width: 4rem;
		height: 4rem;
		color: rgba(255, 255, 255, 0.2);
		margin-bottom: 1rem;
	}

	.empty-icon svg {
		width: 100%;
		height: 100%;
	}

	.empty-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 0.5rem 0;
	}

	.empty-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
		max-width: 300px;
		line-height: 1.5;
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.main-columns {
			grid-template-columns: 1fr;
			gap: 2.5rem;
		}
	}

	@media (max-width: 640px) {
		.dashboard > :global(*) {
			padding-left: 1rem;
			padding-right: 1rem;
		}

		.space-name {
			font-size: 1.5rem;
		}

		.areas-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
