/**
 * Audit logging types for compliance and activity tracking
 * Supports pages, documents, areas, and other resources
 * Created: 2026-01-13
 */

// ============================================================================
// Event type taxonomy
// ============================================================================

/** Comprehensive event type taxonomy for audit logging */
export type AuditEventType =
	| 'page_created'
	| 'page_viewed'
	| 'page_edited'
	| 'page_shared_user'
	| 'page_shared_group'
	| 'page_unshared_user'
	| 'page_unshared_group'
	| 'page_permission_changed'
	| 'page_visibility_changed'
	| 'page_deleted';

/** Resource types that can be audited */
export type AuditResourceType = 'page' | 'document' | 'area' | 'space' | 'task';

// ============================================================================
// Audit event entities
// ============================================================================

/** Audit event entity (application model) */
export interface AuditEvent {
	id: string;
	organizationId: string | null; // For multi-tenancy (future)
	userId: string;
	eventType: AuditEventType;
	resourceType: AuditResourceType;
	resourceId: string;
	action: string;
	metadata: Record<string, unknown>;
	createdAt: Date;
}

/** Database row representation */
export interface AuditEventRow {
	id: string;
	organization_id: string | null;
	user_id: string;
	event_type: AuditEventType;
	resource_type: AuditResourceType;
	resource_id: string;
	action: string;
	metadata: Record<string, unknown> | string; // JSONB may be string
	created_at: Date;
}

/** Audit event with user details (for display) */
export interface AuditEventWithUser extends AuditEvent {
	userName: string | null;
	userEmail: string | null;
}

// ============================================================================
// Metadata structures for specific event types
// ============================================================================

/** Metadata for page_shared_user event */
export interface PageSharedUserMetadata {
	target_user_id: string;
	target_user_name: string;
	permission: string;
}

/** Metadata for page_shared_group event */
export interface PageSharedGroupMetadata {
	target_group_id: string;
	target_group_name: string;
	permission: string;
}

/** Metadata for page_permission_changed event */
export interface PagePermissionChangedMetadata {
	target_user_id?: string;
	target_group_id?: string;
	target_name: string;
	old_permission: string;
	new_permission: string;
}

/** Metadata for page_visibility_changed event */
export interface PageVisibilityChangedMetadata {
	old_visibility: string;
	new_visibility: string;
	specific_shares_removed?: number;
}

/** Metadata for page_edited event */
export interface PageEditedMetadata {
	changes_summary?: string;
	word_count_before?: number;
	word_count_after?: number;
}

// ============================================================================
// Query filters
// ============================================================================

/** Options for querying audit events */
export interface AuditQueryOptions {
	eventTypes?: AuditEventType[];
	limit?: number;
	offset?: number;
	startDate?: Date;
	endDate?: Date;
}

// ============================================================================
// Converter function
// ============================================================================

/** Convert database row to AuditEvent entity */
export function rowToAuditEvent(row: AuditEventRow): AuditEvent {
	// Handle JSONB parsing (postgres.js sometimes returns string)
	let parsedMetadata: Record<string, unknown> = {};

	if (row.metadata) {
		if (typeof row.metadata === 'string') {
			try {
				parsedMetadata = JSON.parse(row.metadata);
			} catch (e) {
				console.error('Failed to parse audit metadata:', e);
				parsedMetadata = {};
			}
		} else {
			parsedMetadata = row.metadata as Record<string, unknown>;
		}
	}

	return {
		id: row.id,
		organizationId: row.organization_id,
		userId: row.user_id,
		eventType: row.event_type,
		resourceType: row.resource_type,
		resourceId: row.resource_id,
		action: row.action,
		metadata: parsedMetadata,
		createdAt: new Date(row.created_at)
	};
}
