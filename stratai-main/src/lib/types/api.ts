export interface LiteLLMModel {
	id: string;
	object: string;
	created: number;
	owned_by: string;
}

export interface LiteLLMModelsResponse {
	object: string;
	data: LiteLLMModel[];
}

// Prompt caching control (Anthropic)
export interface CacheControl {
	type: 'ephemeral';
	ttl?: '5m' | '1h';
}

// Vision content block types (OpenAI format) with optional cache control
export interface TextContentBlock {
	type: 'text';
	text: string;
	cache_control?: CacheControl;
}

export interface ImageUrlContentBlock {
	type: 'image_url';
	image_url: {
		url: string;
		format?: string;
	};
	cache_control?: CacheControl;
}

export type MessageContentBlock = TextContentBlock | ImageUrlContentBlock;

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string | MessageContentBlock[] | null;
	// Tool-related properties
	tool_calls?: Array<{
		id: string;
		function: {
			name: string;
			arguments: string;
		};
	}>;
	tool_call_id?: string;
}

// Extended thinking configuration for Claude models
export interface ThinkingConfig {
	type: 'enabled' | 'disabled';
	budget_tokens?: number; // Minimum 1024, must be less than max_tokens
}

export interface ChatCompletionRequest {
	model: string;
	messages: ChatMessage[];
	stream?: boolean;
	temperature?: number;
	max_tokens?: number;
	tools?: ToolDefinition[];
	searchEnabled?: boolean;
	// Extended thinking for Claude
	thinking?: ThinkingConfig;
	thinkingEnabled?: boolean;
	thinkingBudgetTokens?: number;
	// AUTO model routing
	// When model is 'auto' or 'AUTO', the router selects the optimal model
	provider?: 'anthropic' | 'openai' | 'google'; // Preferred provider for AUTO mode
	currentModel?: string; // Model used in previous turns (for cache coherence)
	conversationTurn?: number; // Turn count in conversation
	// Space context for space-aware prompts
	space?: 'work' | 'research' | 'random' | 'personal' | null;
	// Assist context for assist-specific system prompts
	assistId?: string | null;
	// Assist phase and task context
	assistPhase?: 'collecting' | 'confirming' | 'prioritizing' | 'focused' | null;
	assistTasks?: string[] | null; // Task names for context
	assistFocusedTask?: string | null; // Name of the currently focused task
	// Persistent task focus (from task store, not assist flow)
	focusedTask?: {
		title: string;
		priority: 'normal' | 'high';
		dueDate?: string;
		dueDateType?: 'hard' | 'soft';
		// Subtask context for injecting planning conversation
		isSubtask?: boolean;
		parentTaskTitle?: string;
		sourceConversationId?: string; // Plan Mode conversation ID for context injection
	} | null;
	// Plan Mode for guided task breakdown
	planMode?: {
		taskId: string;
		taskTitle: string;
		phase: 'eliciting' | 'proposing' | 'confirming';
		exchangeCount?: number; // Tracks conversation depth for prompt selection
		priority?: 'normal' | 'high';
		dueDate?: string | null;
		dueDateType?: 'hard' | 'soft' | null;
		createdAt?: string;
	} | null;
	// Area context (specialized context within a space)
	areaId?: string | null;
	// Custom system prompt (e.g., for Page Discussion with page content context)
	systemPrompt?: string | null;
}

// Tool use types for Claude
export interface ToolDefinition {
	name: string;
	description: string;
	input_schema: {
		type: 'object';
		properties: Record<string, {
			type: string;
			description: string;
		}>;
		required: string[];
	};
}

export interface ToolUseBlock {
	type: 'tool_use';
	id: string;
	name: string;
	input: Record<string, unknown>;
}

export interface ToolResultBlock {
	type: 'tool_result';
	tool_use_id: string;
	content: string;
}

export interface ContentBlock {
	type: 'text' | 'tool_use';
	text?: string;
	id?: string;
	name?: string;
	input?: Record<string, unknown>;
}

export interface ChatCompletionChunk {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		delta: {
			role?: string;
			content?: string;
		};
		finish_reason: string | null;
	}>;
}

export interface ChatCompletionError {
	error: {
		message: string;
		type: string;
		code?: string;
	};
}

export interface ApiError {
	error: {
		message: string;
		type: string;
		code?: string;
	};
}

// Usage statistics including cache information
export interface UsageInfo {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
	// Cache-specific fields (Anthropic)
	cache_creation_input_tokens?: number;
	cache_read_input_tokens?: number;
	// Detailed cache breakdown
	cache_creation?: {
		ephemeral_5m_input_tokens?: number;
		ephemeral_1h_input_tokens?: number;
	};
}

// Response with usage for non-streaming requests
export interface ChatCompletionResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		message: {
			role: string;
			content: string | null;
		};
		finish_reason: string | null;
	}>;
	usage?: UsageInfo;
}
