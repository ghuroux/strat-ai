/**
 * Integration Management API
 *
 * GET /api/integrations/:service - Get connection status
 * POST /api/integrations/:service - Start OAuth flow (returns authUrl)
 * DELETE /api/integrations/:service - Disconnect integration
 *
 * Constraints:
 * - Requires authentication
 * - Service must be a valid ServiceType
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresIntegrationsRepository } from '$lib/server/persistence/integrations-postgres';
import { postgresIntegrationCredentialsRepository } from '$lib/server/persistence/integration-credentials-postgres';
import { postgresOAuthStatesRepository } from '$lib/server/persistence/oauth-states-postgres';
import { getServiceMetadata, type ServiceType, SERVICE_METADATA } from '$lib/types/integrations';
import { getAuthorizationUrl, isAzureConfigured } from '$lib/server/integrations/providers/calendar/oauth';

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if service type is valid
 */
function isValidServiceType(service: string): service is ServiceType {
	return service in SERVICE_METADATA;
}

// ============================================================================
// GET - Get Connection Status
// ============================================================================

/**
 * GET /api/integrations/:service
 * Returns the connection status for a specific integration
 *
 * Path params:
 * - service: ServiceType (calendar, github, etc.)
 *
 * Returns:
 * - connected: boolean
 * - status: IntegrationStatus
 * - connectedAt: Date | null
 * - displayName: string
 * - description: string
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	// Authentication check
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { service } = params;

	// Validate service type
	if (!isValidServiceType(service)) {
		return json({ error: `Invalid service type: ${service}` }, { status: 400 });
	}

	try {
		// Get integration if exists
		const integration = await postgresIntegrationsRepository.findByUserAndService(userId, service);
		const metadata = getServiceMetadata(service);

		if (!integration) {
			// Not connected
			return json({
				connected: false,
				status: 'disconnected',
				connectedAt: null,
				displayName: metadata.displayName,
				description: metadata.description,
				tier: metadata.tier,
				icon: metadata.icon
			});
		}

		// Check if credentials are valid
		const hasValidToken = await postgresIntegrationCredentialsRepository.hasValidAccessToken(integration.id);
		const expiresAt = await postgresIntegrationCredentialsRepository.getAccessTokenExpiration(integration.id);

		return json({
			connected: integration.status === 'connected',
			status: integration.status,
			connectedAt: integration.connectedAt,
			lastError: integration.lastError,
			lastErrorAt: integration.lastErrorAt,
			config: integration.config,
			displayName: metadata.displayName,
			description: metadata.description,
			tier: metadata.tier,
			icon: metadata.icon,
			hasValidToken,
			tokenExpiresAt: expiresAt
		});
	} catch (error) {
		console.error('Failed to get integration status:', error);
		return json(
			{ error: 'Failed to get integration status', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

// ============================================================================
// POST - Start OAuth Flow
// ============================================================================

/**
 * POST /api/integrations/:service
 * Initiates the OAuth flow for connecting an integration
 *
 * Path params:
 * - service: ServiceType (calendar, github, etc.)
 *
 * Body (optional):
 * - returnUrl: URL to redirect to after OAuth completes
 * - spaceId: For space-level integrations (GitHub)
 *
 * Returns:
 * - authUrl: URL to redirect user to for OAuth
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	// Authentication check
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const orgId = locals.session.organizationId;
	const { service } = params;

	// Validate service type
	if (!isValidServiceType(service)) {
		return json({ error: `Invalid service type: ${service}` }, { status: 400 });
	}

	try {
		// Parse optional body
		let body: { returnUrl?: string; spaceId?: string } = {};
		try {
			body = await request.json();
		} catch {
			// No body or invalid JSON - that's fine
		}

		// Service-specific OAuth setup
		if (service === 'calendar') {
			// Check Azure configuration
			if (!isAzureConfigured()) {
				return json(
					{ error: 'Calendar integration not configured. Please contact your administrator.' },
					{ status: 503 }
				);
			}

			// Create OAuth state for CSRF protection
			const oauthState = await postgresOAuthStatesRepository.create({
				userId,
				serviceType: service,
				context: {
					returnUrl: body.returnUrl || '/settings/integrations',
					orgId
				}
			});

			// Generate authorization URL
			const authUrl = getAuthorizationUrl(oauthState.state);

			return json({ authUrl });
		}

		// Other services not yet implemented
		return json(
			{ error: `${service} integration is not yet available` },
			{ status: 501 }
		);
	} catch (error) {
		console.error('Failed to start OAuth flow:', error);
		return json(
			{ error: 'Failed to start OAuth flow', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

// ============================================================================
// DELETE - Disconnect Integration
// ============================================================================

/**
 * DELETE /api/integrations/:service
 * Disconnects an integration and removes stored credentials
 *
 * Path params:
 * - service: ServiceType (calendar, github, etc.)
 *
 * Returns:
 * - success: boolean
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	// Authentication check
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { service } = params;

	// Validate service type
	if (!isValidServiceType(service)) {
		return json({ error: `Invalid service type: ${service}` }, { status: 400 });
	}

	try {
		// Find the integration
		const integration = await postgresIntegrationsRepository.findByUserAndService(userId, service);

		if (!integration) {
			return json({ error: 'Integration not found' }, { status: 404 });
		}

		// Delete integration (credentials cascade delete)
		await postgresIntegrationsRepository.delete(integration.id);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to disconnect integration:', error);
		return json(
			{ error: 'Failed to disconnect integration', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
