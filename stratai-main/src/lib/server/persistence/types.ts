import type { Conversation, Message } from '$lib/types/chat';
import type {
	ArenaBattle,
	ArenaJudgment,
	BattleStatus
} from '$lib/stores/arena.svelte';
import type {
	Task,
	CreateTaskInput,
	UpdateTaskInput,
	TaskListFilter,
	CreateSubtaskInput,
	TaskRelationshipType,
	RelatedTaskInfo,
	PlanningData,
	GlobalTask,
	GlobalTaskFilter
} from '$lib/types/tasks';
import type {
	Document,
	CreateDocumentInput,
	UpdateDocumentInput,
	TaskDocument,
	DocumentContextRole,
	DocumentWithTaskInfo,
	DocumentAreaShare,
	DocumentVisibility
} from '$lib/types/documents';
import type { Area, CreateAreaInput, UpdateAreaInput } from '$lib/types/areas';
import type { Space, CreateSpaceInput, UpdateSpaceInput } from '$lib/types/spaces';
import type { SpaceRole } from '$lib/types/space-memberships';
import type {
	FocusArea,
	CreateFocusAreaInput,
	UpdateFocusAreaInput
} from '$lib/types/focus-areas';

// =====================================================
// Tool Cache Types (for document reading, etc.)
// =====================================================

export interface ToolCacheEntry {
	id: string;
	conversationId: string;
	userId: string;
	toolName: string;
	paramsHash: string;
	fullResult: string;
	summary: string | null;
	tokenCount: number | null;
	accessCount: number;
	createdAt: Date;
	lastAccessedAt: Date;
	expiresAt: Date;
}

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

// =====================================================
// Task Types
// =====================================================

/**
 * Repository interface for Task entities
 */
export interface TaskRepository {
	findAll(userId: string, filter?: TaskListFilter): Promise<Task[]>;
	findAllForUser(userId: string, filter?: GlobalTaskFilter): Promise<GlobalTask[]>;
	findById(id: string, userId: string): Promise<Task | null>;
	create(input: CreateTaskInput, userId: string): Promise<Task>;
	createBulk(inputs: CreateTaskInput[], userId: string): Promise<Task[]>;
	update(id: string, updates: UpdateTaskInput, userId: string): Promise<Task | null>;
	complete(id: string, userId: string, notes?: string): Promise<Task | null>;
	reopen(id: string, userId: string): Promise<Task | null>;
	updatePlanningData(id: string, planningData: PlanningData | null, userId: string): Promise<Task | null>;
	delete(id: string, userId: string): Promise<void>;
	count(userId: string, filter?: TaskListFilter): Promise<number>;
	getActiveBySpaceId(userId: string, spaceId: string): Promise<Task[]>;
	// Task-conversation linking
	linkConversation(taskId: string, conversationId: string, userId: string): Promise<void>;
	unlinkConversation(taskId: string, conversationId: string, userId: string): Promise<void>;
	getTaskByConversation(conversationId: string, userId: string): Promise<Task | null>;
	// Subtask methods (Phase 0.3d++)
	getSubtasks(parentId: string, userId: string): Promise<Task[]>;
	createSubtask(input: CreateSubtaskInput, userId: string): Promise<Task>;
	canHaveSubtasks(taskId: string, userId: string): Promise<boolean>;
	getSubtaskCount(taskId: string, userId: string): Promise<number>;
	reorderSubtasks(parentId: string, subtaskIds: string[], userId: string): Promise<void>;
	updateSubtaskContext(taskId: string, contextSummary: string, userId: string): Promise<void>;
	deleteSubtasks(parentId: string, userId: string): Promise<number>;
	// Related task methods (Task Context System)
	linkRelatedTask(
		sourceTaskId: string,
		targetTaskId: string,
		relationshipType: TaskRelationshipType,
		userId: string
	): Promise<void>;
	unlinkRelatedTask(sourceTaskId: string, targetTaskId: string, userId: string): Promise<void>;
	getRelatedTasks(taskId: string, userId: string): Promise<RelatedTaskInfo[]>;
}

// =====================================================
// Document Types (Task Context System)
// =====================================================

/**
 * Repository interface for Document entities
 */
export interface DocumentRepository {
	findAll(userId: string, spaceId?: string): Promise<Document[]>;
	findById(id: string, userId: string): Promise<Document | null>;
	findByHash(contentHash: string, userId: string): Promise<Document | null>;
	create(input: CreateDocumentInput, userId: string): Promise<Document>;
	update(id: string, updates: UpdateDocumentInput, userId: string): Promise<Document | null>;
	delete(id: string, userId: string): Promise<{
		areasUpdated: number;
		sharesDeleted: number;
		taskLinksDeleted: number;
	}>;
	// Task-document linking
	linkToTask(
		documentId: string,
		taskId: string,
		role: DocumentContextRole,
		userId: string,
		note?: string
	): Promise<TaskDocument>;
	unlinkFromTask(documentId: string, taskId: string, userId: string): Promise<void>;
	getDocumentsForTask(taskId: string, userId: string): Promise<DocumentWithTaskInfo[]>;
	getTaskIdsForDocument(documentId: string, userId: string): Promise<string[]>;
	// Document sharing queries
	findSharedWithUser(userId: string, spaceId: string): Promise<Document[]>;
	findAvailableForArea(userId: string, areaId: string, spaceId: string): Promise<Document[]>;
}

// =====================================================
// Document Sharing Types (Area-level document sharing)
// =====================================================

/**
 * Repository interface for Document Sharing operations
 * Handles document visibility and area-level sharing
 */
export interface DocumentSharingRepository {
	// Share operations
	shareDocumentWithArea(
		documentId: string,
		areaId: string,
		userId: string
	): Promise<DocumentAreaShare>;

	shareDocumentWithAreas(
		documentId: string,
		areaIds: string[],
		userId: string
	): Promise<DocumentAreaShare[]>;

	unshareDocumentFromArea(documentId: string, areaId: string): Promise<void>;

	// Query operations
	getDocumentSharedAreas(documentId: string): Promise<string[]>;

	getDocumentsSharedWithArea(areaId: string): Promise<string[]>;

	findShare(documentId: string, areaId: string): Promise<DocumentAreaShare | null>;

	// Visibility operations
	updateDocumentVisibility(
		documentId: string,
		visibility: DocumentVisibility,
		userId: string
	): Promise<void>;

	// Access check
	canUserAccessDocument(
		userId: string,
		documentId: string,
		areaId?: string
	): Promise<boolean>;

	// Notification tracking
	markNotificationsSent(documentId: string, areaId: string): Promise<void>;

	// Activation validation
	canActivateDocument(
		userId: string,
		documentId: string,
		areaId: string,
		spaceId: string
	): Promise<boolean>;
}

// =====================================================
// Area Types (renamed from Focus Areas)
// =====================================================

/**
 * Repository interface for Area entities
 * Areas are navigable sub-spaces within spaces
 */
export interface AreaRepository {
	findAll(userId: string, spaceId?: string): Promise<Area[]>;
	findAllAccessible(userId: string, spaceId: string): Promise<Area[]>;
	findById(id: string, userId: string): Promise<Area | null>;
	findByName(spaceId: string, name: string, userId: string): Promise<Area | null>;
	findBySlug(spaceId: string, slug: string, userId: string): Promise<Area | null>;
	findGeneral(spaceId: string, userId: string): Promise<Area | null>;
	create(input: CreateAreaInput, userId: string): Promise<Area>;
	createGeneral(spaceId: string, userId: string): Promise<Area>;
	update(id: string, updates: UpdateAreaInput, userId: string): Promise<Area | null>;
	delete(id: string, userId: string, options?: { deleteContent?: boolean }): Promise<boolean>;
	reorder(spaceId: string, orderedIds: string[], userId: string): Promise<void>;
	getTaskCount(id: string, userId: string): Promise<number>;
	getConversationCount(id: string, userId: string): Promise<number>;
}

/**
 * Legacy repository interface for FocusArea entities
 * Kept for backwards compatibility with focus-areas-postgres.ts
 * New code should use AreaRepository instead
 */
export interface FocusAreaRepository {
	findAll(userId: string, spaceId?: string): Promise<FocusArea[]>;
	findById(id: string, userId: string): Promise<FocusArea | null>;
	findByName(spaceId: string, name: string, userId: string): Promise<FocusArea | null>;
	create(input: CreateFocusAreaInput, userId: string): Promise<FocusArea>;
	update(id: string, updates: UpdateFocusAreaInput, userId: string): Promise<FocusArea | null>;
	delete(id: string, userId: string): Promise<boolean>;
	reorder(spaceId: string, orderedIds: string[], userId: string): Promise<void>;
	getTaskCount(id: string, userId: string): Promise<number>;
	getConversationCount(id: string, userId: string): Promise<number>;
}

// =====================================================
// Space Types
// =====================================================

/**
 * Repository interface for Space entities
 */
export interface SpaceRepository {
	// Owner-only methods (existing)
	findAll(userId: string): Promise<Space[]>;
	findBySlug(slug: string, userId: string): Promise<Space | null>;
	findById(id: string, userId: string): Promise<Space | null>;
	create(input: CreateSpaceInput, userId: string): Promise<Space>;
	update(id: string, updates: UpdateSpaceInput, userId: string): Promise<Space | null>;
	delete(id: string, userId: string): Promise<{
		areasDeleted: number;
		tasksDeleted: number;
		conversationsDeleted: number;
	} | null>;
	ensureSystemSpaces(userId: string): Promise<void>;
	reorder(orderedIds: string[], userId: string): Promise<void>;
	getCustomSpaceCount(userId: string): Promise<number>;

	// Membership-aware methods (Phase 2: Space Memberships)
	findAllAccessible(userId: string): Promise<(Space & { userRole: SpaceRole })[]>;
	findBySlugAccessible(slug: string, userId: string): Promise<(Space & { userRole: SpaceRole }) | null>;
	findByIdAccessible(id: string, userId: string): Promise<(Space & { userRole: SpaceRole }) | null>;

	// Pinning methods (Phase C: Navigation Redesign)
	getPinnedCount(userId: string): Promise<number>;
	pinSpace(spaceId: string, userId: string): Promise<(Space & { userRole: SpaceRole }) | null>;
	unpinSpace(spaceId: string, userId: string): Promise<(Space & { userRole: SpaceRole }) | null>;
}

// =====================================================
// Organization Types (Multi-tenant Foundation)
// =====================================================

/**
 * Organization entity - multi-tenant root
 */
export interface Organization {
	id: string;
	name: string;
	slug: string;
	settings: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Repository interface for Organization entities
 */
export interface OrganizationRepository {
	findAll(): Promise<Organization[]>;
	findById(id: string): Promise<Organization | null>;
	findBySlug(slug: string): Promise<Organization | null>;
	create(input: {
		name: string;
		slug: string;
		settings?: Record<string, unknown>;
		creatorUserId?: string; // If provided, auto-creates org space and adds creator as admin
	}): Promise<Organization>;
	update(
		id: string,
		updates: {
			name?: string;
			slug?: string;
			settings?: Record<string, unknown>;
		}
	): Promise<Organization | null>;
	delete(id: string): Promise<boolean>;
}

// =====================================================
// User Types (Identity Management)
// =====================================================

/**
 * User entity - user accounts within organizations
 */
export interface User {
	id: string;
	organizationId: string;
	email: string;
	username: string;
	firstName: string | null;
	lastName: string | null;
	displayName: string | null;
	status: 'active' | 'inactive' | 'suspended';
	lastLoginAt: Date | null;
	settings: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Repository interface for User entities
 */
export interface UserRepository {
	findByOrgId(organizationId: string): Promise<User[]>;
	findById(id: string): Promise<User | null>;
	findByEmail(organizationId: string, email: string): Promise<User | null>;
	findByUsername(organizationId: string, username: string): Promise<User | null>;
	create(input: {
		organizationId: string;
		email: string;
		username: string;
		firstName?: string;
		lastName?: string;
		displayName?: string;
		passwordHash?: string;
		status?: 'active' | 'inactive' | 'suspended';
		settings?: Record<string, unknown>;
	}): Promise<User>;
	update(
		id: string,
		updates: {
			email?: string;
			username?: string;
			firstName?: string | null;
			lastName?: string | null;
			displayName?: string | null;
			passwordHash?: string;
			status?: 'active' | 'inactive' | 'suspended';
			settings?: Record<string, unknown>;
		}
	): Promise<User | null>;
	updateLastLogin(id: string): Promise<void>;
	delete(id: string): Promise<boolean>;
	getPreferences(id: string): Promise<Record<string, unknown>>;
	updatePreferences(id: string, preferences: Record<string, unknown>): Promise<Record<string, unknown>>;
	getPasswordHash(id: string): Promise<string | null>;
	findByEmailGlobal(email: string): Promise<User | null>;
	updatePassword(id: string, passwordHash: string): Promise<boolean>;
}

// =====================================================
// Organization Membership Types
// =====================================================

/**
 * OrgMembership entity - user roles within organizations
 */
export interface OrgMembership {
	id: string;
	organizationId: string;
	userId: string;
	role: 'owner' | 'admin' | 'member';
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Repository interface for Organization Membership entities
 */
export interface OrgMembershipRepository {
	findByUserId(userId: string): Promise<OrgMembership[]>;
	findByOrgId(organizationId: string): Promise<OrgMembership[]>;
	findByUserAndOrg(userId: string, organizationId: string): Promise<OrgMembership | null>;
	findById(id: string): Promise<OrgMembership | null>;
	create(input: {
		organizationId: string;
		userId: string;
		role?: 'owner' | 'admin' | 'member';
	}): Promise<OrgMembership>;
	update(id: string, updates: { role?: 'owner' | 'admin' | 'member' }): Promise<OrgMembership | null>;
	delete(id: string): Promise<boolean>;
	hasRole(userId: string, organizationId: string, minRole: 'owner' | 'admin' | 'member'): Promise<boolean>;
	getOwners(organizationId: string): Promise<OrgMembership[]>;
}

// =====================================================
// User ID Mapping Types (Backward Compatibility)
// =====================================================

/**
 * UserIdMapping entity - maps legacy TEXT user_ids to UUIDs
 */
export interface UserIdMapping {
	legacyId: string;
	userId: string;
	createdAt: Date;
}

/**
 * Repository interface for User ID Mapping entities
 */
export interface UserIdMappingRepository {
	findByLegacyId(legacyId: string): Promise<UserIdMapping | null>;
	findByUserId(userId: string): Promise<UserIdMapping | null>;
	findAll(): Promise<UserIdMapping[]>;
	create(legacyId: string, userId: string): Promise<UserIdMapping>;
	delete(legacyId: string): Promise<boolean>;
	resolveUserId(id: string): Promise<string | null>;
}

// =====================================================
// Tool Cache Types
// =====================================================

/**
 * Repository interface for Tool Result Cache
 * Caches tool results (like read_document) for token efficiency
 */
export interface ToolCacheRepository {
	/**
	 * Find a cached result by tool name and params hash
	 * Returns null if not found or expired
	 */
	findByParams(
		conversationId: string,
		toolName: string,
		paramsHash: string,
		userId: string
	): Promise<ToolCacheEntry | null>;

	/**
	 * Store a new tool result in cache
	 */
	create(
		conversationId: string,
		toolName: string,
		paramsHash: string,
		fullResult: string,
		summary: string | null,
		tokenCount: number | null,
		userId: string
	): Promise<ToolCacheEntry>;

	/**
	 * Update access tracking and refresh TTL
	 */
	touch(id: string, userId: string): Promise<void>;

	/**
	 * Delete all cache entries for a conversation
	 */
	deleteByConversation(conversationId: string, userId: string): Promise<void>;

	/**
	 * Clean up expired entries
	 */
	cleanupExpired(): Promise<number>;
}
