<script lang="ts">
	/**
	 * SpaceDashboard - Navigation hub for a space
	 *
	 * Clean, clear, premium design with:
	 * - Space header with name and description
	 * - Area cards as primary navigation
	 * - Create Area card
	 * - Recent activity section
	 * - Active tasks section
	 *
	 * No chat here - chat lives in area pages
	 */
	import { goto } from '$app/navigation';
	import AreaCard from './AreaCard.svelte';
	import CreateAreaCard from './CreateAreaCard.svelte';
	import RecentActivitySection from './RecentActivitySection.svelte';
	import type { Area } from '$lib/types/areas';
	import type { Space } from '$lib/types/spaces';
	import type { Conversation } from '$lib/types/chat';
	import type { Task } from '$lib/types/tasks';

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
	}

	let {
		space,
		areas,
		recentConversations,
		activeTasks,
		spaceSlug,
		onCreateArea,
		onOpenSettings
	}: Props = $props();

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
</script>

<div class="dashboard" style="--space-color: {spaceColor}">
	<!-- Header -->
	<header class="dashboard-header">
		<div class="header-content">
			<div class="space-info">
				{#if space.icon}
					<span class="space-icon">{space.icon}</span>
				{/if}
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
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			{/if}
		</div>
	</header>

	<!-- Main content -->
	<main class="dashboard-content">
		<!-- Areas Section -->
		<section class="areas-section">
			<header class="section-header">
				<h2 class="section-title">Your Areas</h2>
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

		<!-- Activity Sections -->
		<div class="activity-sections">
			{#if recentActivity.length > 0}
				<RecentActivitySection
					items={recentActivity}
					title="Recent Activity"
					onItemClick={handleActivityClick}
					emptyMessage="No recent activity"
				/>
			{/if}

			{#if activeTaskItems.length > 0}
				<RecentActivitySection
					items={activeTaskItems}
					title="Active Tasks"
					onItemClick={handleActivityClick}
					emptyMessage="No active tasks"
				/>
			{/if}

			{#if recentActivity.length === 0 && activeTaskItems.length === 0}
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
						Click on an area above to start a conversation, or create a new area for a specific topic.
					</p>
				</div>
			{/if}
		</div>
	</main>
</div>

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

	.space-icon {
		font-size: 2.5rem;
		line-height: 1;
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

	/* Areas Section */
	.areas-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.section-title {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	.areas-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1rem;
	}

	/* Activity Sections */
	.activity-sections {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding-top: 1rem;
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
