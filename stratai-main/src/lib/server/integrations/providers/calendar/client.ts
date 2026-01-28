/**
 * Microsoft Graph Calendar Client
 *
 * HTTP client for Microsoft Graph Calendar API operations.
 * Handles all calendar-specific API calls.
 *
 * See: https://docs.microsoft.com/en-us/graph/api/resources/calendar
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Microsoft Graph calendar event
 */
export interface CalendarEvent {
	id: string;
	subject: string;
	bodyPreview: string;
	body?: {
		contentType: string;
		content: string;
	};
	start: {
		dateTime: string;
		timeZone: string;
	};
	end: {
		dateTime: string;
		timeZone: string;
	};
	location?: {
		displayName: string;
		address?: {
			street?: string;
			city?: string;
			state?: string;
			countryOrRegion?: string;
			postalCode?: string;
		};
	};
	attendees?: Array<{
		emailAddress: {
			name?: string;
			address: string;
		};
		type: 'required' | 'optional' | 'resource';
		status?: {
			response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
			time?: string;
		};
	}>;
	organizer?: {
		emailAddress: {
			name?: string;
			address: string;
		};
	};
	isOnlineMeeting?: boolean;
	onlineMeetingUrl?: string;
	onlineMeeting?: {
		joinUrl: string;
	};
	webLink?: string;
	createdDateTime?: string;
	lastModifiedDateTime?: string;
	isCancelled?: boolean;
	isAllDay?: boolean;
	showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
	importance?: 'low' | 'normal' | 'high';
	sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
	recurrence?: {
		pattern: {
			type: string;
			interval: number;
			daysOfWeek?: string[];
		};
		range: {
			type: string;
			startDate: string;
			endDate?: string;
		};
	};
}

/**
 * Free/busy time slot
 */
export interface FreeBusySlot {
	status: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
	start: {
		dateTime: string;
		timeZone: string;
	};
	end: {
		dateTime: string;
		timeZone: string;
	};
}

/**
 * Calendar info
 */
export interface Calendar {
	id: string;
	name: string;
	color?: string;
	isDefaultCalendar?: boolean;
	canEdit?: boolean;
	owner?: {
		name?: string;
		address: string;
	};
}

/**
 * Input for creating an event
 */
export interface CreateEventInput {
	subject: string;
	body?: string;
	start: string; // ISO datetime
	end: string; // ISO datetime
	timeZone?: string;
	attendees?: string[]; // Email addresses
	location?: string;
	isOnlineMeeting?: boolean;
}

// ============================================================================
// Client Class
// ============================================================================

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

/**
 * Microsoft Graph Calendar API client
 */
export class CalendarClient {
	private accessToken: string;

	constructor(accessToken: string) {
		this.accessToken = accessToken;
	}

	/**
	 * Make an authenticated request to Microsoft Graph
	 */
	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_BASE_URL}${endpoint}`;

		const headers = new Headers(options.headers);
		headers.set('Authorization', `Bearer ${this.accessToken}`);
		headers.set('Content-Type', 'application/json');

		const response = await fetch(url, {
			...options,
			headers
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const errorMessage = errorData.error?.message || `Request failed: ${response.status}`;
			throw new Error(errorMessage);
		}

		// Handle 204 No Content
		if (response.status === 204) {
			return {} as T;
		}

		return response.json();
	}

	// ==========================================================================
	// Calendar Operations
	// ==========================================================================

	/**
	 * Get list of user's calendars
	 */
	async listCalendars(): Promise<Calendar[]> {
		const result = await this.request<{ value: Calendar[] }>('/me/calendars');
		return result.value;
	}

	/**
	 * Get the default calendar
	 */
	async getDefaultCalendar(): Promise<Calendar> {
		return this.request<Calendar>('/me/calendar');
	}

	// ==========================================================================
	// Event Operations
	// ==========================================================================

	/**
	 * List events in a time range
	 */
	async listEvents(
		startDateTime: string,
		endDateTime: string,
		options: {
			calendarId?: string;
			maxResults?: number;
			orderBy?: 'start/dateTime' | 'end/dateTime';
		} = {}
	): Promise<CalendarEvent[]> {
		const { calendarId, maxResults = 50, orderBy = 'start/dateTime' } = options;

		const params = new URLSearchParams({
			startdatetime: startDateTime,
			enddatetime: endDateTime,
			$top: String(maxResults),
			$orderby: orderBy,
			$select: 'id,subject,bodyPreview,start,end,location,attendees,organizer,isOnlineMeeting,onlineMeetingUrl,onlineMeeting,webLink,isCancelled,isAllDay,showAs,importance'
		});

		const endpoint = calendarId
			? `/me/calendars/${calendarId}/calendarview?${params}`
			: `/me/calendarview?${params}`;

		const result = await this.request<{ value: CalendarEvent[] }>(endpoint);
		return result.value;
	}

	/**
	 * Get a specific event by ID
	 */
	async getEvent(eventId: string, calendarId?: string): Promise<CalendarEvent> {
		const endpoint = calendarId
			? `/me/calendars/${calendarId}/events/${eventId}`
			: `/me/events/${eventId}`;

		return this.request<CalendarEvent>(endpoint);
	}

	/**
	 * Create a new calendar event
	 */
	async createEvent(input: CreateEventInput, calendarId?: string): Promise<CalendarEvent> {
		const endpoint = calendarId
			? `/me/calendars/${calendarId}/events`
			: '/me/events';

		const body: Record<string, unknown> = {
			subject: input.subject,
			start: {
				dateTime: input.start,
				timeZone: input.timeZone || 'UTC'
			},
			end: {
				dateTime: input.end,
				timeZone: input.timeZone || 'UTC'
			}
		};

		if (input.body) {
			body.body = {
				contentType: 'HTML',
				content: input.body
			};
		}

		if (input.location) {
			body.location = {
				displayName: input.location
			};
		}

		if (input.attendees && input.attendees.length > 0) {
			body.attendees = input.attendees.map(email => ({
				emailAddress: { address: email },
				type: 'required'
			}));
		}

		if (input.isOnlineMeeting) {
			body.isOnlineMeeting = true;
			body.onlineMeetingProvider = 'teamsForBusiness';
		}

		return this.request<CalendarEvent>(endpoint, {
			method: 'POST',
			body: JSON.stringify(body)
		});
	}

	/**
	 * Update an existing event
	 */
	async updateEvent(
		eventId: string,
		updates: Partial<CreateEventInput>,
		calendarId?: string
	): Promise<CalendarEvent> {
		const endpoint = calendarId
			? `/me/calendars/${calendarId}/events/${eventId}`
			: `/me/events/${eventId}`;

		const body: Record<string, unknown> = {};

		if (updates.subject) body.subject = updates.subject;
		if (updates.body) {
			body.body = {
				contentType: 'HTML',
				content: updates.body
			};
		}
		if (updates.start) {
			body.start = {
				dateTime: updates.start,
				timeZone: updates.timeZone || 'UTC'
			};
		}
		if (updates.end) {
			body.end = {
				dateTime: updates.end,
				timeZone: updates.timeZone || 'UTC'
			};
		}
		if (updates.location) {
			body.location = { displayName: updates.location };
		}
		if (updates.isOnlineMeeting !== undefined) {
			body.isOnlineMeeting = updates.isOnlineMeeting;
			if (updates.isOnlineMeeting) {
				body.onlineMeetingProvider = 'teamsForBusiness';
			}
		}

		return this.request<CalendarEvent>(endpoint, {
			method: 'PATCH',
			body: JSON.stringify(body)
		});
	}

	/**
	 * Delete an event
	 */
	async deleteEvent(eventId: string, calendarId?: string): Promise<void> {
		const endpoint = calendarId
			? `/me/calendars/${calendarId}/events/${eventId}`
			: `/me/events/${eventId}`;

		await this.request<void>(endpoint, {
			method: 'DELETE'
		});
	}

	// ==========================================================================
	// Free/Busy Operations
	// ==========================================================================

	/**
	 * Get free/busy schedule for users
	 */
	async getFreeBusy(
		schedules: string[], // Email addresses
		startTime: string,
		endTime: string,
		timeZone: string = 'UTC'
	): Promise<Map<string, FreeBusySlot[]>> {
		const body = {
			schedules,
			startTime: {
				dateTime: startTime,
				timeZone
			},
			endTime: {
				dateTime: endTime,
				timeZone
			},
			availabilityViewInterval: 30 // 30-minute slots
		};

		const result = await this.request<{
			value: Array<{
				scheduleId: string;
				availabilityView: string;
				scheduleItems: FreeBusySlot[];
			}>;
		}>('/me/calendar/getSchedule', {
			method: 'POST',
			body: JSON.stringify(body)
		});

		const freeBusyMap = new Map<string, FreeBusySlot[]>();
		for (const schedule of result.value) {
			freeBusyMap.set(schedule.scheduleId, schedule.scheduleItems);
		}

		return freeBusyMap;
	}

	/**
	 * Find available meeting times
	 */
	async findMeetingTimes(
		attendees: string[],
		durationMinutes: number,
		startTime: string,
		endTime: string,
		timeZone: string = 'UTC'
	): Promise<Array<{ start: string; end: string }>> {
		const body = {
			attendees: attendees.map(email => ({
				emailAddress: { address: email },
				type: 'required'
			})),
			timeConstraint: {
				timeslots: [{
					start: {
						dateTime: startTime,
						timeZone
					},
					end: {
						dateTime: endTime,
						timeZone
					}
				}]
			},
			meetingDuration: `PT${durationMinutes}M`,
			returnSuggestionReasons: true,
			minimumAttendeePercentage: 100
		};

		const result = await this.request<{
			meetingTimeSuggestions: Array<{
				meetingTimeSlot: {
					start: { dateTime: string; timeZone: string };
					end: { dateTime: string; timeZone: string };
				};
			}>;
		}>('/me/findMeetingTimes', {
			method: 'POST',
			body: JSON.stringify(body)
		});

		return result.meetingTimeSuggestions.map(suggestion => ({
			start: suggestion.meetingTimeSlot.start.dateTime,
			end: suggestion.meetingTimeSlot.end.dateTime
		}));
	}
}
