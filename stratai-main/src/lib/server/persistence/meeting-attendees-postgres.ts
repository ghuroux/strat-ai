/**
 * PostgreSQL implementation of MeetingAttendeesRepository
 *
 * Key design:
 * - Attendee IDs use `mtga_` prefix
 * - ON CONFLICT for idempotent addAttendee (email uniqueness per meeting)
 * - setOwner uses transaction to clear old owner + set new + update meetings.owner_id
 *
 * See: docs/features/MEETING_CREATION_WIZARD.md
 */

import type {
	MeetingAttendee,
	MeetingAttendeeRow,
	CreateAttendeeInput,
	ResponseStatus
} from '$lib/types/meetings';
import { rowToMeetingAttendee } from '$lib/types/meetings';
import type { MeetingAttendeesRepository } from './types';
import { sql } from './db';

/**
 * Generate a unique meeting attendee ID
 */
function generateAttendeeId(): string {
	return `mtga_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * PostgreSQL implementation of MeetingAttendeesRepository
 */
export const postgresMeetingAttendeesRepository: MeetingAttendeesRepository = {
	async findByMeeting(meetingId: string): Promise<MeetingAttendee[]> {
		const rows = await sql<MeetingAttendeeRow[]>`
			SELECT * FROM meeting_attendees
			WHERE meeting_id = ${meetingId}
			ORDER BY
				CASE WHEN attendee_type = 'organizer' THEN 0
					WHEN is_owner THEN 1
					WHEN attendee_type = 'required' THEN 2
					ELSE 3
				END,
				created_at ASC
		`;
		return rows.map(rowToMeetingAttendee);
	},

	async addAttendee(meetingId: string, input: CreateAttendeeInput): Promise<MeetingAttendee | null> {
		const id = generateAttendeeId();
		const now = new Date();

		// Use ON CONFLICT to handle duplicate email per meeting
		const rows = await sql<MeetingAttendeeRow[]>`
			INSERT INTO meeting_attendees (
				id, meeting_id, user_id, email, display_name,
				attendee_type, is_owner, response_status,
				created_at, updated_at
			) VALUES (
				${id},
				${meetingId},
				${input.userId ? sql`${input.userId}::uuid` : null},
				${input.email},
				${input.displayName ?? null},
				${input.attendeeType ?? 'required'},
				${input.isOwner ?? false},
				'pending',
				${now},
				${now}
			)
			ON CONFLICT (meeting_id, email) DO NOTHING
			RETURNING *
		`;

		if (rows.length === 0) {
			// Already exists — return the existing one
			const existing = await sql<MeetingAttendeeRow[]>`
				SELECT * FROM meeting_attendees
				WHERE meeting_id = ${meetingId} AND email = ${input.email}
			`;
			return existing.length > 0 ? rowToMeetingAttendee(existing[0]) : null;
		}

		return rowToMeetingAttendee(rows[0]);
	},

	async addAttendees(meetingId: string, inputs: CreateAttendeeInput[]): Promise<MeetingAttendee[]> {
		const results: MeetingAttendee[] = [];
		for (const input of inputs) {
			const attendee = await this.addAttendee(meetingId, input);
			if (attendee) results.push(attendee);
		}
		return results;
	},

	async removeAttendee(meetingId: string, attendeeId: string): Promise<boolean> {
		const result = await sql`
			DELETE FROM meeting_attendees
			WHERE id = ${attendeeId} AND meeting_id = ${meetingId}
		`;
		return result.count > 0;
	},

	async setOwner(meetingId: string, attendeeId: string): Promise<boolean> {
		// Transaction: clear old owner, set new, update meetings.owner_id
		return await sql.begin(async (tx) => {
			// Get the attendee to find their user_id
			const attendeeRows = await tx<MeetingAttendeeRow[]>`
				SELECT * FROM meeting_attendees
				WHERE id = ${attendeeId} AND meeting_id = ${meetingId}
			`;
			if (attendeeRows.length === 0) return false;
			const attendee = attendeeRows[0];

			// Clear existing owner flag
			await tx`
				UPDATE meeting_attendees
				SET is_owner = false, updated_at = NOW()
				WHERE meeting_id = ${meetingId} AND is_owner = true
			`;

			// Set new owner
			await tx`
				UPDATE meeting_attendees
				SET is_owner = true, updated_at = NOW()
				WHERE id = ${attendeeId} AND meeting_id = ${meetingId}
			`;

			// Update meetings.owner_id
			if (attendee.userId) {
				await tx`
					UPDATE meetings
					SET owner_id = ${attendee.userId}::uuid, updated_at = NOW()
					WHERE id = ${meetingId} AND deleted_at IS NULL
				`;
			} else {
				// External attendee — owner_id stays null but flag is set on attendee
				await tx`
					UPDATE meetings
					SET owner_id = NULL, updated_at = NOW()
					WHERE id = ${meetingId} AND deleted_at IS NULL
				`;
			}

			return true;
		});
	},

	async updateResponseStatus(attendeeId: string, status: ResponseStatus): Promise<MeetingAttendee | null> {
		const rows = await sql<MeetingAttendeeRow[]>`
			UPDATE meeting_attendees
			SET response_status = ${status}, updated_at = NOW()
			WHERE id = ${attendeeId}
			RETURNING *
		`;
		return rows.length > 0 ? rowToMeetingAttendee(rows[0]) : null;
	}
};
