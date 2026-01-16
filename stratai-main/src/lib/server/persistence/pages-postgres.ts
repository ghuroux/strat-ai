/**
 * PostgreSQL persistence layer for Pages
 *
 * Key design:
 * - User scoping on all queries
 * - Soft deletes via deleted_at column
 * - TEXT IDs with page_${timestamp}_${random} format
 * - CTE-based access control for shared pages (Phase 1: Page Sharing)
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
import type { PendingQuery, Row } from 'postgres';

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
 * Build CTE query fragment for accessible page IDs
 *
 * Returns all page IDs that a user can access via any of these paths:
 * - Path 1: User owns the page (user_id = userId)
 * - Path 2: Private page with direct user share
 * - Path 3: Private page with group share (user is in shared group)
 * - Path 4: Area-visible page where user has area access
 * - Path 5: Space-visible page where user owns the space
 *
 * This mirrors the access control logic in page-sharing-postgres.ts canAccessPage()
 *
 * @param userId - The user ID to check access for
 * @returns SQL fragment for use in WITH clause
 */
function buildAccessiblePagesCTE(userId: string): PendingQuery<Row[]> {
	return sql`
		accessible_pages AS (
			-- Path 1: User owns the page
			SELECT p.id
			FROM pages p
			WHERE p.user_id = ${userId}
				AND p.deleted_at IS NULL

			UNION

			-- Path 2: Private page with direct user share
			SELECT p.id
			FROM pages p
			JOIN page_user_shares pus ON p.id = pus.page_id
			WHERE pus.user_id = ${userId}
				AND p.visibility = 'private'
				AND p.deleted_at IS NULL

			UNION

			-- Path 3: Private page with group share (user in shared group)
			SELECT p.id
			FROM pages p
			JOIN page_group_shares pgs ON p.id = pgs.page_id
			JOIN group_memberships gm ON pgs.group_id = gm.group_id
			WHERE gm.user_id = ${userId}::uuid
				AND p.visibility = 'private'
				AND p.deleted_at IS NULL

			UNION

			-- Path 4: Area-visible page where user has area access
			-- Mirrors canAccessArea logic: owner, membership, group, or space fallthrough
			SELECT p.id
			FROM pages p
			JOIN areas a ON p.area_id = a.id
			LEFT JOIN spaces s ON a.space_id = s.id
			LEFT JOIN space_memberships sm ON s.id = sm.space_id AND sm.user_id = ${userId}
			LEFT JOIN area_memberships am ON a.id = am.area_id AND am.user_id = ${userId}
			LEFT JOIN (
				-- Group membership for area access
				SELECT DISTINCT am_grp.area_id
				FROM area_memberships am_grp
				JOIN group_memberships gm ON am_grp.group_id = gm.group_id
				WHERE gm.user_id = ${userId}::uuid
			) grp_access ON a.id = grp_access.area_id
			WHERE p.visibility = 'area'
				AND p.deleted_at IS NULL
				AND a.deleted_at IS NULL
				AND (
					-- User created the area
					a.user_id = ${userId} OR a.created_by = ${userId}
					-- OR user has direct area membership
					OR am.user_id IS NOT NULL
					-- OR user has area access via group
					OR grp_access.area_id IS NOT NULL
					-- OR user owns the space
					OR s.user_id = ${userId}
					-- OR non-restricted area with space membership (non-guest)
					OR (
						COALESCE(a.is_restricted, false) = false
						AND sm.user_id IS NOT NULL
						AND sm.role IN ('owner', 'admin', 'member')
					)
				)

			UNION

			-- Path 5: Space-visible page where user owns the space
			SELECT p.id
			FROM pages p
			JOIN areas a ON p.area_id = a.id
			JOIN spaces s ON a.space_id = s.id
			WHERE p.visibility = 'space'
				AND s.user_id = ${userId}
				AND p.deleted_at IS NULL
				AND a.deleted_at IS NULL
				AND s.deleted_at IS NULL
		)
	`;
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
	/**
	 * Find all pages accessible to a user
	 *
	 * Uses CTE-based access control to return pages via any access path:
	 * - Pages the user owns
	 * - Private pages shared directly with the user
	 * - Private pages shared via group membership
	 * - Area-visible pages in areas the user can access
	 * - Space-visible pages in spaces the user owns
	 *
	 * @param userId - The user to check access for
	 * @param filter - Optional filters for areaId, pageType, or taskId
	 */
	async findAll(userId: string, filter?: PageListFilter): Promise<Page[]> {
		const accessiblePagesCTE = buildAccessiblePagesCTE(userId);

		let rows: PageRow[];

		if (filter?.areaId && filter?.pageType) {
			rows = await sql<PageRow[]>`
				WITH ${accessiblePagesCTE}
				SELECT p.*
				FROM pages p
				WHERE p.id IN (SELECT id FROM accessible_pages)
					AND p.area_id = ${filter.areaId}
					AND p.page_type = ${filter.pageType}
					AND p.deleted_at IS NULL
				ORDER BY p.updated_at DESC
			`;
		} else if (filter?.areaId) {
			rows = await sql<PageRow[]>`
				WITH ${accessiblePagesCTE}
				SELECT p.*
				FROM pages p
				WHERE p.id IN (SELECT id FROM accessible_pages)
					AND p.area_id = ${filter.areaId}
					AND p.deleted_at IS NULL
				ORDER BY p.updated_at DESC
			`;
		} else if (filter?.taskId) {
			rows = await sql<PageRow[]>`
				WITH ${accessiblePagesCTE}
				SELECT p.*
				FROM pages p
				WHERE p.id IN (SELECT id FROM accessible_pages)
					AND p.task_id = ${filter.taskId}
					AND p.deleted_at IS NULL
				ORDER BY p.updated_at DESC
			`;
		} else {
			rows = await sql<PageRow[]>`
				WITH ${accessiblePagesCTE}
				SELECT p.*
				FROM pages p
				WHERE p.id IN (SELECT id FROM accessible_pages)
					AND p.deleted_at IS NULL
				ORDER BY p.updated_at DESC
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
