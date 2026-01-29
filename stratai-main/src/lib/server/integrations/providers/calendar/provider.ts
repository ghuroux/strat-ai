/**
 * Calendar Provider
 *
 * Implements the BaseProvider interface for Microsoft Calendar integration.
 * Handles connection validation, token refresh, and tool execution.
 *
 * See: docs/features/CALENDAR_INTEGRATION.md
 */

import {
	BaseProvider,
	type ConnectionValidation
} from '../base-provider';
import type {
	ServiceType,
	IntegrationTier,
	DecryptedCredential,
	IntegrationToolDefinition,
	IntegrationToolResult,
	ToolExecutionContext,
	Integration
} from '$lib/types/integrations';
import { CalendarClient, type CalendarEvent } from './client';
import { refreshAccessToken, tokensToCredentials, getUserInfo } from './oauth';
import {
	getCalendarToolDefinitions,
	formatEventsForAI,
	formatCreatedEventForAI,
	formatFreeBusyForAI,
	formatMeetingTimesForAI
} from './tools';
import { getEmailToolDefinitions } from './email-tools';
import { EmailClient, type SendEmailInput } from './email-client';

// ============================================================================
// Calendar Provider
// ============================================================================

export class CalendarProvider extends BaseProvider {
	private client: CalendarClient | null = null;

	constructor(integration: Integration, credentials: DecryptedCredential[]) {
		super(integration, credentials);
	}

	// ==========================================================================
	// Identity
	// ==========================================================================

	get serviceType(): ServiceType {
		return 'calendar';
	}

	get displayName(): string {
		return 'Microsoft Calendar';
	}

	get tier(): IntegrationTier {
		return 'foundational';
	}

	// ==========================================================================
	// Connection Management
	// ==========================================================================

	/**
	 * Validate the connection by making a lightweight API call
	 */
	async validateConnection(): Promise<ConnectionValidation> {
		try {
			const accessToken = this.getAccessToken();
			if (!accessToken) {
				return { valid: false, error: 'No access token available' };
			}

			// Try to get user info as a lightweight validation
			const userInfo = await getUserInfo(accessToken);

			return {
				valid: true,
				userInfo: {
					id: userInfo.id,
					email: userInfo.mail || userInfo.userPrincipalName,
					name: userInfo.displayName
				}
			};
		} catch (error) {
			return {
				valid: false,
				error: error instanceof Error ? error.message : 'Connection validation failed'
			};
		}
	}

	/**
	 * Refresh credentials using refresh token
	 */
	async refreshCredentials(): Promise<DecryptedCredential[]> {
		const refreshToken = this.getRefreshToken();
		if (!refreshToken) {
			throw new Error('No refresh token available');
		}

		const tokens = await refreshAccessToken(refreshToken);
		return tokensToCredentials(tokens);
	}

	// ==========================================================================
	// AI Tool Integration
	// ==========================================================================

	/**
	 * Get tool definitions for AI (calendar + email)
	 */
	getToolDefinitions(): IntegrationToolDefinition[] {
		return [...getCalendarToolDefinitions(), ...getEmailToolDefinitions()];
	}

	/**
	 * Execute a calendar tool
	 */
	async executeTool(
		name: string,
		params: Record<string, unknown>,
		_ctx: ToolExecutionContext
	): Promise<IntegrationToolResult> {
		try {
			const client = this.getClient();

			switch (name) {
				case 'calendar_list_events':
					return this.executeListEvents(client, params);

				case 'calendar_get_event':
					return this.executeGetEvent(client, params);

				case 'calendar_create_event':
					return this.executeCreateEvent(client, params);

				case 'calendar_get_free_busy':
					return this.executeGetFreeBusy(client, params);

				case 'calendar_find_meeting_times':
					return this.executeFindMeetingTimes(client, params);

				case 'email_send_email':
					return this.executeSendEmail(params);

				default:
					return { success: false, error: `Unknown tool: ${name}` };
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Tool execution failed'
			};
		}
	}

	// ==========================================================================
	// Context Generation
	// ==========================================================================

	/**
	 * Get calendar context summary for AI system prompt
	 */
	async getContextSummary(): Promise<string> {
		try {
			const client = this.getClient();

			// Get today's events
			const now = new Date();
			const startOfDay = new Date(now);
			startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date(now);
			endOfDay.setHours(23, 59, 59, 999);

			const events = await client.listEvents(
				startOfDay.toISOString(),
				endOfDay.toISOString(),
				{ maxResults: 5 }
			);

			// Also get tomorrow's first few events
			const tomorrow = new Date(now);
			tomorrow.setDate(tomorrow.getDate() + 1);
			const startOfTomorrow = new Date(tomorrow);
			startOfTomorrow.setHours(0, 0, 0, 0);
			const endOfTomorrow = new Date(tomorrow);
			endOfTomorrow.setHours(23, 59, 59, 999);

			const tomorrowEvents = await client.listEvents(
				startOfTomorrow.toISOString(),
				endOfTomorrow.toISOString(),
				{ maxResults: 3 }
			);

			// Build context summary
			let summary = 'User has Microsoft Calendar and Email connected.\n\n';

			if (events.length > 0) {
				summary += `Today's meetings (${events.length} event${events.length > 1 ? 's' : ''}):\n`;
				summary += this.formatEventsForContext(events);
			} else {
				summary += 'No meetings scheduled for today.\n';
			}

			if (tomorrowEvents.length > 0) {
				summary += `\nTomorrow's meetings (${tomorrowEvents.length} event${tomorrowEvents.length > 1 ? 's' : ''}):\n`;
				summary += this.formatEventsForContext(tomorrowEvents);
			}

			return summary;
		} catch (error) {
			// Return basic info if we can't fetch events
			return 'User has Microsoft Calendar and Email connected. Use calendar tools to check schedule, or email tools to send emails.';
		}
	}

	// ==========================================================================
	// Private Helpers
	// ==========================================================================

	/**
	 * Get or create calendar client
	 */
	private getClient(): CalendarClient {
		const accessToken = this.getAccessToken();
		if (!accessToken) {
			throw new Error('No access token available');
		}

		if (!this.client) {
			this.client = new CalendarClient(accessToken);
		}

		return this.client;
	}

	/**
	 * Format events for context summary (brief format)
	 */
	private formatEventsForContext(events: CalendarEvent[]): string {
		return events.map(event => {
			const start = new Date(event.start.dateTime);
			const time = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
			const duration = this.getEventDuration(event);
			return `- ${time}: ${event.subject} (${duration})`;
		}).join('\n');
	}

	/**
	 * Calculate event duration string
	 */
	private getEventDuration(event: CalendarEvent): string {
		const start = new Date(event.start.dateTime);
		const end = new Date(event.end.dateTime);
		const minutes = Math.round((end.getTime() - start.getTime()) / 60000);

		if (minutes < 60) {
			return `${minutes}min`;
		} else {
			const hours = Math.floor(minutes / 60);
			const remainingMinutes = minutes % 60;
			return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
		}
	}

	// ==========================================================================
	// Tool Implementations
	// ==========================================================================

	private async executeListEvents(
		client: CalendarClient,
		params: Record<string, unknown>
	): Promise<IntegrationToolResult> {
		const startDateTime = String(params.startDateTime);
		const endDateTime = String(params.endDateTime);
		const maxResults = params.maxResults ? parseInt(String(params.maxResults), 10) : 10;

		const events = await client.listEvents(startDateTime, endDateTime, {
			maxResults: Math.min(maxResults, 50)
		});

		return {
			success: true,
			data: formatEventsForAI(events)
		};
	}

	private async executeGetEvent(
		client: CalendarClient,
		params: Record<string, unknown>
	): Promise<IntegrationToolResult> {
		const eventId = String(params.eventId);
		const event = await client.getEvent(eventId);

		const start = new Date(event.start.dateTime);
		const end = new Date(event.end.dateTime);

		let details = `Event: ${event.subject}\n`;
		details += `Date: ${start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}\n`;
		details += `Time: ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}\n`;

		if (event.location?.displayName) {
			details += `Location: ${event.location.displayName}\n`;
		}

		if (event.attendees && event.attendees.length > 0) {
			details += `Attendees:\n${event.attendees.map(a => `  - ${a.emailAddress.name || a.emailAddress.address}`).join('\n')}\n`;
		}

		if (event.bodyPreview) {
			details += `\nDescription: ${event.bodyPreview}`;
		}

		const teamsLink = event.onlineMeeting?.joinUrl || event.onlineMeetingUrl;
		if (teamsLink) {
			details += `\n\nTeams meeting: ${teamsLink}`;
		}

		return {
			success: true,
			data: details
		};
	}

	private async executeCreateEvent(
		client: CalendarClient,
		params: Record<string, unknown>
	): Promise<IntegrationToolResult> {
		const subject = String(params.subject);
		const start = String(params.start);
		const end = String(params.end);
		const timeZone = params.timeZone ? String(params.timeZone) : undefined;
		const body = params.body ? String(params.body) : undefined;
		const location = params.location ? String(params.location) : undefined;
		const attendeesStr = params.attendees ? String(params.attendees) : undefined;
		const createTeamsMeeting = params.createTeamsMeeting === 'true';

		const attendees = attendeesStr
			? attendeesStr.split(',').map(e => e.trim()).filter(e => e.includes('@'))
			: undefined;

		const event = await client.createEvent({
			subject,
			start,
			end,
			timeZone,
			body,
			location,
			attendees,
			isOnlineMeeting: createTeamsMeeting
		});

		return {
			success: true,
			data: formatCreatedEventForAI(event)
		};
	}

	private async executeGetFreeBusy(
		client: CalendarClient,
		params: Record<string, unknown>
	): Promise<IntegrationToolResult> {
		const emailsStr = String(params.emails);
		const startDateTime = String(params.startDateTime);
		const endDateTime = String(params.endDateTime);
		const timeZone = params.timeZone ? String(params.timeZone) : 'UTC';

		const emails = emailsStr.split(',').map(e => e.trim()).filter(e => e.includes('@'));

		if (emails.length === 0) {
			return { success: false, error: 'No valid email addresses provided' };
		}

		const freeBusy = await client.getFreeBusy(emails, startDateTime, endDateTime, timeZone);

		return {
			success: true,
			data: formatFreeBusyForAI(freeBusy)
		};
	}

	private async executeFindMeetingTimes(
		client: CalendarClient,
		params: Record<string, unknown>
	): Promise<IntegrationToolResult> {
		const attendeesStr = String(params.attendees);
		const durationMinutes = parseInt(String(params.durationMinutes), 10);
		const startDateTime = String(params.startDateTime);
		const endDateTime = String(params.endDateTime);
		const timeZone = params.timeZone ? String(params.timeZone) : 'UTC';

		const attendees = attendeesStr.split(',').map(e => e.trim()).filter(e => e.includes('@'));

		if (attendees.length === 0) {
			return { success: false, error: 'No valid email addresses provided' };
		}

		const suggestions = await client.findMeetingTimes(
			attendees,
			durationMinutes,
			startDateTime,
			endDateTime,
			timeZone
		);

		return {
			success: true,
			data: formatMeetingTimesForAI(suggestions)
		};
	}

	private async executeSendEmail(
		params: Record<string, unknown>
	): Promise<IntegrationToolResult> {
		const accessToken = this.getAccessToken();
		if (!accessToken) {
			return { success: false, error: 'No access token available for email' };
		}

		const emailClient = new EmailClient(accessToken);

		const toStr = String(params.to);
		const to = toStr.split(',').map(e => e.trim()).filter(e => e.includes('@'));

		if (to.length === 0) {
			return { success: false, error: 'No valid recipient email addresses provided' };
		}

		const ccStr = params.cc ? String(params.cc) : undefined;
		const bccStr = params.bcc ? String(params.bcc) : undefined;

		const input: SendEmailInput = {
			to,
			cc: ccStr ? ccStr.split(',').map(e => e.trim()).filter(e => e.includes('@')) : undefined,
			bcc: bccStr ? bccStr.split(',').map(e => e.trim()).filter(e => e.includes('@')) : undefined,
			subject: String(params.subject),
			body: String(params.body),
			saveToSentItems: params.saveToSentItems !== 'false'
		};

		const result = await emailClient.sendEmail(input);

		return {
			success: true,
			data: `Email sent successfully to ${result.recipientCount} recipient(s). Subject: "${result.subject}"`
		};
	}
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a CalendarProvider instance
 */
export function createCalendarProvider(
	integration: Integration,
	credentials: DecryptedCredential[]
): CalendarProvider {
	return new CalendarProvider(integration, credentials);
}
