import type { RequestHandler } from './$types';
import { createChatCompletion, mapErrorMessage } from '$lib/server/litellm';
import type { PlanModeSynopsis, SubtaskContext } from '$lib/types/tasks';

/**
 * Request body for plan context generation
 */
interface PlanContextRequest {
	taskTitle: string;
	proposedSubtasks: Array<{
		id: string;
		title: string;
		type: 'conversation' | 'action';
	}>;
}

/**
 * Response from plan context generation
 */
interface PlanContextResponse {
	synopsis: PlanModeSynopsis;
	subtaskContexts: Array<{
		id: string;
		whyImportant: string;
		definitionOfDone: string;
		hints: string[];
	}>;
}

// Use a fast model for context generation
const CONTEXT_MODEL = 'claude-3-5-haiku';

const PLAN_CONTEXT_SYSTEM_PROMPT = `You are a project planning assistant. Given a task and its proposed breakdown into subtasks, generate helpful context that will guide the user through each step.

For the SYNOPSIS, provide:
1. "reasoning" - Why this breakdown makes sense for accomplishing the task (2-3 sentences, clear and encouraging)
2. "gettingStarted" - Practical advice on how to begin, which subtask to start with and why (1-2 sentences)

For EACH SUBTASK, provide:
1. "whyImportant" - Why this step matters to the overall goal (1 concise sentence)
2. "definitionOfDone" - Clear, actionable criteria for knowing when this subtask is complete (1-2 sentences)
3. "hints" - 2-3 practical tips, approaches, or things to consider when working on this subtask

You MUST respond with valid JSON in this exact format:
{
  "synopsis": {
    "reasoning": "...",
    "gettingStarted": "..."
  },
  "subtaskContexts": [
    {
      "id": "subtask_id_here",
      "whyImportant": "...",
      "definitionOfDone": "...",
      "hints": ["tip 1", "tip 2", "tip 3"]
    }
  ]
}

Rules:
- Match each subtaskContext's "id" to the subtask id from the input
- Be specific and actionable, not generic
- Keep text concise but helpful
- For "action" type subtasks, the definition of done is usually simpler (e.g., "checkbox is checked")
- For "conversation" type subtasks, describe what understanding or output should be achieved
- Return ONLY the JSON object, no markdown code blocks or other text`;

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
	let body: PlanContextRequest;
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

	const { taskTitle, proposedSubtasks } = body;

	if (!taskTitle || !proposedSubtasks || proposedSubtasks.length === 0) {
		return new Response(
			JSON.stringify({ error: { message: 'Task title and subtasks are required', type: 'validation_error' } }),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Limit subtasks to prevent token overflow
	const limitedSubtasks = proposedSubtasks.slice(0, 15);

	try {
		// Format the subtasks for the LLM
		const subtaskList = limitedSubtasks
			.map((s, i) => `${i + 1}. [${s.id}] "${s.title}" (type: ${s.type})`)
			.join('\n');

		const userPrompt = `Task: "${taskTitle}"

Proposed subtasks:
${subtaskList}

Generate context for this plan breakdown.`;

		// Create non-streaming request
		const response = await createChatCompletion({
			model: CONTEXT_MODEL,
			messages: [
				{ role: 'system', content: PLAN_CONTEXT_SYSTEM_PROMPT },
				{ role: 'user', content: userPrompt }
			],
			temperature: 0.3, // Lower temperature for consistency
			max_tokens: 2000, // Allow for detailed context
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

		// Try to parse as JSON
		let planContext: PlanContextResponse;
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

			planContext = JSON.parse(content);

			// Validate structure
			if (!planContext.synopsis || !planContext.subtaskContexts) {
				throw new Error('Invalid structure');
			}

			// Ensure synopsis has required fields
			planContext.synopsis = {
				reasoning: planContext.synopsis.reasoning || 'This breakdown helps organize the work into manageable steps.',
				gettingStarted: planContext.synopsis.gettingStarted || 'Start with the first subtask and work through them in order.'
			};

			// Ensure each subtask context has required fields
			planContext.subtaskContexts = planContext.subtaskContexts.map(ctx => ({
				id: ctx.id,
				whyImportant: ctx.whyImportant || 'This step contributes to the overall goal.',
				definitionOfDone: ctx.definitionOfDone || 'Complete when you feel satisfied with the result.',
				hints: Array.isArray(ctx.hints) ? ctx.hints : []
			}));

		} catch (parseError) {
			// Fallback: create generic context
			console.warn('Failed to parse plan context, using fallback:', parseError);
			planContext = {
				synopsis: {
					reasoning: `Breaking "${taskTitle}" into these subtasks helps you tackle it systematically, focusing on one piece at a time.`,
					gettingStarted: 'Start with the first subtask to build momentum, then work through the rest in order.'
				},
				subtaskContexts: limitedSubtasks.map(s => ({
					id: s.id,
					whyImportant: 'This step contributes to completing the overall task.',
					definitionOfDone: s.type === 'action'
						? 'Complete when checked off.'
						: 'Complete when you\'ve explored the topic and feel ready to move on.',
					hints: ['Take your time with this step.', 'Ask for help if you get stuck.']
				}))
			};
		}

		return new Response(
			JSON.stringify(planContext),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (err) {
		console.error('Plan context generation error:', err);
		return new Response(
			JSON.stringify({
				error: {
					message: err instanceof Error ? err.message : 'Failed to generate plan context',
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
