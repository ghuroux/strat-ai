/**
 * Areas Types
 *
 * Areas are navigable sub-spaces within spaces. Each space has at least
 * a "General" area which cannot be deleted.
 *
 * Renamed from Focus Areas - see DESIGN-SPACES-AND-FOCUS-AREAS.md
 */

/**
 * Core Area entity
 */
export interface Area {
	id: string;
	spaceId: string; // Which space this belongs to
	name: string;
	slug: string; // URL-safe identifier

	// General area flag
	isGeneral: boolean; // True for the default "General" area (undeletable)

	// Access control (area sharing)
	isRestricted?: boolean; // If true, requires explicit membership (default: false = space access grants area access)
	createdBy?: string; // Original creator (has implicit owner access)

	// Context content
	context?: string; // Markdown text context
	contextDocumentIds?: string[]; // Array of document IDs for context

	// Visual customization
	color?: string; // Optional override color (hex)
	icon?: string; // Optional icon identifier

	// Ordering within space
	orderIndex: number;

	// Ownership
	userId: string;

	// Timestamps
	createdAt: Date;
	updatedAt: Date;
	deletedAt?: Date;
}

/**
 * Database row representation
 * Note: postgres.js auto-converts snake_case to camelCase
 */
export interface AreaRow {
	id: string;
	spaceId: string;
	name: string;
	slug: string;
	isGeneral: boolean;
	isRestricted: boolean | null;
	createdBy: string | null;
	context: string | null;
	contextDocumentIds: string[] | null;
	color: string | null;
	icon: string | null;
	orderIndex: number;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
}

/**
 * Input for creating an area
 */
export interface CreateAreaInput {
	spaceId: string;
	name: string;
	context?: string;
	contextDocumentIds?: string[];
	color?: string;
	icon?: string;
}

/**
 * Input for updating an area
 */
export interface UpdateAreaInput {
	name?: string;
	context?: string;
	contextDocumentIds?: string[];
	color?: string;
	icon?: string;
	orderIndex?: number;
	isRestricted?: boolean; // Phase 3: Access control toggle
}

/**
 * Area with computed properties for display
 */
export interface AreaWithStats extends Area {
	taskCount?: number;
	conversationCount?: number;
	tokenEstimate?: number;
}

/**
 * Convert database row to Area entity
 * Note: postgres.js auto-converts snake_case to camelCase, so row properties are already camelCase
 */
export function rowToArea(row: AreaRow): Area {
	return {
		id: row.id,
		spaceId: row.spaceId,
		name: row.name,
		slug: row.slug,
		isGeneral: row.isGeneral ?? false,
		isRestricted: row.isRestricted ?? undefined,
		createdBy: row.createdBy ?? undefined,
		context: row.context ?? undefined,
		contextDocumentIds: row.contextDocumentIds ?? undefined,
		color: row.color ?? undefined,
		icon: row.icon ?? undefined,
		orderIndex: row.orderIndex,
		userId: row.userId,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		deletedAt: row.deletedAt ?? undefined
	};
}

/**
 * Generate URL-safe slug from name
 */
export function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * System space IDs (for type safety)
 */
export type SystemSpaceId = 'work' | 'research' | 'random' | 'personal';

export const SYSTEM_SPACES: SystemSpaceId[] = ['work', 'research', 'random', 'personal'];

export function isSystemSpace(id: string): id is SystemSpaceId {
	return SYSTEM_SPACES.includes(id as SystemSpaceId);
}

/**
 * Validate space ID - accepts system space slugs, UUIDs, or sp_ prefixed IDs
 */
export function isValidSpaceId(id: string): boolean {
	// Accept system space slugs (work, research, random, personal)
	if (isSystemSpace(id)) {
		return true;
	}
	// Accept sp_ prefixed IDs (custom spaces from database)
	if (id.startsWith('sp_')) {
		return true;
	}
	// Accept UUIDs
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(id);
}
