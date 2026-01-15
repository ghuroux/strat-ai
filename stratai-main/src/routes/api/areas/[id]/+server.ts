/**
 * Areas API - Individual Operations
 *
 * GET /api/areas/[id] - Get a specific area
 * PATCH /api/areas/[id] - Update an area
 * DELETE /api/areas/[id] - Delete an area (General areas cannot be deleted)
 *
 * Renamed from focus-areas - see DESIGN-SPACES-AND-FOCUS-AREAS.md
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresAreaRepository } from '$lib/server/persistence/areas-postgres';
import { postgresAreaMembershipsRepository } from '$lib/server/persistence/area-memberships-postgres';
import { postgresDocumentSharingRepository } from '$lib/server/persistence/document-sharing-postgres';
import type { UpdateAreaInput } from '$lib/types/areas';

/**
 * GET /api/areas/[id]
 * Returns area with task and conversation counts, plus user's access info
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;

		// Check access first
		const access = await postgresAreaMembershipsRepository.canAccessArea(userId, params.id);
		if (!access.hasAccess) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		const area = await postgresAreaRepository.findById(params.id, userId);

		if (!area) {
			return json({ error: 'Area not found' }, { status: 404 });
		}

		// Get stats
		const taskCount = await postgresAreaRepository.getTaskCount(params.id, userId);
		const conversationCount = await postgresAreaRepository.getConversationCount(
			params.id,
			userId
		);

		return json({
			area: {
				...area,
				taskCount,
				conversationCount
			},
			userRole: access.role,
			accessSource: access.source
		});
	} catch (error) {
		console.error('Failed to fetch area:', error);
		return json(
			{ error: 'Failed to fetch area', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/areas/[id]
 * Body: { name?, context?, contextDocumentIds?, color?, icon?, orderIndex?, isRestricted? }
 * Note: General areas cannot have their name changed
 * Requires: owner or admin access
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;

		// Check access - require owner or admin
		const access = await postgresAreaMembershipsRepository.canAccessArea(userId, params.id);
		if (!access.hasAccess) {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		if (!['owner', 'admin'].includes(access.role)) {
			return json({ error: 'Insufficient permissions. Owner or admin access required.' }, { status: 403 });
		}

		const body = await request.json();

		// Validate name if provided
		if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
			return json({ error: 'name must be a non-empty string' }, { status: 400 });
		}

		// Fail fast: Check if attempting to restrict a General area
		if (body.isRestricted === true) {
			const area = await postgresAreaRepository.findById(params.id, userId);
			if (area?.isGeneral) {
				return json({ error: 'General area cannot be restricted' }, { status: 400 });
			}
		}

		// Validate document activation if contextDocumentIds is being updated
		if (body.contextDocumentIds !== undefined) {
			// Get current area to find spaceId and current contextDocumentIds
			const existingArea = await postgresAreaRepository.findById(params.id, userId);
			if (!existingArea) {
				return json({ error: 'Area not found' }, { status: 404 });
			}

			const currentIds = new Set(existingArea.contextDocumentIds ?? []);
			const newIds: string[] = body.contextDocumentIds ?? [];

			// Find documents being ADDED (not already activated)
			const addedIds = newIds.filter((id: string) => !currentIds.has(id));

			// Validate each new document can be activated
			const invalidIds: string[] = [];
			for (const docId of addedIds) {
				const canActivate = await postgresDocumentSharingRepository.canActivateDocument(
					userId,
					docId,
					params.id,
					existingArea.spaceId
				);
				if (!canActivate) {
					invalidIds.push(docId);
				}
			}

			if (invalidIds.length > 0) {
				return json(
					{
						error: 'Cannot activate documents that are not visible to this Area',
						invalidDocumentIds: invalidIds
					},
					{ status: 400 }
				);
			}
		}

		const updates: UpdateAreaInput = {};

		if (body.name !== undefined) updates.name = body.name.trim();
		if (body.context !== undefined) updates.context = body.context;
		if (body.contextDocumentIds !== undefined) updates.contextDocumentIds = body.contextDocumentIds;
		if (body.color !== undefined) updates.color = body.color;
		if (body.icon !== undefined) updates.icon = body.icon;
		if (body.orderIndex !== undefined) updates.orderIndex = body.orderIndex;
		if (body.isRestricted !== undefined) updates.isRestricted = body.isRestricted;

		const area = await postgresAreaRepository.update(params.id, updates, userId);

		if (!area) {
			return json({ error: 'Area not found' }, { status: 404 });
		}

		return json({ area });
	} catch (error) {
		console.error('Failed to update area:', error);

		// Handle duplicate name error
		if (error instanceof Error && error.message.includes('already exists')) {
			return json({ error: error.message }, { status: 409 });
		}

		// Handle General area rename attempt
		if (error instanceof Error && error.message.includes('Cannot rename the General area')) {
			return json({ error: error.message }, { status: 400 });
		}

		// Handle General area restriction attempt
		if (error instanceof Error && error.message.includes('General area cannot be restricted')) {
			return json({ error: error.message }, { status: 400 });
		}

		return json(
			{ error: 'Failed to update area', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/areas/[id]
 * Soft deletes the area. General areas cannot be deleted.
 * Requires: owner access
 *
 * Query params:
 * - deleteContent=true: Delete all conversations and tasks in this area
 * - deleteContent=false (default): Move conversations to General, unlink tasks
 */
export const DELETE: RequestHandler = async ({ params, url, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;

		// Check access - require owner
		const access = await postgresAreaMembershipsRepository.canAccessArea(userId, params.id);
		if (!access.hasAccess) {
			return json({ error: 'Access denied' }, { status: 403 });
		}
		if (access.role !== 'owner') {
			return json({ error: 'Insufficient permissions. Owner access required.' }, { status: 403 });
		}

		// Parse deleteContent option from query string
		const deleteContent = url.searchParams.get('deleteContent') === 'true';

		const deleted = await postgresAreaRepository.delete(params.id, userId, {
			deleteContent
		});

		if (!deleted) {
			return json({ error: 'Area not found' }, { status: 404 });
		}

		return json({ success: true, deleteContent });
	} catch (error) {
		console.error('Failed to delete area:', error);

		// Handle General area delete attempt
		if (error instanceof Error && error.message.includes('Cannot delete the General area')) {
			return json({ error: error.message }, { status: 400 });
		}

		// Handle missing General area
		if (error instanceof Error && error.message.includes('Cannot find General area')) {
			return json({ error: error.message }, { status: 500 });
		}

		return json(
			{ error: 'Failed to delete area', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};
