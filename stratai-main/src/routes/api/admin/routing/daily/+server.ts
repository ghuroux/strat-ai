/**
 * Admin Routing API - Daily Totals
 *
 * Returns daily routing decision totals for charting.
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { postgresRoutingDecisionsRepository } from '$lib/server/persistence/routing-decisions-postgres';
import { postgresOrgMembershipRepository } from '$lib/server/persistence';

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
		const dailyTotals = await postgresRoutingDecisionsRepository.getDailyTotals(organizationId, daysBack);

		return json({
			dailyTotals,
			period: daysBack
		});
	} catch (error) {
		console.error('Failed to get routing daily totals:', error);
		return json({ error: 'Failed to get routing daily totals' }, { status: 500 });
	}
};
