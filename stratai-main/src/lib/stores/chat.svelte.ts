/**
 * Chat Store - Conversation management with PostgreSQL persistence
 * Uses Svelte 5 runes for reactivity with SvelteMap for proper tracking
 *
 * Persistence strategy:
 * - Primary: PostgreSQL via API endpoints
 * - Cache: localStorage for fast initial loads and offline support
 * - Sync: Background sync on actions, optimistic updates
 */

import { SvelteMap } from 'svelte/reactivity';
import type { Message, Conversation, StructuredSummary } from '$lib/types/chat';
import type { AssistState } from '$lib/types/assists';
import { ASSISTS } from '$lib/config/assists';
import { generateUUID } from '$lib/utils/uuid';
import { generationActivityStore } from '$lib/stores/generationActivity.svelte';
import { toastStore } from './toast.svelte';
import { debugLog } from '$lib/utils/debug';

const STORAGE_KEY = 'strathost-conversations';
const MAX_CONVERSATIONS = 50;
const MIN_CONVERSATIONS_ON_QUOTA = 10; // Minimum to keep when quota exceeded

function generateId(): string {
	return generateUUID();
}

// Debounce utility for persistence
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
	let timeoutId: ReturnType<typeof setTimeout>;
	return ((...args: unknown[]) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), ms);
	}) as T;
}

// Second Opinion state type
export interface SecondOpinionState {
	isOpen: boolean;
	isStreaming: boolean;
	sourceMessageId: string | null;
	sourceMessageIndex: number;
	modelId: string | null;
	content: string;
	thinking: string;
	error: string | null;
	guidance: string | null; // Extracted "Key Guidance" section for efficient injection
}

// Svelte 5 reactive state using $state rune in a class
class ChatStore {
	// Use SvelteMap for automatic reactivity tracking
	conversations = $state<SvelteMap<string, Conversation>>(new SvelteMap());
	activeConversationId = $state<string | null>(null);
	isStreaming = $state(false);
	abortController = $state<AbortController | null>(null);
	isLoading = $state(false);
	syncError = $state<string | null>(null);

	// Second Opinion state (ephemeral - not persisted)
	secondOpinion = $state<SecondOpinionState | null>(null);
	secondOpinionAbortController = $state<AbortController | null>(null);

	// Assist state (ephemeral - not persisted)
	assistState = $state<AssistState | null>(null);
	assistAbortController = $state<AbortController | null>(null);

	// Space state (for filtering conversations by space)
	activeSpaceId = $state<string | null>(null);

	// Area state (for filtering conversations by area within a space)
	selectedAreaId = $state<string | null>(null);

	// Task state (for deep work mode - filter to task-linked conversations only)
	focusedTaskId = $state<string | null>(null);

	// AUTO mode routing state (ephemeral - not persisted)
	// Tracks which model was actually used when AUTO mode is active
	routedModel = $state<string | null>(null);
	autoProvider = $state<'anthropic' | 'openai' | 'google'>('anthropic');
	routingDecision = $state<{
		tier: 'simple' | 'medium' | 'complex';
		score: number;
		confidence: number;
		overrides: string[];
	} | null>(null);

	// Version counter for fine-grained updates (message content changes)
	_version = $state(0);

	private initialized = false;
	private persistDebounced: () => void;
	private syncQueue: Map<string, Conversation> = new Map();
	private isSyncing = false;

	constructor() {
		// Create debounced persist function
		this.persistDebounced = debounce(() => this.persistToLocalStorage(), 500);

		// Hydrate from localStorage immediately, then sync with API
		if (typeof window !== 'undefined') {
			this.hydrateFromLocalStorage();
			// Defer API sync to not block initial render
			setTimeout(() => this.syncFromApi(), 100);
		}
	}

	// Hydrate state from localStorage (fast, cached)
	private hydrateFromLocalStorage(): void {
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
			debugLog('CHAT_STORE', 'Failed to hydrate from localStorage:', e);
		}

		this.initialized = true;
	}

	// Sync from API (PostgreSQL) - source of truth
	private async syncFromApi(): Promise<void> {
		if (typeof window === 'undefined') return;

		this.isLoading = true;
		this.syncError = null;

		try {
			const response = await fetch('/api/conversations');
			if (!response.ok) {
				if (response.status === 401) {
					// Not logged in - keep localStorage data
					return;
				}
				throw new Error(`API error: ${response.status}`);
			}

			const data = await response.json();
			if (data.conversations) {
				// Merge API data with local data
				// API is source of truth, but preserve any local-only conversations
				const apiConversations = new Map<string, Conversation>(
					data.conversations.map((c: Conversation) => [c.id, c])
				);

				// Update existing and add new from API
				for (const [id, conv] of apiConversations) {
					this.conversations.set(id, conv);
				}

				// Check for local-only conversations (created while offline)
				// and sync them to the server
				for (const [id, conv] of this.conversations) {
					if (!apiConversations.has(id)) {
						// This is a local-only conversation, sync it
						this.syncToApi(conv);
					}
				}

				// Persist merged state to localStorage
				this.persistToLocalStorage();
			}
		} catch (e) {
			debugLog('CHAT_STORE', 'Failed to sync from API, using localStorage:', e);
			this.syncError = e instanceof Error ? e.message : 'Sync failed';
			toastStore.error('Failed to sync conversations');
		} finally {
			this.isLoading = false;
		}
	}

	// Sync a conversation to the API
	private async syncToApi(conversation: Conversation): Promise<void> {
		if (typeof window === 'undefined') return;

		// Queue for batch processing
		this.syncQueue.set(conversation.id, conversation);
		this.processSyncQueue();
	}

	private async processSyncQueue(): Promise<void> {
		if (this.isSyncing || this.syncQueue.size === 0) return;

		this.isSyncing = true;

		try {
			// Process one at a time to avoid overwhelming the API
			const [id, conversation] = this.syncQueue.entries().next().value as [string, Conversation];
			this.syncQueue.delete(id);

			// Check if conversation exists on server
			const checkResponse = await fetch(`/api/conversations/${id}`);

			if (checkResponse.status === 404) {
				// Create new conversation
				await fetch('/api/conversations', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(conversation)
				});
			} else if (checkResponse.ok) {
				// Update existing conversation
				await fetch(`/api/conversations/${id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(conversation)
				});
			}
		} catch (e) {
			debugLog('CHAT_STORE', 'Failed to sync conversation to API:', e);
		} finally {
			this.isSyncing = false;
			// Process next in queue
			if (this.syncQueue.size > 0) {
				setTimeout(() => this.processSyncQueue(), 100);
			}
		}
	}

	// Delete from API
	private async deleteFromApi(id: string): Promise<boolean> {
		if (typeof window === 'undefined') return false;

		try {
			await fetch(`/api/conversations/${id}`, {
				method: 'DELETE'
			});
			return true;
		} catch (e) {
			debugLog('CHAT_STORE', 'Failed to delete conversation from API:', e);
			return false;
		}
	}

	// Persist state to localStorage (cache)
	private persistToLocalStorage(): void {
		if (typeof window === 'undefined') return;

		// Get sorted conversations
		const sorted = Array.from(this.conversations.values())
			.sort((a, b) => b.updatedAt - a.updatedAt);

		// Try with progressively fewer conversations if quota exceeded
		let limit = MAX_CONVERSATIONS;
		while (limit >= MIN_CONVERSATIONS_ON_QUOTA) {
			try {
				const toStore = sorted.slice(0, limit);
				const data = {
					conversations: toStore.map((c) => [c.id, c]),
					activeId: this.activeConversationId
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

				// Success - if we had to reduce, log it
				if (limit < MAX_CONVERSATIONS) {
					debugLog('CHAT_STORE', `localStorage quota: reduced cache to ${limit} conversations`);
				}
				return;
			} catch (e) {
				if (e instanceof DOMException && e.name === 'QuotaExceededError') {
					// Reduce limit and try again
					limit = Math.floor(limit * 0.6); // Reduce by 40% each iteration
					if (limit < MIN_CONVERSATIONS_ON_QUOTA) {
						debugLog('CHAT_STORE', `localStorage quota exceeded. Clearing local cache. Data is safe in database.`);
						// Last resort: clear and only save active conversation
						try {
							const activeConv = this.activeConversationId
								? this.conversations.get(this.activeConversationId)
								: null;
							const data = {
								conversations: activeConv ? [[activeConv.id, activeConv]] : [],
								activeId: this.activeConversationId
							};
							localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
						} catch {
							// Complete failure - clear localStorage for this key
							localStorage.removeItem(STORAGE_KEY);
						}
						return;
					}
				} else {
					debugLog('CHAT_STORE', 'Failed to persist chat store:', e);
					return;
				}
			}
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
		return Array.from(this.conversations.values())
			.filter((c) => c && c.id)
			.sort((a, b) => {
				// Pinned items first, then by updatedAt
				if (a.pinned && !b.pinned) return -1;
				if (!a.pinned && b.pinned) return 1;
				return b.updatedAt - a.updatedAt;
			});
	});

	pinnedConversations = $derived.by(() => {
		return Array.from(this.conversations.values())
			.filter((c) => c && c.id && c.pinned)
			.sort((a, b) => b.updatedAt - a.updatedAt);
	});

	unpinnedConversations = $derived.by(() => {
		return Array.from(this.conversations.values())
			.filter((c) => c && c.id && !c.pinned)
			.sort((a, b) => b.updatedAt - a.updatedAt);
	});

	messages = $derived.by(() => {
		const _ = this._version;
		// Filter out any messages without IDs to prevent Svelte {#each} key errors
		const msgs = this.activeConversation?.messages || [];
		return msgs.filter((m) => m && m.id);
	});

	hasConversations = $derived.by(() => {
		return this.conversations.size > 0;
	});

	conversationCount = $derived.by(() => {
		return this.conversations.size;
	});

	// Count of conversations in main nav only (no spaceId)
	mainConversationCount = $derived.by(() => {
		return Array.from(this.conversations.values()).filter((c) => !c.spaceId).length;
	});

	// Conversations filtered by active space (for space sidebar views)
	conversationsBySpace = $derived.by(() => {
		if (!this.activeSpaceId) return this.conversationList;
		return this.conversationList.filter((c) => c.spaceId === this.activeSpaceId);
	});

	// Pinned conversations filtered by active space
	pinnedConversationsBySpace = $derived.by(() => {
		if (!this.activeSpaceId) return this.pinnedConversations;
		return this.pinnedConversations.filter((c) => c.spaceId === this.activeSpaceId);
	});

	// Unpinned conversations filtered by active space
	unpinnedConversationsBySpace = $derived.by(() => {
		if (!this.activeSpaceId) return this.unpinnedConversations;
		return this.unpinnedConversations.filter((c) => c.spaceId === this.activeSpaceId);
	});

	// Context-aware grouped conversations for sidebar
	// Area-centric model: Area is the primary filter
	// Key change: Pinned conversations only show in their ORIGIN area (not everywhere)
	groupedConversations = $derived.by(() => {
		const allConversations = Array.from(this.conversations.values())
			.filter((c) => c && c.id)
			.sort((a, b) => b.updatedAt - a.updatedAt);

		// Deep work mode: only show task conversations (isolated experience)
		if (this.focusedTaskId) {
			return {
				pinned: allConversations.filter((c) => c.pinned && c.taskId === this.focusedTaskId),
				current: allConversations.filter((c) => c.taskId === this.focusedTaskId && !c.pinned),
				otherInSpace: [], // Not shown in task focus mode (serene isolation)
				otherContexts: [] // Not shown in task focus mode
			};
		}

		// Area view - primary filter in new architecture
		// Pinned chats show ONLY in their origin area (not everywhere)
		if (this.selectedAreaId) {
			return {
				// Pinned conversations that BELONG to this area only
				pinned: allConversations.filter(
					(c) => c.areaId === this.selectedAreaId && c.pinned
				),
				// Current area conversations (not pinned)
				current: allConversations.filter(
					(c) => c.areaId === this.selectedAreaId && !c.pinned
				),
				// Other areas in the same space (collapsible "From Other Areas")
				otherInSpace: allConversations.filter(
					(c) =>
						c.spaceId === this.activeSpaceId &&
						c.areaId !== this.selectedAreaId &&
						c.areaId // Must have an areaId (excludes orphans)
				),
				// Conversations from other spaces (rarely shown, mostly for search)
				otherContexts: allConversations.filter(
					(c) => c.spaceId && c.spaceId !== this.activeSpaceId
				)
			};
		}

		// Space view (Space Dashboard - navigation hub, typically no sidebar)
		// Kept for fallback/transition purposes
		if (this.activeSpaceId) {
			return {
				// Pinned in this space only
				pinned: allConversations.filter((c) => c.spaceId === this.activeSpaceId && c.pinned),
				// All conversations in this space
				current: allConversations.filter((c) => c.spaceId === this.activeSpaceId && !c.pinned),
				otherInSpace: [], // Not applicable at space level
				// Other spaces
				otherContexts: allConversations.filter((c) => c.spaceId !== this.activeSpaceId)
			};
		}

		// Main view (no space context - legacy main chat)
		return {
			// Pinned conversations without a space
			pinned: allConversations.filter((c) => !c.spaceId && c.pinned),
			// Conversations without a space
			current: allConversations.filter((c) => !c.spaceId && !c.pinned),
			otherInSpace: [], // Not applicable in main view
			// Conversations that belong to spaces (collapsible "From Spaces")
			otherContexts: allConversations.filter((c) => c.spaceId)
		};
	});

	createConversation(
		model: string,
		options?: { spaceId?: string; areaId?: string; taskId?: string }
	): string {
		const id = generateId();
		const conversation: Conversation = {
			id,
			title: 'New Chat',
			messages: [],
			model,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			spaceId: options?.spaceId || null,
			areaId: options?.areaId || null,
			taskId: options?.taskId || null,
			tags: []
		};

		this.conversations.set(id, conversation);
		this.activeConversationId = id;
		this.schedulePersist();
		this.syncToApi(conversation);
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
		this.syncToApi(conversation);
		return id;
	}

	setActiveConversation(id: string | null): void {
		if (id === null) {
			this.activeConversationId = null;
			this.schedulePersist();
		} else if (this.conversations.has(id)) {
			this.activeConversationId = id;
			this.schedulePersist();

			// Mark conversation as viewed (update lastViewedAt)
			this.markAsViewed(id);
		}
	}

	/**
	 * Mark a conversation as viewed
	 * Updates lastViewedAt locally and syncs to server
	 */
	private async markAsViewed(id: string): Promise<void> {
		const conversation = this.conversations.get(id);
		if (!conversation) return;

		// Update locally
		const now = Date.now();
		this.conversations.set(id, {
			...conversation,
			lastViewedAt: now
		});

		// Sync to server (fire and forget, don't block UI)
		if (typeof window !== 'undefined') {
			fetch(`/api/conversations/${id}/viewed`, {
				method: 'POST'
			}).catch((err) => {
				debugLog('CHAT_STORE', 'Failed to mark conversation as viewed:', err);
			});
		}
	}

	/**
	 * Set the active space for filtering conversations
	 * Used by space pages to scope the sidebar view
	 */
	setActiveSpaceId(spaceId: string | null): void {
		this.activeSpaceId = spaceId;
	}

	/**
	 * Get count of conversations in a specific space
	 */
	getSpaceConversationCount(spaceId: string): number {
		return Array.from(this.conversations.values()).filter((c) => c.spaceId === spaceId).length;
	}

	/**
	 * Set the selected focus area for filtering conversations
	 * Used by focus area views to scope the sidebar view
	 */
	setSelectedAreaId(areaId: string | null): void {
		this.selectedAreaId = areaId;
	}

	/**
	 * Set the focused task for deep work mode
	 * When set, sidebar will only show task-linked conversations
	 */
	setFocusedTaskId(taskId: string | null): void {
		this.focusedTaskId = taskId;
	}

	// =====================================================
	// AUTO Mode Routing Methods
	// =====================================================

	/**
	 * Set the routed model (the model actually used when AUTO mode is active)
	 */
	setRoutedModel(modelId: string | null): void {
		this.routedModel = modelId;
	}

	/**
	 * Set the preferred provider for AUTO mode
	 */
	setAutoProvider(provider: 'anthropic' | 'openai' | 'google'): void {
		this.autoProvider = provider;
	}

	/**
	 * Set the routing decision from the backend
	 */
	setRoutingDecision(decision: {
		tier: 'simple' | 'medium' | 'complex';
		score: number;
		confidence: number;
		overrides: string[];
	} | null): void {
		this.routingDecision = decision;
	}

	/**
	 * Clear routing state (called when starting a new message or switching conversations)
	 */
	clearRoutingState(): void {
		this.routedModel = null;
		this.routingDecision = null;
	}

	/**
	 * Get conversations linked to a specific focus area
	 */
	getConversationsByArea(areaId: string): Conversation[] {
		return Array.from(this.conversations.values())
			.filter((c) => c.areaId === areaId)
			.sort((a, b) => b.updatedAt - a.updatedAt);
	}

	/**
	 * Get conversations linked to a specific task (for deep work mode)
	 */
	getConversationsForTask(taskId: string): Conversation[] {
		return Array.from(this.conversations.values())
			.filter((c) => c.taskId === taskId)
			.sort((a, b) => b.updatedAt - a.updatedAt);
	}

	/**
	 * Get conversations in the current context based on activeSpaceId + selectedAreaId
	 * Used for context-aware sidebar grouping
	 */
	getConversationsInCurrentContext(): Conversation[] {
		const allConversations = Array.from(this.conversations.values());

		// If focused on a task (deep work mode), only show task conversations
		if (this.focusedTaskId) {
			return allConversations
				.filter((c) => c.taskId === this.focusedTaskId)
				.sort((a, b) => b.updatedAt - a.updatedAt);
		}

		// If in a focus area, show focus area conversations
		if (this.selectedAreaId) {
			return allConversations
				.filter((c) => c.areaId === this.selectedAreaId)
				.sort((a, b) => b.updatedAt - a.updatedAt);
		}

		// If in a space, show space conversations
		if (this.activeSpaceId) {
			return allConversations
				.filter((c) => c.spaceId === this.activeSpaceId)
				.sort((a, b) => b.updatedAt - a.updatedAt);
		}

		// Main view: show conversations without space context
		return allConversations
			.filter((c) => !c.spaceId)
			.sort((a, b) => b.updatedAt - a.updatedAt);
	}

	/**
	 * Check if a conversation is in the current context
	 * Used to determine if "Bring to Context" modal should be shown
	 */
	isConversationInCurrentContext(conversation: Conversation): boolean {
		// If focused on a task, conversation must match the task
		if (this.focusedTaskId) {
			return conversation.taskId === this.focusedTaskId;
		}

		// If in a focus area, conversation must match the focus area
		if (this.selectedAreaId) {
			return conversation.areaId === this.selectedAreaId;
		}

		// If in a space, conversation must match the space
		if (this.activeSpaceId) {
			return conversation.spaceId === this.activeSpaceId;
		}

		// Main view: conversation should have no space context
		return !conversation.spaceId;
	}

	/**
	 * Update a conversation's context (spaceId, areaId, taskId)
	 * Used by "Bring to Context" modal
	 */
	updateConversationContext(
		id: string,
		context: { spaceId?: string | null; areaId?: string | null; taskId?: string | null }
	): void {
		const conv = this.conversations.get(id);
		if (conv) {
			const updated = {
				...conv,
				spaceId: context.spaceId !== undefined ? context.spaceId : conv.spaceId,
				areaId: context.areaId !== undefined ? context.areaId : conv.areaId,
				taskId: context.taskId !== undefined ? context.taskId : conv.taskId,
				updatedAt: Date.now()
			};
			this.conversations.set(id, updated);
			this.schedulePersist();
			this.syncToApi(updated);
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
			this.syncToApi(conv);
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
				this.syncToApi(conv);
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
				// Note: Don't sync during streaming - will sync when streaming completes
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
				// Note: Don't sync during streaming - will sync when streaming completes
			}
		}
	}

	setStreaming(streaming: boolean, controller?: AbortController): void {
		this.isStreaming = streaming;
		this.abortController = controller || null;

		// Update generation activity store
		if (streaming) {
			generationActivityStore.startGeneration();
		} else {
			generationActivityStore.stopGeneration();
		}

		// Persist and sync when streaming completes
		if (!streaming && this.activeConversationId) {
			const conv = this.conversations.get(this.activeConversationId);
			if (conv) {
				this.schedulePersist();
				this.syncToApi(conv);
			}
		}
	}

	stopStreaming(): void {
		if (this.abortController) {
			this.abortController.abort();
		}
		this.isStreaming = false;
		this.abortController = null;

		// Stop generation activity tracking (defensive coverage)
		generationActivityStore.stopGeneration();

		if (this.activeConversationId) {
			const conv = this.conversations.get(this.activeConversationId);
			if (conv) {
				this.schedulePersist();
				this.syncToApi(conv);
			}
		}
	}

	updateConversationTitle(id: string, title: string): void {
		const conv = this.conversations.get(id);
		if (conv) {
			const updated = {
				...conv,
				title,
				updatedAt: Date.now()
			};
			this.conversations.set(id, updated);
			this.schedulePersist();
			this.syncToApi(updated);
		}
	}

	updateConversationModel(id: string, model: string): void {
		const conv = this.conversations.get(id);
		if (conv) {
			const updated = {
				...conv,
				model,
				updatedAt: Date.now()
			};
			this.conversations.set(id, updated);
			this.schedulePersist();
			this.syncToApi(updated);
		}
	}

	togglePin(id: string): void {
		const conv = this.conversations.get(id);
		if (conv) {
			const updated = {
				...conv,
				pinned: !conv.pinned
			};
			this.conversations.set(id, updated);
			this.schedulePersist();
			this.syncToApi(updated);
		}
	}

	setSummary(id: string, summary: StructuredSummary | string): void {
		const conv = this.conversations.get(id);
		if (conv) {
			const updated = {
				...conv,
				summary
			};
			this.conversations.set(id, updated);
			this._version++;
			this.schedulePersist();
			this.syncToApi(updated);
		}
	}

	clearSummary(id: string): void {
		const conv = this.conversations.get(id);
		if (conv) {
			const { summary: _, ...rest } = conv;
			const updated = rest as typeof conv;
			this.conversations.set(id, updated);
			this._version++;
			this.schedulePersist();
			this.syncToApi(updated);
		}
	}

	async deleteConversation(id: string): Promise<void> {
		// Optimistically delete from local state
		this.conversations.delete(id);
		if (this.activeConversationId === id) {
			const remaining = Array.from(this.conversations.keys());
			this.activeConversationId = remaining[0] || null;
		}
		this.schedulePersist();

		// Try to delete from API
		const success = await this.deleteFromApi(id);
		if (success) {
			toastStore.success('Conversation deleted');
		} else {
			toastStore.error('Failed to delete conversation');
		}
	}

	deleteMessage(conversationId: string, messageId: string): void {
		const conv = this.conversations.get(conversationId);
		if (conv) {
			const updated = {
				...conv,
				messages: conv.messages.filter((m) => m.id !== messageId),
				updatedAt: Date.now()
			};
			this.conversations.set(conversationId, updated);
			this._version++;
			this.schedulePersist();
			this.syncToApi(updated);
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
			const updated = {
				...conv,
				messages: conv.messages.slice(0, fromIndex),
				updatedAt: Date.now()
			};
			this.conversations.set(conversationId, updated);
			this._version++;
			this.schedulePersist();
			this.syncToApi(updated);
		}
	}

	// Update message content while preserving all other properties (like attachments)
	updateMessageContent(conversationId: string, messageId: string, newContent: string): void {
		const conv = this.conversations.get(conversationId);
		if (conv) {
			const msgIndex = conv.messages.findIndex((m) => m.id === messageId);
			if (msgIndex !== -1) {
				const updatedMessage = { ...conv.messages[msgIndex], content: newContent };
				const updated = {
					...conv,
					messages: [
						...conv.messages.slice(0, msgIndex),
						updatedMessage,
						...conv.messages.slice(msgIndex + 1)
					]
				};
				this.conversations.set(conversationId, updated);
				this._version++;
				this.schedulePersist();
				this.syncToApi(updated);
			}
		}
	}

	clearAll(): void {
		// Delete all conversations from API
		for (const id of this.conversations.keys()) {
			this.deleteFromApi(id);
		}

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

	/**
	 * Clear local cache only (for logout)
	 * Does NOT delete from database - just clears client-side state
	 * Use this when switching users or logging out
	 */
	clearCache(): void {
		this.conversations = new SvelteMap();
		this.activeConversationId = null;
		this.isStreaming = false;
		this.abortController = null;
		this._version = 0;
		this.activeSpaceId = null;
		this.selectedAreaId = null;
		this.focusedTaskId = null;
		this.routedModel = null;
		this.routingDecision = null;
		this.secondOpinion = null;
		this.assistState = null;

		// Clear localStorage cache
		if (typeof window !== 'undefined') {
			localStorage.removeItem(STORAGE_KEY);
		}
	}

	/**
	 * Clear only main nav conversations (those without a spaceId)
	 * Preserves all space/area conversations
	 */
	clearMainConversations(): number {
		const mainConversationIds: string[] = [];

		// Find all conversations without a spaceId
		for (const [id, conv] of this.conversations) {
			if (!conv.spaceId) {
				mainConversationIds.push(id);
			}
		}

		// Delete each from API and local store
		for (const id of mainConversationIds) {
			this.deleteFromApi(id);
			this.conversations.delete(id);
		}

		// Clear active conversation if it was a main nav conversation
		if (this.activeConversationId && mainConversationIds.includes(this.activeConversationId)) {
			this.activeConversationId = null;
		}

		this.schedulePersist();
		return mainConversationIds.length;
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
		this.syncToApi(duplicate);
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
			this.syncToApi(imported);
			return newId;
		} catch (e) {
			console.error('Failed to import conversation:', e);
			return null;
		}
	}

	// Force refresh from API
	async refresh(): Promise<void> {
		await this.syncFromApi();
	}

	// =====================================================
	// Second Opinion Methods
	// =====================================================

	/**
	 * Open second opinion panel and prepare for streaming
	 */
	openSecondOpinion(sourceMessageId: string, sourceMessageIndex: number, modelId: string): void {
		// Close any existing second opinion first
		this.closeSecondOpinion();

		this.secondOpinion = {
			isOpen: true,
			isStreaming: true,
			sourceMessageId,
			sourceMessageIndex,
			modelId,
			content: '',
			thinking: '',
			error: null,
			guidance: null
		};
	}

	/**
	 * Close second opinion panel and abort any streaming
	 */
	closeSecondOpinion(): void {
		if (this.secondOpinionAbortController) {
			this.secondOpinionAbortController.abort();
			this.secondOpinionAbortController = null;
		}
		this.secondOpinion = null;
	}

	/**
	 * Set the abort controller for second opinion streaming
	 */
	setSecondOpinionAbortController(controller: AbortController): void {
		this.secondOpinionAbortController = controller;
	}

	/**
	 * Append content to second opinion response
	 */
	appendToSecondOpinion(content: string): void {
		if (this.secondOpinion) {
			this.secondOpinion = {
				...this.secondOpinion,
				content: this.secondOpinion.content + content
			};
		}
	}

	/**
	 * Append thinking content to second opinion response
	 */
	appendToSecondOpinionThinking(thinkingContent: string): void {
		if (this.secondOpinion) {
			this.secondOpinion = {
				...this.secondOpinion,
				thinking: this.secondOpinion.thinking + thinkingContent
			};
		}
	}

	/**
	 * Set error state for second opinion
	 */
	setSecondOpinionError(error: string): void {
		if (this.secondOpinion) {
			this.secondOpinion = {
				...this.secondOpinion,
				isStreaming: false,
				error
			};
		}
	}

	/**
	 * Mark second opinion streaming as complete and extract guidance
	 */
	completeSecondOpinion(): void {
		if (this.secondOpinion) {
			// Extract the "Key Guidance" section from the content
			const guidance = this.extractGuidanceSection(this.secondOpinion.content);

			this.secondOpinion = {
				...this.secondOpinion,
				isStreaming: false,
				guidance
			};
		}
		this.secondOpinionAbortController = null;
	}

	/**
	 * Extract the "Key Guidance" section from second opinion content
	 * Looks for ## Key Guidance or similar headers
	 */
	private extractGuidanceSection(content: string): string | null {
		if (!content) return null;

		// Match "## Key Guidance" or "**Key Guidance**" or "Key Guidance:" patterns
		const patterns = [
			/##\s*Key\s*Guidance\s*\n([\s\S]*?)(?=\n##|$)/i,
			/\*\*Key\s*Guidance\*\*\s*\n([\s\S]*?)(?=\n\*\*|$)/i,
			/Key\s*Guidance:\s*\n([\s\S]*?)(?=\n[A-Z]|$)/i
		];

		for (const pattern of patterns) {
			const match = content.match(pattern);
			if (match && match[1]) {
				const extracted = match[1].trim();
				// Only return if we got meaningful content (more than just whitespace)
				if (extracted.length > 10) {
					return extracted;
				}
			}
		}

		return null;
	}

	/**
	 * Check if second opinion panel is open
	 */
	get isSecondOpinionOpen(): boolean {
		return this.secondOpinion?.isOpen ?? false;
	}

	// =====================================================
	// Assist Methods
	// =====================================================

	/**
	 * Activate an assist - enters assist mode
	 */
	activateAssist(assistId: string): void {
		// Close any existing assist first
		this.deactivateAssist();

		const assist = ASSISTS[assistId];
		if (!assist) {
			console.error(`Assist not found: ${assistId}`);
			return;
		}

		this.assistState = {
			isActive: true,
			assistId,
			assist,
			phase: 'collecting',
			tasks: [],
			selectedTaskId: null,
			isStreaming: false,
			content: '',
			thinking: '',
			error: null,
			sourceConversationId: this.activeConversationId
		};
	}

	/**
	 * Deactivate assist - exits assist mode
	 */
	deactivateAssist(): void {
		if (this.assistAbortController) {
			this.assistAbortController.abort();
			this.assistAbortController = null;
		}
		this.assistState = null;
	}

	/**
	 * Set streaming state for assist
	 */
	setAssistStreaming(streaming: boolean, controller?: AbortController): void {
		if (this.assistState) {
			this.assistState = {
				...this.assistState,
				isStreaming: streaming
			};
		}
		this.assistAbortController = controller || null;
	}

	/**
	 * Append content to assist response
	 */
	appendToAssistContent(content: string): void {
		if (this.assistState) {
			this.assistState = {
				...this.assistState,
				content: this.assistState.content + content
			};
		}
	}

	/**
	 * Append to assist thinking
	 */
	appendToAssistThinking(thinkingContent: string): void {
		if (this.assistState) {
			this.assistState = {
				...this.assistState,
				thinking: this.assistState.thinking + thinkingContent
			};
		}
	}

	/**
	 * Set assist error
	 */
	setAssistError(error: string): void {
		if (this.assistState) {
			this.assistState = {
				...this.assistState,
				isStreaming: false,
				error
			};
		}
	}

	/**
	 * Complete assist streaming
	 */
	completeAssist(): void {
		if (this.assistState) {
			this.assistState = {
				...this.assistState,
				isStreaming: false
			};
		}
		this.assistAbortController = null;
	}

	/**
	 * Check if assist mode is active
	 */
	get isAssistActive(): boolean {
		return this.assistState?.isActive ?? false;
	}

	// =====================================================
	// Task Management Methods (for task-breakdown assist)
	// =====================================================

	/**
	 * Set extracted tasks from AI response
	 */
	setAssistTasks(tasks: Array<{ id: string; text: string }>): void {
		if (this.assistState) {
			this.assistState = {
				...this.assistState,
				tasks: tasks.map((t) => ({
					id: t.id,
					text: t.text,
					status: 'pending' as const
				})),
				phase: 'confirming'
			};
		}
	}

	/**
	 * Confirm all pending tasks
	 */
	confirmAssistTasks(): void {
		if (this.assistState) {
			this.assistState = {
				...this.assistState,
				tasks: this.assistState.tasks.map((t) => ({
					...t,
					status: 'confirmed' as const
				})),
				phase: 'prioritizing'
			};
		}
	}

	/**
	 * Set assist phase
	 */
	setAssistPhase(phase: 'collecting' | 'confirming' | 'prioritizing' | 'focused'): void {
		if (this.assistState) {
			this.assistState = {
				...this.assistState,
				phase
			};
		}
	}

	/**
	 * Select a task to focus on
	 */
	selectAssistTask(taskId: string): void {
		if (this.assistState) {
			// Mark the selected task as in_progress
			const updatedTasks = this.assistState.tasks.map((t) => ({
				...t,
				status: t.id === taskId ? ('in_progress' as const) : t.status
			}));

			this.assistState = {
				...this.assistState,
				selectedTaskId: taskId,
				tasks: updatedTasks,
				phase: 'focused'
			};
		}
	}

	/**
	 * Update a task's text
	 */
	updateAssistTaskText(taskId: string, text: string): void {
		if (this.assistState) {
			this.assistState = {
				...this.assistState,
				tasks: this.assistState.tasks.map((t) => (t.id === taskId ? { ...t, text } : t))
			};
		}
	}

	/**
	 * Remove a task
	 */
	removeAssistTask(taskId: string): void {
		if (this.assistState) {
			this.assistState = {
				...this.assistState,
				tasks: this.assistState.tasks.filter((t) => t.id !== taskId)
			};
		}
	}

	/**
	 * Add a new task
	 */
	addAssistTask(text: string): void {
		if (this.assistState) {
			const newTask = {
				id: generateId(),
				text,
				status: 'pending' as const
			};
			this.assistState = {
				...this.assistState,
				tasks: [...this.assistState.tasks, newTask]
			};
		}
	}

	/**
	 * Reorder tasks (for priority)
	 */
	reorderAssistTasks(fromIndex: number, toIndex: number): void {
		if (this.assistState) {
			const tasks = [...this.assistState.tasks];
			const [removed] = tasks.splice(fromIndex, 1);
			tasks.splice(toIndex, 0, removed);

			// Update priority based on new order
			const reorderedTasks = tasks.map((t, i) => ({
				...t,
				priority: i + 1
			}));

			this.assistState = {
				...this.assistState,
				tasks: reorderedTasks
			};
		}
	}

	/**
	 * Get the currently selected task
	 */
	get selectedAssistTask() {
		if (!this.assistState?.selectedTaskId) return null;
		return this.assistState.tasks.find((t) => t.id === this.assistState?.selectedTaskId) || null;
	}

	/**
	 * Get task names as array (for prompts)
	 */
	get assistTaskNames(): string[] {
		return this.assistState?.tasks.map((t) => t.text) || [];
	}
}

// Export a singleton instance
export const chatStore = new ChatStore();
