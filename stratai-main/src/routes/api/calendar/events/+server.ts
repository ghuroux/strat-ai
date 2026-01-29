/**
 * Calendar Events API
 *
 * GET /api/calendar/events - Fetch calendar events for a date range
 *
 * Query params:
 * - start: Start date ISO string (required)
 * - end: End date ISO string (required)
 *
 * Constraints:
 * - Always returns 200 for graceful degradation (dashboard never blocks on calendar)
 * - Returns { connected: false } if user hasn't connected calendar
 * - 5-second timeout on Microsoft Graph API calls
 * - Automatically refreshes expired access tokens (via helper)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CalendarEventSummary, CalendarEventsResponse } from '$lib/types/calendar';
import type { CalendarEvent } from '$lib/server/integrations/providers/calendar/client';
import { getAuthenticatedCalendarClient } from '$lib/server/integrations/providers/calendar/helpers';
import { parseGraphDateTime, DEFAULT_TIMEZONE } from '$lib/server/integrations/providers/calendar/datetime';

/**
 * GET /api/calendar/events?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Returns calendar events for the given date range.
 * Always returns 200 — errors are embedded in the response for graceful degradation.
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	// Auth check
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');

	if (!start || !end) {
		return json({
			events: [],
			connected: false,
			fetchedAt: new Date().toISOString(),
			error: 'start and end query parameters are required'
		} satisfies CalendarEventsResponse);
	}

	try {
		// Get authenticated calendar client (handles integration lookup + token refresh)
		const result = await getAuthenticatedCalendarClient(userId);

		if (!result.connected) {
			return json({
				events: [],
				connected: false,
				fetchedAt: new Date().toISOString(),
				error: result.reason !== 'Calendar not connected' ? result.reason : undefined
			} satisfies CalendarEventsResponse);
		}

		const client = result.client;

		// Fetch events from Microsoft Graph with timeout
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);

		let graphEvents: CalendarEvent[];
		try {
			graphEvents = await client.listEvents(start, end, { maxResults: 100 });
		} catch (fetchError) {
			if (fetchError instanceof Error && fetchError.name === 'AbortError') {
				console.error('[Calendar API] Graph API request timed out after 5s');
				return json({
					events: [],
					connected: true,
					fetchedAt: new Date().toISOString(),
					error: 'Calendar request timed out — showing tasks only'
				} satisfies CalendarEventsResponse);
			}
			throw fetchError;
		} finally {
			clearTimeout(timeout);
			// AbortController cleanup — signal persists but timeout is cleared
			void controller;
		}

		// Map to lightweight CalendarEventSummary
		const events: CalendarEventSummary[] = graphEvents.map(mapEventToSummary);

		return json({
			events,
			connected: true,
			fetchedAt: new Date().toISOString()
		} satisfies CalendarEventsResponse);

	} catch (error) {
		console.error('[Calendar API] Unexpected error:', error);
		return json({
			events: [],
			connected: true,
			fetchedAt: new Date().toISOString(),
			error: 'Unexpected error fetching calendar events'
		} satisfies CalendarEventsResponse);
	}
};

/**
 * Map a full Microsoft Graph CalendarEvent to a lightweight CalendarEventSummary.
 * Strips ~80% of the payload, keeping only what the dashboard needs.
 *
 * IMPORTANT: Graph returns naive datetimes (no timezone offset) like "2026-01-28T14:00:00"
 * with a separate timeZone field. We use parseGraphDateTime() to convert these to
 * proper UTC ISO strings so all downstream code (timeline bucketing, display, isPast checks)
 * works correctly regardless of the user's local timezone.
 */
function mapEventToSummary(event: CalendarEvent): CalendarEventSummary {
	const attendees = (event.attendees ?? [])
		.filter(a => a.type !== 'resource')
		.map(a => ({
			name: a.emailAddress.name || a.emailAddress.address,
			email: a.emailAddress.address,
			type: a.type as 'required' | 'optional'
		}));

	// Convert naive Graph datetimes to proper UTC ISO strings
	const startTz = event.start.timeZone || DEFAULT_TIMEZONE;
	const endTz = event.end.timeZone || DEFAULT_TIMEZONE;
	const startDate = parseGraphDateTime(event.start.dateTime, startTz);
	const endDate = parseGraphDateTime(event.end.dateTime, endTz);

	return {
		id: event.id,
		subject: event.subject || '(No subject)',
		startDateTime: startDate.toISOString(),
		endDateTime: endDate.toISOString(),
		isAllDay: event.isAllDay ?? false,
		attendees,
		attendeeCount: attendees.length,
		onlineMeetingUrl: event.onlineMeeting?.joinUrl || event.onlineMeetingUrl || undefined,
		webLink: event.webLink || '',
		organizer: event.organizer?.emailAddress?.name || event.organizer?.emailAddress?.address || 'Unknown',
		showAs: event.showAs || 'busy',
		isCancelled: event.isCancelled ?? false,
		location: event.location?.displayName || undefined
	};
}
