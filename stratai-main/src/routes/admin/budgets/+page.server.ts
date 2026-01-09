/**
 * Admin Budgets Page Server
 *
 * Loads organization budget settings, current usage, and group budgets.
 */

import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/persistence/db';
import { postgresGroupsRepository } from '$lib/server/persistence/groups-postgres';

interface OrgBudgetRow {
	monthlyBudget: string | null;
	budgetAlertThreshold: number | null;
	budgetHardLimit: boolean | null;
}

interface MonthlyUsageRow {
	totalCostMillicents: string;
}

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.session!.organizationId;

	// Load organization budget settings
	const orgRows = await sql<OrgBudgetRow[]>`
		SELECT monthly_budget, budget_alert_threshold, budget_hard_limit
		FROM organizations
		WHERE id = ${orgId}
		  AND deleted_at IS NULL
	`;

	const orgBudget = orgRows[0] || {};
	const monthlyBudget = orgBudget.monthlyBudget ? parseFloat(orgBudget.monthlyBudget) : null;
	const budgetAlertThreshold = orgBudget.budgetAlertThreshold ?? 80;
	const budgetHardLimit = orgBudget.budgetHardLimit ?? false;

	// Get current month's usage (estimated_cost_millicents)
	const usageRows = await sql<MonthlyUsageRow[]>`
		SELECT COALESCE(SUM(estimated_cost_millicents), 0)::text as total_cost_millicents
		FROM llm_usage
		WHERE organization_id = ${orgId}
		  AND created_at >= date_trunc('month', CURRENT_DATE)
	`;

	const currentUsageCents = parseInt(usageRows[0]?.totalCostMillicents || '0', 10) / 100;
	const currentUsageDollars = currentUsageCents / 100;

	// Load groups with their budgets
	const groups = await postgresGroupsRepository.findByOrgId(orgId);

	// Calculate usage percentage for each group (would need group-level tracking)
	// For now, just show the budget settings
	const groupBudgets = groups
		.filter((g) => g.monthlyBudget !== null)
		.map((g) => ({
			id: g.id,
			name: g.name,
			monthlyBudget: g.monthlyBudget,
			memberCount: g.memberCount
		}));

	// Also include groups without budgets for the full list
	const allGroups = groups.map((g) => ({
		id: g.id,
		name: g.name,
		monthlyBudget: g.monthlyBudget,
		memberCount: g.memberCount
	}));

	return {
		monthlyBudget,
		budgetAlertThreshold,
		budgetHardLimit,
		currentUsageDollars,
		groupBudgets,
		allGroups
	};
};
