/**
 * Meeting Capture Types — Post-Meeting Capture Loop
 *
 * Defines the CaptureData JSONB structure and related types for the
 * "Creation → Capture Bridge": expected outcomes defined at meeting creation
 * become a pre-populated checklist in the post-meeting capture wizard.
 *
 * Designed for forward-compatibility with AI pre-population:
 * - `confidence` fields (0.0-1.0) only present for AI-extracted data
 * - `confirmed` flags distinguish human-verified from AI-suggested
 * - `aiMetadata` stores extraction model/processing info
 *
 * See: docs/features/MEETING_LIFECYCLE.md
 */

// =====================================================
// Outcome Resolution (The Bridge)
// =====================================================

/**
 * Resolution status for an expected outcome
 */
export type OutcomeResolutionStatus = 'achieved' | 'partial' | 'not_addressed' | 'deferred';

/**
 * Maps an expected outcome (set at creation) to what actually happened
 */
export interface OutcomeResolution {
	outcomeId: string;
	label: string;
	status: OutcomeResolutionStatus;
	notes?: string;
	/** AI confidence score (0.0-1.0), only present for AI-extracted resolutions */
	confidence?: number;
}

// =====================================================
// Capture Decisions
// =====================================================

/**
 * A decision captured during the post-meeting wizard
 */
export interface CaptureDecision {
	id: string;
	text: string;
	rationale?: string;
	ownerId?: string;
	/** Links decision back to the outcome it resolved */
	outcomeId?: string;
	/** Whether to propagate this decision to Area context */
	propagateToContext: boolean;
	/** Human-confirmed (true) vs AI-suggested (false) */
	confirmed: boolean;
	/** AI confidence score (0.0-1.0), only present for AI-extracted decisions */
	confidence?: number;
}

// =====================================================
// Capture Action Items
// =====================================================

/**
 * An action item captured during the post-meeting wizard
 */
export interface CaptureActionItem {
	id: string;
	text: string;
	assigneeId?: string;
	assigneeName?: string;
	dueDate?: string;
	/** Whether to create a subtask from this action item */
	createSubtask: boolean;
	/** Human-confirmed (true) vs AI-suggested (false) */
	confirmed: boolean;
	/** AI confidence score (0.0-1.0), only present for AI-extracted items */
	confidence?: number;
}

// =====================================================
// AI Extraction Metadata (Future)
// =====================================================

/**
 * Metadata about AI extraction process (for bot pipeline)
 */
export interface AIExtractionMetadata {
	model: string;
	processedAt: string;
	transcriptLength?: number;
	extractionDuration?: number;
}

/**
 * Transcript metadata (for future bot pipeline)
 */
export interface TranscriptMetadata {
	source: 'manual_upload' | 'teams_api' | 'zoom_api';
	filename?: string;
	duration?: number;
	uploadedAt: string;
}

// =====================================================
// Main CaptureData Structure
// =====================================================

/**
 * The full capture data stored as JSONB in meetings.capture_data
 *
 * Version field enables forward-compatible schema evolution.
 */
export interface CaptureData {
	version: 1;
	summary?: string;
	outcomeResolutions: OutcomeResolution[];
	decisions: CaptureDecision[];
	actionItems: CaptureActionItem[];
	captureStartedAt: string;
	captureCompletedAt?: string;
	/** Future: transcript metadata from bot pipeline */
	transcript?: TranscriptMetadata;
	/** Future: AI extraction metadata */
	aiMetadata?: AIExtractionMetadata;
}

// =====================================================
// Wizard State Types
// =====================================================

/**
 * Capture wizard step identifiers
 */
export type CaptureWizardStep = 'outcomes' | 'decisions' | 'actions' | 'review';

/**
 * Capture wizard navigation state
 */
export const CAPTURE_STEPS: CaptureWizardStep[] = ['outcomes', 'decisions', 'actions', 'review'];

/**
 * Step display labels
 */
export const CAPTURE_STEP_LABELS: Record<CaptureWizardStep, string> = {
	outcomes: 'Outcomes',
	decisions: 'Decisions',
	actions: 'Action Items',
	review: 'Review'
};

// =====================================================
// API Response Types
// =====================================================

/**
 * Response from POST /api/meetings/[id]/capture
 */
export interface CaptureResult {
	meeting: import('./meetings').Meeting;
	page?: { id: string; title: string };
	subtasks: { id: string; title: string }[];
	decisionsCount: number;
	errors: string[];
}

/**
 * Response from GET /api/meetings/[id]/capture-status
 */
export interface CaptureStatusResponse {
	meeting: import('./meetings').MeetingWithAttendees;
	canCapture: boolean;
	reason?: string;
}
