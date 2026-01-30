/**
 * Calendar Integration Health Check
 *
 * GET /api/integrations/calendar/health
 *
 * Lightweight endpoint for proactive token management.
 * Called by the frontend on page load to ensure calendar tokens
 * stay fresh — prevents the "please reconnect" experience by
 * refreshing tokens before they expire.
 *
 * Returns:
 * - status: 'healthy' | 'refreshed' | 'disconnected' | 'error'
 * - expiresAt: token expiry time (if connected)
 * - error: error details (if status is 'error')
 * - requiresReconnect: whether the user must manually reconnect
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresIntegrationsRepository } from '$lib/server/persistence/integrations-postgres';
import { postgresIntegrationCredentialsRepository } from '$lib/server/persistence/integration-credentials-postgres';
import { ensureValidToken } from '$lib/server/integrations/providers/calendar/token-service';

// ============================================================================
// GET - Health Check with Proactive Token Refresh
// ============================================================================

/**
 * GET /api/integrations/calendar/health
 * Checks calendar connection and proactively refreshes tokens if needed.
 *
 * Designed to be called on page load — lightweight and idempotent.
 */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		// Step 1: Check if user has a calendar integration
		const integration = await postgresIntegrationsRepository.findByUserAndService(userId, 'calendar');

		if (!integration) {
			return json({
				status: 'disconnected',
				connected: false,
				requiresReconnect: false
			});
		}

		if (integration.status === 'disconnected') {
			return json({
				status: 'disconnected',
				connected: false,
				requiresReconnect: false
			});
		}

		// Step 2: Ensure token is valid (proactively refreshes if expiring soon)
		const result = await ensureValidToken(integration.id);

		if (!result.success) {
			return json({
				status: 'error',
				connected: false,
				error: result.error,
				azureErrorCode: result.azureErrorCode,
				requiresReconnect: result.requiresReconnect,
				lastError: integration.lastError,
				lastErrorAt: integration.lastErrorAt
			});
		}

		// Step 3: Get the current token expiry for the frontend
		const expiresAt = await postgresIntegrationCredentialsRepository.getAccessTokenExpiration(integration.id);

		return json({
			status: 'healthy',
			connected: true,
			requiresReconnect: false,
			expiresAt,
			connectedAt: integration.connectedAt
		});
	} catch (error) {
		console.error('[Calendar Health] Unexpected error:', error);
		return json(
			{ status: 'error', connected: false, error: 'Health check failed', requiresReconnect: false },
			{ status: 500 }
		);
	}
};
