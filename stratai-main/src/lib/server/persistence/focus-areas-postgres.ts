/**
 * PostgreSQL Focus Areas Repository
 *
 * Handles CRUD operations for focus areas within spaces.
 * Part of the Spaces & Focus Areas feature.
 */

import { sql } from './db';
import type {
	FocusArea,
	FocusAreaRow,
	CreateFocusAreaInput,
	UpdateFocusAreaInput
} from '$lib/types/focus-areas';
import { rowToFocusArea, isValidSpaceId } from '$lib/types/focus-areas';
import type { FocusAreaRepository } from './types';

/**
 * Generate a unique focus area ID
 */
function generateFocusAreaId(): string {
	return `fa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const postgresFocusAreaRepository: FocusAreaRepository = {
	/**
	 * Find all focus areas for a user, optionally filtered by space
	 */
	async findAll(userId: string, spaceId?: string): Promise<FocusArea[]> {
		const rows = spaceId
			? await sql<FocusAreaRow[]>`
				SELECT * FROM focus_areas
				WHERE user_id = ${userId}
				  AND space_id = ${spaceId}
				  AND deleted_at IS NULL
				ORDER BY order_index ASC, created_at ASC
			`
			: await sql<FocusAreaRow[]>`
				SELECT * FROM focus_areas
				WHERE user_id = ${userId}
				  AND deleted_at IS NULL
				ORDER BY space_id ASC, order_index ASC, created_at ASC
			`;
		return rows.map(rowToFocusArea);
	},

	/**
	 * Find a focus area by ID
	 */
	async findById(id: string, userId: string): Promise<FocusArea | null> {
		const rows = await sql<FocusAreaRow[]>`
			SELECT * FROM focus_areas
			WHERE id = ${id}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToFocusArea(rows[0]) : null;
	},

	/**
	 * Find a focus area by name within a space
	 */
	async findByName(spaceId: string, name: string, userId: string): Promise<FocusArea | null> {
		const rows = await sql<FocusAreaRow[]>`
			SELECT * FROM focus_areas
			WHERE space_id = ${spaceId}
			  AND name = ${name}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToFocusArea(rows[0]) : null;
	},

	/**
	 * Create a new focus area
	 */
	async create(input: CreateFocusAreaInput, userId: string): Promise<FocusArea> {
		// Validate space ID
		if (!isValidSpaceId(input.spaceId)) {
			throw new Error(`Invalid space ID: ${input.spaceId}`);
		}

		// Check for duplicate name
		const existing = await this.findByName(input.spaceId, input.name, userId);
		if (existing) {
			throw new Error(`Focus area "${input.name}" already exists in this space`);
		}

		// Get next order index
		// Note: postgres.js transforms column names to camelCase, so we use maxOrder not max_order
		const orderResult = await sql<{ maxOrder: number | null }[]>`
			SELECT MAX(order_index) as max_order
			FROM focus_areas
			WHERE space_id = ${input.spaceId}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		const nextOrder = (orderResult[0]?.maxOrder ?? -1) + 1;

		const id = generateFocusAreaId();
		const now = new Date();

		await sql`
			INSERT INTO focus_areas (
				id, space_id, name, context, context_document_ids,
				color, icon, order_index,
				user_id, created_at, updated_at
			) VALUES (
				${id},
				${input.spaceId},
				${input.name},
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

		const focusArea = await this.findById(id, userId);
		if (!focusArea) throw new Error('Failed to create focus area');
		return focusArea;
	},

	/**
	 * Update a focus area
	 */
	async update(id: string, updates: UpdateFocusAreaInput, userId: string): Promise<FocusArea | null> {
		// Check if focus area exists
		const existing = await this.findById(id, userId);
		if (!existing) return null;

		// If name is being changed, check for duplicates
		if (updates.name && updates.name !== existing.name) {
			const duplicate = await this.findByName(existing.spaceId, updates.name, userId);
			if (duplicate) {
				throw new Error(`Focus area "${updates.name}" already exists in this space`);
			}
		}

		await sql`
			UPDATE focus_areas
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
	 * Soft delete a focus area
	 * Note: Tasks in this focus area will have their focus_area_id set to NULL
	 */
	async delete(id: string, userId: string): Promise<boolean> {
		const result = await sql`
			UPDATE focus_areas
			SET deleted_at = NOW()
			WHERE id = ${id}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
			RETURNING id
		`;
		return result.length > 0;
	},

	/**
	 * Reorder focus areas within a space
	 */
	async reorder(spaceId: string, orderedIds: string[], userId: string): Promise<void> {
		// Update each focus area's order_index based on position in array
		for (let i = 0; i < orderedIds.length; i++) {
			await sql`
				UPDATE focus_areas
				SET order_index = ${i}, updated_at = NOW()
				WHERE id = ${orderedIds[i]}
				  AND space_id = ${spaceId}
				  AND user_id = ${userId}
				  AND deleted_at IS NULL
			`;
		}
	},

	/**
	 * Get count of tasks in a focus area
	 */
	async getTaskCount(id: string, userId: string): Promise<number> {
		const result = await sql<{ count: string }[]>`
			SELECT COUNT(*) as count
			FROM tasks
			WHERE focus_area_id = ${id}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		return parseInt(result[0]?.count ?? '0', 10);
	},

	/**
	 * Get count of conversations in a focus area
	 * Note: Requires focus_area_id on conversations table (Phase C)
	 */
	async getConversationCount(id: string, userId: string): Promise<number> {
		// TODO: Implement when focus_area_id is added to conversations
		// For now, return 0
		return 0;
	}
};
