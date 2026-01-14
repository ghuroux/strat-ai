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
				firstName: user.firstName,
				lastName: user.lastName,
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
 * Body: { firstName?: string, lastName?: string }
 */
export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	try {
		const body = await request.json();
		const updates: { firstName?: string | null; lastName?: string | null } = {};

		// Validate and apply firstName if present
		if (body.firstName !== undefined) {
			if (body.firstName === null || body.firstName === '') {
				updates.firstName = null;
			} else if (typeof body.firstName === 'string') {
				const trimmed = body.firstName.trim();
				if (trimmed.length > 100) {
					return json(
						{ error: { message: 'First name too long (max 100 chars)', type: 'validation_error' } },
						{ status: 400 }
					);
				}
				updates.firstName = trimmed;
			} else {
				return json(
					{ error: { message: 'Invalid first name', type: 'validation_error' } },
					{ status: 400 }
				);
			}
		}

		// Validate and apply lastName if present
		if (body.lastName !== undefined) {
			if (body.lastName === null || body.lastName === '') {
				updates.lastName = null;
			} else if (typeof body.lastName === 'string') {
				const trimmed = body.lastName.trim();
				if (trimmed.length > 100) {
					return json(
						{ error: { message: 'Last name too long (max 100 chars)', type: 'validation_error' } },
						{ status: 400 }
					);
				}
				updates.lastName = trimmed;
			} else {
				return json(
					{ error: { message: 'Invalid last name', type: 'validation_error' } },
					{ status: 400 }
				);
			}
		}

		// Update user in database (displayName is auto-computed in repository)
		const user = await postgresUserRepository.update(locals.session.userId, updates);

		if (!user) {
			return json({ error: { message: 'User not found', type: 'not_found' } }, { status: 404 });
		}

		return json({
			profile: {
				id: user.id,
				email: user.email,
				username: user.username,
				firstName: user.firstName,
				lastName: user.lastName,
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
