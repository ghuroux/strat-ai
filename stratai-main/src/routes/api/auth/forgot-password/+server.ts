/**
 * POST /api/auth/forgot-password
 *
 * Initiates password reset flow. Security-hardened:
 * - Always returns success (no email enumeration)
 * - Constant timing (~500ms minimum)
 * - Rate limiting enforced silently
 *
 * See: docs/SENDGRID_EMAIL_INTEGRATION.md
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresUserRepository } from '$lib/server/persistence';
import { postgresPasswordResetTokenRepository } from '$lib/server/persistence/password-reset-tokens-postgres';
import { sendEmail, getPasswordResetEmail, createPasswordResetLink } from '$lib/server/email';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const startTime = Date.now();

	try {
		const { email } = await request.json();

		// Validate input
		if (!email || typeof email !== 'string') {
			// Consistent timing to prevent enumeration
			await delay(startTime, 500);
			return json({ success: true }); // Don't reveal missing email
		}

		const normalizedEmail = email.toLowerCase().trim();
		const ipAddress = getClientAddress();

		// Check rate limiting
		const isLimited = await postgresPasswordResetTokenRepository.isRateLimited(
			normalizedEmail,
			ipAddress
		);
		if (isLimited) {
			await delay(startTime, 500);
			return json({ success: true }); // Don't reveal rate limiting
		}

		// Record attempt for rate limiting
		await postgresPasswordResetTokenRepository.recordAttempt(normalizedEmail, ipAddress);

		// Find user (cross-org lookup - we don't know which org they're in)
		const user = await postgresUserRepository.findByEmailGlobal(normalizedEmail);

		if (user) {
			// Create token and send email
			const token = await postgresPasswordResetTokenRepository.create(user.id);
			const resetLink = createPasswordResetLink(token);
			const template = getPasswordResetEmail({
				userName: user.displayName || user.username || 'there',
				resetLink,
				expiresInMinutes: 60
			});

			await sendEmail({
				to: normalizedEmail,
				subject: template.subject,
				html: template.html,
				text: template.text,
				userId: user.id,
				orgId: user.organizationId,
				emailType: 'password_reset'
			});
		}

		// Always return success (prevent email enumeration)
		await delay(startTime, 500);
		return json({ success: true });
	} catch (error) {
		console.error('[FORGOT_PASSWORD] Error:', error);
		await delay(startTime, 500);
		return json({ success: true }); // Don't reveal errors
	}
};

/**
 * Ensure consistent response timing to prevent timing attacks
 * Pads response time to minimum duration
 */
async function delay(startTime: number, minMs: number): Promise<void> {
	const elapsed = Date.now() - startTime;
	if (elapsed < minMs) {
		await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
	}
}
