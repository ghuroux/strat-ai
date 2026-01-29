/**
 * Calendar Helper Functions
 *
 * Shared utilities for calendar integration, extracted from endpoint patterns.
 * Handles integration lookup, credential retrieval, and token refresh.
 *
 * See: docs/features/CALENDAR_INTEGRATION.md
 */

import { CalendarClient } from './client';
import { refreshAccessToken, tokensToCredentials } from './oauth';
import { postgresIntegrationsRepository } from '$lib/server/persistence/integrations-postgres';
import { postgresIntegrationCredentialsRepository } from '$lib/server/persistence/integration-credentials-postgres';

// ============================================================================
// Types
// ============================================================================

export type GetCalendarClientResult =
	| { connected: true; client: CalendarClient }
	| { connected: false; reason: string };

// ============================================================================
// Helper
// ============================================================================

/**
 * Get an authenticated CalendarClient for a user.
 *
 * Performs the full flow:
 * 1. Look up calendar integration for user
 * 2. Get decrypted credentials
 * 3. Auto-refresh if token expired
 * 4. Return ready-to-use client (or reason for failure)
 */
export async function getAuthenticatedCalendarClient(
	userId: string
): Promise<GetCalendarClientResult> {
	// Step 1: Check if user has a calendar integration
	const integration = await postgresIntegrationsRepository.findByUserAndService(userId, 'calendar');

	if (!integration || integration.status !== 'connected') {
		return { connected: false, reason: 'Calendar not connected' };
	}

	// Step 2: Get credentials
	const credentials = await postgresIntegrationCredentialsRepository.getDecryptedCredentials(integration.id);
	let accessTokenCred = credentials.find(c => c.type === 'access_token');
	const refreshTokenCred = credentials.find(c => c.type === 'refresh_token');

	if (!accessTokenCred) {
		return { connected: false, reason: 'No access token found — please reconnect your calendar' };
	}

	// Step 3: Refresh token if expired
	if (accessTokenCred.expiresAt && new Date(accessTokenCred.expiresAt) < new Date()) {
		if (!refreshTokenCred) {
			return { connected: false, reason: 'Access token expired and no refresh token — please reconnect your calendar' };
		}

		try {
			const newTokens = await refreshAccessToken(refreshTokenCred.value);
			const newCredentials = tokensToCredentials(newTokens);

			// Upsert new credentials
			for (const cred of newCredentials) {
				await postgresIntegrationCredentialsRepository.upsert({
					integrationId: integration.id,
					credentialType: cred.type,
					value: cred.value,
					expiresAt: cred.expiresAt,
					scope: cred.scope
				});
			}

			// Use the new access token
			const refreshedCred = newCredentials.find(c => c.type === 'access_token');
			if (refreshedCred) {
				accessTokenCred = refreshedCred;
			}
		} catch (refreshError) {
			console.error('[Calendar Helper] Token refresh failed:', refreshError);
			return { connected: false, reason: 'Failed to refresh calendar access — please reconnect' };
		}
	}

	// Step 4: Return client
	return {
		connected: true,
		client: new CalendarClient(accessTokenCred.value)
	};
}
