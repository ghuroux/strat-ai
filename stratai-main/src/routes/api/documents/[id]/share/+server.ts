/**
 * Document Sharing API
 *
 * GET /api/documents/[id]/share - Get sharing info for a document
 * POST /api/documents/[id]/share - Update sharing settings
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresDocumentRepository } from '$lib/server/persistence/documents-postgres';
import { postgresDocumentSharingRepository } from '$lib/server/persistence/document-sharing-postgres';
import type { DocumentVisibility } from '$lib/types/documents';

/**
 * GET /api/documents/[id]/share
 * Returns sharing info: visibility, sharedAreas
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const { id } = params;

		// Verify document exists and user has access
		const document = await postgresDocumentRepository.findById(id, userId);
		if (!document) {
			return json({ error: 'Document not found' }, { status: 404 });
		}

		// Get shared areas
		const sharedAreas = await postgresDocumentSharingRepository.getDocumentSharedAreas(id);

		return json({
			sharing: {
				documentId: id,
				visibility: document.visibility,
				sharedAreas
			}
		});
	} catch (error) {
		console.error('Failed to fetch document sharing:', error);
		return json(
			{
				error: 'Failed to fetch document sharing',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/documents/[id]/share
 * Update sharing settings
 * Body: { visibility: 'private' | 'areas' | 'space', areaIds?: string[] }
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const { id } = params;
		const body = await request.json();

		// Verify document exists and user is owner
		const document = await postgresDocumentRepository.findById(id, userId);
		if (!document) {
			return json({ error: 'Document not found' }, { status: 404 });
		}

		// Validate visibility
		const visibility = body.visibility as DocumentVisibility;
		if (!visibility || !['private', 'areas', 'space'].includes(visibility)) {
			return json(
				{ error: 'Invalid visibility. Must be: private, areas, or space' },
				{ status: 400 }
			);
		}

		const areaIds = body.areaIds as string[] | undefined;

		// Update visibility (this handles clearing shares for private/space)
		await postgresDocumentSharingRepository.updateDocumentVisibility(id, visibility, userId);

		// If visibility is 'areas' and areaIds provided, share with those areas
		if (visibility === 'areas' && areaIds && areaIds.length > 0) {
			await postgresDocumentSharingRepository.shareDocumentWithAreas(id, areaIds, userId);
		}

		// Get updated sharing info
		const sharedAreas = await postgresDocumentSharingRepository.getDocumentSharedAreas(id);

		return json({
			sharing: {
				documentId: id,
				visibility,
				sharedAreas
			}
		});
	} catch (error) {
		console.error('Failed to update document sharing:', error);
		return json(
			{
				error: 'Failed to update document sharing',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
