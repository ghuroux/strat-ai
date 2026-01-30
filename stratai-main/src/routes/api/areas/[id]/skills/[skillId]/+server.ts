/**
 * Area Skill Deactivation API
 *
 * DELETE /api/areas/[id]/skills/[skillId] - Deactivate a skill from an area
 *
 * See docs/features/SKILLS.md
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresSkillsRepository } from '$lib/server/persistence/skills-postgres';
import { postgresAreaMembershipsRepository } from '$lib/server/persistence/area-memberships-postgres';

/**
 * DELETE /api/areas/[id]/skills/[skillId]
 * Deactivates a Space skill from this area
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const areaId = params.id;
		const skillId = params.skillId;

		// Check area access
		const access = await postgresAreaMembershipsRepository.canAccessArea(userId, areaId);
		if (!access.hasAccess) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		const deactivated = await postgresSkillsRepository.deactivateInArea(areaId, skillId);
		if (!deactivated) {
			return json({ error: 'Skill activation not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to deactivate skill:', error);
		return json(
			{
				error: 'Failed to deactivate skill',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
