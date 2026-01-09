/**
 * Admin Groups Page Server
 *
 * Loads groups for the organization.
 */

import type { PageServerLoad } from './$types';
import { postgresGroupsRepository } from '$lib/server/persistence/groups-postgres';

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.session!.organizationId;

	// Load all groups for this organization
	const groups = await postgresGroupsRepository.findByOrgId(orgId);

	return {
		groups: groups.map(g => ({
			id: g.id,
			name: g.name,
			description: g.description,
			memberCount: g.memberCount,
			systemPrompt: g.systemPrompt,
			allowedTiers: g.allowedTiers,
			monthlyBudget: g.monthlyBudget,
			createdAt: g.createdAt.toISOString()
		}))
	};
};
