/**
 * Usage Estimation Fallback
 *
 * When LiteLLM doesn't return usage data in streaming responses (known bug for
 * Anthropic and Gemini models), fall back to server-side token estimation using
 * js-tiktoken. The `is_estimated` flag tracks data quality in the database.
 */

import { countTokens } from '$lib/services/tokenCounter';

/**
 * Estimate prompt tokens from the message array sent to the LLM.
 * Handles both string and array content blocks.
 */
export function estimatePromptTokens(
	messages: Array<{ role: string; content: string | Array<{ type?: string; text?: string }> | null }>
): number {
	let total = 0;
	for (const msg of messages) {
		// ~4 tokens per-message overhead (role, delimiters)
		total += 4;

		if (typeof msg.content === 'string') {
			total += countTokens(msg.content);
		} else if (Array.isArray(msg.content)) {
			for (const block of msg.content) {
				if (block.text) {
					total += countTokens(block.text);
				}
			}
		}
	}
	// Assistant priming overhead
	total += 3;
	return total;
}

/**
 * Estimate completion tokens from the accumulated response text.
 */
export function estimateCompletionTokens(responseText: string): number {
	return countTokens(responseText) + 3; // framing overhead
}

export interface EstimatedUsage {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
	cache_creation_input_tokens: number;
	cache_read_input_tokens: number;
	is_estimated: true;
}

/**
 * Build an estimated usage object when real usage data is unavailable.
 * Cache tokens are set to 0 (cannot be estimated).
 */
export function buildEstimatedUsage(
	promptTokenEstimate: number,
	responseText: string
): EstimatedUsage {
	const completionTokens = estimateCompletionTokens(responseText);
	return {
		prompt_tokens: promptTokenEstimate,
		completion_tokens: completionTokens,
		total_tokens: promptTokenEstimate + completionTokens,
		cache_creation_input_tokens: 0,
		cache_read_input_tokens: 0,
		is_estimated: true
	};
}
