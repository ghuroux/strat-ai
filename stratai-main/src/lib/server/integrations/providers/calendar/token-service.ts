/**
 * Calendar Token Service
 *
 * Centralized token refresh with:
 * - Race condition protection (in-process mutex per integration)
 * - Retry with exponential backoff
 * - Proactive refresh (before expiry, not just after)
 * - Azure AD error code parsing for diagnostics
 *
 * This replaces the inline refresh logic previously duplicated in
 * helpers.ts and chat/+server.ts.
 *
 * See: docs/features/CALENDAR_INTEGRATION.md
 */

import { refreshAccessToken, tokensToCredentials } from './oauth';
import { postgresIntegrationCredentialsRepository } from '$lib/server/persistence/integration-credentials-postgres';
import { postgresIntegrationsRepository } from '$lib/server/persistence/integrations-postgres';
import type { DecryptedCredential } from '$lib/types/integrations';

// ============================================================================
// Types
// ============================================================================

export interface TokenRefreshResult {
	success: boolean;
	accessToken?: string;
	/** Human-readable error message */
	error?: string;
	/** Azure AD error code (e.g. AADSTS700082) for diagnostics */
	azureErrorCode?: string;
	/** Whether the user needs to manually reconnect */
	requiresReconnect: boolean;
}

interface AzureErrorInfo {
	code: string;
	description: string;
	isRetryable: boolean;
	requiresReconnect: boolean;
}

// ============================================================================
// In-process Mutex
// ============================================================================

/**
 * Active refresh promises keyed by integrationId.
 * Prevents concurrent refresh attempts from racing and invalidating
 * each other's refresh tokens (Azure AD rotates on use).
 */
const activeRefreshes = new Map<string, Promise<TokenRefreshResult>>();

// ============================================================================
// Azure AD Error Parsing
// ============================================================================

/** Known Azure AD error codes and their semantics */
const AZURE_ERROR_CODES: Record<string, { retryable: boolean; reconnect: boolean; description: string }> = {
	'AADSTS700082': { retryable: false, reconnect: true, description: 'Refresh token expired' },
	'AADSTS700084': { retryable: false, reconnect: true, description: 'Refresh token was issued to wrong app type' },
	'AADSTS50173': { retryable: false, reconnect: true, description: 'Grant revoked (password change or admin action)' },
	'AADSTS50076': { retryable: false, reconnect: true, description: 'MFA required — re-authentication needed' },
	'AADSTS50078': { retryable: false, reconnect: true, description: 'Conditional Access requires re-authentication' },
	'AADSTS50014': { retryable: false, reconnect: true, description: 'Guest account max passthrough lifetime exceeded' },
	'AADSTS65001': { retryable: false, reconnect: true, description: 'User or admin has not consented to use the app' },
	'AADSTS70000': { retryable: false, reconnect: true, description: 'Invalid grant (general — token invalid)' },
	'AADSTS70008': { retryable: false, reconnect: true, description: 'Authorization code or refresh token expired' },
	'AADSTS500011': { retryable: true, reconnect: false, description: 'Resource principal not found (transient)' },
	'AADSTS500121': { retryable: false, reconnect: true, description: 'Authentication failed during strong auth' },
	'AADSTS7000215': { retryable: false, reconnect: true, description: 'Invalid client secret provided' },
	'AADSTS7000222': { retryable: false, reconnect: true, description: 'Client secret expired' },
};

/**
 * Parse Azure AD error from a caught error.
 * Azure token endpoint errors include AADSTS codes in the message.
 */
function parseAzureError(error: unknown): AzureErrorInfo {
	const message = error instanceof Error ? error.message : String(error);

	// Extract AADSTS error code from message (e.g., "AADSTS700082: ...")
	const codeMatch = message.match(/AADSTS\d+/);
	const code = codeMatch ? codeMatch[0] : 'UNKNOWN';

	const known = AZURE_ERROR_CODES[code];
	if (known) {
		return {
			code,
			description: known.description,
			isRetryable: known.retryable,
			requiresReconnect: known.reconnect
		};
	}

	// Unknown error — assume transient (retryable) on first attempt
	// but require reconnect if all retries fail
	return {
		code,
		description: message,
		isRetryable: true,
		requiresReconnect: false
	};
}

// ============================================================================
// Constants
// ============================================================================

/** Refresh the token if it expires within this many minutes */
const PROACTIVE_REFRESH_BUFFER_MINUTES = 5;

/** Maximum retry attempts for transient failures */
const MAX_RETRIES = 2;

/** Base delay for exponential backoff (ms) */
const RETRY_BASE_DELAY_MS = 500;

// ============================================================================
// Core Logic
// ============================================================================

/**
 * Ensure a valid access token is available for an integration.
 *
 * This is the single entry point for all token refresh logic.
 * It handles:
 * - Checking if the current token is still valid
 * - Proactive refresh when token is about to expire
 * - Mutex to prevent concurrent refresh races
 * - Retry with backoff for transient Azure AD errors
 * - Proper error classification and status transitions
 *
 * @param integrationId - The integration to ensure a valid token for
 * @returns Result with access token or error details
 */
export async function ensureValidToken(integrationId: string): Promise<TokenRefreshResult> {
	// Step 1: Check if current access token is valid (and not expiring soon)
	const currentToken = await postgresIntegrationCredentialsRepository.getDecryptedCredential(
		integrationId,
		'access_token'
	);

	if (currentToken && !isExpiringSoon(currentToken)) {
		return { success: true, accessToken: currentToken.value, requiresReconnect: false };
	}

	// Step 2: Token is expired or expiring soon — need to refresh
	// Use mutex to prevent concurrent refresh race conditions
	const existing = activeRefreshes.get(integrationId);
	if (existing) {
		console.log(`[TokenService] Refresh already in progress for integration ${integrationId}, waiting...`);
		return existing;
	}

	const refreshPromise = executeRefresh(integrationId);
	activeRefreshes.set(integrationId, refreshPromise);

	try {
		return await refreshPromise;
	} finally {
		activeRefreshes.delete(integrationId);
	}
}

/**
 * Check whether a credential is expired or expiring within the buffer window.
 */
function isExpiringSoon(credential: DecryptedCredential): boolean {
	if (!credential.expiresAt) return false;

	const expiresAt = new Date(credential.expiresAt);
	const bufferMs = PROACTIVE_REFRESH_BUFFER_MINUTES * 60 * 1000;
	return expiresAt.getTime() - bufferMs < Date.now();
}

/**
 * Execute the actual token refresh with retry logic.
 */
async function executeRefresh(integrationId: string): Promise<TokenRefreshResult> {
	// Get the refresh token
	const refreshTokenCred = await postgresIntegrationCredentialsRepository.getDecryptedCredential(
		integrationId,
		'refresh_token'
	);

	if (!refreshTokenCred) {
		console.warn(`[TokenService] No refresh token for integration ${integrationId}`);
		await markIntegrationError(integrationId, 'No refresh token available');
		return {
			success: false,
			error: 'No refresh token available — please reconnect your calendar',
			requiresReconnect: true
		};
	}

	// Retry loop
	let lastError: AzureErrorInfo | null = null;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		try {
			if (attempt > 0) {
				const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
				console.log(`[TokenService] Retry ${attempt}/${MAX_RETRIES} for integration ${integrationId} after ${delay}ms`);
				await sleep(delay);
			}

			const newTokens = await refreshAccessToken(refreshTokenCred.value);
			const newCredentials = tokensToCredentials(newTokens);

			// Store the new credentials (including rotated refresh token)
			for (const cred of newCredentials) {
				await postgresIntegrationCredentialsRepository.upsert({
					integrationId,
					credentialType: cred.type,
					value: cred.value,
					expiresAt: cred.expiresAt,
					scope: cred.scope
				});
			}

			// Ensure integration status is 'connected' (might have been 'error' from a previous failure)
			await postgresIntegrationsRepository.updateStatus(integrationId, 'connected');

			console.log(`[TokenService] Token refreshed successfully for integration ${integrationId}${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}`);

			return {
				success: true,
				accessToken: newTokens.accessToken,
				requiresReconnect: false
			};
		} catch (error) {
			lastError = parseAzureError(error);

			console.error(
				`[TokenService] Refresh failed for integration ${integrationId} (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`,
				`code=${lastError.code}`,
				`retryable=${lastError.isRetryable}`,
				`reconnect=${lastError.requiresReconnect}`,
				`desc="${lastError.description}"`
			);

			// Don't retry non-retryable errors (e.g. revoked tokens, expired refresh tokens)
			if (!lastError.isRetryable) {
				break;
			}
		}
	}

	// All retries exhausted or non-retryable error
	const requiresReconnect = lastError?.requiresReconnect ?? true;
	const errorMessage = lastError
		? `${lastError.code}: ${lastError.description}`
		: 'Token refresh failed';

	await markIntegrationError(integrationId, errorMessage);

	return {
		success: false,
		error: requiresReconnect
			? 'Calendar access expired — please reconnect your calendar'
			: `Calendar refresh failed — ${lastError?.description ?? 'unknown error'}`,
		azureErrorCode: lastError?.code,
		requiresReconnect
	};
}

// ============================================================================
// Helpers
// ============================================================================

async function markIntegrationError(integrationId: string, errorMessage: string): Promise<void> {
	try {
		await postgresIntegrationsRepository.updateStatus(integrationId, 'error', {
			message: errorMessage,
			at: new Date()
		});
	} catch (err) {
		console.error(`[TokenService] Failed to update integration status:`, err);
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
