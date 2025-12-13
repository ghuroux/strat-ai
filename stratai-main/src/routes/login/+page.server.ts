import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createSession, setSessionCookie } from '$lib/server/session';

/**
 * User authentication map
 * Maps password -> userId
 * In production, this would be a database lookup with hashed passwords
 */
function authenticateUser(password: string): string | null {
	// Check admin password
	if (env.ADMIN_PASSWORD && password === env.ADMIN_PASSWORD) {
		return 'admin';
	}

	// Check additional users (format: USER_<NAME>_PASSWORD)
	// This allows adding users via environment variables
	if (env.USER_TESTER_PASSWORD && password === env.USER_TESTER_PASSWORD) {
		return 'tester';
	}

	// Add more users as needed by adding to .env:
	// USER_ALICE_PASSWORD=alicepass -> userId: 'alice'

	return null;
}

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const password = data.get('password')?.toString() || '';

		// Authenticate user
		const userId = authenticateUser(password);

		if (!userId) {
			return fail(401, { error: 'Invalid password' });
		}

		// Create session and set cookie
		const token = createSession(userId);
		setSessionCookie(cookies, token);

		throw redirect(303, '/');
	}
};
