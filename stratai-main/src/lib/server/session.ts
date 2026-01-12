import { createHmac, timingSafeEqual } from 'crypto';
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

const SESSION_COOKIE_NAME = 'session';
const DEFAULT_MAX_AGE = 86400; // 24 hours

export interface SessionData {
	userId: string;
	organizationId: string;
	createdAt: number;
}

function getSessionSecret(): string {
	return env.SESSION_SECRET || 'default-secret-change-me';
}

function getSessionMaxAge(): number {
	return DEFAULT_MAX_AGE;
}

/**
 * Create a signed session token
 */
export function createSession(userId: string, organizationId: string): string {
	const data: SessionData = {
		userId,
		organizationId,
		createdAt: Date.now()
	};

	const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
	const signature = createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');

	return `${payload}.${signature}`;
}

/**
 * Verify and decode a session token
 */
export function verifySession(token: string): SessionData | null {
	const parts = token.split('.');
	if (parts.length !== 2) return null;

	const [payload, signature] = parts;
	if (!payload || !signature) return null;

	const expectedSignature = createHmac('sha256', getSessionSecret())
		.update(payload)
		.digest('base64url');

	try {
		if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
			return null;
		}
	} catch {
		return null;
	}

	try {
		const data: SessionData = JSON.parse(Buffer.from(payload, 'base64url').toString());

		// Check expiration
		const maxAge = getSessionMaxAge() * 1000;
		if (Date.now() - data.createdAt > maxAge) {
			return null;
		}

		return data;
	} catch {
		return null;
	}
}

/**
 * Set the session cookie
 * - secure: true in production (HTTPS), false in development
 * - sameSite: 'lax' allows redirects to work properly with cookies
 */
export function setSessionCookie(cookies: Cookies, token: string): void {
	cookies.set(SESSION_COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: getSessionMaxAge()
	});
}

/**
 * Get the session cookie value
 */
export function getSessionCookie(cookies: Cookies): string | undefined {
	return cookies.get(SESSION_COOKIE_NAME);
}

/**
 * Clear the session cookie
 */
export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}
