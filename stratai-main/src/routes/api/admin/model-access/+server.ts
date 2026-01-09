/**
 * Admin Model Access API
 *
 * Handles organization model tier settings and model assignments.
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { sql, postgresOrgMembershipRepository } from '$lib/server/persistence';
import { MODEL_CAPABILITIES } from '$lib/config/model-capabilities';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;

	// Check user role - only owners and admins can update model access
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
	const membership = memberships.find((m) => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const { allowedTiers, modelTierAssignments } = body;

		const validTiers = ['basic', 'standard', 'premium'];

		// Handle allowedTiers update
		if (allowedTiers !== undefined) {
			if (!Array.isArray(allowedTiers)) {
				return json({ error: 'allowedTiers must be an array' }, { status: 400 });
			}

			const invalidTiers = allowedTiers.filter((t: string) => !validTiers.includes(t));
			if (invalidTiers.length > 0) {
				return json({ error: `Invalid tiers: ${invalidTiers.join(', ')}` }, { status: 400 });
			}

			// Must have at least one tier enabled
			if (allowedTiers.length === 0) {
				return json({ error: 'At least one tier must be enabled' }, { status: 400 });
			}

			await sql`
				UPDATE organizations
				SET allowed_tiers = ${allowedTiers},
				    updated_at = NOW()
				WHERE id = ${organizationId}
				  AND deleted_at IS NULL
			`;
		}

		// Handle modelTierAssignments update
		if (modelTierAssignments !== undefined) {
			if (typeof modelTierAssignments !== 'object' || modelTierAssignments === null) {
				return json({ error: 'modelTierAssignments must be an object' }, { status: 400 });
			}

			// Validate each assignment
			for (const [modelId, tier] of Object.entries(modelTierAssignments)) {
				// Check model exists
				if (!MODEL_CAPABILITIES[modelId]) {
					return json({ error: `Unknown model: ${modelId}` }, { status: 400 });
				}

				// Check tier is valid (or null for disabled)
				if (tier !== null && !validTiers.includes(tier as string)) {
					return json({ error: `Invalid tier "${tier}" for model ${modelId}` }, { status: 400 });
				}
			}

			await sql`
				UPDATE organizations
				SET model_tier_assignments = ${JSON.stringify(modelTierAssignments)},
				    updated_at = NOW()
				WHERE id = ${organizationId}
				  AND deleted_at IS NULL
			`;
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update model access:', error);
		return json({ error: 'Failed to update model access' }, { status: 500 });
	}
};
