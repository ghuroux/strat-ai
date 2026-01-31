/**
 * POST /api/auth/reset-password
 *
 * Completes password reset with new password.
 * Verifies token, updates password, marks token as used.
 *
 * See: docs/SENDGRID_EMAIL_INTEGRATION.md
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresUserRepository } from '$lib/server/persistence';
import { postgresPasswordResetTokenRepository } from '$lib/server/persistence/password-reset-tokens-postgres';
import { hashPassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { token, password } = await request.json();

		// Validate input
		if (!token || !password) {
			return json({ error: 'Token and password required' }, { status: 400 });
		}

		if (typeof password !== 'string' || password.length < 8) {
			return json({ error: 'Password must be at least 8 characters' }, { status: 400 });
		}

		// Verify token (checks expiration and usage)
		const userId = await postgresPasswordResetTokenRepository.verify(token);

		if (!userId) {
			return json({ error: 'Invalid or expired reset link' }, { status: 400 });
		}

		// Hash new password and update user
		const passwordHash = await hashPassword(password);
		const updated = await postgresUserRepository.updatePassword(userId, passwordHash);

		if (!updated) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		// Mark token as used (single-use tokens)
		await postgresPasswordResetTokenRepository.markUsed(token);

		return json({ success: true });
	} catch (error) {
		console.error('[RESET_PASSWORD] Error:', error);
		return json({ error: 'Failed to reset password' }, { status: 500 });
	}
};
