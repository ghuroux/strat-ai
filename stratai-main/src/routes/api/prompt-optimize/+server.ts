import type { RequestHandler } from './$types';
import { createChatCompletion, mapErrorMessage } from '$lib/server/litellm';

interface PromptOptimizeRequest {
	prompt: string;
}

const OPTIMIZER_SYSTEM_PROMPT = `<role>You are a prompt rewriter. You transform user prompts into more effective versions that get better AI responses.</role>

<context>
Effective prompts include: clear objective, relevant context, output format, and constraints.
Your job is to add these elements where missing, while keeping the user's original intent.
</context>

<rules>
- REWRITE the prompt, do NOT answer it
- Write in FIRST PERSON as the user talking to an AI
- Never respond as an AI assistant
- Never ask clarifying questions - make reasonable assumptions
- Never use "You want to..." or "Based on your request..."
</rules>

<optimization_elements>
Consider adding where helpful:
1. Specificity - turn vague requests into concrete asks
2. Output format - bullets, steps, table, examples, code, etc.
3. Context - background info the AI needs to help effectively
4. Role - "As an expert in X..." when domain expertise helps
5. Constraints - length, tone, audience, what to include/exclude
</optimization_elements>

<guidelines>
- Add value, not bloat - keep rewritten prompts concise
- Simple factual questions need no optimization
- If ambiguous, assume the most common/useful interpretation
- Preserve any specific details the user included
</guidelines>

<output_format>Return ONLY the rewritten prompt. No explanations, labels, or quotes.</output_format>

<examples>
<example>
<input>explain recursion</input>
<output>Explain recursion in programming. Cover the definition, how base cases and recursive cases work, a simple code example, and common use cases. Keep it beginner-friendly.</output>
</example>

<example>
<input>i want to work on my summer body</input>
<output>I want to get in shape for summer. Create a 12-week fitness plan with workout routines (strength and cardio), nutrition guidelines, and weekly milestones. Assume I'm a beginner with gym access.</output>
</example>

<example>
<input>help me write an email</input>
<output>Help me write a professional email to my manager requesting time off next month. Keep it concise and polite, and include a subject line.</output>
</example>

<example>
<input>make my code faster</input>
<output>What are the most effective techniques to optimize code performance? Cover algorithm improvements, caching, and profiling. Include practical examples.</output>
</example>

<example>
<input>What's the capital of France?</input>
<output>What's the capital of France?</output>
</example>

<example>
<input>write a python script</input>
<output>Write a Python script that [specific task]. Include comments explaining the logic, error handling, and a usage example.</output>
</example>
</examples>`;

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
	let body: PromptOptimizeRequest;
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

	const { prompt } = body;

	// Validate input
	if (!prompt || prompt.trim().length === 0) {
		return new Response(
			JSON.stringify({ error: { message: 'Prompt is required', type: 'validation_error' } }),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Skip optimization for very short prompts
	if (prompt.trim().length < 5) {
		return new Response(
			JSON.stringify({
				optimizedPrompt: prompt,
				unchanged: true,
				reason: 'Prompt too short to optimize'
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	try {
		// Create non-streaming request to LiteLLM using Haiku (fast & cheap)
		const response = await createChatCompletion({
			model: 'claude-haiku-4-5',
			messages: [
				{ role: 'system', content: OPTIMIZER_SYSTEM_PROMPT },
				{ role: 'user', content: `Rewrite this prompt:\n\n${prompt}` }
			],
			temperature: 0.3, // Lower temperature for more consistent output
			max_tokens: 1000, // Optimized prompts should be concise
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
		let optimizedPrompt = result.choices?.[0]?.message?.content || '';

		// Clean up the response - remove any accidental markdown or quotes
		optimizedPrompt = optimizedPrompt.trim();
		if (optimizedPrompt.startsWith('"') && optimizedPrompt.endsWith('"')) {
			optimizedPrompt = optimizedPrompt.slice(1, -1);
		}
		if (optimizedPrompt.startsWith("'") && optimizedPrompt.endsWith("'")) {
			optimizedPrompt = optimizedPrompt.slice(1, -1);
		}

		// Check if prompt is essentially unchanged
		const isUnchanged = optimizedPrompt.trim().toLowerCase() === prompt.trim().toLowerCase();

		return new Response(
			JSON.stringify({
				optimizedPrompt,
				unchanged: isUnchanged
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (err) {
		console.error('Prompt optimization error:', err);
		return new Response(
			JSON.stringify({
				error: {
					message: err instanceof Error ? err.message : 'Failed to optimize prompt',
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
