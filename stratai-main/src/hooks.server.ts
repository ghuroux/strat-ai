import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getSessionCookie, verifySession } from '$lib/server/session';
import { postgresUserRepository, postgresOrgMembershipRepository } from '$lib/server/persistence';

const PUBLIC_ROUTES = ['/login', '/logout'];

export const handle: Handle = async ({ event, resolve }) => {
	// Debug logging for logout flow
	const isLogoutRelated = event.url.pathname === '/logout' || event.url.pathname === '/login';
	if (isLogoutRelated) {
		console.log('[HOOKS] ========================================');
		console.log('[HOOKS] Request:', event.request.method, event.url.pathname);
		console.log('[HOOKS] Full URL:', event.url.href);
		console.log('[HOOKS] Headers:', JSON.stringify(Object.fromEntries(event.request.headers), null, 2));
	}

	// Initialize session as null
	event.locals.session = null;

	// Check for session cookie
	const sessionToken = getSessionCookie(event.cookies);

	if (isLogoutRelated) {
		console.log('[HOOKS] Session token from cookie:', sessionToken ? `EXISTS (${sessionToken.substring(0, 20)}...)` : 'NOT FOUND');
	}

	if (sessionToken) {
		const session = verifySession(sessionToken);
		if (isLogoutRelated) {
			console.log('[HOOKS] Session verification result:', session ? 'VALID' : 'INVALID/EXPIRED');
		}
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

			if (isLogoutRelated) {
				console.log('[HOOKS] Session enriched for user:', session.userId);
			}
		}
	}

	// Route protection
	const isPublicRoute = PUBLIC_ROUTES.some(
		(route) => event.url.pathname === route || event.url.pathname.startsWith(route + '/')
	);

	// Allow API routes (they handle their own auth)
	const isApiRoute = event.url.pathname.startsWith('/api/');

	if (isLogoutRelated) {
		console.log('[HOOKS] Route check - isPublicRoute:', isPublicRoute, ', isApiRoute:', isApiRoute);
		console.log('[HOOKS] Has session:', !!event.locals.session);
	}

	if (!isPublicRoute && !isApiRoute && !event.locals.session) {
		if (isLogoutRelated) {
			console.log('[HOOKS] Redirecting to /login (no session, not public route)');
		}
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
		if (isLogoutRelated) {
			console.log('[HOOKS] User is logged in but on /login, redirecting to /');
		}
		throw redirect(303, '/');
	}

	if (isLogoutRelated) {
		console.log('[HOOKS] Proceeding to resolve route:', event.url.pathname);
	}

	const response = await resolve(event);

	if (isLogoutRelated) {
		console.log('[HOOKS] Response status:', response.status);
		console.log('[HOOKS] Response headers:', JSON.stringify(Object.fromEntries(response.headers), null, 2));
		console.log('[HOOKS] ========================================');
	}

	return response;
};
