/**
 * Settings Page Server
 *
 * Loads spaces and areas for home page preference selection.
 */

import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { postgresSpaceRepository } from '$lib/server/persistence/spaces-postgres';
import { postgresAreaRepository } from '$lib/server/persistence/areas-postgres';

export const load: PageServerLoad = async ({ locals }) => {
	// Require authentication
	if (!locals.session) {
		throw redirect(302, '/login');
	}

	// Load all spaces
	const spaces = await postgresSpaceRepository.findAll(locals.session.userId);

	// Load areas for each space
	const areasMap: Record<string, Array<{ id: string; name: string; slug: string }>> = {};
	for (const space of spaces) {
		const areas = await postgresAreaRepository.findAll(locals.session.userId, space.id);
		areasMap[space.id] = areas.map((a) => ({
			id: a.id,
			name: a.name,
			slug: a.slug
		}));
	}

	return {
		spaces: spaces.map((s) => ({
			id: s.id,
			name: s.name,
			slug: s.slug,
			isSystem: s.type === 'system'
		})),
		areasMap
	};
};
