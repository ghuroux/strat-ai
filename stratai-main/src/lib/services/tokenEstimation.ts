/**
 * Token Estimation Service
 * Provides utilities for estimating token usage and managing context window limits
 */

// Model context window sizes (in tokens)
export const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
	'claude-opus-4-5': 200000,
	'claude-sonnet-4-5': 200000,
	'claude-3-5-sonnet': 200000,
	'claude-3-5-haiku': 200000,
	'claude-3-7-sonnet': 200000,
	'claude-sonnet-4': 200000,
	'claude-opus-4': 200000,
	'claude-3-opus': 200000,
	// Fallback for unknown models
	default: 100000
};

// Summary model for compacting conversations (configurable here)
export const SUMMARY_MODEL = 'claude-3-5-haiku';

// Character-to-token ratio (~4 chars per token for English text)
const CHARS_PER_TOKEN = 4;

/**
 * Estimate token count from text using character-based approximation
 * ~4 characters per token for typical English text
 */
export function estimateTokens(text: string): number {
	if (!text) return 0;
	return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Get the context window size for a given model
 * Tries exact match first, then partial match, then falls back to default
 */
export function getContextWindowSize(model: string): number {
	if (!model) return MODEL_CONTEXT_WINDOWS['default'];

	// Try exact match first
	if (MODEL_CONTEXT_WINDOWS[model]) {
		return MODEL_CONTEXT_WINDOWS[model];
	}

	// Try partial match (model name might include version suffix)
	const lowerModel = model.toLowerCase();
	for (const [key, value] of Object.entries(MODEL_CONTEXT_WINDOWS)) {
		if (key !== 'default' && lowerModel.includes(key)) {
			return value;
		}
	}

	return MODEL_CONTEXT_WINDOWS['default'];
}

/**
 * Calculate total tokens for a conversation
 * Includes all message content, thinking content, system prompt, and continuation summary
 */
export function calculateConversationTokens(
	messages: Array<{ content: string; thinking?: string }>,
	systemPrompt: string = '',
	continuationSummary: string = ''
): number {
	let total = estimateTokens(systemPrompt);

	// Include continuation summary if this is a continued conversation
	if (continuationSummary) {
		total += estimateTokens(continuationSummary);
	}

	for (const msg of messages) {
		total += estimateTokens(msg.content);
		if (msg.thinking) {
			total += estimateTokens(msg.thinking);
		}
	}

	return total;
}

/**
 * Get context window usage as a percentage
 */
export function getContextUsagePercent(tokens: number, model: string): number {
	const windowSize = getContextWindowSize(model);
	return Math.min(100, (tokens / windowSize) * 100);
}

/**
 * Context status levels for visual indicators
 */
export type ContextStatus = 'safe' | 'warning' | 'critical';

/**
 * Get context status based on usage percentage
 * - safe: < 70%
 * - warning: 70-85%
 * - critical: >= 85%
 */
export function getContextStatus(percent: number): ContextStatus {
	if (percent >= 85) return 'critical';
	if (percent >= 70) return 'warning';
	return 'safe';
}

/**
 * Format token count for display (e.g., "50K" or "150K")
 */
export function formatTokenCount(tokens: number): string {
	if (tokens >= 1000) {
		return `${Math.round(tokens / 1000)}K`;
	}
	return tokens.toString();
}
