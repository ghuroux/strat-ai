/**
 * Chat Store - Conversation management with localStorage persistence
 * Uses Svelte 5 runes for reactivity with SvelteMap for proper tracking
 */

import { SvelteMap } from 'svelte/reactivity';
import type { Message, Conversation, StructuredSummary } from '$lib/types/chat';

const STORAGE_KEY = 'strathost-conversations';
const MAX_CONVERSATIONS = 50;

function generateId(): string {
	return crypto.randomUUID();
}

// Debounce utility for persistence
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
	let timeoutId: ReturnType<typeof setTimeout>;
	return ((...args: unknown[]) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), ms);
	}) as T;
}

// Svelte 5 reactive state using $state rune in a class
class ChatStore {
	// Use SvelteMap for automatic reactivity tracking
	conversations = $state<SvelteMap<string, Conversation>>(new SvelteMap());
	activeConversationId = $state<string | null>(null);
	isStreaming = $state(false);
	abortController = $state<AbortController | null>(null);

	// Version counter for fine-grained updates (message content changes)
	_version = $state(0);

	private initialized = false;
	private persistDebounced: () => void;

	constructor() {
		// Create debounced persist function
		this.persistDebounced = debounce(() => this.persist(), 500);

		// Hydrate from localStorage on client
		if (typeof window !== 'undefined') {
			this.hydrate();
		}
	}

	// Hydrate state from localStorage
	private hydrate(): void {
		if (this.initialized) return;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const { conversations, activeId } = JSON.parse(stored);
				// Restore SvelteMap from array of [id, conversation] pairs
				this.conversations = new SvelteMap(conversations);
				// Only restore activeId if the conversation still exists
				if (activeId && this.conversations.has(activeId)) {
					this.activeConversationId = activeId;
				}
			}
		} catch (e) {
			console.warn('Failed to hydrate chat store:', e);
		}

		this.initialized = true;
	}

	// Persist state to localStorage
	private persist(): void {
		if (typeof window === 'undefined') return;

		try {
			// Get sorted conversations and limit to MAX_CONVERSATIONS
			const sorted = Array.from(this.conversations.values())
				.sort((a, b) => b.updatedAt - a.updatedAt)
				.slice(0, MAX_CONVERSATIONS);
			const data = {
				conversations: sorted.map((c) => [c.id, c]),
				activeId: this.activeConversationId
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		} catch (e) {
			console.warn('Failed to persist chat store:', e);
		}
	}

	// Schedule a persist (debounced)
	private schedulePersist(): void {
		this.persistDebounced();
	}

	// Use $derived for computed values - these ARE reactive in Svelte 5
	activeConversation = $derived.by(() => {
		// Read version to track fine-grained message updates
		const _ = this._version;
		if (!this.activeConversationId) return null;
		return this.conversations.get(this.activeConversationId) || null;
	});

	conversationList = $derived.by(() => {
		return Array.from(this.conversations.values()).sort((a, b) => {
			// Pinned items first, then by updatedAt
			if (a.pinned && !b.pinned) return -1;
			if (!a.pinned && b.pinned) return 1;
			return b.updatedAt - a.updatedAt;
		});
	});

	pinnedConversations = $derived.by(() => {
		return Array.from(this.conversations.values())
			.filter((c) => c.pinned)
			.sort((a, b) => b.updatedAt - a.updatedAt);
	});

	unpinnedConversations = $derived.by(() => {
		return Array.from(this.conversations.values())
			.filter((c) => !c.pinned)
			.sort((a, b) => b.updatedAt - a.updatedAt);
	});

	messages = $derived.by(() => {
		const _ = this._version;
		return this.activeConversation?.messages || [];
	});

	hasConversations = $derived.by(() => {
		return this.conversations.size > 0;
	});

	conversationCount = $derived.by(() => {
		return this.conversations.size;
	});

	createConversation(model: string): string {
		const id = generateId();
		const conversation: Conversation = {
			id,
			title: 'New Chat',
			messages: [],
			model,
			createdAt: Date.now(),
			updatedAt: Date.now()
		};

		this.conversations.set(id, conversation);
		this.activeConversationId = id;
		this.schedulePersist();
		return id;
	}

	/**
	 * Create a new conversation that continues from a previous one
	 * Used for context window compacting - preserves the original conversation
	 * and starts fresh with a summary as context
	 */
	createContinuedConversation(fromId: string, summary: string, model: string): string {
		const id = generateId();
		const original = this.conversations.get(fromId);
		const originalTitle = original?.title || 'Chat';

		const conversation: Conversation = {
			id,
			title: `${originalTitle} (continued)`,
			messages: [],
			model,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			continuedFromId: fromId,
			continuationSummary: summary,
			refreshedAt: Date.now()
		};

		this.conversations.set(id, conversation);
		this.activeConversationId = id;
		this.schedulePersist();
		return id;
	}

	setActiveConversation(id: string): void {
		if (this.conversations.has(id)) {
			this.activeConversationId = id;
			this.schedulePersist();
		}
	}

	addMessage(conversationId: string, message: Omit<Message, 'id' | 'timestamp'>): string {
		const id = generateId();
		const fullMessage: Message = {
			...message,
			id,
			timestamp: Date.now()
		};

		const conv = this.conversations.get(conversationId);
		if (conv) {
			// Create new array reference for reactivity
			conv.messages = [...conv.messages, fullMessage];
			conv.updatedAt = Date.now();

			// Update title from first user message
			if (conv.title === 'New Chat' && message.role === 'user') {
				conv.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
			}

			// Update the map entry to ensure reactivity
			this.conversations.set(conversationId, { ...conv });
			this._version++;
			this.schedulePersist();
		}

		return id;
	}

	updateMessage(conversationId: string, messageId: string, updates: Partial<Message>): void {
		const conv = this.conversations.get(conversationId);
		if (conv) {
			const msgIndex = conv.messages.findIndex((m) => m.id === messageId);
			if (msgIndex !== -1) {
				// Create new message and array references for reactivity
				const updatedMessage = { ...conv.messages[msgIndex], ...updates };
				conv.messages = [
					...conv.messages.slice(0, msgIndex),
					updatedMessage,
					...conv.messages.slice(msgIndex + 1)
				];
				// Update the map entry
				this.conversations.set(conversationId, { ...conv });
				this._version++;
				this.schedulePersist();
			}
		}
	}

	appendToMessage(conversationId: string, messageId: string, content: string): void {
		const conv = this.conversations.get(conversationId);
		if (conv) {
			const msgIndex = conv.messages.findIndex((m) => m.id === messageId);
			if (msgIndex !== -1) {
				// Create new message with appended content
				const updatedMessage = {
					...conv.messages[msgIndex],
					content: conv.messages[msgIndex].content + content
				};
				// Create new array reference for reactivity
				conv.messages = [
					...conv.messages.slice(0, msgIndex),
					updatedMessage,
					...conv.messages.slice(msgIndex + 1)
				];
				// Update the map entry to trigger reactivity
				this.conversations.set(conversationId, { ...conv });
				// Bump version for fine-grained updates
				this._version++;
			}
		}
	}

	appendToThinking(conversationId: string, messageId: string, thinkingContent: string): void {
		const conv = this.conversations.get(conversationId);
		if (conv) {
			const msgIndex = conv.messages.findIndex((m) => m.id === messageId);
			if (msgIndex !== -1) {
				// Create new message with appended thinking content
				const existingThinking = conv.messages[msgIndex].thinking || '';
				const updatedMessage = {
					...conv.messages[msgIndex],
					thinking: existingThinking + thinkingContent,
					isThinking: true
				};
				// Create new array reference for reactivity
				conv.messages = [
					...conv.messages.slice(0, msgIndex),
					updatedMessage,
					...conv.messages.slice(msgIndex + 1)
				];
				// Update the map entry to trigger reactivity
				this.conversations.set(conversationId, { ...conv });
				// Bump version for fine-grained updates
				this._version++;
			}
		}
	}

	setStreaming(streaming: boolean, controller?: AbortController): void {
		this.isStreaming = streaming;
		this.abortController = controller || null;

		// Persist when streaming completes
		if (!streaming) {
			this.schedulePersist();
		}
	}

	stopStreaming(): void {
		if (this.abortController) {
			this.abortController.abort();
		}
		this.isStreaming = false;
		this.abortController = null;
		this.schedulePersist();
	}

	updateConversationTitle(id: string, title: string): void {
		const conv = this.conversations.get(id);
		if (conv) {
			this.conversations.set(id, {
				...conv,
				title,
				updatedAt: Date.now()
			});
			this.schedulePersist();
		}
	}

	updateConversationModel(id: string, model: string): void {
		const conv = this.conversations.get(id);
		if (conv) {
			this.conversations.set(id, {
				...conv,
				model,
				updatedAt: Date.now()
			});
			this.schedulePersist();
		}
	}

	togglePin(id: string): void {
		const conv = this.conversations.get(id);
		if (conv) {
			this.conversations.set(id, {
				...conv,
				pinned: !conv.pinned
			});
			this.schedulePersist();
		}
	}

	setSummary(id: string, summary: StructuredSummary | string): void {
		const conv = this.conversations.get(id);
		if (conv) {
			this.conversations.set(id, {
				...conv,
				summary
			});
			this._version++;
			this.schedulePersist();
		}
	}

	clearSummary(id: string): void {
		const conv = this.conversations.get(id);
		if (conv) {
			const { summary: _, ...rest } = conv;
			this.conversations.set(id, rest as typeof conv);
			this._version++;
			this.schedulePersist();
		}
	}

	deleteConversation(id: string): void {
		this.conversations.delete(id);
		if (this.activeConversationId === id) {
			const remaining = Array.from(this.conversations.keys());
			this.activeConversationId = remaining[0] || null;
		}
		this.schedulePersist();
	}

	deleteMessage(conversationId: string, messageId: string): void {
		const conv = this.conversations.get(conversationId);
		if (conv) {
			this.conversations.set(conversationId, {
				...conv,
				messages: conv.messages.filter((m) => m.id !== messageId),
				updatedAt: Date.now()
			});
			this._version++;
			this.schedulePersist();
		}
	}

	// Get the index of a message in a conversation
	getMessageIndex(conversationId: string, messageId: string): number {
		const conv = this.conversations.get(conversationId);
		if (!conv) return -1;
		return conv.messages.findIndex((m) => m.id === messageId);
	}

	// Delete all messages from a given index onwards (inclusive)
	deleteMessagesFromIndex(conversationId: string, fromIndex: number): void {
		const conv = this.conversations.get(conversationId);
		if (conv && fromIndex >= 0 && fromIndex < conv.messages.length) {
			this.conversations.set(conversationId, {
				...conv,
				messages: conv.messages.slice(0, fromIndex),
				updatedAt: Date.now()
			});
			this._version++;
			this.schedulePersist();
		}
	}

	// Update message content while preserving all other properties (like attachments)
	updateMessageContent(conversationId: string, messageId: string, newContent: string): void {
		const conv = this.conversations.get(conversationId);
		if (conv) {
			const msgIndex = conv.messages.findIndex((m) => m.id === messageId);
			if (msgIndex !== -1) {
				const updatedMessage = { ...conv.messages[msgIndex], content: newContent };
				conv.messages = [
					...conv.messages.slice(0, msgIndex),
					updatedMessage,
					...conv.messages.slice(msgIndex + 1)
				];
				this.conversations.set(conversationId, { ...conv });
				this._version++;
				this.schedulePersist();
			}
		}
	}

	clearAll(): void {
		this.conversations = new SvelteMap();
		this.activeConversationId = null;
		this.isStreaming = false;
		this.abortController = null;
		this._version = 0;

		// Clear localStorage
		if (typeof window !== 'undefined') {
			localStorage.removeItem(STORAGE_KEY);
		}
	}

	// Search conversations by title or content (maintains pin order)
	searchConversations(query: string): Conversation[] {
		if (!query.trim()) return this.conversationList;

		const lowerQuery = query.toLowerCase();
		return this.conversationList.filter((conv) => {
			// Search in title
			if (conv.title.toLowerCase().includes(lowerQuery)) return true;
			// Search in messages
			return conv.messages.some((m) => m.content.toLowerCase().includes(lowerQuery));
		});
	}

	// Search with separate pinned/unpinned results
	searchPinnedConversations(query: string): Conversation[] {
		if (!query.trim()) return this.pinnedConversations;
		const lowerQuery = query.toLowerCase();
		return this.pinnedConversations.filter((conv) => {
			if (conv.title.toLowerCase().includes(lowerQuery)) return true;
			return conv.messages.some((m) => m.content.toLowerCase().includes(lowerQuery));
		});
	}

	searchUnpinnedConversations(query: string): Conversation[] {
		if (!query.trim()) return this.unpinnedConversations;
		const lowerQuery = query.toLowerCase();
		return this.unpinnedConversations.filter((conv) => {
			if (conv.title.toLowerCase().includes(lowerQuery)) return true;
			return conv.messages.some((m) => m.content.toLowerCase().includes(lowerQuery));
		});
	}

	// Get conversation by ID
	getConversation(id: string): Conversation | undefined {
		return this.conversations.get(id);
	}

	// Duplicate a conversation
	duplicateConversation(id: string): string | null {
		const original = this.conversations.get(id);
		if (!original) return null;

		const newId = generateId();
		const duplicate: Conversation = {
			...original,
			id: newId,
			title: `${original.title} (copy)`,
			messages: original.messages.map((m) => ({ ...m, id: generateId() })),
			createdAt: Date.now(),
			updatedAt: Date.now()
		};

		this.conversations.set(newId, duplicate);
		this.activeConversationId = newId;
		this.schedulePersist();
		return newId;
	}

	// Export conversation as JSON
	exportConversation(id: string): string | null {
		const conv = this.conversations.get(id);
		if (!conv) return null;

		return JSON.stringify(conv, null, 2);
	}

	// Import conversation from JSON
	importConversation(json: string): string | null {
		try {
			const conv = JSON.parse(json) as Conversation;
			const newId = generateId();
			const imported: Conversation = {
				...conv,
				id: newId,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			this.conversations.set(newId, imported);
			this.activeConversationId = newId;
			this.schedulePersist();
			return newId;
		} catch {
			console.error('Failed to import conversation');
			return null;
		}
	}
}

// Export a singleton instance
export const chatStore = new ChatStore();
