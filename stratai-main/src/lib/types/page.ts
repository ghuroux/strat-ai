/**
 * Page Types for AI-Native Document System
 *
 * Pages are user-created rich text documents within areas.
 * Distinct from the `documents` system which handles file uploads.
 */

/**
 * Page types for different templates
 */
export type PageType =
	| 'general'
	| 'meeting_notes'
	| 'decision_record'
	| 'proposal'
	| 'project_brief'
	| 'weekly_update'
	| 'technical_spec';

/**
 * Page visibility levels
 */
export type PageVisibility = 'private' | 'area' | 'space';  // Updated for Phase 1: Page Sharing

/**
 * Page lifecycle status
 * - draft: Working document, only owner can edit
 * - shared: Visible to area/space members, owner can edit
 * - finalized: Locked, creates version on finalize, can be added to AI context
 */
export type PageStatus = 'draft' | 'shared' | 'finalized';

/**
 * Relationship types for page-conversation links
 */
export type PageConversationRelationship = 'source' | 'discussion' | 'reference';

/**
 * Core Page entity
 */
export interface Page {
	id: string;
	userId: string;
	areaId: string;
	taskId?: string;

	// Content
	title: string;
	content: TipTapContent;
	contentText?: string;
	pageType: PageType;

	// Metadata
	visibility: PageVisibility;
	sourceConversationId?: string;
	wordCount: number;

	// Lifecycle status (Phase 1: Page Lifecycle)
	status: PageStatus;
	finalizedAt?: Date;
	finalizedBy?: string;
	currentVersion?: number;

	// Context integration (Phase 2: Page Context)
	inContext: boolean;

	// Context-aware unlock (Phase 4: Polish)
	contextVersionNumber?: number;

	// Timestamps
	createdAt: Date;
	updatedAt: Date;
	deletedAt?: Date;
}

/**
 * TipTap document structure
 * See: https://tiptap.dev/docs/editor/guide/output#option-1-json
 */
export interface TipTapContent {
	type: 'doc';
	content: TipTapNode[];
}

/**
 * TipTap node structure (simplified)
 */
export interface TipTapNode {
	type: string;
	attrs?: Record<string, unknown>;
	marks?: TipTapMark[];
	content?: TipTapNode[];
	text?: string;
}

/**
 * TipTap mark structure
 */
export interface TipTapMark {
	type: string;
	attrs?: Record<string, unknown>;
}

/**
 * Database row representation
 * Note: postgres.js auto-converts snake_case to camelCase
 */
export interface PageRow {
	id: string;
	userId: string;
	areaId: string;
	taskId: string | null;
	title: string;
	content: TipTapContent | string; // May come as string from JSONB
	contentText: string | null;
	pageType: string;
	visibility: string;
	sourceConversationId: string | null;
	wordCount: number;
	// Lifecycle status (Phase 1: Page Lifecycle)
	status: string;
	finalizedAt: Date | null;
	finalizedBy: string | null;
	currentVersion: number | null;
	// Context integration (Phase 2: Page Context)
	inContext: boolean;
	// Context-aware unlock (Phase 4: Polish)
	contextVersionNumber: number | null;
	// Timestamps
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
}

/**
 * Input for creating a page
 */
export interface CreatePageInput {
	areaId: string;
	title: string;
	content?: TipTapContent;
	pageType?: PageType;
	visibility?: PageVisibility;
	taskId?: string;
	sourceConversationId?: string;
}

/**
 * Input for updating a page
 */
export interface UpdatePageInput {
	title?: string;
	content?: TipTapContent;
	contentText?: string;
	pageType?: PageType;
	visibility?: PageVisibility;
	taskId?: string | null;
	wordCount?: number;
}

/**
 * Page version entity
 */
export interface PageVersion {
	id: string;
	pageId: string;
	content: TipTapContent;
	contentText?: string;
	title: string;
	wordCount: number;
	createdBy: string;
	versionNumber: number;
	changeSummary?: string;
	createdAt: Date;
}

/**
 * Database row for page_versions
 */
export interface PageVersionRow {
	id: string;
	pageId: string;
	content: TipTapContent | string;
	contentText: string | null;
	title: string;
	wordCount: number;
	createdBy: string;
	versionNumber: number;
	changeSummary: string | null;
	createdAt: Date;
}

/**
 * Page-conversation link entity
 */
export interface PageConversation {
	id: string;
	pageId: string;
	conversationId: string;
	relationship: PageConversationRelationship;
	createdAt: Date;
}

/**
 * Database row for page_conversations
 */
export interface PageConversationRow {
	id: string;
	pageId: string;
	conversationId: string;
	relationship: string;
	createdAt: Date;
}

/**
 * Page list filters
 */
export interface PageListFilter {
	areaId?: string;
	pageType?: PageType;
	visibility?: PageVisibility;
	taskId?: string;
}

/**
 * Page summary for list views (without full content)
 */
export interface PageSummary {
	id: string;
	areaId: string;
	title: string;
	pageType: PageType;
	visibility: PageVisibility;
	wordCount: number;
	taskId?: string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Default empty TipTap content
 */
export const EMPTY_TIPTAP_CONTENT: TipTapContent = {
	type: 'doc',
	content: []
};

/**
 * Convert database row to Page entity
 * Note: postgres.js auto-converts snake_case to camelCase
 */
export function rowToPage(row: PageRow): Page {
	// Parse content if it's a string (JSONB can come as string)
	let parsedContent: TipTapContent = EMPTY_TIPTAP_CONTENT;
	if (row.content) {
		if (typeof row.content === 'string') {
			try {
				parsedContent = JSON.parse(row.content) as TipTapContent;
			} catch (e) {
				console.error('[rowToPage] Failed to parse content:', e);
			}
		} else {
			parsedContent = row.content;
		}
	}

	return {
		id: row.id,
		userId: row.userId,
		areaId: row.areaId,
		taskId: row.taskId ?? undefined,
		title: row.title,
		content: parsedContent,
		contentText: row.contentText ?? undefined,
		pageType: row.pageType as PageType,
		visibility: row.visibility as PageVisibility,
		sourceConversationId: row.sourceConversationId ?? undefined,
		wordCount: row.wordCount ?? 0,
		// Lifecycle status (Phase 1: Page Lifecycle)
		status: (row.status as PageStatus) ?? 'draft',
		finalizedAt: row.finalizedAt ?? undefined,
		finalizedBy: row.finalizedBy ?? undefined,
		currentVersion: row.currentVersion ?? undefined,
		// Context integration (Phase 2: Page Context)
		inContext: row.inContext ?? false,
		// Context-aware unlock (Phase 4: Polish)
		contextVersionNumber: row.contextVersionNumber ?? undefined,
		// Timestamps
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		deletedAt: row.deletedAt ?? undefined
	};
}

/**
 * Convert database row to PageVersion entity
 */
export function rowToPageVersion(row: PageVersionRow): PageVersion {
	let parsedContent: TipTapContent = EMPTY_TIPTAP_CONTENT;
	if (row.content) {
		if (typeof row.content === 'string') {
			try {
				parsedContent = JSON.parse(row.content) as TipTapContent;
			} catch (e) {
				console.error('[rowToPageVersion] Failed to parse content:', e);
			}
		} else {
			parsedContent = row.content;
		}
	}

	return {
		id: row.id,
		pageId: row.pageId,
		content: parsedContent,
		contentText: row.contentText ?? undefined,
		title: row.title,
		wordCount: row.wordCount ?? 0,
		createdBy: row.createdBy,
		versionNumber: row.versionNumber,
		changeSummary: row.changeSummary ?? undefined,
		createdAt: row.createdAt
	};
}

/**
 * Convert database row to PageConversation entity
 */
export function rowToPageConversation(row: PageConversationRow): PageConversation {
	return {
		id: row.id,
		pageId: row.pageId,
		conversationId: row.conversationId,
		relationship: row.relationship as PageConversationRelationship,
		createdAt: row.createdAt
	};
}

/**
 * Extract plain text from TipTap content for search indexing
 */
export function extractTextFromContent(content: TipTapContent): string {
	const texts: string[] = [];

	function extractFromNodes(nodes: TipTapNode[]): void {
		for (const node of nodes) {
			if (node.text) {
				texts.push(node.text);
			}
			if (node.content) {
				extractFromNodes(node.content);
			}
		}
	}

	if (content.content) {
		extractFromNodes(content.content);
	}

	return texts.join(' ');
}

/**
 * Count words in TipTap content
 */
export function countWords(content: TipTapContent): number {
	const text = extractTextFromContent(content);
	if (!text.trim()) return 0;
	return text.trim().split(/\s+/).length;
}

/**
 * Page type display names
 */
export const PAGE_TYPE_LABELS: Record<PageType, string> = {
	general: 'General',
	meeting_notes: 'Meeting Notes',
	decision_record: 'Decision Record',
	proposal: 'Proposal',
	project_brief: 'Project Brief',
	weekly_update: 'Weekly Update',
	technical_spec: 'Technical Spec'
};

/**
 * Page type icons (Lucide icon names)
 */
export const PAGE_TYPE_ICONS: Record<PageType, string> = {
	general: 'FileText',
	meeting_notes: 'Users',
	decision_record: 'Scale',
	proposal: 'Lightbulb',
	project_brief: 'Briefcase',
	weekly_update: 'Calendar',
	technical_spec: 'Code'
};

/**
 * Page status display labels
 */
export const PAGE_STATUS_LABELS: Record<PageStatus, string> = {
	draft: 'Draft',
	shared: 'Shared',
	finalized: 'Finalized'
};
