/**
 * Task-Document Linking API
 *
 * GET /api/tasks/[id]/documents - List documents linked to a task
 * POST /api/tasks/[id]/documents - Link a document to a task
 * DELETE /api/tasks/[id]/documents?documentId= - Unlink a document from a task
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresDocumentRepository } from '$lib/server/persistence/documents-postgres';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';
import type { DocumentContextRole } from '$lib/types/documents';

// Default user ID for POC (will be replaced with auth in Phase 0.4)
const DEFAULT_USER_ID = 'admin';

/**
 * GET /api/tasks/[id]/documents
 * List all documents linked to this task
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id: taskId } = params;

		// Verify task exists
		const task = await postgresTaskRepository.findById(taskId, DEFAULT_USER_ID);
		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		const documents = await postgresDocumentRepository.getDocumentsForTask(taskId, DEFAULT_USER_ID);

		// Return summaries without full content
		const summaries = documents.map((doc) => ({
			id: doc.id,
			filename: doc.filename,
			mimeType: doc.mimeType,
			charCount: doc.charCount,
			pageCount: doc.pageCount,
			title: doc.title,
			truncated: doc.truncated,
			contextRole: doc.contextRole,
			contextNote: doc.contextNote,
			linkedAt: doc.linkedAt
		}));

		return json({ documents: summaries });
	} catch (error) {
		console.error('Failed to fetch task documents:', error);
		return json(
			{
				error: 'Failed to fetch task documents',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * POST /api/tasks/[id]/documents
 * Link a document to this task
 * Body: { documentId, contextRole?, contextNote? }
 */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const { id: taskId } = params;
		const body = await request.json();

		const { documentId, contextRole, contextNote } = body;

		if (!documentId) {
			return json({ error: 'documentId is required' }, { status: 400 });
		}

		// Validate contextRole if provided
		const validRoles: DocumentContextRole[] = ['reference', 'input', 'output'];
		if (contextRole && !validRoles.includes(contextRole)) {
			return json(
				{ error: `Invalid contextRole. Must be one of: ${validRoles.join(', ')}` },
				{ status: 400 }
			);
		}

		// Verify task exists
		const task = await postgresTaskRepository.findById(taskId, DEFAULT_USER_ID);
		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		// Link the document
		const link = await postgresDocumentRepository.linkToTask(
			documentId,
			taskId,
			contextRole ?? 'reference',
			DEFAULT_USER_ID,
			contextNote
		);

		return json({ link }, { status: 201 });
	} catch (error) {
		console.error('Failed to link document to task:', error);

		// Handle specific errors
		if (error instanceof Error && error.message.includes('not found')) {
			return json({ error: error.message }, { status: 404 });
		}

		return json(
			{
				error: 'Failed to link document to task',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/tasks/[id]/documents?documentId=
 * Unlink a document from this task
 */
export const DELETE: RequestHandler = async ({ params, url }) => {
	try {
		const { id: taskId } = params;
		const documentId = url.searchParams.get('documentId');

		if (!documentId) {
			return json({ error: 'documentId query parameter is required' }, { status: 400 });
		}

		// Verify task exists
		const task = await postgresTaskRepository.findById(taskId, DEFAULT_USER_ID);
		if (!task) {
			return json({ error: 'Task not found' }, { status: 404 });
		}

		await postgresDocumentRepository.unlinkFromTask(documentId, taskId, DEFAULT_USER_ID);

		return json({ success: true });
	} catch (error) {
		console.error('Failed to unlink document from task:', error);

		// Handle specific errors
		if (error instanceof Error && error.message.includes('not found')) {
			return json({ error: error.message }, { status: 404 });
		}

		return json(
			{
				error: 'Failed to unlink document from task',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
