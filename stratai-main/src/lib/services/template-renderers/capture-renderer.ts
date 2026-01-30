/**
 * Capture Renderer — Converts CaptureData + Meeting → TipTap Document
 *
 * Produces the Meeting Notes page that results from the post-meeting
 * capture wizard. Follows the same node-builder pattern as
 * meeting-notes-renderer.ts.
 *
 * Sections:
 * 1. Title (H1) — "Meeting Notes: {title}"
 * 2. Metadata — Date, duration, attendees
 * 3. Summary — Optional user-provided summary
 * 4. Outcome Resolution — Status of each expected outcome
 * 5. Decisions — Confirmed decisions with rationale
 * 6. Action Items — Tasks with assignees and due dates
 *
 * See: docs/features/MEETING_LIFECYCLE.md
 */

import type { TipTapContent, TipTapNode } from '$lib/types/page';
import type { Meeting, MeetingAttendee } from '$lib/types/meetings';
import type { CaptureData, OutcomeResolution, CaptureDecision, CaptureActionItem } from '$lib/types/meeting-capture';

// ============================================================================
// MAIN RENDERER
// ============================================================================

/**
 * Render capture data into a TipTap document for the Meeting Notes page
 */
export function renderCaptureToDocument(
	meeting: Meeting,
	captureData: CaptureData,
	attendees: MeetingAttendee[]
): TipTapContent {
	const nodes: TipTapNode[] = [];

	// Title
	nodes.push(heading(1, `Meeting Notes: ${meeting.title}`));

	// Metadata
	nodes.push(renderMetadata(meeting, attendees));

	// Summary
	if (captureData.summary) {
		nodes.push(heading(2, 'Summary'));
		nodes.push(paragraph([text(captureData.summary)]));
	}

	// Outcome resolutions
	const resolutions = captureData.outcomeResolutions.filter(r => r.status !== 'not_addressed');
	if (resolutions.length > 0) {
		nodes.push(heading(2, 'Outcomes'));
		for (const resolution of resolutions) {
			nodes.push(...renderOutcomeResolution(resolution));
		}
	}

	// Decisions
	const confirmedDecisions = captureData.decisions.filter(d => d.confirmed);
	if (confirmedDecisions.length > 0) {
		nodes.push(heading(2, 'Decisions'));
		for (const decision of confirmedDecisions) {
			nodes.push(...renderDecision(decision, attendees));
		}
	}

	// Action Items
	const confirmedActions = captureData.actionItems.filter(a => a.confirmed);
	if (confirmedActions.length > 0) {
		nodes.push(heading(2, 'Action Items'));
		nodes.push(taskList(confirmedActions.map(item => renderActionItem(item, attendees))));
	}

	// Purpose (for reference)
	if (meeting.purpose) {
		nodes.push(heading(2, 'Original Purpose'));
		nodes.push(blockquote([paragraph([italicText(meeting.purpose)])]));
	}

	return { type: 'doc', content: nodes };
}

// ============================================================================
// SECTION RENDERERS
// ============================================================================

function renderMetadata(meeting: Meeting, attendees: MeetingAttendee[]): TipTapNode {
	const metaContent: TipTapNode[] = [];

	// Date
	if (meeting.scheduledStart) {
		metaContent.push(boldText('Date: '));
		metaContent.push(text(formatDateTime(meeting.scheduledStart)));
	}

	// Duration
	if (meeting.durationMinutes) {
		if (metaContent.length > 0) metaContent.push(text('\n'));
		metaContent.push(boldText('Duration: '));
		metaContent.push(text(`${meeting.durationMinutes} minutes`));
	}

	// Attendees
	if (attendees.length > 0) {
		if (metaContent.length > 0) metaContent.push(text('\n'));
		metaContent.push(boldText('Attendees: '));
		const names = attendees
			.map(a => a.displayName || a.email)
			.join(', ');
		metaContent.push(text(names));
	}

	return paragraph(metaContent);
}

const OUTCOME_STATUS_EMOJI: Record<string, string> = {
	achieved: '\u2705',
	partial: '\u26A0\uFE0F',
	deferred: '\u23F3',
	not_addressed: '\u274C'
};

function renderOutcomeResolution(resolution: OutcomeResolution): TipTapNode[] {
	const nodes: TipTapNode[] = [];
	const emoji = OUTCOME_STATUS_EMOJI[resolution.status] || '';
	const statusLabel = resolution.status.replace('_', ' ');

	nodes.push(paragraph([
		boldText(`${emoji} ${resolution.label}`),
		text(` — ${statusLabel}`)
	]));

	if (resolution.notes) {
		nodes.push(paragraph([italicText(resolution.notes)]));
	}

	return nodes;
}

function renderDecision(decision: CaptureDecision, attendees: MeetingAttendee[]): TipTapNode[] {
	const nodes: TipTapNode[] = [];

	nodes.push(heading(3, decision.text));

	if (decision.ownerId) {
		const owner = attendees.find(a => a.userId === decision.ownerId);
		const ownerName = owner?.displayName || owner?.email || decision.ownerId;
		nodes.push(paragraph([boldText('Owner: '), text(ownerName)]));
	}

	if (decision.rationale) {
		nodes.push(paragraph([italicText('Rationale: '), text(decision.rationale)]));
	}

	return nodes;
}

function renderActionItem(item: CaptureActionItem, attendees: MeetingAttendee[]): TipTapNode {
	const content: TipTapNode[] = [text(item.text)];

	if (item.assigneeId) {
		const assignee = attendees.find(a => a.userId === item.assigneeId);
		const assigneeName = item.assigneeName || assignee?.displayName || assignee?.email || item.assigneeId;
		content.push(text(' — '));
		content.push(boldText(`@${assigneeName}`));
	}

	if (item.dueDate) {
		content.push(text(` (Due: ${formatDate(item.dueDate)})`));
	}

	return taskItem(false, content);
}

// ============================================================================
// NODE BUILDER HELPERS
// ============================================================================

function heading(level: number, content: string): TipTapNode {
	return {
		type: 'heading',
		attrs: { level },
		content: [{ type: 'text', text: content }]
	};
}

function paragraph(content: TipTapNode[]): TipTapNode {
	return { type: 'paragraph', content };
}

function text(content: string): TipTapNode {
	return { type: 'text', text: content };
}

function boldText(content: string): TipTapNode {
	return { type: 'text', marks: [{ type: 'bold' }], text: content };
}

function italicText(content: string): TipTapNode {
	return { type: 'text', marks: [{ type: 'italic' }], text: content };
}

function taskList(items: TipTapNode[]): TipTapNode {
	return { type: 'taskList', content: items };
}

function taskItem(checked: boolean, content: TipTapNode[]): TipTapNode {
	return {
		type: 'taskItem',
		attrs: { checked },
		content: [paragraph(content)]
	};
}

function blockquote(content: TipTapNode[]): TipTapNode {
	return { type: 'blockquote', content };
}

// ============================================================================
// DATE HELPERS
// ============================================================================

function formatDateTime(date: Date): string {
	try {
		return date.toLocaleString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	} catch {
		return date.toISOString();
	}
}

function formatDate(iso: string): string {
	try {
		const date = new Date(iso);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	} catch {
		return iso;
	}
}
