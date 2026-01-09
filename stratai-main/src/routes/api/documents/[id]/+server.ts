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

		if (includeContent) {
			return json({ document });
		}

		// Return without content
		const { content, ...summary } = document;
		return json({ document: summary });
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
 * Body: { title?, summary?, space? }
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

		// Validate space if provided
		const updated = await postgresDocumentRepository.update(
			id,
			{
				title: body.title,
				summary: body.summary,
				spaceId: body.spaceId as string | undefined
			},
			userId
		);

		if (!updated) {
			return json({ error: 'Failed to update document' }, { status: 500 });
		}

		// Return without content
		const { content, ...summary } = updated;
		return json({ document: summary });
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
