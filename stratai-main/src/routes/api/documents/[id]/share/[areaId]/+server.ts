/**
 * Document Unshare API
 *
 * DELETE /api/documents/[id]/share/[areaId] - Unshare document from specific area
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresDocumentRepository } from '$lib/server/persistence/documents-postgres';
import { postgresDocumentSharingRepository } from '$lib/server/persistence/document-sharing-postgres';

/**
 * DELETE /api/documents/[id]/share/[areaId]
 * Unshares document from specific Area
 * Also auto-deactivates from Area's contextDocumentIds
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const { id: documentId, areaId } = params;

		// Verify document exists and user is owner
		const document = await postgresDocumentRepository.findById(documentId, userId);
		if (!document) {
			return json({ error: 'Document not found' }, { status: 404 });
		}

		// Unshare from area (also auto-deactivates)
		await postgresDocumentSharingRepository.unshareDocumentFromArea(documentId, areaId);

		// Get remaining shared areas
		const sharedAreas = await postgresDocumentSharingRepository.getDocumentSharedAreas(documentId);

		// If no more shared areas, set visibility to private
		if (sharedAreas.length === 0 && document.visibility === 'areas') {
			await postgresDocumentSharingRepository.updateDocumentVisibility(
				documentId,
				'private',
				userId
			);
		}

		return json({
			success: true,
			sharing: {
				documentId,
				visibility: sharedAreas.length === 0 ? 'private' : document.visibility,
				sharedAreas
			}
		});
	} catch (error) {
		console.error('Failed to unshare document:', error);
		return json(
			{
				error: 'Failed to unshare document',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
