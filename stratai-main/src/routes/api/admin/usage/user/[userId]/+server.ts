/**
 * Admin Usage API - User Model Breakdown
 *
 * Returns model-by-model usage breakdown for a specific user.
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { postgresUsageRepository } from '$lib/server/persistence/usage-postgres';
import { postgresOrgMembershipRepository } from '$lib/server/persistence';
import { formatCost } from '$lib/config/model-pricing';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;

	// Check user role - only owners and admins can view usage data
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
	const membership = memberships.find((m) => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const targetUserId = params.userId;
	const periodParam = url.searchParams.get('period');
	const daysBack = periodParam === '7' ? 7 : periodParam === '90' ? 90 : 30;

	try {
		const modelBreakdown = await postgresUsageRepository.getModelBreakdownByUser(
			organizationId,
			targetUserId,
			daysBack
		);

		return json({
			modelBreakdown: modelBreakdown.map((m) => ({
				...m,
				formattedCost: formatCost(m.estimatedCostMillicents)
			}))
		});
	} catch (error) {
		console.error('Failed to get user model breakdown:', error);
		return json({ error: 'Failed to get user model breakdown' }, { status: 500 });
	}
};
