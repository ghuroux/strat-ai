/**
 * Timeline Builder — Pure functions for interleaving tasks and calendar events
 *
 * Used by GlobalTaskDashboard to merge task groups with calendar events
 * into unified TimelineGroups with mixed TimelineItem[] arrays.
 *
 * All functions are pure (no side effects) for testability.
 */

import type { GlobalTask } from '$lib/types/tasks';
import type {
	CalendarEventSummary,
	TimelineItem,
	TimelineGroup,
	DashboardView
} from '$lib/types/calendar';

// ============================================================================
// Types for task grouping (mirrors GlobalTaskDashboard logic)
// ============================================================================

export interface TaskGroups {
	needsAttention: GlobalTask[];
	today: GlobalTask[];
	thisWeek: GlobalTask[];
	later: GlobalTask[];
	anytime: GlobalTask[];
}

// ============================================================================
// Main Builder
// ============================================================================

/**
 * Build a unified timeline from task groups and calendar events.
 *
 * 1. Buckets events into today/thisWeek/later by startDateTime
 * 2. Filters by view (all/tasks/calendar)
 * 3. Interleaves items within each section sorted by time
 * 4. Computes section summaries (meeting hours, free hours)
 */
export function buildTimeline(
	taskGroups: TaskGroups,
	events: CalendarEventSummary[],
	view: DashboardView
): TimelineGroup[] {
	// Bucket events by time period
	const now = new Date();
	const today = startOfDay(now);
	const weekEnd = addDays(today, 7);

	const eventBuckets = {
		today: [] as CalendarEventSummary[],
		thisWeek: [] as CalendarEventSummary[],
		later: [] as CalendarEventSummary[]
	};

	for (const event of events) {
		if (event.isCancelled) continue; // Skip cancelled events from bucketing

		const eventStart = startOfDay(new Date(event.startDateTime));
		if (eventStart <= today) {
			eventBuckets.today.push(event);
		} else if (eventStart <= weekEnd) {
			eventBuckets.thisWeek.push(event);
		} else {
			eventBuckets.later.push(event);
		}
	}

	const groups: TimelineGroup[] = [];

	// Needs Attention — tasks only (events never "need attention")
	if (view !== 'calendar' && taskGroups.needsAttention.length > 0) {
		groups.push(buildGroup(
			'needsAttention',
			'Needs Attention',
			taskGroups.needsAttention,
			[],
			view
		));
	}

	// Today — interleaved
	const todayGroup = buildGroup('today', 'Today', taskGroups.today, eventBuckets.today, view);
	if (todayGroup.items.length > 0 || view !== 'calendar') {
		groups.push(todayGroup);
	}

	// This Week — interleaved
	const weekGroup = buildGroup('thisWeek', 'This Week', taskGroups.thisWeek, eventBuckets.thisWeek, view);
	if (weekGroup.items.length > 0 || view !== 'calendar') {
		groups.push(weekGroup);
	}

	// Later — interleaved
	if (taskGroups.later.length > 0 || eventBuckets.later.length > 0) {
		const laterGroup = buildGroup('later', 'Later', taskGroups.later, eventBuckets.later, view);
		if (laterGroup.items.length > 0) {
			groups.push(laterGroup);
		}
	}

	// Anytime — tasks only (events always have times)
	if (view !== 'calendar' && taskGroups.anytime.length > 0) {
		groups.push(buildGroup('anytime', 'Anytime', taskGroups.anytime, [], view));
	}

	return groups;
}

// ============================================================================
// Group Builder
// ============================================================================

function buildGroup(
	key: string,
	title: string,
	tasks: GlobalTask[],
	events: CalendarEventSummary[],
	view: DashboardView
): TimelineGroup {
	const items: TimelineItem[] = [];

	// Add tasks (unless calendar-only view)
	if (view !== 'calendar') {
		for (const task of tasks) {
			items.push({ type: 'task', data: task });
		}
	}

	// Add events (unless tasks-only view)
	if (view !== 'tasks') {
		for (const event of events) {
			items.push({ type: 'event', data: event });
		}
	}

	// Sort: timed items first (ascending), then untimed items (by priority)
	items.sort(interleaveSort);

	// Compute meeting stats for this section
	const sectionEvents = items.filter((i): i is { type: 'event'; data: CalendarEventSummary } => i.type === 'event');
	const meetingHours = calculateMeetingHours(sectionEvents.map(e => e.data));
	const workdayHours = 8;
	const freeHours = Math.max(0, Math.round((workdayHours - meetingHours) * 10) / 10);

	return {
		key,
		title,
		items,
		taskCount: items.filter(i => i.type === 'task').length,
		eventCount: sectionEvents.length,
		meetingHours: meetingHours > 0 ? meetingHours : undefined,
		freeHours: meetingHours > 0 ? freeHours : undefined
	};
}

// ============================================================================
// Interleave Sorting
// ============================================================================

/**
 * Sort items for interleaved display:
 * 1. Timed items first (events + tasks with dueDate), sorted by time ascending
 * 2. Untimed tasks after, sorted by priority (high > normal)
 */
function interleaveSort(a: TimelineItem, b: TimelineItem): number {
	const aTime = getItemTime(a);
	const bTime = getItemTime(b);

	// Both have times — sort chronologically
	if (aTime !== null && bTime !== null) {
		return aTime - bTime;
	}

	// Timed items before untimed
	if (aTime !== null && bTime === null) return -1;
	if (aTime === null && bTime !== null) return 1;

	// Both untimed — sort by priority (high first)
	if (a.type === 'task' && b.type === 'task') {
		if (a.data.priority === 'high' && b.data.priority !== 'high') return -1;
		if (a.data.priority !== 'high' && b.data.priority === 'high') return 1;
	}

	return 0;
}

/**
 * Get a sortable timestamp from a timeline item.
 * Events always have a time. Tasks use dueDate if available.
 */
function getItemTime(item: TimelineItem): number | null {
	if (item.type === 'event') {
		return new Date(item.data.startDateTime).getTime();
	}
	// Tasks: use dueDate if available for time-based sorting
	if (item.data.dueDate) {
		return new Date(item.data.dueDate).getTime();
	}
	return null;
}

// ============================================================================
// NOW Divider
// ============================================================================

/**
 * Find the index where the NOW divider should be inserted.
 * Returns the index of the first item whose end time is in the future.
 * Returns -1 if all items are past or all are future.
 */
export function findNowDividerIndex(items: TimelineItem[]): number {
	const now = Date.now();
	let lastPastIndex = -1;

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const endTime = item.type === 'event'
			? new Date(item.data.endDateTime).getTime()
			: item.data.dueDate
				? new Date(item.data.dueDate).getTime()
				: null;

		if (endTime !== null && endTime <= now) {
			lastPastIndex = i;
		}
	}

	// If no past items found, or all items are past, no divider needed
	if (lastPastIndex === -1) return -1;
	if (lastPastIndex === items.length - 1) return -1;

	// Divider goes after the last past item
	return lastPastIndex + 1;
}

// ============================================================================
// Section Summary
// ============================================================================

/**
 * Format a human-readable summary for a timeline section header.
 * Returns undefined if there are no events to summarize.
 *
 * Examples:
 * - "3 meetings · 2.5h"
 * - "5 meetings · 4h · 4h free"
 */
export function formatSectionSummary(group: TimelineGroup): string | undefined {
	if (group.eventCount === 0) return undefined;

	const parts: string[] = [];
	const meetingLabel = group.eventCount === 1 ? '1 meeting' : `${group.eventCount} meetings`;
	parts.push(meetingLabel);

	if (group.meetingHours !== undefined && group.meetingHours > 0) {
		parts.push(`${group.meetingHours}h`);
	}

	if (group.freeHours !== undefined && group.freeHours > 0 && group.key === 'today') {
		parts.push(`${group.freeHours}h free`);
	}

	return parts.join(' \u00B7 '); // middle dot separator
}

// ============================================================================
// Helpers
// ============================================================================

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

function calculateMeetingHours(events: CalendarEventSummary[]): number {
	let totalMinutes = 0;
	for (const event of events) {
		if (event.isAllDay || event.isCancelled) continue;
		const start = new Date(event.startDateTime).getTime();
		const end = new Date(event.endDateTime).getTime();
		totalMinutes += (end - start) / (1000 * 60);
	}
	return Math.round((totalMinutes / 60) * 10) / 10;
}
