/**
 * Meeting Capture API — Submit capture data & orchestrate finalization
 *
 * POST /api/meetings/[id]/capture
 *
 * Accepts CaptureData from the wizard and orchestrates the full
 * finalization pipeline:
 * 1. Create Meeting Notes page
 * 2. Create subtasks from confirmed action items
 * 3. Propagate confirmed decisions to Area context
 * 4. Complete the meeting task
 * 5. Transition meeting status to 'captured'
 *
 * Uses partial-failure tolerance — individual step failures don't
 * block the overall process. Errors are collected and returned.
 *
 * Returns: { meeting, page?, subtasks[], decisionsCount, errors[] }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresMeetingsRepository } from '$lib/server/persistence/meetings-postgres';
import { finalizeMeeting } from '$lib/server/services/meeting-finalize';
import type { CaptureData } from '$lib/types/meeting-capture';

/**
 * POST /api/meetings/[id]/capture
 * Submit capture data and finalize the meeting
 *
 * Path params:
 * - id: Meeting ID
 *
 * Body: CaptureData — structured capture from wizard
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const body = await request.json();

		// Validate capture data
		if (!body || typeof body !== 'object') {
			return json({ error: 'Invalid capture data' }, { status: 400 });
		}

		const captureData = body as CaptureData;

		// Basic structural validation
		if (captureData.version !== 1) {
			return json({ error: 'Unsupported capture data version' }, { status: 400 });
		}
		if (!Array.isArray(captureData.outcomeResolutions)) {
			return json({ error: 'outcomeResolutions must be an array' }, { status: 400 });
		}
		if (!Array.isArray(captureData.decisions)) {
			return json({ error: 'decisions must be an array' }, { status: 400 });
		}
		if (!Array.isArray(captureData.actionItems)) {
			return json({ error: 'actionItems must be an array' }, { status: 400 });
		}

		// Load meeting with attendees
		const meeting = await postgresMeetingsRepository.findByIdWithAttendees(params.id, userId);
		if (!meeting) {
			return json({ error: 'Meeting not found' }, { status: 404 });
		}

		// Validate status allows capture
		if (meeting.status === 'captured') {
			return json({ error: 'Meeting has already been captured' }, { status: 409 });
		}
		if (meeting.status === 'cancelled') {
			return json({ error: 'Cannot capture a cancelled meeting' }, { status: 400 });
		}
		if (meeting.status === 'draft') {
			return json({ error: 'Cannot capture a draft meeting' }, { status: 400 });
		}

		// Set completion timestamp
		captureData.captureCompletedAt = new Date().toISOString();

		// Execute finalization pipeline
		const result = await finalizeMeeting(
			meeting,
			meeting.attendees,
			captureData,
			userId,
			locals.session.organizationId
		);

		// Log results
		console.log(`[Capture] Meeting ${params.id} captured:`, {
			page: result.page?.id,
			subtasks: result.subtasks.length,
			decisions: result.decisionsCount,
			errors: result.errors.length
		});

		return json(result, { status: 200 });
	} catch (error) {
		console.error('Failed to capture meeting:', error);
		return json(
			{ error: 'Failed to capture meeting', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
