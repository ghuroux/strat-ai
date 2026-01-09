/**
 * PostgreSQL LLM Usage Repository
 *
 * Handles storage and querying of LLM usage data for analytics.
 * Tracks token consumption, cache statistics, and estimated costs.
 */

import { sql } from './db';

/**
 * LLM Usage record entity
 */
export interface LLMUsageRecord {
	id: string;
	organizationId: string;
	userId: string;
	conversationId: string | null;
	model: string;
	requestType: 'chat' | 'arena' | 'second-opinion';
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	cacheCreationTokens: number;
	cacheReadTokens: number;
	estimatedCostMillicents: number;
	createdAt: Date;
}

/**
 * Database row type for llm_usage table
 */
interface UsageRow {
	id: string;
	organizationId: string;
	userId: string;
	conversationId: string | null;
	model: string;
	requestType: string;
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	cacheCreationTokens: number | null;
	cacheReadTokens: number | null;
	estimatedCostMillicents: number | null;
	createdAt: Date;
}

/**
 * Aggregated usage by model
 */
export interface ModelUsageAggregate {
	model: string;
	totalRequests: number;
	totalTokens: number;
	promptTokens: number;
	completionTokens: number;
	cacheReadTokens: number;
	estimatedCostMillicents: number;
}

/**
 * Aggregated usage by user
 */
export interface UserUsageAggregate {
	userId: string;
	displayName: string | null;
	username: string;
	totalRequests: number;
	totalTokens: number;
	estimatedCostMillicents: number;
}

/**
 * Daily usage totals for charting
 */
export interface DailyUsage {
	date: string; // YYYY-MM-DD
	totalRequests: number;
	totalTokens: number;
	promptTokens: number;
	completionTokens: number;
	cacheReadTokens: number;
}

/**
 * Overall usage statistics
 */
export interface UsageStats {
	totalRequests: number;
	totalTokens: number;
	promptTokens: number;
	completionTokens: number;
	cacheCreationTokens: number;
	cacheReadTokens: number;
	estimatedCostMillicents: number;
}

/**
 * Convert database row to entity
 */
function rowToUsage(row: UsageRow): LLMUsageRecord {
	return {
		id: row.id,
		organizationId: row.organizationId,
		userId: row.userId,
		conversationId: row.conversationId,
		model: row.model,
		requestType: row.requestType as 'chat' | 'arena' | 'second-opinion',
		promptTokens: row.promptTokens,
		completionTokens: row.completionTokens,
		totalTokens: row.totalTokens,
		cacheCreationTokens: row.cacheCreationTokens || 0,
		cacheReadTokens: row.cacheReadTokens || 0,
		estimatedCostMillicents: row.estimatedCostMillicents || 0,
		createdAt: row.createdAt
	};
}

export interface UsageRepository {
	create(data: {
		organizationId: string;
		userId: string;
		conversationId?: string | null;
		model: string;
		requestType?: 'chat' | 'arena' | 'second-opinion';
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		cacheCreationTokens?: number;
		cacheReadTokens?: number;
		estimatedCostMillicents?: number;
	}): Promise<LLMUsageRecord>;

	getStats(organizationId: string, daysBack?: number): Promise<UsageStats>;
	getAggregateByModel(organizationId: string, daysBack?: number): Promise<ModelUsageAggregate[]>;
	getAggregateByUser(organizationId: string, daysBack?: number): Promise<UserUsageAggregate[]>;
	getDailyTotals(organizationId: string, daysBack?: number): Promise<DailyUsage[]>;
}

export const postgresUsageRepository: UsageRepository = {
	/**
	 * Create a new usage record
	 */
	async create(data): Promise<LLMUsageRecord> {
		const rows = await sql<UsageRow[]>`
			INSERT INTO llm_usage (
				organization_id, user_id, conversation_id, model, request_type,
				prompt_tokens, completion_tokens, total_tokens,
				cache_creation_tokens, cache_read_tokens, estimated_cost_millicents
			)
			VALUES (
				${data.organizationId},
				${data.userId},
				${data.conversationId || null},
				${data.model},
				${data.requestType || 'chat'},
				${data.promptTokens},
				${data.completionTokens},
				${data.totalTokens},
				${data.cacheCreationTokens || 0},
				${data.cacheReadTokens || 0},
				${data.estimatedCostMillicents || 0}
			)
			RETURNING *
		`;
		return rowToUsage(rows[0]);
	},

	/**
	 * Get overall usage statistics for an organization
	 */
	async getStats(organizationId: string, daysBack: number = 30): Promise<UsageStats> {
		const rows = await sql<Array<{
			totalRequests: string;
			totalTokens: string;
			promptTokens: string;
			completionTokens: string;
			cacheCreationTokens: string;
			cacheReadTokens: string;
			estimatedCostMillicents: string;
		}>>`
			SELECT
				COUNT(*)::text AS "totalRequests",
				COALESCE(SUM(total_tokens), 0)::text AS "totalTokens",
				COALESCE(SUM(prompt_tokens), 0)::text AS "promptTokens",
				COALESCE(SUM(completion_tokens), 0)::text AS "completionTokens",
				COALESCE(SUM(cache_creation_tokens), 0)::text AS "cacheCreationTokens",
				COALESCE(SUM(cache_read_tokens), 0)::text AS "cacheReadTokens",
				COALESCE(SUM(estimated_cost_millicents), 0)::text AS "estimatedCostMillicents"
			FROM llm_usage
			WHERE organization_id = ${organizationId}
			  AND created_at >= NOW() - INTERVAL '1 day' * ${daysBack}
		`;

		const row = rows[0];
		return {
			totalRequests: parseInt(row.totalRequests, 10),
			totalTokens: parseInt(row.totalTokens, 10),
			promptTokens: parseInt(row.promptTokens, 10),
			completionTokens: parseInt(row.completionTokens, 10),
			cacheCreationTokens: parseInt(row.cacheCreationTokens, 10),
			cacheReadTokens: parseInt(row.cacheReadTokens, 10),
			estimatedCostMillicents: parseInt(row.estimatedCostMillicents, 10)
		};
	},

	/**
	 * Get usage aggregated by model
	 */
	async getAggregateByModel(organizationId: string, daysBack: number = 30): Promise<ModelUsageAggregate[]> {
		const rows = await sql<Array<{
			model: string;
			totalRequests: string;
			totalTokens: string;
			promptTokens: string;
			completionTokens: string;
			cacheReadTokens: string;
			estimatedCostMillicents: string;
		}>>`
			SELECT
				model,
				COUNT(*)::text AS "totalRequests",
				COALESCE(SUM(total_tokens), 0)::text AS "totalTokens",
				COALESCE(SUM(prompt_tokens), 0)::text AS "promptTokens",
				COALESCE(SUM(completion_tokens), 0)::text AS "completionTokens",
				COALESCE(SUM(cache_read_tokens), 0)::text AS "cacheReadTokens",
				COALESCE(SUM(estimated_cost_millicents), 0)::text AS "estimatedCostMillicents"
			FROM llm_usage
			WHERE organization_id = ${organizationId}
			  AND created_at >= NOW() - INTERVAL '1 day' * ${daysBack}
			GROUP BY model
			ORDER BY SUM(total_tokens) DESC
		`;

		return rows.map(row => ({
			model: row.model,
			totalRequests: parseInt(row.totalRequests, 10),
			totalTokens: parseInt(row.totalTokens, 10),
			promptTokens: parseInt(row.promptTokens, 10),
			completionTokens: parseInt(row.completionTokens, 10),
			cacheReadTokens: parseInt(row.cacheReadTokens, 10),
			estimatedCostMillicents: parseInt(row.estimatedCostMillicents, 10)
		}));
	},

	/**
	 * Get usage aggregated by user
	 */
	async getAggregateByUser(organizationId: string, daysBack: number = 30): Promise<UserUsageAggregate[]> {
		const rows = await sql<Array<{
			userId: string;
			displayName: string | null;
			username: string;
			totalRequests: string;
			totalTokens: string;
			estimatedCostMillicents: string;
		}>>`
			SELECT
				u.user_id AS "userId",
				users.display_name AS "displayName",
				users.username,
				COUNT(*)::text AS "totalRequests",
				COALESCE(SUM(u.total_tokens), 0)::text AS "totalTokens",
				COALESCE(SUM(u.estimated_cost_millicents), 0)::text AS "estimatedCostMillicents"
			FROM llm_usage u
			JOIN users ON users.id = u.user_id
			WHERE u.organization_id = ${organizationId}
			  AND u.created_at >= NOW() - INTERVAL '1 day' * ${daysBack}
			GROUP BY u.user_id, users.display_name, users.username
			ORDER BY SUM(u.total_tokens) DESC
		`;

		return rows.map(row => ({
			userId: row.userId,
			displayName: row.displayName,
			username: row.username,
			totalRequests: parseInt(row.totalRequests, 10),
			totalTokens: parseInt(row.totalTokens, 10),
			estimatedCostMillicents: parseInt(row.estimatedCostMillicents, 10)
		}));
	},

	/**
	 * Get daily usage totals for charting
	 */
	async getDailyTotals(organizationId: string, daysBack: number = 30): Promise<DailyUsage[]> {
		const rows = await sql<Array<{
			date: Date;
			totalRequests: string;
			totalTokens: string;
			promptTokens: string;
			completionTokens: string;
			cacheReadTokens: string;
		}>>`
			SELECT
				DATE(created_at) AS date,
				COUNT(*)::text AS "totalRequests",
				COALESCE(SUM(total_tokens), 0)::text AS "totalTokens",
				COALESCE(SUM(prompt_tokens), 0)::text AS "promptTokens",
				COALESCE(SUM(completion_tokens), 0)::text AS "completionTokens",
				COALESCE(SUM(cache_read_tokens), 0)::text AS "cacheReadTokens"
			FROM llm_usage
			WHERE organization_id = ${organizationId}
			  AND created_at >= NOW() - INTERVAL '1 day' * ${daysBack}
			GROUP BY DATE(created_at)
			ORDER BY DATE(created_at) ASC
		`;

		return rows.map(row => ({
			date: row.date.toISOString().split('T')[0],
			totalRequests: parseInt(row.totalRequests, 10),
			totalTokens: parseInt(row.totalTokens, 10),
			promptTokens: parseInt(row.promptTokens, 10),
			completionTokens: parseInt(row.completionTokens, 10),
			cacheReadTokens: parseInt(row.cacheReadTokens, 10)
		}));
	}
};
