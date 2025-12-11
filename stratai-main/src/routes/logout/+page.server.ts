import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '$lib/server/session';

export const actions: Actions = {
	default: async ({ cookies }) => {
		clearSessionCookie(cookies);
		throw redirect(303, '/login');
	}
};

// Handle GET requests to /logout as well
export const load = async ({ cookies }) => {
	clearSessionCookie(cookies);
	throw redirect(303, '/login');
};
