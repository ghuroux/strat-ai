/**
 * PostgreSQL Document Sharing Repository
 *
 * Handles document visibility and area-level sharing operations.
 * Part of the Document Sharing System (Phase 2).
 *
 * Key features:
 * - Share documents with specific Areas (visibility='areas')
 * - Auto-deactivate documents when unshared (removes from contextDocumentIds)
 * - Cascade visibility changes (clearing shares when changing to private/space)
 */

import { sql } from './db';
import type {
	DocumentAreaShare,
	DocumentAreaShareRow,
	DocumentVisibility
} from '$lib/types/documents';
import { rowToDocumentAreaShare } from '$lib/types/documents';
import type { DocumentSharingRepository } from './types';

/**
 * Generate a unique document share ID
 */
function generateShareId(): string {
	return `docshare_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const postgresDocumentSharingRepository: DocumentSharingRepository = {
	/**
	 * Share a document with a specific Area
	 * Idempotent - updates timestamp if already shared
	 */
	async shareDocumentWithArea(
		documentId: string,
		areaId: string,
		userId: string
	): Promise<DocumentAreaShare> {
		const id = generateShareId();
		const now = new Date();

		// Upsert - create or update existing share
		await sql`
			INSERT INTO document_area_shares (id, document_id, area_id, shared_by, shared_at)
			VALUES (${id}, ${documentId}, ${areaId}, ${userId}, ${now})
			ON CONFLICT (document_id, area_id) DO UPDATE
			SET shared_by = ${userId}, shared_at = ${now}
		`;

		const rows = await sql<DocumentAreaShareRow[]>`
			SELECT * FROM document_area_shares
			WHERE document_id = ${documentId} AND area_id = ${areaId}
		`;

		if (rows.length === 0) {
			throw new Error('Failed to create document share');
		}

		return rowToDocumentAreaShare(rows[0]);
	},

	/**
	 * Share a document with multiple Areas at once
	 */
	async shareDocumentWithAreas(
		documentId: string,
		areaIds: string[],
		userId: string
	): Promise<DocumentAreaShare[]> {
		const shares: DocumentAreaShare[] = [];
		for (const areaId of areaIds) {
			const share = await this.shareDocumentWithArea(documentId, areaId, userId);
			shares.push(share);
		}
		return shares;
	},

	/**
	 * Remove document share from an Area
	 * Also removes document from Area's contextDocumentIds (auto-deactivate)
	 */
	async unshareDocumentFromArea(documentId: string, areaId: string): Promise<void> {
		// 1. Remove share entry
		await sql`
			DELETE FROM document_area_shares
			WHERE document_id = ${documentId}
			  AND area_id = ${areaId}
		`;

		// 2. Auto-deactivate: Remove from Area's contextDocumentIds
		await sql`
			UPDATE areas
			SET context_document_ids = array_remove(context_document_ids, ${documentId}),
			    updated_at = NOW()
			WHERE id = ${areaId}
			  AND ${documentId} = ANY(context_document_ids)
		`;
	},

	/**
	 * Get all Area IDs a document is shared with
	 */
	async getDocumentSharedAreas(documentId: string): Promise<string[]> {
		const rows = await sql<{ areaId: string }[]>`
			SELECT area_id FROM document_area_shares
			WHERE document_id = ${documentId}
		`;
		return rows.map((r) => r.areaId);
	},

	/**
	 * Get all document IDs shared with an Area
	 */
	async getDocumentsSharedWithArea(areaId: string): Promise<string[]> {
		const rows = await sql<{ documentId: string }[]>`
			SELECT document_id FROM document_area_shares
			WHERE area_id = ${areaId}
		`;
		return rows.map((r) => r.documentId);
	},

	/**
	 * Find a specific share entry
	 */
	async findShare(documentId: string, areaId: string): Promise<DocumentAreaShare | null> {
		const rows = await sql<DocumentAreaShareRow[]>`
			SELECT * FROM document_area_shares
			WHERE document_id = ${documentId}
			  AND area_id = ${areaId}
		`;
		return rows.length > 0 ? rowToDocumentAreaShare(rows[0]) : null;
	},

	/**
	 * Update document visibility
	 * - 'private': clears area shares AND auto-deactivates from all areas
	 * - 'space': clears area shares but KEEPS existing activations
	 * - 'areas': no change to shares (caller manages sharing separately)
	 */
	async updateDocumentVisibility(
		documentId: string,
		visibility: DocumentVisibility,
		userId: string
	): Promise<void> {
		// Update visibility
		await sql`
			UPDATE documents
			SET visibility = ${visibility}, updated_at = NOW()
			WHERE id = ${documentId}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;

		// If changing to 'private', remove from all areas' contextDocumentIds (auto-deactivate)
		if (visibility === 'private') {
			// Get all areas this document is shared with
			const sharedAreas = await this.getDocumentSharedAreas(documentId);

			// Remove from each area's contextDocumentIds
			for (const areaId of sharedAreas) {
				await sql`
					UPDATE areas
					SET context_document_ids = array_remove(context_document_ids, ${documentId}),
					    updated_at = NOW()
					WHERE id = ${areaId}
					  AND ${documentId} = ANY(context_document_ids)
				`;
			}
		}

		// If changing away from 'areas', clear area share entries (no longer needed)
		if (visibility !== 'areas') {
			await sql`
				DELETE FROM document_area_shares
				WHERE document_id = ${documentId}
			`;
		}
	},

	/**
	 * Check if a user can access a document
	 * Access rules:
	 * - Owner can always access
	 * - 'space' visibility: any Space member can access
	 * - 'areas' visibility: only members of shared Areas can access
	 * - 'private' visibility: only owner can access
	 */
	async canUserAccessDocument(
		userId: string,
		documentId: string,
		areaId?: string
	): Promise<boolean> {
		// Check if user is owner
		const ownerRows = await sql<{ id: string }[]>`
			SELECT id FROM documents
			WHERE id = ${documentId}
			  AND user_id = ${userId}
			  AND deleted_at IS NULL
		`;
		if (ownerRows.length > 0) return true;

		// Get document visibility
		const docRows = await sql<{ visibility: string; spaceId: string | null }[]>`
			SELECT visibility, space_id FROM documents
			WHERE id = ${documentId}
			  AND deleted_at IS NULL
		`;
		if (docRows.length === 0) return false;

		const { visibility, spaceId } = docRows[0];

		if (visibility === 'private') {
			return false; // Already checked owner above
		}

		if (visibility === 'space' && spaceId) {
			// Check if user has any area in this space
			const spaceAccess = await sql<{ id: string }[]>`
				SELECT id FROM areas
				WHERE space_id = ${spaceId}
				  AND user_id = ${userId}
				  AND deleted_at IS NULL
				LIMIT 1
			`;
			return spaceAccess.length > 0;
		}

		if (visibility === 'areas') {
			if (areaId) {
				// Check if document is shared with specific area
				const share = await this.findShare(documentId, areaId);
				if (!share) return false;

				// Check if user has access to that area
				const areaAccess = await sql<{ id: string }[]>`
					SELECT id FROM areas
					WHERE id = ${areaId}
					  AND user_id = ${userId}
					  AND deleted_at IS NULL
				`;
				return areaAccess.length > 0;
			} else {
				// Check if user has access to ANY shared area
				const sharedAreas = await this.getDocumentSharedAreas(documentId);
				if (sharedAreas.length === 0) return false;

				const userAreaAccess = await sql<{ id: string }[]>`
					SELECT id FROM areas
					WHERE id = ANY(${sharedAreas})
					  AND user_id = ${userId}
					  AND deleted_at IS NULL
					LIMIT 1
				`;
				return userAreaAccess.length > 0;
			}
		}

		return false;
	},

	/**
	 * Mark notifications as sent for a share
	 */
	async markNotificationsSent(documentId: string, areaId: string): Promise<void> {
		await sql`
			UPDATE document_area_shares
			SET notifications_sent = true
			WHERE document_id = ${documentId}
			  AND area_id = ${areaId}
		`;
	},

	/**
	 * Check if a document can be activated in an Area
	 * Rules:
	 * - Owner can always activate their own documents (any visibility)
	 * - visibility='space' can be activated by any Space member
	 * - visibility='areas' can only be activated if shared with the specific Area
	 * - visibility='private' (not owned) cannot be activated
	 */
	async canActivateDocument(
		userId: string,
		documentId: string,
		areaId: string,
		spaceId: string
	): Promise<boolean> {
		const rows = await sql<{ canActivate: boolean }[]>`
			SELECT EXISTS (
				SELECT 1 FROM documents d
				LEFT JOIN document_area_shares das
					ON d.id = das.document_id AND das.area_id = ${areaId}
				WHERE d.id = ${documentId}
					AND d.space_id = ${spaceId}
					AND d.deleted_at IS NULL
					AND (
						d.user_id = ${userId}
						OR d.visibility = 'space'
						OR (d.visibility = 'areas' AND das.area_id IS NOT NULL)
					)
			) as can_activate
		`;
		return rows[0]?.canActivate ?? false;
	}
};
