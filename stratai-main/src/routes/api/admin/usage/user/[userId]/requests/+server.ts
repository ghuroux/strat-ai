/**
 * Admin Usage API - User Recent Requests by Model
 *
 * Returns recent individual requests for a specific user and model.
 * Used for drill-down view to show per-request cost breakdown.
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
	const model = url.searchParams.get('model');

	if (!model) {
		return json({ error: 'Model parameter is required' }, { status: 400 });
	}

	// Parse and validate limit
	let limit = parseInt(url.searchParams.get('limit') || '10', 10);
	if (isNaN(limit) || limit < 1) limit = 10;
	if (limit > 50) limit = 50;

	try {
		const requests = await postgresUsageRepository.getRecentRequestsByModel(
			organizationId,
			targetUserId,
			model,
			limit
		);

		return json({
			requests: requests.map((r) => ({
				...r,
				formattedCost: formatCost(r.estimatedCostMillicents),
				createdAt: r.createdAt.toISOString()
			})),
			model,
			userId: targetUserId
		});
	} catch (error) {
		console.error('Failed to get recent requests:', error);
		return json({ error: 'Failed to get recent requests' }, { status: 500 });
	}
};
