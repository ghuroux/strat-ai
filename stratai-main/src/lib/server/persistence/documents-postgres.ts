/**
 * PostgreSQL Document Repository
 *
 * Handles CRUD operations for documents and task-document linking.
 * Part of the Task Context System.
 */

import { createHash } from 'crypto';
import { sql } from './db';
import type {
	Document,
	DocumentRow,
	CreateDocumentInput,
	UpdateDocumentInput,
	TaskDocument,
	TaskDocumentRow,
	DocumentContextRole,
	DocumentWithTaskInfo
} from '$lib/types/documents';
import { rowToDocument, rowToTaskDocument } from '$lib/types/documents';
import type { DocumentRepository } from './types';

/**
 * Generate a unique document ID
 */
function generateDocumentId(): string {
	return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique task-document link ID
 */
function generateLinkId(): string {
	return `tdlink_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hash content for deduplication
 */
function hashContent(content: string): string {
	return createHash('sha256').update(content).digest('hex');
}

export const postgresDocumentRepository: DocumentRepository = {
	/**
	 * Find all documents for a user, optionally filtered by space
	 */
	async findAll(userId: string, spaceId?: string): Promise<Document[]> {
		const rows = spaceId
			? await sql<DocumentRow[]>`
				SELECT * FROM documents
				WHERE user_id = ${userId}
				  AND space_id = ${spaceId}
				  AND deleted_at IS NULL
				ORDER BY updated_at DESC
			`
			: await sql<DocumentRow[]>`
				SELECT * FROM documents
				WHERE user_id = ${userId}
				  AND deleted_at IS NULL
				ORDER BY updated_at DESC
			`;
		return rows.map(rowToDocument);
	},

	/**
	 * Find a document by ID
	 */
	async findById(id: string, userId: string): Promise<Document | null> {
		const rows = await sql<DocumentRow[]>`
			SELECT * FROM documents
			WHERE id = ${id}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToDocument(rows[0]) : null;
	},

	/**
	 * Find a document by content hash (for deduplication)
	 */
	async findByHash(contentHash: string, userId: string): Promise<Document | null> {
		const rows = await sql<DocumentRow[]>`
			SELECT * FROM documents
			WHERE content_hash = ${contentHash}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToDocument(rows[0]) : null;
	},

	/**
	 * Create a new document
	 */
	async create(input: CreateDocumentInput, userId: string): Promise<Document> {
		const id = generateDocumentId();
		const contentHash = hashContent(input.content);
		const now = new Date();
		const contentType = input.contentType ?? 'text';

		await sql`
			INSERT INTO documents (
				id, user_id, space_id, filename, mime_type,
				file_size, char_count, page_count, content_type, content, content_hash,
				title, truncated, created_at, updated_at
			) VALUES (
				${id}, ${userId}, ${input.spaceId ?? null}, ${input.filename}, ${input.mimeType},
				${input.fileSize}, ${input.charCount}, ${input.pageCount ?? null}, ${contentType}, ${input.content}, ${contentHash},
				${input.title ?? null}, ${input.truncated ?? false}, ${now}, ${now}
			)
		`;

		const doc = await this.findById(id, userId);
		if (!doc) throw new Error('Failed to create document');
		return doc;
	},

	/**
	 * Update a document's metadata
	 */
	async update(id: string, updates: UpdateDocumentInput, userId: string): Promise<Document | null> {
		// Build dynamic update
		const setClauses: string[] = [];
		const values: unknown[] = [];

		if (updates.title !== undefined) {
			setClauses.push('title');
			values.push(updates.title);
		}
		if (updates.summary !== undefined) {
			setClauses.push('summary');
			values.push(updates.summary);
		}
		if (updates.spaceId !== undefined) {
			setClauses.push('space_id');
			values.push(updates.spaceId);
		}

		if (setClauses.length === 0) {
			return this.findById(id, userId);
		}

		// Use individual update queries based on what's provided
		if (updates.title !== undefined) {
			await sql`
				UPDATE documents
				SET title = ${updates.title}, updated_at = NOW()
				WHERE id = ${id} AND user_id = ${userId} AND deleted_at IS NULL
			`;
		}
		if (updates.summary !== undefined) {
			await sql`
				UPDATE documents
				SET summary = ${updates.summary}, updated_at = NOW()
				WHERE id = ${id} AND user_id = ${userId} AND deleted_at IS NULL
			`;
		}
		if (updates.spaceId !== undefined) {
			await sql`
				UPDATE documents
				SET space_id = ${updates.spaceId}, updated_at = NOW()
				WHERE id = ${id} AND user_id = ${userId} AND deleted_at IS NULL
			`;
		}
		if (updates.visibility !== undefined) {
			await sql`
				UPDATE documents
				SET visibility = ${updates.visibility}, updated_at = NOW()
				WHERE id = ${id} AND user_id = ${userId} AND deleted_at IS NULL
			`;
		}

		return this.findById(id, userId);
	},

	/**
	 * Soft delete a document with cascade cleanup
	 *
	 * Cascade operations (all within transaction):
	 * 1. Remove from all areas' contextDocumentIds arrays
	 * 2. Delete all document_area_shares records (ON DELETE CASCADE)
	 * 3. Delete all task_documents links (ON DELETE CASCADE)
	 * 4. Soft delete the document itself
	 *
	 * @returns Cleanup counts for verification
	 */
	async delete(id: string, userId: string): Promise<{
		areasUpdated: number;
		sharesDeleted: number;
		taskLinksDeleted: number;
	}> {
		// Verify ownership before deletion
		const doc = await this.findById(id, userId);
		if (!doc) {
			throw new Error('Document not found or access denied');
		}

		// Execute all cascade operations in a transaction
		return await sql.begin(async (tx) => {
			// 1. Remove document from all areas' contextDocumentIds arrays
			const areasResult = await tx`
				UPDATE areas
				SET context_document_ids = array_remove(context_document_ids, ${id}),
				    updated_at = NOW()
				WHERE ${id} = ANY(context_document_ids)
				  AND deleted_at IS NULL
			`;
			const areasUpdated = areasResult.count;

			// 2. Count and delete document_area_shares (cascade will auto-delete, but we count first)
			const shareCountRows = await tx<{ count: number }[]>`
				SELECT COUNT(*)::int as count
				FROM document_area_shares
				WHERE document_id = ${id}
			`;
			const sharesDeleted = shareCountRows[0]?.count ?? 0;

			// 3. Count and delete task_documents links (cascade will auto-delete, but we count first)
			const taskLinkCountRows = await tx<{ count: number }[]>`
				SELECT COUNT(*)::int as count
				FROM task_documents
				WHERE document_id = ${id}
			`;
			const taskLinksDeleted = taskLinkCountRows[0]?.count ?? 0;

			// 4. Soft delete the document (CASCADE constraints will handle junction tables)
			await tx`
				UPDATE documents
				SET deleted_at = NOW()
				WHERE id = ${id}
				  AND user_id = ${userId}
				  AND deleted_at IS NULL
			`;

			return {
				areasUpdated,
				sharesDeleted,
				taskLinksDeleted
			};
		});
	},

	/**
	 * Link a document to a task
	 */
	async linkToTask(
		documentId: string,
		taskId: string,
		role: DocumentContextRole,
		userId: string,
		note?: string
	): Promise<TaskDocument> {
		// Verify document belongs to user
		const doc = await this.findById(documentId, userId);
		if (!doc) {
			throw new Error('Document not found or access denied');
		}

		const id = generateLinkId();
		const now = new Date();

		// Use ON CONFLICT to handle duplicates gracefully
		await sql`
			INSERT INTO task_documents (id, task_id, document_id, context_role, context_note, created_at)
			VALUES (${id}, ${taskId}, ${documentId}, ${role}, ${note ?? null}, ${now})
			ON CONFLICT (task_id, document_id) DO UPDATE
			SET context_role = ${role}, context_note = ${note ?? null}
		`;

		// Fetch the created/updated link
		const rows = await sql<TaskDocumentRow[]>`
			SELECT * FROM task_documents
			WHERE task_id = ${taskId} AND document_id = ${documentId}
		`;

		if (rows.length === 0) {
			throw new Error('Failed to create task-document link');
		}

		return rowToTaskDocument(rows[0]);
	},

	/**
	 * Unlink a document from a task
	 */
	async unlinkFromTask(documentId: string, taskId: string, userId: string): Promise<void> {
		// Verify document belongs to user before unlinking
		const doc = await this.findById(documentId, userId);
		if (!doc) {
			throw new Error('Document not found or access denied');
		}

		await sql`
			DELETE FROM task_documents
			WHERE task_id = ${taskId}
			  AND document_id = ${documentId}
		`;
	},

	/**
	 * Get all documents linked to a task
	 */
	async getDocumentsForTask(taskId: string, userId: string): Promise<DocumentWithTaskInfo[]> {
		// Note: postgres.js transforms column names to camelCase
		const rows = await sql<(DocumentRow & { contextRole: string; contextNote: string | null; linkedAt: Date })[]>`
			SELECT d.*, td.context_role, td.context_note, td.created_at as linked_at
			FROM documents d
			JOIN task_documents td ON td.document_id = d.id
			WHERE td.task_id = ${taskId}
			  AND d.user_id = ${userId}
			  AND d.deleted_at IS NULL
			ORDER BY td.created_at DESC
		`;

		return rows.map((row) => ({
			...rowToDocument(row),
			contextRole: row.contextRole as DocumentContextRole,
			contextNote: row.contextNote ?? undefined,
			linkedAt: row.linkedAt
		}));
	},

	/**
	 * Get all tasks that have a document linked
	 */
	async getTaskIdsForDocument(documentId: string, userId: string): Promise<string[]> {
		// Verify document belongs to user
		const doc = await this.findById(documentId, userId);
		if (!doc) {
			return [];
		}

		const rows = await sql<{ taskId: string }[]>`
			SELECT td.task_id
			FROM task_documents td
			JOIN tasks t ON t.id = td.task_id
			WHERE td.document_id = ${documentId}
			  AND t.user_id = ${userId}
			  AND t.deleted_at IS NULL
		`;

		return rows.map((r) => r.taskId);
	},

	/**
	 * Get documents shared with user's Areas in a Space
	 * Returns documents where:
	 * - visibility='space' (visible to all Space members)
	 * - visibility='areas' AND shared with one of user's Areas
	 * Excludes documents owned by the user (use findAll for those)
	 */
	async findSharedWithUser(userId: string, spaceId: string): Promise<Document[]> {
		const rows = await sql<DocumentRow[]>`
			SELECT DISTINCT d.*
			FROM documents d
			LEFT JOIN document_area_shares das ON d.id = das.document_id
			LEFT JOIN areas a ON das.area_id = a.id AND a.user_id = ${userId}
			WHERE d.space_id = ${spaceId}
			  AND d.deleted_at IS NULL
			  AND d.user_id != ${userId}
			  AND (
			    d.visibility = 'space'
			    OR (d.visibility = 'areas' AND a.id IS NOT NULL)
			  )
			ORDER BY d.updated_at DESC
		`;
		return rows.map(rowToDocument);
	},

	/**
	 * Get documents available for activation in a specific Area
	 * Returns documents where:
	 * - User owns the document (any visibility)
	 * - visibility='space' (available to all Areas in Space)
	 * - visibility='areas' AND shared with this specific Area
	 */
	async findAvailableForArea(userId: string, areaId: string, spaceId: string): Promise<Document[]> {
		const rows = await sql<DocumentRow[]>`
			SELECT DISTINCT d.*
			FROM documents d
			LEFT JOIN document_area_shares das ON d.id = das.document_id AND das.area_id = ${areaId}
			WHERE d.space_id = ${spaceId}
			  AND d.deleted_at IS NULL
			  AND (
			    d.user_id = ${userId}
			    OR d.visibility = 'space'
			    OR (d.visibility = 'areas' AND das.area_id IS NOT NULL)
			  )
			ORDER BY d.updated_at DESC
		`;
		return rows.map(rowToDocument);
	}
};
