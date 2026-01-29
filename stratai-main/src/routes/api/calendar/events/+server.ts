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
 * - Automatically refreshes expired access tokens
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CalendarEventSummary, CalendarEventsResponse } from '$lib/types/calendar';
import type { CalendarEvent } from '$lib/server/integrations/providers/calendar/client';
import { CalendarClient } from '$lib/server/integrations/providers/calendar/client';
import { refreshAccessToken, tokensToCredentials } from '$lib/server/integrations/providers/calendar/oauth';
import { parseGraphDateTime, DEFAULT_TIMEZONE } from '$lib/server/integrations/providers/calendar/datetime';
import { postgresIntegrationsRepository } from '$lib/server/persistence/integrations-postgres';
import { postgresIntegrationCredentialsRepository } from '$lib/server/persistence/integration-credentials-postgres';

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
		// Step 1: Check if user has a calendar integration
		const integration = await postgresIntegrationsRepository.findByUserAndService(userId, 'calendar');

		if (!integration || integration.status !== 'connected') {
			return json({
				events: [],
				connected: false,
				fetchedAt: new Date().toISOString()
			} satisfies CalendarEventsResponse);
		}

		// Step 2: Get credentials
		const credentials = await postgresIntegrationCredentialsRepository.getDecryptedCredentials(integration.id);
		let accessTokenCred = credentials.find(c => c.type === 'access_token');
		const refreshTokenCred = credentials.find(c => c.type === 'refresh_token');

		if (!accessTokenCred) {
			return json({
				events: [],
				connected: true,
				fetchedAt: new Date().toISOString(),
				error: 'No access token found — please reconnect your calendar'
			} satisfies CalendarEventsResponse);
		}

		// Step 3: Refresh token if expired
		if (accessTokenCred.expiresAt && new Date(accessTokenCred.expiresAt) < new Date()) {
			if (!refreshTokenCred) {
				return json({
					events: [],
					connected: true,
					fetchedAt: new Date().toISOString(),
					error: 'Access token expired and no refresh token — please reconnect your calendar'
				} satisfies CalendarEventsResponse);
			}

			try {
				const newTokens = await refreshAccessToken(refreshTokenCred.value);
				const newCredentials = tokensToCredentials(newTokens);

				// Upsert new credentials
				for (const cred of newCredentials) {
					await postgresIntegrationCredentialsRepository.upsert({
						integrationId: integration.id,
						credentialType: cred.type,
						value: cred.value,
						expiresAt: cred.expiresAt,
						scope: cred.scope
					});
				}

				// Use the new access token
				const refreshedCred = newCredentials.find(c => c.type === 'access_token');
				if (refreshedCred) {
					accessTokenCred = refreshedCred;
				}
			} catch (refreshError) {
				console.error('[Calendar API] Token refresh failed:', refreshError);
				return json({
					events: [],
					connected: true,
					fetchedAt: new Date().toISOString(),
					error: 'Failed to refresh calendar access — please reconnect'
				} satisfies CalendarEventsResponse);
			}
		}

		// Step 4: Fetch events from Microsoft Graph with timeout
		const client = new CalendarClient(accessTokenCred.value);
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

		// Step 5: Map to lightweight CalendarEventSummary
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
