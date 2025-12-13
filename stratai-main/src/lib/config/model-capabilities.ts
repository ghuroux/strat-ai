/**
 * Model Capabilities Configuration
 *
 * This file maps all available models to their capabilities including:
 * - Context window size (input tokens)
 * - Max output tokens
 * - Extended thinking / reasoning support
 * - Vision (image) support
 * - Tool use support
 *
 * Last updated: December 2025
 */

export interface ModelCapabilities {
	/** Display name for the model */
	displayName: string;
	/** Provider (anthropic, openai, meta, amazon, deepseek, mistral, google) */
	provider: 'anthropic' | 'openai' | 'meta' | 'amazon' | 'deepseek' | 'mistral' | 'google';
	/** Context window size in tokens */
	contextWindow: number;
	/** Maximum output tokens */
	maxOutputTokens: number;
	/** Whether the model supports extended thinking / reasoning */
	supportsThinking: boolean;
	/** Whether the model supports vision/image input */
	supportsVision: boolean;
	/** Whether the model supports tool use / function calling */
	supportsTools: boolean;
	/** Optional: reasoning effort levels for OpenAI o-series */
	reasoningEffortLevels?: ('low' | 'medium' | 'high' | 'xhigh')[];
	/** Optional: description of the model */
	description?: string;
	/** Optional: pricing info (per million tokens) */
	pricing?: {
		input: number;
		output: number;
	};
}

export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
	// ============================================
	// ANTHROPIC CLAUDE MODELS
	// ============================================

	'claude-opus-4-5': {
		displayName: 'Claude Opus 4.5',
		provider: 'anthropic',
		contextWindow: 200000,
		maxOutputTokens: 64000,
		supportsThinking: true,
		supportsVision: true,
		supportsTools: true,
		description: 'Most capable Claude model for complex reasoning',
		pricing: { input: 5, output: 25 }
	},

	'claude-sonnet-4-5': {
		displayName: 'Claude Sonnet 4.5',
		provider: 'anthropic',
		contextWindow: 200000, // 1M available in beta
		maxOutputTokens: 64000,
		supportsThinking: true,
		supportsVision: true,
		supportsTools: true,
		description: 'Best balance of performance, speed, and cost',
		pricing: { input: 3, output: 15 }
	},

	'claude-sonnet-4': {
		displayName: 'Claude Sonnet 4',
		provider: 'anthropic',
		contextWindow: 200000, // 1M available in beta
		maxOutputTokens: 64000,
		supportsThinking: true,
		supportsVision: true,
		supportsTools: true,
		description: 'Previous generation Sonnet model',
		pricing: { input: 3, output: 15 }
	},

	'claude-3-7-sonnet': {
		displayName: 'Claude 3.7 Sonnet',
		provider: 'anthropic',
		contextWindow: 200000,
		maxOutputTokens: 64000, // 128K in beta
		supportsThinking: true,
		supportsVision: true,
		supportsTools: true,
		description: 'Claude 3.7 with full thinking output',
		pricing: { input: 3, output: 15 }
	},

	'claude-haiku-4-5': {
		displayName: 'Claude Haiku 4.5',
		provider: 'anthropic',
		contextWindow: 200000,
		maxOutputTokens: 64000,
		supportsThinking: true,
		supportsVision: true,
		supportsTools: true,
		description: 'Fast and cost-effective with thinking support',
		pricing: { input: 1, output: 5 }
	},

	'claude-3-5-haiku': {
		displayName: 'Claude 3.5 Haiku',
		provider: 'anthropic',
		contextWindow: 200000,
		maxOutputTokens: 8000,
		supportsThinking: false, // Does NOT support extended thinking
		supportsVision: true,
		supportsTools: true,
		description: 'Legacy fast model, no extended thinking',
		pricing: { input: 0.8, output: 4 }
	},

	// ============================================
	// OPENAI GPT-5.2 SERIES (Latest - Dec 2025)
	// ============================================

	'gpt-5.2': {
		displayName: 'GPT-5.2',
		provider: 'openai',
		contextWindow: 400000,
		maxOutputTokens: 128000,
		supportsThinking: true,
		supportsVision: true,
		supportsTools: true,
		reasoningEffortLevels: ['low', 'medium', 'high', 'xhigh'],
		description: 'Latest flagship with reasoning',
		pricing: { input: 1.75, output: 14 }
	},

	'gpt-5.2-pro': {
		displayName: 'GPT-5.2 Pro',
		provider: 'openai',
		contextWindow: 400000,
		maxOutputTokens: 128000,
		supportsThinking: true,
		supportsVision: true,
		supportsTools: true,
		reasoningEffortLevels: ['medium', 'high', 'xhigh'],
		description: 'Premium reasoning for maximum accuracy'
	},

	'gpt-5.2-chat-latest': {
		displayName: 'GPT-5.2 Instant',
		provider: 'openai',
		contextWindow: 400000,
		maxOutputTokens: 128000,
		supportsThinking: false, // Instant/speed-optimized
		supportsVision: true,
		supportsTools: true,
		description: 'Speed-optimized for routine queries'
	},

	// ============================================
	// OPENAI GPT-5.1 SERIES
	// ============================================

	'gpt-5.1': {
		displayName: 'GPT-5.1',
		provider: 'openai',
		contextWindow: 400000,
		maxOutputTokens: 128000,
		supportsThinking: true,
		supportsVision: true,
		supportsTools: true,
		reasoningEffortLevels: ['low', 'medium', 'high'],
		description: 'Flagship for coding & agentic tasks with adaptive reasoning'
	},

	'gpt-5.1-chat-latest': {
		displayName: 'GPT-5.1 Instant',
		provider: 'openai',
		contextWindow: 128000,
		maxOutputTokens: 16384,
		supportsThinking: false, // Instant version
		supportsVision: true,
		supportsTools: true,
		description: 'Instant version with smaller context'
	},

	'gpt-5.1-codex-max': {
		displayName: 'GPT-5.1 Codex Max',
		provider: 'openai',
		contextWindow: 400000,
		maxOutputTokens: 128000,
		supportsThinking: true,
		supportsVision: true,
		supportsTools: true,
		reasoningEffortLevels: ['low', 'medium', 'high'],
		description: 'Optimized for agentic coding and multi-context workflows'
	},

	'gpt-5.1-codex-mini': {
		displayName: 'GPT-5.1 Codex Mini',
		provider: 'openai',
		contextWindow: 400000,
		maxOutputTokens: 128000,
		supportsThinking: true,
		supportsVision: true,
		supportsTools: true,
		reasoningEffortLevels: ['low', 'medium', 'high'],
		description: 'Cost-effective Codex with 4x efficiency'
	},

	// ============================================
	// OPENAI GPT-4 SERIES
	// ============================================

	'gpt-4o': {
		displayName: 'GPT-4o',
		provider: 'openai',
		contextWindow: 128000,
		maxOutputTokens: 16384,
		supportsThinking: false,
		supportsVision: true,
		supportsTools: true,
		description: 'Multimodal model for text and images'
	},

	'gpt-4o-mini': {
		displayName: 'GPT-4o Mini',
		provider: 'openai',
		contextWindow: 128000,
		maxOutputTokens: 16384,
		supportsThinking: false,
		supportsVision: true,
		supportsTools: true,
		description: 'Cost-efficient multimodal model'
	},

	'gpt-4.1': {
		displayName: 'GPT-4.1',
		provider: 'openai',
		contextWindow: 1000000,
		maxOutputTokens: 32768,
		supportsThinking: false,
		supportsVision: true,
		supportsTools: true,
		description: '1M context window, great for coding'
	},

	'gpt-4.1-mini': {
		displayName: 'GPT-4.1 Mini',
		provider: 'openai',
		contextWindow: 1000000,
		maxOutputTokens: 32768,
		supportsThinking: false,
		supportsVision: true,
		supportsTools: true,
		description: 'Cost-efficient 1M context model'
	},

	// ============================================
	// OPENAI O-SERIES REASONING MODELS
	// ============================================

	'o3': {
		displayName: 'o3',
		provider: 'openai',
		contextWindow: 200000,
		maxOutputTokens: 100000,
		supportsThinking: true,
		supportsVision: true,
		supportsTools: true,
		reasoningEffortLevels: ['low', 'medium', 'high'],
		description: 'Flagship reasoning model with vision'
	},

	'o3-mini': {
		displayName: 'o3 Mini',
		provider: 'openai',
		contextWindow: 200000,
		maxOutputTokens: 100000,
		supportsThinking: true,
		supportsVision: false, // No vision support
		supportsTools: true,
		reasoningEffortLevels: ['low', 'medium', 'high'],
		description: 'Cost-efficient reasoning without vision'
	},

	'o4-mini': {
		displayName: 'o4 Mini',
		provider: 'openai',
		contextWindow: 200000,
		maxOutputTokens: 100000,
		supportsThinking: true,
		supportsVision: true,
		supportsTools: true,
		reasoningEffortLevels: ['low', 'medium', 'high'],
		description: 'Latest small reasoning model with vision'
	},

	// ============================================
	// AWS BEDROCK MODELS - Meta Llama
	// ============================================

	'llama-3-3-70b': {
		displayName: 'Llama 3.3 70B',
		provider: 'meta',
		contextWindow: 128000,
		maxOutputTokens: 4096,
		supportsThinking: false,
		supportsVision: false,
		supportsTools: true,
		description: 'Best open-source general purpose model'
	},

	'llama-3-1-8b': {
		displayName: 'Llama 3.1 8B',
		provider: 'meta',
		contextWindow: 128000,
		maxOutputTokens: 4096,
		supportsThinking: false,
		supportsVision: false,
		supportsTools: true,
		description: 'Fast and cost-effective open-source model'
	},

	'llama-4-scout': {
		displayName: 'Llama 4 Scout 17B',
		provider: 'meta',
		contextWindow: 3500000, // 3.5M context!
		maxOutputTokens: 8192,
		supportsThinking: false,
		supportsVision: false,
		supportsTools: false, // Bedrock doesn't support tool use in streaming mode
		description: 'Massive 3.5M context window for document processing'
	},

	// ============================================
	// AWS BEDROCK MODELS - Amazon Nova
	// ============================================

	'nova-pro': {
		displayName: 'Amazon Nova Pro',
		provider: 'amazon',
		contextWindow: 300000,
		maxOutputTokens: 5000,
		supportsThinking: false,
		supportsVision: true,
		supportsTools: true,
		description: 'AWS-native multimodal model for complex tasks'
	},

	// ============================================
	// AWS BEDROCK MODELS - DeepSeek
	// ============================================

	'deepseek-r1': {
		displayName: 'DeepSeek R1',
		provider: 'deepseek',
		contextWindow: 128000,
		maxOutputTokens: 8192,
		supportsThinking: true, // Has reasoning_content blocks similar to Claude thinking
		supportsVision: false,
		supportsTools: true,
		description: 'Strong reasoning model with visible thinking process'
	},

	'deepseek-v3': {
		displayName: 'DeepSeek V3.1',
		provider: 'deepseek',
		contextWindow: 128000,
		maxOutputTokens: 8192,
		supportsThinking: true, // Has thinking/non-thinking modes
		supportsVision: false,
		supportsTools: false, // Tool calling not yet supported in Bedrock Converse API
		description: 'Latest DeepSeek model with thinking mode'
	},

	// ============================================
	// AWS BEDROCK MODELS - Mistral
	// ============================================

	'mistral-large-3': {
		displayName: 'Mistral Large 3',
		provider: 'mistral',
		contextWindow: 256000,
		maxOutputTokens: 8192,
		supportsThinking: false,
		supportsVision: true,
		supportsTools: false, // Tool use not supported in streaming mode
		description: 'Powerful 675B MoE model with vision'
	},

	// ============================================
	// AWS BEDROCK MODELS - Meta Llama 4
	// ============================================

	'llama-4-maverick': {
		displayName: 'Llama 4 Maverick 17B',
		provider: 'meta',
		contextWindow: 1000000, // 1M context
		maxOutputTokens: 8192,
		supportsThinking: false,
		supportsVision: true,
		supportsTools: false, // No streaming support at all on Bedrock
		description: '1M context multimodal model (no streaming)'
	},

	// ============================================
	// GOOGLE GEMINI MODELS
	// ============================================

	'gemini-3-pro': {
		displayName: 'Gemini 3 Pro',
		provider: 'google',
		contextWindow: 1048576, // 1M context
		maxOutputTokens: 65536,
		supportsThinking: true, // Adaptive thinking, reasoning-first
		supportsVision: true,
		supportsTools: true,
		description: 'Latest flagship reasoning model for complex tasks'
	},

	'gemini-2.5-pro': {
		displayName: 'Gemini 2.5 Pro',
		provider: 'google',
		contextWindow: 1048576, // 1M context
		maxOutputTokens: 65536,
		supportsThinking: true, // Built-in reasoning
		supportsVision: true,
		supportsTools: true,
		description: 'Best for complex reasoning in code, math, STEM'
	},

	'gemini-2.5-flash': {
		displayName: 'Gemini 2.5 Flash',
		provider: 'google',
		contextWindow: 1048576, // 1M context
		maxOutputTokens: 65536,
		supportsThinking: true, // Built-in thinking with adjustable budget
		supportsVision: true,
		supportsTools: true,
		description: 'Best price-performance with thinking support'
	}
	// Note: deep-research-pro-preview requires the Interactions API (async polling)
	// and cannot be used through standard chat completions. Consider implementing
	// as a separate feature if needed.
};

/**
 * Get capabilities for a model by its ID
 */
export function getModelCapabilities(modelId: string): ModelCapabilities | undefined {
	return MODEL_CAPABILITIES[modelId];
}

/**
 * Check if a model supports extended thinking
 */
export function modelSupportsThinking(modelId: string): boolean {
	return MODEL_CAPABILITIES[modelId]?.supportsThinking ?? false;
}

/**
 * Check if a model supports vision/images
 */
export function modelSupportsVision(modelId: string): boolean {
	return MODEL_CAPABILITIES[modelId]?.supportsVision ?? false;
}

/**
 * Check if a model supports tool use
 */
export function modelSupportsTools(modelId: string): boolean {
	return MODEL_CAPABILITIES[modelId]?.supportsTools ?? true; // Default to true
}

/**
 * Get the context window size for a model
 */
export function getContextWindow(modelId: string): number {
	return MODEL_CAPABILITIES[modelId]?.contextWindow ?? 128000; // Default fallback
}

/**
 * Get the max output tokens for a model
 */
export function getMaxOutputTokens(modelId: string): number {
	return MODEL_CAPABILITIES[modelId]?.maxOutputTokens ?? 4096; // Conservative default
}

/**
 * Get all models that support a specific capability
 */
export function getModelsWithCapability(
	capability: 'supportsThinking' | 'supportsVision' | 'supportsTools'
): string[] {
	return Object.entries(MODEL_CAPABILITIES)
		.filter(([_, caps]) => caps[capability])
		.map(([id]) => id);
}

/**
 * Get all models grouped by provider
 */
export function getModelsByProvider(): Record<string, string[]> {
	const result: Record<string, string[]> = {
		anthropic: [],
		openai: [],
		meta: [],
		amazon: [],
		deepseek: [],
		mistral: [],
		google: []
	};
	for (const [id, caps] of Object.entries(MODEL_CAPABILITIES)) {
		if (result[caps.provider]) {
			result[caps.provider].push(id);
		}
	}
	return result;
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: string): string {
	const displayNames: Record<string, string> = {
		anthropic: 'Anthropic',
		openai: 'OpenAI',
		meta: 'Meta (Llama)',
		amazon: 'Amazon',
		deepseek: 'DeepSeek',
		mistral: 'Mistral AI',
		google: 'Google'
	};
	return displayNames[provider] || provider;
}

/**
 * Format context window for display (e.g., "200K", "1M")
 */
export function formatContextWindow(tokens: number): string {
	if (tokens >= 1000000) {
		return `${(tokens / 1000000).toFixed(tokens % 1000000 === 0 ? 0 : 1)}M`;
	}
	return `${Math.round(tokens / 1000)}K`;
}
