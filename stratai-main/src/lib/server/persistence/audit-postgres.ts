/**
 * Audit Logging Repository
 * Handles comprehensive activity logging for compliance and transparency
 * Created: 2026-01-13
 */

import { sql } from './db';
import type {
	AuditEvent,
	AuditEventRow,
	AuditEventWithUser,
	AuditEventType,
	AuditResourceType,
	AuditQueryOptions
} from '$lib/types/audit';
import { rowToAuditEvent } from '$lib/types/audit';

// ============================================================================
// Repository Interface
// ============================================================================

export interface AuditRepository {
	/**
	 * Log an audit event
	 * @param userId User who performed the action
	 * @param eventType Type of event (page_viewed, page_shared_user, etc.)
	 * @param resourceType Type of resource (page, document, area, etc.)
	 * @param resourceId ID of the resource
	 * @param action Action performed (view, edit, share, etc.)
	 * @param metadata Additional event-specific data
	 */
	logEvent(
		userId: string,
		eventType: AuditEventType,
		resourceType: AuditResourceType,
		resourceId: string,
		action: string,
		metadata?: Record<string, unknown>
	): Promise<void>;

	/**
	 * Get audit events for a specific resource
	 * @param resourceType Type of resource
	 * @param resourceId ID of the resource
	 * @param options Query options (filtering, pagination)
	 * @returns Audit events with user details
	 */
	getResourceAudit(
		resourceType: AuditResourceType,
		resourceId: string,
		options?: AuditQueryOptions
	): Promise<AuditEventWithUser[]>;

	/**
	 * Get audit events for a specific user
	 * @param userId User ID
	 * @param options Query options (filtering, pagination)
	 * @returns Audit events with user details
	 */
	getUserActivity(userId: string, options?: AuditQueryOptions): Promise<AuditEventWithUser[]>;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Log an audit event
 * Fire-and-forget: errors are logged but don't throw to avoid breaking the main operation
 */
async function logEvent(
	userId: string,
	eventType: AuditEventType,
	resourceType: AuditResourceType,
	resourceId: string,
	action: string,
	metadata: Record<string, unknown> = {}
): Promise<void> {
	try {
		await sql`
			INSERT INTO audit_events (user_id, event_type, resource_type, resource_id, action, metadata)
			VALUES (${userId}, ${eventType}, ${resourceType}, ${resourceId}, ${action}, ${sql.json(
				metadata as never
			)})
		`;
	} catch (error) {
		// Log error but don't throw - audit logging should not break main operations
		console.error('Failed to log audit event:', {
			userId,
			eventType,
			resourceType,
			resourceId,
			action,
			error
		});
	}
}

/**
 * Get audit events for a specific resource with user details
 */
async function getResourceAudit(
	resourceType: AuditResourceType,
	resourceId: string,
	options: AuditQueryOptions = {}
): Promise<AuditEventWithUser[]> {
	const { eventTypes, limit = 50, offset = 0, startDate, endDate } = options;

	// Build query dynamically based on options
	let query = sql`
		SELECT
			ae.*,
			u.display_name as user_name,
			u.email as user_email
		FROM audit_events ae
		LEFT JOIN users u ON ae.user_id = u.id::text
		WHERE ae.resource_type = ${resourceType}
			AND ae.resource_id = ${resourceId}
	`;

	// Add event type filter if specified
	if (eventTypes && eventTypes.length > 0) {
		query = sql`${query} AND ae.event_type = ANY(${eventTypes})`;
	}

	// Add date range filters if specified
	if (startDate) {
		query = sql`${query} AND ae.created_at >= ${startDate}`;
	}

	if (endDate) {
		query = sql`${query} AND ae.created_at <= ${endDate}`;
	}

	// Add ordering and pagination
	query = sql`${query}
		ORDER BY ae.created_at DESC
		LIMIT ${limit}
		OFFSET ${offset}
	`;

	const rows = await sql<
		(AuditEventRow & {
			user_name: string | null;
			user_email: string | null;
		})[]
	>`${query}`;

	return rows.map((row) => ({
		...rowToAuditEvent(row),
		userName: row.user_name,
		userEmail: row.user_email
	}));
}

/**
 * Get audit events for a specific user
 */
async function getUserActivity(
	userId: string,
	options: AuditQueryOptions = {}
): Promise<AuditEventWithUser[]> {
	const { eventTypes, limit = 50, offset = 0, startDate, endDate } = options;

	// Build query dynamically
	let query = sql`
		SELECT
			ae.*,
			u.display_name as user_name,
			u.email as user_email
		FROM audit_events ae
		LEFT JOIN users u ON ae.user_id = u.id::text
		WHERE ae.user_id = ${userId}
	`;

	// Add filters
	if (eventTypes && eventTypes.length > 0) {
		query = sql`${query} AND ae.event_type = ANY(${eventTypes})`;
	}

	if (startDate) {
		query = sql`${query} AND ae.created_at >= ${startDate}`;
	}

	if (endDate) {
		query = sql`${query} AND ae.created_at <= ${endDate}`;
	}

	// Add ordering and pagination
	query = sql`${query}
		ORDER BY ae.created_at DESC
		LIMIT ${limit}
		OFFSET ${offset}
	`;

	const rows = await sql<
		(AuditEventRow & {
			user_name: string | null;
			user_email: string | null;
		})[]
	>`${query}`;

	return rows.map((row) => ({
		...rowToAuditEvent(row),
		userName: row.user_name,
		userEmail: row.user_email
	}));
}

// ============================================================================
// Repository Export
// ============================================================================

export const postgresAuditRepository: AuditRepository = {
	logEvent,
	getResourceAudit,
	getUserActivity
};
