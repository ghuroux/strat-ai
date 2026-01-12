/**
 * Meeting Notes Data Types
 *
 * Structured data types for the Meeting Notes template.
 * Used by the Guided Creation system to collect and render meeting notes.
 *
 * See: docs/GUIDED_CREATION.md Section 4
 */

import { generateUUID } from '$lib/utils/uuid';

// ============================================================================
// ATTENDEE TYPES
// ============================================================================

/**
 * External attendee (not a system user)
 */
export interface ExternalAttendee {
	/** Display name */
	name: string;
	/** Company or organization */
	organization?: string;
	/** Email address for follow-up */
	email?: string;
}

/**
 * Attendees structure with internal and external separation
 */
export interface MeetingAttendees {
	/** User IDs of internal attendees */
	internal: string[];
	/** External attendees (non-system users) */
	external: ExternalAttendee[];
}

// ============================================================================
// DECISION & ACTION TYPES
// ============================================================================

/**
 * A decision made during the meeting
 *
 * Structured for future context propagation
 * (see CONTEXT_STRATEGY.md Phase 3)
 */
export interface MeetingDecision {
	/** Unique identifier */
	id: string;
	/** The decision text */
	text: string;
	/** User ID of the decision owner (internal user) */
	ownerId?: string;
	/** Why this decision was made */
	rationale?: string;
}

/**
 * An action item from the meeting
 */
export interface MeetingActionItem {
	/** Unique identifier */
	id: string;
	/** Description of the action */
	text: string;
	/** User ID of the assignee (internal user) */
	assigneeId?: string;
	/** Due date (ISO date string) */
	dueDate?: string;
	/** Whether to create a Task entity for this item */
	createTask: boolean;
}

// ============================================================================
// MEETING NOTES DATA
// ============================================================================

/**
 * Complete meeting notes data structure
 *
 * This is the typed version of what gets stored in
 * GuidedCreationData.data for meeting_notes templates.
 */
export interface MeetingNotesData {
	// -------------------------
	// Step 1: Basics
	// -------------------------

	/** Meeting title */
	title: string;
	/** Meeting date/time (ISO datetime string) */
	datetime: string;

	// -------------------------
	// Step 2: Attendees
	// -------------------------

	/** Meeting attendees (internal and external) */
	attendees: MeetingAttendees;

	// -------------------------
	// Step 3: Context
	// -------------------------

	/** Purpose/goal of the meeting */
	purpose: string;
	/** Whether to include Area context in rendered document */
	includeAreaContext: boolean;
	/** Agenda items (optional list) */
	agendaItems?: string[];

	// -------------------------
	// Step 4: Outcomes
	// -------------------------

	/** Free-form discussion notes */
	discussionNotes?: string;
	/** Key outcomes/conclusions */
	outcomes: string[];
	/** Formal decisions made */
	decisions: MeetingDecision[];

	// -------------------------
	// Step 5: Action Items
	// -------------------------

	/** Action items with optional task creation */
	actionItems: MeetingActionItem[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an empty MeetingNotesData with sensible defaults
 */
export function createEmptyMeetingNotesData(): MeetingNotesData {
	return {
		title: '',
		datetime: new Date().toISOString(),
		attendees: { internal: [], external: [] },
		purpose: '',
		includeAreaContext: true,
		agendaItems: [],
		discussionNotes: '',
		outcomes: [],
		decisions: [],
		actionItems: []
	};
}

/**
 * Create a new decision with a unique ID
 */
export function createMeetingDecision(text: string, ownerId?: string): MeetingDecision {
	return {
		id: generateUUID(),
		text,
		ownerId,
		rationale: undefined
	};
}

/**
 * Create a new action item with a unique ID
 */
export function createMeetingActionItem(text: string, createTask = true): MeetingActionItem {
	return {
		id: generateUUID(),
		text,
		assigneeId: undefined,
		dueDate: undefined,
		createTask
	};
}
