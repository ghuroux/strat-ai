/**
 * API Endpoint: /api/pages/[id]/share
 * Handles listing and creating page shares (user or group)
 * Phase 1: Page Sharing
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	postgresPageSharingRepository,
	postgresAuditRepository
} from '$lib/server/persistence';

/**
 * GET /api/pages/[id]/share
 * List all shares for a page
 * Requires: Admin permission on page
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { id: pageId } = params;

	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		// Check if user has admin permission (required to view shares)
		const access = await postgresPageSharingRepository.canAccessPage(userId, pageId);

		if (!access.hasAccess || access.permission !== 'admin') {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		// Get all shares
		const shares = await postgresPageSharingRepository.getPageShares(pageId);

		return json({
			...shares,
			currentUserPermission: access.permission,
			currentUserSource: access.source
		});
	} catch (error) {
		console.error('Failed to get page shares:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

/**
 * POST /api/pages/[id]/share
 * Share page with user or group
 * Requires: Admin permission on page
 * Body: { userId?: string, groupId?: string, permission?: PagePermission }
 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	const { id: pageId } = params;

	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const body = await request.json();

		// Check admin permission
		const access = await postgresPageSharingRepository.canAccessPage(userId, pageId);

		if (!access.hasAccess || access.permission !== 'admin') {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		// Validate body has either userId or groupId (not both, not neither)
		if ((body.userId && body.groupId) || (!body.userId && !body.groupId)) {
			return json(
				{ error: 'Must provide either userId or groupId, not both' },
				{ status: 400 }
			);
		}

		const permission = body.permission || 'viewer';

		// Validate permission
		if (!['viewer', 'editor', 'admin'].includes(permission)) {
			return json({ error: 'Invalid permission level' }, { status: 400 });
		}

		// Share with user or group
		if (body.userId) {
			const share = await postgresPageSharingRepository.sharePageWithUser(
				pageId,
				body.userId,
				permission,
				userId
			);

			// Log audit event
			await postgresAuditRepository.logEvent(
				userId,
				'page_shared_user',
				'page',
				pageId,
				'share',
				{
					target_user_id: body.userId,
					permission
				},
				locals.session.organizationId
			);

			return json(share);
		} else {
			const share = await postgresPageSharingRepository.sharePageWithGroup(
				pageId,
				body.groupId,
				permission,
				userId
			);

			// Log audit event
			await postgresAuditRepository.logEvent(
				userId,
				'page_shared_group',
				'page',
				pageId,
				'share',
				{
					target_group_id: body.groupId,
					permission
				},
				locals.session.organizationId
			);

			return json(share);
		}
	} catch (error) {
		console.error('Failed to share page:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
