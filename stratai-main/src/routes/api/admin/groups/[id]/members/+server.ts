/**
 * Admin Group Members API
 *
 * Handles listing and adding members to a group.
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { postgresGroupsRepository } from '$lib/server/persistence/groups-postgres';
import { postgresOrgMembershipRepository } from '$lib/server/persistence';

export const GET: RequestHandler = async ({ params, locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;
	const groupId = params.id;

	// Check user role - only owners and admins can access
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
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

		const members = await postgresGroupsRepository.getMembers(groupId);
		return json({ members });
	} catch (error) {
		console.error('Failed to fetch group members:', error);
		return json({ error: 'Failed to fetch group members' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;
	const groupId = params.id;

	// Check user role - only owners and admins can add members
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
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
		const { userId: memberUserId, role } = body;

		// Validate required fields
		if (!memberUserId) {
			return json({ error: 'User ID is required' }, { status: 400 });
		}

		// Verify the user is a member of the same organization
		const userOrgMembership = await postgresOrgMembershipRepository.findByUserAndOrg(memberUserId, organizationId);
		if (!userOrgMembership) {
			return json({ error: 'User is not a member of this organization' }, { status: 400 });
		}

		const groupMembership = await postgresGroupsRepository.addMember(
			groupId,
			memberUserId,
			role || 'member'
		);

		return json({ membership: groupMembership }, { status: 201 });
	} catch (error) {
		console.error('Failed to add group member:', error);
		return json({ error: 'Failed to add group member' }, { status: 500 });
	}
};
