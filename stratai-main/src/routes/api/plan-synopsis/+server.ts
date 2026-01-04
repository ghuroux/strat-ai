import type { RequestHandler } from './$types';
import { createChatCompletion, mapErrorMessage } from '$lib/server/litellm';
import type { PlanModeSynopsis } from '$lib/types/tasks';

/**
 * Request body for synopsis generation
 */
interface SynopsisRequest {
	taskTitle: string;
	conversationMessages: Array<{ role: string; content: string }>;
	proposedSubtasks: Array<{ title: string; type: string }>;
}

// Use GPT-5.2 Instant for fast synopsis generation
const SYNOPSIS_MODEL = 'gpt-5.2-chat-latest';

const SYNOPSIS_SYSTEM_PROMPT = `You are a planning assistant. Given a planning conversation and proposed subtasks, write a brief synopsis explaining the task breakdown.

OUTPUT FORMAT (JSON only, no markdown):
{
  "reasoning": "2-3 sentences explaining WHY this breakdown is logical and helps accomplish the goal",
  "gettingStarted": "1-2 sentences on which subtask to tackle first and why"
}

RULES:
- Be concise and practical
- Reference specific subtasks by name when relevant
- Focus on the logical flow of the breakdown
- No fluff, no excessive encouragement
- Return ONLY valid JSON`;

export const POST: RequestHandler = async ({ request, locals }) => {
	// Verify session
	if (!locals.session) {
		return new Response(
			JSON.stringify({ error: { message: 'Unauthorized', type: 'auth_error' } }),
			{
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Parse request body
	let body: SynopsisRequest;
	try {
		body = await request.json();
	} catch {
		return new Response(
			JSON.stringify({ error: { message: 'Invalid JSON', type: 'parse_error' } }),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const { taskTitle, conversationMessages, proposedSubtasks } = body;

	if (!taskTitle || !proposedSubtasks || proposedSubtasks.length === 0) {
		return new Response(
			JSON.stringify({ error: { message: 'Task title and subtasks are required', type: 'validation_error' } }),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Limit conversation to last 10 messages
	const recentMessages = (conversationMessages || []).slice(-10);

	// Format subtasks for the prompt
	const subtaskList = proposedSubtasks
		.map((s, i) => `${i + 1}. "${s.title}" (${s.type})`)
		.join('\n');

	// Build conversation context
	const conversationContext = recentMessages.length > 0
		? recentMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
		: 'No prior conversation context.';

	try {
		const userPrompt = `TASK: "${taskTitle}"

PLANNING CONVERSATION:
${conversationContext}

PROPOSED SUBTASKS:
${subtaskList}

Generate a brief synopsis for this breakdown.`;

		const response = await createChatCompletion({
			model: SYNOPSIS_MODEL,
			messages: [
				{ role: 'system', content: SYNOPSIS_SYSTEM_PROMPT },
				{ role: 'user', content: userPrompt }
			],
			temperature: 0.3,
			max_tokens: 500,
			stream: false
		});

		if (!response.ok) {
			const errorText = await response.text();
			let errorMessage: string;
			try {
				const errorJson = JSON.parse(errorText);
				errorMessage = mapErrorMessage(errorJson);
			} catch {
				errorMessage = errorText || `Request failed with status ${response.status}`;
			}

			return new Response(
				JSON.stringify({ error: { message: errorMessage, type: 'api_error' } }),
				{
					status: response.status,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		const result = await response.json();
		let content = result.choices?.[0]?.message?.content || '';

		// Parse JSON response
		let synopsis: PlanModeSynopsis;
		try {
			// Clean up the response - remove markdown code blocks if present
			content = content.trim();
			if (content.startsWith('```json')) {
				content = content.slice(7);
			} else if (content.startsWith('```')) {
				content = content.slice(3);
			}
			if (content.endsWith('```')) {
				content = content.slice(0, -3);
			}
			content = content.trim();

			const parsed = JSON.parse(content);

			// Validate and construct synopsis
			synopsis = {
				reasoning: parsed.reasoning || 'This breakdown organizes the work into manageable steps.',
				gettingStarted: parsed.gettingStarted || 'Start with the first subtask and work through them in order.'
			};

		} catch (parseError) {
			// Fallback: create generic synopsis
			console.warn('Failed to parse synopsis, using fallback:', parseError);
			synopsis = {
				reasoning: `Breaking "${taskTitle}" into ${proposedSubtasks.length} subtasks helps you tackle it systematically, focusing on one piece at a time.`,
				gettingStarted: 'Start with the first subtask to build momentum, then work through the rest in order.'
			};
		}

		return new Response(
			JSON.stringify(synopsis),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (err) {
		console.error('Synopsis generation error:', err);
		return new Response(
			JSON.stringify({
				error: {
					message: err instanceof Error ? err.message : 'Failed to generate synopsis',
					type: 'server_error'
				}
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
