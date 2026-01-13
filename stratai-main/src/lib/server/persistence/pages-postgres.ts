/**
 * PostgreSQL persistence layer for Pages
 *
 * Key design:
 * - User scoping on all queries
 * - Soft deletes via deleted_at column
 * - TEXT IDs with page_${timestamp}_${random} format
 */

import type {
	Page,
	PageRow,
	PageVersion,
	PageVersionRow,
	PageConversation,
	PageConversationRow,
	CreatePageInput,
	UpdatePageInput,
	PageListFilter,
	PageSummary,
	TipTapContent,
	PageConversationRelationship
} from '$lib/types/page';
import {
	rowToPage,
	rowToPageVersion,
	rowToPageConversation,
	extractTextFromContent,
	countWords,
	EMPTY_TIPTAP_CONTENT
} from '$lib/types/page';
import { sql, type JSONValue } from './db';
import type { PagePermission } from '$lib/types/page-sharing';

/**
 * Generate unique page ID
 */
function generatePageId(): string {
	return `page_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate unique page version ID
 */
function generatePageVersionId(): string {
	return `pv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate unique page-conversation link ID
 */
function generatePageConversationId(): string {
	return `pc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Page repository interface
 */
export interface PageRepository {
	// Core CRUD
	findAll(userId: string, filter?: PageListFilter): Promise<Page[]>;
	findById(id: string, userId: string): Promise<Page | null>;
	create(input: CreatePageInput, userId: string): Promise<Page>;
	update(id: string, updates: UpdatePageInput, userId: string): Promise<Page | null>;
	delete(id: string, userId: string): Promise<void>;

	// Search
	search(query: string, userId: string, areaId?: string): Promise<PageSummary[]>;

	// Versions
	getVersions(pageId: string, userId: string): Promise<PageVersion[]>;
	createVersion(pageId: string, changeSummary: string | undefined, userId: string): Promise<PageVersion | null>;

	// Page-conversation links
	getConversations(pageId: string, userId: string): Promise<PageConversation[]>;
	linkConversation(
		pageId: string,
		conversationId: string,
		relationship: PageConversationRelationship,
		userId: string
	): Promise<PageConversation>;
	unlinkConversation(pageId: string, conversationId: string, userId: string): Promise<void>;

	// Utility
	duplicate(id: string, userId: string): Promise<Page | null>;
	count(userId: string, filter?: PageListFilter): Promise<number>;

	// Permission checks (Phase 1: Page Sharing)
	canUserAccessPage(userId: string, pageId: string): Promise<boolean>;
	getUserPagePermission(userId: string, pageId: string): Promise<PagePermission | null>;
}

/**
 * PostgreSQL implementation of PageRepository
 */
export const postgresPageRepository: PageRepository = {
	async findAll(userId: string, filter?: PageListFilter): Promise<Page[]> {
		let rows: PageRow[];

		if (filter?.areaId && filter?.pageType) {
			rows = await sql<PageRow[]>`
				SELECT *
				FROM pages
				WHERE user_id = ${userId}
					AND area_id = ${filter.areaId}
					AND page_type = ${filter.pageType}
					AND deleted_at IS NULL
				ORDER BY updated_at DESC
			`;
		} else if (filter?.areaId) {
			rows = await sql<PageRow[]>`
				SELECT *
				FROM pages
				WHERE user_id = ${userId}
					AND area_id = ${filter.areaId}
					AND deleted_at IS NULL
				ORDER BY updated_at DESC
			`;
		} else if (filter?.taskId) {
			rows = await sql<PageRow[]>`
				SELECT *
				FROM pages
				WHERE user_id = ${userId}
					AND task_id = ${filter.taskId}
					AND deleted_at IS NULL
				ORDER BY updated_at DESC
			`;
		} else {
			rows = await sql<PageRow[]>`
				SELECT *
				FROM pages
				WHERE user_id = ${userId}
					AND deleted_at IS NULL
				ORDER BY updated_at DESC
			`;
		}

		return rows.map(rowToPage);
	},

	async findById(id: string, userId: string): Promise<Page | null> {
		// Phase 1: Check access via sharing system (not just ownership)
		const canAccess = await this.canUserAccessPage(userId, id);
		if (!canAccess) {
			return null;
		}

		const rows = await sql<PageRow[]>`
			SELECT *
			FROM pages
			WHERE id = ${id}
				AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToPage(rows[0]) : null;
	},

	async create(input: CreatePageInput, userId: string): Promise<Page> {
		const id = generatePageId();
		const now = new Date();
		const content = input.content ?? EMPTY_TIPTAP_CONTENT;
		const contentText = extractTextFromContent(content);
		const wordCount = countWords(content);

		await sql`
			INSERT INTO pages (
				id, user_id, area_id, task_id,
				title, content, content_text, page_type,
				visibility, source_conversation_id, word_count,
				created_at, updated_at
			) VALUES (
				${id},
				${userId},
				${input.areaId},
				${input.taskId ?? null},
				${input.title},
				${sql.json(content as JSONValue)},
				${contentText || null},
				${input.pageType ?? 'general'},
				${input.visibility ?? 'private'},
				${input.sourceConversationId ?? null},
				${wordCount},
				${now},
				${now}
			)
		`;

		const page = await this.findById(id, userId);
		if (!page) throw new Error('Failed to create page');
		return page;
	},

	async update(id: string, updates: UpdatePageInput, userId: string): Promise<Page | null> {
		// Phase 1: Check user has editor or admin permission
		const permission = await this.getUserPagePermission(userId, id);
		if (!permission || permission === 'viewer') {
			// Viewer can't edit, no permission means no access
			return null;
		}

		// Get current page for visibility change detection
		const currentRows = await sql<Pick<PageRow, 'visibility'>[]>`
			SELECT visibility FROM pages
			WHERE id = ${id} AND deleted_at IS NULL
		`;

		if (currentRows.length === 0) {
			return null; // Page doesn't exist
		}

		const currentVisibility = currentRows[0].visibility;

		// If content is updated, extract text and calculate word count
		let contentText: string | undefined;
		let wordCount: number | undefined;

		if (updates.content) {
			contentText = extractTextFromContent(updates.content);
			wordCount = countWords(updates.content);
		}

		// Phase 1: Handle visibility changes
		if (updates.visibility && updates.visibility !== currentVisibility) {
			// Import audit repository
			const { postgresAuditRepository } = await import('./audit-postgres');

			// Log visibility change
			await postgresAuditRepository.logEvent(
				userId,
				'page_visibility_changed',
				'page',
				id,
				'visibility_change',
				{
					old_visibility: currentVisibility,
					new_visibility: updates.visibility
				}
			);

			// If changing FROM private TO area/space, remove all specific shares
			if (
				currentVisibility === 'private' &&
				(updates.visibility === 'area' || updates.visibility === 'space')
			) {
				const { postgresPageSharingRepository } = await import('./page-sharing-postgres');
				const sharesRemoved = await postgresPageSharingRepository.removeAllSpecificShares(id);

				if (sharesRemoved > 0) {
					// Log that specific shares were removed
					await postgresAuditRepository.logEvent(
						userId,
						'page_visibility_changed',
						'page',
						id,
						'shares_removed',
						{
							old_visibility: currentVisibility,
							new_visibility: updates.visibility,
							specific_shares_removed: sharesRemoved
						}
					);
				}
			}
		}

		await sql`
			UPDATE pages
			SET
				title = COALESCE(${updates.title ?? null}, title),
				content = ${updates.content ? sql.json(updates.content as JSONValue) : sql`content`},
				content_text = COALESCE(${contentText ?? null}, content_text),
				page_type = COALESCE(${updates.pageType ?? null}, page_type),
				visibility = COALESCE(${updates.visibility ?? null}, visibility),
				task_id = ${updates.taskId === null ? null : updates.taskId ?? sql`task_id`},
				word_count = COALESCE(${wordCount ?? null}, word_count),
				updated_at = NOW()
			WHERE id = ${id}
				AND deleted_at IS NULL
		`;

		return this.findById(id, userId);
	},

	async delete(id: string, userId: string): Promise<void> {
		// Soft delete
		await sql`
			UPDATE pages
			SET deleted_at = NOW()
			WHERE id = ${id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
	},

	async search(query: string, userId: string, areaId?: string): Promise<PageSummary[]> {
		const searchQuery = query.trim().split(/\s+/).join(' & ');

		let rows: PageRow[];

		if (areaId) {
			rows = await sql<PageRow[]>`
				SELECT id, area_id, title, page_type, visibility, word_count, task_id, created_at, updated_at
				FROM pages
				WHERE user_id = ${userId}
					AND area_id = ${areaId}
					AND deleted_at IS NULL
					AND to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_text, ''))
						@@ to_tsquery('english', ${searchQuery})
				ORDER BY ts_rank(
					to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_text, '')),
					to_tsquery('english', ${searchQuery})
				) DESC
				LIMIT 50
			`;
		} else {
			rows = await sql<PageRow[]>`
				SELECT id, area_id, title, page_type, visibility, word_count, task_id, created_at, updated_at
				FROM pages
				WHERE user_id = ${userId}
					AND deleted_at IS NULL
					AND to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_text, ''))
						@@ to_tsquery('english', ${searchQuery})
				ORDER BY ts_rank(
					to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_text, '')),
					to_tsquery('english', ${searchQuery})
				) DESC
				LIMIT 50
			`;
		}

		return rows.map((row) => ({
			id: row.id,
			areaId: row.areaId,
			title: row.title,
			pageType: row.pageType as PageSummary['pageType'],
			visibility: row.visibility as PageSummary['visibility'],
			wordCount: row.wordCount ?? 0,
			taskId: row.taskId ?? undefined,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt
		}));
	},

	async getVersions(pageId: string, userId: string): Promise<PageVersion[]> {
		// First verify user owns the page
		const page = await this.findById(pageId, userId);
		if (!page) return [];

		const rows = await sql<PageVersionRow[]>`
			SELECT *
			FROM page_versions
			WHERE page_id = ${pageId}
			ORDER BY version_number DESC
		`;

		return rows.map(rowToPageVersion);
	},

	async createVersion(pageId: string, changeSummary: string | undefined, userId: string): Promise<PageVersion | null> {
		// Get current page state
		const page = await this.findById(pageId, userId);
		if (!page) return null;

		// Get next version number
		const versionResult = await sql<{ maxVersion: number | null }[]>`
			SELECT MAX(version_number) as max_version
			FROM page_versions
			WHERE page_id = ${pageId}
		`;
		const nextVersion = (versionResult[0]?.maxVersion ?? 0) + 1;

		const id = generatePageVersionId();
		const contentText = extractTextFromContent(page.content);

		await sql`
			INSERT INTO page_versions (
				id, page_id, content, content_text, title,
				word_count, created_by, version_number, change_summary,
				created_at
			) VALUES (
				${id},
				${pageId},
				${sql.json(page.content as JSONValue)},
				${contentText || null},
				${page.title},
				${page.wordCount},
				${userId},
				${nextVersion},
				${changeSummary ?? null},
				NOW()
			)
		`;

		const rows = await sql<PageVersionRow[]>`
			SELECT * FROM page_versions WHERE id = ${id}
		`;

		return rows.length > 0 ? rowToPageVersion(rows[0]) : null;
	},

	async getConversations(pageId: string, userId: string): Promise<PageConversation[]> {
		// First verify user owns the page
		const page = await this.findById(pageId, userId);
		if (!page) return [];

		const rows = await sql<PageConversationRow[]>`
			SELECT *
			FROM page_conversations
			WHERE page_id = ${pageId}
			ORDER BY created_at DESC
		`;

		return rows.map(rowToPageConversation);
	},

	async linkConversation(
		pageId: string,
		conversationId: string,
		relationship: PageConversationRelationship,
		userId: string
	): Promise<PageConversation> {
		// Verify user owns the page
		const page = await this.findById(pageId, userId);
		if (!page) throw new Error('Page not found');

		const id = generatePageConversationId();

		// Use ON CONFLICT to handle duplicates
		await sql`
			INSERT INTO page_conversations (id, page_id, conversation_id, relationship, created_at)
			VALUES (${id}, ${pageId}, ${conversationId}, ${relationship}, NOW())
			ON CONFLICT (page_id, conversation_id, relationship) DO NOTHING
		`;

		// Return the link (either new or existing)
		const rows = await sql<PageConversationRow[]>`
			SELECT *
			FROM page_conversations
			WHERE page_id = ${pageId}
				AND conversation_id = ${conversationId}
				AND relationship = ${relationship}
		`;

		if (rows.length === 0) throw new Error('Failed to link conversation');
		return rowToPageConversation(rows[0]);
	},

	async unlinkConversation(pageId: string, conversationId: string, userId: string): Promise<void> {
		// Verify user owns the page
		const page = await this.findById(pageId, userId);
		if (!page) throw new Error('Page not found');

		await sql`
			DELETE FROM page_conversations
			WHERE page_id = ${pageId}
				AND conversation_id = ${conversationId}
		`;
	},

	async duplicate(id: string, userId: string): Promise<Page | null> {
		const original = await this.findById(id, userId);
		if (!original) return null;

		const newId = generatePageId();
		const now = new Date();

		await sql`
			INSERT INTO pages (
				id, user_id, area_id, task_id,
				title, content, content_text, page_type,
				visibility, word_count,
				created_at, updated_at
			) VALUES (
				${newId},
				${userId},
				${original.areaId},
				${null},
				${original.title + ' (Copy)'},
				${sql.json(original.content as JSONValue)},
				${original.contentText ?? null},
				${original.pageType},
				${'private'},
				${original.wordCount},
				${now},
				${now}
			)
		`;

		return this.findById(newId, userId);
	},

	async count(userId: string, filter?: PageListFilter): Promise<number> {
		let result;

		if (filter?.areaId) {
			result = await sql<{ count: string }[]>`
				SELECT COUNT(*) as count
				FROM pages
				WHERE user_id = ${userId}
					AND area_id = ${filter.areaId}
					AND deleted_at IS NULL
			`;
		} else {
			result = await sql<{ count: string }[]>`
				SELECT COUNT(*) as count
				FROM pages
				WHERE user_id = ${userId}
					AND deleted_at IS NULL
			`;
		}

		return parseInt(result[0]?.count || '0', 10);
	},

	/**
	 * Check if user can access page (Phase 1: Page Sharing)
	 * Uses page sharing repository to check ownership + shares
	 */
	async canUserAccessPage(userId: string, pageId: string): Promise<boolean> {
		const { postgresPageSharingRepository } = await import('./page-sharing-postgres');
		const access = await postgresPageSharingRepository.canAccessPage(userId, pageId);
		return access.hasAccess;
	},

	/**
	 * Get user's permission level for page (Phase 1: Page Sharing)
	 * Returns permission if user has access, null otherwise
	 */
	async getUserPagePermission(userId: string, pageId: string): Promise<PagePermission | null> {
		const { postgresPageSharingRepository } = await import('./page-sharing-postgres');
		const access = await postgresPageSharingRepository.canAccessPage(userId, pageId);
		return access.hasAccess ? access.permission : null;
	}
};

/**
 * Get pages for a specific area (convenience function)
 */
export async function getPagesForArea(areaId: string, userId: string): Promise<Page[]> {
	return postgresPageRepository.findAll(userId, { areaId });
}

/**
 * Get pages linked to a task (convenience function)
 */
export async function getPagesForTask(taskId: string, userId: string): Promise<Page[]> {
	return postgresPageRepository.findAll(userId, { taskId });
}
