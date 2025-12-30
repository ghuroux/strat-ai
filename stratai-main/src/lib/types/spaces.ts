/**
 * Spaces Types
 *
 * Types for both system spaces (Work, Research, Random, Personal)
 * and custom user-created spaces.
 */

export type SpaceKind = 'system' | 'custom';
export type SystemSpaceSlug = 'work' | 'research' | 'random' | 'personal';

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
	work: { name: 'Work', color: '#3b82f6', icon: 'briefcase' },
	research: { name: 'Research', color: '#a855f7', icon: 'beaker' },
	random: { name: 'Random', color: '#f97316', icon: 'sparkles' },
	personal: { name: 'Personal', color: '#22c55e', icon: 'user' }
};

export const SYSTEM_SPACE_SLUGS: SystemSpaceSlug[] = ['work', 'research', 'random', 'personal'];

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
		updatedAt: row.updatedAt
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
