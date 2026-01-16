export interface SearchSource {
	title: string;
	url: string;
	snippet: string;
}

// Content types for file attachments
export type TextContent = {
	type: 'text';
	data: string;
};

export type ImageContent = {
	type: 'image';
	mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
	data: string; // base64 encoded
};

export type AttachmentContent = TextContent | ImageContent;

export interface FileAttachment {
	id: string;
	filename: string;
	mimeType: string;
	size: number;
	content: AttachmentContent;
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
	// Web search and document reading fields
	searchStatus?: 'searching' | 'reading_document' | 'complete';
	searchQuery?: string;
	sources?: SearchSource[];
	// File attachments
	attachments?: FileAttachment[];
	// Extended thinking (Claude models)
	thinking?: string;
	isThinking?: boolean;
	// Hidden messages (not shown in UI but included in API context)
	hidden?: boolean;
}

export interface SummaryPoint {
	text: string;
	messageIndices: number[];
}

export interface StructuredSummary {
	points: SummaryPoint[];
}

// Space types for productivity environments
// Note: Only 'personal' is a system space; others are custom or org spaces
export type SpaceType = 'personal' | string;

export interface SpaceConfig {
	id: SpaceType;
	name: string;
	icon: string;
	accentColor: string;
	description: string;
}

export interface Conversation {
	id: string;
	title: string;
	messages: Message[];
	model: string;
	createdAt: number;
	updatedAt: number;
	lastViewedAt?: number; // When user last opened/viewed this conversation
	pinned?: boolean;
	summary?: StructuredSummary | string; // Can be structured or legacy string
	// Context compacting / session continuation fields
	continuedFromId?: string; // ID of conversation this was continued from
	continuationSummary?: string; // Summary used to start this conversation
	refreshedAt?: number; // Timestamp when session was refreshed
	// Space and organization
	spaceId?: string | null; // FK to spaces table (system space id = slug, custom = UUID)
	areaId?: string | null; // FK to areas table
	taskId?: string | null; // FK to tasks table for deep work mode (Phase C)
	tags?: string[]; // For template auto-tagging and filtering
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
