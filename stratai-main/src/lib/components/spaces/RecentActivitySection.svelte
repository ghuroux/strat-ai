<script lang="ts">
	/**
	 * RecentActivitySection - Shows recent chats and tasks on dashboard
	 *
	 * Clean list of recent activity with:
	 * - Chat icon and title
	 * - Area badge
	 * - Relative time
	 * - Click to navigate
	 */
	import type { Conversation } from '$lib/types/chat';
	import type { Task } from '$lib/types/tasks';
	import type { Area } from '$lib/types/areas';

	interface ActivityItem {
		type: 'chat' | 'task';
		id: string;
		title: string;
		areaId?: string;
		areaName?: string;
		areaColor?: string;
		timestamp: Date;
		status?: string;
	}

	interface Props {
		items: ActivityItem[];
		title?: string;
		maxItems?: number;
		onItemClick: (item: ActivityItem) => void;
		onViewAll?: () => void;
		emptyMessage?: string;
	}

	let {
		items,
		title = 'Recent Activity',
		maxItems = 5,
		onItemClick,
		onViewAll,
		emptyMessage = 'No recent activity'
	}: Props = $props();

	let displayItems = $derived(items.slice(0, maxItems));
	let hasMore = $derived(items.length > maxItems);

	function formatRelativeTime(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m`;
		if (diffHours < 24) return `${diffHours}h`;
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays}d`;
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
</script>

<section class="activity-section">
	<header class="section-header">
		<h3 class="section-title">{title}</h3>
		{#if hasMore && onViewAll}
			<button type="button" class="view-all" onclick={onViewAll}>
				View all
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		{/if}
	</header>

	{#if displayItems.length === 0}
		<div class="empty-state">
			<p>{emptyMessage}</p>
		</div>
	{:else}
		<ul class="activity-list">
			{#each displayItems as item (item.id)}
				<li>
					<button
						type="button"
						class="activity-item"
						onclick={() => onItemClick(item)}
					>
						<div class="item-icon" class:chat={item.type === 'chat'} class:task={item.type === 'task'}>
							{#if item.type === 'chat'}
								<svg viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
										clip-rule="evenodd"
									/>
								</svg>
							{:else}
								<svg viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
										clip-rule="evenodd"
									/>
								</svg>
							{/if}
						</div>

						<div class="item-content">
							<span class="item-title">{item.title}</span>
							<div class="item-meta">
								{#if item.areaName}
									<span
										class="area-badge"
										style="--badge-color: {item.areaColor || '#6b7280'}"
									>
										{item.areaName}
									</span>
								{/if}
								{#if item.status}
									<span class="status-badge" class:in-progress={item.status === 'in_progress'}>
										{item.status === 'in_progress' ? 'In Progress' : item.status}
									</span>
								{/if}
							</div>
						</div>

						<span class="item-time">{formatRelativeTime(item.timestamp)}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.activity-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
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

	.view-all {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		transition: color 0.15s ease;
	}

	.view-all:hover {
		color: rgba(255, 255, 255, 0.9);
	}

	.view-all svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.empty-state {
		padding: 2rem 1rem;
		text-align: center;
	}

	.empty-state p {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	.activity-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.activity-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem;
		background: transparent;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.15s ease;
		text-align: left;
	}

	.activity-item:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.item-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.375rem;
		flex-shrink: 0;
	}

	.item-icon.chat {
		background: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
	}

	.item-icon.task {
		background: rgba(168, 85, 247, 0.1);
		color: #a855f7;
	}

	.item-icon svg {
		width: 1rem;
		height: 1rem;
	}

	.item-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.item-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.area-badge {
		display: inline-flex;
		padding: 0.125rem 0.375rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--badge-color);
		background: color-mix(in srgb, var(--badge-color) 15%, transparent);
		border-radius: 0.25rem;
	}

	.status-badge {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.status-badge.in-progress {
		color: #f59e0b;
	}

	.item-time {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.3);
		flex-shrink: 0;
	}
</style>
