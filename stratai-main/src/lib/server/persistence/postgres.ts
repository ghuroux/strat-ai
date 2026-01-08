import type { Conversation, Message } from '$lib/types/chat';
import type { ConversationRepository, MessageRepository, DataAccess } from './types';
import { sql, type JSONValue } from './db';

/**
 * Database row type for conversations table
 */
interface ConversationRow {
	id: string;
	title: string;
	model: string;
	messages: Message[];
	pinned: boolean;
	summary: Conversation['summary'] | null;
	continuedFromId: string | null;
	continuationSummary: string | null;
	refreshedAt: Date | null;
	userId: string | null;
	teamId: string | null;
	spaceId: string | null;
	areaId: string | null;
	taskId: string | null;
	tags: string[] | null;
	createdAt: Date;
	updatedAt: Date;
	lastViewedAt: Date | null;
	deletedAt: Date | null;
}

/**
 * Convert a date value to Unix timestamp
 * Handles both Date objects and numeric timestamps
 */
function toTimestamp(value: Date | number | string | null | undefined): number | undefined {
	if (value === null || value === undefined) return undefined;
	if (value instanceof Date) return value.getTime();
	if (typeof value === 'number') return value;
	// Try parsing string as date
	const parsed = new Date(value);
	return isNaN(parsed.getTime()) ? undefined : parsed.getTime();
}

/**
 * Convert database row to Conversation type
 */
function rowToConversation(row: ConversationRow): Conversation {
	return {
		id: row.id,
		title: row.title,
		model: row.model,
		messages: row.messages || [],
		pinned: row.pinned,
		summary: row.summary ?? undefined,
		continuedFromId: row.continuedFromId ?? undefined,
		continuationSummary: row.continuationSummary ?? undefined,
		refreshedAt: toTimestamp(row.refreshedAt),
		spaceId: row.spaceId ?? null,
		areaId: row.areaId ?? null,
		taskId: row.taskId ?? null,
		tags: row.tags ?? [],
		createdAt: toTimestamp(row.createdAt) ?? Date.now(),
		updatedAt: toTimestamp(row.updatedAt) ?? Date.now(),
		lastViewedAt: toTimestamp(row.lastViewedAt)
	};
}

/**
 * PostgreSQL implementation of ConversationRepository
 *
 * Key design:
 * - Messages stored as JSONB array in conversations table
 * - Soft deletes via deleted_at column
 * - User scoping for multi-tenant support
 */
export const postgresConversationRepository: ConversationRepository = {
	async findAll(userId: string): Promise<Conversation[]> {
		const rows = await sql<ConversationRow[]>`
			SELECT
				id, title, model, messages, pinned, summary,
				continued_from_id, continuation_summary, refreshed_at,
				user_id, team_id, space_id, area_id, task_id,
				created_at, updated_at, last_viewed_at, deleted_at
			FROM conversations
			WHERE user_id = ${userId}
				AND deleted_at IS NULL
			ORDER BY updated_at DESC
		`;
		return rows.map(rowToConversation);
	},

	async findById(id: string, userId: string): Promise<Conversation | null> {
		const rows = await sql<ConversationRow[]>`
			SELECT
				id, title, model, messages, pinned, summary,
				continued_from_id, continuation_summary, refreshed_at,
				user_id, team_id, space_id, area_id, task_id,
				created_at, updated_at, last_viewed_at, deleted_at
			FROM conversations
			WHERE id = ${id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToConversation(rows[0]) : null;
	},

	async create(conversation: Conversation, userId: string): Promise<void> {
		// Use UPSERT to handle re-syncing soft-deleted conversations
		// ON CONFLICT: update the record and clear deleted_at to "restore" it
		await sql`
			INSERT INTO conversations (
				id, title, model, messages, pinned, summary,
				continued_from_id, continuation_summary, refreshed_at,
				user_id, space_id, area_id, task_id, created_at, updated_at
			) VALUES (
				${conversation.id},
				${conversation.title},
				${conversation.model},
				${sql.json(conversation.messages as JSONValue)},
				${conversation.pinned ?? false},
				${conversation.summary ? sql.json(conversation.summary as JSONValue) : null},
				${conversation.continuedFromId ?? null},
				${conversation.continuationSummary ?? null},
				${conversation.refreshedAt ? new Date(conversation.refreshedAt) : null},
				${userId},
				${conversation.spaceId ?? null},
				${conversation.areaId ?? null},
				${conversation.taskId ?? null},
				${new Date(conversation.createdAt)},
				${new Date(conversation.updatedAt)}
			)
			ON CONFLICT (id) DO UPDATE SET
				title = EXCLUDED.title,
				model = EXCLUDED.model,
				messages = EXCLUDED.messages,
				pinned = EXCLUDED.pinned,
				summary = EXCLUDED.summary,
				continued_from_id = EXCLUDED.continued_from_id,
				continuation_summary = EXCLUDED.continuation_summary,
				refreshed_at = EXCLUDED.refreshed_at,
				space_id = EXCLUDED.space_id,
				area_id = EXCLUDED.area_id,
				task_id = EXCLUDED.task_id,
				updated_at = EXCLUDED.updated_at,
				deleted_at = NULL
		`;
	},

	async update(conversation: Conversation, userId: string): Promise<void> {
		await sql`
			UPDATE conversations
			SET
				title = ${conversation.title},
				model = ${conversation.model},
				messages = ${sql.json(conversation.messages as JSONValue)},
				pinned = ${conversation.pinned ?? false},
				summary = ${conversation.summary ? sql.json(conversation.summary as JSONValue) : null},
				continued_from_id = ${conversation.continuedFromId ?? null},
				continuation_summary = ${conversation.continuationSummary ?? null},
				refreshed_at = ${conversation.refreshedAt ? new Date(conversation.refreshedAt) : null},
				space_id = ${conversation.spaceId ?? null},
				area_id = ${conversation.areaId ?? null},
				task_id = ${conversation.taskId ?? null},
				updated_at = NOW()
			WHERE id = ${conversation.id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
	},

	async delete(id: string, userId: string): Promise<void> {
		// Soft delete
		await sql`
			UPDATE conversations
			SET deleted_at = NOW()
			WHERE id = ${id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
	}
};

/**
 * PostgreSQL implementation of MessageRepository
 *
 * Note: Since messages are stored as JSONB in conversations,
 * these operations update the JSONB array directly.
 */
export const postgresMessageRepository: MessageRepository = {
	async findByConversation(conversationId: string): Promise<Message[]> {
		const rows = await sql<{ messages: Message[] }[]>`
			SELECT messages
			FROM conversations
			WHERE id = ${conversationId}
				AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rows[0].messages || [] : [];
	},

	async create(message: Message, conversationId: string): Promise<void> {
		// Append message to JSONB array
		await sql`
			UPDATE conversations
			SET messages = messages || ${sql.json([message] as JSONValue)}
			WHERE id = ${conversationId}
				AND deleted_at IS NULL
		`;
	},

	async update(message: Message): Promise<void> {
		// Update message in JSONB array by ID
		// Uses jsonb_set with a subquery to find the index
		await sql`
			UPDATE conversations
			SET messages = (
				SELECT jsonb_agg(
					CASE
						WHEN elem->>'id' = ${message.id}
						THEN ${sql.json(message as JSONValue)}
						ELSE elem
					END
				)
				FROM jsonb_array_elements(messages) AS elem
			)
			WHERE EXISTS (
				SELECT 1 FROM jsonb_array_elements(messages) AS elem
				WHERE elem->>'id' = ${message.id}
			)
			AND deleted_at IS NULL
		`;
	},

	async delete(id: string): Promise<void> {
		// Remove message from JSONB array by ID
		await sql`
			UPDATE conversations
			SET messages = (
				SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
				FROM jsonb_array_elements(messages) AS elem
				WHERE elem->>'id' != ${id}
			)
			WHERE EXISTS (
				SELECT 1 FROM jsonb_array_elements(messages) AS elem
				WHERE elem->>'id' = ${id}
			)
			AND deleted_at IS NULL
		`;
	}
};

/**
 * PostgreSQL data access implementation
 */
export const postgresDataAccess: DataAccess = {
	conversations: postgresConversationRepository,
	messages: postgresMessageRepository
};

/**
 * Find conversations by space ID
 */
export async function findBySpaceId(
	userId: string,
	spaceId: string
): Promise<Conversation[]> {
	const rows = await sql<ConversationRow[]>`
		SELECT
			id, title, model, messages, pinned, summary,
			continued_from_id, continuation_summary, refreshed_at,
			user_id, team_id, space_id, area_id, task_id, tags,
			created_at, updated_at, last_viewed_at, deleted_at
		FROM conversations
		WHERE user_id = ${userId}
			AND space_id = ${spaceId}
			AND deleted_at IS NULL
		ORDER BY pinned DESC, last_viewed_at DESC NULLS LAST
	`;
	return rows.map(rowToConversation);
}

/**
 * Mark a conversation as viewed (updates last_viewed_at)
 * Call this when user opens/views a conversation
 */
export async function markConversationAsViewed(
	conversationId: string,
	userId: string
): Promise<void> {
	await sql`
		UPDATE conversations
		SET last_viewed_at = NOW()
		WHERE id = ${conversationId}
			AND user_id = ${userId}
			AND deleted_at IS NULL
	`;
}

/**
 * Search conversations by content
 * Uses PostgreSQL full-text search on message content
 */
export async function searchConversations(
	userId: string,
	query: string,
	limit = 20
): Promise<Conversation[]> {
	const rows = await sql<ConversationRow[]>`
		SELECT
			id, title, model, messages, pinned, summary,
			continued_from_id, continuation_summary, refreshed_at,
			user_id, team_id, space_id, area_id, task_id, tags,
			created_at, updated_at, last_viewed_at, deleted_at
		FROM conversations
		WHERE user_id = ${userId}
			AND deleted_at IS NULL
			AND (
				title ILIKE ${'%' + query + '%'}
				OR EXISTS (
					SELECT 1 FROM jsonb_array_elements(messages) AS msg
					WHERE msg->>'content' ILIKE ${'%' + query + '%'}
				)
			)
		ORDER BY last_viewed_at DESC NULLS LAST
		LIMIT ${limit}
	`;
	return rows.map(rowToConversation);
}

/**
 * Get conversations with pagination
 */
export async function getConversationsPaginated(
	userId: string,
	offset = 0,
	limit = 50,
	spaceId?: string
): Promise<{ conversations: Conversation[]; total: number }> {
	// Build query with optional space filter
	const [rows, countResult] = await Promise.all([
		spaceId
			? sql<ConversationRow[]>`
				SELECT
					id, title, model, messages, pinned, summary,
					continued_from_id, continuation_summary, refreshed_at,
					user_id, team_id, space_id, area_id, task_id, tags,
					created_at, updated_at, last_viewed_at, deleted_at
				FROM conversations
				WHERE user_id = ${userId}
					AND space_id = ${spaceId}
					AND deleted_at IS NULL
				ORDER BY pinned DESC, last_viewed_at DESC NULLS LAST
				OFFSET ${offset}
				LIMIT ${limit}
			`
			: sql<ConversationRow[]>`
				SELECT
					id, title, model, messages, pinned, summary,
					continued_from_id, continuation_summary, refreshed_at,
					user_id, team_id, space_id, area_id, task_id, tags,
					created_at, updated_at, last_viewed_at, deleted_at
				FROM conversations
				WHERE user_id = ${userId}
					AND deleted_at IS NULL
				ORDER BY pinned DESC, last_viewed_at DESC NULLS LAST
				OFFSET ${offset}
				LIMIT ${limit}
			`,
		spaceId
			? sql<{ count: string }[]>`
				SELECT COUNT(*) as count
				FROM conversations
				WHERE user_id = ${userId}
					AND space_id = ${spaceId}
					AND deleted_at IS NULL
			`
			: sql<{ count: string }[]>`
				SELECT COUNT(*) as count
				FROM conversations
				WHERE user_id = ${userId}
					AND deleted_at IS NULL
			`
	]);

	return {
		conversations: rows.map(rowToConversation),
		total: parseInt(countResult[0]?.count || '0', 10)
	};
}
