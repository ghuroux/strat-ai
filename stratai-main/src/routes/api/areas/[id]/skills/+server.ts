/**
 * Area Skills API - Activations
 *
 * GET /api/areas/[id]/skills - List activated skills for an area
 * POST /api/areas/[id]/skills - Activate a Space skill in this area
 *
 * See docs/features/SKILLS.md
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresSkillsRepository } from '$lib/server/persistence/skills-postgres';
import { postgresAreaRepository } from '$lib/server/persistence/areas-postgres';
import { postgresAreaMembershipsRepository } from '$lib/server/persistence/area-memberships-postgres';

/**
 * GET /api/areas/[id]/skills
 * Returns all active skills for this area (area-owned + activated Space skills)
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const areaId = params.id;

		// Check area access
		const access = await postgresAreaMembershipsRepository.canAccessArea(userId, areaId);
		if (!access.hasAccess) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		const skills = await postgresSkillsRepository.findActivatedForArea(areaId);
		return json({ skills });
	} catch (error) {
		console.error('Failed to fetch area skills:', error);
		return json(
			{
				error: 'Failed to fetch area skills',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/areas/[id]/skills
 * Body: { skillId }
 * Activates a Space skill in this area
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const areaId = params.id;
		const body = await request.json();

		if (!body.skillId) {
			return json({ error: 'skillId is required' }, { status: 400 });
		}

		// Check area access
		const access = await postgresAreaMembershipsRepository.canAccessArea(userId, areaId);
		if (!access.hasAccess) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		// Verify skill exists and belongs to the area's parent space
		const skill = await postgresSkillsRepository.findById(body.skillId);
		if (!skill) {
			return json({ error: 'Skill not found' }, { status: 404 });
		}

		// Only Space skills can be activated in areas
		if (!skill.spaceId) {
			return json({ error: 'Only Space-level skills can be activated in areas. Area-owned skills are always active.' }, { status: 400 });
		}

		// Verify the skill belongs to the same space as the area
		const area = await postgresAreaRepository.findById(areaId, userId);
		if (!area) {
			return json({ error: 'Area not found' }, { status: 404 });
		}
		if (skill.spaceId !== area.spaceId) {
			return json({ error: 'Skill does not belong to this area\'s space' }, { status: 400 });
		}

		await postgresSkillsRepository.activateInArea(areaId, body.skillId, userId);
		return json({ success: true }, { status: 201 });
	} catch (error) {
		console.error('Failed to activate skill:', error);
		return json(
			{
				error: 'Failed to activate skill',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
