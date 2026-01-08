import type { RequestHandler } from './$types';
import { LITELLM_BASE_URL, LITELLM_API_KEY } from '$env/static/private';
import type { TemplateCategory } from '$lib/config/battle-templates';

/**
 * Arena Judge API Endpoint
 * Uses Claude Sonnet 4.5 to evaluate model responses objectively
 * Also detects/suggests category when "general" is selected
 */

interface JudgeRequest {
	prompt: string;
	category?: TemplateCategory;
	responses: Array<{
		modelId: string;
		modelName: string;
		content: string;
	}>;
}

interface JudgeResponse {
	winnerId: string | null;
	analysis: string;
	scores: Record<string, number>;
	criteria: string[];
	suggestedCategory?: TemplateCategory;
	categoryConfidence?: number;
}

const JUDGE_MODEL = 'anthropic/claude-sonnet-4-20250514';

const JUDGE_SYSTEM_PROMPT = `You are an expert AI response evaluator. Your task is to objectively compare and score AI model responses.

Evaluate responses based on these criteria:
1. **Accuracy**: Is the information correct and factual?
2. **Completeness**: Does it fully address the prompt?
3. **Clarity**: Is it well-organized and easy to understand?
4. **Helpfulness**: Does it provide actionable, useful information?
5. **Conciseness**: Is it appropriately detailed without being verbose?

IMPORTANT RULES:
- Be objective and unbiased - do not favor any particular model
- Focus on the quality of the response content, not the model name
- Scores should reflect meaningful differences (don't give all models similar scores unless warranted)
- If responses are truly equal in quality, declare a tie

You must respond with a JSON object in this exact format:
{
  "winnerId": "model_id_of_winner_or_null_if_tie",
  "analysis": "2-4 sentence explanation of your evaluation, highlighting key differences",
  "scores": {
    "model_id_1": 8,
    "model_id_2": 7
  },
  "criteria": ["accuracy", "clarity", "completeness"]
}

Scores should be from 1-10:
- 9-10: Exceptional quality
- 7-8: Good quality
- 5-6: Adequate
- 3-4: Below average
- 1-2: Poor quality`;

// Extended prompt for category detection
const CATEGORY_DETECTION_ADDENDUM = `

CATEGORY DETECTION:
The user selected "general" as the category. Based on the prompt content, determine the most appropriate specific category:
- coding: Programming, debugging, algorithms, code review, technical implementation
- reasoning: Logic puzzles, math problems, analysis, ethical dilemmas, step-by-step problem solving
- creative: Writing, storytelling, marketing copy, explanations, brainstorming
- analysis: Comparisons, summaries, research synthesis, pros/cons, evaluations
- general: If none of the above fit well

Add these fields to your JSON response:
- "suggestedCategory": The detected category (coding, reasoning, creative, analysis, or general)
- "categoryConfidence": A number 0.0-1.0 indicating confidence in the category detection`;

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
	let body: JudgeRequest;
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

	// Validate request
	if (!body.prompt || !body.responses || body.responses.length < 2) {
		return new Response(
			JSON.stringify({
				error: { message: 'Invalid request: prompt and at least 2 responses required', type: 'validation_error' }
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	try {
		// Build the evaluation prompt
		const responsesText = body.responses
			.map((r, i) => `### Response ${i + 1} (${r.modelId})\n${r.content}`)
			.join('\n\n---\n\n');

		const userPrompt = `## Original Prompt
${body.prompt}

## Responses to Evaluate
${responsesText}

Please evaluate these responses and provide your judgment in the specified JSON format.`;

		// Include category detection for "general" category
		const shouldDetectCategory = !body.category || body.category === 'general';
		const systemPrompt = shouldDetectCategory
			? JUDGE_SYSTEM_PROMPT + CATEGORY_DETECTION_ADDENDUM
			: JUDGE_SYSTEM_PROMPT;

		// Call the judge model
		const response = await fetch(`${LITELLM_BASE_URL}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${LITELLM_API_KEY}`
			},
			body: JSON.stringify({
				model: JUDGE_MODEL,
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: userPrompt }
				],
				temperature: 0.3, // Lower temperature for more consistent evaluations
				max_tokens: 1200 // Slightly higher to accommodate category detection
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Judge API error:', response.status, errorText);
			return new Response(
				JSON.stringify({
					error: { message: 'Failed to get judgment from AI', type: 'upstream_error' }
				}),
				{
					status: 502,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		const data = await response.json();
		const content = data.choices?.[0]?.message?.content;

		if (!content) {
			return new Response(
				JSON.stringify({
					error: { message: 'Empty response from judge', type: 'empty_response' }
				}),
				{
					status: 502,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Parse the JSON response from the model
		// The model might wrap it in markdown code blocks
		let judgment: JudgeResponse;
		try {
			// Try to extract JSON from markdown code blocks if present
			const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
			const jsonStr = jsonMatch[1]?.trim() || content.trim();
			judgment = JSON.parse(jsonStr);
		} catch (parseError) {
			console.error('Failed to parse judge response:', content);
			// Return a fallback response
			judgment = {
				winnerId: null,
				analysis: 'Unable to parse evaluation. The responses appear to be comparable in quality.',
				scores: Object.fromEntries(body.responses.map(r => [r.modelId, 5])),
				criteria: ['accuracy', 'clarity', 'completeness']
			};
		}

		// Validate the judgment structure
		if (!judgment.analysis) {
			judgment.analysis = 'Evaluation completed.';
		}
		if (!judgment.scores || typeof judgment.scores !== 'object') {
			judgment.scores = Object.fromEntries(body.responses.map(r => [r.modelId, 5]));
		}
		if (!judgment.criteria || !Array.isArray(judgment.criteria)) {
			judgment.criteria = ['accuracy', 'clarity', 'completeness'];
		}

		// Validate suggested category if present
		const validCategories: TemplateCategory[] = ['coding', 'reasoning', 'creative', 'analysis', 'general'];
		if (judgment.suggestedCategory && !validCategories.includes(judgment.suggestedCategory)) {
			judgment.suggestedCategory = undefined;
		}
		if (judgment.categoryConfidence !== undefined) {
			// Clamp confidence to 0-1 range
			judgment.categoryConfidence = Math.max(0, Math.min(1, judgment.categoryConfidence));
		}

		// Ensure winnerId is valid (exists in responses) or null
		const validModelIds = body.responses.map(r => r.modelId);
		if (judgment.winnerId && !validModelIds.includes(judgment.winnerId)) {
			// Try to find winner from highest score
			const highestScore = Math.max(...Object.values(judgment.scores));
			const winners = Object.entries(judgment.scores).filter(([, score]) => score === highestScore);
			judgment.winnerId = winners.length === 1 ? winners[0][0] : null;
		}

		return new Response(JSON.stringify(judgment), {
			headers: { 'Content-Type': 'application/json' }
		});

	} catch (err) {
		console.error('Judge endpoint error:', err);
		return new Response(
			JSON.stringify({
				error: {
					message: err instanceof Error ? err.message : 'Unknown error',
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
