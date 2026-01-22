/**
 * Personal Usage Statistics API
 *
 * GET /api/user/usage?period=30 - Get current user's usage statistics
 *
 * Returns aggregated stats and model breakdown for the authenticated user.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresUsageRepository } from '$lib/server/persistence/usage-postgres';
import { formatCost } from '$lib/config/model-pricing';

/**
 * Validate period parameter
 * Allowed values: 7, 30, 90 (days)
 */
function validatePeriod(value: string | null): number {
	if (!value) return 30;
	const num = parseInt(value, 10);
	if ([7, 30, 90].includes(num)) return num;
	return 30;
}

/**
 * GET /api/user/usage
 * Returns personal usage statistics for the authenticated user
 *
 * Query params:
 * - period: 7 | 30 | 90 (days, default 30)
 *
 * Response:
 * {
 *   stats: { totalRequests, totalTokens, promptTokens, completionTokens, cacheReadTokens, estimatedCostMillicents, formattedCost },
 *   modelBreakdown: [{ model, totalRequests, totalTokens, promptTokens, completionTokens, cacheReadTokens, estimatedCostMillicents, formattedCost }],
 *   period: number
 * }
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;

	try {
		const period = validatePeriod(url.searchParams.get('period'));

		// Fetch stats and model breakdown in parallel
		const [stats, modelBreakdown] = await Promise.all([
			postgresUsageRepository.getUserStats(organizationId, userId, period),
			postgresUsageRepository.getModelBreakdownByUser(organizationId, userId, period)
		]);

		// Format the response with formatted costs
		return json({
			stats: {
				...stats,
				formattedCost: formatCost(stats.estimatedCostMillicents)
			},
			modelBreakdown: modelBreakdown.map((m) => ({
				...m,
				formattedCost: formatCost(m.estimatedCostMillicents)
			})),
			period
		});
	} catch (error) {
		console.error('Failed to get user usage stats:', error);
		return json(
			{ error: { message: 'Failed to get usage statistics', type: 'server_error' } },
			{ status: 500 }
		);
	}
};
