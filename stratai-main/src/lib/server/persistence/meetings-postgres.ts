/**
 * PostgreSQL implementation of MeetingsRepository
 *
 * Key design:
 * - Meeting IDs use `mtg_` prefix (TEXT, like tasks/pages/spaces)
 * - Attendees created atomically with meeting via transaction
 * - Access scoping: user must be organizer, owner, or space member
 * - Soft deletes via deleted_at (organizer only)
 * - JSONB for expected_outcomes and capture_data
 *
 * See: docs/features/MEETING_CREATION_WIZARD.md
 */

import type {
	Meeting,
	MeetingRow,
	MeetingWithAttendees,
	CreateMeetingInput,
	UpdateMeetingInput,
	MeetingListFilter,
	MeetingStatus
} from '$lib/types/meetings';
import { rowToMeeting, rowToMeetingAttendee } from '$lib/types/meetings';
import type { MeetingAttendeeRow } from '$lib/types/meetings';
import type { MeetingsRepository } from './types';
import { sql, type JSONValue } from './db';

/**
 * Generate a unique meeting ID
 */
function generateMeetingId(): string {
	return `mtg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique meeting attendee ID
 */
function generateAttendeeId(): string {
	return `mtga_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if user has access to a meeting
 * User must be organizer, owner, or a member of the meeting's space
 */
async function userCanAccessMeeting(meetingId: string, userId: string): Promise<boolean> {
	const rows = await sql<{ hasAccess: boolean }[]>`
		SELECT EXISTS (
			SELECT 1 FROM meetings m
			WHERE m.id = ${meetingId}
				AND m.deleted_at IS NULL
				AND (
					m.organizer_id = ${userId}::uuid
					OR m.owner_id = ${userId}::uuid
					OR EXISTS (
						SELECT 1 FROM space_memberships sm
						WHERE sm.space_id = m.space_id
							AND sm.user_id = ${userId}::uuid
					)
				)
		) AS has_access
	`;
	return rows[0]?.hasAccess ?? false;
}

/**
 * PostgreSQL implementation of MeetingsRepository
 */
export const postgresMeetingsRepository: MeetingsRepository = {
	async findById(id: string, userId: string): Promise<Meeting | null> {
		const hasAccess = await userCanAccessMeeting(id, userId);
		if (!hasAccess) return null;

		const rows = await sql<MeetingRow[]>`
			SELECT * FROM meetings
			WHERE id = ${id} AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToMeeting(rows[0]) : null;
	},

	async findByIdWithAttendees(id: string, userId: string): Promise<MeetingWithAttendees | null> {
		const meeting = await this.findById(id, userId);
		if (!meeting) return null;

		const attendeeRows = await sql<MeetingAttendeeRow[]>`
			SELECT * FROM meeting_attendees
			WHERE meeting_id = ${id}
			ORDER BY
				CASE WHEN attendee_type = 'organizer' THEN 0
					WHEN is_owner THEN 1
					WHEN attendee_type = 'required' THEN 2
					ELSE 3
				END,
				created_at ASC
		`;

		return {
			...meeting,
			attendees: attendeeRows.map(rowToMeetingAttendee)
		};
	},

	async findAll(userId: string, filter?: MeetingListFilter): Promise<Meeting[]> {
		// Build dynamic filter fragments
		const spaceFilter = filter?.spaceId
			? sql`AND m.space_id = ${filter.spaceId}`
			: sql``;

		const areaFilter = filter?.areaId
			? sql`AND m.area_id = ${filter.areaId}`
			: sql``;

		let statusFilter = sql``;
		if (filter?.status) {
			const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
			statusFilter = sql`AND m.status = ANY(${statuses})`;
		}

		const fromDateFilter = filter?.fromDate
			? sql`AND m.scheduled_start >= ${filter.fromDate}`
			: sql``;

		const toDateFilter = filter?.toDate
			? sql`AND m.scheduled_start <= ${filter.toDate}`
			: sql``;

		const rows = await sql<MeetingRow[]>`
			SELECT m.* FROM meetings m
			WHERE m.deleted_at IS NULL
				AND (
					m.organizer_id = ${userId}::uuid
					OR m.owner_id = ${userId}::uuid
					OR EXISTS (
						SELECT 1 FROM space_memberships sm
						WHERE sm.space_id = m.space_id
							AND sm.user_id = ${userId}::uuid
					)
				)
				${spaceFilter}
				${areaFilter}
				${statusFilter}
				${fromDateFilter}
				${toDateFilter}
			ORDER BY
				CASE WHEN m.scheduled_start IS NOT NULL THEN m.scheduled_start
					ELSE m.created_at
				END DESC
		`;

		return rows.map(rowToMeeting);
	},

	async create(input: CreateMeetingInput, userId: string): Promise<MeetingWithAttendees> {
		const meetingId = generateMeetingId();
		const now = new Date();

		// Use transaction to create meeting + attendees atomically
		const result = await sql.begin(async (tx) => {
			// Insert meeting
			await tx`
				INSERT INTO meetings (
					id, title, purpose, duration_minutes,
					space_id, area_id,
					organizer_id, status,
					expected_outcomes,
					scheduled_start, scheduled_end,
					created_at, updated_at
				) VALUES (
					${meetingId},
					${input.title},
					${input.purpose ?? null},
					${input.durationMinutes ?? 30},
					${input.spaceId},
					${input.areaId ?? null},
					${userId}::uuid,
					'draft',
					${input.expectedOutcomes ? tx.json(input.expectedOutcomes as unknown as JSONValue) : sql`'[]'::jsonb`},
					${input.scheduledStart ?? null},
					${input.scheduledEnd ?? null},
					${now},
					${now}
				)
			`;

			// Insert attendees if provided
			const attendees = [];
			if (input.attendees && input.attendees.length > 0) {
				for (const attendee of input.attendees) {
					const attendeeId = generateAttendeeId();
					await tx`
						INSERT INTO meeting_attendees (
							id, meeting_id, user_id, email, display_name,
							attendee_type, is_owner, response_status,
							created_at, updated_at
						) VALUES (
							${attendeeId},
							${meetingId},
							${attendee.userId ? tx`${attendee.userId}::uuid` : null},
							${attendee.email},
							${attendee.displayName ?? null},
							${attendee.attendeeType ?? 'required'},
							${attendee.isOwner ?? false},
							'pending',
							${now},
							${now}
						)
						ON CONFLICT (meeting_id, email) DO NOTHING
					`;
					attendees.push({
						id: attendeeId,
						meetingId,
						email: attendee.email,
						displayName: attendee.displayName,
						userId: attendee.userId,
						attendeeType: attendee.attendeeType ?? 'required',
						isOwner: attendee.isOwner ?? false,
						responseStatus: 'pending' as const,
						createdAt: now,
						updatedAt: now
					});
				}
			}

			return { meetingId, attendees };
		});

		// Fetch the complete meeting with attendees
		const meeting = await this.findByIdWithAttendees(result.meetingId, userId);
		if (!meeting) throw new Error('Failed to create meeting');
		return meeting;
	},

	async update(id: string, updates: UpdateMeetingInput, userId: string): Promise<Meeting | null> {
		const hasAccess = await userCanAccessMeeting(id, userId);
		if (!hasAccess) return null;

		await sql`
			UPDATE meetings
			SET
				title = COALESCE(${updates.title ?? null}, title),
				purpose = ${updates.purpose === null ? null : updates.purpose ?? sql`purpose`},
				duration_minutes = COALESCE(${updates.durationMinutes ?? null}, duration_minutes),
				area_id = ${updates.areaId === null ? null : updates.areaId ?? sql`area_id`},
				owner_id = ${updates.ownerId === null ? null : updates.ownerId !== undefined ? sql`${updates.ownerId}::uuid` : sql`owner_id`},
				expected_outcomes = ${updates.expectedOutcomes !== undefined ? sql.json(updates.expectedOutcomes as unknown as JSONValue) : sql`expected_outcomes`},
				scheduled_start = ${updates.scheduledStart === null ? null : updates.scheduledStart ?? sql`scheduled_start`},
				scheduled_end = ${updates.scheduledEnd === null ? null : updates.scheduledEnd ?? sql`scheduled_end`},
				capture_method = ${updates.captureMethod === null ? null : updates.captureMethod ?? sql`capture_method`},
				task_id = ${updates.taskId ?? sql`task_id`},
				updated_at = NOW()
			WHERE id = ${id}
				AND deleted_at IS NULL
		`;

		return this.findById(id, userId);
	},

	async delete(id: string, userId: string): Promise<boolean> {
		// Only organizer can delete
		const result = await sql`
			UPDATE meetings
			SET deleted_at = NOW()
			WHERE id = ${id}
				AND organizer_id = ${userId}::uuid
				AND deleted_at IS NULL
		`;
		return result.count > 0;
	},

	async schedule(
		id: string,
		userId: string,
		options?: { externalEventId?: string; externalJoinUrl?: string; externalProvider?: string }
	): Promise<Meeting | null> {
		const hasAccess = await userCanAccessMeeting(id, userId);
		if (!hasAccess) return null;

		// Validate current status is 'draft'
		const current = await this.findById(id, userId);
		if (!current || current.status !== 'draft') return null;

		await sql`
			UPDATE meetings
			SET
				status = 'scheduled',
				external_event_id = COALESCE(${options?.externalEventId ?? null}, external_event_id),
				external_join_url = COALESCE(${options?.externalJoinUrl ?? null}, external_join_url),
				external_provider = COALESCE(${options?.externalProvider ?? null}, external_provider),
				updated_at = NOW()
			WHERE id = ${id}
				AND status = 'draft'
				AND deleted_at IS NULL
		`;

		return this.findById(id, userId);
	},

	async cancel(id: string, userId: string): Promise<Meeting | null> {
		const hasAccess = await userCanAccessMeeting(id, userId);
		if (!hasAccess) return null;

		// Can cancel from draft or scheduled
		await sql`
			UPDATE meetings
			SET status = 'cancelled', updated_at = NOW()
			WHERE id = ${id}
				AND status IN ('draft', 'scheduled')
				AND deleted_at IS NULL
		`;

		return this.findById(id, userId);
	},

	async complete(id: string, userId: string): Promise<Meeting | null> {
		const hasAccess = await userCanAccessMeeting(id, userId);
		if (!hasAccess) return null;

		// Can complete from scheduled or in_progress
		await sql`
			UPDATE meetings
			SET status = 'completed', updated_at = NOW()
			WHERE id = ${id}
				AND status IN ('scheduled', 'in_progress')
				AND deleted_at IS NULL
		`;

		return this.findById(id, userId);
	},

	async findByArea(areaId: string, userId: string, status?: MeetingStatus | MeetingStatus[]): Promise<Meeting[]> {
		return this.findAll(userId, { areaId, status });
	},

	async findBySpace(spaceId: string, userId: string, status?: MeetingStatus | MeetingStatus[]): Promise<Meeting[]> {
		return this.findAll(userId, { spaceId, status });
	},

	async findUpcoming(userId: string, limit = 10): Promise<Meeting[]> {
		const rows = await sql<MeetingRow[]>`
			SELECT m.* FROM meetings m
			WHERE m.deleted_at IS NULL
				AND m.status = 'scheduled'
				AND m.scheduled_start >= NOW()
				AND (
					m.organizer_id = ${userId}::uuid
					OR m.owner_id = ${userId}::uuid
					OR EXISTS (
						SELECT 1 FROM meeting_attendees ma
						WHERE ma.meeting_id = m.id AND ma.user_id = ${userId}::uuid
					)
					OR EXISTS (
						SELECT 1 FROM space_memberships sm
						WHERE sm.space_id = m.space_id AND sm.user_id = ${userId}::uuid
					)
				)
			ORDER BY m.scheduled_start ASC
			LIMIT ${limit}
		`;
		return rows.map(rowToMeeting);
	},

	async findAwaitingCapture(userId: string): Promise<Meeting[]> {
		const rows = await sql<MeetingRow[]>`
			SELECT m.* FROM meetings m
			WHERE m.deleted_at IS NULL
				AND m.status = 'awaiting_capture'
				AND (
					m.organizer_id = ${userId}::uuid
					OR m.owner_id = ${userId}::uuid
					OR EXISTS (
						SELECT 1 FROM space_memberships sm
						WHERE sm.space_id = m.space_id AND sm.user_id = ${userId}::uuid
					)
				)
			ORDER BY m.scheduled_end DESC
		`;
		return rows.map(rowToMeeting);
	},

	async findAwaitingCaptureByArea(areaId: string, userId: string): Promise<Meeting[]> {
		const rows = await sql<MeetingRow[]>`
			SELECT m.* FROM meetings m
			WHERE m.deleted_at IS NULL
				AND m.status = 'awaiting_capture'
				AND m.area_id = ${areaId}
				AND (
					m.organizer_id = ${userId}::uuid
					OR m.owner_id = ${userId}::uuid
					OR EXISTS (
						SELECT 1 FROM space_memberships sm
						WHERE sm.space_id = m.space_id AND sm.user_id = ${userId}::uuid
					)
				)
			ORDER BY m.scheduled_end DESC
		`;
		return rows.map(rowToMeeting);
	},

	async transitionToAwaitingCapture(id: string, userId: string): Promise<Meeting | null> {
		const hasAccess = await userCanAccessMeeting(id, userId);
		if (!hasAccess) return null;

		await sql`
			UPDATE meetings
			SET status = 'awaiting_capture', updated_at = NOW()
			WHERE id = ${id}
				AND status IN ('scheduled', 'in_progress', 'completed')
				AND deleted_at IS NULL
		`;

		return this.findById(id, userId);
	},

	async storeCaptureData(
		id: string,
		captureData: Record<string, unknown>,
		captureMethod: string,
		pageId?: string,
		userId?: string
	): Promise<Meeting | null> {
		await sql`
			UPDATE meetings
			SET
				status = 'captured',
				capture_data = ${sql.json(captureData as JSONValue)},
				capture_method = ${captureMethod},
				page_id = COALESCE(${pageId ?? null}, page_id),
				updated_at = NOW()
			WHERE id = ${id}
				AND deleted_at IS NULL
		`;

		if (userId) {
			return this.findById(id, userId);
		}
		// Return without access check when userId not provided (internal service call)
		const rows = await sql<MeetingRow[]>`
			SELECT * FROM meetings WHERE id = ${id} AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToMeeting(rows[0]) : null;
	}
};
