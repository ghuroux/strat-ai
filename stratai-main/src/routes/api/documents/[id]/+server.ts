/**
 * Individual Document API
 *
 * GET /api/documents/[id] - Get a single document with full content
 * PATCH /api/documents/[id] - Update document metadata (title, summary, spaceId)
 * DELETE /api/documents/[id] - Soft delete a document
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresDocumentRepository } from '$lib/server/persistence/documents-postgres';
import { postgresDocumentSharingRepository } from '$lib/server/persistence/document-sharing-postgres';
import type { UpdateDocumentInput } from '$lib/types/documents';

/**
 * GET /api/documents/[id]
 * Returns the full document including content
 * Query params:
 * - includeContent: Include full content (default: true)
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const { id } = params;
		const includeContent = url.searchParams.get('includeContent') !== 'false';

		const document = await postgresDocumentRepository.findById(id, userId);

		if (!document) {
			return json({ error: 'Document not found' }, { status: 404 });
		}

		// Get shared areas for this document
		const sharedAreas = await postgresDocumentSharingRepository.getDocumentSharedAreas(id);

		if (includeContent) {
			return json({
				document: {
					...document,
					sharedAreas
				}
			});
		}

		// Return without content
		const { content, ...summary } = document;
		return json({
			document: {
				...summary,
				sharedAreas
			}
		});
	} catch (error) {
		console.error('Failed to fetch document:', error);
		return json(
			{
				error: 'Failed to fetch document',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/documents/[id]
 * Update document metadata
 * Body: { title?, summary?, spaceId?, visibility? }
 */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const { id } = params;
		const body = await request.json();

		// Verify document exists
		const existing = await postgresDocumentRepository.findById(id, userId);
		if (!existing) {
			return json({ error: 'Document not found' }, { status: 404 });
		}

		// Build update input
		const updates: UpdateDocumentInput = {};
		if (body.title !== undefined) updates.title = body.title;
		if (body.summary !== undefined) updates.summary = body.summary;
		if (body.spaceId !== undefined) updates.spaceId = body.spaceId;
		if (body.visibility !== undefined) updates.visibility = body.visibility;

		const updated = await postgresDocumentRepository.update(id, updates, userId);

		if (!updated) {
			return json({ error: 'Failed to update document' }, { status: 500 });
		}

		// Get shared areas for response
		const sharedAreas = await postgresDocumentSharingRepository.getDocumentSharedAreas(id);

		// Return without content
		const { content, ...summary } = updated;
		return json({
			document: {
				...summary,
				sharedAreas
			}
		});
	} catch (error) {
		console.error('Failed to update document:', error);
		return json(
			{
				error: 'Failed to update document',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/documents/[id]
 * Soft delete a document
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.session) {
			return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
		}

		const userId = locals.session.userId;
		const { id } = params;

		// Verify document exists
		const existing = await postgresDocumentRepository.findById(id, userId);
		if (!existing) {
			return json({ error: 'Document not found' }, { status: 404 });
		}

		await postgresDocumentRepository.delete(id, userId);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete document:', error);
		return json(
			{
				error: 'Failed to delete document',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
