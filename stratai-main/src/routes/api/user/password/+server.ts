/**
 * Password Change API Endpoint
 *
 * POST /api/user/password
 * Changes the authenticated user's password.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresUserRepository } from '$lib/server/persistence/users-postgres';
import { hashPassword, verifyPassword } from '$lib/server/auth';

const MIN_PASSWORD_LENGTH = 8;

export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.session) {
		return json(
			{ error: { message: 'Unauthorized', type: 'auth_error' } },
			{ status: 401 }
		);
	}

	const userId = locals.session.userId;

	try {
		const body = await request.json();
		const { currentPassword, newPassword }: { currentPassword?: string; newPassword?: string } = body;

		// Validate required fields
		if (!currentPassword || !newPassword) {
			return json(
				{ error: { message: 'Current password and new password are required', type: 'validation_error' } },
				{ status: 400 }
			);
		}

		// Validate new password length
		if (newPassword.length < MIN_PASSWORD_LENGTH) {
			return json(
				{ error: { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`, type: 'validation_error' } },
				{ status: 400 }
			);
		}

		// Check that new password is different from current
		if (currentPassword === newPassword) {
			return json(
				{ error: { message: 'New password must be different from current password', type: 'validation_error' } },
				{ status: 400 }
			);
		}

		// Get user's current password hash
		const storedHash = await postgresUserRepository.getPasswordHash(userId);

		if (!storedHash) {
			// User doesn't have a password set (external auth or new account)
			return json(
				{ error: { message: 'Password change not available for this account', type: 'auth_error' } },
				{ status: 400 }
			);
		}

		// Verify current password
		const isValid = verifyPassword(currentPassword, storedHash);

		if (!isValid) {
			return json(
				{ error: { message: 'Current password is incorrect', type: 'auth_error' } },
				{ status: 401 }
			);
		}

		// Hash and save new password
		const newHash = hashPassword(newPassword);
		await postgresUserRepository.update(userId, { passwordHash: newHash });

		return json({ success: true, message: 'Password changed successfully' });
	} catch (err) {
		console.error('Password change error:', err);
		return json(
			{ error: { message: 'Failed to change password', type: 'server_error' } },
			{ status: 500 }
		);
	}
};
