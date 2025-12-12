/**
 * Token Counter Service
 * Provides accurate token counting using tiktoken for proper context management
 */

import { getEncoding, type Tiktoken } from 'js-tiktoken';
import type { Message, FileAttachment } from '$lib/types/chat';

// Lazy-load the encoder to avoid initialization overhead on import
let encoder: Tiktoken | null = null;

function getEncoder(): Tiktoken {
	if (!encoder) {
		// cl100k_base is used by GPT-4, GPT-4o, and provides reasonable estimates for Claude
		encoder = getEncoding('cl100k_base');
	}
	return encoder;
}

/**
 * Count tokens in a text string accurately using tiktoken
 */
export function countTokens(text: string): number {
	if (!text) return 0;
	try {
		return getEncoder().encode(text).length;
	} catch {
		// Fallback to character-based estimation if encoding fails
		return Math.ceil(text.length / 4);
	}
}

/**
 * Estimate tokens for an image based on dimensions
 * Anthropic: ~1 token per 750 pixels, minimum 85 tokens
 * OpenAI: varies by detail level
 */
export function countImageTokens(width: number, height: number): number {
	const pixels = width * height;
	// Use Anthropic's formula as it's more conservative
	return Math.max(85, Math.ceil(pixels / 750));
}

/**
 * Count tokens for a file attachment
 */
export function countAttachmentTokens(attachment: FileAttachment): number {
	if (attachment.content.type === 'text') {
		return countTokens(attachment.content.data);
	} else if (attachment.content.type === 'image') {
		// For images, estimate based on typical dimensions
		// A more accurate count would require decoding the image
		// Average web image is ~800x600, so ~640 tokens
		return 640;
	}
	return 0;
}

/**
 * Count tokens for a single message including all content
 */
export function countMessageTokens(message: Message): number {
	let total = 0;

	// Message overhead (role, formatting tokens)
	// OpenAI uses ~4 tokens per message for formatting
	total += 4;

	// Main content
	total += countTokens(message.content);

	// Thinking content (Claude extended thinking)
	if (message.thinking) {
		total += countTokens(message.thinking);
	}

	// File attachments
	if (message.attachments) {
		for (const attachment of message.attachments) {
			total += countAttachmentTokens(attachment);
		}
	}

	return total;
}

/**
 * Count total tokens for an array of messages
 */
export function countMessagesTokens(messages: Message[]): number {
	let total = 0;
	for (const message of messages) {
		total += countMessageTokens(message);
	}
	// Add base overhead for the conversation (assistant priming)
	total += 3;
	return total;
}

/**
 * Count tokens for a conversation including system prompt and continuation summary
 */
export function countConversationTokens(
	messages: Message[],
	systemPrompt: string = '',
	continuationSummary: string = ''
): number {
	let total = 0;

	// System prompt
	if (systemPrompt) {
		total += countTokens(systemPrompt);
		total += 4; // System message overhead
	}

	// Continuation summary (if this is a continued conversation)
	if (continuationSummary) {
		total += countTokens(continuationSummary);
		total += 4; // Message overhead for the summary
	}

	// All messages
	total += countMessagesTokens(messages);

	return total;
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
