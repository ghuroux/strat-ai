/**
 * Audit Logging Repository
 * Handles comprehensive activity logging for compliance and transparency
 * Created: 2026-01-13
 */

import { sql } from './db';
import type {
	AuditEvent,
	AuditEventWithUser,
	AuditEventType,
	AuditResourceType,
	AuditQueryOptions
} from '$lib/types/audit';

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
 * Note: postgres.js auto-transforms column names to camelCase
 */
async function getResourceAudit(
	resourceType: AuditResourceType,
	resourceId: string,
	options: AuditQueryOptions = {}
): Promise<AuditEventWithUser[]> {
	const { eventTypes, limit = 50, offset = 0, startDate, endDate } = options;

	// Query with camelCase-aware column selection
	// postgres.js transforms snake_case columns to camelCase automatically
	const rows = await sql<
		{
			id: string;
			userId: string;
			eventType: AuditEventType;
			resourceType: AuditResourceType;
			resourceId: string;
			action: string;
			metadata: Record<string, unknown> | string;
			createdAt: Date;
			userName: string | null;
			userEmail: string | null;
		}[]
	>`
		SELECT
			ae.id,
			ae.user_id,
			ae.event_type,
			ae.resource_type,
			ae.resource_id,
			ae.action,
			ae.metadata,
			ae.created_at,
			u.display_name as user_name,
			u.email as user_email
		FROM audit_events ae
		LEFT JOIN users u ON ae.user_id = u.id::text
		WHERE ae.resource_type = ${resourceType}
			AND ae.resource_id = ${resourceId}
			AND (${!eventTypes || eventTypes.length === 0} OR ae.event_type = ANY(${eventTypes || []}))
			AND (${!startDate} OR ae.created_at >= ${startDate || new Date(0)})
			AND (${!endDate} OR ae.created_at <= ${endDate || new Date()})
		ORDER BY ae.created_at DESC
		LIMIT ${limit}
		OFFSET ${offset}
	`;

	return rows.map((row) => {
		// Parse metadata if it's a string (JSONB can sometimes be returned as string)
		let metadata: Record<string, unknown> = {};
		if (row.metadata) {
			if (typeof row.metadata === 'string') {
				try {
					metadata = JSON.parse(row.metadata);
				} catch {
					metadata = {};
				}
			} else {
				metadata = row.metadata;
			}
		}

		return {
			id: row.id,
			organizationId: null,
			userId: row.userId,
			eventType: row.eventType,
			resourceType: row.resourceType,
			resourceId: row.resourceId,
			action: row.action,
			metadata,
			createdAt: row.createdAt,
			userName: row.userName,
			userEmail: row.userEmail
		};
	});
}

/**
 * Get audit events for a specific user
 * Note: postgres.js auto-transforms column names to camelCase
 */
async function getUserActivity(
	userId: string,
	options: AuditQueryOptions = {}
): Promise<AuditEventWithUser[]> {
	const { eventTypes, limit = 50, offset = 0, startDate, endDate } = options;

	// Query with camelCase-aware column selection
	const rows = await sql<
		{
			id: string;
			visitorUserId: string;
			eventType: AuditEventType;
			resourceType: AuditResourceType;
			resourceId: string;
			action: string;
			metadata: Record<string, unknown> | string;
			createdAt: Date;
			userName: string | null;
			userEmail: string | null;
		}[]
	>`
		SELECT
			ae.id,
			ae.user_id as visitor_user_id,
			ae.event_type,
			ae.resource_type,
			ae.resource_id,
			ae.action,
			ae.metadata,
			ae.created_at,
			u.display_name as user_name,
			u.email as user_email
		FROM audit_events ae
		LEFT JOIN users u ON ae.user_id = u.id::text
		WHERE ae.user_id = ${userId}
			AND (${!eventTypes || eventTypes.length === 0} OR ae.event_type = ANY(${eventTypes || []}))
			AND (${!startDate} OR ae.created_at >= ${startDate || new Date(0)})
			AND (${!endDate} OR ae.created_at <= ${endDate || new Date()})
		ORDER BY ae.created_at DESC
		LIMIT ${limit}
		OFFSET ${offset}
	`;

	return rows.map((row) => {
		// Parse metadata if it's a string
		let metadata: Record<string, unknown> = {};
		if (row.metadata) {
			if (typeof row.metadata === 'string') {
				try {
					metadata = JSON.parse(row.metadata);
				} catch {
					metadata = {};
				}
			} else {
				metadata = row.metadata;
			}
		}

		return {
			id: row.id,
			organizationId: null,
			userId: row.visitorUserId,
			eventType: row.eventType,
			resourceType: row.resourceType,
			resourceId: row.resourceId,
			action: row.action,
			metadata,
			createdAt: row.createdAt,
			userName: row.userName,
			userEmail: row.userEmail
		};
	});
}

// ============================================================================
// Repository Export
// ============================================================================

export const postgresAuditRepository: AuditRepository = {
	logEvent,
	getResourceAudit,
	getUserActivity
};
