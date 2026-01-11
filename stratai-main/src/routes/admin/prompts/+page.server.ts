/**
 * Admin Prompts Page Server
 *
 * Loads dropdown options for the System Prompt Inspector.
 */

import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { postgresSpaceRepository } from '$lib/server/persistence/spaces-postgres';
import { postgresOrgMembershipRepository } from '$lib/server/persistence';
import { getAvailableModels } from '$lib/server/services/prompt-analyzer';

export const load: PageServerLoad = async ({ locals }) => {
	// Require authentication
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	const { userId, organizationId } = locals.session;

	// Check user role - only owners and admins can access
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
	const membership = memberships.find((m) => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		throw redirect(303, '/');
	}

	// Load spaces for dropdown
	const spaces = await postgresSpaceRepository.findAll(userId);

	// Get available models
	const models = getAvailableModels();

	// Sort models by provider then name
	models.sort((a, b) => {
		if (a.provider !== b.provider) {
			// Anthropic first, then OpenAI, then others
			const order = ['anthropic', 'openai', 'google', 'deepseek', 'meta', 'mistral', 'amazon'];
			return order.indexOf(a.provider) - order.indexOf(b.provider);
		}
		return a.displayName.localeCompare(b.displayName);
	});

	return {
		spaces: spaces.map((s) => ({
			id: s.id,
			name: s.name,
			slug: s.slug,
			type: s.type
		})),
		models
	};
};
