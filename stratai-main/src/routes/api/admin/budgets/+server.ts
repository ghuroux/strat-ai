/**
 * Admin Budgets API
 *
 * Handles organization budget settings updates.
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { sql, postgresOrgMembershipRepository } from '$lib/server/persistence';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;

	// Check user role - only owners and admins can update budgets
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
	const membership = memberships.find((m) => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const { monthlyBudget, budgetAlertThreshold, budgetHardLimit } = body;

		// Validate monthly budget
		if (monthlyBudget !== undefined && monthlyBudget !== null) {
			const budget = parseFloat(monthlyBudget);
			if (isNaN(budget) || budget < 0) {
				return json({ error: 'Invalid monthly budget value' }, { status: 400 });
			}
		}

		// Validate alert threshold
		if (budgetAlertThreshold !== undefined) {
			const threshold = parseInt(budgetAlertThreshold, 10);
			if (isNaN(threshold) || threshold < 0 || threshold > 100) {
				return json({ error: 'Alert threshold must be between 0 and 100' }, { status: 400 });
			}
		}

		// Update organization budget settings
		await sql`
			UPDATE organizations
			SET monthly_budget = ${monthlyBudget ?? null},
			    budget_alert_threshold = ${budgetAlertThreshold ?? 80},
			    budget_hard_limit = ${budgetHardLimit ?? false},
			    updated_at = NOW()
			WHERE id = ${organizationId}
			  AND deleted_at IS NULL
		`;

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update budget settings:', error);
		return json({ error: 'Failed to update budget settings' }, { status: 500 });
	}
};
