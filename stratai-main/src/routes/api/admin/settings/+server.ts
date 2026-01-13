/**
 * Admin Settings API
 *
 * Handles organization settings updates including system prompt.
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { sql, postgresOrgMembershipRepository } from '$lib/server/persistence';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;

	// Check user role - only owners and admins can update settings
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
	const membership = memberships.find(m => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const { name, slug, systemPrompt, icon } = body;

		// Validate slug format
		if (slug && !/^[a-z0-9-]+$/.test(slug)) {
			return json({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' }, { status: 400 });
		}

		// Validate system prompt length
		if (systemPrompt && systemPrompt.length > 4000) {
			return json({ error: 'System prompt must be 4000 characters or less' }, { status: 400 });
		}

		// Check for slug collision (if changing)
		if (slug) {
			const existing = await sql`
				SELECT id FROM organizations
				WHERE slug = ${slug}
				  AND id != ${organizationId}
				  AND deleted_at IS NULL
			`;
			if (existing.length > 0) {
				return json({ error: 'This slug is already in use' }, { status: 400 });
			}
		}

		// Update organization
		if (name) {
			await sql`
				UPDATE organizations
				SET name = ${name}
				WHERE id = ${organizationId}
			`;
		}

		if (slug) {
			await sql`
				UPDATE organizations
				SET slug = ${slug}
				WHERE id = ${organizationId}
			`;
		}

		if (systemPrompt !== undefined) {
			await sql`
				UPDATE organizations
				SET system_prompt = ${systemPrompt || null}
				WHERE id = ${organizationId}
			`;
		}

		// Update org space icon if provided
		if (icon !== undefined) {
			await sql`
				UPDATE spaces
				SET icon = ${icon || null}, updated_at = NOW()
				WHERE organization_id = ${organizationId}
				  AND space_type = 'organization'
				  AND deleted_at IS NULL
			`;
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update settings:', error);
		return json({ error: 'Failed to update settings' }, { status: 500 });
	}
};
