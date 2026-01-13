/**
 * API Endpoint: /api/pages/[id]/share/groups/[groupId]
 * Handles updating and removing group shares
 * Phase 1: Page Sharing
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	postgresPageSharingRepository,
	postgresAuditRepository
} from '$lib/server/persistence';

/**
 * PATCH /api/pages/[id]/share/groups/[groupId]
 * Update group permission
 * Requires: Admin permission on page
 * Body: { permission: PagePermission }
 */
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	const { id: pageId, groupId } = params;

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
		const success = await postgresPageSharingRepository.updateGroupPermission(
			pageId,
			groupId,
			permission
		);

		if (!success) {
			return json({ error: 'Group share not found' }, { status: 404 });
		}

		// Log audit event
		await postgresAuditRepository.logEvent(
			userId,
			'page_permission_changed',
			'page',
			pageId,
			'permission_change',
			{
				target_group_id: groupId,
				new_permission: permission
			}
		);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to update group permission:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * DELETE /api/pages/[id]/share/groups/[groupId]
 * Remove group share
 * Requires: Admin permission on page
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { id: pageId, groupId } = params;

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
		const success = await postgresPageSharingRepository.removeGroupShare(pageId, groupId);

		if (!success) {
			return json({ error: 'Group share not found' }, { status: 404 });
		}

		// Log audit event
		await postgresAuditRepository.logEvent(
			userId,
			'page_unshared_group',
			'page',
			pageId,
			'unshare',
			{
				target_group_id: groupId
			}
		);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to remove group share:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
