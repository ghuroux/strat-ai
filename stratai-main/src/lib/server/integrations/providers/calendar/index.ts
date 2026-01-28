/**
 * Calendar Provider Module
 *
 * Microsoft Calendar integration for StratAI.
 *
 * Features:
 * - OAuth connection to Microsoft 365
 * - List/get/create calendar events
 * - Check free/busy availability
 * - Find meeting times for attendees
 * - Create Teams meetings
 *
 * See: docs/features/CALENDAR_INTEGRATION.md
 */

// Provider
export { CalendarProvider, createCalendarProvider } from './provider';

// OAuth
export {
	getAuthorizationUrl,
	exchangeCodeForTokens,
	refreshAccessToken,
	tokensToCredentials,
	getUserInfo,
	isAzureConfigured,
	getAzureConfig
} from './oauth';

// Client
export {
	CalendarClient,
	type CalendarEvent,
	type Calendar,
	type FreeBusySlot,
	type CreateEventInput
} from './client';

// Tools
export {
	getCalendarToolDefinitions,
	getCalendarToolDefinition,
	formatEventsForAI,
	formatCreatedEventForAI,
	formatFreeBusyForAI,
	formatMeetingTimesForAI
} from './tools';
