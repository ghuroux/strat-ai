/**
 * Email Logs Repository
 *
 * Audit trail for all emails sent through the system.
 * See: docs/SENDGRID_EMAIL_INTEGRATION.md
 */

import { sql, type JSONValue } from './db';
import type { EmailLog, EmailType, EmailStatus } from '$lib/types/email';

interface EmailLogRow {
	id: string;
	orgId: string | null;
	userId: string | null;
	emailType: EmailType;
	recipientEmail: string;
	subject: string;
	sendgridMessageId: string | null;
	status: EmailStatus;
	errorMessage: string | null;
	metadata: Record<string, unknown> | string;
	createdAt: Date;
	sentAt: Date | null;
}

interface CreateEmailLogInput {
	orgId: string | null;
	userId: string | null;
	emailType: EmailType;
	recipientEmail: string;
	subject: string;
	metadata?: Record<string, unknown>;
}

/**
 * Convert database row to EmailLog entity
 */
function rowToEmailLog(row: EmailLogRow): EmailLog {
	return {
		id: row.id,
		orgId: row.orgId,
		userId: row.userId,
		emailType: row.emailType,
		recipientEmail: row.recipientEmail,
		subject: row.subject,
		sendgridMessageId: row.sendgridMessageId,
		status: row.status,
		errorMessage: row.errorMessage,
		metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
		createdAt: row.createdAt,
		sentAt: row.sentAt
	};
}

export const postgresEmailLogRepository = {
	/**
	 * Create a new email log entry
	 * Called before sending to create audit trail
	 */
	async create(input: CreateEmailLogInput): Promise<string> {
		const rows = await sql<{ id: string }[]>`
			INSERT INTO email_logs (org_id, user_id, email_type, recipient_email, subject, metadata)
			VALUES (
				${input.orgId},
				${input.userId},
				${input.emailType},
				${input.recipientEmail},
				${input.subject},
				${sql.json((input.metadata || {}) as JSONValue)}
			)
			RETURNING id
		`;
		return rows[0].id;
	},

	/**
	 * Update email status after send attempt
	 */
	async updateStatus(
		id: string,
		status: EmailStatus,
		errorMessage: string | null = null,
		sendgridMessageId: string | null = null
	): Promise<void> {
		if (status === 'sent') {
			await sql`
				UPDATE email_logs
				SET status = ${status},
					error_message = ${errorMessage},
					sendgrid_message_id = ${sendgridMessageId},
					sent_at = NOW()
				WHERE id = ${id}
			`;
		} else {
			await sql`
				UPDATE email_logs
				SET status = ${status},
					error_message = ${errorMessage},
					sendgrid_message_id = ${sendgridMessageId}
				WHERE id = ${id}
			`;
		}
	},

	/**
	 * Find email logs by organization
	 */
	async findByOrg(orgId: string, limit = 100): Promise<EmailLog[]> {
		const rows = await sql<EmailLogRow[]>`
			SELECT * FROM email_logs
			WHERE org_id = ${orgId}
			ORDER BY created_at DESC
			LIMIT ${limit}
		`;
		return rows.map(rowToEmailLog);
	},

	/**
	 * Find email logs by user
	 */
	async findByUser(userId: string, limit = 50): Promise<EmailLog[]> {
		const rows = await sql<EmailLogRow[]>`
			SELECT * FROM email_logs
			WHERE user_id = ${userId}
			ORDER BY created_at DESC
			LIMIT ${limit}
		`;
		return rows.map(rowToEmailLog);
	},

	/**
	 * Find email log by ID
	 */
	async findById(id: string): Promise<EmailLog | null> {
		const rows = await sql<EmailLogRow[]>`
			SELECT * FROM email_logs
			WHERE id = ${id}
		`;
		return rows.length > 0 ? rowToEmailLog(rows[0]) : null;
	},

	/**
	 * Count recent emails of a specific type for a user
	 * Used for rate limiting resend operations
	 *
	 * @param userId - User ID to check
	 * @param emailType - Type of email to count
	 * @param windowMinutes - Time window in minutes (default 60)
	 * @returns Number of emails sent within the window
	 */
	async countRecentByUserAndType(
		userId: string,
		emailType: EmailType,
		windowMinutes = 60
	): Promise<number> {
		const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
		const result = await sql<{ count: string }[]>`
			SELECT COUNT(*)::text as count
			FROM email_logs
			WHERE user_id = ${userId}
			  AND email_type = ${emailType}
			  AND created_at > ${cutoff}
		`;
		return parseInt(result[0]?.count ?? '0', 10);
	}
};
