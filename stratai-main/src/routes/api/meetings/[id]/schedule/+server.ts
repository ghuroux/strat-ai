/**
 * Meeting Schedule API — Transition draft → scheduled
 *
 * POST /api/meetings/[id]/schedule — Schedule a draft meeting
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresMeetingsRepository } from '$lib/server/persistence/meetings-postgres';

/**
 * POST /api/meetings/[id]/schedule
 * Transitions meeting from 'draft' to 'scheduled'
 *
 * Optional body: {
 *   externalEventId?: string,  — Calendar event ID (Graph API)
 *   externalJoinUrl?: string,  — Teams/Zoom join URL
 *   externalProvider?: 'microsoft' | 'google'
 * }
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		let options: { externalEventId?: string; externalJoinUrl?: string; externalProvider?: string } | undefined;

		// Body is optional — schedule can work without calendar integration
		try {
			const body = await request.json();
			if (body.externalEventId || body.externalJoinUrl || body.externalProvider) {
				options = {
					externalEventId: body.externalEventId,
					externalJoinUrl: body.externalJoinUrl,
					externalProvider: body.externalProvider
				};
			}
		} catch {
			// Empty body is fine
		}

		const meeting = await postgresMeetingsRepository.schedule(params.id, userId, options);
		if (!meeting) {
			return json(
				{ error: 'Meeting not found or not in draft status' },
				{ status: 400 }
			);
		}

		return json({ meeting });
	} catch (error) {
		console.error('Failed to schedule meeting:', error);
		return json(
			{ error: 'Failed to schedule meeting', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
