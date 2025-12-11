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

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
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
