/**
 * Calendar Types for Global Tasks Dashboard — Phase 2: Calendar Interleaving
 *
 * Calendar events appear alongside tasks in a unified timeline.
 * Types support: API response, store state, timeline interleaving, and display modes.
 */

import type { GlobalTask } from './tasks';

// ============================================================================
// Calendar Event Summary (trimmed from full Microsoft Graph CalendarEvent)
// ============================================================================

/**
 * Lightweight calendar event for dashboard display.
 * Mapped from the full CalendarEvent (Microsoft Graph) to essential fields only.
 */
export interface CalendarEventSummary {
	id: string;
	subject: string;
	startDateTime: string; // ISO
	endDateTime: string; // ISO
	isAllDay: boolean;
	attendees: CalendarAttendee[];
	attendeeCount: number;
	onlineMeetingUrl?: string;
	webLink: string;
	organizer: string;
	showAs: string; // free, busy, tentative, oof
	isCancelled: boolean;
	location?: string;
}

/**
 * Attendee summary for event display
 */
export interface CalendarAttendee {
	name: string;
	email: string;
	type: 'required' | 'optional';
}

// ============================================================================
// API Response
// ============================================================================

/**
 * Response from GET /api/calendar/events
 * Always returns 200 with graceful degradation.
 */
export interface CalendarEventsResponse {
	events: CalendarEventSummary[];
	connected: boolean;
	fetchedAt: string;
	error?: string;
}

// ============================================================================
// Store State
// ============================================================================

/**
 * Calendar data loading states.
 * - idle: Initial state, no fetch attempted
 * - loading: Fetch in progress
 * - loaded: Data successfully fetched
 * - error: Fetch failed (events may be stale)
 * - not-connected: User hasn't connected calendar integration
 */
export type CalendarLoadState = 'idle' | 'loading' | 'loaded' | 'error' | 'not-connected';

// ============================================================================
// Timeline Interleaving
// ============================================================================

/**
 * Discriminated union for timeline items.
 * Enables type-safe rendering of mixed task + event lists.
 */
export type TimelineItem =
	| { type: 'task'; data: GlobalTask }
	| { type: 'event'; data: CalendarEventSummary };

/**
 * A group of interleaved timeline items for a time section.
 * Mirrors the existing task groups: needsAttention, today, thisWeek, later, anytime.
 */
export interface TimelineGroup {
	key: string; // 'needsAttention' | 'today' | 'thisWeek' | 'later' | 'anytime'
	title: string;
	items: TimelineItem[];
	taskCount: number;
	eventCount: number;
	meetingHours?: number;
	freeHours?: number;
	busiestDay?: string; // e.g., "Wed (6h)"
}

// ============================================================================
// Dashboard View & Display Modes
// ============================================================================

/**
 * Dashboard content filter: show all, tasks only, or calendar only.
 */
export type DashboardView = 'all' | 'tasks' | 'calendar';

/**
 * Event card display mode.
 * - standard: Full card with attendees (used when <=4 events in section)
 * - compact: Single-line card (used when 5+ events in section)
 */
export type EventDisplayMode = 'standard' | 'compact';

/**
 * Dashboard density preference.
 * - standard: Multi-line task cards with meta row, subtask accordion, action buttons
 * - compact: Single-line task cards with inline meta, tighter padding
 */
export type DashboardDensity = 'standard' | 'compact';

// ============================================================================
// Hero Intelligence Types (Phase 3: Hero Card Intelligence)
// ============================================================================

/**
 * Analysis of a single day's meeting load vs available work time.
 * Used by capacity crunch detection and week analysis.
 */
export interface DayAnalysis {
	date: Date;
	dayLabel: string; // 'Mon', 'Tue', etc.
	meetingCount: number;
	meetingMinutes: number;
	freeMinutes: number; // workday (480min) minus meetings
	meetingLoadPercent: number; // meetingMinutes / 480
}

/**
 * Analysis of the upcoming work week (next 5 work days).
 * Powers the Monday morning P5 hero state and capacity crunch detection.
 */
export interface WeekAnalysis {
	totalMeetings: number;
	totalMeetingHours: number;
	busiestDay: DayAnalysis | null;
	bestWindow: DayAnalysis | null; // day with most free time (excluding today)
	days: DayAnalysis[];
}

/**
 * Capacity crunch: today is meeting-heavy AND there's a hard deadline soon.
 * Triggers P2 hero state with actionable advice.
 */
export interface CapacityCrunch {
	todayAnalysis: DayAnalysis;
	criticalTasks: import('./tasks').GlobalTask[];
	bestWindow: {
		dayLabel: string;
		freeHours: number;
	} | null;
}

// ─── Hero State ──────────────────────────────────

/** Priority levels for the hero card, P1 (highest) through P9 (lowest). First match wins. */
export type HeroPriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9';

/** Visual variant controlling the hero card's border/icon styling */
export type HeroVariant = 'urgent' | 'warning' | 'info' | 'success' | 'default';

/**
 * The output of the hero intelligence engine.
 * Fully describes what the HeroCard should render.
 */
export interface HeroState {
	priority: HeroPriority;
	message: string;
	subMessage?: string;
	variant: HeroVariant;
	featuredTask?: import('./tasks').GlobalTask;
	featuredEvent?: CalendarEventSummary;
	actions: HeroAction[];
}

/**
 * An action button rendered in the hero card.
 * Each type maps to a specific interaction pattern.
 */
export interface HeroAction {
	label: string;
	type: 'focus' | 'join' | 'triage' | 'capture' | 'plan' | 'scroll';
	task?: import('./tasks').GlobalTask;
	url?: string;
	target?: string; // scroll target section key
}

/**
 * Everything the hero intelligence engine needs to evaluate state.
 * Passed as a single object to evaluateHeroState() for clean testability.
 */
export interface HeroContext {
	tasks: import('./tasks').GlobalTask[];
	events: CalendarEventSummary[];
	calendarConnected: boolean;
	calendarLoaded: boolean;
	now: Date;
	overdueCount: number;
	staleTasks: import('./tasks').GlobalTask[];
	todayTasks: import('./tasks').GlobalTask[];
	completedToday: number;
	greeting: string;
}
