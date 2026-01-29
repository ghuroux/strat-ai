/**
 * Hero Intelligence — Pure analysis functions for the HeroCard
 *
 * Evaluates a 9-level priority cascade combining:
 * - Calendar awareness (meeting-soon, meeting-ended, capacity crunch)
 * - Task urgency (overdue, stale, today's workload)
 * - Temporal context (Monday morning, all-clear celebration)
 *
 * All functions are pure — no stores, no DOM, no side effects.
 * The component provides the reactive wrapper (timer, $derived).
 */

import type { GlobalTask } from '$lib/types/tasks';
import type {
	CalendarEventSummary,
	DayAnalysis,
	WeekAnalysis,
	CapacityCrunch,
	HeroState,
	HeroContext,
	HeroAction
} from '$lib/types/calendar';

// ============================================================================
// Constants
// ============================================================================

/** Standard 8-hour workday in minutes */
const WORKDAY_MINUTES = 480;

/** Meeting-soon threshold: 15 minutes */
const MEETING_SOON_THRESHOLD = 15;

/** Meeting-ended threshold: 30 minutes */
const MEETING_ENDED_THRESHOLD = 30;

/** Capacity crunch: meeting load above 60% of workday */
const CRUNCH_LOAD_THRESHOLD = 0.6;

/** Hard deadline "soon" threshold: 2 days */
const HARD_DEADLINE_SOON_DAYS = 2;

/** Day labels */
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Evaluate the hero state by running a priority cascade P1→P9.
 * First matching condition wins. Calendar-aware priorities (P1, P2, P4, P5)
 * only activate when calendarLoaded is true.
 */
export function evaluateHeroState(context: HeroContext): HeroState {
	const { calendarLoaded } = context;

	// P1: Meeting starting soon (calendar required)
	if (calendarLoaded) {
		const p1 = evaluateP1(context);
		if (p1) return p1;
	}

	// P2: Capacity crunch (calendar required)
	if (calendarLoaded) {
		const p2 = evaluateP2(context);
		if (p2) return p2;
	}

	// P3: Overdue tasks (task-only, always available)
	const p3 = evaluateP3(context);
	if (p3) return p3;

	// P4: Meeting recently ended (calendar required)
	if (calendarLoaded) {
		const p4 = evaluateP4(context);
		if (p4) return p4;
	}

	// P5: Monday morning overview
	const p5 = evaluateP5(context);
	if (p5) return p5;

	// P6: High priority task due today
	const p6 = evaluateP6(context);
	if (p6) return p6;

	// P7: Stale tasks
	const p7 = evaluateP7(context);
	if (p7) return p7;

	// P8: All today tasks completed
	const p8 = evaluateP8(context);
	if (p8) return p8;

	// P9: Default fallback
	return evaluateP9(context);
}

// ============================================================================
// Priority Evaluators
// ============================================================================

/**
 * P1: Meeting starting in ≤15 minutes.
 * Most urgent — user needs to context-switch NOW.
 */
function evaluateP1(ctx: HeroContext): HeroState | null {
	const event = findUpcomingMeeting(ctx.events, ctx.now, MEETING_SOON_THRESHOLD);
	if (!event) return null;

	const minutesUntil = Math.ceil(
		(new Date(event.startDateTime).getTime() - ctx.now.getTime()) / (1000 * 60)
	);

	const timeLabel = minutesUntil <= 1 ? 'starts in 1 minute' : `starts in ${minutesUntil} minutes`;

	const actions: HeroAction[] = [];
	if (event.onlineMeetingUrl) {
		actions.push({ label: 'Join →', type: 'join', url: event.onlineMeetingUrl });
	}

	// Suggest the most important task to finish before the meeting
	const suggested = suggestTask(ctx.tasks);
	if (suggested) {
		actions.push({ label: 'Focus on this →', type: 'focus', task: suggested });
	}

	return {
		priority: 'P1',
		message: `${event.subject} ${timeLabel}`,
		subMessage: event.location || (event.attendeeCount > 1 ? `${event.attendeeCount} attendees` : undefined),
		variant: 'urgent',
		featuredEvent: event,
		actions
	};
}

/**
 * P2: Capacity crunch — heavy meeting day + hard deadline approaching.
 * Alerts the user to protect focus time.
 */
function evaluateP2(ctx: HeroContext): HeroState | null {
	const crunch = detectCapacityCrunch(ctx.events, ctx.tasks, ctx.now);
	if (!crunch) return null;

	const meetingHours = Math.round(crunch.todayAnalysis.meetingMinutes / 60 * 10) / 10;
	const criticalTask = crunch.criticalTasks[0];

	let subMsg = `${meetingHours}h of meetings today`;
	if (crunch.bestWindow) {
		subMsg += ` · Best window: ${crunch.bestWindow.dayLabel} (${crunch.bestWindow.freeHours}h free)`;
	}

	const actions: HeroAction[] = [];
	if (criticalTask) {
		actions.push({ label: 'Focus on this now →', type: 'focus', task: criticalTask });
	}

	return {
		priority: 'P2',
		message: `Tight day ahead — ${criticalTask ? `"${truncate(criticalTask.title, 40)}" has a hard deadline` : 'hard deadlines approaching'}`,
		subMessage: subMsg,
		variant: 'warning',
		featuredTask: criticalTask || undefined,
		actions
	};
}

/**
 * P3: Overdue tasks — hard deadlines that have passed.
 */
function evaluateP3(ctx: HeroContext): HeroState | null {
	if (ctx.overdueCount === 0) return null;

	const overdueTasks = ctx.tasks.filter(t =>
		t.dueDate && t.dueDateType === 'hard' && new Date(t.dueDate) < ctx.now
	).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

	const firstOverdue = overdueTasks[0];

	return {
		priority: 'P3',
		message: ctx.overdueCount === 1
			? `1 task overdue`
			: `${ctx.overdueCount} tasks overdue`,
		subMessage: firstOverdue ? `"${truncate(firstOverdue.title, 50)}" — hard deadline passed` : undefined,
		variant: 'warning',
		featuredTask: firstOverdue || undefined,
		actions: [
			{ label: 'Triage →', type: 'triage', target: 'needsAttention' }
		]
	};
}

/**
 * P4: Meeting ended ≤30 min ago — prompt to capture decisions.
 */
function evaluateP4(ctx: HeroContext): HeroState | null {
	const event = findRecentlyEndedMeeting(ctx.events, ctx.now, MEETING_ENDED_THRESHOLD);
	if (!event) return null;

	return {
		priority: 'P4',
		message: `Your ${truncate(event.subject, 40)} just ended`,
		subMessage: event.attendeeCount > 1 ? `${event.attendeeCount} attendees` : undefined,
		variant: 'info',
		featuredEvent: event,
		actions: [
			{ label: 'Capture decisions →', type: 'capture' }
		]
	};
}

/**
 * P5: Monday morning overview — week preview with meeting load analysis.
 * Adapts gracefully whether calendar is connected or not.
 */
function evaluateP5(ctx: HeroContext): HeroState | null {
	const day = ctx.now.getDay();
	const hour = ctx.now.getHours();

	// Only Monday morning (before noon)
	if (day !== 1 || hour >= 12) return null;

	const taskCount = ctx.tasks.length;

	if (ctx.calendarLoaded && ctx.events.length > 0) {
		const week = analyzeWeek(ctx.events, ctx.now);
		const busiestNote = week.busiestDay
			? ` Busiest: ${week.busiestDay.dayLabel} (${Math.round(week.busiestDay.meetingMinutes / 60)}h)`
			: '';

		return {
			priority: 'P5',
			message: `Start of a new week — ${taskCount} task${taskCount !== 1 ? 's' : ''}, ${week.totalMeetings} meeting${week.totalMeetings !== 1 ? 's' : ''} ahead`,
			subMessage: `${week.totalMeetingHours}h total meetings this week.${busiestNote}`,
			variant: 'info',
			actions: [
				{ label: 'Plan your week →', type: 'plan', target: 'today' }
			]
		};
	}

	// No calendar — task-only Monday overview
	const spaceCount = new Set(ctx.tasks.map(t => t.spaceId)).size;
	return {
		priority: 'P5',
		message: `Start of a new week — ${taskCount} task${taskCount !== 1 ? 's' : ''} ahead${spaceCount > 1 ? ` across ${spaceCount} spaces` : ''}`,
		variant: 'info',
		actions: [
			{ label: 'Plan your week →', type: 'plan', target: 'today' }
		]
	};
}

/**
 * P6: High priority task due today.
 */
function evaluateP6(ctx: HeroContext): HeroState | null {
	const todayStart = startOfDay(ctx.now);
	const todayEnd = new Date(todayStart);
	todayEnd.setDate(todayEnd.getDate() + 1);

	const highPriorityToday = ctx.tasks.filter(t =>
		t.priority === 'high' &&
		t.dueDate &&
		new Date(t.dueDate) >= todayStart &&
		new Date(t.dueDate) < todayEnd
	);

	if (highPriorityToday.length === 0) return null;

	const task = highPriorityToday[0];

	return {
		priority: 'P6',
		message: `High priority: ${truncate(task.title, 50)} due today`,
		variant: 'default',
		featuredTask: task,
		actions: [
			{ label: 'Focus →', type: 'focus', task }
		]
	};
}

/**
 * P7: Stale tasks (7+ days without activity).
 */
function evaluateP7(ctx: HeroContext): HeroState | null {
	if (ctx.staleTasks.length === 0) return null;

	return {
		priority: 'P7',
		message: ctx.staleTasks.length === 1
			? '1 task hasn\'t moved in 7+ days'
			: `${ctx.staleTasks.length} tasks haven't moved in 7+ days`,
		variant: 'info',
		featuredTask: ctx.staleTasks[0],
		actions: [
			{ label: 'Clean up →', type: 'scroll', target: 'needsAttention' }
		]
	};
}

/**
 * P8: All today tasks completed — celebration!
 */
function evaluateP8(ctx: HeroContext): HeroState | null {
	// Need at least 1 completed today to celebrate
	if (ctx.completedToday === 0) return null;

	// Check that there are no remaining today tasks
	if (ctx.todayTasks.length > 0) return null;

	// Count remaining meetings
	const todayStart = startOfDay(ctx.now);
	const todayEnd = new Date(todayStart);
	todayEnd.setDate(todayEnd.getDate() + 1);

	const remainingMeetings = ctx.calendarLoaded
		? ctx.events.filter(e =>
			!e.isAllDay &&
			!e.isCancelled &&
			new Date(e.endDateTime) > ctx.now &&
			new Date(e.startDateTime) < todayEnd
		).length
		: 0;

	const meetingNote = remainingMeetings > 0
		? ` ${remainingMeetings} meeting${remainingMeetings !== 1 ? 's' : ''} later today.`
		: '';

	return {
		priority: 'P8',
		message: `All caught up!${meetingNote}`,
		subMessage: `${ctx.completedToday} task${ctx.completedToday !== 1 ? 's' : ''} completed today`,
		variant: 'success',
		actions: []
	};
}

/**
 * P9: Default fallback — greeting with task summary.
 */
function evaluateP9(ctx: HeroContext): HeroState {
	const taskCount = ctx.tasks.length;

	// Count today's meetings if calendar available
	let meetingNote = '';
	if (ctx.calendarLoaded) {
		const todayStart = startOfDay(ctx.now);
		const todayEnd = new Date(todayStart);
		todayEnd.setDate(todayEnd.getDate() + 1);

		const todayMeetings = ctx.events.filter(e =>
			!e.isAllDay &&
			!e.isCancelled &&
			new Date(e.startDateTime) >= todayStart &&
			new Date(e.startDateTime) < todayEnd
		).length;

		if (todayMeetings > 0) {
			meetingNote = `, ${todayMeetings} meeting${todayMeetings !== 1 ? 's' : ''} today`;
		}
	}

	const suggested = suggestTask(ctx.tasks);
	const actions: HeroAction[] = [];
	if (suggested) {
		actions.push({ label: 'Focus on this →', type: 'focus', task: suggested });
	}

	return {
		priority: 'P9',
		message: `${ctx.greeting} — ${taskCount} task${taskCount !== 1 ? 's' : ''} active${meetingNote}`,
		variant: 'default',
		featuredTask: suggested || undefined,
		actions
	};
}

// ============================================================================
// Day & Week Analysis
// ============================================================================

/**
 * Analyze a single day's meeting load.
 * Computes meeting count, total minutes, free time, and load percentage.
 */
export function analyzeDay(events: CalendarEventSummary[], date: Date): DayAnalysis {
	const dayStart = startOfDay(date);
	const dayEnd = new Date(dayStart);
	dayEnd.setDate(dayEnd.getDate() + 1);

	const dayEvents = events.filter(e => {
		if (e.isAllDay || e.isCancelled) return false;
		const eventStart = new Date(e.startDateTime);
		return eventStart >= dayStart && eventStart < dayEnd;
	});

	let meetingMinutes = 0;
	for (const event of dayEvents) {
		const start = new Date(event.startDateTime).getTime();
		const end = new Date(event.endDateTime).getTime();
		meetingMinutes += (end - start) / (1000 * 60);
	}

	// Cap at workday — overlapping meetings shouldn't exceed 100%
	meetingMinutes = Math.min(meetingMinutes, WORKDAY_MINUTES);

	return {
		date: dayStart,
		dayLabel: DAY_LABELS[dayStart.getDay()],
		meetingCount: dayEvents.length,
		meetingMinutes: Math.round(meetingMinutes),
		freeMinutes: Math.round(WORKDAY_MINUTES - meetingMinutes),
		meetingLoadPercent: meetingMinutes / WORKDAY_MINUTES
	};
}

/**
 * Analyze the next 5 work days (Mon-Fri) for meeting load distribution.
 */
export function analyzeWeek(events: CalendarEventSummary[], now: Date): WeekAnalysis {
	const days: DayAnalysis[] = [];
	const today = startOfDay(now);

	// Look at next 7 calendar days, keep only work days (Mon-Fri), up to 5
	for (let i = 0; i < 7 && days.length < 5; i++) {
		const date = new Date(today);
		date.setDate(date.getDate() + i);
		const dow = date.getDay();
		if (dow === 0 || dow === 6) continue; // Skip weekends
		days.push(analyzeDay(events, date));
	}

	const totalMeetings = days.reduce((sum, d) => sum + d.meetingCount, 0);
	const totalMeetingMinutes = days.reduce((sum, d) => sum + d.meetingMinutes, 0);
	const totalMeetingHours = Math.round(totalMeetingMinutes / 60 * 10) / 10;

	// Busiest day
	const busiestDay = days.length > 0
		? days.reduce((max, d) => d.meetingMinutes > max.meetingMinutes ? d : max, days[0])
		: null;

	// Best window: day with most free time, excluding today
	const futureDays = days.filter(d => d.date.getTime() > today.getTime());
	const bestWindow = futureDays.length > 0
		? futureDays.reduce((max, d) => d.freeMinutes > max.freeMinutes ? d : max, futureDays[0])
		: null;

	return {
		totalMeetings,
		totalMeetingHours,
		busiestDay: busiestDay && busiestDay.meetingCount > 0 ? busiestDay : null,
		bestWindow: bestWindow && bestWindow.freeMinutes > 0 ? bestWindow : null,
		days
	};
}

// ============================================================================
// Capacity Crunch Detection
// ============================================================================

/**
 * Detect a capacity crunch: heavy meeting day + hard deadline approaching.
 *
 * Algorithm:
 * 1. analyzeDay(today) → get meetingLoadPercent
 * 2. Find tasks with dueDateType === 'hard' AND due within 2 days
 * 3. If meetingLoadPercent > 60% AND criticalTasks.length > 0 → crunch
 * 4. Find best window in next 5 work days for rescheduling advice
 */
export function detectCapacityCrunch(
	events: CalendarEventSummary[],
	tasks: GlobalTask[],
	now: Date
): CapacityCrunch | null {
	const todayAnalysis = analyzeDay(events, now);

	// Not a heavy meeting day? No crunch.
	if (todayAnalysis.meetingLoadPercent <= CRUNCH_LOAD_THRESHOLD) return null;

	// Find tasks with hard deadlines within 2 days
	const deadline = new Date(now);
	deadline.setDate(deadline.getDate() + HARD_DEADLINE_SOON_DAYS);

	const criticalTasks = tasks.filter(t =>
		t.dueDate &&
		t.dueDateType === 'hard' &&
		new Date(t.dueDate) <= deadline &&
		new Date(t.dueDate) >= startOfDay(now)
	).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

	if (criticalTasks.length === 0) return null;

	// Find best window in upcoming days
	const week = analyzeWeek(events, now);
	const bestWindow = week.bestWindow
		? { dayLabel: week.bestWindow.dayLabel, freeHours: Math.round(week.bestWindow.freeMinutes / 60 * 10) / 10 }
		: null;

	return { todayAnalysis, criticalTasks, bestWindow };
}

// ============================================================================
// Meeting Detection
// ============================================================================

/**
 * Find the next meeting starting within `thresholdMinutes`.
 * Excludes cancelled and all-day events.
 */
export function findUpcomingMeeting(
	events: CalendarEventSummary[],
	now: Date,
	thresholdMinutes: number
): CalendarEventSummary | null {
	const thresholdMs = thresholdMinutes * 60 * 1000;
	const nowMs = now.getTime();

	let soonest: CalendarEventSummary | null = null;
	let soonestDelta = Infinity;

	for (const event of events) {
		if (event.isAllDay || event.isCancelled) continue;
		const startMs = new Date(event.startDateTime).getTime();
		const delta = startMs - nowMs;

		// Must be in the future but within threshold
		if (delta > 0 && delta <= thresholdMs && delta < soonestDelta) {
			soonest = event;
			soonestDelta = delta;
		}
	}

	return soonest;
}

/**
 * Find the most recently ended meeting (within `thresholdMinutes`).
 * Excludes cancelled and all-day events.
 */
export function findRecentlyEndedMeeting(
	events: CalendarEventSummary[],
	now: Date,
	thresholdMinutes: number
): CalendarEventSummary | null {
	const thresholdMs = thresholdMinutes * 60 * 1000;
	const nowMs = now.getTime();

	let mostRecent: CalendarEventSummary | null = null;
	let mostRecentDelta = Infinity;

	for (const event of events) {
		if (event.isAllDay || event.isCancelled) continue;
		const endMs = new Date(event.endDateTime).getTime();
		const delta = nowMs - endMs;

		// Must have ended (delta > 0) but within threshold
		if (delta > 0 && delta <= thresholdMs && delta < mostRecentDelta) {
			mostRecent = event;
			mostRecentDelta = delta;
		}
	}

	return mostRecent;
}

// ============================================================================
// Task Suggestion (extracted from FocusSuggestion.svelte logic)
// ============================================================================

/**
 * Suggest the most important task to focus on.
 *
 * Priority: 1. Overdue hard deadlines (oldest first)
 *           2. High priority due today
 *           3. Any due today (earliest first)
 *           4. High priority anytime
 *           5. Most recently active
 */
export function suggestTask(tasks: GlobalTask[]): GlobalTask | null {
	if (tasks.length === 0) return null;

	const now = new Date();
	const today = startOfDay(now);

	const isDueByToday = (t: GlobalTask) => {
		if (!t.dueDate) return false;
		return startOfDay(new Date(t.dueDate)) <= today;
	};

	const isOverdue = (t: GlobalTask) => {
		if (!t.dueDate || t.dueDateType !== 'hard') return false;
		return new Date(t.dueDate) < now;
	};

	// 1. Overdue hard deadlines (oldest first)
	const overdueHard = tasks
		.filter(isOverdue)
		.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
	if (overdueHard.length > 0) return overdueHard[0];

	// 2. High priority due today
	const highPriorityToday = tasks.filter(t => t.priority === 'high' && isDueByToday(t));
	if (highPriorityToday.length > 0) return highPriorityToday[0];

	// 3. Any due today (earliest first)
	const dueToday = tasks
		.filter(isDueByToday)
		.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
	if (dueToday.length > 0) return dueToday[0];

	// 4. High priority without date
	const highPriorityAnytime = tasks.filter(t => t.priority === 'high' && !t.dueDate);
	if (highPriorityAnytime.length > 0) return highPriorityAnytime[0];

	// 5. Most recently active
	const byActivity = [...tasks].sort(
		(a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
	);
	return byActivity[0] || null;
}

// ============================================================================
// Helpers
// ============================================================================

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function truncate(str: string, maxLen: number): string {
	if (str.length <= maxLen) return str;
	return str.slice(0, maxLen - 1) + '…';
}
