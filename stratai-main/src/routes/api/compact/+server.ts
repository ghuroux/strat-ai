import type { RequestHandler } from './$types';
import { createChatCompletion, mapErrorMessage } from '$lib/server/litellm';
import { SUMMARY_MODEL } from '$lib/services/tokenEstimation';

interface CompactRequest {
	messages: Array<{ role: string; content: string }>;
}

interface CompactResponse {
	summary: string;
	continuationSystemPrompt: string;
}

const COMPACT_SYSTEM_PROMPT = `You are a conversation compactor. Your job is to create a concise but comprehensive summary of a conversation that will be used to continue the discussion in a new session.

Summarize the key points in a structured format:

1. **Context**: What was the user trying to accomplish?
2. **Key Topics**: Main subjects discussed (2-4 bullet points)
3. **Decisions Made**: Any conclusions or choices reached
4. **Current State**: Where the conversation left off
5. **Pending Items**: Any unanswered questions or next steps

Keep the summary under 400 words. Be specific - include relevant details like file names, code concepts, or specific decisions that would be needed to continue the work effectively.`;

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
	let body: CompactRequest;
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

	const { messages } = body;

	if (!messages || messages.length === 0) {
		return new Response(
			JSON.stringify({ error: { message: 'Messages are required', type: 'validation_error' } }),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	try {
		// Format conversation for compacting
		const conversationText = messages
			.filter((m) => m.role === 'user' || m.role === 'assistant')
			.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
			.join('\n\n');

		// Use the configurable summary model (Haiku by default)
		const response = await createChatCompletion({
			model: SUMMARY_MODEL,
			messages: [
				{ role: 'system', content: COMPACT_SYSTEM_PROMPT },
				{ role: 'user', content: `Please create a continuation summary for this conversation:\n\n${conversationText}` }
			],
			temperature: 0.3, // Lower temperature for consistent summaries
			max_tokens: 800,
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

		// Create the continuation system prompt
		const continuationSystemPrompt = `You are continuing a previous conversation. The session was refreshed to manage context length, but you should continue helping as if the conversation never paused.

Here is the summary of what was discussed:

${summary}

Important: Acknowledge the context briefly in your first response, then continue helping naturally. Reference something specific from the summary to show you understand the context.`;

		const responseData: CompactResponse = {
			summary,
			continuationSystemPrompt
		};

		return new Response(JSON.stringify(responseData), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('Compact error:', err);
		return new Response(
			JSON.stringify({
				error: {
					message: err instanceof Error ? err.message : 'Failed to compact conversation',
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
