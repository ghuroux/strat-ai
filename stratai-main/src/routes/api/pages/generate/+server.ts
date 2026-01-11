/**
 * Page Generation API
 *
 * POST /api/pages/generate
 * Generates a structured page from a guided creation conversation.
 *
 * Phase 8 acceptance criteria:
 * - P8-DG-01: Document generated from Q&A (content reflects conversation)
 * - P8-DG-02: Correct document type (type matches intent)
 * - P8-DG-03: Structure matches template (appropriate sections present)
 * - P8-DG-05: Source conversation linked (can trace back to chat)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Message } from '$lib/types/chat';
import type { PageType, TipTapContent, TipTapNode } from '$lib/types/page';
import { postgresPageRepository } from '$lib/server/persistence/pages-postgres';
import { postgresConversationRepository } from '$lib/server/persistence/postgres';
import { env } from '$env/dynamic/private';
import { PAGE_TYPE_LABELS } from '$lib/types/page';
import { getRequiredFieldsForType } from '$lib/utils/page-intent';

// Model for generation (using Sonnet for quality)
const GENERATION_MODEL = 'claude-sonnet-4-20250514';
const GENERATION_MAX_TOKENS = 8000;

function getBaseUrl(): string {
	return env.LITELLM_BASE_URL || 'http://localhost:4000';
}

function getApiKey(): string {
	return env.LITELLM_API_KEY || 'sk-1234';
}

/**
 * Get template structure guidance for a page type
 */
function getTemplateGuidance(pageType: PageType): string {
	switch (pageType) {
		case 'meeting_notes':
			return `Structure the document with these sections:
1. Meeting Details (date, attendees, purpose)
2. Agenda Items
3. Discussion Summary
4. Decisions Made
5. Action Items (with owners and due dates)
6. Next Steps`;

		case 'decision_record':
			return `Structure the document with these sections:
1. Decision Title
2. Context & Background
3. Options Considered
4. Decision
5. Rationale
6. Implications
7. Next Steps`;

		case 'proposal':
			return `Structure the document with these sections:
1. Executive Summary
2. Problem Statement / Opportunity
3. Proposed Solution
4. Benefits & Value
5. Requirements (resources, budget, timeline)
6. Success Metrics
7. Risks & Mitigation
8. Call to Action`;

		case 'project_brief':
			return `Structure the document with these sections:
1. Project Overview
2. Objectives & Goals
3. Scope
4. Deliverables
5. Stakeholders
6. Timeline & Milestones
7. Success Criteria
8. Risks & Dependencies`;

		case 'weekly_update':
			return `Structure the document with these sections:
1. Summary
2. Accomplishments This Week
3. In Progress
4. Blockers & Challenges
5. Plans for Next Week
6. Help Needed`;

		case 'technical_spec':
			return `Structure the document with these sections:
1. Overview
2. Requirements
3. Architecture / Design
4. Data Model (if applicable)
5. API / Interface (if applicable)
6. Implementation Notes
7. Testing Strategy
8. Open Questions`;

		default:
			return `Structure the document clearly with:
1. Introduction / Overview
2. Main content sections with appropriate headings
3. Key points and details
4. Conclusion / Summary`;
	}
}

/**
 * Build the generation system prompt
 */
function getGenerationSystemPrompt(pageType: PageType, topic: string): string {
	const typeName = PAGE_TYPE_LABELS[pageType];
	const templateGuidance = getTemplateGuidance(pageType);

	return `You are a professional document writer. Generate a well-structured ${typeName} about "${topic}" based on the conversation provided.

${templateGuidance}

OUTPUT FORMAT: You must output valid TipTap/ProseMirror JSON. The format is:
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Title" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Content..." }] },
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Section" }] },
    { "type": "bulletList", "content": [
      { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Item" }] }] }
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
1. Use proper heading hierarchy (H1 for title, H2 for sections, H3 for subsections)
2. Use the information gathered in the conversation to fill all relevant sections
3. Use bullet lists for related items
4. Use task lists for action items (if any)
5. Be comprehensive but concise
6. Use professional language appropriate for business documents
7. Output ONLY the JSON object, no other text before or after`;
}

/**
 * Convert conversation messages to text format
 */
function conversationToText(messages: Message[]): string {
	return messages
		.map((m) => {
			const role = m.role === 'user' ? 'User' : 'Assistant';
			return `${role}: ${m.content}`;
		})
		.join('\n\n');
}

/**
 * Parse AI response into TipTap content
 */
function parseAIResponse(responseText: string): TipTapContent {
	try {
		let jsonText = responseText.trim();

		// Remove markdown code blocks if present
		if (jsonText.startsWith('```json')) {
			jsonText = jsonText.slice(7);
		} else if (jsonText.startsWith('```')) {
			jsonText = jsonText.slice(3);
		}
		if (jsonText.endsWith('```')) {
			jsonText = jsonText.slice(0, -3);
		}

		const parsed = JSON.parse(jsonText.trim());

		// Validate basic structure
		if (parsed.type === 'doc' && Array.isArray(parsed.content)) {
			return parsed as TipTapContent;
		}

		throw new Error('Invalid TipTap structure');
	} catch (error) {
		console.error('Failed to parse AI response as TipTap:', error);

		// Fallback: convert response text to simple paragraphs
		const paragraphs = responseText.split('\n\n').filter(Boolean);
		const content: TipTapNode[] = paragraphs.map((p) => ({
			type: 'paragraph',
			content: [{ type: 'text', text: p }]
		}));

		return {
			type: 'doc',
			content
		};
	}
}

/**
 * Extract a title from the generated content
 */
function extractTitleFromContent(content: TipTapContent, fallbackTopic: string): string {
	// Look for the first H1 heading
	for (const node of content.content) {
		if (node.type === 'heading' && node.attrs?.level === 1) {
			// Extract text from the heading
			if (node.content) {
				const texts = node.content
					.filter((n) => n.type === 'text' && n.text)
					.map((n) => n.text)
					.join('');
				if (texts) {
					return texts;
				}
			}
		}
	}

	// Fallback to topic-based title
	return fallbackTopic || 'Untitled Document';
}

/**
 * Generate document content from conversation
 */
async function generateDocument(
	messages: Message[],
	pageType: PageType,
	topic: string
): Promise<{ content: TipTapContent; title: string; inputTokens: number; outputTokens: number }> {
	const conversationText = conversationToText(messages);

	// Truncate if too long
	const maxLength = 80000;
	let userPrompt = `Based on the following conversation, generate a complete ${PAGE_TYPE_LABELS[pageType]}:\n\n${conversationText}`;

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
			model: GENERATION_MODEL,
			messages: [
				{ role: 'system', content: getGenerationSystemPrompt(pageType, topic) },
				{ role: 'user', content: userPrompt }
			],
			max_tokens: GENERATION_MAX_TOKENS,
			temperature: 0.4,
			stream: false
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Document generation failed: ${response.status} - ${errorText}`);
	}

	const data = await response.json();
	const responseText = data.choices?.[0]?.message?.content || '';
	const content = parseAIResponse(responseText);
	const title = extractTitleFromContent(content, topic);

	return {
		content,
		title,
		inputTokens: data.usage?.prompt_tokens || 0,
		outputTokens: data.usage?.completion_tokens || 0
	};
}

/**
 * POST /api/pages/generate
 *
 * Body:
 * - conversationId: Source conversation ID
 * - pageType: Target page type
 * - topic: Topic/title for the document
 * - areaId: Area to create the page in
 * - taskId: Optional task to associate with
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return json({ error: { message: 'Unauthorized', type: 'auth_error' } }, { status: 401 });
	}

	const userId = locals.session.userId;

	try {
		const body = await request.json();

		// Validate required fields
		if (!body.conversationId) {
			return json({ error: 'Missing conversationId' }, { status: 400 });
		}
		if (!body.areaId) {
			return json({ error: 'Missing areaId' }, { status: 400 });
		}

		const conversationId = body.conversationId as string;
		const pageType = (body.pageType as PageType) || 'general';
		const topic = (body.topic as string) || '';
		const areaId = body.areaId as string;
		const taskId = body.taskId as string | undefined;

		// Fetch the conversation
		const conversation = await postgresConversationRepository.findById(conversationId, userId);
		if (!conversation) {
			return json({ error: 'Conversation not found' }, { status: 404 });
		}

		// Check if conversation has messages
		if (!conversation.messages || conversation.messages.length === 0) {
			return json({ error: 'Conversation has no messages' }, { status: 400 });
		}

		// Generate the document
		console.log(`[Generate] Starting generation for ${pageType}: "${topic}"`);
		const result = await generateDocument(conversation.messages, pageType, topic);
		console.log(`[Generate] Generated document with ${result.inputTokens} input, ${result.outputTokens} output tokens`);

		// Create the page
		const page = await postgresPageRepository.create(
			{
				areaId,
				title: result.title,
				content: result.content,
				pageType,
				visibility: 'private',
				taskId,
				sourceConversationId: conversationId
			},
			userId
		);

		// Link the source conversation (P8-DG-05)
		await postgresPageRepository.linkConversation(page.id, conversationId, 'source', userId);

		console.log(`[Generate] Created page ${page.id}: "${page.title}"`);

		return json({
			page,
			usage: {
				inputTokens: result.inputTokens,
				outputTokens: result.outputTokens
			}
		}, { status: 201 });
	} catch (error) {
		console.error('Failed to generate page:', error);
		return json(
			{
				error: 'Failed to generate page',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
