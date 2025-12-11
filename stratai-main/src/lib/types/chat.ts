export interface SearchSource {
	title: string;
	url: string;
	snippet: string;
}

export interface FileAttachment {
	id: string;
	filename: string;
	mimeType: string;
	size: number;
	content: string;
	truncated: boolean;
	charCount?: number;
	pageCount?: number;
}

export interface Message {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: number;
	isStreaming?: boolean;
	error?: string;
	// Web search fields
	searchStatus?: 'searching' | 'complete';
	searchQuery?: string;
	sources?: SearchSource[];
	// File attachments
	attachments?: FileAttachment[];
	// Extended thinking (Claude models)
	thinking?: string;
	isThinking?: boolean;
}

export interface Conversation {
	id: string;
	title: string;
	messages: Message[];
	model: string;
	createdAt: number;
	updatedAt: number;
	pinned?: boolean;
	summary?: string;
	// Context compacting / session continuation fields
	continuedFromId?: string; // ID of conversation this was continued from
	continuationSummary?: string; // Summary used to start this conversation
	refreshedAt?: number; // Timestamp when session was refreshed
	// Future multi-tenant fields:
	// userId: string;
	// tenantId?: string;
	// sharedWith?: string[];
}

export interface ChatState {
	conversations: Map<string, Conversation>;
	activeConversationId: string | null;
	isStreaming: boolean;
	abortController: AbortController | null;
}

// Future user type for multi-tenant upgrade
export interface User {
	id: string;
	email: string;
	name: string;
	tenantId?: string;
	role: 'admin' | 'user' | 'viewer';
	createdAt: number;
}
