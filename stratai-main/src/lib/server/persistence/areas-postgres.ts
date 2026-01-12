/**
 * PostgreSQL Areas Repository
 *
 * Handles CRUD operations for areas within spaces.
 * Areas are navigable sub-spaces - each space has at least a General area.
 *
 * Renamed from focus-areas-postgres.ts
 */

import { sql } from './db';
import type { Area, AreaRow, CreateAreaInput, UpdateAreaInput } from '$lib/types/areas';
import { rowToArea, isValidSpaceId, generateSlug } from '$lib/types/areas';
import type { AreaRepository } from './types';

/**
 * Generate a unique area ID
 */
function generateAreaId(): string {
	return `area_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const postgresAreaRepository: AreaRepository = {
	/**
	 * Find all areas for a user, optionally filtered by space
	 */
	async findAll(userId: string, spaceId?: string): Promise<Area[]> {
		const rows = spaceId
			? await sql<AreaRow[]>`
				SELECT * FROM areas
				WHERE user_id = ${userId}
				  AND space_id = ${spaceId}
				  AND deleted_at IS NULL
				ORDER BY
				  CASE WHEN is_general THEN 0 ELSE 1 END,
				  order_index ASC,
				  created_at ASC
			`
			: await sql<AreaRow[]>`
				SELECT * FROM areas
				WHERE user_id = ${userId}
				  AND deleted_at IS NULL
				ORDER BY
				  space_id ASC,
				  CASE WHEN is_general THEN 0 ELSE 1 END,
				  order_index ASC,
				  created_at ASC
			`;
		return rows.map(rowToArea);
	},

	/**
	 * Find an area by ID
	 */
	async findById(id: string, userId: string): Promise<Area | null> {
		const rows = await sql<AreaRow[]>`
			SELECT * FROM areas
			WHERE id = ${id}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToArea(rows[0]) : null;
	},

	/**
	 * Find an area by name within a space
	 */
	async findByName(spaceId: string, name: string, userId: string): Promise<Area | null> {
		const rows = await sql<AreaRow[]>`
			SELECT * FROM areas
			WHERE space_id = ${spaceId}
			  AND name = ${name}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToArea(rows[0]) : null;
	},

	/**
	 * Find an area by slug within a space
	 */
	async findBySlug(spaceId: string, slug: string, userId: string): Promise<Area | null> {
		const rows = await sql<AreaRow[]>`
			SELECT * FROM areas
			WHERE space_id = ${spaceId}
			  AND slug = ${slug}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToArea(rows[0]) : null;
	},

	/**
	 * Find the General area for a space
	 */
	async findGeneral(spaceId: string, userId: string): Promise<Area | null> {
		const rows = await sql<AreaRow[]>`
			SELECT * FROM areas
			WHERE space_id = ${spaceId}
			  AND is_general = true
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToArea(rows[0]) : null;
	},

	/**
	 * Create a new area
	 */
	async create(input: CreateAreaInput, userId: string): Promise<Area> {
		// Validate space ID
		if (!isValidSpaceId(input.spaceId)) {
			throw new Error(`Invalid space ID: ${input.spaceId}`);
		}

		// Check for duplicate name
		const existing = await this.findByName(input.spaceId, input.name, userId);
		if (existing) {
			throw new Error(`Area "${input.name}" already exists in this space`);
		}

		// Generate slug and check for duplicates
		let slug = generateSlug(input.name);
		const existingSlug = await this.findBySlug(input.spaceId, slug, userId);
		if (existingSlug) {
			// Append a number to make unique
			slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
		}

		// Get next order index
		// Note: postgres.js transforms column names to camelCase, so we use maxOrder not max_order
		const orderResult = await sql<{ maxOrder: number | null }[]>`
			SELECT MAX(order_index) as max_order
			FROM areas
			WHERE space_id = ${input.spaceId}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		const nextOrder = (orderResult[0]?.maxOrder ?? -1) + 1;

		const id = generateAreaId();
		const now = new Date();

		await sql`
			INSERT INTO areas (
				id, space_id, name, slug, is_general,
				context, context_document_ids,
				color, icon, order_index,
				user_id, created_at, updated_at
			) VALUES (
				${id},
				${input.spaceId},
				${input.name},
				${slug},
				false,
				${input.context ?? null},
				${input.contextDocumentIds ?? null},
				${input.color ?? null},
				${input.icon ?? null},
				${nextOrder},
				${userId},
				${now},
				${now}
			)
		`;

		const area = await this.findById(id, userId);
		if (!area) throw new Error('Failed to create area');
		return area;
	},

	/**
	 * Create the General area for a space
	 * Called automatically when a space is created
	 */
	async createGeneral(spaceId: string, userId: string): Promise<Area> {
		// Check if General already exists
		const existing = await this.findGeneral(spaceId, userId);
		if (existing) {
			return existing;
		}

		// Include userId in ID to avoid conflicts between users
		// Format matches migration 004: space_id-user_id-general
		const id = `${spaceId}-${userId}-general`;
		const now = new Date();

		try {
			await sql`
				INSERT INTO areas (
					id, space_id, name, slug, is_general,
					context, context_document_ids,
					color, icon, order_index,
					user_id, created_at, updated_at
				) VALUES (
					${id},
					${spaceId},
					'General',
					'general',
					true,
					NULL,
					NULL,
					NULL,
					NULL,
					0,
					${userId},
					${now},
					${now}
				)
				ON CONFLICT (space_id, slug, user_id) WHERE deleted_at IS NULL DO NOTHING
			`;
		} catch (e) {
			// If ON CONFLICT inference fails or other error, check if area exists
			console.error('[createGeneral] INSERT failed, checking if area exists:', e);
			const fallback = await this.findGeneral(spaceId, userId);
			if (fallback) return fallback;
			throw e;
		}

		const area = await this.findById(id, userId);
		if (!area) {
			// Conflict means it already exists, fetch it
			const generalArea = await this.findGeneral(spaceId, userId);
			if (!generalArea) throw new Error('Failed to create General area');
			return generalArea;
		}
		return area;
	},

	/**
	 * Update an area
	 */
	async update(id: string, updates: UpdateAreaInput, userId: string): Promise<Area | null> {
		// Check if area exists
		const existing = await this.findById(id, userId);
		if (!existing) return null;

		// General areas have limited update capabilities
		if (existing.isGeneral && updates.name) {
			throw new Error('Cannot rename the General area');
		}

		// If name is being changed, check for duplicates
		if (updates.name && updates.name !== existing.name) {
			const duplicate = await this.findByName(existing.spaceId, updates.name, userId);
			if (duplicate) {
				throw new Error(`Area "${updates.name}" already exists in this space`);
			}
		}

		await sql`
			UPDATE areas
			SET
				name = COALESCE(${updates.name ?? null}, name),
				context = ${updates.context === undefined ? sql`context` : updates.context},
				context_document_ids = ${updates.contextDocumentIds === undefined ? sql`context_document_ids` : updates.contextDocumentIds ?? null},
				color = ${updates.color === undefined ? sql`color` : updates.color},
				icon = ${updates.icon === undefined ? sql`icon` : updates.icon},
				order_index = COALESCE(${updates.orderIndex ?? null}, order_index),
				updated_at = NOW()
			WHERE id = ${id}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;

		return this.findById(id, userId);
	},

	/**
	 * Soft delete an area with options for handling related content
	 * General areas cannot be deleted
	 *
	 * @param id - Area ID to delete
	 * @param userId - User ID
	 * @param options.deleteContent - If true, deletes all conversations and tasks.
	 *                                If false, moves conversations to General and unlinks tasks.
	 */
	async delete(
		id: string,
		userId: string,
		options: { deleteContent?: boolean } = {}
	): Promise<boolean> {
		const { deleteContent = false } = options;

		// Check if it's a General area
		const area = await this.findById(id, userId);
		if (!area) return false;

		if (area.isGeneral) {
			throw new Error('Cannot delete the General area');
		}

		// Find or create the General area for this space (needed for moving conversations)
		let generalArea = await this.findGeneral(area.spaceId, userId);
		if (!generalArea && !deleteContent) {
			// Create General area if it doesn't exist (handles legacy spaces)
			generalArea = await this.createGeneral(area.spaceId, userId);
		}

		if (deleteContent) {
			// Option 1: Delete all related content

			// Delete conversations in this area (soft delete)
			await sql`
				UPDATE conversations
				SET deleted_at = NOW()
				WHERE area_id = ${id}
				  AND user_id = ${userId}
				  AND deleted_at IS NULL
			`;

			// Delete tasks linked to this area (soft delete)
			// This will cascade to subtasks due to parent_task_id relationship
			await sql`
				UPDATE tasks
				SET deleted_at = NOW()
				WHERE area_id = ${id}
				  AND user_id = ${userId}
				  AND deleted_at IS NULL
			`;
		} else {
			// Option 2: Move conversations to General, unlink tasks

			// Move conversations to General area
			if (generalArea) {
				await sql`
					UPDATE conversations
					SET area_id = ${generalArea.id},
					    updated_at = NOW()
					WHERE area_id = ${id}
					  AND user_id = ${userId}
					  AND deleted_at IS NULL
				`;
			}

			// Unlink tasks from this area (set area_id to NULL)
			await sql`
				UPDATE tasks
				SET area_id = NULL,
				    updated_at = NOW()
				WHERE area_id = ${id}
				  AND user_id = ${userId}
				  AND deleted_at IS NULL
			`;
		}

		// Finally, soft delete the area itself
		const result = await sql`
			UPDATE areas
			SET deleted_at = NOW()
			WHERE id = ${id}
			  AND user_id = ${userId}
			  AND is_general = false
			  AND deleted_at IS NULL
			RETURNING id
		`;
		return result.length > 0;
	},

	/**
	 * Reorder areas within a space
	 * Note: General area always stays at index 0
	 */
	async reorder(spaceId: string, orderedIds: string[], userId: string): Promise<void> {
		// Ensure General stays first
		const general = await this.findGeneral(spaceId, userId);
		if (general && orderedIds[0] !== general.id) {
			// Remove general from wherever it is and put it first
			orderedIds = orderedIds.filter((id) => id !== general.id);
			orderedIds.unshift(general.id);
		}

		// Update each area's order_index based on position in array
		for (let i = 0; i < orderedIds.length; i++) {
			await sql`
				UPDATE areas
				SET order_index = ${i}, updated_at = NOW()
				WHERE id = ${orderedIds[i]}
				  AND space_id = ${spaceId}
				  AND user_id = ${userId}
				  AND deleted_at IS NULL
			`;
		}
	},

	/**
	 * Get count of tasks linked to an area
	 */
	async getTaskCount(id: string, userId: string): Promise<number> {
		const result = await sql<{ count: string }[]>`
			SELECT COUNT(*) as count
			FROM tasks
			WHERE linked_area_id = ${id}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		return parseInt(result[0]?.count ?? '0', 10);
	},

	/**
	 * Get count of conversations in an area
	 */
	async getConversationCount(id: string, userId: string): Promise<number> {
		const result = await sql<{ count: string }[]>`
			SELECT COUNT(*) as count
			FROM conversations
			WHERE area_id = ${id}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		return parseInt(result[0]?.count ?? '0', 10);
	}
};
