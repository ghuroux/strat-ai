/**
 * Page Sharing Repository
 * Handles granular page sharing with user/group permissions and access control
 * Created: 2026-01-13
 * Pattern: Mirrors area-memberships-postgres.ts for consistency
 */

import { sql } from './db';
import type {
	PagePermission,
	PageAccessResult,
	PageUserShare,
	PageUserShareRow,
	PageUserShareWithDetails,
	PageGroupShare,
	PageGroupShareRow,
	PageGroupShareWithDetails
} from '$lib/types/page-sharing';
import { rowToPageUserShare, rowToPageGroupShare } from '$lib/types/page-sharing';

// ============================================================================
// Repository Interface
// ============================================================================

export interface PageSharingRepository {
	// Access control (most important method)
	canAccessPage(userId: string, pageId: string): Promise<PageAccessResult>;

	// User sharing operations
	sharePageWithUser(
		pageId: string,
		userId: string,
		permission: PagePermission,
		sharedBy: string
	): Promise<PageUserShare>;
	getUserShare(pageId: string, userId: string): Promise<PageUserShare | null>;
	removeUserShare(pageId: string, userId: string): Promise<boolean>;
	updateUserPermission(
		pageId: string,
		userId: string,
		newPermission: PagePermission
	): Promise<boolean>;

	// Group sharing operations
	sharePageWithGroup(
		pageId: string,
		groupId: string,
		permission: PagePermission,
		sharedBy: string
	): Promise<PageGroupShare>;
	getGroupShare(pageId: string, groupId: string): Promise<PageGroupShare | null>;
	removeGroupShare(pageId: string, groupId: string): Promise<boolean>;
	updateGroupPermission(
		pageId: string,
		groupId: string,
		newPermission: PagePermission
	): Promise<boolean>;

	// Get all shares for a page
	getPageShares(pageId: string): Promise<{
		users: PageUserShareWithDetails[];
		groups: PageGroupShareWithDetails[];
	}>;

	// Utility for visibility changes
	removeAllSpecificShares(pageId: string): Promise<number>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Generate unique share ID with prefix */
function generateShareId(prefix: 'pus' | 'pgs'): string {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Core Access Control Algorithm
// ============================================================================

/**
 * Check if user can access page and determine their permission level
 *
 * Resolution order:
 * 1. Page owner → admin permission
 * 2. If visibility = 'private':
 *    - Check direct user share → return that permission
 *    - Check group share (best role if multiple groups) → return that permission
 *    - Else deny
 * 3. If visibility = 'area':
 *    - Check area membership via canAccessArea → map area role to page permission
 *    - owner/admin/member → editor, viewer → viewer
 * 4. If visibility = 'space':
 *    - Check space ownership → editor permission
 */
async function canAccessPage(userId: string, pageId: string): Promise<PageAccessResult> {
	// Get page details and check ownership
	const pageRows = await sql<
		{
			user_id: string;
			area_id: string;
			visibility: 'private' | 'area' | 'space';
			space_id: string;
		}[]
	>`
		SELECT
			p.user_id,
			p.area_id,
			p.visibility,
			a.space_id
		FROM pages p
		JOIN areas a ON p.area_id = a.id
		WHERE p.id = ${pageId}
			AND p.deleted_at IS NULL
			AND a.deleted_at IS NULL
	`;

	if (pageRows.length === 0) {
		return { hasAccess: false, permission: null, source: 'owner' };
	}

	const page = pageRows[0];

	// 1. Owner check - page creator always has admin access
	if (page.user_id === userId) {
		return { hasAccess: true, permission: 'admin', source: 'owner' };
	}

	// 2. Private visibility - check specific shares
	if (page.visibility === 'private') {
		// Check direct user share
		const userShare = await getUserShare(pageId, userId);
		if (userShare) {
			return {
				hasAccess: true,
				permission: userShare.permission,
				source: 'user_share'
			};
		}

		// Check group shares (user might be in multiple groups)
		// If in multiple groups, pick best (highest) permission
		const groupShareRows = await sql<
			{
				permission: PagePermission;
			}[]
		>`
			SELECT pgs.permission
			FROM page_group_shares pgs
			JOIN group_memberships gm ON pgs.group_id = gm.group_id
			WHERE pgs.page_id = ${pageId}
				AND gm.user_id = ${userId}::uuid
			ORDER BY CASE pgs.permission
				WHEN 'admin' THEN 1
				WHEN 'editor' THEN 2
				WHEN 'viewer' THEN 3
			END
			LIMIT 1
		`;

		if (groupShareRows.length > 0) {
			return {
				hasAccess: true,
				permission: groupShareRows[0].permission,
				source: 'group_share'
			};
		}

		// No shares found for private page
		return { hasAccess: false, permission: null, source: 'user_share' };
	}

	// 3. Area visibility - check area access
	if (page.visibility === 'area') {
		// Import area memberships repository
		const { postgresAreaMembershipsRepository } = await import('./area-memberships-postgres');
		const areaAccess = await postgresAreaMembershipsRepository.canAccessArea(userId, page.area_id);

		if (!areaAccess.hasAccess) {
			return { hasAccess: false, permission: null, source: 'area' };
		}

		// Map area role to page permission:
		// owner/admin/member/inherited → editor
		// viewer → viewer
		let pagePermission: PagePermission;
		if (areaAccess.role === 'viewer') {
			pagePermission = 'viewer';
		} else {
			pagePermission = 'editor'; // owner/admin/member/inherited all get editor
		}

		return {
			hasAccess: true,
			permission: pagePermission,
			source: 'area'
		};
	}

	// 4. Space visibility - check space ownership
	if (page.visibility === 'space') {
		const spaceOwnerRows = await sql<{ exists: boolean }[]>`
			SELECT EXISTS (
				SELECT 1 FROM spaces
				WHERE id = ${page.space_id}
					AND user_id = ${userId}
					AND deleted_at IS NULL
			) as exists
		`;

		if (spaceOwnerRows[0]?.exists) {
			return { hasAccess: true, permission: 'editor', source: 'space' };
		}

		return { hasAccess: false, permission: null, source: 'space' };
	}

	// Fallback: deny access
	return { hasAccess: false, permission: null, source: 'owner' };
}

// ============================================================================
// User Share Operations
// ============================================================================

/** Share page with user (upsert - updates if already shared) */
async function sharePageWithUser(
	pageId: string,
	userId: string,
	permission: PagePermission,
	sharedBy: string
): Promise<PageUserShare> {
	const id = generateShareId('pus');

	const rows = await sql<PageUserShareRow[]>`
		INSERT INTO page_user_shares (id, page_id, user_id, permission, shared_by)
		VALUES (${id}, ${pageId}, ${userId}, ${permission}, ${sharedBy})
		ON CONFLICT (page_id, user_id)
		DO UPDATE SET
			permission = ${permission},
			shared_at = NOW()
		RETURNING *
	`;

	if (rows.length === 0) {
		throw new Error('Failed to share page with user');
	}

	return rowToPageUserShare(rows[0]);
}

/** Get user share for a page */
async function getUserShare(pageId: string, userId: string): Promise<PageUserShare | null> {
	const rows = await sql<PageUserShareRow[]>`
		SELECT * FROM page_user_shares
		WHERE page_id = ${pageId}
			AND user_id = ${userId}
	`;

	return rows.length > 0 ? rowToPageUserShare(rows[0]) : null;
}

/** Remove user share */
async function removeUserShare(pageId: string, userId: string): Promise<boolean> {
	const result = await sql`
		DELETE FROM page_user_shares
		WHERE page_id = ${pageId}
			AND user_id = ${userId}
	`;

	return result.count > 0;
}

/** Update user permission */
async function updateUserPermission(
	pageId: string,
	userId: string,
	newPermission: PagePermission
): Promise<boolean> {
	const result = await sql`
		UPDATE page_user_shares
		SET permission = ${newPermission},
				shared_at = NOW()
		WHERE page_id = ${pageId}
			AND user_id = ${userId}
	`;

	return result.count > 0;
}

// ============================================================================
// Group Share Operations
// ============================================================================

/** Share page with group (upsert - updates if already shared) */
async function sharePageWithGroup(
	pageId: string,
	groupId: string,
	permission: PagePermission,
	sharedBy: string
): Promise<PageGroupShare> {
	const id = generateShareId('pgs');

	const rows = await sql<PageGroupShareRow[]>`
		INSERT INTO page_group_shares (id, page_id, group_id, permission, shared_by)
		VALUES (${id}, ${pageId}, ${groupId}::uuid, ${permission}, ${sharedBy})
		ON CONFLICT (page_id, group_id)
		DO UPDATE SET
			permission = ${permission},
			shared_at = NOW()
		RETURNING *
	`;

	if (rows.length === 0) {
		throw new Error('Failed to share page with group');
	}

	return rowToPageGroupShare(rows[0]);
}

/** Get group share for a page */
async function getGroupShare(pageId: string, groupId: string): Promise<PageGroupShare | null> {
	const rows = await sql<PageGroupShareRow[]>`
		SELECT * FROM page_group_shares
		WHERE page_id = ${pageId}
			AND group_id = ${groupId}::uuid
	`;

	return rows.length > 0 ? rowToPageGroupShare(rows[0]) : null;
}

/** Remove group share */
async function removeGroupShare(pageId: string, groupId: string): Promise<boolean> {
	const result = await sql`
		DELETE FROM page_group_shares
		WHERE page_id = ${pageId}
			AND group_id = ${groupId}::uuid
	`;

	return result.count > 0;
}

/** Update group permission */
async function updateGroupPermission(
	pageId: string,
	groupId: string,
	newPermission: PagePermission
): Promise<boolean> {
	const result = await sql`
		UPDATE page_group_shares
		SET permission = ${newPermission},
				shared_at = NOW()
		WHERE page_id = ${pageId}
			AND group_id = ${groupId}::uuid
	`;

	return result.count > 0;
}

// ============================================================================
// Get Page Shares (with details)
// ============================================================================

/** Get all shares for a page with user/group details */
async function getPageShares(pageId: string): Promise<{
	users: PageUserShareWithDetails[];
	groups: PageGroupShareWithDetails[];
}> {
	// Get user shares with user details
	const userRows = await sql<
		(PageUserShareRow & {
			user_name: string | null;
			user_email: string | null;
		})[]
	>`
		SELECT
			pus.*,
			u.display_name as user_name,
			u.email as user_email
		FROM page_user_shares pus
		LEFT JOIN users u ON pus.user_id = u.id::text
		WHERE pus.page_id = ${pageId}
		ORDER BY pus.created_at DESC
	`;

	const users: PageUserShareWithDetails[] = userRows.map((row) => ({
		...rowToPageUserShare(row),
		userName: row.user_name,
		userEmail: row.user_email
	}));

	// Get group shares with group details
	const groupRows = await sql<
		(PageGroupShareRow & {
			group_name: string;
			member_count: string; // COUNT returns string
		})[]
	>`
		SELECT
			pgs.*,
			g.name as group_name,
			COUNT(gm.user_id) as member_count
		FROM page_group_shares pgs
		LEFT JOIN groups g ON pgs.group_id = g.id
		LEFT JOIN group_memberships gm ON g.id = gm.group_id
		WHERE pgs.page_id = ${pageId}
		GROUP BY pgs.id, pgs.page_id, pgs.group_id, pgs.permission,
						 pgs.shared_by, pgs.shared_at, pgs.created_at, g.name
		ORDER BY pgs.created_at DESC
	`;

	const groups: PageGroupShareWithDetails[] = groupRows.map((row) => ({
		...rowToPageGroupShare(row),
		groupName: row.group_name,
		groupMemberCount: parseInt(row.member_count, 10)
	}));

	return { users, groups };
}

// ============================================================================
// Utility: Remove All Specific Shares
// ============================================================================

/**
 * Remove all user and group shares for a page
 * Used when changing visibility from private → area/space
 * (specific shares become irrelevant)
 */
async function removeAllSpecificShares(pageId: string): Promise<number> {
	const userResult = await sql`
		DELETE FROM page_user_shares WHERE page_id = ${pageId}
	`;

	const groupResult = await sql`
		DELETE FROM page_group_shares WHERE page_id = ${pageId}
	`;

	return userResult.count + groupResult.count;
}

// ============================================================================
// Repository Export
// ============================================================================

export const postgresPageSharingRepository: PageSharingRepository = {
	canAccessPage,
	sharePageWithUser,
	getUserShare,
	removeUserShare,
	updateUserPermission,
	sharePageWithGroup,
	getGroupShare,
	removeGroupShare,
	updateGroupPermission,
	getPageShares,
	removeAllSpecificShares
};
