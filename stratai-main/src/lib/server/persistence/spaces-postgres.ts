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
	UpdateSpaceInput,
	SpaceType
} from '$lib/types/spaces';
import type { SpaceRole } from '$lib/types/space-memberships';
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
 * NOTE: This checks OWNERSHIP only. Use resolveSpaceIdAccessible for membership check.
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

/**
 * Resolve a space identifier checking both ownership AND membership.
 * Use this when the user might not own the space but has access via membership.
 *
 * @param identifier - Either a space slug (e.g., 'work') or a proper ID (e.g., 'sp_...')
 * @param userId - The user ID to scope the lookup
 * @returns The proper space ID, or null if not found/no access
 */
export async function resolveSpaceIdAccessible(identifier: string, userId: string): Promise<string | null> {
	// If it looks like a proper ID, verify user has access
	if (identifier.startsWith('sp_')) {
		const space = await postgresSpaceRepository.findByIdAccessible(identifier, userId);
		return space?.id ?? null;
	}

	// Otherwise, treat as a slug - for slugs, always prefer the user's OWN space first
	// This prevents slug collision issues when a user has access to multiple spaces with same slug
	const ownedSpace = await postgresSpaceRepository.findBySlug(identifier, userId);
	if (ownedSpace) {
		return ownedSpace.id;
	}

	// Fall back to accessible space (shared via membership)
	const accessibleSpace = await postgresSpaceRepository.findBySlugAccessible(identifier, userId);
	return accessibleSpace?.id ?? null;
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
			WHERE user_id = ${userId}::uuid
			  AND deleted_at IS NULL
			ORDER BY type ASC, order_index ASC, created_at ASC
		`;
		return rows.map(rowToSpace);
	},

	/**
	 * Find a space by slug (ownership check only)
	 */
	async findBySlug(slug: string, userId: string): Promise<Space | null> {
		// Ensure system spaces exist before lookup
		if (isSystemSpace(slug)) {
			await this.ensureSystemSpaces(userId);
		}

		const rows = await sql<SpaceRow[]>`
			SELECT * FROM spaces
			WHERE slug = ${slug}
			  AND user_id = ${userId}::uuid
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToSpace(rows[0]) : null;
	},

	/**
	 * Find a space by ID (ownership check only)
	 */
	async findById(id: string, userId: string): Promise<Space | null> {
		const rows = await sql<SpaceRow[]>`
			SELECT * FROM spaces
			WHERE id = ${id}
			  AND user_id = ${userId}::uuid
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

		// Check if user has room to pin this new space (max 6)
		const pinnedCount = await this.getPinnedCount(userId);
		const shouldAutoPin = pinnedCount < 6;

		const id = generateSpaceId();
		const now = new Date();

		await sql`
			INSERT INTO spaces (
				id, user_id, name, type, slug,
				context, context_document_ids, color, icon, order_index,
				is_pinned, created_at, updated_at
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
				${shouldAutoPin},
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
	 * Cascades to related data: areas, tasks, conversations, space_memberships
	 */
	async delete(id: string, userId: string): Promise<{
		areasDeleted: number;
		tasksDeleted: number;
		conversationsDeleted: number;
	} | null> {
		const existing = await this.findById(id, userId);
		if (!existing) return null;

		if (existing.type === 'system') {
			throw new Error('Cannot delete system spaces');
		}

		// Use transaction to ensure atomicity
		const counts = await sql.begin(async (tx) => {
			// 1. Get all area IDs for this space
			const areaRows = await tx<{ id: string }[]>`
				SELECT id FROM areas
				WHERE space_id = ${id}
				  AND deleted_at IS NULL
			`;
			const areaIds = areaRows.map((row) => row.id);

			// 2. Soft delete conversations in these areas
			let conversationsResult;
			if (areaIds.length > 0) {
				conversationsResult = await tx`
					UPDATE conversations
					SET deleted_at = NOW()
					WHERE area_id = ANY(${areaIds})
					  AND deleted_at IS NULL
				`;
			} else {
				conversationsResult = { count: 0 };
			}

			// 3. Soft delete tasks in these areas
			let tasksResult;
			if (areaIds.length > 0) {
				tasksResult = await tx`
					UPDATE tasks
					SET deleted_at = NOW()
					WHERE area_id = ANY(${areaIds})
					  AND deleted_at IS NULL
				`;
			} else {
				tasksResult = { count: 0 };
			}

			// 4. Soft delete all areas in this space
			const areasResult = await tx`
				UPDATE areas
				SET deleted_at = NOW()
				WHERE space_id = ${id}
				  AND deleted_at IS NULL
			`;

			// 5. Hard delete space_memberships for this space
			await tx`
				DELETE FROM space_memberships
				WHERE space_id = ${id}
			`;

			// 6. Soft delete the space itself
			await tx`
				UPDATE spaces
				SET deleted_at = NOW()
				WHERE id = ${id}
				  AND user_id = ${userId}
				  AND type = 'custom'
				  AND deleted_at IS NULL
			`;

			return {
				areasDeleted: areasResult.count,
				tasksDeleted: tasksResult.count,
				conversationsDeleted: conversationsResult.count
			};
		});

		return counts;
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

		// Also ensure existing system spaces have General areas (handles legacy spaces)
		if (existing.length > 0) {
			const existingSpaces = await sql<{ id: string }[]>`
				SELECT id FROM spaces
				WHERE user_id = ${userId}
				  AND type = 'system'
				  AND deleted_at IS NULL
			`;
			for (const space of existingSpaces) {
				try {
					// createGeneral is idempotent - returns existing if found
					await postgresAreaRepository.createGeneral(space.id, userId);
				} catch (e) {
					console.error('Failed to ensure General area for space:', space.id, e);
				}
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
	},

	/**
	 * Find all spaces accessible to user (owned + membership)
	 * Used for space discovery / navigation
	 */
	async findAllAccessible(userId: string): Promise<(Space & { userRole: SpaceRole })[]> {
		// Ensure system spaces exist
		await this.ensureSystemSpaces(userId);

		const rows = await sql<(SpaceRow & { userRole: SpaceRole })[]>`
			WITH accessible_spaces AS (
				-- Spaces user owns (isPinned from spaces table)
				SELECT DISTINCT s.id, 'owner'::text as access_role, s.is_pinned as is_pinned
				FROM spaces s
				WHERE s.user_id = ${userId}
					AND s.deleted_at IS NULL

				UNION

				-- Spaces with direct user membership (isPinned from space_memberships)
				-- Exclude self-memberships where user is also the owner (their isPinned is in spaces table)
				SELECT DISTINCT s.id, sm.role as access_role, sm.is_pinned as is_pinned
				FROM spaces s
				JOIN space_memberships sm ON s.id = sm.space_id
				WHERE sm.user_id = ${userId}::uuid
					AND s.user_id != ${userId}::uuid  -- Exclude owned spaces (prevent isPinned conflict)
					AND s.deleted_at IS NULL

				UNION

				-- Spaces with group membership (isPinned from space_memberships)
				SELECT DISTINCT s.id, sm.role as access_role, sm.is_pinned as is_pinned
				FROM spaces s
				JOIN space_memberships sm ON s.id = sm.space_id
				JOIN group_memberships gm ON sm.group_id = gm.group_id
				WHERE gm.user_id = ${userId}::uuid
					AND s.user_id != ${userId}::uuid  -- Exclude owned spaces (prevent isPinned conflict)
					AND s.deleted_at IS NULL
			),
			best_access AS (
				-- Get the best role and corresponding isPinned for each space
				SELECT DISTINCT ON (id)
					id,
					access_role,
					is_pinned
				FROM accessible_spaces
				ORDER BY id,
					CASE access_role
						WHEN 'owner' THEN 1
						WHEN 'admin' THEN 2
						WHEN 'member' THEN 3
						WHEN 'guest' THEN 4
					END
			)
			SELECT
				   -- Explicitly list columns to avoid duplicate is_pinned conflict
				   -- (s.* would include is_pinned, overriding our COALESCE)
				   s.id, s.user_id, s.name, s.type, s.slug,
				   s.context, s.context_document_ids, s.color, s.icon,
				   s.order_index, s.created_at, s.updated_at, s.deleted_at,
				   s.space_type, s.organization_id,
				   ba.access_role as user_role,
				   -- isPinned: for owned spaces use spaces.is_pinned, for invited use membership.is_pinned
				   COALESCE(ba.is_pinned, s.is_pinned, false) as is_pinned,
				   -- Owner info for invited spaces (only when not the owner)
				   CASE WHEN s.user_id != ${userId}::uuid THEN owner_user.first_name END as owner_first_name,
				   CASE WHEN s.user_id != ${userId}::uuid THEN owner_user.display_name END as owner_display_name
			FROM spaces s
			JOIN best_access ba ON s.id = ba.id
			LEFT JOIN users owner_user ON s.user_id = owner_user.id
			ORDER BY
				s.space_type ASC,    -- org first, then project, then personal
				s.type ASC,          -- system spaces first
				s.order_index ASC,
				s.created_at ASC
		`;

		return rows.map((row) => ({
			...rowToSpace(row),
			userRole: row.userRole as SpaceRole
		}));
	},

	/**
	 * Find space by ID with membership access check
	 * Returns space if user owns it OR has membership
	 */
	async findByIdAccessible(
		id: string,
		userId: string
	): Promise<(Space & { userRole: SpaceRole }) | null> {
		const rows = await sql<(SpaceRow & { userRole: SpaceRole })[]>`
			WITH access_check AS (
				-- Owner check
				SELECT 'owner'::text as role, 1 as priority
				FROM spaces
				WHERE id = ${id}
					AND user_id = ${userId}::uuid
					AND deleted_at IS NULL

				UNION ALL

				-- Direct membership
				SELECT sm.role, 2 as priority
				FROM spaces s
				JOIN space_memberships sm ON s.id = sm.space_id
				WHERE s.id = ${id}
					AND sm.user_id = ${userId}::uuid
					AND s.deleted_at IS NULL

				UNION ALL

				-- Group membership
				SELECT sm.role, 3 as priority
				FROM spaces s
				JOIN space_memberships sm ON s.id = sm.space_id
				JOIN group_memberships gm ON sm.group_id = gm.group_id
				WHERE s.id = ${id}
					AND gm.user_id = ${userId}::uuid
					AND s.deleted_at IS NULL
			)
			SELECT s.*,
				   (SELECT role FROM access_check ORDER BY priority LIMIT 1) as user_role,
				   -- Owner info for invited spaces (only when not the owner)
				   CASE WHEN s.user_id != ${userId}::uuid THEN owner_user.first_name END as owner_first_name,
				   CASE WHEN s.user_id != ${userId}::uuid THEN owner_user.display_name END as owner_display_name
			FROM spaces s
			LEFT JOIN users owner_user ON s.user_id = owner_user.id
			WHERE s.id = ${id}
				AND s.deleted_at IS NULL
				AND EXISTS (SELECT 1 FROM access_check)
		`;

		if (rows.length === 0) return null;

		return {
			...rowToSpace(rows[0]),
			userRole: rows[0].userRole as SpaceRole
		};
	},

	/**
	 * Find space by slug with membership access check
	 * Returns space if user owns it OR has membership
	 */
	async findBySlugAccessible(
		slug: string,
		userId: string
	): Promise<(Space & { userRole: SpaceRole }) | null> {
		// Ensure system spaces exist before lookup
		if (isSystemSpace(slug)) {
			await this.ensureSystemSpaces(userId);
		}

		const rows = await sql<(SpaceRow & { userRole: SpaceRole })[]>`
			WITH access_check AS (
				-- Owner check
				SELECT 'owner'::text as role, 1 as priority
				FROM spaces
				WHERE slug = ${slug}
					AND user_id = ${userId}::uuid
					AND deleted_at IS NULL

				UNION ALL

				-- Direct membership
				SELECT sm.role, 2 as priority
				FROM spaces s
				JOIN space_memberships sm ON s.id = sm.space_id
				WHERE s.slug = ${slug}
					AND sm.user_id = ${userId}::uuid
					AND s.deleted_at IS NULL

				UNION ALL

				-- Group membership
				SELECT sm.role, 3 as priority
				FROM spaces s
				JOIN space_memberships sm ON s.id = sm.space_id
				JOIN group_memberships gm ON sm.group_id = gm.group_id
				WHERE s.slug = ${slug}
					AND gm.user_id = ${userId}::uuid
					AND s.deleted_at IS NULL
			)
			SELECT s.*,
				   (SELECT role FROM access_check ORDER BY priority LIMIT 1) as user_role,
				   -- Owner info for invited spaces (only when not the owner)
				   CASE WHEN s.user_id != ${userId}::uuid THEN owner_user.first_name END as owner_first_name,
				   CASE WHEN s.user_id != ${userId}::uuid THEN owner_user.display_name END as owner_display_name
			FROM spaces s
			LEFT JOIN users owner_user ON s.user_id = owner_user.id
			WHERE s.slug = ${slug}
				AND s.deleted_at IS NULL
				AND EXISTS (SELECT 1 FROM access_check)
		`;

		if (rows.length === 0) return null;

		return {
			...rowToSpace(rows[0]),
			userRole: rows[0].userRole as SpaceRole
		};
	},

	/**
	 * Get count of pinned spaces for a user (owned + invited)
	 * Used to enforce max 6 pinned spaces limit
	 */
	async getPinnedCount(userId: string): Promise<number> {
		const result = await sql<{ count: string }[]>`
			SELECT COUNT(*) as count FROM (
				-- Pinned owned spaces
				SELECT id FROM spaces
				WHERE user_id = ${userId}::uuid
					AND is_pinned = true
					AND deleted_at IS NULL

				UNION

				-- Pinned invited spaces (via direct membership)
				SELECT sm.space_id as id
				FROM space_memberships sm
				JOIN spaces s ON sm.space_id = s.id
				WHERE sm.user_id = ${userId}::uuid
					AND sm.is_pinned = true
					AND s.deleted_at IS NULL
			) as pinned
		`;
		return parseInt(result[0]?.count ?? '0', 10);
	},

	/**
	 * Pin a space to the user's navigation bar
	 * For owned spaces: updates spaces.is_pinned
	 * For invited spaces: updates space_memberships.is_pinned
	 * Returns the updated space or null if not found/no access
	 */
	async pinSpace(
		spaceId: string,
		userId: string
	): Promise<(Space & { userRole: SpaceRole }) | null> {
		// First, check if user owns the space
		const ownedSpace = await this.findById(spaceId, userId);
		if (ownedSpace) {
			// User owns the space - update spaces.is_pinned
			await sql`
				UPDATE spaces
				SET is_pinned = true, updated_at = NOW()
				WHERE id = ${spaceId}
					AND user_id = ${userId}::uuid
					AND deleted_at IS NULL
			`;
			return this.findByIdAccessible(spaceId, userId);
		}

		// Check if user has membership (invited space)
		const membership = await sql<{ id: string }[]>`
			SELECT sm.id FROM space_memberships sm
			JOIN spaces s ON sm.space_id = s.id
			WHERE sm.space_id = ${spaceId}
				AND sm.user_id = ${userId}::uuid
				AND s.deleted_at IS NULL
		`;

		if (membership.length === 0) {
			// User has no access to this space
			return null;
		}

		// User has membership - update space_memberships.is_pinned
		await sql`
			UPDATE space_memberships
			SET is_pinned = true, updated_at = NOW()
			WHERE space_id = ${spaceId}
				AND user_id = ${userId}::uuid
		`;

		return this.findByIdAccessible(spaceId, userId);
	},

	/**
	 * Unpin a space from the user's navigation bar
	 * For owned spaces: updates spaces.is_pinned
	 * For invited spaces: updates space_memberships.is_pinned
	 * Returns the updated space or null if not found/no access
	 */
	async unpinSpace(
		spaceId: string,
		userId: string
	): Promise<(Space & { userRole: SpaceRole }) | null> {
		// First, check if user owns the space
		const ownedSpace = await this.findById(spaceId, userId);
		if (ownedSpace) {
			// User owns the space - update spaces.is_pinned
			await sql`
				UPDATE spaces
				SET is_pinned = false, updated_at = NOW()
				WHERE id = ${spaceId}
					AND user_id = ${userId}::uuid
					AND deleted_at IS NULL
			`;
			return this.findByIdAccessible(spaceId, userId);
		}

		// Check if user has membership (invited space)
		const membership = await sql<{ id: string }[]>`
			SELECT sm.id FROM space_memberships sm
			JOIN spaces s ON sm.space_id = s.id
			WHERE sm.space_id = ${spaceId}
				AND sm.user_id = ${userId}::uuid
				AND s.deleted_at IS NULL
		`;

		if (membership.length === 0) {
			// User has no access to this space
			return null;
		}

		// User has membership - update space_memberships.is_pinned
		await sql`
			UPDATE space_memberships
			SET is_pinned = false, updated_at = NOW()
			WHERE space_id = ${spaceId}
				AND user_id = ${userId}::uuid
		`;

		return this.findByIdAccessible(spaceId, userId);
	}
};
