/**
 * Token Estimation Service
 * Provides utilities for token counting and managing context window limits
 *
 * Now uses accurate tiktoken-based counting instead of character approximation
 */

import { getContextWindow } from '$lib/config/model-capabilities';
import { countTokens } from './tokenCounter';
import { getPlatformPrompt } from '$lib/config/system-prompts';

// Summary model for compacting conversations (configurable here)
export const SUMMARY_MODEL = 'claude-3-5-haiku';

// Default fallback context window size
const DEFAULT_CONTEXT_WINDOW = 128000;

/**
 * Count tokens in text accurately using tiktoken
 * This replaces the old character-based approximation
 */
export function estimateTokens(text: string): number {
	return countTokens(text);
}

/**
 * Get the context window size for a given model
 * Uses the centralized model capabilities config
 */
export function getContextWindowSize(model: string): number {
	if (!model) return DEFAULT_CONTEXT_WINDOW;
	return getContextWindow(model);
}

/**
 * Calculate total tokens for a conversation
 * Includes platform prompt, user system prompt, messages, thinking content, and continuation summary
 * Now includes message formatting overhead (~4 tokens per message)
 */
export function calculateConversationTokens(
	messages: Array<{ content: string; thinking?: string }>,
	systemPrompt: string = '',
	continuationSummary: string = '',
	model: string = ''
): number {
	let total = 0;

	// Platform system prompt (always present, varies by model)
	const platformPrompt = getPlatformPrompt(model);
	if (platformPrompt) {
		total += estimateTokens(platformPrompt);
		total += 4; // System message formatting overhead
	}

	// User's custom system prompt (appended to platform prompt)
	if (systemPrompt) {
		total += estimateTokens(systemPrompt);
		// If platform prompt exists, user prompt is appended (no extra message overhead)
		// Otherwise it's a separate message
		if (!platformPrompt) {
			total += 4;
		}
	}

	// Include continuation summary if this is a continued conversation
	if (continuationSummary) {
		total += estimateTokens(continuationSummary);
		total += 4; // Message overhead
	}

	// Messages with overhead
	for (const msg of messages) {
		total += 4; // Per-message formatting overhead (role, delimiters)
		total += estimateTokens(msg.content);
		if (msg.thinking) {
			total += estimateTokens(msg.thinking);
		}
	}

	// Assistant priming tokens
	total += 3;

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
