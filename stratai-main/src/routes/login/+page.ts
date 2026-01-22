/**
 * Login Page Load Function
 *
 * Extracts returnUrl from query parameters for post-login redirect.
 * Validates the URL to prevent open redirect vulnerabilities.
 */

import type { PageLoad } from './$types';

/**
 * Validate that a return URL is safe to redirect to.
 * Must be a relative path (starts with /), no protocol-relative, no javascript: URLs.
 * Prefixed with _ to be valid SvelteKit export (used by +page.server.ts).
 *
 * @param url - The URL to validate
 * @returns true if the URL is safe for redirecting
 */
export function _validateReturnUrl(url: string | null): url is string {
	if (!url) return false;

	// Must start with single forward slash (relative path)
	// Reject protocol-relative URLs like "//evil.com"
	if (!url.startsWith('/') || url.startsWith('//')) return false;

	// Reject javascript: URLs (XSS attack vector)
	// Check case-insensitively and handle URL encoding
	const decoded = decodeURIComponent(url).toLowerCase();
	if (decoded.includes('javascript:')) return false;

	// Reject data: URLs
	if (decoded.includes('data:')) return false;

	return true;
}

export const load: PageLoad = ({ url }) => {
	const returnUrl = url.searchParams.get('returnUrl');
	const sessionExpired = url.searchParams.get('session_expired') === 'true';

	// Only return the URL if it passes validation
	const validReturnUrl = _validateReturnUrl(returnUrl) ? returnUrl : null;

	return {
		returnUrl: validReturnUrl,
		sessionExpired
	};
};
