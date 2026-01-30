/**
 * Space Skills Page - Server Load
 *
 * Validates access and provides initial data for the skills page.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Require authentication
	if (!locals.session) {
		error(401, 'Unauthorized');
	}

	return {
		spaceSlug: params.space,
		userId: locals.session.userId
	};
};
