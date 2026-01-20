/**
 * Space Pages Route - Load Function
 *
 * Fetches pages data for Space-level pages dashboard.
 * Handles query params for filtering (area, type, owned).
 *
 * Route: /spaces/[space]/pages
 */

import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch, url }) => {
	const { space: spaceSlug } = params;

	// Build query params from URL
	const searchParams = new URLSearchParams();
	const area = url.searchParams.get('area');
	const type = url.searchParams.get('type');
	const owned = url.searchParams.get('owned');

	if (area) searchParams.set('area', area);
	if (type) searchParams.set('type', type);
	if (owned) searchParams.set('owned', owned);

	// Fetch pages data from API
	const queryString = searchParams.toString();
	const apiUrl = `/api/spaces/${spaceSlug}/pages${queryString ? `?${queryString}` : ''}`;

	const response = await fetch(apiUrl);

	// Handle error responses
	if (!response.ok) {
		if (response.status === 401) {
			throw error(401, 'Unauthorized');
		}
		if (response.status === 404) {
			throw error(404, 'Space not found');
		}
		throw error(response.status, 'Failed to load pages');
	}

	const data = await response.json();

	return {
		pages: data.pages || [],
		recentlyEdited: data.recentlyEdited || [],
		counts: data.counts || {
			total: 0,
			byArea: {},
			byType: {},
			ownedByMe: 0,
			sharedWithMe: 0
		},
		filters: { area, type, owned },
		areas: data.areas || [],
		space: data.space || null
	};
};
