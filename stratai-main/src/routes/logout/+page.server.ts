import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '$lib/server/session';

export const actions: Actions = {
	default: async ({ cookies, request }) => {
		console.log('[LOGOUT SERVER] POST /logout action triggered');
		console.log('[LOGOUT SERVER] Request headers:', Object.fromEntries(request.headers));

		const sessionCookie = cookies.get('session');
		console.log('[LOGOUT SERVER] Session cookie before clear:', sessionCookie ? 'EXISTS' : 'NOT FOUND');

		clearSessionCookie(cookies);

		const sessionCookieAfter = cookies.get('session');
		console.log('[LOGOUT SERVER] Session cookie after clear:', sessionCookieAfter ? 'STILL EXISTS!' : 'CLEARED');

		console.log('[LOGOUT SERVER] Redirecting to /login');
		throw redirect(303, '/login');
	}
};

// Handle GET requests to /logout as well
export const load = async ({ cookies, request }) => {
	console.log('[LOGOUT SERVER] GET /logout load triggered');
	console.log('[LOGOUT SERVER] Request URL:', request.url);
	console.log('[LOGOUT SERVER] Request headers:', Object.fromEntries(request.headers));

	const sessionCookie = cookies.get('session');
	console.log('[LOGOUT SERVER] Session cookie before clear:', sessionCookie ? 'EXISTS' : 'NOT FOUND');

	clearSessionCookie(cookies);

	const sessionCookieAfter = cookies.get('session');
	console.log('[LOGOUT SERVER] Session cookie after clear:', sessionCookieAfter ? 'STILL EXISTS!' : 'CLEARED');

	console.log('[LOGOUT SERVER] Redirecting to /login');
	throw redirect(303, '/login');
};
