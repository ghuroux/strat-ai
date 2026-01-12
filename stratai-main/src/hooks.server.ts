import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSessionCookie, verifySession } from '$lib/server/session';
import { postgresUserRepository, postgresOrgMembershipRepository } from '$lib/server/persistence';

const PUBLIC_ROUTES = ['/login', '/logout'];

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize session as null
	event.locals.session = null;

	// Check for session cookie
	const sessionToken = getSessionCookie(event.cookies);

	if (sessionToken) {
		const session = verifySession(sessionToken);
		if (session) {
			// Enrich session with user details and role
			const user = await postgresUserRepository.findById(session.userId);
			const membership = await postgresOrgMembershipRepository.findByUserAndOrg(
				session.userId,
				session.organizationId
			);

			event.locals.session = {
				userId: session.userId,
				organizationId: session.organizationId,
				displayName: user?.displayName || user?.username || null,
				email: user?.email || null,
				role: membership?.role || 'member',
				createdAt: session.createdAt
			};
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

	// Admin route protection - only owner/admin can access
	if (event.url.pathname.startsWith('/admin')) {
		if (!event.locals.session) {
			throw redirect(303, '/login');
		}
		if (event.locals.session.role !== 'owner' && event.locals.session.role !== 'admin') {
			throw redirect(303, '/');
		}
	}

	// Redirect logged-in users away from login page
	if (event.url.pathname === '/login' && event.locals.session) {
		throw redirect(303, '/');
	}

	return resolve(event);
};
