/**
 * Game Scores Repository - PostgreSQL Implementation
 *
 * Provides persistence for mini-game scores with org-wide leaderboards.
 * Supports Snake, Wordle, TicTacToe (and future games).
 *
 * Key features:
 * - Org-scoped leaderboards (privacy between organizations)
 * - Personal best tracking per user per game
 * - Flexible metadata via JSONB for game-specific data
 */

import { sql, type JSONValue } from './db';

// =============================================================================
// Types
// =============================================================================

export type GameType = 'snake' | 'wordle' | 'tictactoe' | 'prompt-runner';

export interface GameScore {
	id: string;
	userId: string;
	orgId: string;
	gameType: GameType;
	score: number;
	level: number | null;
	metadata: Record<string, unknown>;
	createdAt: Date;
}

export interface GameScoreInput {
	userId: string;
	orgId: string;
	gameType: GameType;
	score: number;
	level?: number;
	metadata?: Record<string, unknown>;
}

export interface GameScoreWithUser extends GameScore {
	username: string;
	displayName: string | null;
	firstName: string | null;
}

// Row type from database (camelCase due to postgres.js transformation)
interface GameScoreRow {
	id: string;
	userId: string;
	orgId: string;
	gameType: string;
	score: number;
	level: number | null;
	metadata: Record<string, unknown> | string | null;
	createdAt: Date;
}

interface GameScoreWithUserRow extends GameScoreRow {
	username: string;
	displayName: string | null;
	firstName: string | null;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parse JSONB metadata (postgres.js may return string or object)
 */
function parseMetadata(value: unknown): Record<string, unknown> {
	if (value === null || value === undefined) return {};

	if (typeof value === 'string') {
		try {
			return JSON.parse(value) as Record<string, unknown>;
		} catch {
			return {};
		}
	}

	return value as Record<string, unknown>;
}

/**
 * Convert database row to GameScore
 */
function rowToGameScore(row: GameScoreRow): GameScore {
	return {
		id: row.id,
		userId: row.userId,
		orgId: row.orgId,
		gameType: row.gameType as GameType,
		score: row.score,
		level: row.level,
		metadata: parseMetadata(row.metadata),
		createdAt: row.createdAt
	};
}

/**
 * Convert database row with user info to GameScoreWithUser
 */
function rowToGameScoreWithUser(row: GameScoreWithUserRow): GameScoreWithUser {
	return {
		...rowToGameScore(row),
		username: row.username,
		displayName: row.displayName,
		firstName: row.firstName
	};
}

// =============================================================================
// Repository
// =============================================================================

export const postgresGameScoresRepository = {
	/**
	 * Create a new game score
	 */
	async create(input: GameScoreInput): Promise<GameScore> {
		const rows = await sql<GameScoreRow[]>`
			INSERT INTO game_scores (
				user_id,
				org_id,
				game_type,
				score,
				level,
				metadata
			) VALUES (
				${input.userId}::uuid,
				${input.orgId}::uuid,
				${input.gameType},
				${input.score},
				${input.level ?? null},
				${sql.json((input.metadata || {}) as JSONValue)}
			)
			RETURNING *
		`;

		return rowToGameScore(rows[0]);
	},

	/**
	 * Get org-wide leaderboard for a game type
	 * Joins with users table to get display names
	 *
	 * @param orgId Organization ID
	 * @param gameType Game type (snake, wordle, tictactoe)
	 * @param limit Max number of results (default 10)
	 */
	async getOrgLeaderboard(
		orgId: string,
		gameType: GameType,
		limit: number = 10
	): Promise<GameScoreWithUser[]> {
		const rows = await sql<GameScoreWithUserRow[]>`
			SELECT
				gs.*,
				u.username,
				u.display_name,
				u.first_name
			FROM game_scores gs
			JOIN users u ON gs.user_id = u.id
			WHERE gs.org_id = ${orgId}::uuid
			  AND gs.game_type = ${gameType}
			ORDER BY gs.score DESC
			LIMIT ${limit}
		`;

		return rows.map(rowToGameScoreWithUser);
	},

	/**
	 * Get user's personal best score for a game type
	 *
	 * @param userId User ID
	 * @param gameType Game type
	 */
	async getPersonalBest(userId: string, gameType: GameType): Promise<GameScore | null> {
		const rows = await sql<GameScoreRow[]>`
			SELECT *
			FROM game_scores
			WHERE user_id = ${userId}::uuid
			  AND game_type = ${gameType}
			ORDER BY score DESC
			LIMIT 1
		`;

		return rows.length > 0 ? rowToGameScore(rows[0]) : null;
	},

	/**
	 * Check if a score is the new org best
	 *
	 * @param orgId Organization ID
	 * @param gameType Game type
	 * @param score Score to check
	 */
	async isOrgBest(orgId: string, gameType: GameType, score: number): Promise<boolean> {
		const [{ maxScore }] = await sql<[{ maxScore: number | null }]>`
			SELECT MAX(score) as max_score
			FROM game_scores
			WHERE org_id = ${orgId}::uuid
			  AND game_type = ${gameType}
		`;

		// If no existing scores, any score is the best
		// Otherwise, must be strictly greater
		return maxScore === null || score > maxScore;
	},

	/**
	 * Get user's personal rank on the leaderboard
	 *
	 * @param orgId Organization ID
	 * @param userId User ID
	 * @param gameType Game type
	 */
	async getPersonalRank(
		orgId: string,
		userId: string,
		gameType: GameType
	): Promise<number | null> {
		// First get user's best score
		const personalBest = await this.getPersonalBest(userId, gameType);
		if (!personalBest) return null;

		// Count how many unique users have a higher score
		const [{ rank }] = await sql<[{ rank: number }]>`
			SELECT COUNT(DISTINCT user_id)::int + 1 as rank
			FROM game_scores
			WHERE org_id = ${orgId}::uuid
			  AND game_type = ${gameType}
			  AND score > ${personalBest.score}
		`;

		return rank;
	}
};
