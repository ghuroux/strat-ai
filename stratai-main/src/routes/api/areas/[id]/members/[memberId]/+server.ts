/**
 * Area Individual Member API
 *
 * PATCH /api/areas/[id]/members/[memberId] - Update member role (requires owner/admin)
 * DELETE /api/areas/[id]/members/[memberId] - Remove member (requires owner/admin)
 *
 * Implements ENTITY_MODEL.md Section 6.5 (area_memberships)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresAreaMembershipsRepository, type AreaMemberRole } from '$lib/server/persistence/area-memberships-postgres';

/**
 * PATCH /api/areas/[id]/members/[memberId]
 * Update a member's role
 *
 * Body: { role: AreaMemberRole }
 * - Cannot change to 'owner' (use ownership transfer)
 * - Cannot demote the last owner
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const currentUserId = locals.session.userId;
		const { id: areaId, memberId } = params;

		// Check if user can manage this area (owner or admin)
		const canManage = await postgresAreaMembershipsRepository.canManageArea(currentUserId, areaId);
		if (!canManage) {
			return json({ error: 'Insufficient permissions. Owner or admin access required.' }, { status: 403 });
		}

		const body = await request.json();
		const { role } = body;

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

		// Check if this would demote the last owner
		const membership = await postgresAreaMembershipsRepository.findById(memberId);
		if (!membership) {
			return json({ error: 'Member not found' }, { status: 404 });
		}

		// Verify membership belongs to this area
		if (membership.areaId !== areaId) {
			return json({ error: 'Member not found in this area' }, { status: 404 });
		}

		// If demoting an owner, check they're not the last one
		if (membership.role === 'owner' && role !== 'owner') {
			const ownerCount = await postgresAreaMembershipsRepository.getOwnerCount(areaId);
			if (ownerCount <= 1) {
				return json(
					{ error: 'Cannot demote the last owner. Transfer ownership first.' },
					{ status: 400 }
				);
			}
		}

		const updated = await postgresAreaMembershipsRepository.updateMemberRole(memberId, role);
		if (!updated) {
			return json({ error: 'Failed to update member role' }, { status: 500 });
		}

		return json({ success: true, role });
	} catch (error) {
		console.error('Failed to update member role:', error);
		return json(
			{ error: 'Failed to update role', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/areas/[id]/members/[memberId]
 * Remove a member from the area
 *
 * - Cannot remove the last owner
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const currentUserId = locals.session.userId;
		const { id: areaId, memberId } = params;

		// Check if user can manage this area (owner or admin)
		const canManage = await postgresAreaMembershipsRepository.canManageArea(currentUserId, areaId);
		if (!canManage) {
			return json({ error: 'Insufficient permissions. Owner or admin access required.' }, { status: 403 });
		}

		// Get membership details
		const membership = await postgresAreaMembershipsRepository.findById(memberId);
		if (!membership) {
			return json({ error: 'Member not found' }, { status: 404 });
		}

		// Verify membership belongs to this area
		if (membership.areaId !== areaId) {
			return json({ error: 'Member not found in this area' }, { status: 404 });
		}

		// Cannot remove the last owner
		if (membership.role === 'owner') {
			const ownerCount = await postgresAreaMembershipsRepository.getOwnerCount(areaId);
			if (ownerCount <= 1) {
				return json(
					{ error: 'Cannot remove the last owner. Transfer ownership first.' },
					{ status: 400 }
				);
			}
		}

		// Remove based on type (user or group)
		let removed: boolean;
		if (membership.userId) {
			removed = await postgresAreaMembershipsRepository.removeUserMember(areaId, membership.userId);
		} else if (membership.groupId) {
			removed = await postgresAreaMembershipsRepository.removeGroupMember(areaId, membership.groupId);
		} else {
			return json({ error: 'Invalid membership record' }, { status: 500 });
		}

		if (!removed) {
			return json({ error: 'Failed to remove member' }, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to remove member:', error);
		return json(
			{ error: 'Failed to remove member', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
