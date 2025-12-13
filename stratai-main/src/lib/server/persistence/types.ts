import type { Conversation, Message } from '$lib/types/chat';
import type {
	ArenaBattle,
	ArenaJudgment,
	BattleStatus
} from '$lib/stores/arena.svelte';

/**
 * Repository interface for Conversation entities
 * Designed for easy swap between in-memory and PostgreSQL implementations
 */
export interface ConversationRepository {
	findAll(userId: string): Promise<Conversation[]>;
	findById(id: string, userId: string): Promise<Conversation | null>;
	create(conversation: Conversation, userId: string): Promise<void>;
	update(conversation: Conversation, userId: string): Promise<void>;
	delete(id: string, userId: string): Promise<void>;
}

/**
 * Repository interface for Message entities
 */
export interface MessageRepository {
	findByConversation(conversationId: string): Promise<Message[]>;
	create(message: Message, conversationId: string): Promise<void>;
	update(message: Message): Promise<void>;
	delete(id: string): Promise<void>;
}

/**
 * Combined data access interface
 */
export interface DataAccess {
	conversations: ConversationRepository;
	messages: MessageRepository;
}

// =====================================================
// Arena Types
// =====================================================

/**
 * Model ranking record with Elo ratings
 */
export interface ModelRanking {
	userId: string;
	modelId: string;
	wins: number;
	losses: number;
	ties: number;
	eloRating: number;
	totalBattles: number;
	avgScore: number | null;
	userWins: number;
	userLosses: number;
	aiWins: number;
	aiLosses: number;
	createdAt: number;
	updatedAt: number;
}

/**
 * Repository interface for Arena Battle entities
 */
export interface BattleRepository {
	findAll(userId: string, limit?: number, offset?: number): Promise<ArenaBattle[]>;
	findById(id: string, userId: string): Promise<ArenaBattle | null>;
	findByStatus(userId: string, status: BattleStatus): Promise<ArenaBattle[]>;
	create(battle: ArenaBattle, userId: string): Promise<void>;
	update(battle: ArenaBattle, userId: string): Promise<void>;
	updateStatus(id: string, userId: string, status: BattleStatus): Promise<void>;
	updateUserVote(id: string, userId: string, modelId: string | null): Promise<void>;
	updateAiJudgment(id: string, userId: string, judgment: ArenaJudgment): Promise<void>;
	updatePinned(id: string, userId: string, pinned: boolean): Promise<void>;
	updateTitle(id: string, userId: string, title: string | null): Promise<void>;
	delete(id: string, userId: string): Promise<void>;
	count(userId: string): Promise<number>;
}

/**
 * Repository interface for Model Rankings
 */
export interface ModelRankingsRepository {
	findAll(userId: string): Promise<ModelRanking[]>;
	findByModel(userId: string, modelId: string): Promise<ModelRanking | null>;
	getLeaderboard(userId: string, limit?: number): Promise<ModelRanking[]>;
	recordBattleResult(
		userId: string,
		winnerId: string | null,
		loserId: string | null,
		scores: Record<string, number>,
		voteType: 'user' | 'ai'
	): Promise<void>;
}

/**
 * Combined Arena data access interface
 */
export interface ArenaDataAccess {
	battles: BattleRepository;
	rankings: ModelRankingsRepository;
}
