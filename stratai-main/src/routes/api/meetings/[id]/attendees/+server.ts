/**
 * Meeting Attendees API — List and Add
 *
 * GET  /api/meetings/[id]/attendees — List attendees for a meeting
 * POST /api/meetings/[id]/attendees — Add attendee to a meeting
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresMeetingsRepository } from '$lib/server/persistence/meetings-postgres';
import { postgresMeetingAttendeesRepository } from '$lib/server/persistence/meeting-attendees-postgres';

/**
 * GET /api/meetings/[id]/attendees
 * Returns list of attendees ordered by role/type
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		// Verify user has access to meeting
		const meeting = await postgresMeetingsRepository.findById(params.id, userId);
		if (!meeting) {
			return json({ error: 'Meeting not found' }, { status: 404 });
		}

		const attendees = await postgresMeetingAttendeesRepository.findByMeeting(params.id);
		return json({ attendees });
	} catch (error) {
		console.error('Failed to fetch attendees:', error);
		return json(
			{ error: 'Failed to fetch attendees', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/meetings/[id]/attendees
 * Body: { email: string (required), displayName?, userId?, attendeeType?, isOwner? }
 * Returns: MeetingAttendee (201)
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		// Verify user has access to meeting
		const meeting = await postgresMeetingsRepository.findById(params.id, userId);
		if (!meeting) {
			return json({ error: 'Meeting not found' }, { status: 404 });
		}

		const body = await request.json();

		if (!body.email) {
			return json({ error: 'Missing required field: email' }, { status: 400 });
		}

		const attendee = await postgresMeetingAttendeesRepository.addAttendee(params.id, {
			email: body.email,
			displayName: body.displayName,
			userId: body.userId,
			attendeeType: body.attendeeType,
			isOwner: body.isOwner
		});

		if (!attendee) {
			return json({ error: 'Failed to add attendee' }, { status: 500 });
		}

		return json({ attendee }, { status: 201 });
	} catch (error) {
		console.error('Failed to add attendee:', error);
		return json(
			{ error: 'Failed to add attendee', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
