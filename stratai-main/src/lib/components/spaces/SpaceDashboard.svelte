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
	import TaskModal from './TaskModal.svelte';
	import SpaceIcon from '$lib/components/SpaceIcon.svelte';
	import type { Area } from '$lib/types/areas';
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
		onCreateArea: () => void;
		onOpenSettings?: () => void;
		onTaskClick?: (task: Task) => void;
		onCreateTask?: (input: CreateTaskInput) => Promise<void>;
	}

	let {
		space,
		areas,
		recentConversations,
		activeTasks,
		spaceSlug,
		onCreateArea,
		onOpenSettings,
		onTaskClick,
		onCreateTask
	}: Props = $props();

	// Task modal state
	let showTaskModal = $state(false);

	// Derive space color
	let spaceColor = $derived(space.color || '#3b82f6');

	// Build activity items from conversations and tasks
	let recentActivity = $derived.by(() => {
		const chatItems = recentConversations.slice(0, 5).map((conv) => {
			const area = areas.find((a) => a.id === conv.areaId);
			return {
				type: 'chat' as const,
				id: conv.id,
				title: conv.title || 'Untitled conversation',
				areaId: conv.areaId ?? undefined,
				areaName: area?.name,
				areaColor: area?.color || spaceColor,
				timestamp: new Date(conv.updatedAt)
			};
		});

		const taskItems = activeTasks.slice(0, 3).map((task) => {
			const area = areas.find((a) => a.id === task.areaId);
			return {
				type: 'task' as const,
				id: task.id,
				title: task.title,
				areaId: task.areaId ?? undefined,
				areaName: area?.name,
				areaColor: area?.color || spaceColor,
				timestamp: new Date(task.updatedAt),
				status: task.status
			};
		});

		// Merge and sort by timestamp
		return [...chatItems, ...taskItems]
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
			.slice(0, 5);
	});

	// Active tasks for dedicated section
	let activeTaskItems = $derived(
		activeTasks
			.filter((t) => t.status === 'active' || t.status === 'planning')
			.slice(0, 5)
			.map((task) => {
				const area = areas.find((a) => a.id === task.areaId);
				return {
					type: 'task' as const,
					id: task.id,
					title: task.title,
					areaId: task.areaId ?? undefined,
					areaName: area?.name,
					areaColor: area?.color || spaceColor,
					timestamp: new Date(task.updatedAt),
					status: task.status
				};
			})
	);

	function handleAreaClick(area: Area) {
		goto(`/spaces/${spaceSlug}/${area.slug}`);
	}

	function handleActivityClick(item: { type: string; id: string; areaId?: string }) {
		if (item.type === 'chat' && item.areaId) {
			const area = areas.find((a) => a.id === item.areaId);
			if (area) {
				// Navigate to area with conversation ID in query param
				goto(`/spaces/${spaceSlug}/${area.slug}?conversation=${item.id}`);
			}
		} else if (item.type === 'task') {
			// Navigate to task focus mode
			goto(`/spaces/${spaceSlug}/task/${item.id}`);
		}
	}

	function handleTaskClick(task: Task) {
		if (onTaskClick) {
			onTaskClick(task);
		} else {
			// Default: navigate to task focus mode
			goto(`/spaces/${spaceSlug}/task/${task.id}`);
		}
	}

	function handleOpenTaskModal() {
		showTaskModal = true;
	}

	async function handleCreateTask(input: CreateTaskInput) {
		if (onCreateTask) {
			await onCreateTask(input);
		}
	}

	function handleViewAllTasks() {
		// Navigate to tasks page for this space
		goto(`/spaces/${spaceSlug}/tasks`);
	}
</script>

<div class="dashboard" style="--space-color: {spaceColor}">
	<!-- Header -->
	<header class="dashboard-header">
		<div class="header-content">
			<div class="space-info">
				<div class="space-icon-wrapper">
					<SpaceIcon space={spaceSlug as SpaceType} size="xl" />
				</div>
				<div class="space-text">
					<h1 class="space-name">{space.name}</h1>
					{#if space.context}
						<p class="space-description">{space.context}</p>
					{:else}
						<p class="space-description">Your {space.name.toLowerCase()} space</p>
					{/if}
				</div>
			</div>
			{#if onOpenSettings}
				<button type="button" class="settings-button" onclick={onOpenSettings} title="Space settings">
					<!-- Settings/Cog icon (Heroicons outline) -->
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
						/>
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
				</button>
			{/if}
		</div>
	</header>

	<!-- Main content: Two-column layout -->
	<main class="dashboard-content">
		<div class="main-columns">
			<!-- Left Column: Areas (Context-rich discussions) -->
			<section class="areas-section">
				<header class="section-header">
					<h2 class="section-title">Areas</h2>
					<span class="section-count">{areas.length}</span>
				</header>

				<div class="areas-grid">
					{#each areas as area (area.id)}
						<AreaCard
							{area}
							conversationCount={area.conversationCount ?? 0}
							lastActivity={area.lastActivity ?? null}
							{spaceColor}
							onclick={() => handleAreaClick(area)}
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
				onTaskClick={handleTaskClick}
				onOpenTaskModal={handleOpenTaskModal}
				onViewAllTasks={handleViewAllTasks}
			/>
		</div>

		<!-- Recent Activity (below both columns) -->
		<div class="activity-sections">
			{#if recentActivity.length > 0}
				<RecentActivitySection
					items={recentActivity}
					title="Recent Activity"
					onItemClick={handleActivityClick}
					emptyMessage="No recent activity"
				/>
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

<!-- Task Modal -->
<TaskModal
	open={showTaskModal}
	spaceId={space.id}
	{areas}
	{spaceColor}
	onClose={() => (showTaskModal = false)}
	onCreate={handleCreateTask}
/>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		min-height: 100%;
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
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

	.settings-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		color: rgba(255, 255, 255, 0.4);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.settings-button:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.settings-button svg {
		width: 1.25rem;
		height: 1.25rem;
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
		gap: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
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
		.dashboard {
			padding: 1rem;
		}

		.space-name {
			font-size: 1.5rem;
		}

		.areas-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
