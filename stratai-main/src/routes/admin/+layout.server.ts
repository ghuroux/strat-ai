/**
 * Admin Layout Server
 *
 * Loads organization data and handles auth guard for all admin routes.
 * Non-admin users (members) are redirected to the main app.
 */

import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { postgresOrganizationRepository, postgresOrgMembershipRepository } from '$lib/server/persistence';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Require authentication
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	const { userId, organizationId } = locals.session;

	// Check user role - only owners and admins can access admin portal
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
	const membership = memberships.find(m => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		// Members cannot access admin portal - redirect to main app
		throw redirect(303, '/');
	}

	// Load organization data
	const organization = await postgresOrganizationRepository.findById(organizationId);

	return {
		organization: organization ? {
			id: organization.id,
			name: organization.name,
			slug: organization.slug
		} : null,
		userRole: membership.role
	};
};
