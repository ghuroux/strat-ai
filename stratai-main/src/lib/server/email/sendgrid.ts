/**
 * SendGrid Email Service
 *
 * HTTP client for sending emails via SendGrid API.
 * See: docs/SENDGRID_EMAIL_INTEGRATION.md
 */

import { env } from '$env/dynamic/private';
import type { SendEmailOptions, SendEmailResult } from '$lib/types/email';
import { postgresEmailLogRepository } from '../persistence/email-logs-postgres';

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

/**
 * Send an email via SendGrid
 *
 * Creates an audit log entry before sending, updates status after.
 * Gracefully handles missing API key for development.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
	const apiKey = env.SENDGRID_API_KEY;
	const fromEmail = env.SENDGRID_FROM_EMAIL || 'noreply@stratai.app';
	const fromName = env.SENDGRID_FROM_NAME || 'StratAI';

	if (!apiKey) {
		console.error('[EMAIL] SENDGRID_API_KEY not configured');
		return { success: false, error: 'Email service not configured' };
	}

	// Create email log entry before sending
	const logId = await postgresEmailLogRepository.create({
		orgId: options.orgId || null,
		userId: options.userId || null,
		emailType: options.emailType,
		recipientEmail: options.to,
		subject: options.subject,
		metadata: options.metadata || {}
	});

	try {
		const response = await fetch(SENDGRID_API_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				personalizations: [{ to: [{ email: options.to }] }],
				from: { email: fromEmail, name: fromName },
				subject: options.subject,
				content: [
					{ type: 'text/plain', value: options.text },
					{ type: 'text/html', value: options.html }
				]
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('[EMAIL] SendGrid error:', response.status, errorText);

			await postgresEmailLogRepository.updateStatus(logId, 'failed', errorText);
			return { success: false, error: `SendGrid error: ${response.status}` };
		}

		// Extract message ID from headers for tracking
		const messageId = response.headers.get('X-Message-Id') || undefined;

		await postgresEmailLogRepository.updateStatus(logId, 'sent', null, messageId);

		console.log('[EMAIL] Sent successfully:', options.emailType, 'to', options.to);
		return { success: true, messageId };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('[EMAIL] Failed to send:', errorMessage);

		await postgresEmailLogRepository.updateStatus(logId, 'failed', errorMessage);
		return { success: false, error: errorMessage };
	}
}
