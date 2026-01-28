/**
 * Microsoft OAuth Callback Endpoint
 *
 * GET /api/integrations/callback/microsoft
 * Handles the OAuth redirect from Azure AD after user consents
 *
 * Query params:
 * - code: Authorization code from Azure AD
 * - state: CSRF protection token
 * - error: Error code if user denied consent
 * - error_description: Human-readable error message
 *
 * Flow:
 * 1. Validate state token (CSRF protection)
 * 2. Exchange code for tokens
 * 3. Get user info for validation
 * 4. Create/update integration record
 * 5. Store encrypted credentials
 * 6. Redirect to returnUrl
 */

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresOAuthStatesRepository } from '$lib/server/persistence/oauth-states-postgres';
import { postgresIntegrationsRepository } from '$lib/server/persistence/integrations-postgres';
import { postgresIntegrationCredentialsRepository } from '$lib/server/persistence/integration-credentials-postgres';
import {
	exchangeCodeForTokens,
	tokensToCredentials,
	getUserInfo
} from '$lib/server/integrations/providers/calendar/oauth';

// ============================================================================
// GET - OAuth Callback
// ============================================================================

export const GET: RequestHandler = async ({ url, locals }) => {
	// Get query parameters
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');
	const errorDescription = url.searchParams.get('error_description');
	const adminConsent = url.searchParams.get('admin_consent');

	// Default return URL (settings page with integrations section)
	let returnUrl = '/settings';

	try {
		// Handle admin consent response (different from regular OAuth)
		// Admin consent returns: ?admin_consent=True&tenant={tenant_id}
		if (adminConsent === 'True') {
			console.log('Admin consent granted for tenant');
			return redirect(302, `${returnUrl}?admin_consent=granted`);
		}

		// Handle OAuth errors (user denied consent, etc.)
		if (error) {
			console.error('OAuth error:', error, errorDescription);
			const errorMsg = encodeURIComponent(errorDescription || error);
			return redirect(302, `${returnUrl}?error=${errorMsg}`);
		}

		// Validate required parameters
		if (!code || !state) {
			return redirect(302, `${returnUrl}?error=${encodeURIComponent('Missing authorization code or state. Please try connecting again.')}`);
		}

		// Validate state token (CSRF protection)
		const oauthState = await postgresOAuthStatesRepository.consume(state);
		if (!oauthState) {
			return redirect(302, `${returnUrl}?error=${encodeURIComponent('Invalid or expired state token. Please try again.')}`);
		}

		// Update return URL from state context
		if (oauthState.context.returnUrl) {
			returnUrl = oauthState.context.returnUrl as string;
		}

		// Verify the user making the request matches the OAuth state
		if (locals.session && locals.session.userId !== oauthState.userId) {
			return redirect(302, `${returnUrl}?error=${encodeURIComponent('Session mismatch. Please try again.')}`);
		}

		// Exchange authorization code for tokens
		const tokens = await exchangeCodeForTokens(code);

		// Get user info to validate the connection
		const userInfo = await getUserInfo(tokens.accessToken);
		console.log('Microsoft user connected:', userInfo.displayName, userInfo.mail || userInfo.userPrincipalName);

		// Convert tokens to credential format
		const credentials = tokensToCredentials(tokens);

		// Create or update integration record
		let integration = await postgresIntegrationsRepository.findByUserAndService(
			oauthState.userId,
			'calendar'
		);

		if (integration) {
			// Update existing integration
			await postgresIntegrationsRepository.updateStatus(integration.id, 'connected');

			// Update credentials (upsert)
			for (const cred of credentials) {
				await postgresIntegrationCredentialsRepository.upsert({
					integrationId: integration.id,
					credentialType: cred.type,
					value: cred.value,
					expiresAt: cred.expiresAt,
					scope: cred.scope
				});
			}
		} else {
			// Create new integration
			integration = await postgresIntegrationsRepository.create({
				userId: oauthState.userId,
				orgId: oauthState.context.orgId as string | undefined,
				serviceType: 'calendar',
				config: {
					// Store connected user info for display
					connectedEmail: userInfo.mail || userInfo.userPrincipalName,
					connectedName: userInfo.displayName
				}
			});

			// Store credentials
			for (const cred of credentials) {
				await postgresIntegrationCredentialsRepository.create({
					integrationId: integration.id,
					credentialType: cred.type,
					value: cred.value,
					expiresAt: cred.expiresAt,
					scope: cred.scope
				});
			}

			// Update status to connected
			await postgresIntegrationsRepository.updateStatus(integration.id, 'connected');
		}

		// Redirect to success URL
		return redirect(302, `${returnUrl}?connected=calendar`);

	} catch (err) {
		// SvelteKit's redirect() throws a Redirect object - let it through
		if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
			throw err;
		}

		console.error('OAuth callback error:', err);
		const errorMsg = err instanceof Error ? err.message : 'Unknown error';
		return redirect(302, `${returnUrl}?error=${encodeURIComponent(errorMsg)}`);
	}
};
