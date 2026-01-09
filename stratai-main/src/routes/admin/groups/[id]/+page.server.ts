/**
 * Admin Group Detail Page Server
 *
 * Loads group details, members, and available org users for adding.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { postgresGroupsRepository } from '$lib/server/persistence/groups-postgres';
import { postgresUserRepository } from '$lib/server/persistence/users-postgres';
import { postgresOrgMembershipRepository } from '$lib/server/persistence';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const orgId = locals.session!.organizationId;
	const groupId = params.id;
	const activeTab = url.searchParams.get('tab') || 'details';

	// Load group with member count
	const group = await postgresGroupsRepository.findByIdWithCount(groupId);

	if (!group) {
		throw error(404, 'Group not found');
	}

	// Verify group belongs to user's organization
	if (group.organizationId !== orgId) {
		throw error(403, 'Access denied');
	}

	// Load group members with user details
	const members = await postgresGroupsRepository.getMembers(groupId);

	// Load all org users for the "Add members" dropdown
	const allUsers = await postgresUserRepository.findByOrgId(orgId);

	// Load org memberships to get roles
	const orgMemberships = await postgresOrgMembershipRepository.findByOrgId(orgId);
	const membershipsByUserId = new Map(orgMemberships.map((m) => [m.userId, m]));

	// Filter out users already in this group
	const memberUserIds = new Set(members.map((m) => m.userId));
	const availableUsers = allUsers
		.filter((u) => !memberUserIds.has(u.id))
		.map((u) => ({
			id: u.id,
			displayName: u.displayName,
			email: u.email,
			username: u.username,
			role: membershipsByUserId.get(u.id)?.role || 'member'
		}));

	return {
		group: {
			id: group.id,
			name: group.name,
			description: group.description,
			memberCount: group.memberCount,
			systemPrompt: group.systemPrompt,
			allowedTiers: group.allowedTiers,
			monthlyBudget: group.monthlyBudget,
			createdAt: group.createdAt.toISOString(),
			updatedAt: group.updatedAt.toISOString()
		},
		members: members.map((m) => ({
			userId: m.userId,
			userName: m.userName,
			userEmail: m.userEmail,
			role: m.role,
			orgRole: membershipsByUserId.get(m.userId)?.role || 'member',
			joinedAt: m.joinedAt.toISOString()
		})),
		availableUsers,
		activeTab
	};
};
