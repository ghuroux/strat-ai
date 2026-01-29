<!--
	TimelineSection.svelte

	Renders a mixed timeline of tasks and calendar events.
	Mirrors TaskGroupSection structure (header, collapse, show-more)
	but handles interleaved TimelineItem[] instead of Task[].

	Used by GlobalTaskDashboard for calendar-interleaved sections.
-->
<script lang="ts">
	import { slide } from 'svelte/transition';
	import { fly } from 'svelte/transition';
	import type { Task, GlobalTask } from '$lib/types/tasks';
	import type { Area } from '$lib/types/areas';
	import type { TimelineItem, EventDisplayMode } from '$lib/types/calendar';
	import { findNowDividerIndex } from '$lib/utils/timeline-builder';
	import TaskCard from './TaskCard.svelte';
	import CalendarEventCard from './CalendarEventCard.svelte';

	interface Props {
		title: string;
		items: TimelineItem[];
		spaceColor: string;
		variant?: 'warning' | 'default';
		emptyMessage?: string;
		collapsible?: boolean;
		defaultCollapsed?: boolean;
		maxVisible?: number;
		// Calendar enhancements
		sectionSummary?: string;
		showNowDivider?: boolean;
		showDayBadge?: boolean;
		eventDisplayMode?: EventDisplayMode;
		// Scroll targeting from HeroCard
		sectionKey?: string;
		// Global dashboard support
		isGlobal?: boolean;
		showSpaceBadge?: boolean;
		// Density
		compact?: boolean;
		// Task callbacks
		onTaskClick: (task: Task) => void;
		onCompleteTask: (task: Task) => void;
		onDismissStale?: (task: Task) => void;
		onEditTask?: (task: Task) => void;
		onDeleteTask?: (task: Task) => void;
	}

	let {
		title,
		items,
		spaceColor,
		variant = 'default',
		emptyMessage = 'No items',
		collapsible = false,
		defaultCollapsed = false,
		maxVisible = 5,
		sectionSummary,
		showNowDivider = false,
		showDayBadge = false,
		eventDisplayMode,
		sectionKey,
		isGlobal = false,
		showSpaceBadge = false,
		compact = false,
		onTaskClick,
		onCompleteTask,
		onDismissStale,
		onEditTask,
		onDeleteTask
	}: Props = $props();

	let isCollapsed = $state(defaultCollapsed);
	let showAll = $state(false);

	// Track which tasks are expanded (for subtask accordion)
	let expandedTaskIds = $state(new Set<string>());

	// Separate all-day events from timed items for grouped display
	let allDayEvents = $derived.by(() => {
		return items.filter(i => i.type === 'event' && i.data.isAllDay);
	});

	// Timed items (tasks + non-all-day events) — these get the main timeline treatment
	let timedItems = $derived.by(() => {
		return items.filter(i => !(i.type === 'event' && i.data.isAllDay));
	});

	// NOW divider: computed from timed items (excludes all-day events)
	let nowDividerIndex = $derived.by(() => {
		if (!showNowDivider) return -1;
		return findNowDividerIndex(timedItems);
	});

	// Auto-compact: use compact mode when 5+ timed events in this section, or when density is compact
	let useCompactEvents = $derived.by(() => {
		if (compact) return true;
		if (eventDisplayMode) return eventDisplayMode === 'compact';
		const timedEventCount = timedItems.filter(i => i.type === 'event').length;
		return timedEventCount >= 5;
	});

	// Safety valve: auto-paginate when maxVisible=0 but items exceed 20
	let effectiveMaxVisible = $derived.by(() => {
		if (maxVisible > 0) return maxVisible;
		if (timedItems.length > 20) return 10;
		return 0;
	});

	// Visible timed items based on effectiveMaxVisible
	let visibleItems = $derived.by(() => {
		if (effectiveMaxVisible === 0 || showAll || timedItems.length <= effectiveMaxVisible) {
			return timedItems;
		}
		return timedItems.slice(0, effectiveMaxVisible);
	});

	let hiddenCount = $derived(timedItems.length - visibleItems.length);

	// Past event collapsing: split visible items at the NOW divider
	let showPastItems = $state(false);

	let pastItems = $derived.by(() => {
		if (!showNowDivider || nowDividerIndex <= 0) return [];
		return visibleItems.slice(0, Math.min(nowDividerIndex, visibleItems.length));
	});

	let upcomingItems = $derived.by(() => {
		if (!showNowDivider || nowDividerIndex <= 0) return visibleItems;
		if (nowDividerIndex >= visibleItems.length) return []; // all past
		return visibleItems.slice(nowDividerIndex);
	});

	// Items to render: hides past items when collapsed
	let displayItems = $derived.by(() => {
		if (pastItems.length > 0 && !showPastItems) {
			return upcomingItems;
		}
		return visibleItems;
	});

	// Unique key for each item
	function itemKey(item: TimelineItem): string {
		return item.type === 'task' ? `task-${item.data.id}` : `event-${item.data.id}`;
	}

	// Calculate stagger delay for event fly-in animation (capped at 5 to prevent 1s+ delays)
	function eventStaggerDelay(item: TimelineItem, idx: number): number {
		if (item.type !== 'event') return 0;
		// Count events before this index in the displayed list
		let eventPos = 0;
		for (let i = 0; i < idx; i++) {
			if (displayItems[i]?.type === 'event') eventPos++;
		}
		return Math.min(eventPos, 5) * 50;
	}

	// Check if task is overdue (hard deadline passed)
	function isOverdue(task: Task): boolean {
		if (!task.dueDate || task.dueDateType !== 'hard') return false;
		return new Date(task.dueDate) < new Date();
	}

	// Check if task is stale (7+ days no activity)
	function isStale(task: Task): boolean {
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
		return new Date(task.lastActivityAt) < sevenDaysAgo;
	}

	function toggleCollapsed() {
		if (collapsible) {
			isCollapsed = !isCollapsed;
		}
	}

	function toggleTaskExpanded(taskId: string) {
		const newSet = new Set(expandedTaskIds);
		if (newSet.has(taskId)) {
			newSet.delete(taskId);
		} else {
			newSet.add(taskId);
		}
		expandedTaskIds = newSet;
	}
</script>

<section class="timeline-group" class:warning={variant === 'warning'} style="--space-color: {spaceColor}" data-section={sectionKey}>
	<!-- Header -->
	<button
		type="button"
		class="section-header"
		class:collapsible
		onclick={toggleCollapsed}
		disabled={!collapsible}
	>
		<div class="header-left">
			{#if variant === 'warning'}
				<svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			{/if}
			<h3 class="section-title">{title}</h3>
			<span class="item-count">{items.length}</span>
			{#if sectionSummary}
				<span class="section-summary">{sectionSummary}</span>
			{/if}
		</div>

		{#if collapsible}
			<svg
				class="chevron"
				class:rotated={!isCollapsed}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
			</svg>
		{/if}
	</button>

	<!-- Content -->
	{#if !isCollapsed}
		<div class="section-content" transition:slide={{ duration: 200 }}>
			{#if items.length > 0}
				<!-- All-day events summary (collapsed into a compact row) -->
				{#if allDayEvents.length > 0}
					<div class="all-day-summary" in:fly={{ y: 6, duration: 200 }}>
						<span class="all-day-label">All day</span>
						<span class="all-day-items">
							{allDayEvents.map(e => e.type === 'event' ? e.data.subject : '').filter(Boolean).join(' · ')}
						</span>
					</div>
				{/if}

				<div class="item-list" class:compact-gap={compact}>
					<!-- Past items toggle (collapsed by default when NOW divider is active) -->
				{#if pastItems.length > 0 && !showPastItems}
					<button type="button" class="past-toggle" onclick={() => showPastItems = true}>
						<div class="now-line"></div>
						<span class="past-toggle-label">{pastItems.length} earlier</span>
						<div class="now-line"></div>
					</button>
				{/if}

				{#each displayItems as item, idx (itemKey(item))}
						<!-- NOW divider (visible when past items are expanded — click to collapse) -->
						{#if showPastItems && pastItems.length > 0 && idx === pastItems.length}
							<button type="button" class="now-divider-btn" onclick={() => showPastItems = false}>
								<div class="now-line"></div>
								<span class="now-label">NOW</span>
								<div class="now-line"></div>
							</button>
						{/if}

						{#if item.type === 'task'}
							{@const task = item.data}
							{@const globalTask = isGlobal ? (task as GlobalTask) : null}
							<div data-timeline-item data-item-type="task" data-item-id={task.id}>
								<TaskCard
									{task}
									area={null}
									spaceColor={isGlobal && globalTask ? globalTask.spaceColor : spaceColor}
									spaceSlug={isGlobal && globalTask ? globalTask.spaceSlug : ''}
									variant={variant === 'warning' ? 'attention' : 'default'}
									showStaleBadge={variant === 'warning' && isStale(task) && !isOverdue(task)}
									showOverdueBadge={variant === 'warning' && isOverdue(task)}
									isExpanded={expandedTaskIds.has(task.id)}
									{compact}
									{showSpaceBadge}
									spaceName={globalTask?.spaceName}
									spaceBadgeColor={globalTask?.spaceColor}
									areaName={globalTask?.areaName}
									areaColor={globalTask?.areaColor}
									onClick={() => onTaskClick(task)}
									onComplete={() => onCompleteTask(task)}
									onToggleExpanded={() => toggleTaskExpanded(task.id)}
									onDismissStale={onDismissStale ? () => onDismissStale(task) : undefined}
									onEdit={onEditTask ? () => onEditTask(task) : undefined}
									onDelete={onDeleteTask ? () => onDeleteTask(task) : undefined}
								/>
							</div>
						{:else}
							<div data-timeline-item data-item-type="event" data-item-id={item.data.id} in:fly={{ y: 8, duration: 250, delay: eventStaggerDelay(item, idx) }}>
								<CalendarEventCard
									event={item.data}
									mode={useCompactEvents ? 'compact' : 'standard'}
									isPast={new Date(item.data.endDateTime) < new Date()}
									{showDayBadge}
								/>
							</div>
						{/if}
					{/each}
				</div>

				<!-- Show more button -->
				{#if hiddenCount > 0}
					<button
						type="button"
						class="show-more-btn"
						onclick={() => (showAll = true)}
					>
						Show {hiddenCount} more
					</button>
				{:else if showAll && timedItems.length > effectiveMaxVisible}
					<button
						type="button"
						class="show-more-btn"
						onclick={() => (showAll = false)}
					>
						Show less
					</button>
				{/if}
			{:else}
				<p class="empty-message">{emptyMessage}</p>
			{/if}
		</div>
	{/if}
</section>

<style>
	.timeline-group {
		display: flex;
		flex-direction: column;
	}

	.timeline-group.warning .section-header {
		color: #f59e0b;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0;
		background: transparent;
		border: none;
		cursor: default;
		width: 100%;
		text-align: left;
	}

	.section-header.collapsible {
		cursor: pointer;
	}

	.section-header.collapsible:hover {
		opacity: 0.8;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.warning-icon {
		width: 1rem;
		height: 1rem;
		color: #f59e0b;
	}

	.section-title {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	:global(.light) .section-title,
	:global([data-theme='light']) .section-title {
		color: rgba(0, 0, 0, 0.45);
	}

	.timeline-group.warning .section-title {
		color: #f59e0b;
	}

	.item-count {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 9999px;
		color: rgba(255, 255, 255, 0.5);
	}

	:global(.light) .item-count,
	:global([data-theme='light']) .item-count {
		background: rgba(0, 0, 0, 0.06);
		color: rgba(0, 0, 0, 0.5);
	}

	.timeline-group.warning .item-count {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.section-summary {
		font-size: 0.625rem;
		font-weight: 500;
		color: rgba(99, 102, 241, 0.6);
		padding-left: 0.25rem;
	}

	:global(.light) .section-summary,
	:global([data-theme='light']) .section-summary {
		color: rgba(79, 70, 229, 0.7);
	}

	.chevron {
		width: 1rem;
		height: 1rem;
		color: rgba(255, 255, 255, 0.4);
		transition: transform 0.2s ease;
	}

	:global(.light) .chevron,
	:global([data-theme='light']) .chevron {
		color: rgba(0, 0, 0, 0.35);
	}

	.chevron.rotated {
		transform: rotate(180deg);
	}

	.section-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-bottom: 1rem;
	}

	.item-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.item-list.compact-gap {
		gap: 0.25rem;
	}

	/* All-day events summary row */
	.all-day-summary {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		padding: 0.375rem 0.75rem;
		border-radius: 0.375rem;
		background: rgba(99, 102, 241, 0.04);
		border-left: 2px solid rgba(99, 102, 241, 0.2);
	}

	:global(.light) .all-day-summary,
	:global([data-theme='light']) .all-day-summary {
		background: rgba(99, 102, 241, 0.05);
		border-left-color: rgba(99, 102, 241, 0.25);
	}

	.all-day-label {
		font-size: 0.6875rem;
		font-weight: 600;
		color: rgba(99, 102, 241, 0.6);
		white-space: nowrap;
		flex-shrink: 0;
	}

	:global(.light) .all-day-label,
	:global([data-theme='light']) .all-day-label {
		color: rgba(79, 70, 229, 0.7);
	}

	.all-day-items {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.light) .all-day-items,
	:global([data-theme='light']) .all-day-items {
		color: rgba(0, 0, 0, 0.5);
	}

	/* NOW divider */
	.now-line {
		flex: 1;
		height: 1px;
		background: rgba(239, 68, 68, 0.4);
	}

	.now-label {
		font-size: 0.5625rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		color: rgba(239, 68, 68, 0.7);
		text-transform: uppercase;
	}

	/* Past items toggle */
	.past-toggle,
	.now-divider-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0;
		width: 100%;
		background: none;
		border: none;
		cursor: pointer;
	}

	.past-toggle:hover .now-line,
	.now-divider-btn:hover .now-line {
		background: rgba(239, 68, 68, 0.6);
	}

	.past-toggle:hover .past-toggle-label {
		color: rgba(255, 255, 255, 0.5);
	}

	:global(.light) .past-toggle:hover .past-toggle-label,
	:global([data-theme='light']) .past-toggle:hover .past-toggle-label {
		color: rgba(0, 0, 0, 0.5);
	}

	.now-divider-btn:hover .now-label {
		color: rgba(239, 68, 68, 0.9);
	}

	.past-toggle-label {
		font-size: 0.5625rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.3);
		white-space: nowrap;
		transition: color 0.15s ease;
	}

	:global(.light) .past-toggle-label,
	:global([data-theme='light']) .past-toggle-label {
		color: rgba(0, 0, 0, 0.3);
	}

	.empty-message {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.4);
		padding: 1rem;
		text-align: center;
		margin: 0;
	}

	:global(.light) .empty-message,
	:global([data-theme='light']) .empty-message {
		color: rgba(0, 0, 0, 0.4);
	}

	.show-more-btn {
		width: 100%;
		padding: 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.5);
		background: rgba(255, 255, 255, 0.03);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
		margin-top: 0.25rem;
	}

	:global(.light) .show-more-btn,
	:global([data-theme='light']) .show-more-btn {
		color: rgba(0, 0, 0, 0.5);
		background: rgba(0, 0, 0, 0.02);
		border-color: rgba(0, 0, 0, 0.1);
	}

	.show-more-btn:hover {
		color: rgba(255, 255, 255, 0.8);
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.2);
	}

	:global(.light) .show-more-btn:hover,
	:global([data-theme='light']) .show-more-btn:hover {
		color: rgba(0, 0, 0, 0.8);
		background: rgba(0, 0, 0, 0.04);
		border-color: rgba(0, 0, 0, 0.2);
	}
</style>
