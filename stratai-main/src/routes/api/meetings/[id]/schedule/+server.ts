/**
 * Meeting Schedule API — Orchestrates draft → scheduled transition
 *
 * POST /api/meetings/[id]/schedule
 *
 * Phase 3 enhancement: Server-side orchestration of:
 * 1. Calendar event creation (if connected)
 * 2. Owner task creation (source_type='meeting')
 * 3. Status transition draft → scheduled
 *
 * Graceful degradation: calendar/task failures don't block scheduling.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresMeetingsRepository } from '$lib/server/persistence/meetings-postgres';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';
import { getAuthenticatedCalendarClient } from '$lib/server/integrations/providers/calendar/helpers';
import { generateInviteBodyHtml } from '$lib/server/integrations/providers/calendar/invite-body';

/**
 * POST /api/meetings/[id]/schedule
 *
 * Body (optional):
 *   isOnlineMeeting?: boolean — create Teams meeting link
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		// Parse optional body
		let isOnlineMeeting = false;
		try {
			const body = await request.json();
			isOnlineMeeting = !!body.isOnlineMeeting;
		} catch {
			// Empty body is fine
		}

		// 1. Load meeting with attendees
		const meetingWithAttendees = await postgresMeetingsRepository.findByIdWithAttendees(params.id, userId);
		if (!meetingWithAttendees) {
			return json({ error: 'Meeting not found' }, { status: 404 });
		}

		if (meetingWithAttendees.status !== 'draft') {
			return json({ error: 'Meeting is not in draft status' }, { status: 400 });
		}

		// Orchestration results (non-blocking failures)
		let calendarEventCreated = false;
		let joinUrl: string | undefined;
		let externalEventId: string | undefined;
		let externalJoinUrl: string | undefined;
		let createdTaskId: string | undefined;

		// 2. Calendar event creation (non-blocking)
		if (!meetingWithAttendees.externalEventId && meetingWithAttendees.scheduledStart && meetingWithAttendees.scheduledEnd) {
			try {
				const calResult = await getAuthenticatedCalendarClient(userId);

				if (calResult.connected) {
					// Generate invite body HTML
					const ownerAttendee = meetingWithAttendees.attendees.find(a => a.isOwner);
					const inviteHtml = generateInviteBodyHtml({
						title: meetingWithAttendees.title,
						purpose: meetingWithAttendees.purpose,
						expectedOutcomes: meetingWithAttendees.expectedOutcomes,
						ownerName: ownerAttendee?.displayName,
						areaName: meetingWithAttendees.areaId ? undefined : undefined, // Area name not on meeting entity
						durationMinutes: meetingWithAttendees.durationMinutes
					});

					// Collect attendee emails
					const attendeeEmails = meetingWithAttendees.attendees.map(a => a.email).filter(Boolean);

					// Create calendar event
					const event = await calResult.client.createEvent({
						subject: meetingWithAttendees.title,
						body: inviteHtml,
						start: meetingWithAttendees.scheduledStart.toISOString(),
						end: meetingWithAttendees.scheduledEnd.toISOString(),
						attendees: attendeeEmails,
						isOnlineMeeting
					});

					externalEventId = event.id;
					externalJoinUrl = event.onlineMeeting?.joinUrl || event.onlineMeetingUrl || undefined;
					joinUrl = externalJoinUrl;
					calendarEventCreated = true;

					console.log('[Schedule] Calendar event created:', event.id);
				}
			} catch (calendarError) {
				console.error('[Schedule] Calendar event creation failed (non-blocking):', calendarError);
				// Continue — calendar failure doesn't block scheduling
			}
		}

		// 3. Owner task creation (non-blocking)
		try {
			const task = await postgresTaskRepository.create({
				title: `Prepare for: ${meetingWithAttendees.title}`,
				spaceId: meetingWithAttendees.spaceId,
				areaId: meetingWithAttendees.areaId,
				dueDate: meetingWithAttendees.scheduledStart || undefined,
				dueDateType: 'soft',
				source: {
					type: 'meeting',
					meetingId: meetingWithAttendees.id
				}
			}, userId);

			createdTaskId = task.id;

			// Link task back to meeting
			await postgresMeetingsRepository.update(
				meetingWithAttendees.id,
				{ taskId: task.id },
				userId
			);

			console.log('[Schedule] Owner task created:', task.id);
		} catch (taskError) {
			console.error('[Schedule] Task creation failed (non-blocking):', taskError);
			// Continue — task failure doesn't block scheduling
		}

		// 4. Schedule: transition draft → scheduled
		const meeting = await postgresMeetingsRepository.schedule(params.id, userId, {
			externalEventId,
			externalJoinUrl,
			externalProvider: calendarEventCreated ? 'microsoft' : undefined
		});

		if (!meeting) {
			return json({ error: 'Failed to schedule meeting' }, { status: 500 });
		}

		return json({
			meeting,
			task: createdTaskId ? { id: createdTaskId } : undefined,
			calendarEventCreated,
			joinUrl
		});
	} catch (error) {
		console.error('Failed to schedule meeting:', error);
		return json(
			{ error: 'Failed to schedule meeting', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
