/**
 * Set Password Page Server
 *
 * Validates welcome tokens on page load.
 * Returns validation state to the client for appropriate UI rendering.
 *
 * See: docs/features/WELCOME_EMAIL_ON_USER_CREATION.md
 */

import type { PageServerLoad } from './$types';
import { postgresPasswordResetTokenRepository } from '$lib/server/persistence/password-reset-tokens-postgres';

export type TokenValidationState =
	| { status: 'valid'; token: string }
	| { status: 'missing' }
	| { status: 'invalid' }
	| { status: 'expired' }
	| { status: 'used' };

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');

	// No token provided
	if (!token) {
		return {
			tokenState: { status: 'missing' } as TokenValidationState
		};
	}

	// Verify token is valid for welcome flow
	const userId = await postgresPasswordResetTokenRepository.verify(token, 'welcome');

	if (!userId) {
		// Token is invalid, expired, or already used
		// We can't distinguish these states without additional queries,
		// but we provide a generic error that guides the user correctly
		return {
			tokenState: { status: 'invalid' } as TokenValidationState
		};
	}

	// Token is valid
	return {
		tokenState: { status: 'valid', token } as TokenValidationState
	};
};
