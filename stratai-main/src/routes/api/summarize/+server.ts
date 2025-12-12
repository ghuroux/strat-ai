import type { RequestHandler } from './$types';
import { createChatCompletion, mapErrorMessage } from '$lib/server/litellm';

interface SummarizeRequest {
	model: string;
	messages: Array<{ role: string; content: string }>;
}

export interface SummaryPoint {
	text: string;
	messageIndices: number[];
}

export interface StructuredSummary {
	points: SummaryPoint[];
}

const SUMMARIZE_SYSTEM_PROMPT = `You are a conversation summarizer. Analyze the following conversation and provide a concise summary in 3-6 key points.

For each point, identify which message(s) it relates to using the message indices provided.

You MUST respond with valid JSON in this exact format:
{
  "points": [
    { "text": "Brief description of what happened", "messageIndices": [0, 1] },
    { "text": "Another key point", "messageIndices": [2] }
  ]
}

Rules:
- Each point should be a concise summary (1 sentence)
- messageIndices is an array of 0-based indices referring to the messages
- Include 3-6 points covering the main topics, decisions, and outcomes
- Focus on substantive content, not greetings or pleasantries
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
		// Format conversation with indices for the LLM
		const conversationText = messages
			.filter(m => m.role === 'user' || m.role === 'assistant')
			.map((m, index) => `[${index}] ${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
			.join('\n\n');

		// Create non-streaming request to LiteLLM
		const response = await createChatCompletion({
			model,
			messages: [
				{ role: 'system', content: SUMMARIZE_SYSTEM_PROMPT },
				{ role: 'user', content: `Summarize this conversation and identify relevant message indices:\n\n${conversationText}` }
			],
			temperature: 0.3, // Lower temperature for more consistent summaries
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
		let structuredSummary: StructuredSummary;
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

			structuredSummary = JSON.parse(content);

			// Validate structure
			if (!structuredSummary.points || !Array.isArray(structuredSummary.points)) {
				throw new Error('Invalid structure');
			}

			// Ensure each point has the required fields
			structuredSummary.points = structuredSummary.points.map(point => ({
				text: point.text || '',
				messageIndices: Array.isArray(point.messageIndices) ? point.messageIndices : []
			}));
		} catch {
			// Fallback: convert plain text to structured format
			console.warn('Failed to parse structured summary, falling back to plain text');
			const lines = content.split('\n').filter((line: string) => line.trim());
			structuredSummary = {
				points: lines.map((line: string) => ({
					text: line.replace(/^[-•*]\s*/, '').trim(),
					messageIndices: [] // No indices available in fallback
				}))
			};
		}

		return new Response(
			JSON.stringify({ summary: structuredSummary }),
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
