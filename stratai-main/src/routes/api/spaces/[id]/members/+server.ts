/**
 * Space Members API - List and Add
 *
 * GET /api/spaces/[id]/members - List all members
 * POST /api/spaces/[id]/members - Add a member (user or group)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresSpaceMembershipsRepository } from '$lib/server/persistence';
import { canManageSpaceMembers, type SpaceRole } from '$lib/types/space-memberships';

/**
 * GET /api/spaces/[id]/members
 * Returns all members of the space with user/group details
 * Includes requester's role and access source
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const spaceId = params.id;

	try {
		// Check access
		const access = await postgresSpaceMembershipsRepository.canAccessSpace(userId, spaceId);

		if (!access.hasAccess) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		// Fetch all members
		const members = await postgresSpaceMembershipsRepository.getMembers(spaceId);

		return json({
			members,
			userRole: access.role,
			accessSource: access.source
		});
	} catch (error) {
		console.error('Failed to fetch space members:', error);
		return json(
			{
				error: 'Failed to fetch members',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/spaces/[id]/members
 * Body: { targetUserId?: string, groupId?: string, role: SpaceRole }
 *
 * Must provide exactly one of targetUserId or groupId (XOR constraint).
 * Role must be one of: admin, member, guest (owner is implicit via space ownership).
 * Requires admin+ permission.
 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const spaceId = params.id;

	try {
		// Check access and permission
		const access = await postgresSpaceMembershipsRepository.canAccessSpace(userId, spaceId);

		if (!access.hasAccess) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		if (!canManageSpaceMembers(access.role)) {
			return json(
				{ error: 'Insufficient permissions. Admin access required.' },
				{ status: 403 }
			);
		}

		const body = await request.json();
		const { targetUserId, groupId, role } = body;

		// Validate XOR: must have exactly one of userId or groupId
		if ((!targetUserId && !groupId) || (targetUserId && groupId)) {
			return json(
				{ error: 'Must provide exactly one of targetUserId or groupId' },
				{ status: 400 }
			);
		}

		// Validate role (cannot assign 'owner' via membership - ownership is through spaces.user_id)
		const validRoles: SpaceRole[] = ['admin', 'member', 'guest'];
		if (!validRoles.includes(role)) {
			return json(
				{ error: 'Invalid role. Must be one of: admin, member, guest' },
				{ status: 400 }
			);
		}

		// Add the member (upsert pattern - updates role if already exists)
		const membership = targetUserId
			? await postgresSpaceMembershipsRepository.addUserMember(spaceId, targetUserId, role, userId)
			: await postgresSpaceMembershipsRepository.addGroupMember(spaceId, groupId, role, userId);

		return json(membership, { status: 201 });
	} catch (error) {
		console.error('Failed to add space member:', error);
		return json(
			{
				error: 'Failed to add member',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
