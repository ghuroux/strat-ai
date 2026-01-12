/**
 * Area Members API
 *
 * GET /api/areas/[id]/members - List area members (requires access)
 * POST /api/areas/[id]/members - Add user or group member (requires owner/admin)
 *
 * Implements ENTITY_MODEL.md Section 6.5 (area_memberships)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresAreaMembershipsRepository, type AreaMemberRole } from '$lib/server/persistence/area-memberships-postgres';

/**
 * GET /api/areas/[id]/members
 * Returns all members of an area (users and groups with details)
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const areaId = params.id;

		// Check if user can access this area
		const access = await postgresAreaMembershipsRepository.canAccessArea(userId, areaId);
		if (!access.hasAccess) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		// Get all members
		const members = await postgresAreaMembershipsRepository.getMembers(areaId);

		return json({
			members,
			userRole: access.role,
			accessSource: access.source
		});
	} catch (error) {
		console.error('Failed to fetch area members:', error);
		return json(
			{ error: 'Failed to fetch members', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/areas/[id]/members
 * Add a user or group to the area
 *
 * Body: { userId?: string, groupId?: string, role?: AreaMemberRole }
 * - Must provide exactly one of userId or groupId (XOR)
 * - role defaults to 'member'
 * - Cannot assign 'owner' role via this endpoint (use transfer ownership)
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const currentUserId = locals.session.userId;
		const areaId = params.id;

		// Check if user can manage this area (owner or admin)
		const canManage = await postgresAreaMembershipsRepository.canManageArea(currentUserId, areaId);
		if (!canManage) {
			return json({ error: 'Insufficient permissions. Owner or admin access required.' }, { status: 403 });
		}

		const body = await request.json();
		const { userId, groupId, role = 'member' } = body;

		// Validate XOR: must have exactly one of userId or groupId
		if ((!userId && !groupId) || (userId && groupId)) {
			return json({ error: 'Must provide exactly one of userId or groupId' }, { status: 400 });
		}

		// Validate role
		const validRoles: AreaMemberRole[] = ['admin', 'member', 'viewer'];
		if (!validRoles.includes(role)) {
			return json(
				{ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
				{ status: 400 }
			);
		}

		// Cannot assign owner role via this endpoint
		if (role === 'owner') {
			return json(
				{ error: 'Cannot assign owner role via this endpoint. Use ownership transfer instead.' },
				{ status: 400 }
			);
		}

		let membership;
		if (userId) {
			membership = await postgresAreaMembershipsRepository.addUserMember(
				areaId,
				userId,
				role,
				currentUserId
			);
		} else {
			membership = await postgresAreaMembershipsRepository.addGroupMember(
				areaId,
				groupId,
				role,
				currentUserId
			);
		}

		return json({ membership }, { status: 201 });
	} catch (error) {
		console.error('Failed to add area member:', error);
		return json(
			{ error: 'Failed to add member', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
