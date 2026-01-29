/**
 * Meeting Types for Meeting Creation Wizard (Phase 1)
 *
 * Meetings are context generators that feed the Area memory flywheel:
 * Create → Schedule → Capture → Process → Context
 *
 * See: docs/features/MEETING_CREATION_WIZARD.md
 */

// =====================================================
// Enums / Union Types
// =====================================================

/**
 * Meeting lifecycle states:
 * draft → scheduled → in_progress → completed
 *                                 → awaiting_capture → captured
 *                  → cancelled
 */
export type MeetingStatus =
	| 'draft'
	| 'scheduled'
	| 'in_progress'
	| 'completed'
	| 'cancelled'
	| 'awaiting_capture'
	| 'captured';

export type ExternalProvider = 'microsoft' | 'google';

export type CaptureMethod = 'manual_upload' | 'auto_teams' | 'auto_zoom' | 'manual_notes';

export type AttendeeType = 'required' | 'optional' | 'organizer';

export type ResponseStatus = 'pending' | 'accepted' | 'declined' | 'tentative';

// =====================================================
// JSONB Element Types
// =====================================================

/**
 * Expected outcome stored in meetings.expected_outcomes JSONB array
 */
export interface ExpectedOutcome {
	id: string;
	label: string;
	type: 'decision' | 'action_item' | 'information' | 'custom';
	captured?: boolean;
}

// =====================================================
// Core Entities
// =====================================================

/**
 * Meeting entity (application-level, camelCase, Date objects)
 */
export interface Meeting {
	id: string;
	title: string;
	purpose?: string;
	durationMinutes: number;

	// Location & hierarchy
	spaceId: string;
	areaId?: string;

	// People
	organizerId: string;
	ownerId?: string;

	// Lifecycle
	status: MeetingStatus;

	// Structured data
	expectedOutcomes: ExpectedOutcome[];
	captureData?: Record<string, unknown>;

	// Calendar integration
	externalProvider?: ExternalProvider;
	externalEventId?: string;
	externalJoinUrl?: string;

	// Scheduling
	scheduledStart?: Date;
	scheduledEnd?: Date;

	// Capture
	captureMethod?: CaptureMethod;

	// Linked entities
	taskId?: string;
	pageId?: string;

	// Timestamps
	createdAt: Date;
	updatedAt: Date;
	deletedAt?: Date;
}

/**
 * Database row shape (camelCase from postgres.js transform)
 * Nullable fields use `| null` to match DB reality
 */
export interface MeetingRow {
	id: string;
	title: string;
	purpose: string | null;
	durationMinutes: number;

	spaceId: string;
	areaId: string | null;

	organizerId: string;
	ownerId: string | null;

	status: string;

	expectedOutcomes: ExpectedOutcome[] | string | null;
	captureData: Record<string, unknown> | string | null;

	externalProvider: string | null;
	externalEventId: string | null;
	externalJoinUrl: string | null;

	scheduledStart: Date | null;
	scheduledEnd: Date | null;

	captureMethod: string | null;

	taskId: string | null;
	pageId: string | null;

	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
}

/**
 * Meeting attendee entity
 */
export interface MeetingAttendee {
	id: string;
	meetingId: string;
	userId?: string;
	email: string;
	displayName?: string;
	attendeeType: AttendeeType;
	isOwner: boolean;
	responseStatus: ResponseStatus;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Database row shape for meeting_attendees
 */
export interface MeetingAttendeeRow {
	id: string;
	meetingId: string;
	userId: string | null;
	email: string;
	displayName: string | null;
	attendeeType: string;
	isOwner: boolean;
	responseStatus: string;
	createdAt: Date;
	updatedAt: Date;
}

// =====================================================
// Convenience Types
// =====================================================

/**
 * Meeting with its attendees list (common query result)
 */
export interface MeetingWithAttendees extends Meeting {
	attendees: MeetingAttendee[];
}

// =====================================================
// Input Types
// =====================================================

/**
 * Input for creating a new meeting
 */
export interface CreateMeetingInput {
	title: string;
	purpose?: string;
	durationMinutes?: number;
	spaceId: string;
	areaId?: string;
	expectedOutcomes?: ExpectedOutcome[];
	scheduledStart?: Date;
	scheduledEnd?: Date;
	// Optional attendees for atomic creation
	attendees?: CreateAttendeeInput[];
}

/**
 * Input for updating an existing meeting
 */
export interface UpdateMeetingInput {
	title?: string;
	purpose?: string | null;
	durationMinutes?: number;
	areaId?: string | null;
	ownerId?: string | null;
	expectedOutcomes?: ExpectedOutcome[];
	scheduledStart?: Date | null;
	scheduledEnd?: Date | null;
	captureMethod?: CaptureMethod | null;
	taskId?: string;
}

/**
 * Input for adding an attendee
 */
export interface CreateAttendeeInput {
	email: string;
	displayName?: string;
	userId?: string;
	attendeeType?: AttendeeType;
	isOwner?: boolean;
}

// =====================================================
// Filter Types
// =====================================================

/**
 * Filter for listing meetings
 */
export interface MeetingListFilter {
	spaceId?: string;
	areaId?: string;
	status?: MeetingStatus | MeetingStatus[];
	fromDate?: Date;
	toDate?: Date;
}

// =====================================================
// Row Conversion Functions
// =====================================================

/**
 * Parse JSONB field that may be string or object
 */
function parseJsonb<T>(value: T | string | null, fallback: T): T {
	if (value === null || value === undefined) return fallback;
	if (typeof value === 'string') {
		try {
			return JSON.parse(value) as T;
		} catch {
			return fallback;
		}
	}
	return value;
}

/**
 * Convert database row to Meeting entity
 */
export function rowToMeeting(row: MeetingRow): Meeting {
	return {
		id: row.id,
		title: row.title,
		purpose: row.purpose ?? undefined,
		durationMinutes: row.durationMinutes,
		spaceId: row.spaceId,
		areaId: row.areaId ?? undefined,
		organizerId: row.organizerId,
		ownerId: row.ownerId ?? undefined,
		status: row.status as MeetingStatus,
		expectedOutcomes: parseJsonb<ExpectedOutcome[]>(row.expectedOutcomes, []),
		captureData: parseJsonb<Record<string, unknown>>(row.captureData, undefined as unknown as Record<string, unknown>) || undefined,
		externalProvider: (row.externalProvider as ExternalProvider) ?? undefined,
		externalEventId: row.externalEventId ?? undefined,
		externalJoinUrl: row.externalJoinUrl ?? undefined,
		scheduledStart: row.scheduledStart ?? undefined,
		scheduledEnd: row.scheduledEnd ?? undefined,
		captureMethod: (row.captureMethod as CaptureMethod) ?? undefined,
		taskId: row.taskId ?? undefined,
		pageId: row.pageId ?? undefined,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		deletedAt: row.deletedAt ?? undefined
	};
}

/**
 * Convert database row to MeetingAttendee entity
 */
export function rowToMeetingAttendee(row: MeetingAttendeeRow): MeetingAttendee {
	return {
		id: row.id,
		meetingId: row.meetingId,
		userId: row.userId ?? undefined,
		email: row.email,
		displayName: row.displayName ?? undefined,
		attendeeType: row.attendeeType as AttendeeType,
		isOwner: row.isOwner,
		responseStatus: row.responseStatus as ResponseStatus,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}
