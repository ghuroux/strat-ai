/**
 * Meeting Lifecycle Service — Status Transition Engine
 *
 * Handles lazy detection of overdue meetings and status transitions.
 * Called from API endpoints instead of a cron job — "lazy evaluation"
 * pattern that avoids infrastructure complexity.
 *
 * Key transitions:
 * - scheduled/in_progress → awaiting_capture (when scheduled_end has passed)
 * - awaiting_capture → captured (auto-expire after 7 days with no capture)
 *
 * See: docs/features/MEETING_LIFECYCLE.md
 */

import { sql } from '$lib/server/persistence/db';
import type { MeetingRow } from '$lib/types/meetings';
import { rowToMeeting } from '$lib/types/meetings';
import type { Meeting } from '$lib/types/meetings';

/**
 * Transition overdue meetings to awaiting_capture status.
 *
 * Finds meetings where scheduled_end has passed and status is still
 * scheduled or in_progress, then transitions them to awaiting_capture.
 *
 * Scoped to user's accessible meetings (organizer, owner, or space member).
 * Returns the count of transitioned meetings for toast notifications.
 */
export async function transitionOverdueMeetings(userId: string): Promise<{
	transitionedCount: number;
	meetings: Meeting[];
}> {
	const rows = await sql<MeetingRow[]>`
		UPDATE meetings
		SET
			status = 'awaiting_capture',
			updated_at = NOW()
		WHERE deleted_at IS NULL
			AND status IN ('scheduled', 'in_progress')
			AND scheduled_end < NOW()
			AND (
				organizer_id = ${userId}::uuid
				OR owner_id = ${userId}::uuid
				OR EXISTS (
					SELECT 1 FROM space_memberships sm
					WHERE sm.space_id = meetings.space_id
						AND sm.user_id = ${userId}::uuid
				)
			)
		RETURNING *
	`;

	return {
		transitionedCount: rows.length,
		meetings: rows.map(rowToMeeting)
	};
}

/**
 * Auto-expire meetings that have been awaiting_capture for > 7 days.
 *
 * These meetings get transitioned to 'captured' with capture_method='auto_expired'
 * and minimal capture_data. No page or subtasks are created.
 */
export async function autoExpireOverdueCapturedMeetings(userId: string): Promise<number> {
	const result = await sql`
		UPDATE meetings
		SET
			status = 'captured',
			capture_method = 'auto_expired',
			capture_data = jsonb_build_object(
				'version', 1,
				'summary', 'Meeting capture expired after 7 days without action.',
				'outcomeResolutions', '[]'::jsonb,
				'decisions', '[]'::jsonb,
				'actionItems', '[]'::jsonb,
				'captureStartedAt', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
				'captureCompletedAt', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
			),
			updated_at = NOW()
		WHERE deleted_at IS NULL
			AND status = 'awaiting_capture'
			AND updated_at < NOW() - INTERVAL '7 days'
			AND (
				organizer_id = ${userId}::uuid
				OR owner_id = ${userId}::uuid
				OR EXISTS (
					SELECT 1 FROM space_memberships sm
					WHERE sm.space_id = meetings.space_id
						AND sm.user_id = ${userId}::uuid
				)
			)
	`;

	return result.count;
}

/**
 * Run all lazy lifecycle transitions for a user.
 *
 * Call this from API endpoints that list meetings to ensure
 * status is always fresh without requiring a cron job.
 */
export async function runLazyTransitions(userId: string): Promise<{
	transitionedToCapture: number;
	autoExpired: number;
}> {
	const [captureResult, expiredCount] = await Promise.all([
		transitionOverdueMeetings(userId),
		autoExpireOverdueCapturedMeetings(userId)
	]);

	if (captureResult.transitionedCount > 0) {
		console.log(`[MeetingLifecycle] Transitioned ${captureResult.transitionedCount} meetings to awaiting_capture for user ${userId}`);
	}
	if (expiredCount > 0) {
		console.log(`[MeetingLifecycle] Auto-expired ${expiredCount} meetings for user ${userId}`);
	}

	return {
		transitionedToCapture: captureResult.transitionedCount,
		autoExpired: expiredCount
	};
}
