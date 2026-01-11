/**
 * Admin System Prompt Debug API
 *
 * GET /api/admin/debug/system-prompt
 *
 * Returns detailed analysis of what system prompt would be sent
 * for a given context (space, area, task, model).
 *
 * Query params:
 * - model (required): Model ID to use for prompt generation
 * - spaceId (optional): Space to include in context
 * - areaId (optional): Area to include in context
 * - taskId (optional): Task to include in context
 * - planModePhase (optional): Plan mode phase (eliciting|proposing|confirming)
 *
 * Returns: PromptAnalysis object with token breakdown
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { postgresOrgMembershipRepository } from '$lib/server/persistence';
import { analyzeSystemPrompt, type AnalyzePromptOptions } from '$lib/server/services/prompt-analyzer';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Require authentication
	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { userId, organizationId } = locals.session;

	// Check user role - only owners and admins can access debug tools
	const memberships = await postgresOrgMembershipRepository.findByUserId(userId);
	const membership = memberships.find((m) => m.organizationId === organizationId);

	if (!membership || membership.role === 'member') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	// Parse query parameters
	const model = url.searchParams.get('model');
	if (!model) {
		return json({ error: 'model parameter is required' }, { status: 400 });
	}

	const spaceId = url.searchParams.get('spaceId') || undefined;
	const areaId = url.searchParams.get('areaId') || undefined;
	const taskId = url.searchParams.get('taskId') || undefined;
	const planModePhase = url.searchParams.get('planModePhase') as
		| 'eliciting'
		| 'proposing'
		| 'confirming'
		| undefined;

	// Validate planModePhase if provided
	if (planModePhase && !['eliciting', 'proposing', 'confirming'].includes(planModePhase)) {
		return json(
			{ error: 'Invalid planModePhase. Must be one of: eliciting, proposing, confirming' },
			{ status: 400 }
		);
	}

	const options: AnalyzePromptOptions = {
		model,
		spaceId,
		areaId,
		taskId,
		planModePhase
	};

	try {
		const analysis = await analyzeSystemPrompt(userId, organizationId, options);
		return json(analysis);
	} catch (error) {
		console.error('[Prompt Analyzer] Error:', error);
		return json(
			{ error: 'Failed to analyze system prompt', details: String(error) },
			{ status: 500 }
		);
	}
};
