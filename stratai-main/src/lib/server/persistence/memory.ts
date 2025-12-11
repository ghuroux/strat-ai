import type { Conversation, Message } from '$lib/types/chat';
import type { ConversationRepository, MessageRepository, DataAccess } from './types';

/**
 * In-memory storage (per-process, not shared between instances)
 * Suitable for POC and development
 */

// Storage: userId -> conversationId -> Conversation
const conversations = new Map<string, Map<string, Conversation>>();

// Storage: conversationId -> Message[]
const messages = new Map<string, Message[]>();

export const memoryConversationRepository: ConversationRepository = {
	async findAll(userId: string): Promise<Conversation[]> {
		const userConvs = conversations.get(userId);
		return userConvs ? Array.from(userConvs.values()) : [];
	},

	async findById(id: string, userId: string): Promise<Conversation | null> {
		const userConvs = conversations.get(userId);
		return userConvs?.get(id) || null;
	},

	async create(conversation: Conversation, userId: string): Promise<void> {
		if (!conversations.has(userId)) {
			conversations.set(userId, new Map());
		}
		conversations.get(userId)!.set(conversation.id, conversation);
		messages.set(conversation.id, []);
	},

	async update(conversation: Conversation, userId: string): Promise<void> {
		const userConvs = conversations.get(userId);
		if (userConvs) {
			userConvs.set(conversation.id, conversation);
		}
	},

	async delete(id: string, userId: string): Promise<void> {
		const userConvs = conversations.get(userId);
		if (userConvs) {
			userConvs.delete(id);
		}
		messages.delete(id);
	}
};

export const memoryMessageRepository: MessageRepository = {
	async findByConversation(conversationId: string): Promise<Message[]> {
		return messages.get(conversationId) || [];
	},

	async create(message: Message, conversationId: string): Promise<void> {
		const convMessages = messages.get(conversationId);
		if (convMessages) {
			convMessages.push(message);
		} else {
			messages.set(conversationId, [message]);
		}
	},

	async update(message: Message): Promise<void> {
		for (const [, convMessages] of messages) {
			const index = convMessages.findIndex((m) => m.id === message.id);
			if (index !== -1) {
				convMessages[index] = message;
				break;
			}
		}
	},

	async delete(id: string): Promise<void> {
		for (const [, convMessages] of messages) {
			const index = convMessages.findIndex((m) => m.id === id);
			if (index !== -1) {
				convMessages.splice(index, 1);
				break;
			}
		}
	}
};

/**
 * In-memory data access implementation
 */
export const memoryDataAccess: DataAccess = {
	conversations: memoryConversationRepository,
	messages: memoryMessageRepository
};

/**
 * Clear all in-memory data (useful for testing)
 */
export function clearMemoryStorage(): void {
	conversations.clear();
	messages.clear();
}
