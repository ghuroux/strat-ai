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
 * Document visibility levels for sharing
 */
export type DocumentVisibility = 'private' | 'areas' | 'space';

/**
 * Document content type for distinguishing text vs image documents
 */
export type DocumentContentType = 'text' | 'image';

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

	// Content type (text = extractable text, image = base64 for vision API)
	contentType: DocumentContentType;

	// Content (extracted text for documents, base64 for images)
	content: string;
	contentHash: string;

	// Optional fields
	title?: string;
	summary?: string;
	truncated: boolean;

	// Sharing
	visibility: DocumentVisibility;

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
	contentType: string;
	content: string;
	contentHash: string;
	title: string | null;
	summary: string | null;
	truncated: boolean;
	visibility: string;
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
	contentType?: DocumentContentType;
}

/**
 * Input for updating a document
 */
export interface UpdateDocumentInput {
	title?: string;
	summary?: string;
	spaceId?: string;
	visibility?: DocumentVisibility;
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
		contentType: (row.contentType as DocumentContentType) ?? 'text',
		content: row.content,
		contentHash: row.contentHash,
		title: row.title ?? undefined,
		summary: row.summary ?? undefined,
		truncated: row.truncated,
		visibility: (row.visibility as DocumentVisibility) ?? 'private',
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

// =====================================================
// Document Area Sharing Types
// =====================================================

/**
 * Document Area Share junction record
 * Represents a document being shared with a specific Area
 */
export interface DocumentAreaShare {
	id: string;
	documentId: string;
	areaId: string;
	sharedBy: string;
	sharedAt: Date;
	notificationsSent: boolean;
}

/**
 * Database row for document_area_shares
 * Note: postgres.js transforms column names to camelCase automatically
 */
export interface DocumentAreaShareRow {
	id: string;
	documentId: string;
	areaId: string;
	sharedBy: string;
	sharedAt: Date;
	notificationsSent: boolean;
}

/**
 * Convert document_area_shares row to DocumentAreaShare
 * Note: postgres.js auto-transforms snake_case to camelCase
 */
export function rowToDocumentAreaShare(row: DocumentAreaShareRow): DocumentAreaShare {
	return {
		id: row.id,
		documentId: row.documentId,
		areaId: row.areaId,
		sharedBy: row.sharedBy,
		sharedAt: row.sharedAt,
		notificationsSent: row.notificationsSent
	};
}
