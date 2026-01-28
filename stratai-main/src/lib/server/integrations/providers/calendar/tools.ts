/**
 * Calendar AI Tool Definitions
 *
 * Defines the tools that the AI can use to interact with the user's calendar.
 * These are injected into the chat when the calendar integration is connected.
 *
 * See: docs/features/CALENDAR_INTEGRATION.md
 */

import type { IntegrationToolDefinition } from '$lib/types/integrations';

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * List events in a time range
 */
export const listEventsToolDefinition: IntegrationToolDefinition = {
	name: 'calendar_list_events',
	description: 'List calendar events within a specified time range. Use this to see what meetings are scheduled.',
	parameters: {
		type: 'object',
		properties: {
			startDateTime: {
				type: 'string',
				description: 'Start of the time range in ISO 8601 format (e.g., "2026-01-28T00:00:00Z"). Use today\'s date if not specified.'
			},
			endDateTime: {
				type: 'string',
				description: 'End of the time range in ISO 8601 format (e.g., "2026-01-28T23:59:59Z"). Defaults to end of start day if not specified.'
			},
			maxResults: {
				type: 'string',
				description: 'Maximum number of events to return (default: 10, max: 50)'
			}
		},
		required: ['startDateTime', 'endDateTime']
	}
};

/**
 * Get details of a specific event
 */
export const getEventToolDefinition: IntegrationToolDefinition = {
	name: 'calendar_get_event',
	description: 'Get detailed information about a specific calendar event by its ID.',
	parameters: {
		type: 'object',
		properties: {
			eventId: {
				type: 'string',
				description: 'The unique identifier of the calendar event'
			}
		},
		required: ['eventId']
	}
};

/**
 * Create a new calendar event
 */
export const createEventToolDefinition: IntegrationToolDefinition = {
	name: 'calendar_create_event',
	description: 'Create a new calendar event. Can include attendees and create a Teams meeting link.',
	parameters: {
		type: 'object',
		properties: {
			subject: {
				type: 'string',
				description: 'The title/subject of the meeting'
			},
			start: {
				type: 'string',
				description: 'Start time in ISO 8601 format (e.g., "2026-01-28T14:00:00")'
			},
			end: {
				type: 'string',
				description: 'End time in ISO 8601 format (e.g., "2026-01-28T15:00:00")'
			},
			timeZone: {
				type: 'string',
				description: 'Time zone for the event (e.g., "America/New_York", "Europe/London"). Defaults to UTC.'
			},
			body: {
				type: 'string',
				description: 'Description or agenda for the meeting (supports HTML)'
			},
			location: {
				type: 'string',
				description: 'Location of the meeting (e.g., "Conference Room A" or "Virtual")'
			},
			attendees: {
				type: 'string',
				description: 'Comma-separated list of attendee email addresses'
			},
			createTeamsMeeting: {
				type: 'string',
				description: 'Set to "true" to create a Microsoft Teams meeting with the event',
				enum: ['true', 'false']
			}
		},
		required: ['subject', 'start', 'end']
	}
};

/**
 * Check availability / free-busy
 */
export const getFreeBusyToolDefinition: IntegrationToolDefinition = {
	name: 'calendar_get_free_busy',
	description: 'Check availability (free/busy status) for one or more people during a time range.',
	parameters: {
		type: 'object',
		properties: {
			emails: {
				type: 'string',
				description: 'Comma-separated list of email addresses to check availability for'
			},
			startDateTime: {
				type: 'string',
				description: 'Start of the time range in ISO 8601 format'
			},
			endDateTime: {
				type: 'string',
				description: 'End of the time range in ISO 8601 format'
			},
			timeZone: {
				type: 'string',
				description: 'Time zone for the query (e.g., "America/New_York"). Defaults to UTC.'
			}
		},
		required: ['emails', 'startDateTime', 'endDateTime']
	}
};

/**
 * Find available meeting times
 */
export const findMeetingTimesToolDefinition: IntegrationToolDefinition = {
	name: 'calendar_find_meeting_times',
	description: 'Find available time slots that work for all specified attendees.',
	parameters: {
		type: 'object',
		properties: {
			attendees: {
				type: 'string',
				description: 'Comma-separated list of attendee email addresses'
			},
			durationMinutes: {
				type: 'string',
				description: 'Duration of the meeting in minutes (e.g., "30", "60")'
			},
			startDateTime: {
				type: 'string',
				description: 'Start of the search range in ISO 8601 format'
			},
			endDateTime: {
				type: 'string',
				description: 'End of the search range in ISO 8601 format'
			},
			timeZone: {
				type: 'string',
				description: 'Time zone for the query. Defaults to UTC.'
			}
		},
		required: ['attendees', 'durationMinutes', 'startDateTime', 'endDateTime']
	}
};

// ============================================================================
// All Calendar Tools
// ============================================================================

/**
 * Get all calendar tool definitions
 */
export function getCalendarToolDefinitions(): IntegrationToolDefinition[] {
	return [
		listEventsToolDefinition,
		getEventToolDefinition,
		createEventToolDefinition,
		getFreeBusyToolDefinition,
		findMeetingTimesToolDefinition
	];
}

/**
 * Get tool definition by name
 */
export function getCalendarToolDefinition(name: string): IntegrationToolDefinition | undefined {
	const tools = getCalendarToolDefinitions();
	return tools.find(t => t.name === name);
}

// ============================================================================
// Tool Result Formatting
// ============================================================================

/**
 * Format calendar events for AI response
 */
export function formatEventsForAI(events: Array<{
	id: string;
	subject: string;
	start: { dateTime: string };
	end: { dateTime: string };
	location?: { displayName?: string };
	attendees?: Array<{ emailAddress: { address: string; name?: string } }>;
	isOnlineMeeting?: boolean;
	onlineMeetingUrl?: string;
	onlineMeeting?: { joinUrl?: string };
	showAs?: string;
}>): string {
	if (events.length === 0) {
		return 'No events found in the specified time range.';
	}

	const lines = events.map(event => {
		const start = new Date(event.start.dateTime);
		const end = new Date(event.end.dateTime);
		const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
		const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

		let line = `• ${event.subject} - ${dateStr} ${startTime}-${endTime}`;

		if (event.location?.displayName) {
			line += ` @ ${event.location.displayName}`;
		}

		if (event.isOnlineMeeting) {
			line += ' (Teams)';
		}

		if (event.attendees && event.attendees.length > 0) {
			const attendeeList = event.attendees
				.slice(0, 3)
				.map(a => a.emailAddress.name || a.emailAddress.address)
				.join(', ');
			const more = event.attendees.length > 3 ? ` +${event.attendees.length - 3} more` : '';
			line += ` - With: ${attendeeList}${more}`;
		}

		line += ` [ID: ${event.id}]`;

		return line;
	});

	return `Found ${events.length} event(s):\n\n${lines.join('\n')}`;
}

/**
 * Format a created event for AI response
 */
export function formatCreatedEventForAI(event: {
	subject: string;
	start: { dateTime: string };
	end: { dateTime: string };
	webLink?: string;
	onlineMeeting?: { joinUrl?: string };
	onlineMeetingUrl?: string;
	attendees?: Array<{ emailAddress: { address: string } }>;
}): string {
	const start = new Date(event.start.dateTime);
	const end = new Date(event.end.dateTime);
	const dateStr = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
	const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

	let result = `✅ Created event: "${event.subject}"\n`;
	result += `📅 ${dateStr} from ${startTime} to ${endTime}\n`;

	if (event.attendees && event.attendees.length > 0) {
		result += `👥 Invitations sent to: ${event.attendees.map(a => a.emailAddress.address).join(', ')}\n`;
	}

	const teamsLink = event.onlineMeeting?.joinUrl || event.onlineMeetingUrl;
	if (teamsLink) {
		result += `🔗 Teams meeting: ${teamsLink}\n`;
	}

	if (event.webLink) {
		result += `📎 Event link: ${event.webLink}`;
	}

	return result;
}

/**
 * Format free/busy results for AI response
 */
export function formatFreeBusyForAI(
	freeBusy: Map<string, Array<{ status: string; start: { dateTime: string }; end: { dateTime: string } }>>
): string {
	const lines: string[] = [];

	for (const [email, slots] of freeBusy) {
		lines.push(`\n${email}:`);

		if (slots.length === 0) {
			lines.push('  Free during the entire period');
			continue;
		}

		for (const slot of slots) {
			const start = new Date(slot.start.dateTime);
			const end = new Date(slot.end.dateTime);
			const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
			const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
			lines.push(`  ${slot.status}: ${startTime} - ${endTime}`);
		}
	}

	return `Free/Busy status:${lines.join('\n')}`;
}

/**
 * Format meeting time suggestions for AI response
 */
export function formatMeetingTimesForAI(
	suggestions: Array<{ start: string; end: string }>
): string {
	if (suggestions.length === 0) {
		return 'No available time slots found for all attendees in the specified range.';
	}

	const lines = suggestions.map((slot, i) => {
		const start = new Date(slot.start);
		const end = new Date(slot.end);
		const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
		const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		return `${i + 1}. ${dateStr} ${startTime} - ${endTime}`;
	});

	return `Available time slots:\n\n${lines.join('\n')}`;
}
