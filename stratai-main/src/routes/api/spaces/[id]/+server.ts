/**
 * Spaces API - Individual Operations
 *
 * GET /api/spaces/[id] - Get a specific space (owner or member)
 * PATCH /api/spaces/[id] - Update a space (admin+ required)
 * DELETE /api/spaces/[id] - Delete a custom space (owner only)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresSpaceRepository } from '$lib/server/persistence/spaces-postgres';
import { postgresSpaceMembershipsRepository } from '$lib/server/persistence';
import { sql } from '$lib/server/persistence/db';
import { rowToSpace, type UpdateSpaceInput, type SpaceRow } from '$lib/types/spaces';
import { canEditSpaceSettings, canDeleteSpace } from '$lib/types/space-memberships';

/**
 * GET /api/spaces/[id]
 * Returns the space if user has access (owner or membership)
 * Includes userRole in response
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const spaceId = params.id;

	try {
		// Check access via membership system
		const access = await postgresSpaceMembershipsRepository.canAccessSpace(userId, spaceId);

		if (!access.hasAccess) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		// Try to fetch via owner lookup first (uses existing caching/indexing)
		let space = await postgresSpaceRepository.findById(spaceId, userId);

		// If not owner, fetch space directly (user has access via membership)
		if (!space) {
			const rows = await sql<SpaceRow[]>`
				SELECT * FROM spaces WHERE id = ${spaceId} AND deleted_at IS NULL
			`;
			if (rows.length === 0) {
				return json({ error: 'Space not found' }, { status: 404 });
			}
			space = rowToSpace(rows[0]);
		}

		return json({ space: { ...space, userRole: access.role } });
	} catch (error) {
		console.error('Failed to fetch space:', error);
		return json(
			{
				error: 'Failed to fetch space',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/spaces/[id]
 * Body: { name?, context?, contextDocumentIds?, color?, icon?, orderIndex? }
 *
 * Requires admin+ role. System spaces only allow context and contextDocumentIds updates.
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const spaceId = params.id;

	try {
		// Check access and permission
		const access = await postgresSpaceMembershipsRepository.canAccessSpace(userId, spaceId);

		if (!access.hasAccess) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		if (!canEditSpaceSettings(access.role)) {
			return json(
				{ error: 'Insufficient permissions. Admin access required.' },
				{ status: 403 }
			);
		}

		const body = await request.json();

		// Validate name if provided
		if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
			return json({ error: 'name must be a non-empty string' }, { status: 400 });
		}

		const updates: UpdateSpaceInput = {};

		if (body.name !== undefined) updates.name = body.name.trim();
		if (body.context !== undefined) updates.context = body.context;
		if (body.contextDocumentIds !== undefined) updates.contextDocumentIds = body.contextDocumentIds;
		if (body.color !== undefined) updates.color = body.color;
		if (body.icon !== undefined) updates.icon = body.icon;
		if (body.orderIndex !== undefined) updates.orderIndex = body.orderIndex;

		// Note: postgresSpaceRepository.update checks ownership, but we've already
		// verified admin+ access. For non-owners with admin role via membership,
		// we need to use a direct update approach.
		// For now, owners can update directly. Admin members need the update to work
		// regardless of ownership - the repository handles this if access.source is 'owner'.
		const space = await postgresSpaceRepository.update(spaceId, updates, userId);

		if (!space) {
			// User is admin via membership but not owner - update directly
			if (access.source !== 'owner') {
				// For membership-based admin access, update directly
				await sql`
					UPDATE spaces
					SET
						name = COALESCE(${updates.name ?? null}, name),
						context = ${updates.context === undefined ? sql`context` : updates.context ?? null},
						context_document_ids = ${updates.contextDocumentIds === undefined ? sql`context_document_ids` : updates.contextDocumentIds ?? []},
						color = ${updates.color === undefined ? sql`color` : updates.color ?? null},
						icon = ${updates.icon === undefined ? sql`icon` : updates.icon ?? null},
						order_index = COALESCE(${updates.orderIndex ?? null}, order_index),
						updated_at = NOW()
					WHERE id = ${spaceId}
						AND deleted_at IS NULL
				`;

				// Fetch updated space
				const rows = await sql<SpaceRow[]>`
					SELECT * FROM spaces WHERE id = ${spaceId} AND deleted_at IS NULL
				`;
				if (rows.length > 0) {
					return json({ space: { ...rowToSpace(rows[0]), userRole: access.role } });
				}
			}
			return json({ error: 'Space not found' }, { status: 404 });
		}

		return json({ space: { ...space, userRole: access.role } });
	} catch (error) {
		console.error('Failed to update space:', error);

		// Handle specific errors
		if (error instanceof Error) {
			if (error.message.includes('already exists')) {
				return json({ error: error.message }, { status: 409 });
			}
			if (
				error.message.includes('Cannot modify') ||
				error.message.includes('Cannot use reserved')
			) {
				return json({ error: error.message }, { status: 400 });
			}
		}

		return json(
			{
				error: 'Failed to update space',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/spaces/[id]
 * Soft deletes a custom space. Only owners can delete. System spaces cannot be deleted.
 * Cascades deletion to all related areas, tasks, conversations, and memberships.
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;
	const spaceId = params.id;

	try {
		// Check access and permission
		const access = await postgresSpaceMembershipsRepository.canAccessSpace(userId, spaceId);

		if (!access.hasAccess) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		if (!canDeleteSpace(access.role)) {
			return json(
				{ error: 'Insufficient permissions. Only owners can delete spaces.' },
				{ status: 403 }
			);
		}

		const result = await postgresSpaceRepository.delete(spaceId, userId);

		if (!result) {
			return json({ error: 'Space not found' }, { status: 404 });
		}

		return json({
			success: true,
			...result
		});
	} catch (error) {
		console.error('Failed to delete space:', error);

		// Handle cannot delete system space
		if (error instanceof Error && error.message.includes('Cannot delete system')) {
			return json({ error: error.message }, { status: 400 });
		}

		return json(
			{
				error: 'Failed to delete space',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
