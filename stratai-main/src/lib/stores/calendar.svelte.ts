/**
 * Calendar Store - Calendar event state for the Global Tasks Dashboard
 * Uses Svelte 5 runes for reactivity (matching tasks.svelte.ts pattern)
 *
 * Manages: event fetching, staleness tracking, tab-focus refresh, range caching.
 * Calendar events are cross-space (user-level), separate from task state.
 */

import type {
	CalendarEventSummary,
	CalendarEventsResponse,
	CalendarLoadState
} from '$lib/types/calendar';

/**
 * Staleness threshold: 5 minutes
 * After this, refreshIfStale() will re-fetch on tab focus
 */
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

class CalendarStore {
	// =====================================================
	// Reactive State
	// =====================================================

	events = $state<CalendarEventSummary[]>([]);
	loadState = $state<CalendarLoadState>('idle');
	connected = $state(false);
	fetchedAt = $state<string | null>(null);
	error = $state<string | null>(null);

	// Version counter for fine-grained reactivity
	_version = $state(0);

	// Range tracking to avoid redundant fetches
	private loadedStart: string | null = null;
	private loadedEnd: string | null = null;

	// =====================================================
	// Derived Values
	// =====================================================

	/**
	 * Whether the cached data is stale (older than 5 minutes)
	 */
	isStale = $derived.by(() => {
		if (!this.fetchedAt) return true;
		const elapsed = Date.now() - new Date(this.fetchedAt).getTime();
		return elapsed > STALE_THRESHOLD_MS;
	});

	/**
	 * Whether calendar is currently loading
	 */
	isLoading = $derived(this.loadState === 'loading');

	/**
	 * Event count (for badge display)
	 */
	eventCount = $derived(this.events.length);

	// =====================================================
	// Methods
	// =====================================================

	/**
	 * Load calendar events for a date range.
	 * Skips fetch if same range and not stale.
	 */
	async loadEvents(start: string, end: string): Promise<void> {
		// Skip if same range and not stale
		if (
			this.loadedStart === start &&
			this.loadedEnd === end &&
			!this.isStale &&
			this.loadState === 'loaded'
		) {
			return;
		}

		this.loadState = 'loading';
		this.error = null;

		try {
			const params = new URLSearchParams({ start, end });
			const response = await fetch(`/api/calendar/events?${params}`);

			if (!response.ok) {
				throw new Error(`Calendar API error: ${response.status}`);
			}

			const data: CalendarEventsResponse = await response.json();

			this.events = data.events;
			this.connected = data.connected;
			this.fetchedAt = data.fetchedAt;
			this.error = data.error || null;

			this.loadedStart = start;
			this.loadedEnd = end;

			this.loadState = data.connected ? 'loaded' : 'not-connected';
			this._version++;
		} catch (e) {
			console.error('[CalendarStore] Failed to load events:', e);
			this.error = e instanceof Error ? e.message : 'Failed to load calendar events';
			this.loadState = 'error';
			this._version++;
		}
	}

	/**
	 * Refresh events if stale. Called on tab focus (visibilitychange).
	 * Only re-fetches if we have a previously loaded range.
	 */
	async refreshIfStale(): Promise<void> {
		if (!this.isStale) return;
		if (!this.loadedStart || !this.loadedEnd) return;

		// Force re-fetch by clearing the loaded range
		const start = this.loadedStart;
		const end = this.loadedEnd;
		this.loadedStart = null;
		this.loadedEnd = null;

		await this.loadEvents(start, end);
	}

	/**
	 * Force re-fetch regardless of staleness.
	 */
	async reload(): Promise<void> {
		if (!this.loadedStart || !this.loadedEnd) return;

		const start = this.loadedStart;
		const end = this.loadedEnd;
		this.loadedStart = null;
		this.loadedEnd = null;

		await this.loadEvents(start, end);
	}

	/**
	 * Calculate total meeting hours from a list of events.
	 * Excludes all-day events (they don't have meaningful hour durations).
	 */
	calculateMeetingHours(eventList?: CalendarEventSummary[]): number {
		const events = eventList ?? this.events;
		let totalMinutes = 0;

		for (const event of events) {
			if (event.isAllDay || event.isCancelled) continue;
			const start = new Date(event.startDateTime).getTime();
			const end = new Date(event.endDateTime).getTime();
			totalMinutes += (end - start) / (1000 * 60);
		}

		return Math.round((totalMinutes / 60) * 10) / 10; // 1 decimal place
	}

	/**
	 * Reset all state (for logout or disconnect)
	 */
	clearAll(): void {
		this.events = [];
		this.loadState = 'idle';
		this.connected = false;
		this.fetchedAt = null;
		this.error = null;
		this.loadedStart = null;
		this.loadedEnd = null;
		this._version = 0;
	}
}

export const calendarStore = new CalendarStore();
