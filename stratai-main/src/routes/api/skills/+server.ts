/**
 * Skills API - List and Create
 *
 * GET /api/skills - List skills for a Space
 * POST /api/skills - Create a new skill
 *
 * See docs/features/SKILLS.md
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresSkillsRepository } from '$lib/server/persistence/skills-postgres';
import { postgresSpaceMembershipsRepository } from '$lib/server/persistence';
import { resolveSpaceIdAccessible } from '$lib/server/persistence/spaces-postgres';
import type { CreateSkillInput, SkillActivationMode } from '$lib/types/skills';

/**
 * GET /api/skills
 * Query params:
 * - spaceId: Filter by space ID or slug (required)
 * - areaId: Filter by area ID (optional, returns area-owned skills)
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const spaceIdParam = url.searchParams.get('spaceId');
		const areaIdParam = url.searchParams.get('areaId');

		if (areaIdParam) {
			// Return area-owned skills
			const skills = await postgresSkillsRepository.findByArea(areaIdParam);
			return json({ skills });
		}

		if (!spaceIdParam) {
			return json({ error: 'spaceId or areaId query parameter is required' }, { status: 400 });
		}

		// Resolve space identifier (slug or ID) to proper ID
		const resolvedSpaceId = await resolveSpaceIdAccessible(spaceIdParam, userId);
		if (!resolvedSpaceId) {
			return json({ error: `Space not found: ${spaceIdParam}` }, { status: 404 });
		}

		const skills = await postgresSkillsRepository.findBySpace(resolvedSpaceId);
		return json({ skills });
	} catch (error) {
		console.error('Failed to fetch skills:', error);
		return json(
			{
				error: 'Failed to fetch skills',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

const VALID_ACTIVATION_MODES: SkillActivationMode[] = ['always', 'trigger', 'manual'];

/**
 * POST /api/skills
 * Body: { spaceId?, areaId?, name, description, content, summary?, activationMode?, triggers? }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const body = await request.json();

		// Validate required fields
		if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
			return json({ error: 'name is required and must be a non-empty string' }, { status: 400 });
		}
		if (!body.description || typeof body.description !== 'string' || body.description.trim() === '') {
			return json({ error: 'description is required and must be a non-empty string' }, { status: 400 });
		}
		if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
			return json({ error: 'content is required and must be a non-empty string' }, { status: 400 });
		}
		if (!body.spaceId && !body.areaId) {
			return json({ error: 'Either spaceId or areaId is required' }, { status: 400 });
		}
		if (body.spaceId && body.areaId) {
			return json({ error: 'Cannot specify both spaceId and areaId' }, { status: 400 });
		}
		if (body.activationMode && !VALID_ACTIVATION_MODES.includes(body.activationMode)) {
			return json({ error: `Invalid activationMode. Must be one of: ${VALID_ACTIVATION_MODES.join(', ')}` }, { status: 400 });
		}

		// If space-owned, verify space access and non-guest role
		let resolvedSpaceId: string | undefined;
		if (body.spaceId) {
			const resolved = await resolveSpaceIdAccessible(body.spaceId, userId);
			if (!resolved) {
				return json({ error: `Space not found or access denied: ${body.spaceId}` }, { status: 404 });
			}
			resolvedSpaceId = resolved;

			const spaceAccess = await postgresSpaceMembershipsRepository.canAccessSpace(userId, resolvedSpaceId);
			if (!spaceAccess.hasAccess) {
				return json({ error: 'Access denied to this space' }, { status: 403 });
			}

			// Guests cannot create skills
			if (spaceAccess.role === 'guest') {
				return json(
					{
						error: 'Guests cannot create skills',
						details: 'Contact a space admin to upgrade your access.',
						code: 'GUEST_CANNOT_CREATE'
					},
					{ status: 403 }
				);
			}
		}

		const input: CreateSkillInput = {
			spaceId: resolvedSpaceId,
			areaId: body.areaId,
			name: body.name.trim(),
			description: body.description.trim(),
			content: body.content,
			summary: body.summary,
			activationMode: body.activationMode,
			triggers: body.triggers
		};

		const skill = await postgresSkillsRepository.create(input, userId);

		return json({ skill }, { status: 201 });
	} catch (error) {
		console.error('Failed to create skill:', error);
		return json(
			{
				error: 'Failed to create skill',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
