/**
 * Meetings API — List and Create
 *
 * GET  /api/meetings — List meetings with optional filters
 * POST /api/meetings — Create meeting + attendees atomically
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresMeetingsRepository } from '$lib/server/persistence/meetings-postgres';
import { resolveSpaceIdAccessible } from '$lib/server/persistence/spaces-postgres';
import type { CreateMeetingInput, MeetingListFilter, MeetingStatus } from '$lib/types/meetings';
import { runLazyTransitions } from '$lib/server/services/meeting-lifecycle';

/**
 * GET /api/meetings
 * Query params:
 * - spaceId: Filter by space (slug or ID, resolved)
 * - areaId: Filter by area ID
 * - status: Filter by status (comma-separated for multiple)
 * - fromDate: ISO date — only meetings scheduled on/after
 * - toDate: ISO date — only meetings scheduled on/before
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		// Run lazy status transitions (scheduled/in_progress → awaiting_capture for overdue)
		await runLazyTransitions(userId);

		const filter: MeetingListFilter = {};

		// Resolve space identifier
		const spaceParam = url.searchParams.get('spaceId');
		if (spaceParam) {
			const resolvedId = await resolveSpaceIdAccessible(spaceParam, userId);
			if (!resolvedId) {
				return json({ error: `Space not found: ${spaceParam}` }, { status: 404 });
			}
			filter.spaceId = resolvedId;
		}

		const areaId = url.searchParams.get('areaId');
		if (areaId) filter.areaId = areaId;

		const statusParam = url.searchParams.get('status');
		if (statusParam) {
			const statuses = statusParam.split(',') as MeetingStatus[];
			filter.status = statuses.length === 1 ? statuses[0] : statuses;
		}

		const fromDate = url.searchParams.get('fromDate');
		if (fromDate) filter.fromDate = new Date(fromDate);

		const toDate = url.searchParams.get('toDate');
		if (toDate) filter.toDate = new Date(toDate);

		const meetings = await postgresMeetingsRepository.findAll(userId, filter);
		return json({ meetings });
	} catch (error) {
		console.error('Failed to fetch meetings:', error);
		return json(
			{ error: 'Failed to fetch meetings', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/meetings
 * Body: {
 *   title: string (required),
 *   purpose?: string,
 *   durationMinutes?: number,
 *   spaceId: string (required — slug or ID),
 *   areaId?: string,
 *   expectedOutcomes?: ExpectedOutcome[],
 *   scheduledStart?: ISO string,
 *   scheduledEnd?: ISO string,
 *   attendees?: { email, displayName?, userId?, attendeeType?, isOwner? }[]
 * }
 * Returns: MeetingWithAttendees (201)
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const body = await request.json();

		// Validate required fields
		if (!body.title) {
			return json({ error: 'Missing required field: title' }, { status: 400 });
		}
		if (!body.spaceId) {
			return json({ error: 'Missing required field: spaceId' }, { status: 400 });
		}

		// Resolve space
		const resolvedSpaceId = await resolveSpaceIdAccessible(body.spaceId, userId);
		if (!resolvedSpaceId) {
			return json({ error: `Space not found: ${body.spaceId}` }, { status: 404 });
		}

		const input: CreateMeetingInput = {
			title: body.title,
			purpose: body.purpose,
			durationMinutes: body.durationMinutes,
			spaceId: resolvedSpaceId,
			areaId: body.areaId,
			expectedOutcomes: body.expectedOutcomes,
			scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : undefined,
			scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : undefined,
			attendees: body.attendees
		};

		const meeting = await postgresMeetingsRepository.create(input, userId);
		return json({ meeting }, { status: 201 });
	} catch (error) {
		console.error('Failed to create meeting:', error);
		return json(
			{ error: 'Failed to create meeting', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
