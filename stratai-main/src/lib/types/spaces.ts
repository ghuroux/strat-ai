/**
 * Spaces Types
 *
 * Types for the Personal system space and custom user-created spaces.
 * New users get: Personal (system) + Org Space (via membership).
 */

export type SpaceKind = 'system' | 'custom';
export type SystemSpaceSlug = 'personal';

/**
 * Space type for collaboration model:
 * - personal: Single owner, no sharing (traditional personal spaces)
 * - organization: Org-wide space, all org members have access
 * - project: Team project space, explicit invitation required
 */
export type SpaceType = 'personal' | 'organization' | 'project';

export const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
	personal: 'Personal',
	organization: 'Organization',
	project: 'Project'
};

export const SPACE_TYPE_DESCRIPTIONS: Record<SpaceType, string> = {
	personal: 'Private workspace for individual use',
	organization: 'Shared workspace for your organization',
	project: 'Collaborative space for a team or project'
};

/**
 * Space entity
 */
export interface Space {
	id: string;
	userId: string;
	name: string;
	type: SpaceKind;
	slug: string; // URL-safe identifier
	context?: string; // Space-level context for AI (user-provided markdown)
	contextDocumentIds?: string[]; // References to uploaded documents for context
	color?: string; // Accent color (hex)
	icon?: string; // Icon identifier
	orderIndex: number;
	createdAt: Date;
	updatedAt: Date;
	// Space membership fields (added in migration 031)
	spaceType?: SpaceType; // personal, organization, or project
	organizationId?: string; // For org-scoped spaces
	// Owner info for invited spaces (Phase B: name collision fix)
	ownerFirstName?: string | null; // Owner's first name (for display when invited)
	ownerDisplayName?: string | null; // Owner's display name (fallback)
	// Pinning (Phase C: navigation redesign)
	isPinned?: boolean; // Whether this space is pinned to the nav bar
}

/**
 * Database row type
 * Note: postgres.js auto-converts snake_case to camelCase
 */
export interface SpaceRow {
	id: string;
	userId: string;
	name: string;
	type: string;
	slug: string;
	context: string | null;
	contextDocumentIds: string[] | null;
	color: string | null;
	icon: string | null;
	orderIndex: number;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
	// Space membership fields (added in migration 031)
	// Note: postgres.js auto-converts snake_case to camelCase
	spaceType: SpaceType | null;
	organizationId: string | null;
	// Owner info for invited spaces (Phase B: name collision fix)
	// Populated via JOIN when fetching accessible spaces
	ownerFirstName: string | null;
	ownerDisplayName: string | null;
	// Pinning (Phase C: navigation redesign)
	// postgres.js auto-converts is_pinned → isPinned
	isPinned: boolean | null;
}

/**
 * Input for creating a new custom space
 */
export interface CreateSpaceInput {
	name: string;
	context?: string;
	contextDocumentIds?: string[];
	color?: string;
	icon?: string;
}

/**
 * Input for updating a space
 */
export interface UpdateSpaceInput {
	name?: string;
	context?: string;
	contextDocumentIds?: string[];
	color?: string;
	icon?: string;
	orderIndex?: number;
}

/**
 * System space definitions
 */
export interface SystemSpaceDefinition {
	name: string;
	color: string;
	icon: string;
}

export const SYSTEM_SPACES: Record<SystemSpaceSlug, SystemSpaceDefinition> = {
	personal: { name: 'Personal', color: '#22c55e', icon: 'user' }
};

export const SYSTEM_SPACE_SLUGS: SystemSpaceSlug[] = ['personal'];

/**
 * Maximum number of custom spaces per user
 */
export const MAX_CUSTOM_SPACES = 5;

/**
 * Convert database row to Space entity
 * Note: postgres.js auto-converts snake_case to camelCase
 */
export function rowToSpace(row: SpaceRow): Space {
	return {
		id: row.id,
		userId: row.userId,
		name: row.name,
		type: row.type as SpaceKind,
		slug: row.slug,
		context: row.context ?? undefined,
		contextDocumentIds: row.contextDocumentIds ?? undefined,
		color: row.color ?? undefined,
		icon: row.icon ?? undefined,
		orderIndex: row.orderIndex,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		spaceType: row.spaceType ?? undefined,
		organizationId: row.organizationId ?? undefined,
		// Owner info for invited spaces (Phase B: name collision fix)
		ownerFirstName: row.ownerFirstName ?? null,
		ownerDisplayName: row.ownerDisplayName ?? null,
		// Pinning (Phase C: navigation redesign)
		isPinned: row.isPinned ?? undefined
	};
}

/**
 * Generate URL-safe slug from name
 */
export function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Check if a slug is a system space
 */
export function isSystemSpace(slug: string): slug is SystemSpaceSlug {
	return SYSTEM_SPACE_SLUGS.includes(slug as SystemSpaceSlug);
}
