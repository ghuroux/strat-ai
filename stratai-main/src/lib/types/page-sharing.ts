/**
 * Page sharing types for granular collaboration
 * Mirrors area-memberships pattern with 3-tier permissions
 * Created: 2026-01-13
 */

// ============================================================================
// Core permission model
// ============================================================================

/** Three-tier permission system for page access */
export type PagePermission = 'viewer' | 'editor' | 'admin';

/** Three-level visibility options */
export type PageVisibility = 'private' | 'area' | 'space';

/** How user gained access to page */
export type PageAccessSource = 'owner' | 'user_share' | 'group_share' | 'area' | 'space';

// ============================================================================
// User share entities
// ============================================================================

/** User share entity (application model) */
export interface PageUserShare {
	id: string;
	pageId: string;
	userId: string;
	permission: PagePermission;
	sharedBy: string;
	sharedAt: Date;
	createdAt: Date;
}

/** Database row representation (for postgres.js) */
export interface PageUserShareRow {
	id: string;
	page_id: string;
	user_id: string;
	permission: PagePermission;
	shared_by: string;
	shared_at: Date;
	created_at: Date;
}

/** User share with user details (for UI display) */
export interface PageUserShareWithDetails extends PageUserShare {
	userName: string | null;
	userEmail: string | null;
}

// ============================================================================
// Group share entities
// ============================================================================

/** Group share entity (application model) */
export interface PageGroupShare {
	id: string;
	pageId: string;
	groupId: string; // UUID stored as string
	permission: PagePermission;
	sharedBy: string;
	sharedAt: Date;
	createdAt: Date;
}

/** Database row representation */
export interface PageGroupShareRow {
	id: string;
	page_id: string;
	group_id: string; // UUID in DB but string in TS
	permission: PagePermission;
	shared_by: string;
	shared_at: Date;
	created_at: Date;
}

/** Group share with group details (for UI display) */
export interface PageGroupShareWithDetails extends PageGroupShare {
	groupName: string;
	groupMemberCount: number;
}

// ============================================================================
// Access control result
// ============================================================================

/** Result of access control check */
export interface PageAccessResult {
	hasAccess: boolean;
	permission: PagePermission | null;
	source: PageAccessSource;
}

// ============================================================================
// API request/response types
// ============================================================================

/** Request to share page with user */
export interface SharePageWithUserInput {
	userId: string;
	permission: PagePermission;
}

/** Request to share page with group */
export interface SharePageWithGroupInput {
	groupId: string;
	permission: PagePermission;
}

/** Request to update permission */
export interface UpdatePageSharePermissionInput {
	permission: PagePermission;
}

/** Response from GET /api/pages/[id]/share */
export interface GetPageSharesResponse {
	users: PageUserShareWithDetails[];
	groups: PageGroupShareWithDetails[];
	currentUserPermission: PagePermission | null;
	currentUserSource: PageAccessSource;
}

// ============================================================================
// UI metadata constants
// ============================================================================

/** Human-readable labels for permissions */
export const PAGE_PERMISSION_LABELS: Record<PagePermission, string> = {
	viewer: 'Viewer',
	editor: 'Editor',
	admin: 'Admin'
};

/** Descriptions of what each permission allows */
export const PAGE_PERMISSION_DESCRIPTIONS: Record<PagePermission, string> = {
	viewer: 'Can view page content',
	editor: 'Can view and edit page content',
	admin: 'Can view, edit, and manage sharing'
};

/** Icon names for each permission (from lucide-svelte) */
export const PAGE_PERMISSION_ICONS: Record<PagePermission, string> = {
	viewer: 'Eye',
	editor: 'Edit',
	admin: 'Shield'
};

/** Color codes for each permission */
export const PAGE_PERMISSION_COLORS: Record<PagePermission, string> = {
	viewer: '#6b7280', // Gray
	editor: '#10b981', // Green
	admin: '#3b82f6' // Blue
};

// ============================================================================
// Converter functions (for repository layer)
// ============================================================================

/** Convert database row to PageUserShare entity */
export function rowToPageUserShare(row: PageUserShareRow): PageUserShare {
	return {
		id: row.id,
		pageId: row.page_id,
		userId: row.user_id,
		permission: row.permission,
		sharedBy: row.shared_by,
		sharedAt: new Date(row.shared_at),
		createdAt: new Date(row.created_at)
	};
}

/** Convert database row to PageGroupShare entity */
export function rowToPageGroupShare(row: PageGroupShareRow): PageGroupShare {
	return {
		id: row.id,
		pageId: row.page_id,
		groupId: row.group_id,
		permission: row.permission,
		sharedBy: row.shared_by,
		sharedAt: new Date(row.shared_at),
		createdAt: new Date(row.created_at)
	};
}
