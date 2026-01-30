/**
 * Task Assignment Notification Service
 *
 * Sends email notifications when tasks are assigned to other users.
 * Fire-and-forget pattern: callers don't await, errors are logged but don't block.
 */

import type { Task } from '$lib/types/tasks';
import { sendEmail } from './sendgrid';
import { getTaskAssignedEmail, buildTaskLink } from './templates/task-assigned';
import { sql } from '$lib/server/persistence/db';

interface SendTaskAssignmentParams {
	task: Task;
	assigneeId: string;
	assignerId: string;
	orgId: string;
}

/**
 * Send a task assignment email notification.
 *
 * Skips silently if:
 * - assigneeId === assignerId (self-assignment)
 * - Assignee user not found
 * - Assigner user not found
 */
export async function sendTaskAssignmentNotification(params: SendTaskAssignmentParams): Promise<void> {
	const { task, assigneeId, assignerId, orgId } = params;

	// Skip self-assignment
	if (assigneeId === assignerId) return;

	try {
		// Look up assignee
		const assigneeRows = await sql<{ email: string; displayName: string | null; firstName: string | null }[]>`
			SELECT email, display_name, first_name
			FROM users
			WHERE id = ${assigneeId} AND deleted_at IS NULL
		`;
		if (assigneeRows.length === 0) {
			console.warn('[TaskNotification] Assignee not found:', assigneeId);
			return;
		}
		const assignee = assigneeRows[0];
		const assigneeName = assignee.displayName || assignee.firstName || assignee.email.split('@')[0];

		// Look up assigner
		const assignerRows = await sql<{ displayName: string | null; firstName: string | null; email: string }[]>`
			SELECT display_name, first_name, email
			FROM users
			WHERE id = ${assignerId} AND deleted_at IS NULL
		`;
		if (assignerRows.length === 0) {
			console.warn('[TaskNotification] Assigner not found:', assignerId);
			return;
		}
		const assigner = assignerRows[0];
		const assignerName = assigner.displayName || assigner.firstName || assigner.email.split('@')[0];

		// Look up space name and slug
		const spaceRows = await sql<{ name: string; slug: string }[]>`
			SELECT name, slug FROM spaces WHERE id = ${task.spaceId}
		`;
		const spaceName = spaceRows[0]?.name || 'Unknown Space';
		const spaceSlug = spaceRows[0]?.slug || task.spaceId;

		// Look up area name (optional)
		let areaName: string | undefined;
		if (task.areaId) {
			const areaRows = await sql<{ name: string }[]>`
				SELECT name FROM areas WHERE id = ${task.areaId} AND deleted_at IS NULL
			`;
			areaName = areaRows[0]?.name;
		}

		// Format due date
		let dueDateStr: string | undefined;
		if (task.dueDate) {
			dueDateStr = new Date(task.dueDate).toLocaleDateString('en-US', {
				month: 'short', day: 'numeric', year: 'numeric'
			});
		}

		// Build email
		const taskLink = buildTaskLink(spaceSlug, task.id);
		const { subject, html, text } = getTaskAssignedEmail({
			assigneeName,
			assignerName,
			taskTitle: task.title,
			taskDescription: task.description,
			dueDate: dueDateStr,
			priority: task.priority,
			spaceName,
			areaName,
			taskLink
		});

		// Send (fire-and-forget)
		await sendEmail({
			to: assignee.email,
			subject,
			html,
			text,
			orgId,
			userId: assigneeId,
			emailType: 'task_assigned',
			metadata: {
				taskId: task.id,
				assignerId,
				spaceName
			}
		});

		console.log(`[TaskNotification] Sent assignment email to ${assignee.email} for task "${task.title}"`);
	} catch (error) {
		console.error('[TaskNotification] Failed to send assignment notification:', error);
	}
}
