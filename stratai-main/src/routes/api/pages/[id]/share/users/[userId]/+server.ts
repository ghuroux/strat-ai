/**
 * API Endpoint: /api/pages/[id]/share/users/[userId]
 * Handles updating and removing user shares
 * Phase 1: Page Sharing
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	postgresPageSharingRepository,
	postgresAuditRepository
} from '$lib/server/persistence';

/**
 * PATCH /api/pages/[id]/share/users/[userId]
 * Update user permission
 * Requires: Admin permission on page
 * Body: { permission: PagePermission }
 */
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	const { id: pageId, userId: targetUserId } = params;

	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const { permission } = await request.json();

		// Validate permission
		if (!permission || !['viewer', 'editor', 'admin'].includes(permission)) {
			return json({ error: 'Invalid permission level' }, { status: 400 });
		}

		// Check admin permission
		const access = await postgresPageSharingRepository.canAccessPage(userId, pageId);

		if (!access.hasAccess || access.permission !== 'admin') {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		// Update permission
		const success = await postgresPageSharingRepository.updateUserPermission(
			pageId,
			targetUserId,
			permission
		);

		if (!success) {
			return json({ error: 'User share not found' }, { status: 404 });
		}

		// Log audit event
		await postgresAuditRepository.logEvent(
			userId,
			'page_permission_changed',
			'page',
			pageId,
			'permission_change',
			{
				target_user_id: targetUserId,
				new_permission: permission
			},
			locals.session.organizationId
		);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update user permission:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * DELETE /api/pages/[id]/share/users/[userId]
 * Remove user share
 * Requires: Admin permission on page
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { id: pageId, userId: targetUserId } = params;

	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		// Check admin permission
		const access = await postgresPageSharingRepository.canAccessPage(userId, pageId);

		if (!access.hasAccess || access.permission !== 'admin') {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		// Remove share
		const success = await postgresPageSharingRepository.removeUserShare(pageId, targetUserId);

		if (!success) {
			return json({ error: 'User share not found' }, { status: 404 });
		}

		// Log audit event
		await postgresAuditRepository.logEvent(
			userId,
			'page_unshared_user',
			'page',
			pageId,
			'unshare',
			{
				target_user_id: targetUserId
			},
			locals.session.organizationId
		);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to remove user share:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
