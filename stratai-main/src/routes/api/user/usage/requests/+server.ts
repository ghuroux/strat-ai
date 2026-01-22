/**
 * Recent Requests API
 *
 * GET /api/user/usage/requests?model=xyz&limit=10
 *
 * Returns recent individual requests for a specific model.
 * Used for drill-down view to show per-request cost breakdown.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresUsageRepository } from '$lib/server/persistence/usage-postgres';
import { formatCost } from '$lib/config/model-pricing';

/**
 * GET /api/user/usage/requests
 * Returns recent requests for the specified model
 *
 * Query params:
 * - model: string (required) - The model to get requests for
 * - limit: number (optional, default 10, max 50)
 *
 * Response:
 * {
 *   requests: [{
 *     id, requestType, promptTokens, completionTokens, totalTokens,
 *     cacheReadTokens, estimatedCostMillicents, formattedCost, createdAt
 *   }],
 *   model: string
 * }
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;
	const model = url.searchParams.get('model');

	if (!model) {
		return json(
			{ error: { message: 'Model parameter is required', type: 'validation_error' } },
			{ status: 400 }
		);
	}

	// Parse and validate limit
	let limit = parseInt(url.searchParams.get('limit') || '10', 10);
	if (isNaN(limit) || limit < 1) limit = 10;
	if (limit > 50) limit = 50;

	try {
		const requests = await postgresUsageRepository.getRecentRequestsByModel(
			organizationId,
			userId,
			model,
			limit
		);

		return json({
			requests: requests.map((r) => ({
				...r,
				formattedCost: formatCost(r.estimatedCostMillicents),
				createdAt: r.createdAt.toISOString()
			})),
			model
		});
	} catch (error) {
		console.error('Failed to get recent requests:', error);
		return json(
			{ error: { message: 'Failed to get recent requests', type: 'server_error' } },
			{ status: 500 }
		);
	}
};
