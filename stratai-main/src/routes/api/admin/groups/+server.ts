/**
 * Admin Groups API
 *
 * Handles listing and creating groups.
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { postgresGroupsRepository } from '$lib/server/persistence/groups-postgres';
import { postgresOrgMembershipRepository } from '$lib/server/persistence';

export const GET: RequestHandler = async ({ locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;

	// Check user role - only owners and admins can access
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
	const membership = memberships.find(m => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const groups = await postgresGroupsRepository.findByOrgId(organizationId);
		return json({ groups });
	} catch (error) {
		console.error('Failed to fetch groups:', error);
		return json({ error: 'Failed to fetch groups' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;

	// Check user role - only owners and admins can create groups
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
	const membership = memberships.find(m => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const { name, description, systemPrompt, allowedTiers, monthlyBudget } = body;

		// Validate required fields
		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return json({ error: 'Name is required' }, { status: 400 });
		}

		// Validate system prompt length
		if (systemPrompt && systemPrompt.length > 2000) {
			return json({ error: 'System prompt must be 2000 characters or less' }, { status: 400 });
		}

		const group = await postgresGroupsRepository.create({
			organizationId,
			name: name.trim(),
			description: description?.trim() || null,
			systemPrompt: systemPrompt?.trim() || null,
			allowedTiers: allowedTiers || null,
			monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : null
		});

		return json({ group }, { status: 201 });
	} catch (error) {
		// Handle unique constraint violation
		if ((error as { code?: string }).code === '23505') {
			return json({ error: 'A group with this name already exists' }, { status: 400 });
		}
		console.error('Failed to create group:', error);
		return json({ error: 'Failed to create group' }, { status: 500 });
	}
};
