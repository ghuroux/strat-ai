/**
 * Script: Regenerate Document Summaries
 *
 * Run with: npx tsx scripts/regenerate-summaries.ts
 *
 * Regenerates summaries for all documents using the improved summarization logic.
 */

import postgres from 'postgres';

// Load environment
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/stratai';
const LITELLM_BASE_URL = process.env.LITELLM_BASE_URL || 'http://localhost:4000';
const LITELLM_API_KEY = process.env.LITELLM_API_KEY || 'sk-1234';

const sql = postgres(DATABASE_URL);

const SUMMARY_MODEL = 'claude-haiku-4-5';
const SUMMARY_MAX_TOKENS = 350;

const SUMMARY_SYSTEM_PROMPT = `You are a document summarizer. Create a concise summary that captures:
1. Document type (report, email, code, notes, specification, etc.)
2. Main topic or purpose
3. Key entities (people, companies, projects, dates, technologies)
4. 2-3 most important points or takeaways

IMPORTANT: Keep the summary under 250 tokens. Always complete your final sentence - never stop mid-sentence. If running low on space, finish your current point and stop. Use bullet points for clarity. Be specific and factual.`;

async function generateDocumentSummary(
	content: string,
	filename: string
): Promise<{ summary: string; inputTokens: number; outputTokens: number }> {
	// Truncate very long documents
	const maxContentLength = 100000;
	const truncatedContent = content.length > maxContentLength
		? content.slice(0, maxContentLength) + '\n\n[Content truncated for summarization]'
		: content;

	const response = await fetch(`${LITELLM_BASE_URL}/v1/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${LITELLM_API_KEY}`
		},
		body: JSON.stringify({
			model: SUMMARY_MODEL,
			messages: [
				{ role: 'system', content: SUMMARY_SYSTEM_PROMPT },
				{ role: 'user', content: `Summarize this document (${filename}):\n\n${truncatedContent}` }
			],
			max_tokens: SUMMARY_MAX_TOKENS,
			temperature: 0.3,
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

	if (finishReason === 'length') {
		console.warn(`  ⚠️  Warning: Summary for "${filename}" was truncated (hit max_tokens).`);
	}

	return {
		summary,
		inputTokens: data.usage?.prompt_tokens || 0,
		outputTokens: data.usage?.completion_tokens || 0
	};
}

async function main() {
	console.log('🔄 Starting document summary regeneration...\n');

	// Get all documents with content
	const documents = await sql<Array<{
		id: string;
		filename: string;
		content: string;
		summary: string | null;
	}>>`
		SELECT id, filename, content, summary
		FROM documents
		WHERE content IS NOT NULL AND content != ''
		ORDER BY created_at DESC
	`;

	console.log(`📄 Found ${documents.length} documents to process\n`);

	let successCount = 0;
	let errorCount = 0;
	let totalInputTokens = 0;
	let totalOutputTokens = 0;

	for (let i = 0; i < documents.length; i++) {
		const doc = documents[i];
		const progress = `[${i + 1}/${documents.length}]`;

		try {
			console.log(`${progress} Processing: ${doc.filename}`);
			const previousLength = doc.summary?.length || 0;

			// Generate new summary
			const { summary, inputTokens, outputTokens } = await generateDocumentSummary(
				doc.content,
				doc.filename
			);

			// Update the document
			await sql`
				UPDATE documents
				SET summary = ${summary}, updated_at = NOW()
				WHERE id = ${doc.id}
			`;

			console.log(`  ✅ Done: ${previousLength} → ${summary.length} chars (${inputTokens}/${outputTokens} tokens)`);

			successCount++;
			totalInputTokens += inputTokens;
			totalOutputTokens += outputTokens;

			// Small delay to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 300));

		} catch (error) {
			console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
			errorCount++;
		}
	}

	console.log('\n' + '='.repeat(50));
	console.log('📊 Summary Regeneration Complete');
	console.log('='.repeat(50));
	console.log(`Total documents: ${documents.length}`);
	console.log(`Successful: ${successCount}`);
	console.log(`Errors: ${errorCount}`);
	console.log(`Total input tokens: ${totalInputTokens.toLocaleString()}`);
	console.log(`Total output tokens: ${totalOutputTokens.toLocaleString()}`);

	await sql.end();
}

main().catch(error => {
	console.error('Fatal error:', error);
	process.exit(1);
});
