/**
 * User Profile API
 *
 * GET /api/user/profile - Get current user profile
 * PATCH /api/user/profile - Update user profile
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresUserRepository } from '$lib/server/persistence/users-postgres';

/**
 * GET /api/user/profile
 * Returns current user profile
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	try {
		const user = await postgresUserRepository.findById(locals.session.userId);
		if (!user) {
			return json({ error: { message: 'User not found', type: 'not_found' } }, { status: 404 });
		}

		return json({
			profile: {
				id: user.id,
				email: user.email,
				username: user.username,
				displayName: user.displayName
			}
		});
	} catch (error) {
		console.error('Failed to get profile:', error);
		return json(
			{ error: { message: 'Failed to get profile', type: 'server_error' } },
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/user/profile
 * Body: { displayName?: string }
 */
export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	try {
		const body = await request.json();
		const updates: { displayName?: string | null } = {};

		// Validate and apply displayName if present
		if (body.displayName !== undefined) {
			if (body.displayName === null || body.displayName === '') {
				updates.displayName = null;
			} else if (typeof body.displayName === 'string') {
				const trimmed = body.displayName.trim();
				if (trimmed.length > 100) {
					return json(
						{ error: { message: 'Display name too long (max 100 chars)', type: 'validation_error' } },
						{ status: 400 }
					);
				}
				updates.displayName = trimmed;
			} else {
				return json(
					{ error: { message: 'Invalid display name', type: 'validation_error' } },
					{ status: 400 }
				);
			}
		}

		// Update user in database
		const user = await postgresUserRepository.update(locals.session.userId, updates);

		if (!user) {
			return json({ error: { message: 'User not found', type: 'not_found' } }, { status: 404 });
		}

		return json({
			profile: {
				id: user.id,
				email: user.email,
				username: user.username,
				displayName: user.displayName
			}
		});
	} catch (error) {
		console.error('Failed to update profile:', error);
		return json(
			{ error: { message: 'Failed to update profile', type: 'server_error' } },
			{ status: 500 }
		);
	}
};
