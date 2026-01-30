/**
 * Meeting Finalization Pipeline
 *
 * Orchestrates the post-capture process:
 * 1. Create Meeting Notes page from capture data
 * 2. Create subtasks from confirmed action items
 * 3. Propagate confirmed decisions to Area context
 * 4. Complete the meeting task
 * 5. Transition meeting to 'captured' status
 *
 * Uses partial-failure tolerance: individual step failures
 * don't block the overall process — errors are collected
 * and returned alongside successes.
 *
 * See: docs/features/MEETING_LIFECYCLE.md
 */

import type { Meeting, MeetingAttendee } from '$lib/types/meetings';
import type { CaptureData } from '$lib/types/meeting-capture';
import type { CaptureResult } from '$lib/types/meeting-capture';
import { renderCaptureToDocument } from '$lib/services/template-renderers/capture-renderer';
import { postgresMeetingsRepository } from '$lib/server/persistence/meetings-postgres';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';
import { postgresAreaRepository } from '$lib/server/persistence/areas-postgres';
import { sendTaskAssignmentNotification } from '$lib/server/email/task-notifications';

/**
 * Execute the full finalization pipeline for a captured meeting.
 *
 * @param meeting - The meeting being finalized
 * @param attendees - Meeting attendees (for name resolution)
 * @param captureData - Structured capture data from the wizard
 * @param userId - User performing the capture
 * @param orgId - Organization ID (for email notifications)
 * @returns CaptureResult with created entities and any errors
 */
export async function finalizeMeeting(
	meeting: Meeting,
	attendees: MeetingAttendee[],
	captureData: CaptureData,
	userId: string,
	orgId?: string
): Promise<CaptureResult> {
	const errors: string[] = [];
	let pageResult: { id: string; title: string } | undefined;
	const subtaskResults: { id: string; title: string }[] = [];
	let decisionsCount = 0;

	// Step 1: Create Meeting Notes page (non-blocking)
	try {
		pageResult = await createMeetingNotesPage(meeting, attendees, captureData, userId);
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Unknown error';
		console.error('[Finalize] Page creation failed:', msg);
		errors.push(`Page creation failed: ${msg}`);
	}

	// Step 2: Create subtasks from confirmed action items (non-blocking)
	if (meeting.taskId) {
		const confirmedActions = captureData.actionItems.filter(a => a.confirmed && a.createSubtask);
		for (const action of confirmedActions) {
			try {
				const subtask = await createActionSubtask(meeting, action, userId);
				subtaskResults.push({ id: subtask.id, title: subtask.title });

				// Fire-and-forget: notify assignee if assigned to someone else
				if (orgId && action.assigneeId && action.assigneeId !== userId) {
					sendTaskAssignmentNotification({
						task: subtask as import('$lib/types/tasks').Task,
						assigneeId: action.assigneeId,
						assignerId: userId,
						orgId
					}).catch(console.error);
				}
			} catch (error) {
				const msg = error instanceof Error ? error.message : 'Unknown error';
				console.error(`[Finalize] Subtask creation failed for "${action.text}":`, msg);
				errors.push(`Subtask "${action.text}" failed: ${msg}`);
			}
		}
	}

	// Step 3: Propagate decisions to Area context (non-blocking)
	if (meeting.areaId) {
		const decisionsToPropagate = captureData.decisions.filter(
			d => d.confirmed && d.propagateToContext
		);
		if (decisionsToPropagate.length > 0) {
			try {
				decisionsCount = await propagateDecisionsToArea(
					meeting,
					decisionsToPropagate,
					attendees,
					userId
				);
			} catch (error) {
				const msg = error instanceof Error ? error.message : 'Unknown error';
				console.error('[Finalize] Decision propagation failed:', msg);
				errors.push(`Decision propagation failed: ${msg}`);
			}
		}
	}

	// Step 4: Complete the meeting task (non-blocking)
	if (meeting.taskId) {
		try {
			await postgresTaskRepository.update(meeting.taskId, {
				status: 'completed',
				completionNotes: `Meeting captured${pageResult ? ` — see meeting notes page` : ''}`
			}, userId);
		} catch (error) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			console.error('[Finalize] Task completion failed:', msg);
			errors.push(`Task completion failed: ${msg}`);
		}
	}

	// Step 5: Store capture data and transition to 'captured' status
	const updatedMeeting = await postgresMeetingsRepository.storeCaptureData(
		meeting.id,
		captureData as unknown as Record<string, unknown>,
		'wizard',
		pageResult?.id,
		userId
	);

	return {
		meeting: updatedMeeting || meeting,
		page: pageResult,
		subtasks: subtaskResults,
		decisionsCount,
		errors
	};
}

// ============================================================================
// STEP IMPLEMENTATIONS
// ============================================================================

/**
 * Step 1: Create the Meeting Notes page from capture data
 */
async function createMeetingNotesPage(
	meeting: Meeting,
	attendees: MeetingAttendee[],
	captureData: CaptureData,
	userId: string
): Promise<{ id: string; title: string }> {
	if (!meeting.areaId) {
		throw new Error('Meeting must have an area to create a page');
	}

	const content = renderCaptureToDocument(meeting, captureData, attendees);
	const title = `Meeting Notes: ${meeting.title}`;

	const page = await postgresPageRepository.create({
		title,
		content,
		areaId: meeting.areaId,
		taskId: meeting.taskId,
		pageType: 'meeting_notes',
		visibility: 'area'
	}, userId);

	console.log(`[Finalize] Created meeting notes page: ${page.id}`);
	return { id: page.id, title: page.title };
}

/**
 * Step 2: Create a subtask from a confirmed action item
 */
async function createActionSubtask(
	meeting: Meeting,
	action: import('$lib/types/meeting-capture').CaptureActionItem,
	userId: string
): Promise<{ id: string; title: string; spaceId: string; assigneeId?: string }> {
	if (!meeting.taskId) {
		throw new Error('Meeting must have a task to create subtasks');
	}

	const subtask = await postgresTaskRepository.createSubtask({
		title: action.text,
		parentTaskId: meeting.taskId,
		subtaskType: 'action',
		assigneeId: action.assigneeId
	}, userId);

	console.log(`[Finalize] Created subtask: ${subtask.id} — "${action.text}"${action.assigneeId ? ` (assigned: ${action.assigneeId})` : ''}`);
	return { id: subtask.id, title: subtask.title, spaceId: subtask.spaceId, assigneeId: subtask.assigneeId ?? undefined };
}

/**
 * Step 3: Propagate confirmed decisions to the Area context field
 *
 * Appends a markdown section to the area's context text:
 * ### Decisions from "Meeting Title" (Date)
 * - **Decision text** — Rationale (Owner: Name)
 */
async function propagateDecisionsToArea(
	meeting: Meeting,
	decisions: import('$lib/types/meeting-capture').CaptureDecision[],
	attendees: MeetingAttendee[],
	userId: string
): Promise<number> {
	if (!meeting.areaId) return 0;

	// Fetch current area context
	const area = await postgresAreaRepository.findById(meeting.areaId, userId);
	if (!area) {
		throw new Error(`Area ${meeting.areaId} not found`);
	}

	// Format the decision date
	const dateStr = meeting.scheduledStart
		? meeting.scheduledStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
		: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

	// Build markdown section
	const lines: string[] = [
		'',
		`### Decisions from "${meeting.title}" (${dateStr})`
	];

	for (const decision of decisions) {
		let line = `- **${decision.text}**`;
		if (decision.rationale) {
			line += ` — ${decision.rationale}`;
		}
		if (decision.ownerId) {
			const owner = attendees.find(a => a.userId === decision.ownerId);
			const ownerName = owner?.displayName || owner?.email || 'Assigned';
			line += ` (Owner: ${ownerName})`;
		}
		lines.push(line);
	}

	const decisionBlock = lines.join('\n');

	// Append to existing context or set as new
	const updatedContext = area.context
		? `${area.context}\n${decisionBlock}`
		: decisionBlock.trim();

	await postgresAreaRepository.update(
		meeting.areaId,
		{ context: updatedContext },
		userId
	);

	console.log(`[Finalize] Propagated ${decisions.length} decisions to area ${meeting.areaId}`);
	return decisions.length;
}
