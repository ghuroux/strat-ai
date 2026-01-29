/**
 * Meetings API — Individual Meeting Operations
 *
 * GET    /api/meetings/[id] — Get meeting with attendees
 * PATCH  /api/meetings/[id] — Update meeting fields
 * DELETE /api/meetings/[id] — Soft delete (organizer only)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresMeetingsRepository } from '$lib/server/persistence/meetings-postgres';
import type { UpdateMeetingInput } from '$lib/types/meetings';

/**
 * GET /api/meetings/[id]
 * Returns meeting with attendees
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
		return json({ meeting });
	} catch (error) {
		console.error('Failed to fetch meeting:', error);
		return json(
			{ error: 'Failed to fetch meeting', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/meetings/[id]
 * Body: { title?, purpose?, durationMinutes?, areaId?, ownerId?, expectedOutcomes?,
 *         scheduledStart?, scheduledEnd?, captureMethod? }
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const body = await request.json();

		const updates: UpdateMeetingInput = {};

		if (body.title !== undefined) updates.title = body.title;
		if (body.purpose !== undefined) updates.purpose = body.purpose;
		if (body.durationMinutes !== undefined) updates.durationMinutes = body.durationMinutes;
		if (body.areaId !== undefined) updates.areaId = body.areaId || null;
		if (body.ownerId !== undefined) updates.ownerId = body.ownerId || null;
		if (body.expectedOutcomes !== undefined) updates.expectedOutcomes = body.expectedOutcomes;
		if (body.scheduledStart !== undefined) {
			updates.scheduledStart = body.scheduledStart ? new Date(body.scheduledStart) : null;
		}
		if (body.scheduledEnd !== undefined) {
			updates.scheduledEnd = body.scheduledEnd ? new Date(body.scheduledEnd) : null;
		}
		if (body.captureMethod !== undefined) updates.captureMethod = body.captureMethod || null;

		const meeting = await postgresMeetingsRepository.update(params.id, updates, userId);
		if (!meeting) {
			return json({ error: 'Meeting not found' }, { status: 404 });
		}
		return json({ meeting });
	} catch (error) {
		console.error('Failed to update meeting:', error);
		return json(
			{ error: 'Failed to update meeting', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/meetings/[id]
 * Soft delete — organizer only
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const deleted = await postgresMeetingsRepository.delete(params.id, userId);
		if (!deleted) {
			return json({ error: 'Meeting not found or not organizer' }, { status: 404 });
		}
		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete meeting:', error);
		return json(
			{ error: 'Failed to delete meeting', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
