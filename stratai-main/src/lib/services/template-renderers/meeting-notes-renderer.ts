/**
 * Meeting Notes Template Renderer
 *
 * Converts MeetingNotesData into TipTap document structure.
 *
 * See: docs/GUIDED_CREATION.md Phase 4
 */

import type { TipTapContent, TipTapNode } from '$lib/types/page';
import type { GuidedCreationData } from '$lib/types/guided-creation';
import type {
	MeetingNotesData,
	MeetingDecision,
	MeetingActionItem
} from '$lib/types/meeting-notes-data';
import type { TemplateRenderer, RenderResult, EntityToCreate } from '../template-renderer';
import { registerRenderer } from '../template-renderer';

// ============================================================================
// RENDERER IMPLEMENTATION
// ============================================================================

/**
 * Meeting Notes renderer implementation
 */
export const meetingNotesRenderer: TemplateRenderer = {
	render(guidedData: GuidedCreationData, areaContext?: string): RenderResult {
		// Cast through unknown since GuidedCreationData.data is Record<string, unknown>
		const data = guidedData.data as unknown as MeetingNotesData;
		const content = buildContent(data, areaContext);
		const entitiesToCreate = extractEntities(data);

		return { content, entitiesToCreate };
	}
};

// Register on import
registerRenderer('meeting_notes', meetingNotesRenderer);

// ============================================================================
// CONTENT BUILDER
// ============================================================================

/**
 * Build TipTap content from meeting notes data
 */
function buildContent(data: MeetingNotesData, areaContext?: string): TipTapContent {
	const nodes: TipTapNode[] = [];

	// Title (H1)
	nodes.push(heading(1, data.title));

	// Metadata paragraph
	const metaContent: TipTapNode[] = [boldText('Date: '), text(formatDateTime(data.datetime))];

	// Add attendees to metadata if present
	const attendeeNames = getAttendeeNames(data);
	if (attendeeNames.length > 0) {
		metaContent.push(text('\n'));
		metaContent.push(boldText('Attendees: '));
		metaContent.push(text(attendeeNames.join(', ')));
	}

	nodes.push(paragraph(metaContent));

	// Purpose section
	nodes.push(heading(2, 'Purpose'));
	nodes.push(paragraph([text(data.purpose)]));

	// Area context (if included and provided)
	if (data.includeAreaContext && areaContext) {
		nodes.push(blockquote([paragraph([italicText('Context: '), text(areaContext)])]));
	}

	// Agenda (if present)
	if (data.agendaItems && data.agendaItems.length > 0) {
		nodes.push(heading(2, 'Agenda'));
		nodes.push(bulletList(data.agendaItems.map((item) => listItem([text(item)]))));
	}

	// Discussion notes (if present)
	if (data.discussionNotes) {
		nodes.push(heading(2, 'Discussion'));
		nodes.push(paragraph([text(data.discussionNotes)]));
	}

	// Outcomes (if present)
	if (data.outcomes && data.outcomes.length > 0) {
		nodes.push(heading(2, 'Key Outcomes'));
		nodes.push(bulletList(data.outcomes.map((outcome) => listItem([text(outcome)]))));
	}

	// Decisions (if present)
	if (data.decisions && data.decisions.length > 0) {
		nodes.push(heading(2, 'Decisions Made'));
		for (const decision of data.decisions) {
			nodes.push(...renderDecision(decision));
		}
	}

	// Action items (if present)
	if (data.actionItems && data.actionItems.length > 0) {
		nodes.push(heading(2, 'Action Items'));
		nodes.push(taskList(data.actionItems.map((item) => renderActionItem(item))));
	}

	return { type: 'doc', content: nodes };
}

// ============================================================================
// ENTITY EXTRACTION
// ============================================================================

/**
 * Extract entities to create from meeting data
 */
function extractEntities(data: MeetingNotesData): EntityToCreate[] {
	const entities: EntityToCreate[] = [];

	for (const item of data.actionItems || []) {
		if (item.createTask) {
			entities.push({
				type: 'task',
				data: {
					title: item.text,
					assigneeId: item.assigneeId,
					dueDate: item.dueDate
				}
			});
		}
	}

	return entities;
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

function bulletList(items: TipTapNode[]): TipTapNode {
	return { type: 'bulletList', content: items };
}

function listItem(content: TipTapNode[]): TipTapNode {
	return {
		type: 'listItem',
		content: [paragraph(content)]
	};
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
// DATA HELPERS
// ============================================================================

function formatDateTime(iso: string): string {
	try {
		const date = new Date(iso);
		return date.toLocaleString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	} catch {
		return iso;
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

function getAttendeeNames(data: MeetingNotesData): string[] {
	const names: string[] = [];

	// Internal attendees (use IDs for now, Phase 6 will resolve to names)
	for (const userId of data.attendees?.internal || []) {
		names.push(getUserDisplayName(userId));
	}

	// External attendees
	for (const external of data.attendees?.external || []) {
		if (external.organization) {
			names.push(`${external.name} (${external.organization})`);
		} else {
			names.push(external.name);
		}
	}

	return names;
}

function getUserDisplayName(userId: string): string {
	// TODO: Phase 6 - look up real user names from store
	// For now, return a placeholder based on ID
	const mockNames: Record<string, string> = {
		'user-1': 'John Doe',
		'user-2': 'Jane Smith',
		'user-3': 'Bob Wilson'
	};
	return mockNames[userId] || userId;
}

function renderDecision(decision: MeetingDecision): TipTapNode[] {
	const nodes: TipTapNode[] = [];

	// Decision heading (H3)
	nodes.push(heading(3, decision.text));

	// Owner (if set)
	if (decision.ownerId) {
		nodes.push(paragraph([boldText('Owner: '), text(getUserDisplayName(decision.ownerId))]));
	}

	// Rationale (if provided)
	if (decision.rationale) {
		nodes.push(paragraph([italicText('Rationale: '), text(decision.rationale)]));
	}

	return nodes;
}

function renderActionItem(item: MeetingActionItem): TipTapNode {
	const content: TipTapNode[] = [text(item.text)];

	// Add assignee
	if (item.assigneeId) {
		content.push(text(' — '));
		content.push(boldText(`@${getUserDisplayName(item.assigneeId)}`));
	}

	// Add due date
	if (item.dueDate) {
		content.push(text(` (Due: ${formatDate(item.dueDate)})`));
	}

	return taskItem(false, content);
}
