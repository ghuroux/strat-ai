/**
 * Email System Types
 *
 * Types for the SendGrid email integration including password reset,
 * email verification, team invites, and notifications.
 *
 * See: docs/SENDGRID_EMAIL_INTEGRATION.md
 */

/**
 * Types of emails the system can send
 * Must match email_logs.email_type CHECK constraint
 */
export type EmailType =
	| 'password_reset'
	| 'email_verification'
	| 'team_invite'
	| 'space_invite'
	| 'notification'
	| 'welcome'
	| 'calendar_connect';

/**
 * Types of password reset tokens
 * Must match password_reset_tokens.token_type CHECK constraint
 */
export type TokenType = 'reset' | 'welcome';

/**
 * Email delivery status
 * Must match email_logs.status CHECK constraint
 */
export type EmailStatus =
	| 'pending'
	| 'sent'
	| 'failed'
	| 'delivered'
	| 'bounced';

/**
 * Email log entity - maps to email_logs table
 */
export interface EmailLog {
	id: string;
	orgId: string | null;
	userId: string | null;
	emailType: EmailType;
	recipientEmail: string;
	subject: string;
	sendgridMessageId: string | null;
	status: EmailStatus;
	errorMessage: string | null;
	metadata: Record<string, unknown>;
	createdAt: Date;
	sentAt: Date | null;
}

/**
 * Password reset token entity - maps to password_reset_tokens table
 */
export interface PasswordResetToken {
	id: string;
	userId: string;
	tokenHash: string;
	tokenType: TokenType;
	expiresAt: Date;
	usedAt: Date | null;
	createdAt: Date;
}

/**
 * Options for sending an email via SendGrid
 */
export interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	text: string;
	orgId?: string;
	userId?: string;
	emailType: EmailType;
	metadata?: Record<string, unknown>;
}

/**
 * Result from sending an email
 */
export interface SendEmailResult {
	success: boolean;
	messageId?: string;
	error?: string;
}
