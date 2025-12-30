import type { ToolCacheRepository, ToolCacheEntry } from './types';
import { sql } from './db';
import { randomUUID } from 'crypto';

/**
 * Database row type for tool_result_cache table
 */
interface ToolCacheRow {
	id: string;
	conversation_id: string;
	user_id: string;
	tool_name: string;
	params_hash: string;
	full_result: string;
	summary: string | null;
	token_count: number | null;
	access_count: number;
	created_at: Date;
	last_accessed_at: Date;
	expires_at: Date;
}

/**
 * Convert database row to ToolCacheEntry type
 */
function rowToEntry(row: ToolCacheRow): ToolCacheEntry {
	return {
		id: row.id,
		conversationId: row.conversation_id,
		userId: row.user_id,
		toolName: row.tool_name,
		paramsHash: row.params_hash,
		fullResult: row.full_result,
		summary: row.summary,
		tokenCount: row.token_count,
		accessCount: row.access_count,
		createdAt: row.created_at,
		lastAccessedAt: row.last_accessed_at,
		expiresAt: row.expires_at
	};
}

/**
 * PostgreSQL implementation of ToolCacheRepository
 */
export class PostgresToolCacheRepository implements ToolCacheRepository {
	async findByParams(
		conversationId: string,
		toolName: string,
		paramsHash: string,
		userId: string
	): Promise<ToolCacheEntry | null> {
		const result = await sql<ToolCacheRow[]>`
			SELECT *
			FROM tool_result_cache
			WHERE conversation_id = ${conversationId}
				AND tool_name = ${toolName}
				AND params_hash = ${paramsHash}
				AND user_id = ${userId}
				AND expires_at > NOW()
			LIMIT 1
		`;

		if (result.length === 0) return null;

		// Update access tracking
		await this.touch(result[0].id, userId);

		return rowToEntry(result[0]);
	}

	async create(
		conversationId: string,
		toolName: string,
		paramsHash: string,
		fullResult: string,
		summary: string | null,
		tokenCount: number | null,
		userId: string
	): Promise<ToolCacheEntry> {
		const id = randomUUID();

		const result = await sql<ToolCacheRow[]>`
			INSERT INTO tool_result_cache (
				id,
				conversation_id,
				user_id,
				tool_name,
				params_hash,
				full_result,
				summary,
				token_count
			) VALUES (
				${id},
				${conversationId},
				${userId},
				${toolName},
				${paramsHash},
				${fullResult},
				${summary},
				${tokenCount}
			)
			RETURNING *
		`;

		return rowToEntry(result[0]);
	}

	async touch(id: string, userId: string): Promise<void> {
		await sql`
			UPDATE tool_result_cache
			SET
				last_accessed_at = NOW(),
				access_count = access_count + 1,
				expires_at = NOW() + INTERVAL '1 hour'
			WHERE id = ${id}
				AND user_id = ${userId}
		`;
	}

	async deleteByConversation(conversationId: string, userId: string): Promise<void> {
		await sql`
			DELETE FROM tool_result_cache
			WHERE conversation_id = ${conversationId}
				AND user_id = ${userId}
		`;
	}

	async cleanupExpired(): Promise<number> {
		const result = await sql<{ count: string }[]>`
			WITH deleted AS (
				DELETE FROM tool_result_cache
				WHERE expires_at < NOW()
				RETURNING id
			)
			SELECT COUNT(*) as count FROM deleted
		`;

		return parseInt(result[0]?.count || '0', 10);
	}
}

/**
 * Create a hash from tool parameters for deduplication
 */
export function hashParams(params: Record<string, unknown>): string {
	// Simple hash: JSON stringify and then create a hash
	const json = JSON.stringify(params, Object.keys(params).sort());
	let hash = 0;
	for (let i = 0; i < json.length; i++) {
		const char = json.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash.toString(16);
}

// Singleton instance
let instance: PostgresToolCacheRepository | null = null;

export function getToolCacheRepository(): PostgresToolCacheRepository {
	if (!instance) {
		instance = new PostgresToolCacheRepository();
	}
	return instance;
}
