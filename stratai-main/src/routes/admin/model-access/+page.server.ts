/**
 * Admin Model Access Page Server
 *
 * Loads organization tier settings, model tier assignments, and groups with overrides.
 */

import type { PageServerLoad } from './$types';
import { sql } from '$lib/server/persistence/db';
import { postgresGroupsRepository } from '$lib/server/persistence/groups-postgres';
import { MODEL_CAPABILITIES } from '$lib/config/model-capabilities';

interface OrgRow {
	allowedTiers: string[] | null;
	modelTierAssignments: Record<string, string | null> | null;
}

/**
 * Get the default tier for a model based on its pricing
 */
function getDefaultTier(modelId: string): 'basic' | 'standard' | 'premium' {
	const model = MODEL_CAPABILITIES[modelId];
	if (!model?.pricing) {
		// No pricing info - default to standard
		return 'standard';
	}

	const outputPrice = model.pricing.output;
	if (outputPrice >= 10) {
		return 'premium';
	} else if (outputPrice >= 2) {
		return 'standard';
	} else {
		return 'basic';
	}
}

export const load: PageServerLoad = async ({ locals }) => {
	const orgId = locals.session!.organizationId;

	// Load organization tier settings and model assignments
	const orgRows = await sql<OrgRow[]>`
		SELECT allowed_tiers, model_tier_assignments
		FROM organizations
		WHERE id = ${orgId}
		  AND deleted_at IS NULL
	`;

	const allowedTiers = orgRows[0]?.allowedTiers || ['basic', 'standard', 'premium'];
	const modelTierAssignments = orgRows[0]?.modelTierAssignments || {};

	// Build the models list with their capabilities and tier assignments
	const models = Object.entries(MODEL_CAPABILITIES).map(([id, capabilities]) => {
		const assignedTier = modelTierAssignments[id];
		const defaultTier = getDefaultTier(id);

		return {
			id,
			displayName: capabilities.displayName,
			provider: capabilities.provider,
			contextWindow: capabilities.contextWindow,
			maxOutputTokens: capabilities.maxOutputTokens,
			supportsThinking: capabilities.supportsThinking,
			supportsVision: capabilities.supportsVision,
			supportsTools: capabilities.supportsTools,
			description: capabilities.description || null,
			pricing: capabilities.pricing || null,
			// Tier assignment: explicit assignment > default based on pricing
			tier: assignedTier === null ? null : (assignedTier || defaultTier),
			defaultTier,
			isCustomAssignment: assignedTier !== undefined
		};
	});

	// Load groups with their tier settings
	const groups = await postgresGroupsRepository.findByOrgId(orgId);

	// Filter groups that have tier overrides
	const groupsWithOverrides = groups
		.filter((g) => g.allowedTiers && g.allowedTiers.length > 0)
		.map((g) => ({
			id: g.id,
			name: g.name,
			allowedTiers: g.allowedTiers || [],
			memberCount: g.memberCount
		}));

	return {
		allowedTiers,
		modelTierAssignments,
		models,
		groupsWithOverrides
	};
};
