<!--
	GlobalTaskDashboard.svelte

	Cross-space task aggregation dashboard with calendar interleaving.
	Groups tasks + calendar events into: Needs Attention, Today, This Week, Later, Anytime
	with space/area badges, filter bar, and view toggle.

	Phase 2: Calendar events interleaved with tasks.
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { fade, fly } from 'svelte/transition';
	import type { Task, GlobalTask, GlobalTaskFilter, CreateTaskInput } from '$lib/types/tasks';
	import type { Space } from '$lib/types/spaces';
	import type { DashboardView, DashboardDensity } from '$lib/types/calendar';
	import { taskStore } from '$lib/stores/tasks.svelte';
	import { calendarStore } from '$lib/stores/calendar.svelte';
	import { areaStore } from '$lib/stores/areas.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { buildTimeline, formatSectionSummary } from '$lib/utils/timeline-builder';
	import type { TaskGroups } from '$lib/utils/timeline-builder';
	import TimelineSection from './TimelineSection.svelte';
	import CompleteTaskModal from './CompleteTaskModal.svelte';
	import StatsRow from './StatsRow.svelte';
	import HeroCard from './HeroCard.svelte';
	import RecentlyCompletedSection from './RecentlyCompletedSection.svelte';
	import DashboardFilters from './DashboardFilters.svelte';
	import TaskPanel from '$lib/components/spaces/TaskPanel.svelte';
	import UserMenu from '$lib/components/layout/UserMenu.svelte';

	interface Props {
		spaces: Space[];
		user?: {
			displayName: string | null;
			role: 'owner' | 'admin' | 'member';
		} | null;
	}

	let { spaces, user }: Props = $props();

	// =====================================================
	// Filter State (from URL params)
	// =====================================================

	let activeSpaceSlug = $derived.by(() => {
		return $page.url.searchParams.get('space') || null;
	});

	let activeStatus = $derived.by(() => {
		return $page.url.searchParams.get('status') || null;
	});

	// Dashboard view: all | tasks | calendar (from URL params)
	let activeView = $derived.by((): DashboardView => {
		const v = $page.url.searchParams.get('view');
		return (v === 'tasks' || v === 'calendar') ? v : 'all';
	});

	// Resolve active space from slug
	let activeSpace = $derived.by(() => {
		if (!activeSpaceSlug) return null;
		return spaces.find((s) => s.slug === activeSpaceSlug) ?? null;
	});

	// Default color when no space is filtered
	const defaultColor = '#3b82f6';
	let displayColor = $derived(activeSpace?.color || defaultColor);

	// =====================================================
	// Density Preference (localStorage-persisted)
	// =====================================================

	const DASHBOARD_PREFS_KEY = 'strathost-dashboard-prefs';
	let density = $state<DashboardDensity>('standard');

	function loadDashboardPrefs() {
		try {
			const stored = localStorage.getItem(DASHBOARD_PREFS_KEY);
			if (stored) {
				const prefs = JSON.parse(stored);
				if (prefs.density === 'compact' || prefs.density === 'standard') {
					density = prefs.density;
				}
			}
		} catch {
			// Ignore parse errors
		}
	}

	function saveDashboardPrefs() {
		try {
			localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify({ density }));
		} catch {
			// Ignore quota errors
		}
	}

	function handleDensityChange(d: DashboardDensity) {
		density = d;
		saveDashboardPrefs();
	}

	// =====================================================
	// Data Loading (parallel: tasks + calendar)
	// =====================================================

	let hasLoaded = $state(false);

	// Build filter from URL params
	function buildFilter(): GlobalTaskFilter {
		const filter: GlobalTaskFilter = {
			includeCompleted: true
		};
		if (activeSpace) {
			filter.spaceId = activeSpace.id;
		}
		if (activeStatus && activeStatus !== 'all') {
			filter.status = activeStatus as any;
		}
		return filter;
	}

	// Get date range for calendar fetch (today - 1 day to today + 14 days)
	function getCalendarRange(): { start: string; end: string } {
		const now = new Date();
		const start = new Date(now);
		start.setDate(start.getDate() - 1);
		start.setHours(0, 0, 0, 0);

		const end = new Date(now);
		end.setDate(end.getDate() + 14);
		end.setHours(23, 59, 59, 999);

		return {
			start: start.toISOString(),
			end: end.toISOString()
		};
	}

	// Load tasks and calendar in parallel on mount
	onMount(async () => {
		// Hydrate density preference from localStorage
		loadDashboardPrefs();

		const { start, end } = getCalendarRange();

		// Tasks and calendar load in parallel — tasks appear first
		await Promise.allSettled([
			taskStore.loadGlobalTasks(buildFilter()),
			calendarStore.loadEvents(start, end)
		]);

		hasLoaded = true;
	});

	// Tab focus: refresh calendar if stale
	function handleVisibilityChange() {
		if (document.visibilityState === 'visible') {
			calendarStore.refreshIfStale();
		}
	}

	onMount(() => {
		document.addEventListener('visibilitychange', handleVisibilityChange);
	});

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		}
		if (reloadTimeout) clearTimeout(reloadTimeout);
	});

	// Reload when filters change (debounced to prevent rapid reloads)
	let reloadTimeout: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		// Track dependencies
		const _slug = activeSpaceSlug;
		const _status = activeStatus;

		if (hasLoaded) {
			if (reloadTimeout) clearTimeout(reloadTimeout);
			reloadTimeout = setTimeout(() => {
				taskStore.reloadGlobalTasks(buildFilter());
			}, 100);
		}
	});

	// =====================================================
	// Task Grouping (mirrors TaskDashboard logic)
	// =====================================================

	function startOfDay(date: Date): Date {
		return new Date(date.getFullYear(), date.getMonth(), date.getDate());
	}

	function addDays(date: Date, days: number): Date {
		const result = new Date(date);
		result.setDate(result.getDate() + days);
		return result;
	}

	function isOverdue(task: Task): boolean {
		if (!task.dueDate || task.dueDateType !== 'hard') return false;
		return new Date(task.dueDate) < new Date();
	}

	function isStale(task: Task): boolean {
		return taskStore.isStale(task);
	}

	// All active parent tasks from global store
	let allTasks = $derived.by(() => {
		return taskStore.globalTaskList.filter(
			(t) => !t.parentTaskId && t.status === 'active'
		) as GlobalTask[];
	});

	// Completed tasks from global store
	let completedTasks = $derived.by(() => {
		return taskStore.globalTaskList.filter(
			(t) => t.status === 'completed'
		) as GlobalTask[];
	});

	// Group tasks by time
	let taskGroups = $derived.by(() => {
		const now = new Date();
		const today = startOfDay(now);
		const weekEnd = addDays(today, 7);

		const groups = {
			needsAttention: [] as GlobalTask[],
			today: [] as GlobalTask[],
			thisWeek: [] as GlobalTask[],
			later: [] as GlobalTask[],
			anytime: [] as GlobalTask[]
		};

		for (const task of allTasks) {
			const taskOverdue = isOverdue(task);
			const taskStale = isStale(task);

			if (taskOverdue || taskStale) {
				groups.needsAttention.push(task);
				continue;
			}

			if (!task.dueDate) {
				groups.anytime.push(task);
			} else {
				const dueDay = startOfDay(new Date(task.dueDate));
				if (dueDay <= today) {
					groups.today.push(task);
				} else if (dueDay <= weekEnd) {
					groups.thisWeek.push(task);
				} else {
					groups.later.push(task);
				}
			}
		}

		// Sort each group
		const sortTasks = (a: Task, b: Task) => {
			if (a.priority !== b.priority) {
				return a.priority === 'high' ? -1 : 1;
			}
			const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
			const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
			return aDue - bDue;
		};

		groups.needsAttention.sort(sortTasks);
		groups.today.sort(sortTasks);
		groups.thisWeek.sort(sortTasks);
		groups.later.sort(sortTasks);
		groups.anytime.sort(sortTasks);

		return groups;
	});

	// =====================================================
	// Timeline Building (interleave tasks + calendar events)
	// =====================================================

	let timelineGroups = $derived.by(() => {
		return buildTimeline(taskGroups, calendarStore.events, activeView);
	});

	// NOW divider computation is now internal to TimelineSection
	// (it filters out all-day events and computes the index from timed items only)

	// Stats
	let totalTasks = $derived(allTasks.length);
	let needsAttentionCount = $derived(taskGroups.needsAttention.length);
	let overdueCount = $derived(allTasks.filter((t) => isOverdue(t)).length);
	let todayDueCount = $derived(taskGroups.today.length);
	let completedToday = $derived(taskStore.getGlobalCompletedToday());
	let streak = $derived(taskStore.calculateGlobalStreak());

	// HeroCard inputs
	let staleTasks = $derived(allTasks.filter(t => taskStore.isStale(t)));
	let todayTasks = $derived(taskGroups.today);

	// Badge visibility: show space badge when NOT filtered to a single space
	let showSpaceBadge = $derived(!activeSpaceSlug);

	// =====================================================
	// Actions
	// =====================================================

	// Complete task modal state
	let showCompleteModal = $state(false);
	let taskToComplete = $state<Task | null>(null);
	let incompleteSubtasks = $state<Task[]>([]);

	// Task panel state
	let showTaskPanel = $state(false);
	let taskToEdit = $state<Task | null>(null);

	// Delete confirmation state
	let showDeleteConfirm = $state(false);
	let taskToDelete = $state<Task | null>(null);
	let isDeleting = $state(false);

	// Scroll to a timeline section (from HeroCard actions)
	function handleScrollToSection(sectionKey: string) {
		const el = document.querySelector(`[data-section="${sectionKey}"]`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	// Navigate to task in its space
	function handleTaskClick(task: Task) {
		const globalTask = task as GlobalTask;
		goto(`/spaces/${globalTask.spaceSlug}/task/${task.id}`);
	}

	// Handle task completion
	async function handleCompleteTask(task: Task) {
		const subtasks = taskStore.getSubtasksForTask(task.id);
		const incomplete = subtasks.filter((s) => s.status !== 'completed');

		if (incomplete.length > 0) {
			taskToComplete = task;
			incompleteSubtasks = incomplete;
			showCompleteModal = true;
		} else {
			await completeTaskWithUndo(task);
		}
	}

	async function completeTaskWithUndo(task: Task) {
		try {
			await taskStore.completeTask(task.id);
			toastStore.success(`"${task.title}" completed`, 5000);
			// Refresh global tasks after completion
			await taskStore.reloadGlobalTasks(buildFilter());
		} catch (error) {
			console.error('Failed to complete task:', error);
			toastStore.error('Failed to complete task');
		}
	}

	async function handleCompleteAll() {
		if (!taskToComplete) return;
		try {
			for (const subtask of incompleteSubtasks) {
				await taskStore.completeTask(subtask.id);
			}
			await taskStore.completeTask(taskToComplete.id);
			toastStore.success(`"${taskToComplete.title}" and subtasks completed`);
			await taskStore.reloadGlobalTasks(buildFilter());
		} catch (error) {
			console.error('Failed to complete tasks:', error);
			toastStore.error('Failed to complete tasks');
		} finally {
			closeModal();
		}
	}

	async function handleCompleteTaskOnly() {
		if (!taskToComplete) return;
		try {
			await taskStore.completeTask(taskToComplete.id);
			toastStore.success(`"${taskToComplete.title}" completed`);
			await taskStore.reloadGlobalTasks(buildFilter());
		} catch (error) {
			console.error('Failed to complete task:', error);
			toastStore.error('Failed to complete task');
		} finally {
			closeModal();
		}
	}

	function closeModal() {
		showCompleteModal = false;
		taskToComplete = null;
		incompleteSubtasks = [];
	}

	// Handle dismiss stale
	async function handleDismissStale(task: Task) {
		try {
			await taskStore.dismissStale(task.id);
			toastStore.success('Stale warning dismissed');
		} catch (error) {
			console.error('Failed to dismiss stale:', error);
			toastStore.error('Failed to dismiss');
		}
	}

	// Handle edit task
	function handleEditTask(task: Task) {
		taskToEdit = task;
		showTaskPanel = true;
	}

	// Handle delete task
	function handleDeleteTask(task: Task) {
		taskToDelete = task;
		showDeleteConfirm = true;
	}

	async function confirmDelete() {
		if (!taskToDelete || isDeleting) return;
		isDeleting = true;
		try {
			await taskStore.deleteTask(taskToDelete.id);
			toastStore.success(`"${taskToDelete.title}" deleted`);
			await taskStore.reloadGlobalTasks(buildFilter());
			closeDeleteConfirm();
		} catch (error) {
			console.error('Failed to delete task:', error);
			toastStore.error('Failed to delete task');
		} finally {
			isDeleting = false;
		}
	}

	function closeDeleteConfirm() {
		showDeleteConfirm = false;
		taskToDelete = null;
	}

	// Handle reopen completed task
	async function handleReopenTask(task: Task) {
		try {
			await taskStore.reopenTask(task.id);
			toastStore.success(`"${task.title}" reopened`);
			await taskStore.reloadGlobalTasks(buildFilter());
		} catch (error) {
			console.error('Failed to reopen task:', error);
			toastStore.error('Failed to reopen task');
		}
	}

	// Open task panel for creating new task
	function handleOpenTaskPanel() {
		taskToEdit = null;
		showTaskPanel = true;
	}

	function closeTaskPanel() {
		showTaskPanel = false;
		taskToEdit = null;
	}

	async function handleCreateTask(input: CreateTaskInput): Promise<Task | null> {
		try {
			const created = await taskStore.createTask(input);
			if (created) {
				toastStore.success(`Task "${input.title}" created`);
				await taskStore.reloadGlobalTasks(buildFilter());
			}
			return created;
		} catch (error) {
			console.error('Failed to create task:', error);
			toastStore.error('Failed to create task');
			return null;
		}
	}

	// Filter handlers — update URL search params
	function handleSpaceChange(slug: string | null) {
		const params = new URLSearchParams($page.url.searchParams);
		if (slug) {
			params.set('space', slug);
		} else {
			params.delete('space');
		}
		goto(`/tasks?${params}`, { replaceState: true });
	}

	function handleStatusChange(status: string | null) {
		const params = new URLSearchParams($page.url.searchParams);
		if (status) {
			params.set('status', status);
		} else {
			params.delete('status');
		}
		goto(`/tasks?${params}`, { replaceState: true });
	}

	function handleViewChange(view: DashboardView) {
		const params = new URLSearchParams($page.url.searchParams);
		if (view && view !== 'all') {
			params.set('view', view);
		} else {
			params.delete('view');
		}
		goto(`/tasks?${params}`, { replaceState: true });
	}

	// Resolve space/areas for TaskPanel (use first space or filtered space)
	let taskPanelSpaceId = $derived(activeSpace?.id || spaces[0]?.id || '');
	let taskPanelAreas = $derived.by(() => {
		const spaceId = taskPanelSpaceId;
		if (!spaceId) return [];
		return areaStore.getAreasForSpace(spaceId);
	});

	// =====================================================
	// Keyboard Navigation
	// =====================================================

	let focusedItemIndex = $state(-1);
	let keyboardActive = $state(false);

	function getNavigableItems(): NodeListOf<Element> {
		return document.querySelectorAll('[data-timeline-item]');
	}

	function updateFocusRing() {
		// Remove existing focus ring
		document.querySelectorAll('.keyboard-focused').forEach(el => el.classList.remove('keyboard-focused'));
		if (focusedItemIndex < 0 || !keyboardActive) return;

		const items = getNavigableItems();
		const target = items[focusedItemIndex];
		if (target) {
			target.classList.add('keyboard-focused');
			target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	}

	// Sync focus ring when state changes
	$effect(() => {
		// Track dependencies
		const _idx = focusedItemIndex;
		const _active = keyboardActive;
		updateFocusRing();
	});

	function isInputFocused(): boolean {
		const active = document.activeElement;
		if (!active) return false;
		const tag = active.tagName.toLowerCase();
		return tag === 'input' || tag === 'textarea' || tag === 'select' || (active as HTMLElement).isContentEditable;
	}

	function handleKeydown(e: KeyboardEvent) {
		// Don't capture when typing in inputs or when modals are open
		if (isInputFocused()) return;
		if (showCompleteModal || showDeleteConfirm || showTaskPanel) return;

		const items = getNavigableItems();
		const itemCount = items.length;

		switch (e.key.toLowerCase()) {
			case 'j': {
				e.preventDefault();
				keyboardActive = true;
				focusedItemIndex = Math.min(focusedItemIndex + 1, itemCount - 1);
				break;
			}
			case 'k': {
				e.preventDefault();
				keyboardActive = true;
				focusedItemIndex = Math.max(focusedItemIndex - 1, 0);
				break;
			}
			case 'enter': {
				if (!keyboardActive || focusedItemIndex < 0) return;
				e.preventDefault();
				const target = items[focusedItemIndex];
				if (!target) return;
				const itemType = target.getAttribute('data-item-type');
				const itemId = target.getAttribute('data-item-id');
				if (itemType === 'task' && itemId) {
					const task = allTasks.find(t => t.id === itemId);
					if (task) handleTaskClick(task);
				} else if (itemType === 'event' && itemId) {
					const event = calendarStore.events.find(ev => ev.id === itemId);
					if (event?.webLink) window.open(event.webLink, '_blank');
				}
				break;
			}
			case 'x': {
				if (!keyboardActive || focusedItemIndex < 0) return;
				e.preventDefault();
				const target = items[focusedItemIndex];
				if (!target) return;
				const itemType = target.getAttribute('data-item-type');
				const itemId = target.getAttribute('data-item-id');
				if (itemType === 'task' && itemId) {
					const task = allTasks.find(t => t.id === itemId);
					if (task) handleCompleteTask(task);
				}
				break;
			}
			case 'n': {
				e.preventDefault();
				handleOpenTaskPanel();
				break;
			}
			case '/': {
				e.preventDefault();
				const select = document.querySelector('.space-select') as HTMLSelectElement | null;
				if (select) select.focus();
				break;
			}
			case 'escape': {
				if (keyboardActive) {
					e.preventDefault();
					keyboardActive = false;
					focusedItemIndex = -1;
				}
				break;
			}
		}
	}

	function handleMouseMove() {
		if (keyboardActive) {
			keyboardActive = false;
			focusedItemIndex = -1;
			// Clean up focus ring immediately
			document.querySelectorAll('.keyboard-focused').forEach(el => el.classList.remove('keyboard-focused'));
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="global-dashboard" style="--space-color: {displayColor}" onmousemove={handleMouseMove}>
	<!-- Header -->
	<header class="dashboard-header">
		<div class="header-center">
			<button
				type="button"
				class="back-btn"
				onclick={() => history.back()}
				title="Go back"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<h1 class="dashboard-title">Tasks</h1>
			<span class="task-total">{totalTasks}</span>
			{#if needsAttentionCount > 0}
				<span class="attention-badge">{needsAttentionCount} needs attention</span>
			{/if}
		</div>

		<div class="header-right">
			<button type="button" class="add-task-btn" onclick={handleOpenTaskPanel}>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
				</svg>
				<span>Add Task</span>
			</button>
			{#if user}
				<UserMenu displayName={user.displayName} role={user.role} />
			{/if}
		</div>
	</header>

	<!-- Scrollable content -->
	<div class="dashboard-scroll">
		<div class="dashboard-content">
			<!-- Hero Card (smart focus suggestion with calendar awareness) -->
			<HeroCard
				tasks={allTasks}
				events={calendarStore.events}
				calendarConnected={calendarStore.connected}
				calendarLoaded={calendarStore.loadState === 'loaded'}
				{overdueCount}
				{staleTasks}
				{todayTasks}
				{completedToday}
				spaceColor={displayColor}
				onTaskClick={handleTaskClick}
				onScrollToSection={handleScrollToSection}
			/>

			<!-- Stats Row -->
			<StatsRow
				{completedToday}
				{streak}
				activeCount={totalTasks}
				{needsAttentionCount}
				spaceColor={displayColor}
			/>

			<!-- Filters -->
			<DashboardFilters
				{spaces}
				{activeSpaceSlug}
				{activeStatus}
				onSpaceChange={handleSpaceChange}
				onStatusChange={handleStatusChange}
				{activeView}
				calendarConnected={calendarStore.connected}
				onViewChange={handleViewChange}
				{density}
				onDensityChange={handleDensityChange}
			/>

			<!-- Calendar status banners -->
			{#if calendarStore.isLoading}
				<div class="calendar-banner loading" transition:fade={{ duration: 200 }}>
					<div class="calendar-spinner"></div>
					<span>Checking your calendar...</span>
				</div>
			{:else if calendarStore.loadState === 'error' && calendarStore.error}
				<div class="calendar-banner error" transition:fade={{ duration: 200 }}>
					<span>Couldn't reach your calendar — showing tasks only</span>
					<button type="button" class="calendar-retry-btn" onclick={() => calendarStore.reload()}>
						Retry
					</button>
				</div>
			{:else if calendarStore.loadState === 'not-connected'}
				<div class="calendar-banner info" transition:fade={{ duration: 200 }}>
					<span>Connect your calendar to see meetings alongside tasks</span>
					<a href="/settings" class="calendar-connect-link">Connect Calendar</a>
				</div>
			{:else if calendarStore.connected && calendarStore.events.length === 0 && calendarStore.loadState === 'loaded'}
				<div class="calendar-banner clear" transition:fade={{ duration: 200 }}>
					<span>No meetings today — clear day for deep work!</span>
				</div>
			{/if}

			<!-- Loading state -->
			{#if taskStore.isGlobalLoading && !hasLoaded}
				<div class="loading-state">
					<div class="loading-spinner"></div>
					<p>Loading tasks...</p>
				</div>
			{:else}
				<!-- Timeline sections (interleaved tasks + calendar events) -->
				{#each timelineGroups as group (group.key)}
					{@const isNeedsAttention = group.key === 'needsAttention'}
					{@const isToday = group.key === 'today'}
					{@const isCollapsible = group.key === 'later' || group.key === 'anytime'}
					{@const shouldDefaultCollapse = isCollapsible && group.items.length > 5}

					{#if isNeedsAttention}
						<!-- Needs Attention only shows when there are items -->
						{#if group.items.length > 0}
							<TimelineSection
								title={group.title}
								items={group.items}
								spaceColor={displayColor}
								variant="warning"
								isGlobal={true}
								{showSpaceBadge}
								sectionKey={group.key}
								sectionSummary={formatSectionSummary(group)}
								compact={density === 'compact'}
								onTaskClick={handleTaskClick}
								onCompleteTask={handleCompleteTask}
								onDismissStale={handleDismissStale}
								onEditTask={handleEditTask}
								onDeleteTask={handleDeleteTask}
							/>
						{/if}
					{:else if isToday}
						<TimelineSection
							title={group.title}
							items={group.items}
							spaceColor={displayColor}
							emptyMessage={activeView === 'calendar' ? 'No meetings today' : 'Nothing due today'}
							maxVisible={0}
							isGlobal={true}
							{showSpaceBadge}
							sectionKey={group.key}
							sectionSummary={formatSectionSummary(group)}
							showNowDivider={true}
							compact={density === 'compact'}
							onTaskClick={handleTaskClick}
							onCompleteTask={handleCompleteTask}
							onEditTask={handleEditTask}
							onDeleteTask={handleDeleteTask}
						/>
					{:else}
						<TimelineSection
							title={group.title}
							items={group.items}
							spaceColor={displayColor}
							emptyMessage={group.key === 'thisWeek' ? 'Nothing this week' : undefined}
							collapsible={isCollapsible}
							defaultCollapsed={shouldDefaultCollapse}
							isGlobal={true}
							{showSpaceBadge}
							sectionKey={group.key}
							sectionSummary={formatSectionSummary(group)}
							showDayBadge={group.key === 'thisWeek' || group.key === 'later'}
							compact={density === 'compact'}
							onTaskClick={handleTaskClick}
							onCompleteTask={handleCompleteTask}
							onEditTask={handleEditTask}
							onDeleteTask={handleDeleteTask}
						/>
					{/if}
				{/each}

				<!-- Empty state -->
				{#if totalTasks === 0 && !taskStore.isGlobalLoading}
					<div class="empty-state">
						<div class="empty-icon">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<p class="empty-title">All clear!</p>
						<p class="empty-text">No active tasks across your spaces.</p>
					</div>
				{/if}

				<!-- Recently Completed -->
				<RecentlyCompletedSection
					{completedTasks}
					spaceColor={displayColor}
					onReopen={handleReopenTask}
					onTaskClick={handleTaskClick}
				/>
			{/if}
		</div>
	</div>
</div>

<!-- Complete Task Modal -->
{#if showCompleteModal && taskToComplete}
	<CompleteTaskModal
		task={taskToComplete}
		{incompleteSubtasks}
		onCompleteAll={handleCompleteAll}
		onCompleteTaskOnly={handleCompleteTaskOnly}
		onCancel={closeModal}
	/>
{/if}

<!-- Task Panel (Create/Edit) — uses first space or filtered space -->
{#if taskPanelSpaceId}
	<TaskPanel
		isOpen={showTaskPanel}
		spaceId={taskPanelSpaceId}
		areas={taskPanelAreas}
		spaceColor={displayColor}
		task={taskToEdit}
		onClose={closeTaskPanel}
		onCreate={handleCreateTask}
		{spaces}
		showSpaceSelector={true}
	/>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm && taskToDelete}
	<div class="modal-backdrop" transition:fade={{ duration: 150 }}>
		<div class="confirm-modal" transition:fly={{ y: 20, duration: 200 }}>
			<div class="confirm-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
			</div>
			<h3 class="confirm-title">Delete Task?</h3>
			<p class="confirm-message">
				Are you sure you want to delete "{taskToDelete.title}"? This action cannot be undone.
			</p>
			<div class="confirm-actions">
				<button
					type="button"
					class="btn-cancel"
					onclick={closeDeleteConfirm}
					disabled={isDeleting}
				>
					Cancel
				</button>
				<button
					type="button"
					class="btn-delete"
					onclick={confirmDelete}
					disabled={isDeleting}
				>
					{isDeleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.global-dashboard {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg-primary, #0a0a0a);
	}

	/* Header */
	.dashboard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(255, 255, 255, 0.02);
	}

	.header-center {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		padding: 0;
		color: rgba(255, 255, 255, 0.5);
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.back-btn:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.08);
	}

	.back-btn svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	.dashboard-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin: 0;
	}

	.task-total {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 9999px;
		color: rgba(255, 255, 255, 0.6);
	}

	.attention-badge {
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 0.25rem 0.5rem;
		background: rgba(245, 158, 11, 0.15);
		border-radius: 9999px;
		color: #f59e0b;
	}

	.header-right {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
		min-width: 100px;
	}

	.add-task-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--space-color, #3b82f6);
		background: color-mix(in srgb, var(--space-color, #3b82f6) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--space-color, #3b82f6) 20%, transparent);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.add-task-btn:hover {
		background: color-mix(in srgb, var(--space-color, #3b82f6) 20%, transparent);
		border-color: color-mix(in srgb, var(--space-color, #3b82f6) 40%, transparent);
	}

	.add-task-btn svg {
		width: 0.75rem;
		height: 0.75rem;
	}

	/* Scrollable area */
	.dashboard-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
	}

	.dashboard-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 800px;
		margin: 0 auto;
		width: 100%;
	}

	/* Loading state */
	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		gap: 1rem;
	}

	.loading-spinner {
		width: 2rem;
		height: 2rem;
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-top-color: var(--space-color, #3b82f6);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-state p {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin: 0;
	}

	/* Calendar status banners */
	.calendar-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		border-radius: 0.375rem;
	}

	.calendar-banner.loading {
		color: rgba(99, 102, 241, 0.7);
		background: rgba(99, 102, 241, 0.06);
	}

	.calendar-banner.error {
		color: rgba(239, 68, 68, 0.8);
		background: rgba(239, 68, 68, 0.06);
	}

	.calendar-banner.info {
		color: rgba(99, 102, 241, 0.7);
		background: rgba(99, 102, 241, 0.06);
	}

	.calendar-banner.clear {
		color: rgba(34, 197, 94, 0.7);
		background: rgba(34, 197, 94, 0.06);
	}

	.calendar-spinner {
		width: 0.875rem;
		height: 0.875rem;
		border: 1.5px solid rgba(99, 102, 241, 0.2);
		border-top-color: rgba(99, 102, 241, 0.7);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		flex-shrink: 0;
	}

	.calendar-retry-btn {
		margin-left: auto;
		padding: 0.125rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 500;
		color: rgba(239, 68, 68, 0.8);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 0.25rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.calendar-retry-btn:hover {
		background: rgba(239, 68, 68, 0.15);
		border-color: rgba(239, 68, 68, 0.3);
	}

	.calendar-connect-link {
		margin-left: auto;
		font-size: 0.6875rem;
		font-weight: 500;
		color: rgba(99, 102, 241, 0.8);
		text-decoration: none;
	}

	.calendar-connect-link:hover {
		color: rgba(99, 102, 241, 1);
		text-decoration: underline;
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
	}

	.empty-icon {
		width: 3rem;
		height: 3rem;
		color: rgba(34, 197, 94, 0.4);
		margin-bottom: 1rem;
	}

	.empty-icon svg {
		width: 100%;
		height: 100%;
	}

	.empty-title {
		font-size: 1rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.8);
		margin: 0 0 0.5rem 0;
	}

	.empty-text {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.4);
		margin: 0;
	}

	/* Delete confirmation modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.confirm-modal {
		background: #1a1a1a;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		padding: 1.5rem;
		max-width: 400px;
		width: 100%;
		text-align: center;
	}

	.confirm-icon {
		width: 3rem;
		height: 3rem;
		margin: 0 auto 1rem;
		color: #ef4444;
	}

	.confirm-icon svg {
		width: 100%;
		height: 100%;
	}

	.confirm-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.9);
		margin: 0 0 0.5rem 0;
	}

	.confirm-message {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0 0 1.5rem 0;
		line-height: 1.5;
	}

	.confirm-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}

	.btn-cancel,
	.btn-delete {
		padding: 0.625rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-cancel {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
	}

	.btn-cancel:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.9);
	}

	.btn-delete {
		background: #ef4444;
		border: none;
		color: white;
	}

	.btn-delete:hover:not(:disabled) {
		background: #dc2626;
	}

	.btn-cancel:disabled,
	.btn-delete:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Keyboard navigation focus ring */
	:global([data-timeline-item].keyboard-focused) {
		outline: 2px solid var(--space-color, #3b82f6);
		outline-offset: -1px;
		border-radius: 0.5rem;
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--space-color, #3b82f6) 10%, transparent);
	}
</style>
