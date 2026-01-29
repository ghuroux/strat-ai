/**
 * Meeting Wizard Types — Ephemeral state for the 3-step creation wizard
 *
 * These types are wizard-only (not persisted). On submit, they map to
 * CreateMeetingInput / ExpectedOutcome / CreateAttendeeInput from meetings.ts.
 */

// =====================================================
// Step 1: Purpose & Outcomes
// =====================================================

/**
 * Wizard outcome — includes selection state and AI metadata.
 * Stripped to ExpectedOutcome on submit.
 */
export interface WizardOutcome {
	id: string;
	label: string;
	type: 'decision' | 'action_item' | 'information' | 'custom';
	aiSuggested: boolean;
	aiReason?: string;
	sourceTaskId?: string;
	selected: boolean;
}

export interface WizardStep1Data {
	title: string;
	purpose: string;
	outcomes: WizardOutcome[];
}

// =====================================================
// Step 2: People & Ownership
// =====================================================

export interface WizardStep2Data {
	selectedMemberIds: string[];
	externalEmails: { email: string; name?: string }[];
	ownerId: string;
}

// =====================================================
// Step 3: Schedule
// =====================================================

export interface WizardStep3Data {
	date: string; // YYYY-MM-DD
	time: string; // HH:mm
	durationMinutes: number;
	isOnlineMeeting: boolean;
}

// =====================================================
// AI Suggest Outcomes
// =====================================================

export interface SuggestOutcomesRequest {
	areaId: string;
	purpose: string;
}

export interface SuggestOutcomesResponse {
	outcomes: {
		label: string;
		type: 'decision' | 'action_item' | 'information' | 'custom';
		reason: string;
		sourceTaskId?: string;
	}[];
}
