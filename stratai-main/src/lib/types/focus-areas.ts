/**
 * Focus Areas Types
 *
 * Focus areas are specialized contexts within spaces that inherit
 * the parent space's context while adding their own.
 */

import type { SpaceType } from './chat';

/**
 * Core Focus Area entity
 */
export interface FocusArea {
	id: string;
	spaceId: string; // Which space this belongs to
	name: string;

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
export interface FocusAreaRow {
	id: string;
	spaceId: string;
	name: string;
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
 * Input for creating a focus area
 */
export interface CreateFocusAreaInput {
	spaceId: string;
	name: string;
	context?: string;
	contextDocumentIds?: string[];
	color?: string;
	icon?: string;
}

/**
 * Input for updating a focus area
 */
export interface UpdateFocusAreaInput {
	name?: string;
	context?: string;
	contextDocumentIds?: string[];
	color?: string;
	icon?: string;
	orderIndex?: number;
}

/**
 * Focus area with computed properties for display
 */
export interface FocusAreaWithStats extends FocusArea {
	taskCount?: number;
	conversationCount?: number;
	tokenEstimate?: number;
}

/**
 * Convert database row to FocusArea entity
 * Note: postgres.js auto-converts snake_case to camelCase, so row properties are already camelCase
 */
export function rowToFocusArea(row: FocusAreaRow): FocusArea {
	return {
		id: row.id,
		spaceId: row.spaceId,
		name: row.name,
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
 * System space IDs (for type safety until we migrate to spaces table)
 */
export type SystemSpaceId = 'work' | 'research' | 'random' | 'personal';

export const SYSTEM_SPACES: SystemSpaceId[] = ['work', 'research', 'random', 'personal'];

export function isSystemSpace(id: string): id is SystemSpaceId {
	return SYSTEM_SPACES.includes(id as SystemSpaceId);
}

/**
 * Validate space ID (currently just system spaces)
 */
export function isValidSpaceId(id: string): boolean {
	return isSystemSpace(id);
}
