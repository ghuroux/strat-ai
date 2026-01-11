/**
 * Admin Routing API - Statistics
 *
 * Returns aggregated statistics for AUTO model routing decisions.
 * Used by the admin dashboard to visualize routing patterns.
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

	const periodParam = url.searchParams.get('period');
	const daysBack = periodParam === '7' ? 7 : periodParam === '90' ? 90 : 30;

	try {
		const stats = await postgresRoutingDecisionsRepository.getStats(organizationId, daysBack);

		return json({
			...stats,
			formattedSavings: formatCost(stats.estimatedSavingsMillicents),
			period: daysBack
		});
	} catch (error) {
		console.error('Failed to get routing stats:', error);
		return json({ error: 'Failed to get routing stats' }, { status: 500 });
	}
};
