/**
 * Pages List - Server Load
 *
 * Validates access and loads pages for the area.
 */

import type { PageServerLoad } from './$types';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	// Require authentication
	if (!locals.session) {
		error(401, 'Unauthorized');
	}

	const userId = locals.session.userId;
	const { space, area } = params;

	// Load pages for this area (the area slug will be resolved client-side to get the actual ID)
	// For now, we return minimal data and let the client handle the full load
	return {
		spaceSlug: space,
		areaSlug: area,
		userId
	};
};
