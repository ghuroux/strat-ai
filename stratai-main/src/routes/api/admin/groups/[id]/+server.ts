/**
 * Admin Group Detail API
 *
 * Handles getting, updating, and deleting individual groups.
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
		const group = await postgresGroupsRepository.findByIdWithCount(groupId);

		if (!group) {
			return json({ error: 'Group not found' }, { status: 404 });
		}

		// Verify group belongs to user's organization
		if (group.organizationId !== organizationId) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		return json({ group });
	} catch (error) {
		console.error('Failed to fetch group:', error);
		return json({ error: 'Failed to fetch group' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;
	const groupId = params.id;

	// Check user role - only owners and admins can update groups
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
	const membership = memberships.find(m => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		// Verify group exists and belongs to organization
		const existingGroup = await postgresGroupsRepository.findById(groupId);
		if (!existingGroup) {
			return json({ error: 'Group not found' }, { status: 404 });
		}
		if (existingGroup.organizationId !== organizationId) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const { name, description, systemPrompt, allowedTiers, monthlyBudget } = body;

		// Validate name if provided
		if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
			return json({ error: 'Name cannot be empty' }, { status: 400 });
		}

		// Validate system prompt length
		if (systemPrompt && systemPrompt.length > 2000) {
			return json({ error: 'System prompt must be 2000 characters or less' }, { status: 400 });
		}

		const group = await postgresGroupsRepository.update(groupId, {
			name: name?.trim(),
			description: description !== undefined ? description?.trim() || null : undefined,
			systemPrompt: systemPrompt !== undefined ? systemPrompt?.trim() || null : undefined,
			allowedTiers: allowedTiers !== undefined ? allowedTiers : undefined,
			monthlyBudget: monthlyBudget !== undefined ? (monthlyBudget ? parseFloat(monthlyBudget) : null) : undefined
		});

		return json({ group });
	} catch (error) {
		// Handle unique constraint violation
		if ((error as { code?: string }).code === '23505') {
			return json({ error: 'A group with this name already exists' }, { status: 400 });
		}
		console.error('Failed to update group:', error);
		return json({ error: 'Failed to update group' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;
	const groupId = params.id;

	// Check user role - only owners and admins can delete groups
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
	const membership = memberships.find(m => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		// Verify group exists and belongs to organization
		const existingGroup = await postgresGroupsRepository.findById(groupId);
		if (!existingGroup) {
			return json({ error: 'Group not found' }, { status: 404 });
		}
		if (existingGroup.organizationId !== organizationId) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		await postgresGroupsRepository.delete(groupId);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete group:', error);
		return json({ error: 'Failed to delete group' }, { status: 500 });
	}
};
