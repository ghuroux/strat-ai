import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSessionCookie, verifySession } from '$lib/server/session';

const PUBLIC_ROUTES = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize session as null
	event.locals.session = null;

	// Check for session cookie
	const sessionToken = getSessionCookie(event.cookies);

	if (sessionToken) {
		const session = verifySession(sessionToken);
		if (session) {
			event.locals.session = session;
		}
	}

	// Route protection
	const isPublicRoute = PUBLIC_ROUTES.some(
		(route) => event.url.pathname === route || event.url.pathname.startsWith(route + '/')
	);

	// Allow API routes (they handle their own auth)
	const isApiRoute = event.url.pathname.startsWith('/api/');

	if (!isPublicRoute && !isApiRoute && !event.locals.session) {
		throw redirect(303, '/login');
	}

	// Redirect logged-in users away from login page
	if (event.url.pathname === '/login' && event.locals.session) {
		throw redirect(303, '/');
	}

	return resolve(event);
};
