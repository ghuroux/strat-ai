/**
 * Capture Status API — Pre-populate the capture wizard
 *
 * GET /api/meetings/[id]/capture-status
 *
 * Returns meeting details + attendees needed to open/resume
 * the capture wizard. The expected outcomes from creation
 * become the pre-populated checklist for the "bridge moment".
 *
 * Returns: { meeting: MeetingWithAttendees, canCapture: boolean, reason?: string }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresMeetingsRepository } from '$lib/server/persistence/meetings-postgres';

/**
 * GET /api/meetings/[id]/capture-status
 * Returns meeting + attendees for wizard pre-population
 *
 * Path params:
 * - id: Meeting ID
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const meeting = await postgresMeetingsRepository.findByIdWithAttendees(params.id, userId);

		if (!meeting) {
			return json({ error: 'Meeting not found' }, { status: 404 });
		}

		// Determine if capture is possible
		let canCapture = true;
		let reason: string | undefined;

		if (meeting.status === 'captured') {
			canCapture = false;
			reason = 'Meeting has already been captured';
		} else if (meeting.status === 'cancelled') {
			canCapture = false;
			reason = 'Meeting was cancelled';
		} else if (meeting.status === 'draft') {
			canCapture = false;
			reason = 'Meeting is still in draft status';
		}

		return json({
			meeting,
			canCapture,
			reason
		});
	} catch (error) {
		console.error('Failed to fetch capture status:', error);
		return json(
			{ error: 'Failed to fetch capture status', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
