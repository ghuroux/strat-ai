import type { Conversation, Message } from '$lib/types/chat';

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
