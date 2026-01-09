/**
 * Admin Dashboard Overview Page Server
 *
 * Loads real statistics for the admin dashboard.
 */

import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/persistence/db';
import { postgresGroupsRepository } from '$lib/server/persistence/groups-postgres';
import { postgresUsageRepository } from '$lib/server/persistence/usage-postgres';

interface CountRow {
	count: string;
}

interface ActiveUsersRow {
	activeUsers: string;
}

interface OrgBudgetRow {
	monthlyBudget: string | null;
}

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.session!.organizationId;

	// Get total member count
	const totalUsersResult = await sql<CountRow[]>`
		SELECT COUNT(*)::text as count
		FROM org_memberships
		WHERE organization_id = ${orgId}
	`;
	const totalUsers = parseInt(totalUsersResult[0]?.count || '0', 10);

	// Get active users (those who have made requests in the last 7 days)
	const activeUsersResult = await sql<ActiveUsersRow[]>`
		SELECT COUNT(DISTINCT user_id)::text as active_users
		FROM llm_usage
		WHERE organization_id = ${orgId}
		  AND created_at >= NOW() - INTERVAL '7 days'
	`;
	const activeUsers = parseInt(activeUsersResult[0]?.activeUsers || '0', 10);

	// Get requests today
	const requestsTodayResult = await sql<CountRow[]>`
		SELECT COUNT(*)::text as count
		FROM llm_usage
		WHERE organization_id = ${orgId}
		  AND created_at >= CURRENT_DATE
	`;
	const requestsToday = parseInt(requestsTodayResult[0]?.count || '0', 10);

	// Get requests yesterday for comparison
	const requestsYesterdayResult = await sql<CountRow[]>`
		SELECT COUNT(*)::text as count
		FROM llm_usage
		WHERE organization_id = ${orgId}
		  AND created_at >= CURRENT_DATE - INTERVAL '1 day'
		  AND created_at < CURRENT_DATE
	`;
	const requestsYesterday = parseInt(requestsYesterdayResult[0]?.count || '0', 10);

	// Calculate trend percentage
	let requestsTrend = 0;
	if (requestsYesterday > 0) {
		requestsTrend = Math.round(((requestsToday - requestsYesterday) / requestsYesterday) * 100);
	}

	// Get month-to-date spend (in millicents)
	const spendResult = await sql<Array<{ totalCostMillicents: string }>>`
		SELECT COALESCE(SUM(estimated_cost_millicents), 0)::text as total_cost_millicents
		FROM llm_usage
		WHERE organization_id = ${orgId}
		  AND created_at >= date_trunc('month', CURRENT_DATE)
	`;
	const spendMillicents = parseInt(spendResult[0]?.totalCostMillicents || '0', 10);
	const spendDollars = spendMillicents / 100 / 100; // millicents -> cents -> dollars

	// Get org budget
	const orgBudgetResult = await sql<OrgBudgetRow[]>`
		SELECT monthly_budget
		FROM organizations
		WHERE id = ${orgId}
		  AND deleted_at IS NULL
	`;
	const monthlyBudget = orgBudgetResult[0]?.monthlyBudget
		? parseFloat(orgBudgetResult[0].monthlyBudget)
		: null;

	// Calculate budget percentage
	const budgetPercent = monthlyBudget ? Math.round((spendDollars / monthlyBudget) * 100) : null;

	// Get daily usage for the last 7 days
	const dailyUsage = await postgresUsageRepository.getDailyTotals(orgId, 7);

	// Get group count
	const groups = await postgresGroupsRepository.findByOrgId(orgId);
	const groupCount = groups.length;

	return {
		stats: {
			totalUsers,
			activeUsers,
			requestsToday,
			requestsTrend,
			spendDollars,
			monthlyBudget,
			budgetPercent,
			groupCount
		},
		dailyUsage
	};
};
