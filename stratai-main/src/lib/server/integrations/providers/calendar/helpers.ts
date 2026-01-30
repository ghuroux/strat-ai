/**
 * Calendar Helper Functions
 *
 * Shared utilities for calendar integration, extracted from endpoint patterns.
 * Handles integration lookup and authenticated client creation.
 *
 * Token refresh is delegated to the centralized token-service.ts which provides
 * mutex protection, retry logic, and proactive refresh.
 *
 * See: docs/features/CALENDAR_INTEGRATION.md
 */

import { CalendarClient } from './client';
import { ensureValidToken } from './token-service';
import { postgresIntegrationsRepository } from '$lib/server/persistence/integrations-postgres';

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
 * 2. Ensure a valid access token (proactive refresh via token service)
 * 3. Return ready-to-use client (or reason for failure)
 */
export async function getAuthenticatedCalendarClient(
	userId: string
): Promise<GetCalendarClientResult> {
	// Step 1: Check if user has a calendar integration
	const integration = await postgresIntegrationsRepository.findByUserAndService(userId, 'calendar');

	if (!integration || integration.status === 'disconnected') {
		return { connected: false, reason: 'Calendar not connected' };
	}

	// Step 2: Ensure valid token (handles proactive refresh, retry, mutex)
	const tokenResult = await ensureValidToken(integration.id);

	if (!tokenResult.success) {
		return { connected: false, reason: tokenResult.error ?? 'Token refresh failed' };
	}

	// Step 3: Return client with fresh token
	return {
		connected: true,
		client: new CalendarClient(tokenResult.accessToken!)
	};
}
