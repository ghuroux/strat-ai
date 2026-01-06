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
 * Note: postgres.js transforms column names to camelCase automatically
 */
export interface DocumentRow {
	id: string;
	userId: string;
	spaceId: string | null;
	filename: string;
	mimeType: string;
	fileSize: number;
	charCount: number;
	pageCount: number | null;
	content: string;
	contentHash: string;
	title: string | null;
	summary: string | null;
	truncated: boolean;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
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
 * Note: postgres.js transforms column names to camelCase automatically
 */
export interface TaskDocumentRow {
	id: string;
	taskId: string;
	documentId: string;
	contextRole: string;
	contextNote: string | null;
	createdAt: Date;
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
 * Note: postgres.js auto-transforms snake_case to camelCase
 */
export function rowToDocument(row: DocumentRow): Document {
	return {
		id: row.id,
		userId: row.userId,
		spaceId: row.spaceId ?? undefined,
		filename: row.filename,
		mimeType: row.mimeType,
		fileSize: row.fileSize,
		charCount: row.charCount,
		pageCount: row.pageCount ?? undefined,
		content: row.content,
		contentHash: row.contentHash,
		title: row.title ?? undefined,
		summary: row.summary ?? undefined,
		truncated: row.truncated,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		deletedAt: row.deletedAt ?? undefined
	};
}

/**
 * Convert task_documents row to TaskDocument
 * Note: postgres.js auto-transforms snake_case to camelCase
 */
export function rowToTaskDocument(row: TaskDocumentRow): TaskDocument {
	return {
		id: row.id,
		taskId: row.taskId,
		documentId: row.documentId,
		contextRole: row.contextRole as DocumentContextRole,
		contextNote: row.contextNote ?? undefined,
		createdAt: row.createdAt
	};
}
