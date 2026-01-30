/**
 * API Endpoint: /api/pages/[id]/audit
 * Query audit log for a page
 * Phase 1: Page Sharing
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	postgresPageSharingRepository,
	postgresAuditRepository
} from '$lib/server/persistence';
import type { AuditEventType } from '$lib/types/audit';

/**
 * GET /api/pages/[id]/audit
 * Get audit log for a page
 * Requires: Admin permission on page
 * Query params:
 *   - limit (default: 50)
 *   - offset (default: 0)
 *   - eventTypes (comma-separated list of event types to filter)
 */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	const { id: pageId } = params;

	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		// Check access: owner always sees activity; non-owners need admin permission
		const access = await postgresPageSharingRepository.canAccessPage(userId, pageId);

		if (!access.hasAccess) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		if (access.source !== 'owner' && access.permission !== 'admin') {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		// Parse query parameters
		const limit = parseInt(url.searchParams.get('limit') || '50', 10);
		const offset = parseInt(url.searchParams.get('offset') || '0', 10);
		const eventTypesParam = url.searchParams.get('eventTypes');

		// Validate limit/offset
		if (limit < 1 || limit > 500) {
			return json({ error: 'Limit must be between 1 and 500' }, { status: 400 });
		}

		if (offset < 0) {
			return json({ error: 'Offset must be non-negative' }, { status: 400 });
		}

		// Parse event types filter
		const eventTypes = eventTypesParam
			? (eventTypesParam.split(',') as AuditEventType[])
			: undefined;

		// Get audit events
		const events = await postgresAuditRepository.getResourceAudit('page', pageId, {
			eventTypes,
			limit,
			offset
		});

		return json({
			events,
			meta: {
				limit,
				offset,
				count: events.length
			}
		});
	} catch (error) {
		console.error('Failed to get page audit log:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
