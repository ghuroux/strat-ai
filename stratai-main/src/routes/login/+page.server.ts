import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSession, setSessionCookie } from '$lib/server/session';
import { verifyPassword } from '$lib/server/auth';
import { postgresUserRepository } from '$lib/server/persistence';
import { sql } from '$lib/server/persistence/db';
import { getHomePageUrl, type UserPreferences } from '$lib/types/user';
import { _validateReturnUrl } from './+page';

/**
 * User authentication via database password hash
 *
 * Authenticates by username or email against bcrypt password hash.
 * Returns resetRequired if user needs a forced password reset.
 */
async function authenticateUser(
	username: string | null,
	password: string
): Promise<{ userId: string; organizationId: string } | { resetRequired: true } | null> {
	if (!username) {
		return null;
	}

	// Find user by username or email (check all orgs for now - single tenant)
	const rows = await sql<{ id: string; organizationId: string; passwordHash: string | null; status: string; forcePasswordReset: boolean }[]>`
		SELECT id, organization_id as "organizationId", password_hash as "passwordHash", status, force_password_reset as "forcePasswordReset"
		FROM users
		WHERE (username = ${username} OR email = ${username})
		  AND deleted_at IS NULL
		LIMIT 1
	`;

	if (rows.length > 0) {
		const user = rows[0];

		if (user.status !== 'active') {
			return null; // User is inactive/suspended
		}

		// Check if user needs a forced password reset (bcrypt migration)
		if (user.forcePasswordReset) {
			return { resetRequired: true };
		}

		if (user.passwordHash) {
			// Verify password against stored bcrypt hash
			const isValid = await verifyPassword(password, user.passwordHash);
			if (isValid) {
				await postgresUserRepository.updateLastLogin(user.id);
				return {
					userId: user.id,
					organizationId: user.organizationId
				};
			}
		}
	}

	return null;
}

export const actions: Actions = {
	default: async ({ request, cookies, url, locals }) => {
		if (locals.rateLimited) {
			return fail(429, { error: 'Too many login attempts. Please wait a few minutes and try again.' });
		}

		const data = await request.formData();
		const username = data.get('username')?.toString().trim() || null;
		const password = data.get('password')?.toString() || '';

		// Authenticate user
		const authResult = await authenticateUser(username, password);

		if (!authResult) {
			return fail(401, { error: 'Invalid credentials' });
		}

		// Check if user needs a forced password reset
		if ('resetRequired' in authResult) {
			return fail(401, { resetRequired: true });
		}

		// Create session with userId and organizationId
		const token = createSession(authResult.userId, authResult.organizationId);
		setSessionCookie(cookies, token);

		// Check for returnUrl in query parameters
		// The form action includes returnUrl as a query param (e.g., ?/default&returnUrl=/spaces/xyz)
		const returnUrl = url.searchParams.get('returnUrl');

		// If returnUrl is valid, use it; otherwise fall back to user preferences
		if (_validateReturnUrl(returnUrl)) {
			throw redirect(303, returnUrl);
		}

		// Load user preferences to determine redirect destination
		let redirectUrl = '/';
		try {
			const preferences = (await postgresUserRepository.getPreferences(
				authResult.userId
			)) as UserPreferences;
			redirectUrl = getHomePageUrl(preferences.homePage);
		} catch (error) {
			console.error('Failed to load preferences for redirect, using default:', error);
			// Fall back to '/' if preferences can't be loaded
		}

		throw redirect(303, redirectUrl);
	}
};
