import type { RequestHandler } from './$types';
import { createChatCompletion, mapErrorMessage } from '$lib/server/litellm';
import type { Message } from '$lib/types/chat';

interface SummarizeRequest {
	model: string;
	messages: Array<{ role: string; content: string }>;
}

const SUMMARIZE_SYSTEM_PROMPT = `You are a conversation summarizer. Analyze the following conversation and provide a concise summary in 3-5 bullet points.

Focus on:
- Main topics discussed
- Key decisions or conclusions reached
- Important information shared
- Any action items or next steps mentioned

Format: Return ONLY the bullet points, one per line, starting with a dash (-). No introduction or conclusion text. Keep each bullet brief and informative.`;

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
	let body: SummarizeRequest;
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

	const { model, messages } = body;

	if (!model || !messages || messages.length === 0) {
		return new Response(
			JSON.stringify({ error: { message: 'Model and messages are required', type: 'validation_error' } }),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	try {
		// Format conversation for summarization
		const conversationText = messages
			.filter(m => m.role === 'user' || m.role === 'assistant')
			.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
			.join('\n\n');

		// Create non-streaming request to LiteLLM
		const response = await createChatCompletion({
			model,
			messages: [
				{ role: 'system', content: SUMMARIZE_SYSTEM_PROMPT },
				{ role: 'user', content: `Please summarize this conversation:\n\n${conversationText}` }
			],
			temperature: 0.3, // Lower temperature for more consistent summaries
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
		const summary = result.choices?.[0]?.message?.content || '';

		return new Response(
			JSON.stringify({ summary }),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (err) {
		console.error('Summarization error:', err);
		return new Response(
			JSON.stringify({
				error: {
					message: err instanceof Error ? err.message : 'Failed to generate summary',
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
