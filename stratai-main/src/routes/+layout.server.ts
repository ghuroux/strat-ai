import type { LayoutServerLoad } from './$types';
import { postgresUserRepository } from '$lib/server/persistence/users-postgres';
import type { UserPreferences } from '$lib/types/user';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.session) {
		return { user: null };
	}

	// Load user preferences from database
	let preferences: UserPreferences = {};
	try {
		preferences = (await postgresUserRepository.getPreferences(
			locals.session.userId
		)) as UserPreferences;
	} catch (error) {
		console.error('Failed to load user preferences:', error);
		// Continue with empty preferences
	}

	return {
		user: {
			id: locals.session.userId,
			firstName: locals.session.firstName,
			lastName: locals.session.lastName,
			displayName: locals.session.displayName,
			email: locals.session.email,
			role: locals.session.role,
			preferences
		}
	};
};
