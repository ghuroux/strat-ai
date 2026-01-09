/**
 * Document Summarization Utility
 *
 * Provides background and on-demand document summarization
 * to reduce context costs in chat conversations.
 *
 * Uses Haiku for cost-efficient summarization (~$0.005 per 5K token doc).
 */

import { generateDocumentSummary } from './litellm';
import { postgresDocumentRepository } from './persistence/documents-postgres';
import { postgresUsageRepository } from './persistence/usage-postgres';
import { estimateCost } from '$lib/config/model-pricing';

/** Minimum document size to warrant summarization (characters) */
const MIN_CHARS_FOR_SUMMARY = 500;

/** Model used for summarization (matches litellm.ts) */
const SUMMARY_MODEL = 'claude-haiku-4-5';

/**
 * Generate a document summary in the background (fire-and-forget)
 *
 * This function:
 * - Generates a ~200 token summary using Haiku
 * - Updates the document record with the summary
 * - Tracks usage for cost analytics
 * - Logs errors but doesn't throw (non-blocking)
 *
 * @param documentId - Document ID to summarize
 * @param content - Full document content
 * @param filename - Document filename (for context)
 * @param userId - User who owns the document
 * @param organizationId - Organization for usage tracking
 */
export async function generateSummaryBackground(
	documentId: string,
	content: string,
	filename: string,
	userId: string,
	organizationId: string
): Promise<void> {
	// Skip small documents - not worth the overhead
	if (content.length < MIN_CHARS_FOR_SUMMARY) {
		console.log(`[Summarization] Skipping ${filename} - too short (${content.length} chars)`);
		return;
	}

	console.log(`[Summarization] Starting background summary for ${filename} (${Math.round(content.length / 1000)}k chars)`);

	try {
		// Generate the summary
		const result = await generateDocumentSummary(content, filename);

		// Update document with summary
		await postgresDocumentRepository.update(
			documentId,
			{ summary: result.summary },
			userId
		);

		// Calculate cost for usage tracking
		const totalTokens = result.inputTokens + result.outputTokens;
		const costMillicents = estimateCost(
			SUMMARY_MODEL,
			result.inputTokens,
			result.outputTokens
		);

		// Track usage (fire-and-forget)
		postgresUsageRepository.create({
			organizationId,
			userId,
			conversationId: null, // Not tied to a conversation
			model: SUMMARY_MODEL,
			requestType: 'summarization',
			promptTokens: result.inputTokens,
			completionTokens: result.outputTokens,
			totalTokens,
			estimatedCostMillicents: costMillicents
		}).catch((err) => {
			console.warn(`[Summarization] Failed to track usage: ${err.message}`);
		});

		console.log(`[Summarization] Completed ${filename}: ${result.outputTokens} tokens, ${costMillicents} millicents`);
	} catch (error) {
		// Log but don't throw - this is background work
		console.error(`[Summarization] Failed for ${filename}:`, error);
	}
}

/**
 * Generate a document summary on-demand (blocking)
 *
 * Use this when a user starts a chat and the document doesn't have a summary yet.
 * Returns the summary so it can be used immediately.
 *
 * @param documentId - Document ID to summarize
 * @param content - Full document content
 * @param filename - Document filename
 * @param userId - User who owns the document
 * @param organizationId - Organization for usage tracking
 * @returns The generated summary, or undefined if skipped/failed
 */
export async function generateSummaryOnDemand(
	documentId: string,
	content: string,
	filename: string,
	userId: string,
	organizationId: string
): Promise<string | undefined> {
	// Skip small documents
	if (content.length < MIN_CHARS_FOR_SUMMARY) {
		return undefined;
	}

	console.log(`[Summarization] On-demand summary for ${filename}`);

	try {
		const result = await generateDocumentSummary(content, filename);

		// Update document with summary
		await postgresDocumentRepository.update(
			documentId,
			{ summary: result.summary },
			userId
		);

		// Calculate cost for usage tracking
		const totalTokens = result.inputTokens + result.outputTokens;
		const costMillicents = estimateCost(
			SUMMARY_MODEL,
			result.inputTokens,
			result.outputTokens
		);

		// Track usage (fire-and-forget for on-demand too)
		postgresUsageRepository.create({
			organizationId,
			userId,
			conversationId: null,
			model: SUMMARY_MODEL,
			requestType: 'summarization',
			promptTokens: result.inputTokens,
			completionTokens: result.outputTokens,
			totalTokens,
			estimatedCostMillicents: costMillicents
		}).catch((err) => {
			console.warn(`[Summarization] Failed to track usage: ${err.message}`);
		});

		console.log(`[Summarization] On-demand completed ${filename}: ${result.outputTokens} tokens`);
		return result.summary;
	} catch (error) {
		console.error(`[Summarization] On-demand failed for ${filename}:`, error);
		return undefined;
	}
}

/**
 * Check if a document needs summarization
 *
 * @param charCount - Document character count
 * @param existingSummary - Current summary (if any)
 * @returns true if document should be summarized
 */
export function needsSummarization(charCount: number, existingSummary?: string | null): boolean {
	return charCount >= MIN_CHARS_FOR_SUMMARY && !existingSummary;
}
