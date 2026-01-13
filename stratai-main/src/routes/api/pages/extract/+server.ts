/**
 * Page Content Extraction API
 *
 * POST /api/pages/extract
 * Extracts content from a conversation and structures it for a page.
 *
 * Uses AI to:
 * 1. Analyze conversation messages
 * 2. Extract key information based on extraction type
 * 3. Structure as TipTap JSON based on page type
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Message } from '$lib/types/chat';
import type { PageType, TipTapContent, TipTapNode } from '$lib/types/page';
import { env } from '$env/dynamic/private';
import { PAGE_TYPE_LABELS } from '$lib/types/page';

// Model for extraction (using Haiku for cost efficiency)
const EXTRACTION_MODEL = 'claude-haiku-4-5';
const EXTRACTION_MAX_TOKENS = 16000; // Increased to handle longer content

function getBaseUrl(): string {
	return env.LITELLM_BASE_URL || 'http://localhost:4000';
}

function getApiKey(): string {
	return env.LITELLM_API_KEY || 'sk-1234';
}

/**
 * System prompt for content extraction
 */
function getExtractionSystemPrompt(pageType: PageType): string {
	const typeName = PAGE_TYPE_LABELS[pageType];

	return `You are a document extraction assistant. Your task is to extract key information from a conversation and structure it as a ${typeName}.

OUTPUT FORMAT: You must output valid TipTap/ProseMirror JSON. The format is:
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Title" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Content..." }] },
    { "type": "bulletList", "content": [
      { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Item 1" }] }] }
    ]}
  ]
}

Available node types:
- heading (attrs: level 1-3)
- paragraph
- bulletList (contains listItem nodes)
- orderedList (contains listItem nodes)
- taskList (contains taskItem nodes with attrs: { checked: boolean })
- blockquote
- codeBlock (attrs: { language: string })
- horizontalRule

Text can have marks: bold, italic, underline, strike, code, link (with attrs: { href: string })

GUIDELINES:
1. Extract the most important information and structure it appropriately
2. Use proper heading hierarchy (H1 for title, H2 for sections, H3 for subsections)
3. Use bullet lists for related items
4. Use task lists for action items
5. Include relevant quotes or code if present
6. Be concise but comprehensive
7. Output ONLY the JSON object, no other text`;
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

/**
 * Extract JSON object from text by finding matching braces
 */
function extractJsonObject(text: string): string | null {
	const startIndex = text.indexOf('{');
	if (startIndex === -1) return null;

	let braceCount = 0;
	let inString = false;
	let escapeNext = false;

	for (let i = startIndex; i < text.length; i++) {
		const char = text[i];

		if (escapeNext) {
			escapeNext = false;
			continue;
		}

		if (char === '\\' && inString) {
			escapeNext = true;
			continue;
		}

		if (char === '"' && !escapeNext) {
			inString = !inString;
			continue;
		}

		if (!inString) {
			if (char === '{') {
				braceCount++;
			} else if (char === '}') {
				braceCount--;
				if (braceCount === 0) {
					return text.substring(startIndex, i + 1);
				}
			}
		}
	}

	return null;
}

/**
 * Validate TipTap content structure
 * Ensures content is properly formatted and not raw JSON text
 */
function validateTipTapContent(content: TipTapContent): boolean {
	if (content.type !== 'doc' || !Array.isArray(content.content)) {
		return false;
	}

	// Check that we don't have raw JSON as text content
	// This catches the bug where JSON parsing fails and falls back to paragraphs
	for (const node of content.content) {
		if (node.type === 'paragraph' && node.content?.[0]?.text) {
			const text = node.content[0].text;
			// If first paragraph starts with JSON-like content, something went wrong
			if (text.trim().startsWith('{"type":') || text.trim().startsWith('{ "type":')) {
				console.error('[validateTipTapContent] Content appears to be raw JSON text:', text.substring(0, 100));
				return false;
			}
		}
	}

	return true;
}

/**
 * Parse AI response into TipTap content
 *
 * Handles various response formats:
 * 1. Raw JSON object
 * 2. JSON wrapped in ```json...``` code blocks
 * 3. JSON wrapped in ```...``` code blocks
 * 4. JSON with surrounding text/explanation
 */
function parseAIResponse(responseText: string): TipTapContent {
	console.log('[parseAIResponse] Input length:', responseText.length);
	console.log('[parseAIResponse] First 100 chars:', JSON.stringify(responseText.substring(0, 100)));

	// Normalize line endings (handle Windows \r\n and Mac \r)
	const normalized = responseText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

	try {
		const trimmed = normalized.trim();

		// Strategy 1: Try to extract JSON from markdown code block
		// Look for content between ``` markers (with optional json language tag)
		const codeBlockStart = trimmed.indexOf('```');
		if (codeBlockStart !== -1) {
			const afterStart = trimmed.substring(codeBlockStart + 3);
			// Skip optional "json" language tag and whitespace
			const contentStart = afterStart.replace(/^json\s*/, '');
			const codeBlockEnd = contentStart.lastIndexOf('```');
			if (codeBlockEnd !== -1) {
				const jsonFromBlock = contentStart.substring(0, codeBlockEnd).trim();
				console.log('[parseAIResponse] Strategy 1 - Code block found, length:', jsonFromBlock.length);
				console.log('[parseAIResponse] Strategy 1 - First 50 chars:', jsonFromBlock.substring(0, 50));
				try {
					const parsed = JSON.parse(jsonFromBlock);
					if (parsed.type === 'doc' && Array.isArray(parsed.content)) {
						console.log('[parseAIResponse] Strategy 1 SUCCESS');
						return parsed as TipTapContent;
					}
				} catch (e) {
					console.log('[parseAIResponse] Strategy 1 - Parse failed:', e);
				}
			}
		}

		// Strategy 2: Extract JSON object by finding matching braces
		// This handles cases where AI adds explanation text before/after JSON
		const jsonString = extractJsonObject(trimmed);
		if (jsonString) {
			console.log('[parseAIResponse] Strategy 2 - JSON object found, length:', jsonString.length);
			try {
				const parsed = JSON.parse(jsonString);
				if (parsed.type === 'doc' && Array.isArray(parsed.content)) {
					console.log('[parseAIResponse] Strategy 2 SUCCESS');
					return parsed as TipTapContent;
				}
			} catch (e) {
				console.log('[parseAIResponse] Strategy 2 - Parse failed:', e);
			}
		}

		// Strategy 3: Try parsing the entire response as JSON (raw output)
		console.log('[parseAIResponse] Strategy 3 - Trying entire response as JSON');
		try {
			const parsed = JSON.parse(trimmed);
			if (parsed.type === 'doc' && Array.isArray(parsed.content)) {
				console.log('[parseAIResponse] Strategy 3 SUCCESS');
				return parsed as TipTapContent;
			}
		} catch (e) {
			console.log('[parseAIResponse] Strategy 3 - Parse failed:', e);
		}

		throw new Error('Could not extract valid TipTap JSON from response');
	} catch (error) {
		console.error('[parseAIResponse] All strategies failed:', error);
		console.error('[parseAIResponse] Response preview:', normalized.substring(0, 500));

		// Fallback: convert response text to simple paragraphs
		// First, strip any code block markers so they don't appear in the content
		let cleanText = normalized
			.replace(/```json\s*/g, '')
			.replace(/```\s*/g, '')
			.trim();

		// If the cleaned text still looks like JSON, try one more parse
		if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
			console.log('[parseAIResponse] Fallback - Cleaned text looks like JSON, trying parse');
			try {
				const parsed = JSON.parse(cleanText);
				if (parsed.type === 'doc' && Array.isArray(parsed.content)) {
					console.log('[parseAIResponse] Fallback SUCCESS');
					return parsed as TipTapContent;
				}
			} catch (e) {
				console.log('[parseAIResponse] Fallback - Parse failed:', e);
			}
		}

		// Check if this looks like truncated JSON (starts with { but doesn't end with })
		// If so, try to salvage by adding closing brackets
		if (cleanText.startsWith('{') && !cleanText.endsWith('}')) {
			console.log('[parseAIResponse] Detected truncated JSON, attempting to repair');
			// Count open brackets to figure out how many we need to close
			let openBraces = 0;
			let openBrackets = 0;
			let inString = false;
			let escape = false;

			for (const char of cleanText) {
				if (escape) { escape = false; continue; }
				if (char === '\\' && inString) { escape = true; continue; }
				if (char === '"') { inString = !inString; continue; }
				if (!inString) {
					if (char === '{') openBraces++;
					else if (char === '}') openBraces--;
					else if (char === '[') openBrackets++;
					else if (char === ']') openBrackets--;
				}
			}

			// Try to close the JSON
			let repairedJson = cleanText;
			// Remove any trailing incomplete content (partial strings, etc.)
			repairedJson = repairedJson.replace(/,?\s*"[^"]*$/, ''); // Remove incomplete string
			repairedJson = repairedJson.replace(/,?\s*$/, ''); // Remove trailing comma/whitespace

			// Add closing brackets
			for (let i = 0; i < openBrackets; i++) repairedJson += ']';
			for (let i = 0; i < openBraces; i++) repairedJson += '}';

			console.log('[parseAIResponse] Repaired JSON ends with:', repairedJson.slice(-50));

			try {
				const parsed = JSON.parse(repairedJson);
				if (parsed.type === 'doc' && Array.isArray(parsed.content)) {
					console.log('[parseAIResponse] Truncated JSON repair SUCCESS');
					return parsed as TipTapContent;
				}
			} catch (e) {
				console.log('[parseAIResponse] Truncated JSON repair failed:', e);
			}
		}

		// Final fallback: convert to paragraphs
		// But ONLY if the text doesn't look like JSON - otherwise we'd display raw JSON as text!
		if (cleanText.startsWith('{') || cleanText.includes('"type":')) {
			console.error('[parseAIResponse] Cannot parse JSON - refusing to convert to paragraphs');
			console.error('[parseAIResponse] Text preview:', cleanText.substring(0, 300));
			throw new Error('Failed to parse AI response as TipTap JSON. The AI may have returned malformed content.');
		}

		console.log('[parseAIResponse] Converting to paragraphs (last resort)');
		const paragraphs = cleanText.split('\n\n').filter(Boolean);
		const content: TipTapNode[] = paragraphs.map((p) => ({
			type: 'paragraph',
			content: [{ type: 'text', text: p.trim() }]
		}));

		const fallbackContent: TipTapContent = {
			type: 'doc',
			content
		};

		// Validate the fallback content
		if (!validateTipTapContent(fallbackContent)) {
			throw new Error('Failed to create valid TipTap content from AI response');
		}

		return fallbackContent;
	}
}

// Type alias for extraction types
type ExtractionType = 'summary' | 'last_response' | 'full_conversation' | 'custom';

// Result type with retry metadata
interface ExtractionResult {
	content: TipTapContent;
	inputTokens: number;
	outputTokens: number;
	attempts: number;
	retryReason?: string;
}

/**
 * System prompt for JSON correction
 */
function getCorrectionSystemPrompt(): string {
	return `You are a JSON correction assistant. Your task is to fix malformed TipTap/ProseMirror JSON.

Rules:
1. Output ONLY valid JSON - no explanation, no markdown code blocks
2. Preserve the original content meaning
3. Fix syntax errors (missing quotes, trailing commas, unclosed brackets)
4. Ensure structure follows TipTap format: { "type": "doc", "content": [...] }
5. If content is truncated, close the structure cleanly

Valid node types: heading, paragraph, bulletList, orderedList, listItem, taskList, taskItem, blockquote, codeBlock, horizontalRule

Output the fixed JSON directly.`;
}

/**
 * Attempt to fix malformed JSON by asking AI to correct it
 */
async function attemptSelfCorrection(
	malformedResponse: string,
	originalError: Error
): Promise<{ content: TipTapContent; inputTokens: number; outputTokens: number }> {
	console.log('[attemptSelfCorrection] Starting self-correction for error:', originalError.message);
	console.log('[attemptSelfCorrection] Malformed response length:', malformedResponse.length);

	const correctionPrompt = `The following TipTap JSON has errors and cannot be parsed.

Error: ${originalError.message}

Please fix the JSON and return ONLY the corrected, valid TipTap JSON document.
Do not include any explanation or markdown code blocks - just the raw JSON object starting with { and ending with }.

Malformed content:
${malformedResponse.substring(0, 8000)}`;

	const response = await fetch(`${getBaseUrl()}/v1/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${getApiKey()}`
		},
		body: JSON.stringify({
			model: EXTRACTION_MODEL,
			messages: [
				{ role: 'system', content: getCorrectionSystemPrompt() },
				{ role: 'user', content: correctionPrompt }
			],
			max_tokens: EXTRACTION_MAX_TOKENS,
			temperature: 0.1, // Lower temperature for more deterministic correction
			stream: false
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error('[attemptSelfCorrection] API call failed:', response.status, errorText);
		throw new Error(`Self-correction API call failed: ${response.status}`);
	}

	const data = await response.json();
	const correctedText = data.choices?.[0]?.message?.content || '';

	console.log('[attemptSelfCorrection] Correction response length:', correctedText.length);
	console.log('[attemptSelfCorrection] Correction response (first 200 chars):', correctedText.substring(0, 200));

	const content = parseAIResponse(correctedText);

	if (!validateTipTapContent(content)) {
		console.error('[attemptSelfCorrection] Corrected content still invalid');
		throw new Error('Self-correction still produced invalid content');
	}

	console.log('[attemptSelfCorrection] Self-correction SUCCESS');
	return {
		content,
		inputTokens: data.usage?.prompt_tokens || 0,
		outputTokens: data.usage?.completion_tokens || 0
	};
}

/**
 * Make API call for content extraction (returns raw response)
 */
async function callExtractionAPI(
	messages: Message[],
	extractionType: ExtractionType,
	pageType: PageType,
	customInstructions?: string
): Promise<{ rawResponse: string; inputTokens: number; outputTokens: number }> {
	let userPrompt: string;

	switch (extractionType) {
		case 'last_response': {
			const lastAssistant = [...messages]
				.reverse()
				.find((m) => m.role === 'assistant');

			if (!lastAssistant) {
				// Return empty doc structure as raw JSON
				return {
					rawResponse: '{"type":"doc","content":[]}',
					inputTokens: 0,
					outputTokens: 0
				};
			}

			userPrompt = `Structure this content as a ${PAGE_TYPE_LABELS[pageType]}:\n\n${lastAssistant.content}`;
			break;
		}

		case 'full_conversation':
			userPrompt = `Convert this entire conversation into a structured ${PAGE_TYPE_LABELS[pageType]}. Include all relevant information from both user questions and assistant responses:\n\n${messagesToText(messages)}`;
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

	const response = await fetch(`${getBaseUrl()}/v1/chat/completions`, {
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
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Content extraction failed: ${response.status} - ${errorText}`);
	}

	const data = await response.json();
	const rawResponse = data.choices?.[0]?.message?.content || '';

	console.log('[callExtractionAPI] Raw AI response length:', rawResponse.length);
	console.log('[callExtractionAPI] Raw AI response (first 300 chars):', rawResponse.substring(0, 300));

	return {
		rawResponse,
		inputTokens: data.usage?.prompt_tokens || 0,
		outputTokens: data.usage?.completion_tokens || 0
	};
}

/**
 * Extract content with automatic self-correction retry on parse failure
 */
async function extractContentWithRetry(
	messages: Message[],
	extractionType: ExtractionType,
	pageType: PageType,
	customInstructions?: string
): Promise<ExtractionResult> {
	// Attempt 1: Normal extraction
	console.log('[extractContentWithRetry] Starting extraction attempt 1');
	const firstAttempt = await callExtractionAPI(messages, extractionType, pageType, customInstructions);

	try {
		const content = parseAIResponse(firstAttempt.rawResponse);

		if (!validateTipTapContent(content)) {
			throw new Error('Content validation failed - invalid structure');
		}

		console.log('[extractContentWithRetry] Attempt 1 SUCCESS');
		return {
			content,
			inputTokens: firstAttempt.inputTokens,
			outputTokens: firstAttempt.outputTokens,
			attempts: 1
		};
	} catch (parseError) {
		console.log('[extractContentWithRetry] Attempt 1 FAILED:', parseError instanceof Error ? parseError.message : 'Unknown error');

		// Attempt 2: Self-correction
		console.log('[extractContentWithRetry] Starting self-correction attempt 2');
		try {
			const correctionResult = await attemptSelfCorrection(
				firstAttempt.rawResponse,
				parseError instanceof Error ? parseError : new Error('Parse failed')
			);

			console.log('[extractContentWithRetry] Self-correction SUCCESS');
			return {
				content: correctionResult.content,
				inputTokens: firstAttempt.inputTokens + correctionResult.inputTokens,
				outputTokens: firstAttempt.outputTokens + correctionResult.outputTokens,
				attempts: 2,
				retryReason: parseError instanceof Error ? parseError.message : 'Parse failed'
			};
		} catch (correctionError) {
			console.error('[extractContentWithRetry] Self-correction FAILED:', correctionError);
			// Re-throw with informative message
			throw new Error(
				`Content extraction failed after 2 attempts. Original error: ${
					parseError instanceof Error ? parseError.message : 'Unknown'
				}. Please try a different extraction type.`
			);
		}
	}
}

/**
 * POST /api/pages/extract
 *
 * Body:
 * - messages: Conversation messages to extract from
 * - extractionType: 'summary' | 'last_response' | 'full_conversation' | 'custom'
 * - pageType: Target page type
 * - customInstructions: Optional instructions for custom extraction
 *
 * Response includes metadata about retry attempts for debugging
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	console.log('========================================');
	console.log('[/api/pages/extract] POST request received');
	console.log('========================================');

	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	try {
		const body = await request.json();
		console.log('[/api/pages/extract] extractionType:', body.extractionType);
		console.log('[/api/pages/extract] pageType:', body.pageType);
		console.log('[/api/pages/extract] messages count:', body.messages?.length);

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

		// Use the retry-enabled extraction function
		const result = await extractContentWithRetry(
			messages,
			extractionType,
			pageType,
			customInstructions
		);

		console.log('[/api/pages/extract] Extraction complete, attempts:', result.attempts);
		if (result.retryReason) {
			console.log('[/api/pages/extract] Retry was needed:', result.retryReason);
		}

		return json({
			content: result.content,
			usage: {
				inputTokens: result.inputTokens,
				outputTokens: result.outputTokens
			},
			meta: {
				attempts: result.attempts,
				retryReason: result.retryReason
			}
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
