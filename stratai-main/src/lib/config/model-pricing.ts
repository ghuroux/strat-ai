/**
 * Model Pricing Configuration
 *
 * Prices are in millicents per 1,000 tokens for precision.
 * 1000 millicents = 1 cent = $0.01
 *
 * Example: $3.00 per 1M tokens = 300 millicents per 1K tokens
 *
 * Note: Prices are estimates and should be updated regularly.
 * Cache read tokens typically cost 90% less than regular input.
 */

export interface ModelPricing {
	input: number; // millicents per 1K tokens
	output: number; // millicents per 1K tokens
	cacheRead?: number; // millicents per 1K tokens (typically 10% of input)
}

/**
 * Pricing lookup table
 * Keys match model IDs from litellm-config.yaml
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
	// ========== Anthropic Claude Models ==========
	// Claude 4 Series (2025)
	'claude-opus-4-5-20250514': { input: 1500, output: 7500, cacheRead: 150 }, // $15/$75 per M
	'claude-sonnet-4-20250514': { input: 300, output: 1500, cacheRead: 30 }, // $3/$15 per M
	'claude-sonnet-4-5-20250514': { input: 300, output: 1500, cacheRead: 30 }, // $3/$15 per M
	'claude-haiku-4-5-20250514': { input: 80, output: 400, cacheRead: 8 }, // $0.80/$4 per M

	// Claude 3.5/3.7 Series (2024-2025)
	'claude-3-7-sonnet-20250219': { input: 300, output: 1500, cacheRead: 30 },
	'claude-3-5-haiku-20241022': { input: 80, output: 400, cacheRead: 8 },

	// Aliases without dates
	'claude-opus-4-5': { input: 1500, output: 7500, cacheRead: 150 },
	'claude-sonnet-4': { input: 300, output: 1500, cacheRead: 30 },
	'claude-sonnet-4-5': { input: 300, output: 1500, cacheRead: 30 },
	'claude-haiku-4-5': { input: 80, output: 400, cacheRead: 8 },
	'claude-3-7-sonnet': { input: 300, output: 1500, cacheRead: 30 },
	'claude-3-5-haiku': { input: 80, output: 400, cacheRead: 8 },

	// ========== OpenAI GPT Models ==========
	// GPT-5.x Series (2025)
	'gpt-5.2': { input: 250, output: 1000 }, // $2.50/$10 per M
	'gpt-5.2-pro': { input: 500, output: 2000 }, // $5/$20 per M
	'gpt-5.2-chat-latest': { input: 250, output: 1000 },
	'gpt-5.1': { input: 250, output: 1000 },
	'gpt-5.1-chat-latest': { input: 250, output: 1000 },
	'gpt-5.1-codex-max': { input: 300, output: 1200 },
	'gpt-5.1-codex-mini': { input: 150, output: 600 },

	// GPT-4.x Series
	'gpt-4o': { input: 250, output: 1000 }, // $2.50/$10 per M
	'gpt-4o-mini': { input: 15, output: 60 }, // $0.15/$0.60 per M
	'gpt-4.1': { input: 200, output: 800 },
	'gpt-4.1-mini': { input: 40, output: 160 },

	// ========== Google Gemini Models ==========
	'gemini-3-pro': { input: 125, output: 500 }, // $1.25/$5 per M
	'gemini-2.5-pro': { input: 125, output: 500 },
	'gemini-2.5-flash': { input: 8, output: 30 }, // $0.075/$0.30 per M

	// ========== DeepSeek Models ==========
	'deepseek-reasoner': { input: 55, output: 219 }, // $0.55/$2.19 per M
	'deepseek-chat': { input: 14, output: 28 }, // $0.14/$0.28 per M

	// ========== Default (fallback) ==========
	default: { input: 100, output: 400 } // Conservative estimate
};

/**
 * Get pricing for a model
 * Falls back to default if model not found
 */
export function getModelPricing(model: string): ModelPricing {
	// Try exact match first
	if (MODEL_PRICING[model]) {
		return MODEL_PRICING[model];
	}

	// Try partial match (for versioned model IDs)
	const lowerModel = model.toLowerCase();
	for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
		if (lowerModel.includes(key.toLowerCase())) {
			return pricing;
		}
	}

	return MODEL_PRICING['default'];
}

/**
 * Estimate cost in millicents for a request
 *
 * @param model - Model ID
 * @param promptTokens - Input/prompt tokens
 * @param completionTokens - Output/completion tokens
 * @param cacheReadTokens - Tokens read from cache (optional)
 * @returns Estimated cost in millicents
 */
export function estimateCost(
	model: string,
	promptTokens: number,
	completionTokens: number,
	cacheReadTokens: number = 0
): number {
	const pricing = getModelPricing(model);

	// Calculate regular input cost (excluding cached tokens)
	const regularInputTokens = Math.max(0, promptTokens - cacheReadTokens);
	const inputCost = (regularInputTokens / 1000) * pricing.input;

	// Cache read tokens cost (typically 10% of input price)
	const cacheReadCost = (cacheReadTokens / 1000) * (pricing.cacheRead || pricing.input * 0.1);

	// Output cost
	const outputCost = (completionTokens / 1000) * pricing.output;

	return Math.round(inputCost + cacheReadCost + outputCost);
}

/**
 * Format millicents as dollar string
 * @param millicents - Cost in millicents
 * @returns Formatted string like "$0.0015" or "$1.23"
 */
export function formatCost(millicents: number): string {
	const dollars = millicents / 100000;
	if (dollars < 0.01) {
		return `$${dollars.toFixed(4)}`;
	} else if (dollars < 1) {
		return `$${dollars.toFixed(3)}`;
	} else {
		return `$${dollars.toFixed(2)}`;
	}
}
