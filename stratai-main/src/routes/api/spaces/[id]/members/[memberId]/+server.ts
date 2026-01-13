/**
 * Space Member API - Update and Remove
 *
 * PATCH /api/spaces/[id]/members/[memberId] - Update member role
 * DELETE /api/spaces/[id]/members/[memberId] - Remove member
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresSpaceMembershipsRepository } from '$lib/server/persistence';
import { canManageSpaceMembers, type SpaceRole } from '$lib/types/space-memberships';

/**
 * PATCH /api/spaces/[id]/members/[memberId]
 * Body: { role: SpaceRole }
 *
 * Updates a member's role. Prevents demoting the last owner.
 * Requires admin+ permission.
 */
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { id: spaceId, memberId } = params;

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

		// Verify membership exists and belongs to this space
		const membership = await postgresSpaceMembershipsRepository.findById(memberId);
		if (!membership || membership.spaceId !== spaceId) {
			return json({ error: 'Member not found' }, { status: 404 });
		}

		const body = await request.json();
		const { role } = body;

		// Validate role
		const validRoles: SpaceRole[] = ['owner', 'admin', 'member', 'guest'];
		if (!validRoles.includes(role)) {
			return json({ error: 'Invalid role' }, { status: 400 });
		}

		// Prevent demoting last owner (memberships with role='owner')
		if (membership.role === 'owner' && role !== 'owner') {
			const ownerCount = await postgresSpaceMembershipsRepository.getOwnerCount(spaceId);
			if (ownerCount <= 1) {
				return json(
					{ error: 'Cannot demote the last owner. Transfer ownership first.' },
					{ status: 400 }
				);
			}
		}

		const updated = await postgresSpaceMembershipsRepository.updateMemberRole(memberId, role);

		if (!updated) {
			return json({ error: 'Failed to update member' }, { status: 500 });
		}

		return json(updated);
	} catch (error) {
		console.error('Failed to update space member:', error);
		return json(
			{
				error: 'Failed to update member',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/spaces/[id]/members/[memberId]
 *
 * Removes a member from the space. Prevents removing the last owner.
 * Requires admin+ permission.
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const { id: spaceId, memberId } = params;

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

		// Verify membership exists and belongs to this space
		const membership = await postgresSpaceMembershipsRepository.findById(memberId);
		if (!membership || membership.spaceId !== spaceId) {
			return json({ error: 'Member not found' }, { status: 404 });
		}

		// Prevent removing last owner
		if (membership.role === 'owner') {
			const ownerCount = await postgresSpaceMembershipsRepository.getOwnerCount(spaceId);
			if (ownerCount <= 1) {
				return json({ error: 'Cannot remove the last owner.' }, { status: 400 });
			}
		}

		// Delete based on membership type
		const success = membership.userId
			? await postgresSpaceMembershipsRepository.removeUserMember(spaceId, membership.userId)
			: await postgresSpaceMembershipsRepository.removeGroupMember(spaceId, membership.groupId!);

		if (!success) {
			return json({ error: 'Failed to remove member' }, { status: 500 });
		}

		return new Response(null, { status: 204 });
	} catch (error) {
		console.error('Failed to remove space member:', error);
		return json(
			{
				error: 'Failed to remove member',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
