/**
 * Meeting Title Suggestion API
 *
 * POST /api/meetings/suggest-title
 * Derives a concise subject line from the meeting purpose via LLM.
 * Non-streaming JSON response with graceful fallback.
 */

import type { RequestHandler } from './$types';
import { createChatCompletion, mapErrorMessage } from '$lib/server/litellm';

const SUGGESTION_MODEL = 'claude-3-5-haiku';

const SYSTEM_PROMPT = `You generate concise meeting subject lines from meeting descriptions.

Rules:
- Maximum 60 characters
- No quotes or punctuation wrapping
- Use title case
- Be specific, not generic (e.g. "Q1 Launch Sprint Planning" not "Team Meeting")
- If the input is already concise enough, return it cleaned up

You MUST respond with valid JSON in this exact format:
{"title": "Your Subject Line Here"}

Return ONLY the JSON object, no markdown code blocks or other text.`;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session) {
		return new Response(
			JSON.stringify({ error: { message: 'Unauthorized', type: 'auth_error' } }),
			{ status: 401, headers: { 'Content-Type': 'application/json' } }
		);
	}

	let body: { purpose?: string };
	try {
		body = await request.json();
	} catch {
		return new Response(
			JSON.stringify({ error: { message: 'Invalid JSON', type: 'parse_error' } }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const { purpose } = body;

	if (!purpose || !purpose.trim()) {
		return new Response(
			JSON.stringify({ error: { message: 'purpose is required', type: 'validation_error' } }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	try {
		const response = await createChatCompletion({
			model: SUGGESTION_MODEL,
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'user', content: `Meeting description: "${purpose.trim()}"` }
			],
			temperature: 0.3,
			max_tokens: 100,
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
			console.error('[suggest-title] LLM error:', errorMessage);
			return new Response(
				JSON.stringify({ title: '' }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const result = await response.json();
		let content = result.choices?.[0]?.message?.content || '';

		// Parse JSON
		content = content.trim();
		if (content.startsWith('```json')) content = content.slice(7);
		else if (content.startsWith('```')) content = content.slice(3);
		if (content.endsWith('```')) content = content.slice(0, -3);
		content = content.trim();

		const parsed = JSON.parse(content);
		const title = String(parsed.title || '').slice(0, 100);

		return new Response(
			JSON.stringify({ title }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		console.error('[suggest-title] Error:', err);
		return new Response(
			JSON.stringify({ title: '' }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
