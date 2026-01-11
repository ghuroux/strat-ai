/**
 * Admin Endpoint: Regenerate Document Summaries
 *
 * Regenerates summaries for all documents using the improved summarization logic.
 * This is useful after fixing truncation issues or improving the summary prompt.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { postgresOrgMembershipRepository } from '$lib/server/persistence';
import { generateDocumentSummary } from '$lib/server/litellm';
import { sql } from '$lib/server/persistence/db';

interface RegenerationResult {
	documentId: string;
	filename: string;
	success: boolean;
	previousLength?: number;
	newLength?: number;
	inputTokens?: number;
	outputTokens?: number;
	error?: string;
}

export const POST: RequestHandler = async ({ locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;

	// Check user role - only owners and admins can run this
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
	const membership = memberships.find((m) => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		return json({ error: 'Forbidden - admin access required' }, { status: 403 });
	}

	try {
		// Get all documents with content (we need content to regenerate summaries)
		const documents = await sql<Array<{
			id: string;
			filename: string;
			content: string;
			summary: string | null;
			space_id: string;
		}>>`
			SELECT id, filename, content, summary, space_id
			FROM documents
			WHERE content IS NOT NULL AND content != ''
			ORDER BY created_at DESC
		`;

		const results: RegenerationResult[] = [];
		let successCount = 0;
		let errorCount = 0;
		let totalInputTokens = 0;
		let totalOutputTokens = 0;

		for (const doc of documents) {
			try {
				const previousLength = doc.summary?.length || 0;

				// Generate new summary
				const { summary, inputTokens, outputTokens } = await generateDocumentSummary(
					doc.content,
					doc.filename
				);

				// Update the document with the new summary
				await sql`
					UPDATE documents
					SET summary = ${summary}, updated_at = NOW()
					WHERE id = ${doc.id}
				`;

				results.push({
					documentId: doc.id,
					filename: doc.filename,
					success: true,
					previousLength,
					newLength: summary.length,
					inputTokens,
					outputTokens
				});

				successCount++;
				totalInputTokens += inputTokens;
				totalOutputTokens += outputTokens;

				// Small delay to avoid rate limiting
				await new Promise(resolve => setTimeout(resolve, 200));

			} catch (error) {
				results.push({
					documentId: doc.id,
					filename: doc.filename,
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
				errorCount++;
			}
		}

		return json({
			success: true,
			summary: {
				totalDocuments: documents.length,
				successCount,
				errorCount,
				totalInputTokens,
				totalOutputTokens
			},
			results
		});

	} catch (error) {
		console.error('[Regenerate Summaries] Error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to regenerate summaries' },
			{ status: 500 }
		);
	}
};
