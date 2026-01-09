/**
 * Admin Group Member API
 *
 * Handles updating role and removing individual members from a group.
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { postgresGroupsRepository } from '$lib/server/persistence/groups-postgres';
import { postgresOrgMembershipRepository } from '$lib/server/persistence';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId: currentUserId, organizationId } = locals.session;
	const { id: groupId, userId: memberUserId } = params;

	// Check user role - only owners and admins can update members
	const memberships = await postgresOrgMembershipRepository.findByUserId(currentUserId);
	const membership = memberships.find(m => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		// Verify group exists and belongs to organization
		const group = await postgresGroupsRepository.findById(groupId);
		if (!group) {
			return json({ error: 'Group not found' }, { status: 404 });
		}
		if (group.organizationId !== organizationId) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const { role } = body;

		if (!role || !['lead', 'member'].includes(role)) {
			return json({ error: 'Invalid role. Must be "lead" or "member"' }, { status: 400 });
		}

		const success = await postgresGroupsRepository.updateMemberRole(groupId, memberUserId, role);

		if (!success) {
			return json({ error: 'Member not found in group' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update group member:', error);
		return json({ error: 'Failed to update group member' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId: currentUserId, organizationId } = locals.session;
	const { id: groupId, userId: memberUserId } = params;

	// Check user role - only owners and admins can remove members
	const memberships = await postgresOrgMembershipRepository.findByUserId(currentUserId);
	const membership = memberships.find(m => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		// Verify group exists and belongs to organization
		const group = await postgresGroupsRepository.findById(groupId);
		if (!group) {
			return json({ error: 'Group not found' }, { status: 404 });
		}
		if (group.organizationId !== organizationId) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		const success = await postgresGroupsRepository.removeMember(groupId, memberUserId);

		if (!success) {
			return json({ error: 'Member not found in group' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to remove group member:', error);
		return json({ error: 'Failed to remove group member' }, { status: 500 });
	}
};
