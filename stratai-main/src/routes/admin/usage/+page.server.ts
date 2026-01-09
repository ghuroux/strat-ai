/**
 * Admin Usage Page Server
 *
 * Loads usage statistics for the organization.
 */

import type { PageServerLoad } from './$types';
import { postgresUsageRepository } from '$lib/server/persistence/usage-postgres';
import { formatCost } from '$lib/config/model-pricing';

export const load: PageServerLoad = async ({ locals, url }) => {
	const orgId = locals.session!.organizationId;

	// Get period from query params (default 30 days)
	const periodParam = url.searchParams.get('period');
	const daysBack = periodParam === '7' ? 7 : periodParam === '90' ? 90 : 30;

	// Get usage statistics
	const [usageStats, modelBreakdown, userBreakdown, dailyUsage] = await Promise.all([
		postgresUsageRepository.getStats(orgId, daysBack),
		postgresUsageRepository.getAggregateByModel(orgId, daysBack),
		postgresUsageRepository.getAggregateByUser(orgId, daysBack),
		postgresUsageRepository.getDailyTotals(orgId, daysBack)
	]);

	return {
		usage: {
			stats: {
				...usageStats,
				formattedCost: formatCost(usageStats.estimatedCostMillicents)
			},
			modelBreakdown: modelBreakdown.map(m => ({
				...m,
				formattedCost: formatCost(m.estimatedCostMillicents)
			})),
			userBreakdown: userBreakdown.map((u) => ({
				userId: u.userId,
				displayName: u.displayName,
				username: u.username,
				totalRequests: u.totalRequests,
				totalTokens: u.totalTokens,
				promptTokens: u.promptTokens,
				completionTokens: u.completionTokens,
				cacheReadTokens: u.cacheReadTokens,
				estimatedCostMillicents: u.estimatedCostMillicents,
				formattedCost: formatCost(u.estimatedCostMillicents)
			})),
			dailyUsage,
			period: daysBack
		}
	};
};
