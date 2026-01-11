/**
 * User Preferences API
 *
 * GET /api/user/preferences - Get current user preferences
 * PATCH /api/user/preferences - Update user preferences (merge)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresUserRepository } from '$lib/server/persistence/users-postgres';
import type { HomePagePreference, ThemePreference, UserPreferences } from '$lib/types/user';

const VALID_THEMES: ThemePreference[] = ['dark', 'light', 'system'];

/**
 * Validate home page preference structure
 */
function validateHomePage(homePage: unknown): HomePagePreference | null {
	if (!homePage || typeof homePage !== 'object') return null;

	const hp = homePage as Record<string, unknown>;
	const validTypes = ['main-chat', 'task-dashboard', 'space', 'area'];

	if (!hp.type || !validTypes.includes(hp.type as string)) {
		return null;
	}

	// For space and area types, validate required fields
	if ((hp.type === 'space' || hp.type === 'task-dashboard') && !hp.spaceId) {
		return null;
	}

	if (hp.type === 'area' && (!hp.spaceId || !hp.areaId)) {
		return null;
	}

	return {
		type: hp.type as HomePagePreference['type'],
		spaceId: hp.spaceId as string | undefined,
		spaceSlug: hp.spaceSlug as string | undefined,
		areaId: hp.areaId as string | undefined,
		areaSlug: hp.areaSlug as string | undefined
	};
}

/**
 * Validate theme preference
 */
function validateTheme(theme: unknown): ThemePreference | null {
	if (typeof theme !== 'string') return null;
	return VALID_THEMES.includes(theme as ThemePreference) ? (theme as ThemePreference) : null;
}

/**
 * Validate default model - just needs to be a non-empty string or null
 */
function validateDefaultModel(model: unknown): string | null {
	if (model === null) return null;
	if (typeof model !== 'string') return null;
	const trimmed = model.trim();
	return trimmed.length > 0 ? trimmed : null;
}

/**
 * GET /api/user/preferences
 * Returns current user preferences
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	try {
		const preferences = await postgresUserRepository.getPreferences(locals.session.userId);
		return json({ preferences });
	} catch (error) {
		console.error('Failed to get preferences:', error);
		return json(
			{ error: { message: 'Failed to get preferences', type: 'server_error' } },
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/user/preferences
 * Body: { homePage?, theme?, defaultModel? }
 * Merges with existing preferences
 */
export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	try {
		const body = await request.json();
		const updates: UserPreferences = {};

		// Validate and apply homePage if present
		if (body.homePage !== undefined) {
			if (body.homePage === null) {
				// Allow clearing home page preference
				updates.homePage = { type: 'main-chat' };
			} else {
				const validatedHomePage = validateHomePage(body.homePage);
				if (!validatedHomePage) {
					return json(
						{ error: { message: 'Invalid homePage preference', type: 'validation_error' } },
						{ status: 400 }
					);
				}
				updates.homePage = validatedHomePage;
			}
		}

		// Validate and apply theme if present
		if (body.theme !== undefined) {
			const validatedTheme = validateTheme(body.theme);
			if (!validatedTheme) {
				return json(
					{ error: { message: 'Invalid theme preference', type: 'validation_error' } },
					{ status: 400 }
				);
			}
			updates.theme = validatedTheme;
		}

		// Validate and apply defaultModel if present
		if (body.defaultModel !== undefined) {
			updates.defaultModel = validateDefaultModel(body.defaultModel);
		}

		// Update preferences in database
		const preferences = await postgresUserRepository.updatePreferences(
			locals.session.userId,
			updates as Record<string, unknown>
		);

		return json({ preferences });
	} catch (error) {
		console.error('Failed to update preferences:', error);
		return json(
			{ error: { message: 'Failed to update preferences', type: 'server_error' } },
			{ status: 500 }
		);
	}
};
