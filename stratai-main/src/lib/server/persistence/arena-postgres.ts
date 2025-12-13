/**
 * PostgreSQL implementation for Arena persistence
 * Handles battles and model rankings with Elo ratings
 */

import { sql, type JSONValue } from './db';
import type { BattleRepository, ModelRankingsRepository, ModelRanking } from './types';
import type {
	ArenaBattle,
	ArenaJudgment,
	BattleStatus,
	ArenaModel,
	ArenaResponse,
	BattleSettings
} from '$lib/stores/arena.svelte';

// =====================================================
// Database Row Types
// =====================================================

interface BattleRow {
	id: string;
	prompt: string;
	title: string | null;
	pinned: boolean;
	models: ArenaModel[];
	responses: ArenaResponse[];
	settings: BattleSettings;
	status: BattleStatus;
	userVote: string | null;
	aiJudgment: ArenaJudgment | null;
	userId: string;
	teamId: string | null;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
}

interface RankingRow {
	userId: string;
	modelId: string;
	wins: number;
	losses: number;
	ties: number;
	eloRating: string; // NUMERIC comes as string
	totalBattles: number;
	avgScore: string | null;
	userWins: number;
	userLosses: number;
	aiWins: number;
	aiLosses: number;
	createdAt: Date;
	updatedAt: Date;
}

// =====================================================
// Conversion Functions
// =====================================================

/**
 * Convert database row to ArenaBattle type
 */
function rowToBattle(row: BattleRow): ArenaBattle {
	return {
		id: row.id,
		prompt: row.prompt,
		title: row.title ?? undefined,
		pinned: row.pinned ?? false,
		models: row.models || [],
		responses: row.responses || [],
		settings: row.settings,
		status: row.status,
		userVote: row.userVote ?? undefined,
		aiJudgment: row.aiJudgment ?? undefined,
		createdAt: row.createdAt.getTime()
	};
}

/**
 * Convert database row to ModelRanking type
 */
function rowToRanking(row: RankingRow): ModelRanking {
	return {
		userId: row.userId,
		modelId: row.modelId,
		wins: row.wins,
		losses: row.losses,
		ties: row.ties,
		eloRating: parseFloat(row.eloRating),
		totalBattles: row.totalBattles,
		avgScore: row.avgScore ? parseFloat(row.avgScore) : null,
		userWins: row.userWins,
		userLosses: row.userLosses,
		aiWins: row.aiWins,
		aiLosses: row.aiLosses,
		createdAt: row.createdAt.getTime(),
		updatedAt: row.updatedAt.getTime()
	};
}

// =====================================================
// Elo Rating Calculation
// =====================================================

const ELO_K_FACTOR = 32;
const ELO_START_RATING = 1500;

/**
 * Calculate new Elo ratings after a match
 * @param winnerRating Current rating of winner
 * @param loserRating Current rating of loser
 * @param isDraw Whether the match was a draw
 * @returns New ratings for both players
 */
function calculateNewElo(
	winnerRating: number,
	loserRating: number,
	isDraw: boolean = false
): { winnerNew: number; loserNew: number } {
	const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
	const expectedLoser = 1 - expectedWinner;

	if (isDraw) {
		return {
			winnerNew: Math.round((winnerRating + ELO_K_FACTOR * (0.5 - expectedWinner)) * 100) / 100,
			loserNew: Math.round((loserRating + ELO_K_FACTOR * (0.5 - expectedLoser)) * 100) / 100
		};
	}

	return {
		winnerNew: Math.round((winnerRating + ELO_K_FACTOR * (1 - expectedWinner)) * 100) / 100,
		loserNew: Math.round((loserRating + ELO_K_FACTOR * (0 - expectedLoser)) * 100) / 100
	};
}

// =====================================================
// Battle Repository Implementation
// =====================================================

/**
 * PostgreSQL implementation of BattleRepository
 *
 * Key patterns:
 * - JSONB for models, responses, settings, ai_judgment (no JSON.stringify!)
 * - Soft deletes via deleted_at column
 * - User scoping on all queries
 * - Transactions for multi-table operations
 */
export const postgresBattleRepository: BattleRepository = {
	async findAll(userId: string, limit = 50, offset = 0): Promise<ArenaBattle[]> {
		const rows = await sql<BattleRow[]>`
			SELECT
				id, prompt, title, pinned, models, responses, settings, status,
				user_vote, ai_judgment, user_id, team_id,
				created_at, updated_at, deleted_at
			FROM arena_battles
			WHERE user_id = ${userId}
				AND deleted_at IS NULL
			ORDER BY pinned DESC, created_at DESC
			LIMIT ${limit}
			OFFSET ${offset}
		`;
		return rows.map(rowToBattle);
	},

	async findById(id: string, userId: string): Promise<ArenaBattle | null> {
		const rows = await sql<BattleRow[]>`
			SELECT
				id, prompt, title, pinned, models, responses, settings, status,
				user_vote, ai_judgment, user_id, team_id,
				created_at, updated_at, deleted_at
			FROM arena_battles
			WHERE id = ${id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
		return rows.length > 0 ? rowToBattle(rows[0]) : null;
	},

	async findByStatus(userId: string, status: BattleStatus): Promise<ArenaBattle[]> {
		const rows = await sql<BattleRow[]>`
			SELECT
				id, prompt, title, pinned, models, responses, settings, status,
				user_vote, ai_judgment, user_id, team_id,
				created_at, updated_at, deleted_at
			FROM arena_battles
			WHERE user_id = ${userId}
				AND status = ${status}
				AND deleted_at IS NULL
			ORDER BY created_at DESC
		`;
		return rows.map(rowToBattle);
	},

	async create(battle: ArenaBattle, userId: string): Promise<void> {
		// Use transaction to insert battle and junction table rows
		await sql.begin(async (tx) => {
			// Insert main battle record
			await tx`
				INSERT INTO arena_battles (
					id, prompt, title, pinned, models, responses, settings, status,
					user_vote, ai_judgment, user_id, created_at
				) VALUES (
					${battle.id},
					${battle.prompt},
					${battle.title ?? null},
					${battle.pinned ?? false},
					${sql.json(battle.models as JSONValue)},
					${sql.json(battle.responses as JSONValue)},
					${sql.json(battle.settings as JSONValue)},
					${battle.status},
					${battle.userVote ?? null},
					${battle.aiJudgment ? sql.json(battle.aiJudgment as JSONValue) : null},
					${userId},
					${new Date(battle.createdAt)}
				)
			`;

			// Insert model associations for efficient lookups
			for (let i = 0; i < battle.models.length; i++) {
				await tx`
					INSERT INTO arena_battle_models (battle_id, model_id, position)
					VALUES (${battle.id}, ${battle.models[i].id}, ${i})
				`;
			}
		});
	},

	async update(battle: ArenaBattle, userId: string): Promise<void> {
		await sql`
			UPDATE arena_battles
			SET
				prompt = ${battle.prompt},
				title = ${battle.title ?? null},
				pinned = ${battle.pinned ?? false},
				models = ${sql.json(battle.models as JSONValue)},
				responses = ${sql.json(battle.responses as JSONValue)},
				settings = ${sql.json(battle.settings as JSONValue)},
				status = ${battle.status},
				user_vote = ${battle.userVote ?? null},
				ai_judgment = ${battle.aiJudgment ? sql.json(battle.aiJudgment as JSONValue) : null}
			WHERE id = ${battle.id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
	},

	async updateStatus(id: string, userId: string, status: BattleStatus): Promise<void> {
		await sql`
			UPDATE arena_battles
			SET status = ${status}
			WHERE id = ${id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
	},

	async updateUserVote(id: string, userId: string, modelId: string | null): Promise<void> {
		await sql`
			UPDATE arena_battles
			SET user_vote = ${modelId}
			WHERE id = ${id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
	},

	async updateAiJudgment(id: string, userId: string, judgment: ArenaJudgment): Promise<void> {
		await sql`
			UPDATE arena_battles
			SET
				ai_judgment = ${sql.json(judgment as JSONValue)},
				status = 'judged'
			WHERE id = ${id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
	},

	async updatePinned(id: string, userId: string, pinned: boolean): Promise<void> {
		await sql`
			UPDATE arena_battles
			SET pinned = ${pinned}
			WHERE id = ${id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
	},

	async updateTitle(id: string, userId: string, title: string | null): Promise<void> {
		await sql`
			UPDATE arena_battles
			SET title = ${title}
			WHERE id = ${id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
	},

	async delete(id: string, userId: string): Promise<void> {
		// Soft delete
		await sql`
			UPDATE arena_battles
			SET deleted_at = NOW()
			WHERE id = ${id}
				AND user_id = ${userId}
				AND deleted_at IS NULL
		`;
	},

	async count(userId: string): Promise<number> {
		const result = await sql<{ count: string }[]>`
			SELECT COUNT(*) as count
			FROM arena_battles
			WHERE user_id = ${userId}
				AND deleted_at IS NULL
		`;
		return parseInt(result[0]?.count || '0', 10);
	}
};

// =====================================================
// Model Rankings Repository Implementation
// =====================================================

/**
 * PostgreSQL implementation of ModelRankingsRepository
 *
 * Handles Elo rating calculations and battle result recording
 */
export const postgresRankingsRepository: ModelRankingsRepository = {
	async findAll(userId: string): Promise<ModelRanking[]> {
		const rows = await sql<RankingRow[]>`
			SELECT
				user_id, model_id, wins, losses, ties,
				elo_rating, total_battles, avg_score,
				user_wins, user_losses, ai_wins, ai_losses,
				created_at, updated_at
			FROM model_rankings
			WHERE user_id = ${userId}
			ORDER BY elo_rating DESC
		`;
		return rows.map(rowToRanking);
	},

	async findByModel(userId: string, modelId: string): Promise<ModelRanking | null> {
		const rows = await sql<RankingRow[]>`
			SELECT
				user_id, model_id, wins, losses, ties,
				elo_rating, total_battles, avg_score,
				user_wins, user_losses, ai_wins, ai_losses,
				created_at, updated_at
			FROM model_rankings
			WHERE user_id = ${userId}
				AND model_id = ${modelId}
		`;
		return rows.length > 0 ? rowToRanking(rows[0]) : null;
	},

	async getLeaderboard(userId: string, limit = 20): Promise<ModelRanking[]> {
		const rows = await sql<RankingRow[]>`
			SELECT
				user_id, model_id, wins, losses, ties,
				elo_rating, total_battles, avg_score,
				user_wins, user_losses, ai_wins, ai_losses,
				created_at, updated_at
			FROM model_rankings
			WHERE user_id = ${userId}
				AND total_battles >= 3
			ORDER BY elo_rating DESC
			LIMIT ${limit}
		`;
		return rows.map(rowToRanking);
	},

	async recordBattleResult(
		userId: string,
		winnerId: string | null,
		loserId: string | null,
		scores: Record<string, number>,
		voteType: 'user' | 'ai'
	): Promise<void> {
		const modelIds = Object.keys(scores);
		if (modelIds.length === 0) return;

		await sql.begin(async (tx) => {
			// Ensure all models have ranking records
			for (const modelId of modelIds) {
				await tx`
					INSERT INTO model_rankings (user_id, model_id)
					VALUES (${userId}, ${modelId})
					ON CONFLICT (user_id, model_id) DO NOTHING
				`;
			}

			// Get current ratings
			const ratings = await tx<{ modelId: string; eloRating: string }[]>`
				SELECT model_id, elo_rating
				FROM model_rankings
				WHERE user_id = ${userId}
					AND model_id = ANY(${modelIds})
			`;

			const ratingMap = new Map(ratings.map((r) => [r.modelId, parseFloat(r.eloRating)]));

			if (winnerId && loserId) {
				// Clear winner/loser
				const { winnerNew, loserNew } = calculateNewElo(
					ratingMap.get(winnerId) || ELO_START_RATING,
					ratingMap.get(loserId) || ELO_START_RATING
				);

				// Update winner
				if (voteType === 'user') {
					await tx`
						UPDATE model_rankings
						SET
							wins = wins + 1,
							user_wins = user_wins + 1,
							total_battles = total_battles + 1,
							elo_rating = ${winnerNew},
							avg_score = CASE
								WHEN avg_score IS NULL THEN ${scores[winnerId]}
								ELSE (avg_score * total_battles + ${scores[winnerId]}) / (total_battles + 1)
							END
						WHERE user_id = ${userId} AND model_id = ${winnerId}
					`;
				} else {
					await tx`
						UPDATE model_rankings
						SET
							wins = wins + 1,
							ai_wins = ai_wins + 1,
							total_battles = total_battles + 1,
							elo_rating = ${winnerNew},
							avg_score = CASE
								WHEN avg_score IS NULL THEN ${scores[winnerId]}
								ELSE (avg_score * total_battles + ${scores[winnerId]}) / (total_battles + 1)
							END
						WHERE user_id = ${userId} AND model_id = ${winnerId}
					`;
				}

				// Update loser
				if (voteType === 'user') {
					await tx`
						UPDATE model_rankings
						SET
							losses = losses + 1,
							user_losses = user_losses + 1,
							total_battles = total_battles + 1,
							elo_rating = ${loserNew},
							avg_score = CASE
								WHEN avg_score IS NULL THEN ${scores[loserId]}
								ELSE (avg_score * total_battles + ${scores[loserId]}) / (total_battles + 1)
							END
						WHERE user_id = ${userId} AND model_id = ${loserId}
					`;
				} else {
					await tx`
						UPDATE model_rankings
						SET
							losses = losses + 1,
							ai_losses = ai_losses + 1,
							total_battles = total_battles + 1,
							elo_rating = ${loserNew},
							avg_score = CASE
								WHEN avg_score IS NULL THEN ${scores[loserId]}
								ELSE (avg_score * total_battles + ${scores[loserId]}) / (total_battles + 1)
							END
						WHERE user_id = ${userId} AND model_id = ${loserId}
					`;
				}
			} else {
				// Tie - update all models with draw Elo adjustment
				for (let i = 0; i < modelIds.length; i++) {
					for (let j = i + 1; j < modelIds.length; j++) {
						const model1 = modelIds[i];
						const model2 = modelIds[j];
						const { winnerNew: new1, loserNew: new2 } = calculateNewElo(
							ratingMap.get(model1) || ELO_START_RATING,
							ratingMap.get(model2) || ELO_START_RATING,
							true // isDraw
						);
						ratingMap.set(model1, new1);
						ratingMap.set(model2, new2);
					}
				}

				for (const modelId of modelIds) {
					const newRating = ratingMap.get(modelId) || ELO_START_RATING;
					await tx`
						UPDATE model_rankings
						SET
							ties = ties + 1,
							total_battles = total_battles + 1,
							elo_rating = ${newRating},
							avg_score = CASE
								WHEN avg_score IS NULL THEN ${scores[modelId]}
								ELSE (avg_score * total_battles + ${scores[modelId]}) / (total_battles + 1)
							END
						WHERE user_id = ${userId} AND model_id = ${modelId}
					`;
				}
			}
		});
	}
};

// =====================================================
// Combined Export
// =====================================================

export const postgresArenaDataAccess = {
	battles: postgresBattleRepository,
	rankings: postgresRankingsRepository
};
