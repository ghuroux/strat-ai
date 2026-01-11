/**
 * Admin Routing API - Recent Decisions
 *
 * Returns list of recent AUTO model routing decisions.
 * Used for debugging and understanding routing behavior.
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { postgresRoutingDecisionsRepository } from '$lib/server/persistence/routing-decisions-postgres';
import { postgresOrgMembershipRepository } from '$lib/server/persistence';
import { formatCost } from '$lib/config/model-pricing';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;

	// Check user role - only owners and admins can view routing data
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
	const membership = memberships.find((m) => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const limitParam = url.searchParams.get('limit');
	const limit = Math.min(Math.max(parseInt(limitParam || '50', 10), 1), 100);

	try {
		const decisions = await postgresRoutingDecisionsRepository.getRecentDecisions(organizationId, limit);

		return json({
			decisions: decisions.map((d) => ({
				id: d.id,
				createdAt: d.createdAt,
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
			}))
		});
	} catch (error) {
		console.error('Failed to get routing decisions:', error);
		return json({ error: 'Failed to get routing decisions' }, { status: 500 });
	}
};
