/**
 * Meeting Outcome Suggestions API
 *
 * POST /api/meetings/suggest-outcomes
 * Uses Area context + open tasks to suggest 2-4 meeting outcomes via LLM.
 * Non-streaming JSON response with graceful fallback on failure.
 */

import type { RequestHandler } from './$types';
import { createChatCompletion, mapErrorMessage } from '$lib/server/litellm';
import { postgresAreaRepository } from '$lib/server/persistence/areas-postgres';
import { postgresTaskRepository } from '$lib/server/persistence/tasks-postgres';
import type { SuggestOutcomesResponse } from '$lib/types/meeting-wizard';

const SUGGESTION_MODEL = 'claude-3-5-haiku';

function buildSystemPrompt(areaName: string, areaNotes: string | undefined, taskSummaries: string[]): string {
	const contextParts: string[] = [];

	if (areaNotes) {
		contextParts.push(`Area notes:\n${areaNotes}`);
	}

	if (taskSummaries.length > 0) {
		contextParts.push(`Open tasks:\n${taskSummaries.join('\n')}`);
	}

	const contextBlock = contextParts.length > 0
		? `\n\nContext for the "${areaName}" area:\n${contextParts.join('\n\n')}`
		: '';

	return `You are a meeting planning assistant. Given a meeting purpose and area context, suggest 2-4 concrete expected outcomes for the meeting.
${contextBlock}

Each outcome should be:
- Specific and actionable (not generic like "discuss things")
- Typed as one of: "decision" (a choice to be made), "action_item" (a task to assign), "information" (knowledge to share/gather), or "custom"
- Grounded in the area context when possible (reference actual tasks, projects, or topics)

You MUST respond with valid JSON in this exact format:
{
  "outcomes": [
    {
      "label": "Short outcome description",
      "type": "decision",
      "reason": "Why this outcome matters for this meeting"
    }
  ]
}

If a suggestion relates to an existing task, include "sourceTaskId" with the task ID.
Return ONLY the JSON object, no markdown code blocks or other text.`;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return new Response(
			JSON.stringify({ error: { message: 'Unauthorized', type: 'auth_error' } }),
			{ status: 401, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const userId = locals.session.userId;

	let body: { areaId?: string; purpose?: string };
	try {
		body = await request.json();
	} catch {
		return new Response(
			JSON.stringify({ error: { message: 'Invalid JSON', type: 'parse_error' } }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const { areaId, purpose } = body;

	if (!areaId || !purpose) {
		return new Response(
			JSON.stringify({ error: { message: 'areaId and purpose are required', type: 'validation_error' } }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	try {
		// Load area context
		const area = await postgresAreaRepository.findById(areaId, userId);
		if (!area) {
			return new Response(
				JSON.stringify({ error: { message: 'Area not found', type: 'not_found' } }),
				{ status: 404, headers: { 'Content-Type': 'application/json' } }
			);
		}

		// Load open tasks for this area's space, then filter to area
		const allTasks = await postgresTaskRepository.findAll(userId, {
			spaceId: area.spaceId,
			status: ['active', 'planning']
		});
		const areaTasks = allTasks.filter(t => t.areaId === areaId).slice(0, 10);

		const taskSummaries = areaTasks.map(t => {
			const priority = t.priority === 'high' ? ' [HIGH]' : '';
			return `- [${t.id}] ${t.title}${priority}`;
		});

		// Build prompt
		const systemPrompt = buildSystemPrompt(area.name, area.context, taskSummaries);
		const userPrompt = `Meeting purpose: "${purpose}"\n\nSuggest 2-4 expected outcomes for this meeting.`;

		// Non-streaming LLM call
		const response = await createChatCompletion({
			model: SUGGESTION_MODEL,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			],
			temperature: 0.4,
			max_tokens: 1000,
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
			console.error('Suggest outcomes LLM error:', errorMessage);
			// Graceful fallback: return empty outcomes
			return new Response(
				JSON.stringify({ outcomes: [] } satisfies SuggestOutcomesResponse),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const result = await response.json();
		let content = result.choices?.[0]?.message?.content || '';

		// Parse JSON response
		let parsed: SuggestOutcomesResponse;
		try {
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

			parsed = JSON.parse(content);

			if (!Array.isArray(parsed.outcomes)) {
				throw new Error('Invalid structure: outcomes must be an array');
			}

			// Validate and sanitize each outcome
			parsed.outcomes = parsed.outcomes
				.slice(0, 4)
				.map(o => ({
					label: String(o.label || '').slice(0, 200),
					type: ['decision', 'action_item', 'information', 'custom'].includes(o.type)
						? o.type
						: 'custom' as const,
					reason: String(o.reason || '').slice(0, 300),
					...(o.sourceTaskId ? { sourceTaskId: String(o.sourceTaskId) } : {})
				}));
		} catch (parseError) {
			console.warn('Failed to parse suggest-outcomes response, returning empty:', parseError);
			parsed = { outcomes: [] };
		}

		return new Response(
			JSON.stringify(parsed),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('Suggest outcomes error:', err);
		// Graceful fallback on any server error
		return new Response(
			JSON.stringify({ outcomes: [] } satisfies SuggestOutcomesResponse),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
