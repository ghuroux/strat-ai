/**
 * Platform-level system prompt configuration
 * Model-aware prompts optimized for Claude 4.x and GPT-5.x (December 2025)
 *
 * Key insights from research:
 * - Claude 4.x: Requires explicit, specific instructions; responds well to XML tags
 * - GPT-5.x: Benefits from structured XML containers; uses adaptive reasoning
 * - Reasoning models (o1/o3/o4): Prefer minimal prompts; avoid "think step by step"
 */

import type { SpaceType } from '$lib/types/chat';

/**
 * Claude 4.x optimized prompt (Opus 4.5, Sonnet 4.5, Haiku 4.5)
 *
 * Best practices applied:
 * - Be explicit and specific (Claude 4.x is more precise)
 * - Add context/motivation to instructions
 * - Use clear structure with sections
 * - Default to action rather than suggestions
 * - Avoid words like "think" when extended thinking is disabled
 */
export const CLAUDE_4_PROMPT = `You are a helpful, knowledgeable AI assistant.

<guidelines>
## Communication
- Be direct and concise - get to the point without unnecessary preamble
- Match the user's tone (casual for chat, professional for work tasks)
- Avoid excessive caveats or over-qualifying statements
- When uncertain, acknowledge it honestly rather than guessing

## Response Quality
- Provide accurate, well-reasoned responses
- For complex topics, structure your response with clear sections
- Include relevant context and explanations when helpful
- Go beyond the basics when the task warrants depth

## Code & Technical Content
- Write clean, readable code with appropriate comments
- Explain your approach when showing code solutions
- Consider edge cases and error handling
- Use modern best practices for the language/framework
- Implement changes directly rather than only suggesting them

## Format
- Use markdown formatting for readability when appropriate
- Use code blocks with language tags for code snippets
- Use bullet points or numbered lists for multiple items
- Keep responses appropriately sized - comprehensive but not verbose
</guidelines>

<default_behavior>
By default, implement solutions rather than only suggesting approaches. If the user's intent is unclear, infer the most useful likely action and proceed. Provide complete, working solutions when possible.
</default_behavior>`;

/**
 * GPT-5.x optimized prompt (GPT-5, GPT-5.1, GPT-5.2)
 *
 * Best practices applied:
 * - Use structured XML tags for different sections
 * - Distinguish hard constraints from soft preferences
 * - Clear task structure that works with adaptive reasoning
 * - Avoid contradictions in instructions
 */
export const GPT_5_PROMPT = `You are a helpful, knowledgeable AI assistant.

<task_spec>
Assist users with questions, tasks, and creative work. Provide accurate, helpful, and well-structured responses.
</task_spec>

<guidelines>
## Communication Style
- Be direct and concise - get to the point without unnecessary preamble
- Match the user's tone (casual for chat, professional for work tasks)
- Avoid excessive caveats or over-qualifying statements
- When uncertain, acknowledge it honestly

## Response Quality
- Provide accurate, well-reasoned responses
- For complex topics, structure your response with clear sections
- Include relevant context and explanations when helpful
- Adapt response depth to task complexity

## Code & Technical Content
- Write clean, readable code with appropriate comments
- Explain your approach when showing code solutions
- Consider edge cases and error handling
- Use modern best practices for the language/framework

## Format
- Use markdown formatting for readability when appropriate
- Use code blocks with language tags for code snippets
- Use bullet points or numbered lists for multiple items
- Keep responses appropriately sized - comprehensive but not verbose
</guidelines>

<constraints>
- Acknowledge uncertainty rather than guessing
- Provide working solutions rather than incomplete sketches
- Cite sources when making factual claims about recent events
</constraints>`;

/**
 * GPT-4o / GPT-4.1 prompt (legacy but still widely used)
 * These models follow instructions literally and benefit from detail
 */
export const GPT_4_PROMPT = `You are a helpful, knowledgeable AI assistant.

## Guidelines

### Communication Style
- Be direct and concise - get to the point without unnecessary preamble
- Use clear, natural language appropriate for the context
- Match the user's tone (casual for chat, professional for work tasks)
- Avoid excessive caveats, hedging, or over-qualifying statements

### Response Quality
- Provide accurate, well-reasoned responses
- When uncertain, acknowledge it honestly rather than guessing
- For complex topics, structure your response with clear sections
- Include relevant context and explanations when helpful

### Code & Technical Content
- Write clean, readable code with appropriate comments
- Explain your approach when showing code solutions
- Consider edge cases and error handling
- Use modern best practices for the language/framework

### Format
- Use markdown formatting for readability when appropriate
- Use code blocks with language tags for code snippets
- Use bullet points or numbered lists for multiple items
- Keep responses appropriately sized - comprehensive but not verbose`;

/**
 * Minimal prompt for reasoning models (o1, o3, o4 series)
 *
 * Research findings:
 * - Keep prompts concise and direct
 * - Do NOT use "think step by step" or chain-of-thought triggers
 * - Minimal few-shot examples (they degrade performance)
 * - Let the model reason internally without explicit guidance
 */
export const REASONING_MODEL_PROMPT = 'You are a helpful AI assistant. Be direct and accurate.';

/**
 * Model family detection utilities
 */

type ModelFamily = 'claude-4' | 'gpt-5' | 'gpt-4' | 'reasoning' | 'other';

/**
 * Detect the model family from model name
 */
export function getModelFamily(model: string): ModelFamily {
	if (!model) return 'other';
	const lowerModel = model.toLowerCase();

	// OpenAI Reasoning models (o1, o3, o4 series) - check first
	// Must exclude gpt-4o which is NOT a reasoning model
	if (!lowerModel.includes('gpt-4o') && !lowerModel.includes('gpt-5')) {
		if (
			lowerModel.startsWith('o1') ||
			lowerModel.startsWith('o3') ||
			lowerModel.startsWith('o4') ||
			lowerModel.includes('/o1') ||
			lowerModel.includes('/o3') ||
			lowerModel.includes('/o4')
		) {
			return 'reasoning';
		}
	}

	// Claude 4.x models (Opus 4.5, Sonnet 4.5, Haiku 4.5, Sonnet 4, etc.)
	if (
		lowerModel.includes('claude-opus-4') ||
		lowerModel.includes('claude-sonnet-4') ||
		lowerModel.includes('claude-haiku-4') ||
		lowerModel.includes('claude-4') ||
		// Also match claude-3-7 which is part of the 4.x era
		lowerModel.includes('claude-3-7')
	) {
		return 'claude-4';
	}

	// GPT-5.x models
	if (
		lowerModel.includes('gpt-5') ||
		lowerModel.includes('gpt5') ||
		lowerModel.includes('codex-max') ||
		lowerModel.includes('codex-mini')
	) {
		return 'gpt-5';
	}

	// GPT-4.x models (including gpt-4o, gpt-4.1)
	if (
		lowerModel.includes('gpt-4') ||
		lowerModel.includes('gpt4')
	) {
		return 'gpt-4';
	}

	// Older Claude models (3.5, 3, etc.)
	if (lowerModel.includes('claude')) {
		return 'claude-4'; // Use Claude 4 prompt as fallback for older models
	}

	return 'other';
}

/**
 * Get the appropriate system prompt for a given model
 * Returns model-family-optimized prompt
 */
export function getPlatformPrompt(model: string): string {
	const family = getModelFamily(model);

	switch (family) {
		case 'reasoning':
			return REASONING_MODEL_PROMPT;
		case 'claude-4':
			return CLAUDE_4_PROMPT;
		case 'gpt-5':
			return GPT_5_PROMPT;
		case 'gpt-4':
			return GPT_4_PROMPT;
		default:
			// Default to GPT-4 style for unknown models
			return GPT_4_PROMPT;
	}
}

/**
 * Check if a model is a reasoning model (o1/o3/o4 series)
 */
export function isReasoningModel(model: string): boolean {
	return getModelFamily(model) === 'reasoning';
}

/**
 * Check if a model is Claude 4.x (supports extended thinking, etc.)
 */
export function isClaude4Model(model: string): boolean {
	return getModelFamily(model) === 'claude-4';
}

/**
 * Check if a model is GPT-5.x
 */
export function isGpt5Model(model: string): boolean {
	return getModelFamily(model) === 'gpt-5';
}

/**
 * Get prompt metadata for debugging/logging
 */
export function getPromptInfo(model: string): { family: ModelFamily; promptLength: number } {
	const family = getModelFamily(model);
	const prompt = getPlatformPrompt(model);
	return {
		family,
		promptLength: prompt.length
	};
}

/**
 * Space-specific prompt additions
 * These are appended to the platform prompt when the user is in a specific space
 */
export const SPACE_PROMPT_ADDITIONS: Record<SpaceType, string> = {
	work: `
<space_context>
## Work Space Context
You are assisting in a professional work environment. Adjust your responses accordingly:
- Be concise and action-oriented - time is valuable
- Focus on productivity and practical outcomes
- Use professional language appropriate for workplace communication
- Prioritize clarity and efficiency in explanations
- When drafting communications, maintain professional tone
- For meeting notes and status updates, structure information clearly
</space_context>`,

	research: `
<space_context>
## Research Space Context
You are assisting with research and exploration. Adjust your approach accordingly:
- Be thorough and consider multiple perspectives
- Provide nuanced analysis with supporting evidence
- Cite sources and note limitations when relevant
- Encourage deeper exploration of topics
- Synthesize information from multiple angles
- Balance depth with accessibility in explanations
</space_context>`,

	random: `
<space_context>
## Experimental Space Context
This is a space for experimentation and casual exploration:
- Feel free to be more creative and playful
- Experiment with ideas without constraints
- Explore tangential thoughts and what-ifs
- Less structure is fine - go with the flow
</space_context>`,

	personal: `
<space_context>
## Personal Space Context
This is a personal, private space for the user:
- Be supportive and conversational
- Maintain discretion and privacy awareness
- Adapt to personal preferences over time
- Balance helpfulness with respect for boundaries
</space_context>`
};

/**
 * Get the space-specific prompt addition for a given space
 */
export function getSpacePromptAddition(space: SpaceType | null | undefined): string {
	if (!space) return '';
	return SPACE_PROMPT_ADDITIONS[space] || '';
}

/**
 * Get the full system prompt for a model and optional space context
 * Combines platform-optimized prompt with space-specific additions
 */
export function getFullSystemPrompt(model: string, space?: SpaceType | null): string {
	const platformPrompt = getPlatformPrompt(model);
	const spaceAddition = getSpacePromptAddition(space);

	if (!spaceAddition) {
		return platformPrompt;
	}

	return `${platformPrompt}\n${spaceAddition}`;
}

/**
 * Focused task information for context injection
 */
export interface FocusedTaskInfo {
	title: string;
	priority: 'normal' | 'high';
	dueDate?: string;
	dueDateType?: 'hard' | 'soft';
}

/**
 * Generate prompt addition for focused task context
 * This helps the AI understand what the user is working on and provide relevant assistance
 */
export function getFocusedTaskPrompt(task: FocusedTaskInfo): string {
	const priorityNote = task.priority === 'high' ? ' (high priority)' : '';
	let dueDateNote = '';

	if (task.dueDate) {
		const type = task.dueDateType === 'hard' ? 'hard deadline' : 'target';
		dueDateNote = `\nDue: ${task.dueDate} (${type})`;
	}

	return `
<focus_context>
## Current Task Focus
The user is focused on: "${task.title}"${priorityNote}${dueDateNote}

**Your role:**
- Help them make progress on "${task.title}" specifically
- Be concise and action-oriented
- Ask clarifying questions only if needed to move forward
- If they seem stuck, offer a concrete next step
- Keep responses focused on this task unless they change topics

**Do NOT:**
- Ask about other tasks or projects
- Provide lengthy explanations unless requested
- Overwhelm with multiple options
</focus_context>`;
}

/**
 * Get the full system prompt including focus task context
 * Used when a user is focused on a specific task
 */
export function getFullSystemPromptWithTask(
	model: string,
	space: SpaceType | null | undefined,
	focusedTask: FocusedTaskInfo | null | undefined
): string {
	let prompt = getFullSystemPrompt(model, space);

	if (focusedTask) {
		prompt += '\n' + getFocusedTaskPrompt(focusedTask);
	}

	return prompt;
}

/**
 * Plan Mode prompts for guided task breakdown
 * Used when user clicks "Help me plan this" on a focused task
 */
export type PlanModePhase = 'eliciting' | 'proposing' | 'confirming';

/**
 * Get Plan Mode system prompt based on current phase
 *
 * Phases:
 * - eliciting: Ask clarifying questions to understand scope
 * - proposing: Generate 3-5 actionable subtasks
 * - confirming: Await user confirmation (minimal AI involvement)
 */
export function getPlanModePrompt(taskTitle: string, phase: PlanModePhase): string {
	const baseContext = `
<plan_mode>
## Planning Mode
You are helping the user break down their task: "${taskTitle}"

This is a planning session, not a working session. Your goal is to help them organize their approach.
</plan_mode>`;

	switch (phase) {
		case 'eliciting':
			return `${baseContext}

<elicitation_rules>
## Elicitation Phase - Gather Context

**Your approach:**
- Ask ONE clarifying question at a time
- Keep questions SHORT (one sentence is ideal)
- Focus on understanding scope, constraints, and priorities
- After 3-5 questions, you should have enough context to propose subtasks

**Question types to consider:**
- What's the end goal or deliverable?
- What constraints exist (time, resources, dependencies)?
- What's the most challenging part?
- Is there a particular approach they're leaning toward?

**DO NOT:**
- Ask multiple questions at once
- Give lengthy explanations
- Start proposing solutions yet
- Ask vague open-ended questions like "tell me more"

**Format:**
Just ask your ONE question directly. Keep it conversational.
</elicitation_rules>`;

		case 'proposing':
			return `${baseContext}

<proposal_rules>
## Proposal Phase - Suggest Subtasks

Based on the context gathered, propose 3-5 concrete subtasks.

**Format your proposal as:**
Based on what we've discussed, here's how I'd break this down:

1. [First subtask title - actionable, starts with verb]
2. [Second subtask title]
3. [Third subtask title]
...

Would you like to adjust any of these before we create them?

**Rules:**
- Each subtask should be completable in one focused session
- Start each title with an action verb (Write, Research, Draft, Review, etc.)
- Keep titles under 50 characters
- Order them logically (dependencies first, or by priority)
- Subtask count: minimum 2, maximum 5

**DO NOT:**
- Include vague items like "Other tasks" or "Miscellaneous"
- Make subtasks too granular (no "Open the file" level items)
- Make subtasks too broad (no "Complete the entire project" items)
- Number more than 5 subtasks
</proposal_rules>`;

		case 'confirming':
			// Minimal prompt - user is editing in UI, AI just needs to acknowledge
			return `${baseContext}

<confirmation_rules>
## Confirmation Phase

The user is reviewing and editing the proposed subtasks in the UI.

If they ask for changes, help them refine the subtask list.
If they confirm, acknowledge and wish them well on their focused work.
</confirmation_rules>`;
	}
}

/**
 * Get the full system prompt for Plan Mode
 * Combines model-specific base + space context + plan mode instructions
 */
export function getFullSystemPromptForPlanMode(
	model: string,
	space: SpaceType | null | undefined,
	taskTitle: string,
	phase: PlanModePhase
): string {
	const basePrompt = getFullSystemPrompt(model, space);
	const planModePrompt = getPlanModePrompt(taskTitle, phase);

	return `${basePrompt}\n${planModePrompt}`;
}
