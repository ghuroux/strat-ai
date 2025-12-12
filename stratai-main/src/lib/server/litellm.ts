import { env } from '$env/dynamic/private';
import type { ChatCompletionRequest, LiteLLMModelsResponse, ThinkingConfig } from '$lib/types/api';
import {
	modelSupportsThinking,
	modelSupportsVision,
	getModelCapabilities,
	MODEL_CAPABILITIES
} from '$lib/config/model-capabilities';

function getBaseUrl(): string {
	return env.LITELLM_BASE_URL || 'http://localhost:4000';
}

function getApiKey(): string {
	return env.LITELLM_API_KEY || 'sk-1234';
}

/**
 * Check if a model supports extended thinking / reasoning
 * Uses the centralized model capabilities config
 */
export function supportsExtendedThinking(model: string): boolean {
	// First check the capabilities config
	if (MODEL_CAPABILITIES[model]) {
		return modelSupportsThinking(model);
	}

	// Fallback to pattern matching for unknown models
	const lowerModel = model.toLowerCase();

	// Claude models with thinking support
	if (lowerModel.includes('claude')) {
		// Claude 3.7 Sonnet - explicitly supports thinking
		if (lowerModel.includes('3-7') || lowerModel.includes('3.7')) {
			return true;
		}
		// Claude 4 or 4.5 models (Sonnet, Opus)
		if (lowerModel.includes('sonnet-4') || lowerModel.includes('4-sonnet') ||
			lowerModel.includes('opus-4') || lowerModel.includes('4-opus')) {
			return true;
		}
		// Claude Haiku 4.5 specifically
		if (lowerModel.includes('haiku-4-5') || lowerModel.includes('4-5-haiku')) {
			return true;
		}
		// Exclude Claude 3.5 and earlier
		if (lowerModel.includes('3-5') || lowerModel.includes('3.5')) {
			return false;
		}
	}

	// OpenAI o-series reasoning models
	if (lowerModel.startsWith('o3') || lowerModel.startsWith('o4')) {
		return true;
	}

	// GPT-5.x thinking models (not instant/chat-latest variants)
	if (lowerModel.includes('gpt-5') && !lowerModel.includes('chat-latest')) {
		return true;
	}

	return false;
}

/**
 * Fetch available models from LiteLLM
 */
export async function fetchModels(): Promise<LiteLLMModelsResponse> {
	const response = await fetch(`${getBaseUrl()}/v1/models`, {
		headers: {
			Authorization: `Bearer ${getApiKey()}`
		}
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to fetch models: ${response.status} ${errorText}`);
	}

	return response.json();
}

/**
 * Create a streaming chat completion request to LiteLLM
 * Returns the raw response for streaming
 */
export async function createChatCompletion(request: ChatCompletionRequest): Promise<Response> {
	// Build the request body
	const body: Record<string, unknown> = {
		model: request.model,
		messages: request.messages,
		stream: request.stream !== false, // Default to true unless explicitly false
		temperature: request.temperature,
		max_tokens: request.max_tokens
	};

	// Add thinking parameters for Claude models if enabled
	if (request.thinking && request.thinking.type === 'enabled' && supportsExtendedThinking(request.model)) {
		body.thinking = {
			type: 'enabled',
			budget_tokens: request.thinking.budget_tokens || 10000
		};
		// When thinking is enabled, we need to ensure max_tokens > budget_tokens
		// Also, temperature must be 1 for extended thinking (API requirement)
		body.temperature = 1;
		if (body.max_tokens && request.thinking.budget_tokens) {
			body.max_tokens = Math.max(body.max_tokens as number, request.thinking.budget_tokens + 1000);
		}
	}

	const response = await fetch(`${getBaseUrl()}/v1/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${getApiKey()}`
		},
		body: JSON.stringify(body)
	});

	return response;
}

/**
 * Check if a model supports interleaved thinking (thinking + tools combined)
 * Interleaved thinking is only available on Claude 4+ models (not 3.7)
 */
export function supportsInterleavedThinking(model: string): boolean {
	const lowerModel = model.toLowerCase();

	// Must be a Claude model for interleaved thinking (Anthropic-specific feature)
	if (!lowerModel.includes('claude')) {
		return false;
	}

	// Only Claude 4+ models support interleaved thinking
	// Claude 3.7 supports extended thinking but NOT interleaved thinking with tools
	if (lowerModel.includes('sonnet-4') || lowerModel.includes('4-sonnet') ||
		lowerModel.includes('opus-4') || lowerModel.includes('4-opus') ||
		lowerModel.includes('haiku-4-5') || lowerModel.includes('4-5-haiku')) {
		return true;
	}

	return false;
}

/**
 * Check if a model supports vision/image input
 * Uses the centralized model capabilities config
 */
export function supportsVision(model: string): boolean {
	// First check the capabilities config
	if (MODEL_CAPABILITIES[model]) {
		return modelSupportsVision(model);
	}

	// Fallback: most modern models support vision
	const lowerModel = model.toLowerCase();

	// o3-mini does NOT support vision
	if (lowerModel === 'o3-mini') {
		return false;
	}

	// All Claude models support vision
	if (lowerModel.includes('claude')) {
		return true;
	}

	// All GPT-4o, GPT-4.1, GPT-5.x support vision
	if (lowerModel.includes('gpt-4o') || lowerModel.includes('gpt-4.1') || lowerModel.includes('gpt-5')) {
		return true;
	}

	// o3 and o4-mini support vision
	if (lowerModel === 'o3' || lowerModel === 'o4-mini') {
		return true;
	}

	return true; // Default to true for unknown models
}

/**
 * Create a chat completion request with tools
 * Used for function calling / tool use
 * Supports extended thinking with interleaved-thinking beta for Claude 4+ models
 */
export async function createChatCompletionWithTools(request: ChatCompletionRequest & { tools?: unknown[] }): Promise<Response> {
	// Build the request body
	const body: Record<string, unknown> = {
		model: request.model,
		messages: request.messages,
		temperature: request.temperature,
		max_tokens: request.max_tokens,
		tools: request.tools,
		stream: request.stream ?? false // Default to non-streaming for tool detection
	};

	// Build headers
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${getApiKey()}`
	};

	// Add thinking parameters for Claude models if enabled
	// Interleaved thinking (thinking + tools) only works on Claude 4+ models
	const thinkingEnabled = request.thinking && request.thinking.type === 'enabled';
	const modelSupportsInterleaved = supportsInterleavedThinking(request.model);

	if (thinkingEnabled && modelSupportsInterleaved) {
		body.thinking = {
			type: 'enabled',
			budget_tokens: request.thinking!.budget_tokens || 10000
		};
		// Temperature must be 1 for extended thinking
		body.temperature = 1;
		// Ensure max_tokens can accommodate thinking + response
		if (body.max_tokens && request.thinking!.budget_tokens) {
			body.max_tokens = Math.max(body.max_tokens as number, request.thinking!.budget_tokens + 1000);
		}
		// Pass interleaved thinking beta header through LiteLLM's extra_headers
		// This is the LiteLLM way to forward anthropic-beta headers
		body.extra_headers = {
			'anthropic-beta': 'interleaved-thinking-2025-05-14'
		};
	}

	const response = await fetch(`${getBaseUrl()}/v1/chat/completions`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});

	return response;
}

/**
 * Map LiteLLM errors to user-friendly messages
 */
export function mapErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		const message = error.message.toLowerCase();

		if (message.includes('rate limit')) {
			return 'Rate limit exceeded. Please try again in a moment.';
		}
		if (message.includes('invalid api key') || message.includes('authentication')) {
			return 'Authentication failed. Please check the API configuration.';
		}
		if (message.includes('model not found') || message.includes('does not exist')) {
			return 'The selected model is not available.';
		}
		if (message.includes('timeout')) {
			return 'Request timed out. Please try again.';
		}
		if (message.includes('context length') || message.includes('too long')) {
			return 'Message is too long. Please try a shorter message.';
		}

		return error.message;
	}

	return 'An unexpected error occurred.';
}
