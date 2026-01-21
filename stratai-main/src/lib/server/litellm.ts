import { env } from '$env/dynamic/private';
import type { ChatCompletionRequest, LiteLLMModelsResponse, ThinkingConfig } from '$lib/types/api';
import {
	modelSupportsThinking,
	modelSupportsVision,
	getModelCapabilities,
	MODEL_CAPABILITIES,
	getConstrainedTemperature,
	type ModelCapabilities
} from '$lib/config/model-capabilities';

function getBaseUrl(): string {
	return env.LITELLM_BASE_URL || 'http://localhost:4000';
}

function getApiKey(): string {
	return env.LITELLM_API_KEY || 'sk-1234';
}

/**
 * Check if a model is an OpenAI reasoning model that doesn't support temperature
 * These models use reasoning_effort instead of temperature for controlling behavior
 */
export function isOpenAIReasoningModel(model: string): boolean {
	const capabilities = getModelCapabilities(model);
	if (capabilities) {
		// If it's an OpenAI model with thinking support and reasoning effort levels,
		// it's a reasoning model that doesn't support temperature
		if (capabilities.provider === 'openai' &&
			capabilities.supportsThinking &&
			!!capabilities.reasoningEffortLevels) {
			return true;
		}
	}

	// Fallback pattern matching for unknown models
	// All o-series and GPT-5.x (except instant) are reasoning models
	const lowerModel = model.toLowerCase();
	return (
		lowerModel.startsWith('o3') ||
		lowerModel.startsWith('o4') ||
		(lowerModel.includes('gpt-5') && !lowerModel.includes('chat-latest') && !lowerModel.includes('instant'))
	);
}

/**
 * Check if a model is an Anthropic Claude model
 */
export function isClaudeModel(model: string): boolean {
	const capabilities = getModelCapabilities(model);
	if (capabilities) {
		return capabilities.provider === 'anthropic';
	}
	// Fallback pattern matching
	return model.toLowerCase().includes('claude');
}

/**
 * Check if a model is an Anthropic Claude model that uses thinking blocks
 */
export function isClaudeThinkingModel(model: string): boolean {
	const capabilities = getModelCapabilities(model);
	if (capabilities) {
		return capabilities.provider === 'anthropic' && capabilities.supportsThinking;
	}

	// Fallback pattern matching
	const lowerModel = model.toLowerCase();
	if (!lowerModel.includes('claude')) return false;

	// Claude 3.7+ supports thinking
	if (lowerModel.includes('3-7') || lowerModel.includes('3.7')) return true;
	if (lowerModel.includes('sonnet-4') || lowerModel.includes('4-sonnet')) return true;
	if (lowerModel.includes('opus-4') || lowerModel.includes('4-opus')) return true;
	if (lowerModel.includes('haiku-4-5') || lowerModel.includes('4-5-haiku')) return true;

	return false;
}

/**
 * Get the appropriate reasoning effort level for OpenAI models
 * Maps our thinking budget to OpenAI's reasoning effort levels
 */
export function getReasoningEffort(model: string, budgetTokens?: number): 'low' | 'medium' | 'high' {
	const capabilities = getModelCapabilities(model);
	const availableLevels = capabilities?.reasoningEffortLevels || ['low', 'medium', 'high'];

	// Map budget tokens to effort level
	// Default budget is 10000, max typically 32000
	if (!budgetTokens || budgetTokens <= 5000) {
		return availableLevels.includes('low') ? 'low' : 'medium';
	} else if (budgetTokens <= 15000) {
		return 'medium';
	} else {
		return availableLevels.includes('high') ? 'high' : 'medium';
	}
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
 * Fetch available models from LiteLLM with extended model info
 * Combines /v1/models (basic list) with /model/info (detailed capabilities)
 */
export async function fetchModels(): Promise<LiteLLMModelsResponse> {
	const baseUrl = getBaseUrl();
	const headers = { Authorization: `Bearer ${getApiKey()}` };

	// Fetch basic models list
	const modelsResponse = await fetch(`${baseUrl}/v1/models`, { headers });
	if (!modelsResponse.ok) {
		const errorText = await modelsResponse.text();
		throw new Error(`Failed to fetch models: ${modelsResponse.status} ${errorText}`);
	}
	const modelsData: LiteLLMModelsResponse = await modelsResponse.json();

	// Try to fetch extended model info (may not be available on all LiteLLM versions)
	try {
		const infoResponse = await fetch(`${baseUrl}/model/info`, { headers });
		if (infoResponse.ok) {
			const infoData = await infoResponse.json();

			// Build a map of model_name -> model_info for quick lookup
			const infoMap = new Map<string, Record<string, unknown>>();
			for (const item of infoData.data || []) {
				if (item.model_name && item.model_info) {
					infoMap.set(item.model_name, item.model_info);
				}
			}

			// Enrich models with extended info
			modelsData.data = modelsData.data.map(model => {
				const info = infoMap.get(model.id);
				if (info) {
					return {
						...model,
						mode: info.mode as string | undefined,
						max_tokens: info.max_tokens as number | undefined,
						max_input_tokens: info.max_input_tokens as number | undefined,
						max_output_tokens: info.max_output_tokens as number | undefined,
						litellm_provider: info.litellm_provider as string | undefined,
						supports_vision: info.supports_vision as boolean | undefined,
						supports_function_calling: info.supports_function_calling as boolean | undefined,
						supports_reasoning: info.supports_reasoning as boolean | undefined
					};
				}
				return model;
			});
		}
	} catch (e) {
		// Model info enrichment is optional - continue with basic info
		console.warn('[LiteLLM] Could not fetch extended model info:', e);
	}

	return modelsData;
}

/**
 * Create a streaming chat completion request to LiteLLM
 * Returns the raw response for streaming
 */
export async function createChatCompletion(request: ChatCompletionRequest): Promise<Response> {
	// Check if this is an OpenAI reasoning model (they don't support temperature)
	const isReasoningModel = isOpenAIReasoningModel(request.model);

	// Build the request body
	const isStreaming = request.stream !== false; // Default to true unless explicitly false
	const body: Record<string, unknown> = {
		model: request.model,
		messages: request.messages,
		stream: isStreaming,
		max_tokens: request.max_tokens
	};

	// Request usage data in streaming responses (required for usage tracking)
	if (isStreaming) {
		body.stream_options = { include_usage: true };
	}

	// Only add temperature for non-reasoning models (OpenAI reasoning models don't support it)
	if (!isReasoningModel) {
		// Apply model-specific constraints (e.g., instant models require temp=1)
		const constrainedTemp = getConstrainedTemperature(request.model, request.temperature);
		if (constrainedTemp !== undefined) {
			body.temperature = constrainedTemp;
		}
	}

	const thinkingEnabled = request.thinking && request.thinking.type === 'enabled';
	const modelSupportsThinkingCapability = supportsExtendedThinking(request.model);

	if (thinkingEnabled && modelSupportsThinkingCapability) {
		// Check if this is a Claude model (uses thinking blocks) or OpenAI model (uses reasoning_effort)
		if (isClaudeThinkingModel(request.model)) {
			// Anthropic Claude: use thinking parameter with budget_tokens
			body.thinking = {
				type: 'enabled',
				budget_tokens: request.thinking!.budget_tokens || 10000
			};
			// When thinking is enabled, we need to ensure max_tokens > budget_tokens
			// Also, temperature must be 1 for extended thinking (API requirement)
			body.temperature = 1;
			if (body.max_tokens && request.thinking!.budget_tokens) {
				body.max_tokens = Math.max(body.max_tokens as number, request.thinking!.budget_tokens + 1000);
			}
		} else if (isReasoningModel) {
			// OpenAI reasoning models: use reasoning_effort parameter
			// Note: OpenAI reasoning tokens are hidden by default, not streamed like Anthropic's
			// Temperature is NOT supported for these models
			body.reasoning_effort = getReasoningEffort(request.model, request.thinking!.budget_tokens);
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
	// Check if this is an OpenAI reasoning model (they don't support temperature)
	const isReasoningModel = isOpenAIReasoningModel(request.model);

	// Build the request body
	const isStreaming = request.stream === true; // Default to non-streaming for tool detection
	const body: Record<string, unknown> = {
		model: request.model,
		messages: request.messages,
		max_tokens: request.max_tokens,
		tools: request.tools,
		stream: isStreaming
	};

	// Request usage data in streaming responses (required for usage tracking)
	if (isStreaming) {
		body.stream_options = { include_usage: true };
	}

	// Only add temperature for non-reasoning models (OpenAI reasoning models don't support it)
	if (!isReasoningModel) {
		// Apply model-specific constraints (e.g., instant models require temp=1)
		const constrainedTemp = getConstrainedTemperature(request.model, request.temperature);
		if (constrainedTemp !== undefined) {
			body.temperature = constrainedTemp;
		}
	}

	// Build headers
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${getApiKey()}`
	};

	// Add thinking/reasoning parameters if enabled
	const thinkingEnabled = request.thinking && request.thinking.type === 'enabled';

	if (thinkingEnabled) {
		// Check if this is a Claude model with interleaved thinking support
		const modelSupportsInterleaved = supportsInterleavedThinking(request.model);

		if (modelSupportsInterleaved) {
			// Anthropic Claude 4+: use thinking parameter with interleaved-thinking beta
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
		} else if (isReasoningModel) {
			// OpenAI reasoning models: use reasoning_effort parameter
			// Note: OpenAI reasoning tokens are hidden by default, not streamed
			// Temperature is NOT supported for these models
			body.reasoning_effort = getReasoningEffort(request.model, request.thinking!.budget_tokens);
		}
	}

	// Add token-efficient tools header for Claude models
	// This reduces output tokens by 14-70% for tool use responses
	// See: https://docs.anthropic.com/en/docs/build-with-claude/tool-use#token-efficient-tool-use-beta
	if (isClaudeModel(request.model) && request.tools && request.tools.length > 0) {
		const tokenEfficientBeta = 'token-efficient-tools-2025-02-19';
		const existingHeaders = body.extra_headers as Record<string, string> | undefined;
		const existingBeta = existingHeaders?.['anthropic-beta'];

		body.extra_headers = {
			...existingHeaders,
			'anthropic-beta': existingBeta
				? `${existingBeta},${tokenEfficientBeta}`
				: tokenEfficientBeta
		};
	}

	const response = await fetch(`${getBaseUrl()}/v1/chat/completions`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	});

	return response;
}

// ============================================================================
// Document Summarization
// ============================================================================

const SUMMARY_MODEL = 'claude-haiku-4-5';
const SUMMARY_MAX_TOKENS = 350; // Buffer for complete sentences (target ~250 tokens)

const SUMMARY_SYSTEM_PROMPT = `You are a document summarizer. Create a concise summary that captures:
1. Document type (report, email, code, notes, specification, etc.)
2. Main topic or purpose
3. Key entities (people, companies, projects, dates, technologies)
4. 2-3 most important points or takeaways

IMPORTANT: Keep the summary under 250 tokens. Always complete your final sentence - never stop mid-sentence. If running low on space, finish your current point and stop. Use bullet points for clarity. Be specific and factual.`;

/**
 * Generate a summary for a document using a fast, cheap model (Haiku)
 * Used for cost-efficient document context in conversations
 *
 * @param content - The full document content to summarize
 * @param filename - The document filename for context
 * @returns Summary text and token usage for cost tracking
 */
export async function generateDocumentSummary(
	content: string,
	filename: string
): Promise<{ summary: string; inputTokens: number; outputTokens: number }> {
	// Truncate very long documents to avoid excessive costs
	// ~100k chars = ~25k tokens, which is reasonable for Haiku's 200k context
	const maxContentLength = 100000;
	const truncatedContent = content.length > maxContentLength
		? content.slice(0, maxContentLength) + '\n\n[Content truncated for summarization]'
		: content;

	const response = await fetch(`${getBaseUrl()}/v1/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${getApiKey()}`
		},
		body: JSON.stringify({
			model: SUMMARY_MODEL,
			messages: [
				{ role: 'system', content: SUMMARY_SYSTEM_PROMPT },
				{ role: 'user', content: `Summarize this document (${filename}):\n\n${truncatedContent}` }
			],
			max_tokens: SUMMARY_MAX_TOKENS,
			temperature: 0.3, // Lower temperature for consistent summaries
			stream: false
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Document summarization failed: ${response.status} - ${errorText}`);
	}

	const data = await response.json();
	const summary = data.choices?.[0]?.message?.content || '';
	const finishReason = data.choices?.[0]?.finish_reason;

	// Log warning if output was truncated due to token limit
	if (finishReason === 'length') {
		console.warn(`[Summarization] Warning: Summary for "${filename}" was truncated (hit max_tokens). Consider increasing SUMMARY_MAX_TOKENS.`);
	}

	return {
		summary,
		inputTokens: data.usage?.prompt_tokens || 0,
		outputTokens: data.usage?.completion_tokens || 0
	};
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
