/**
 * Page Content Extraction API
 *
 * POST /api/pages/extract
 * Extracts content from a conversation and structures it for a page.
 *
 * Pipeline: AI → Markdown → HTML → TipTap JSON (deterministic conversion)
 * For last_response: skips AI entirely (content is already markdown)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Message } from '$lib/types/chat';
import type { PageType, TipTapContent } from '$lib/types/page';
import { env } from '$env/dynamic/private';
import { PAGE_TYPE_LABELS } from '$lib/types/page';
import { markdownToTipTap, textToTipTap } from '$lib/server/markdown-to-tiptap';

// Model for extraction (using Haiku for cost efficiency)
const EXTRACTION_MODEL = 'claude-haiku-4-5';
const EXTRACTION_MAX_TOKENS = 16000;
const EXTRACTION_TIMEOUT_MS = 75_000; // 75s - must finish before Cloudflare's ~100s gateway timeout

function getBaseUrl(): string {
	return env.LITELLM_BASE_URL || 'http://localhost:4000';
}

function getApiKey(): string {
	return env.LITELLM_API_KEY || 'sk-1234';
}

/**
 * System prompt for content extraction — outputs markdown (not TipTap JSON)
 */
function getExtractionSystemPrompt(pageType: PageType): string {
	const typeName = PAGE_TYPE_LABELS[pageType];

	return `You are a document extraction assistant. Your task is to extract key information from a conversation and structure it as a ${typeName}.

OUTPUT FORMAT: Output well-structured **markdown**. Use:
- # for title (H1), ## for sections (H2), ### for subsections (H3)
- Paragraphs separated by blank lines
- Bullet lists (- item) and numbered lists (1. item)
- Task lists (- [ ] todo, - [x] done) for action items
- > blockquotes for important quotes
- \`code\` for inline code and \`\`\`language for code blocks
- **bold**, *italic*, ~~strikethrough~~
- [link text](url) for links
- Tables using | header | header | format

GUIDELINES:
1. Extract the most important information and structure it appropriately
2. Use proper heading hierarchy (H1 for title, H2 for sections, H3 for subsections)
3. Use bullet lists for related items
4. Use task lists for action items
5. Preserve tables as markdown tables — do NOT convert tables to lists or paragraphs
6. Include relevant quotes or code if present
7. Be concise but comprehensive
8. Output ONLY markdown, no commentary or explanation`;
}

/**
 * Convert conversation messages to text format for extraction
 */
function messagesToText(messages: Message[]): string {
	return messages
		.map((m) => {
			const role = m.role === 'user' ? 'User' : 'Assistant';
			return `${role}: ${m.content}`;
		})
		.join('\n\n');
}

// Type alias for extraction types
type ExtractionType = 'summary' | 'last_response' | 'full_conversation' | 'custom';

/**
 * Convert markdown to TipTap JSON with text fallback
 */
function safeConvert(markdown: string): { content: TipTapContent; fallback: boolean } {
	try {
		return { content: markdownToTipTap(markdown), fallback: false };
	} catch (err) {
		console.error('[safeConvert] markdownToTipTap failed, using text fallback:', err);
		return { content: textToTipTap(markdown), fallback: true };
	}
}

/**
 * Make API call for content extraction (AI outputs markdown)
 */
async function callExtractionAPI(
	messages: Message[],
	extractionType: ExtractionType,
	pageType: PageType,
	customInstructions?: string
): Promise<{ markdown: string; inputTokens: number; outputTokens: number }> {
	let userPrompt: string;

	switch (extractionType) {
		case 'full_conversation':
			userPrompt = `Convert this entire conversation into a ${PAGE_TYPE_LABELS[pageType]} document.

CRITICAL: Include ALL content from the conversation — do not summarize or condense.
Preserve the full context of questions and responses. Use appropriate headings, paragraphs, lists, and code blocks.

Conversation:

${messagesToText(messages)}`;
			break;

		case 'custom':
			userPrompt = `${customInstructions || 'Extract key information'}\n\nConversation:\n${messagesToText(messages)}`;
			break;

		case 'summary':
		default:
			userPrompt = `Extract the key points and decisions from this conversation and structure them as a ${PAGE_TYPE_LABELS[pageType]}:\n\n${messagesToText(messages)}`;
			break;
	}

	// Truncate if too long
	const maxLength = 50000;
	if (userPrompt.length > maxLength) {
		userPrompt = userPrompt.slice(0, maxLength) + '\n\n[Content truncated]';
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), EXTRACTION_TIMEOUT_MS);

	let response: Response;
	try {
		response = await fetch(`${getBaseUrl()}/v1/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${getApiKey()}`
			},
			body: JSON.stringify({
				model: EXTRACTION_MODEL,
				messages: [
					{ role: 'system', content: getExtractionSystemPrompt(pageType) },
					{ role: 'user', content: userPrompt }
				],
				max_tokens: EXTRACTION_MAX_TOKENS,
				temperature: 0.3,
				stream: false
			}),
			signal: controller.signal
		});
	} catch (err) {
		clearTimeout(timeout);
		if (err instanceof DOMException && err.name === 'AbortError') {
			throw new Error(
				'Content extraction timed out. Try a shorter conversation or a different extraction type.'
			);
		}
		throw err;
	}
	clearTimeout(timeout);

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Content extraction failed: ${response.status} - ${errorText}`);
	}

	const data = await response.json();
	const markdown = data.choices?.[0]?.message?.content || '';

	return {
		markdown,
		inputTokens: data.usage?.prompt_tokens || 0,
		outputTokens: data.usage?.completion_tokens || 0
	};
}

/**
 * POST /api/pages/extract
 *
 * Body:
 * - messages: Conversation messages to extract from
 * - extractionType: 'summary' | 'last_response' | 'full_conversation' | 'custom'
 * - pageType: Target page type
 * - customInstructions: Optional instructions for custom extraction
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	try {
		const body = await request.json();

		// Validate required fields
		if (!body.messages || !Array.isArray(body.messages)) {
			return json({ error: 'Missing or invalid messages array' }, { status: 400 });
		}

		if (!body.extractionType) {
			return json({ error: 'Missing extractionType' }, { status: 400 });
		}

		const messages = body.messages as Message[];
		const extractionType = body.extractionType as ExtractionType;
		const pageType = (body.pageType as PageType) || 'general';
		const customInstructions = body.customInstructions as string | undefined;

		// last_response: deterministic path — no AI call needed
		if (extractionType === 'last_response') {
			const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

			if (!lastAssistant) {
				return json({
					content: { type: 'doc', content: [] } as TipTapContent,
					usage: { inputTokens: 0, outputTokens: 0 },
					meta: {}
				});
			}

			const { content, fallback } = safeConvert(lastAssistant.content);

			return json({
				content,
				usage: { inputTokens: 0, outputTokens: 0 },
				meta: { fallback }
			});
		}

		// summary, full_conversation, custom: AI outputs markdown → convert
		const result = await callExtractionAPI(messages, extractionType, pageType, customInstructions);
		const { content, fallback } = safeConvert(result.markdown);

		return json({
			content,
			usage: {
				inputTokens: result.inputTokens,
				outputTokens: result.outputTokens
			},
			meta: { fallback }
		});
	} catch (error) {
		console.error('Failed to extract content:', error);
		return json(
			{
				error: 'Failed to extract content',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
