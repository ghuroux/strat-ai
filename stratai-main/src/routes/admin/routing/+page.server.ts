/**
 * Admin Routing Page Server Load
 *
 * Loads routing analytics data for the admin dashboard.
 */

import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { postgresRoutingDecisionsRepository } from '$lib/server/persistence/routing-decisions-postgres';
import { postgresOrgMembershipRepository } from '$lib/server/persistence';
import { formatCost } from '$lib/config/model-pricing';

export const load: PageServerLoad = async ({ url, locals }) => {
	// Require authentication
	if (!locals.session) {
		throw redirect(302, '/');
	}

	const { userId, organizationId } = locals.session;

	// Check user role - only owners and admins can view
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
	const membership = memberships.find((m) => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		throw redirect(302, '/');
	}

	const periodParam = url.searchParams.get('period');
	const period = periodParam === '7' ? 7 : periodParam === '90' ? 90 : 30;

	try {
		const [stats, decisions, dailyTotals] = await Promise.all([
			postgresRoutingDecisionsRepository.getStats(organizationId, period),
			postgresRoutingDecisionsRepository.getRecentDecisions(organizationId, 20),
			postgresRoutingDecisionsRepository.getDailyTotals(organizationId, period)
		]);

		return {
			routing: {
				stats: {
					...stats,
					formattedSavings: formatCost(stats.estimatedSavingsMillicents)
				},
				decisions: decisions.map((d) => ({
					id: d.id,
					createdAt: d.createdAt.toISOString(),
					provider: d.provider,
					selectedModel: d.selectedModel,
					tier: d.tier,
					score: d.score,
					confidence: d.confidence,
					reasoning: d.reasoning,
					queryLength: d.queryLength,
					detectedPatterns: d.detectedPatterns,
					overrides: d.overrides,
					requestSucceeded: d.requestSucceeded,
					responseTokens: d.responseTokens,
					estimatedCost: d.estimatedCostMillicents ? formatCost(d.estimatedCostMillicents) : null,
					routingTimeMs: d.routingTimeMs
				})),
				dailyTotals,
				period
			}
		};
	} catch (error) {
		console.error('Failed to load routing data:', error);
		return {
			routing: {
				stats: {
					totalDecisions: 0,
					autoUsagePercent: 0,
					avgScore: 0,
					avgConfidence: 0,
					avgRoutingTimeMs: 0,
					tierDistribution: { simple: 0, medium: 0, complex: 0 },
					tierPercentages: { simple: 0, medium: 0, complex: 0 },
					modelDistribution: [],
					overrideFrequency: [],
					estimatedSavingsMillicents: 0,
					formattedSavings: '$0',
					successRate: 100
				},
				decisions: [],
				dailyTotals: [],
				period
			}
		};
	}
};
