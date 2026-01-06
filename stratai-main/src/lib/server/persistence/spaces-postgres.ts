/**
 * PostgreSQL Spaces Repository
 *
 * Handles CRUD operations for spaces (both system and custom).
 * Automatically seeds system spaces for new users on first access.
 */

import { sql } from './db';
import type {
	Space,
	SpaceRow,
	CreateSpaceInput,
	UpdateSpaceInput
} from '$lib/types/spaces';
import {
	rowToSpace,
	generateSlug,
	isSystemSpace,
	SYSTEM_SPACES,
	SYSTEM_SPACE_SLUGS,
	MAX_CUSTOM_SPACES
} from '$lib/types/spaces';
import type { SpaceRepository } from './types';
import { postgresAreaRepository } from './areas-postgres';

/**
 * Generate a unique space ID
 */
function generateSpaceId(): string {
	return `sp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Resolve a space identifier (slug or ID) to the proper space ID.
 * This handles the legacy case where slugs were used as IDs.
 *
 * @param identifier - Either a space slug (e.g., 'work') or a proper ID (e.g., 'sp_...')
 * @param userId - The user ID to scope the lookup
 * @returns The proper space ID, or null if not found
 */
export async function resolveSpaceId(identifier: string, userId: string): Promise<string | null> {
	// If it looks like a proper ID, verify it exists and return it
	if (identifier.startsWith('sp_')) {
		const space = await postgresSpaceRepository.findById(identifier, userId);
		return space?.id ?? null;
	}

	// Otherwise, treat as a slug and look up the proper ID
	const space = await postgresSpaceRepository.findBySlug(identifier, userId);
	return space?.id ?? null;
}

export const postgresSpaceRepository: SpaceRepository = {
	/**
	 * Find all spaces for a user (system + custom)
	 * Automatically seeds system spaces if they don't exist
	 */
	async findAll(userId: string): Promise<Space[]> {
		// Ensure system spaces exist
		await this.ensureSystemSpaces(userId);

		const rows = await sql<SpaceRow[]>`
			SELECT * FROM spaces
			WHERE user_id = ${userId}
			  AND deleted_at IS NULL
			ORDER BY type ASC, order_index ASC, created_at ASC
		`;
		return rows.map(rowToSpace);
	},

	/**
	 * Find a space by slug
	 */
	async findBySlug(slug: string, userId: string): Promise<Space | null> {
		// Ensure system spaces exist before lookup
		if (isSystemSpace(slug)) {
			await this.ensureSystemSpaces(userId);
		}

		const rows = await sql<SpaceRow[]>`
			SELECT * FROM spaces
			WHERE slug = ${slug}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToSpace(rows[0]) : null;
	},

	/**
	 * Find a space by ID
	 */
	async findById(id: string, userId: string): Promise<Space | null> {
		const rows = await sql<SpaceRow[]>`
			SELECT * FROM spaces
			WHERE id = ${id}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToSpace(rows[0]) : null;
	},

	/**
	 * Create a new custom space
	 */
	async create(input: CreateSpaceInput, userId: string): Promise<Space> {
		// Check custom space limit
		const customCount = await this.getCustomSpaceCount(userId);
		if (customCount >= MAX_CUSTOM_SPACES) {
			throw new Error(`Maximum of ${MAX_CUSTOM_SPACES} custom spaces allowed`);
		}

		// Generate and validate slug
		const slug = generateSlug(input.name);
		if (!slug) {
			throw new Error('Invalid space name');
		}

		// Check for reserved (system) slugs
		if (isSystemSpace(slug)) {
			throw new Error(`Cannot use reserved name: ${input.name}`);
		}

		// Check for duplicate slug
		const existing = await this.findBySlug(slug, userId);
		if (existing) {
			throw new Error(`Space "${input.name}" already exists`);
		}

		// Get next order index (after system spaces)
		// Note: postgres.js transforms column names to camelCase, so we use maxOrder not max_order
		const orderResult = await sql<{ maxOrder: number | null }[]>`
			SELECT MAX(order_index) as max_order
			FROM spaces
			WHERE user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		const nextOrder = (orderResult[0]?.maxOrder ?? 3) + 1;

		const id = generateSpaceId();
		const now = new Date();

		await sql`
			INSERT INTO spaces (
				id, user_id, name, type, slug,
				context, context_document_ids, color, icon, order_index,
				created_at, updated_at
			) VALUES (
				${id},
				${userId},
				${input.name},
				'custom',
				${slug},
				${input.context ?? null},
				${input.contextDocumentIds ?? []},
				${input.color ?? null},
				${input.icon ?? null},
				${nextOrder},
				${now},
				${now}
			)
		`;

		const space = await this.findById(id, userId);
		if (!space) throw new Error('Failed to create space');

		// Auto-create General area for the new space
		try {
			await postgresAreaRepository.createGeneral(space.id, userId);
		} catch (e) {
			console.error('Failed to create General area for space:', e);
			// Don't fail space creation, the migration will catch this
		}

		return space;
	},

	/**
	 * Update a space (custom only, system spaces have limited updates)
	 */
	async update(id: string, updates: UpdateSpaceInput, userId: string): Promise<Space | null> {
		const existing = await this.findById(id, userId);
		if (!existing) return null;

		// System spaces: only allow context updates
		if (existing.type === 'system') {
			if (updates.name || updates.color || updates.icon) {
				throw new Error('Cannot modify system space properties');
			}
			// Only context and context_document_ids are allowed for system spaces
			await sql`
				UPDATE spaces
				SET
					context = ${updates.context === undefined ? sql`context` : updates.context ?? null},
					context_document_ids = ${updates.contextDocumentIds === undefined ? sql`context_document_ids` : updates.contextDocumentIds ?? []},
					updated_at = NOW()
				WHERE id = ${id}
				  AND user_id = ${userId}
				  AND deleted_at IS NULL
			`;
		} else {
			// Custom spaces: allow all updates
			// If name is changing, generate new slug and check for duplicates
			let newSlug = existing.slug;
			if (updates.name && updates.name !== existing.name) {
				newSlug = generateSlug(updates.name);
				if (isSystemSpace(newSlug)) {
					throw new Error(`Cannot use reserved name: ${updates.name}`);
				}
				const duplicate = await this.findBySlug(newSlug, userId);
				if (duplicate && duplicate.id !== id) {
					throw new Error(`Space "${updates.name}" already exists`);
				}
			}

			await sql`
				UPDATE spaces
				SET
					name = COALESCE(${updates.name ?? null}, name),
					slug = ${updates.name ? newSlug : sql`slug`},
					context = ${updates.context === undefined ? sql`context` : updates.context ?? null},
					context_document_ids = ${updates.contextDocumentIds === undefined ? sql`context_document_ids` : updates.contextDocumentIds ?? []},
					color = ${updates.color === undefined ? sql`color` : updates.color ?? null},
					icon = ${updates.icon === undefined ? sql`icon` : updates.icon ?? null},
					order_index = COALESCE(${updates.orderIndex ?? null}, order_index),
					updated_at = NOW()
				WHERE id = ${id}
				  AND user_id = ${userId}
				  AND deleted_at IS NULL
			`;
		}

		return this.findById(id, userId);
	},

	/**
	 * Soft delete a custom space (system spaces cannot be deleted)
	 */
	async delete(id: string, userId: string): Promise<boolean> {
		const existing = await this.findById(id, userId);
		if (!existing) return false;

		if (existing.type === 'system') {
			throw new Error('Cannot delete system spaces');
		}

		const result = await sql`
			UPDATE spaces
			SET deleted_at = NOW()
			WHERE id = ${id}
			  AND user_id = ${userId}
			  AND type = 'custom'
			  AND deleted_at IS NULL
			RETURNING id
		`;
		return result.length > 0;
	},

	/**
	 * Ensure system spaces exist for a user
	 * Called automatically on findAll and findBySlug for system spaces
	 */
	async ensureSystemSpaces(userId: string): Promise<void> {
		// Check if system spaces already exist
		const existing = await sql<{ slug: string }[]>`
			SELECT slug FROM spaces
			WHERE user_id = ${userId}
			  AND type = 'system'
			  AND deleted_at IS NULL
		`;
		const existingSlugs = new Set(existing.map((r) => r.slug));

		// Create missing system spaces
		const now = new Date();
		const newSpaceIds: string[] = [];

		for (let i = 0; i < SYSTEM_SPACE_SLUGS.length; i++) {
			const slug = SYSTEM_SPACE_SLUGS[i];
			if (existingSlugs.has(slug)) continue;

			const def = SYSTEM_SPACES[slug];
			const id = generateSpaceId();
			newSpaceIds.push(id);

			await sql`
				INSERT INTO spaces (
					id, user_id, name, type, slug,
					color, icon, order_index,
					created_at, updated_at
				) VALUES (
					${id},
					${userId},
					${def.name},
					'system',
					${slug},
					${def.color},
					${def.icon},
					${i},
					${now},
					${now}
				)
				ON CONFLICT DO NOTHING
			`;
		}

		// Auto-create General areas for newly created system spaces
		for (const spaceId of newSpaceIds) {
			try {
				await postgresAreaRepository.createGeneral(spaceId, userId);
			} catch (e) {
				console.error('Failed to create General area for system space:', spaceId, e);
			}
		}
	},

	/**
	 * Reorder spaces
	 */
	async reorder(orderedIds: string[], userId: string): Promise<void> {
		for (let i = 0; i < orderedIds.length; i++) {
			await sql`
				UPDATE spaces
				SET order_index = ${i}, updated_at = NOW()
				WHERE id = ${orderedIds[i]}
				  AND user_id = ${userId}
				  AND deleted_at IS NULL
			`;
		}
	},

	/**
	 * Get count of custom spaces for a user
	 */
	async getCustomSpaceCount(userId: string): Promise<number> {
		const result = await sql<{ count: string }[]>`
			SELECT COUNT(*) as count
			FROM spaces
			WHERE user_id = ${userId}
			  AND type = 'custom'
			  AND deleted_at IS NULL
		`;
		return parseInt(result[0]?.count ?? '0', 10);
	}
};
