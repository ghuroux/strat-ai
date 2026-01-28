/**
 * Microsoft Calendar OAuth Handlers
 *
 * Handles Azure AD OAuth 2.0 flow for Microsoft Graph Calendar access.
 *
 * OAuth Flow:
 * 1. User clicks "Connect Calendar"
 * 2. We generate state token and redirect to Azure AD
 * 3. User consents to permissions
 * 4. Azure AD redirects back with authorization code
 * 5. We exchange code for tokens
 * 6. Store encrypted tokens
 *
 * See: docs/features/CALENDAR_INTEGRATION.md
 */

import { env } from '$env/dynamic/private';
import type { OAuthTokens } from '../base-provider';
import type { DecryptedCredential } from '$lib/types/integrations';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get Azure AD OAuth configuration from environment
 */
export function getAzureConfig() {
	const clientId = env.AZURE_CLIENT_ID;
	const clientSecret = env.AZURE_CLIENT_SECRET;
	const tenantId = env.AZURE_TENANT_ID;
	const redirectUri = env.AZURE_REDIRECT_URI || 'http://localhost:5173/api/integrations/callback/microsoft';

	if (!clientId || !clientSecret) {
		throw new Error(
			'Azure AD OAuth not configured. Set AZURE_CLIENT_ID and AZURE_CLIENT_SECRET environment variables.'
		);
	}

	// Use tenant-specific endpoint for single-tenant apps, or 'organizations' for multi-tenant
	// - Single-tenant: Use tenant ID (required for apps registered after 10/15/2018)
	// - Multi-tenant: Use 'organizations' (any Azure AD tenant, work/school accounts only)
	// - 'common' would also allow personal Microsoft accounts (@outlook.com)
	const authority = tenantId
		? `https://login.microsoftonline.com/${tenantId}`
		: 'https://login.microsoftonline.com/organizations';

	return {
		clientId,
		clientSecret,
		tenantId,
		redirectUri,
		authorizationUrl: `${authority}/oauth2/v2.0/authorize`,
		tokenUrl: `${authority}/oauth2/v2.0/token`,
		// Scopes required for calendar access
		scopes: [
			'https://graph.microsoft.com/Calendars.ReadWrite',
			'https://graph.microsoft.com/User.Read',
			'offline_access' // Required for refresh tokens
		]
	};
}

/**
 * Check if Azure OAuth is configured
 */
export function isAzureConfigured(): boolean {
	return !!(env.AZURE_CLIENT_ID && env.AZURE_CLIENT_SECRET);
}

// ============================================================================
// Authorization URL
// ============================================================================

/**
 * Generate the Azure AD authorization URL
 * The user will be redirected here to sign in and consent
 */
export function getAuthorizationUrl(state: string): string {
	const config = getAzureConfig();

	const params = new URLSearchParams({
		client_id: config.clientId,
		response_type: 'code',
		redirect_uri: config.redirectUri,
		response_mode: 'query',
		scope: config.scopes.join(' '),
		state: state,
		// Use select_account to allow switching users without forcing full consent
		// 'consent' was causing issues with admin approval in multi-tenant scenarios
		prompt: 'select_account'
	});

	return `${config.authorizationUrl}?${params.toString()}`;
}

// ============================================================================
// Token Exchange
// ============================================================================

/**
 * Exchange authorization code for OAuth tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
	const config = getAzureConfig();

	const params = new URLSearchParams({
		client_id: config.clientId,
		client_secret: config.clientSecret,
		code: code,
		redirect_uri: config.redirectUri,
		grant_type: 'authorization_code',
		scope: config.scopes.join(' ')
	});

	const response = await fetch(config.tokenUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: params.toString()
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		const errorMessage = errorData.error_description || errorData.error || 'Token exchange failed';
		throw new Error(`Azure AD token exchange failed: ${errorMessage}`);
	}

	const data = await response.json();

	return {
		accessToken: data.access_token,
		refreshToken: data.refresh_token,
		expiresIn: data.expires_in, // Usually 3600 (1 hour)
		scope: data.scope,
		tokenType: data.token_type
	};
}

/**
 * Refresh OAuth tokens using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
	const config = getAzureConfig();

	const params = new URLSearchParams({
		client_id: config.clientId,
		client_secret: config.clientSecret,
		refresh_token: refreshToken,
		grant_type: 'refresh_token',
		scope: config.scopes.join(' ')
	});

	const response = await fetch(config.tokenUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: params.toString()
	});

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		const errorMessage = errorData.error_description || errorData.error || 'Token refresh failed';
		throw new Error(`Azure AD token refresh failed: ${errorMessage}`);
	}

	const data = await response.json();

	return {
		accessToken: data.access_token,
		refreshToken: data.refresh_token || refreshToken, // May return new refresh token
		expiresIn: data.expires_in,
		scope: data.scope,
		tokenType: data.token_type
	};
}

// ============================================================================
// Token Conversion
// ============================================================================

/**
 * Convert OAuth tokens to credential format for storage
 */
export function tokensToCredentials(tokens: OAuthTokens): DecryptedCredential[] {
	const credentials: DecryptedCredential[] = [];

	// Access token
	credentials.push({
		type: 'access_token',
		value: tokens.accessToken,
		expiresAt: tokens.expiresIn
			? new Date(Date.now() + tokens.expiresIn * 1000)
			: null,
		scope: tokens.scope || null
	});

	// Refresh token (if provided)
	if (tokens.refreshToken) {
		credentials.push({
			type: 'refresh_token',
			value: tokens.refreshToken,
			expiresAt: null, // Refresh tokens don't expire (but can be revoked)
			scope: tokens.scope || null
		});
	}

	return credentials;
}

// ============================================================================
// User Info
// ============================================================================

/**
 * Microsoft Graph user info response
 */
export interface MicrosoftUserInfo {
	id: string;
	displayName: string;
	mail: string | null;
	userPrincipalName: string;
}

/**
 * Get user info from Microsoft Graph
 * Useful for validation and displaying connected account
 */
export async function getUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
	const response = await fetch('https://graph.microsoft.com/v1.0/me', {
		headers: {
			'Authorization': `Bearer ${accessToken}`
		}
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to get Microsoft user info: ${response.status} ${errorText}`);
	}

	return response.json();
}

// ============================================================================
// Token Revocation
// ============================================================================

/**
 * Revoke OAuth tokens (disconnect)
 * Note: Microsoft Graph doesn't have a dedicated revocation endpoint,
 * but we can clear the tokens from our database
 */
export async function revokeTokens(_accessToken: string): Promise<void> {
	// Microsoft doesn't have a standard revocation endpoint for personal accounts
	// Enterprise tenants may use: https://login.microsoftonline.com/common/oauth2/v2.0/logout
	// For now, we just rely on removing tokens from our database
	// The access token will expire naturally in ~1 hour
}
