import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createSession, setSessionCookie } from '$lib/server/session';
import { verifyPassword } from '$lib/server/auth';
import {
	postgresUserIdMappingRepository,
	postgresUserRepository
} from '$lib/server/persistence';
import { sql } from '$lib/server/persistence/db';
import { getHomePageUrl, type UserPreferences } from '$lib/types/user';
import { _validateReturnUrl } from './+page';

/**
 * User authentication - supports both env var passwords and database passwords
 *
 * Flow:
 * 1. Try env var authentication (backward compat for admin/tester)
 * 2. If username provided, try database authentication with password_hash
 */
async function authenticateUser(
	username: string | null,
	password: string
): Promise<{ userId: string; organizationId: string } | null> {
	// First, try env var authentication (backward compatibility)
	let legacyUserId: string | null = null;

	if (env.ADMIN_PASSWORD && password === env.ADMIN_PASSWORD) {
		legacyUserId = 'admin';
	} else if (env.USER_TESTER_PASSWORD && password === env.USER_TESTER_PASSWORD) {
		legacyUserId = 'tester';
	}

	if (legacyUserId) {
		// Resolve legacy ID to UUID via mapping table
		const resolvedUserId = await postgresUserIdMappingRepository.resolveUserId(legacyUserId);

		if (resolvedUserId) {
			const user = await postgresUserRepository.findById(resolvedUserId);
			if (user && user.status === 'active') {
				await postgresUserRepository.updateLastLogin(user.id);
				return {
					userId: user.id,
					organizationId: user.organizationId
				};
			}
		}
	}

	// Second, try database authentication if username is provided
	if (username) {
		// Find user by username or email (check all orgs for now - single tenant)
		const rows = await sql<{ id: string; organizationId: string; passwordHash: string | null; status: string }[]>`
			SELECT id, organization_id as "organizationId", password_hash as "passwordHash", status
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

			if (user.passwordHash) {
				// Verify password against stored hash
				const isValid = verifyPassword(password, user.passwordHash);
				if (isValid) {
					await postgresUserRepository.updateLastLogin(user.id);
					return {
						userId: user.id,
						organizationId: user.organizationId
					};
				}
			}
		}
	}

	return null;
}

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString().trim() || null;
		const password = data.get('password')?.toString() || '';

		// Authenticate user
		const authResult = await authenticateUser(username, password);

		if (!authResult) {
			return fail(401, { error: 'Invalid credentials' });
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
