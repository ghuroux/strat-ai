/**
 * Awaiting Capture API — List meetings needing post-meeting capture
 *
 * GET /api/meetings/awaiting-capture
 *
 * Triggers lazy status transitions before returning results,
 * ensuring meetings past their scheduled_end are automatically
 * moved to awaiting_capture status.
 *
 * Query params:
 * - areaId: Filter to specific area (optional)
 *
 * Returns: { meetings: Meeting[], count: number, transitioned: number }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresMeetingsRepository } from '$lib/server/persistence/meetings-postgres';
import { runLazyTransitions } from '$lib/server/services/meeting-lifecycle';

/**
 * GET /api/meetings/awaiting-capture
 * Returns meetings needing capture, after running lazy status transitions
 *
 * Query params:
 * - areaId: Filter by area ID (optional)
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		// Run lazy transitions first — moves overdue meetings to awaiting_capture
		const transitions = await runLazyTransitions(userId);

		// Fetch meetings awaiting capture
		const areaId = url.searchParams.get('areaId');
		const meetings = areaId
			? await postgresMeetingsRepository.findAwaitingCaptureByArea(areaId, userId)
			: await postgresMeetingsRepository.findAwaitingCapture(userId);

		return json({
			meetings,
			count: meetings.length,
			transitioned: transitions.transitionedToCapture
		});
	} catch (error) {
		console.error('Failed to fetch awaiting-capture meetings:', error);
		return json(
			{ error: 'Failed to fetch meetings', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
