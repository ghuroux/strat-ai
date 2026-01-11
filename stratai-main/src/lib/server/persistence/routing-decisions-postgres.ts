/**
 * PostgreSQL Routing Decisions Repository
 *
 * Stores and queries AUTO model routing decisions for analytics.
 * Enables understanding routing patterns, cost savings, and threshold tuning.
 */

import { sql } from './db';
import { formatCost, getModelPricing } from '$lib/config/model-pricing';

/**
 * Routing decision record entity
 */
export interface RoutingDecisionRecord {
	id: string;
	createdAt: Date;
	userId: string;
	organizationId: string | null;
	conversationId: string | null;
	provider: string;
	conversationTurn: number;
	selectedModel: string;
	tier: 'simple' | 'medium' | 'complex';
	score: number;
	confidence: number;
	reasoning: string | null;
	routingTimeMs: number | null;
	queryLength: number | null;
	detectedPatterns: string[];
	overrides: string[];
	requestSucceeded: boolean | null;
	responseTokens: number | null;
	estimatedCostMillicents: number | null;
}

/**
 * Data for creating a routing decision
 */
export interface CreateRoutingDecisionData {
	userId: string;
	organizationId?: string | null;
	conversationId?: string | null;
	provider: string;
	conversationTurn?: number;
	selectedModel: string;
	tier: 'simple' | 'medium' | 'complex';
	score: number;
	confidence: number;
	reasoning?: string;
	routingTimeMs?: number;
	queryLength?: number;
	detectedPatterns?: string[];
	overrides?: string[];
}

/**
 * Data for updating outcome
 */
export interface UpdateRoutingOutcomeData {
	requestSucceeded: boolean;
	responseTokens?: number;
	estimatedCostMillicents?: number;
}

/**
 * Aggregated routing statistics
 */
export interface RoutingStats {
	totalDecisions: number;
	autoUsagePercent: number; // % of all requests using AUTO
	avgScore: number;
	avgConfidence: number;
	avgRoutingTimeMs: number;
	tierDistribution: {
		simple: number;
		medium: number;
		complex: number;
	};
	tierPercentages: {
		simple: number;
		medium: number;
		complex: number;
	};
	modelDistribution: Array<{
		model: string;
		count: number;
		percentage: number;
	}>;
	overrideFrequency: Array<{
		override: string;
		count: number;
		percentage: number;
	}>;
	estimatedSavingsMillicents: number;
	successRate: number;
}

/**
 * Daily routing totals for charting
 */
export interface DailyRoutingTotals {
	date: string;
	totalDecisions: number;
	simpleCount: number;
	mediumCount: number;
	complexCount: number;
	avgScore: number;
}

/**
 * Database row types
 */
interface RoutingDecisionRow {
	id: string;
	createdAt: Date;
	userId: string;
	organizationId: string | null;
	conversationId: string | null;
	provider: string;
	conversationTurn: number;
	selectedModel: string;
	tier: string;
	score: number;
	confidence: number;
	reasoning: string | null;
	routingTimeMs: number | null;
	queryLength: number | null;
	detectedPatterns: string[] | null;
	overrides: string[] | null;
	requestSucceeded: boolean | null;
	responseTokens: number | null;
	estimatedCostMillicents: number | null;
}

/**
 * Convert database row to entity
 */
function rowToEntity(row: RoutingDecisionRow): RoutingDecisionRecord {
	return {
		id: row.id,
		createdAt: row.createdAt,
		userId: row.userId,
		organizationId: row.organizationId,
		conversationId: row.conversationId,
		provider: row.provider,
		conversationTurn: row.conversationTurn,
		selectedModel: row.selectedModel,
		tier: row.tier as 'simple' | 'medium' | 'complex',
		score: row.score,
		confidence: row.confidence,
		reasoning: row.reasoning,
		routingTimeMs: row.routingTimeMs,
		queryLength: row.queryLength,
		detectedPatterns: row.detectedPatterns || [],
		overrides: row.overrides || [],
		requestSucceeded: row.requestSucceeded,
		responseTokens: row.responseTokens,
		estimatedCostMillicents: row.estimatedCostMillicents
	};
}

export interface RoutingDecisionsRepository {
	create(data: CreateRoutingDecisionData): Promise<RoutingDecisionRecord>;
	updateOutcome(id: string, data: UpdateRoutingOutcomeData): Promise<void>;
	getRecentDecisions(organizationId: string, limit?: number): Promise<RoutingDecisionRecord[]>;
	getRecentScoresForUser(userId: string, limit?: number): Promise<number[]>;
	getStats(organizationId: string, daysBack?: number): Promise<RoutingStats>;
	getDailyTotals(organizationId: string, daysBack?: number): Promise<DailyRoutingTotals[]>;
}

export const postgresRoutingDecisionsRepository: RoutingDecisionsRepository = {
	/**
	 * Create a new routing decision record
	 */
	async create(data: CreateRoutingDecisionData): Promise<RoutingDecisionRecord> {
		const rows = await sql<RoutingDecisionRow[]>`
			INSERT INTO routing_decisions (
				user_id, organization_id, conversation_id,
				provider, conversation_turn,
				selected_model, tier, score, confidence, reasoning, routing_time_ms,
				query_length, detected_patterns, overrides
			)
			VALUES (
				${data.userId},
				${data.organizationId || null},
				${data.conversationId || null},
				${data.provider},
				${data.conversationTurn || 1},
				${data.selectedModel},
				${data.tier},
				${data.score},
				${data.confidence},
				${data.reasoning || null},
				${data.routingTimeMs || null},
				${data.queryLength || null},
				${data.detectedPatterns || []},
				${data.overrides || []}
			)
			RETURNING *
		`;
		return rowToEntity(rows[0]);
	},

	/**
	 * Update outcome after request completes
	 */
	async updateOutcome(id: string, data: UpdateRoutingOutcomeData): Promise<void> {
		await sql`
			UPDATE routing_decisions
			SET
				request_succeeded = ${data.requestSucceeded},
				response_tokens = ${data.responseTokens || null},
				estimated_cost_millicents = ${data.estimatedCostMillicents || null}
			WHERE id = ${id}
		`;
	},

	/**
	 * Get recent routing decisions for an organization
	 */
	async getRecentDecisions(organizationId: string, limit: number = 50): Promise<RoutingDecisionRecord[]> {
		const rows = await sql<RoutingDecisionRow[]>`
			SELECT *
			FROM routing_decisions
			WHERE organization_id = ${organizationId}
			ORDER BY created_at DESC
			LIMIT ${limit}
		`;
		return rows.map(rowToEntity);
	},

	/**
	 * Get recent complexity scores for a user (for cache coherence)
	 * Returns the last N scores, most recent first
	 */
	async getRecentScoresForUser(userId: string, limit: number = 3): Promise<number[]> {
		const rows = await sql<Array<{ score: number }>>`
			SELECT score
			FROM routing_decisions
			WHERE user_id = ${userId}
			  AND created_at >= NOW() - INTERVAL '1 hour'
			ORDER BY created_at DESC
			LIMIT ${limit}
		`;
		return rows.map(row => row.score);
	},

	/**
	 * Get aggregated routing statistics
	 */
	async getStats(organizationId: string, daysBack: number = 30): Promise<RoutingStats> {
		// Get basic stats
		const statsRows = await sql<Array<{
			totalDecisions: string;
			avgScore: string;
			avgConfidence: string;
			avgRoutingTimeMs: string;
			simpleCount: string;
			mediumCount: string;
			complexCount: string;
			successfulCount: string;
			totalWithOutcome: string;
		}>>`
			SELECT
				COUNT(*)::text AS "totalDecisions",
				COALESCE(AVG(score), 0)::text AS "avgScore",
				COALESCE(AVG(confidence), 0)::text AS "avgConfidence",
				COALESCE(AVG(routing_time_ms), 0)::text AS "avgRoutingTimeMs",
				COUNT(*) FILTER (WHERE tier = 'simple')::text AS "simpleCount",
				COUNT(*) FILTER (WHERE tier = 'medium')::text AS "mediumCount",
				COUNT(*) FILTER (WHERE tier = 'complex')::text AS "complexCount",
				COUNT(*) FILTER (WHERE request_succeeded = true)::text AS "successfulCount",
				COUNT(*) FILTER (WHERE request_succeeded IS NOT NULL)::text AS "totalWithOutcome"
			FROM routing_decisions
			WHERE organization_id = ${organizationId}
			  AND created_at >= NOW() - INTERVAL '1 day' * ${daysBack}
		`;

		const stats = statsRows[0];
		const totalDecisions = parseInt(stats.totalDecisions, 10);
		const simpleCount = parseInt(stats.simpleCount, 10);
		const mediumCount = parseInt(stats.mediumCount, 10);
		const complexCount = parseInt(stats.complexCount, 10);
		const successfulCount = parseInt(stats.successfulCount, 10);
		const totalWithOutcome = parseInt(stats.totalWithOutcome, 10);

		// Get AUTO usage percent (compared to total LLM usage)
		const usageRows = await sql<Array<{ totalUsage: string }>>`
			SELECT COUNT(*)::text AS "totalUsage"
			FROM llm_usage
			WHERE organization_id = ${organizationId}
			  AND created_at >= NOW() - INTERVAL '1 day' * ${daysBack}
		`;
		const totalUsage = parseInt(usageRows[0].totalUsage, 10);
		const autoUsagePercent = totalUsage > 0 ? (totalDecisions / totalUsage) * 100 : 0;

		// Get model distribution
		const modelRows = await sql<Array<{ model: string; count: string }>>`
			SELECT
				selected_model AS model,
				COUNT(*)::text AS count
			FROM routing_decisions
			WHERE organization_id = ${organizationId}
			  AND created_at >= NOW() - INTERVAL '1 day' * ${daysBack}
			GROUP BY selected_model
			ORDER BY COUNT(*) DESC
		`;

		const modelDistribution = modelRows.map(row => ({
			model: row.model,
			count: parseInt(row.count, 10),
			percentage: totalDecisions > 0 ? (parseInt(row.count, 10) / totalDecisions) * 100 : 0
		}));

		// Get override frequency
		const overrideRows = await sql<Array<{ override: string; count: string }>>`
			SELECT
				unnest(overrides) AS override,
				COUNT(*)::text AS count
			FROM routing_decisions
			WHERE organization_id = ${organizationId}
			  AND created_at >= NOW() - INTERVAL '1 day' * ${daysBack}
			  AND array_length(overrides, 1) > 0
			GROUP BY unnest(overrides)
			ORDER BY COUNT(*) DESC
		`;

		const overrideFrequency = overrideRows.map(row => ({
			override: row.override,
			count: parseInt(row.count, 10),
			percentage: totalDecisions > 0 ? (parseInt(row.count, 10) / totalDecisions) * 100 : 0
		}));

		// Calculate estimated savings
		// Compare actual cost vs if everything went to Sonnet
		const costRows = await sql<Array<{
			totalActualCost: string;
			simpleTokens: string;
			mediumTokens: string;
			complexTokens: string;
		}>>`
			SELECT
				COALESCE(SUM(estimated_cost_millicents), 0)::text AS "totalActualCost",
				COALESCE(SUM(response_tokens) FILTER (WHERE tier = 'simple'), 0)::text AS "simpleTokens",
				COALESCE(SUM(response_tokens) FILTER (WHERE tier = 'medium'), 0)::text AS "mediumTokens",
				COALESCE(SUM(response_tokens) FILTER (WHERE tier = 'complex'), 0)::text AS "complexTokens"
			FROM routing_decisions
			WHERE organization_id = ${organizationId}
			  AND created_at >= NOW() - INTERVAL '1 day' * ${daysBack}
		`;

		const costData = costRows[0];
		const totalActualCost = parseInt(costData.totalActualCost, 10);
		const simpleTokens = parseInt(costData.simpleTokens, 10);

		// If all simple requests had used Sonnet instead of Haiku
		const sonnetPricing = getModelPricing('claude-sonnet-4');
		const haikuPricing = getModelPricing('claude-haiku-4-5');

		// Cost difference: what Sonnet would have cost - what Haiku cost
		const sonnetCostForSimple = (simpleTokens / 1000) * sonnetPricing.output;
		const haikuCostForSimple = (simpleTokens / 1000) * haikuPricing.output;
		const estimatedSavingsMillicents = Math.round(sonnetCostForSimple - haikuCostForSimple);

		return {
			totalDecisions,
			autoUsagePercent: Math.round(autoUsagePercent * 10) / 10,
			avgScore: Math.round(parseFloat(stats.avgScore) * 10) / 10,
			avgConfidence: Math.round(parseFloat(stats.avgConfidence) * 100) / 100,
			avgRoutingTimeMs: Math.round(parseFloat(stats.avgRoutingTimeMs) * 100) / 100,
			tierDistribution: {
				simple: simpleCount,
				medium: mediumCount,
				complex: complexCount
			},
			tierPercentages: {
				simple: totalDecisions > 0 ? Math.round((simpleCount / totalDecisions) * 1000) / 10 : 0,
				medium: totalDecisions > 0 ? Math.round((mediumCount / totalDecisions) * 1000) / 10 : 0,
				complex: totalDecisions > 0 ? Math.round((complexCount / totalDecisions) * 1000) / 10 : 0
			},
			modelDistribution,
			overrideFrequency,
			estimatedSavingsMillicents,
			successRate: totalWithOutcome > 0 ? Math.round((successfulCount / totalWithOutcome) * 1000) / 10 : 100
		};
	},

	/**
	 * Get daily routing totals for charting
	 */
	async getDailyTotals(organizationId: string, daysBack: number = 30): Promise<DailyRoutingTotals[]> {
		const rows = await sql<Array<{
			date: Date;
			totalDecisions: string;
			simpleCount: string;
			mediumCount: string;
			complexCount: string;
			avgScore: string;
		}>>`
			SELECT
				DATE(created_at) AS date,
				COUNT(*)::text AS "totalDecisions",
				COUNT(*) FILTER (WHERE tier = 'simple')::text AS "simpleCount",
				COUNT(*) FILTER (WHERE tier = 'medium')::text AS "mediumCount",
				COUNT(*) FILTER (WHERE tier = 'complex')::text AS "complexCount",
				COALESCE(AVG(score), 0)::text AS "avgScore"
			FROM routing_decisions
			WHERE organization_id = ${organizationId}
			  AND created_at >= NOW() - INTERVAL '1 day' * ${daysBack}
			GROUP BY DATE(created_at)
			ORDER BY DATE(created_at) ASC
		`;

		return rows.map(row => ({
			date: row.date.toISOString().split('T')[0],
			totalDecisions: parseInt(row.totalDecisions, 10),
			simpleCount: parseInt(row.simpleCount, 10),
			mediumCount: parseInt(row.mediumCount, 10),
			complexCount: parseInt(row.complexCount, 10),
			avgScore: Math.round(parseFloat(row.avgScore) * 10) / 10
		}));
	}
};
