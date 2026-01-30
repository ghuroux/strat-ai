/**
 * Skills API - Individual Operations
 *
 * GET /api/skills/[id] - Get a specific skill
 * PATCH /api/skills/[id] - Update a skill
 * DELETE /api/skills/[id] - Delete a skill
 *
 * See docs/features/SKILLS.md
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresSkillsRepository } from '$lib/server/persistence/skills-postgres';
import type { UpdateSkillInput, SkillActivationMode } from '$lib/types/skills';

/**
 * GET /api/skills/[id]
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const skill = await postgresSkillsRepository.findById(params.id);
		if (!skill) {
			return json({ error: 'Skill not found' }, { status: 404 });
		}

		return json({ skill });
	} catch (error) {
		console.error('Failed to fetch skill:', error);
		return json(
			{
				error: 'Failed to fetch skill',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

const VALID_ACTIVATION_MODES: SkillActivationMode[] = ['always', 'trigger', 'manual'];

/**
 * PATCH /api/skills/[id]
 * Body: { name?, description?, content?, summary?, activationMode?, triggers? }
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const body = await request.json();

		if (body.activationMode && !VALID_ACTIVATION_MODES.includes(body.activationMode)) {
			return json({ error: `Invalid activationMode. Must be one of: ${VALID_ACTIVATION_MODES.join(', ')}` }, { status: 400 });
		}

		const input: UpdateSkillInput = {};
		if (body.name !== undefined) input.name = body.name;
		if (body.description !== undefined) input.description = body.description;
		if (body.content !== undefined) input.content = body.content;
		if (body.summary !== undefined) input.summary = body.summary;
		if (body.activationMode !== undefined) input.activationMode = body.activationMode;
		if (body.triggers !== undefined) input.triggers = body.triggers;

		const skill = await postgresSkillsRepository.update(params.id, input);
		if (!skill) {
			return json({ error: 'Skill not found' }, { status: 404 });
		}

		return json({ skill });
	} catch (error) {
		console.error('Failed to update skill:', error);
		return json(
			{
				error: 'Failed to update skill',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/skills/[id]
 * CASCADE handles area_skill_activations cleanup
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const deleted = await postgresSkillsRepository.delete(params.id);
		if (!deleted) {
			return json({ error: 'Skill not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete skill:', error);
		return json(
			{
				error: 'Failed to delete skill',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
