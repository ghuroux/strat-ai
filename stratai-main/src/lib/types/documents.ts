/**
 * Document Types for Task Context System
 *
 * Documents are first-class entities that can be linked to tasks
 * to provide context during planning and execution.
 */

/**
 * How a document relates to a task
 */
export type DocumentContextRole = 'reference' | 'input' | 'output';

/**
 * Core Document entity
 */
export interface Document {
	id: string;
	userId: string;
	spaceId?: string;

	// File metadata
	filename: string;
	mimeType: string;
	fileSize: number;
	charCount: number;
	pageCount?: number;

	// Content (extracted text, not raw binary)
	content: string;
	contentHash: string;

	// Optional fields
	title?: string;
	summary?: string;
	truncated: boolean;

	// Timestamps
	createdAt: Date;
	updatedAt: Date;
	deletedAt?: Date;
}

/**
 * Database row representation
 */
export interface DocumentRow {
	id: string;
	user_id: string;
	space_id: string | null;
	filename: string;
	mime_type: string;
	file_size: number;
	char_count: number;
	page_count: number | null;
	content: string;
	content_hash: string;
	title: string | null;
	summary: string | null;
	truncated: boolean;
	created_at: Date;
	updated_at: Date;
	deleted_at: Date | null;
}

/**
 * Task-Document junction record
 */
export interface TaskDocument {
	id: string;
	taskId: string;
	documentId: string;
	contextRole: DocumentContextRole;
	contextNote?: string;
	createdAt: Date;
}

/**
 * Database row for task_documents junction
 */
export interface TaskDocumentRow {
	id: string;
	task_id: string;
	document_id: string;
	context_role: string;
	context_note: string | null;
	created_at: Date;
}

/**
 * Input for creating a new document
 */
export interface CreateDocumentInput {
	filename: string;
	mimeType: string;
	fileSize: number;
	content: string;
	charCount: number;
	pageCount?: number;
	truncated?: boolean;
	spaceId?: string;
	title?: string;
}

/**
 * Input for updating a document
 */
export interface UpdateDocumentInput {
	title?: string;
	summary?: string;
	spaceId?: string;
}

/**
 * Input for linking a document to a task
 */
export interface LinkDocumentInput {
	documentId: string;
	contextRole?: DocumentContextRole;
	contextNote?: string;
}

/**
 * Document with task linking info
 */
export interface DocumentWithTaskInfo extends Document {
	contextRole: DocumentContextRole;
	contextNote?: string;
	linkedAt: Date;
}

/**
 * Summary of a document for context display
 */
export interface DocumentSummary {
	id: string;
	filename: string;
	charCount: number;
	pageCount?: number;
	title?: string;
	truncated: boolean;
}

/**
 * Convert database row to Document entity
 */
export function rowToDocument(row: DocumentRow): Document {
	return {
		id: row.id,
		userId: row.user_id,
		spaceId: row.space_id ?? undefined,
		filename: row.filename,
		mimeType: row.mime_type,
		fileSize: row.file_size,
		charCount: row.char_count,
		pageCount: row.page_count ?? undefined,
		content: row.content,
		contentHash: row.content_hash,
		title: row.title ?? undefined,
		summary: row.summary ?? undefined,
		truncated: row.truncated,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at ?? undefined
	};
}

/**
 * Convert task_documents row to TaskDocument
 */
export function rowToTaskDocument(row: TaskDocumentRow): TaskDocument {
	return {
		id: row.id,
		taskId: row.task_id,
		documentId: row.document_id,
		contextRole: row.context_role as DocumentContextRole,
		contextNote: row.context_note ?? undefined,
		createdAt: row.created_at
	};
}
