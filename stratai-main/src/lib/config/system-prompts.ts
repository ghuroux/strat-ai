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
import { buildContextPrompt, type TaskContextInfo } from '$lib/utils/context-builder';

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
 * Space information for custom space context injection
 */
export interface SpaceInfo {
	id: string;
	name: string;
	slug: string;
	type: 'system' | 'custom';
	context?: string; // User-provided markdown context
	contextDocuments?: Array<{
		id: string;
		filename: string;
		content: string;
		charCount: number;
	}>;
}

/**
 * Get the space-specific prompt addition for a given space
 * For system spaces, uses the predefined prompts
 * For custom spaces, uses the user-provided context
 */
export function getSpacePromptAddition(space: SpaceType | null | undefined): string {
	if (!space) return '';
	return SPACE_PROMPT_ADDITIONS[space] || '';
}

/**
 * Generate a prompt for a space with user-provided context
 * Includes both text context and reference documents
 */
export function getCustomSpacePrompt(space: SpaceInfo): string {
	// Check if there's any context to add
	const hasContext = space.context || (space.contextDocuments && space.contextDocuments.length > 0);
	if (!hasContext) return '';

	let prompt = `
<space_context>
## Space: ${space.name}

You are working within the "${space.name}" space.`;

	// Add text context if present
	if (space.context) {
		prompt += `

### Space Context
${space.context}`;
	}

	// Include reference documents if any
	if (space.contextDocuments && space.contextDocuments.length > 0) {
		prompt += `

### Reference Documents
The following documents provide context for this space:`;

		for (const doc of space.contextDocuments) {
			prompt += `

<document filename="${doc.filename}">
${doc.content}
</document>`;
		}
	}

	prompt += `

**Guidelines:**
- Apply this space context to all responses
- Reference relevant context when helpful${space.contextDocuments?.length ? '\n- Use the reference documents to inform your responses when relevant' : ''}
- Stay focused on topics relevant to this space
</space_context>`;

	return prompt;
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
 * Get the full system prompt with custom space context
 * Used when a custom space has user-provided context
 */
export function getFullSystemPromptWithSpace(model: string, space: SpaceInfo): string {
	const platformPrompt = getPlatformPrompt(model);

	if (space.type === 'system') {
		// Use predefined prompts for system spaces
		const spaceAddition = getSpacePromptAddition(space.slug as SpaceType);
		if (!spaceAddition) {
			return platformPrompt;
		}
		return `${platformPrompt}\n${spaceAddition}`;
	}

	// For custom spaces, use the user-provided context
	const customSpacePrompt = getCustomSpacePrompt(space);
	if (!customSpacePrompt) {
		return platformPrompt;
	}

	return `${platformPrompt}\n${customSpacePrompt}`;
}

/**
 * Document content for context injection
 */
export interface ContextDocument {
	id: string;
	filename: string;
	content: string;
	charCount: number;
}

/**
 * Focus area information for context injection
 * Inherits space context while adding specialized context
 */
export interface FocusAreaInfo {
	id: string;
	name: string;
	context?: string; // Markdown context content
	contextDocuments?: ContextDocument[]; // Documents attached to this focus area
	spaceId: string;
}

/**
 * Focused task information for context injection
 */
export interface FocusedTaskInfo {
	title: string;
	priority: 'normal' | 'high';
	dueDate?: string;
	dueDateType?: 'hard' | 'soft';
	// Subtask context for injecting planning conversation
	isSubtask?: boolean;
	parentTaskTitle?: string;
	sourceConversationId?: string; // Plan Mode conversation ID for context injection
	planningConversationSummary?: string; // Summary of the planning conversation (injected by API)
}

/**
 * Generate prompt addition for focus area context
 * Focus areas provide specialized context within a space
 */
export function getFocusAreaPrompt(focusArea: FocusAreaInfo): string {
	let prompt = `
<focus_area_context>
## Focus Area: ${focusArea.name}
You are assisting within a specialized context called "${focusArea.name}".`;

	if (focusArea.context) {
		prompt += `

### Background Context
${focusArea.context}`;
	}

	// Include reference documents if any
	if (focusArea.contextDocuments && focusArea.contextDocuments.length > 0) {
		prompt += `

### Reference Documents
The following documents provide additional context for this focus area:`;

		for (const doc of focusArea.contextDocuments) {
			prompt += `

<document filename="${doc.filename}">
${doc.content}
</document>`;
		}
	}

	prompt += `

**Your role:**
- Apply this specialized context to all responses
- Reference relevant background information when helpful${focusArea.contextDocuments?.length ? '\n- Use the reference documents to inform your responses when relevant' : ''}
- Stay focused on topics relevant to this context
- If the user asks about unrelated topics, you can still help but acknowledge it's outside this focus area
</focus_area_context>`;

	return prompt;
}

/**
 * Get the space prompt addition for a focus area
 * Uses the focus area's parent space to get the appropriate space context
 */
export function getSpacePromptForFocusArea(focusArea: FocusAreaInfo): string {
	return getSpacePromptAddition(focusArea.spaceId as SpaceType);
}

/**
 * Get the full system prompt with focus area context
 * Combines: Platform → Space → Focus Area
 */
export function getFullSystemPromptWithFocusArea(
	model: string,
	focusArea: FocusAreaInfo
): string {
	const platformPrompt = getPlatformPrompt(model);
	const spaceAddition = getSpacePromptForFocusArea(focusArea);
	const focusAreaPrompt = getFocusAreaPrompt(focusArea);

	return `${platformPrompt}${spaceAddition}\n${focusAreaPrompt}`;
}

/**
 * Generate prompt addition for focused task context
 * This helps the AI understand what the user is working on and provide relevant assistance
 * For subtasks, includes planning conversation context if available
 */
export function getFocusedTaskPrompt(task: FocusedTaskInfo): string {
	const priorityNote = task.priority === 'high' ? ' (high priority)' : '';
	let dueDateNote = '';

	if (task.dueDate) {
		const type = task.dueDateType === 'hard' ? 'hard deadline' : 'target';
		dueDateNote = `\nDue: ${task.dueDate} (${type})`;
	}

	// For subtasks, add parent task context and planning conversation summary
	let subtaskContext = '';
	if (task.isSubtask && task.parentTaskTitle) {
		subtaskContext = `\n\nThis is a subtask of: "${task.parentTaskTitle}"`;
		if (task.planningConversationSummary) {
			subtaskContext += `

<planning_context>
## Context from Task Planning
The following is a summary of the planning conversation where this subtask was defined. Use this context to understand what the user wants to accomplish.

${task.planningConversationSummary}
</planning_context>`;
		}
	}

	return `
<focus_context>
## Current Task Focus
The user is focused on: "${task.title}"${priorityNote}${dueDateNote}${subtaskContext}

**Your role:**
- Help them make progress on "${task.title}" specifically
- Be concise and action-oriented
- Ask clarifying questions only if needed to move forward
- If they seem stuck, offer a concrete next step
- Keep responses focused on this task unless they change topics
${task.isSubtask ? '- Reference the planning context when relevant to show continuity' : ''}

**Do NOT:**
- Ask about other tasks or projects
- Provide lengthy explanations unless requested
- Overwhelm with multiple options
${task.isSubtask ? '- Repeat information already established in the planning conversation' : ''}
</focus_context>`;
}

/**
 * Get the full system prompt including focus area and task context
 * Context chain: Platform → Space → Focus Area → Task
 * Used when a user is focused on a specific task, optionally within a focus area
 */
export function getFullSystemPromptWithTask(
	model: string,
	space: SpaceType | null | undefined,
	focusedTask: FocusedTaskInfo | null | undefined,
	focusArea?: FocusAreaInfo | null
): string {
	let prompt: string;

	if (focusArea) {
		// Use focus area context (which includes space context)
		prompt = getFullSystemPromptWithFocusArea(model, focusArea);
	} else {
		// Just platform + space context
		prompt = getFullSystemPrompt(model, space);
	}

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
 * Task metadata for Plan Mode context
 */
export interface PlanModeTaskContext {
	title: string;
	priority: 'normal' | 'high';
	dueDate?: Date | null;
	dueDateType?: 'hard' | 'soft' | null;
	createdAt: Date;
}

/**
 * Format a date in a human-friendly way relative to today
 */
function formatRelativeDate(date: Date, today: Date): string {
	const diffMs = date.getTime() - today.getTime();
	const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		const overdueDays = Math.abs(diffDays);
		return `${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`;
	} else if (diffDays === 0) {
		return 'today';
	} else if (diffDays === 1) {
		return 'tomorrow';
	} else if (diffDays <= 7) {
		return `in ${diffDays} days`;
	} else if (diffDays <= 14) {
		return `in about ${Math.ceil(diffDays / 7)} week${diffDays > 7 ? 's' : ''}`;
	} else {
		return `in ${diffDays} days (${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
	}
}

/**
 * Generate smart opener guidance based on task metadata
 * This helps the AI craft contextually relevant first questions
 */
function getOpenerGuidance(taskContext: PlanModeTaskContext | undefined, today: Date): string {
	if (!taskContext) {
		return `**Opener Focus:** Fresh task - ask what prompted this and what "done" looks like.`;
	}

	const taskAge = Math.floor(
		(today.getTime() - taskContext.createdAt.getTime()) / (1000 * 60 * 60 * 24)
	);

	let daysUntilDue: number | null = null;
	if (taskContext.dueDate) {
		daysUntilDue = Math.ceil(
			(taskContext.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
		);
	}

	// Priority order: urgency > overdue > old task > high priority > default
	if (daysUntilDue !== null && daysUntilDue <= 0) {
		return `**Opener Focus:** This task is OVERDUE. Acknowledge empathetically, ask if urgency has shifted or if it's still pressing.`;
	}

	if (daysUntilDue !== null && daysUntilDue <= 1) {
		return `**Opener Focus:** Due ${daysUntilDue === 0 ? 'TODAY' : 'TOMORROW'}. Be crisp - ask what the ONE essential deliverable is.`;
	}

	if (daysUntilDue !== null && daysUntilDue <= 3) {
		return `**Opener Focus:** Due in ${daysUntilDue} days. Ask what "done" looks like and what's already in progress.`;
	}

	if (taskAge >= 7) {
		return `**Opener Focus:** Task created ${taskAge} days ago. Ask what's been the blocker - complexity, other priorities, or unclear scope?`;
	}

	if (taskContext.priority === 'high') {
		return `**Opener Focus:** Marked as high priority. Ask what's driving that - impact, visibility, or downstream dependencies?`;
	}

	return `**Opener Focus:** Ask what prompted this task and what success looks like.`;
}

/**
 * Get Plan Mode system prompt based on current phase
 * Now includes task metadata for time/priority awareness and exchange count
 *
 * Phases:
 * - eliciting: Ask clarifying questions to understand scope
 * - proposing: Generate 3-7 actionable subtasks
 * - confirming: Await user confirmation (minimal AI involvement)
 */
export function getPlanModePrompt(
	taskTitle: string,
	phase: PlanModePhase,
	taskContext?: PlanModeTaskContext,
	exchangeCount: number = 0
): string {
	const today = new Date();
	const todayStr = today.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	// Build task metadata section
	let taskMetadata = '';
	if (taskContext) {
		const parts: string[] = [];

		// Priority
		if (taskContext.priority === 'high') {
			parts.push('**Priority:** High (flagged as important)');
		}

		// Due date with relative context
		if (taskContext.dueDate) {
			const relativeDate = formatRelativeDate(taskContext.dueDate, today);
			const deadlineType =
				taskContext.dueDateType === 'hard' ? '(hard deadline - cannot slip)' : '(target date - flexible)';
			parts.push(`**Due:** ${relativeDate} ${deadlineType}`);
		}

		// Task age
		const taskAge = Math.floor((today.getTime() - taskContext.createdAt.getTime()) / (1000 * 60 * 60 * 24));
		if (taskAge > 0) {
			parts.push(`**Created:** ${taskAge} day${taskAge !== 1 ? 's' : ''} ago`);
		} else {
			parts.push('**Created:** Today');
		}

		if (parts.length > 0) {
			taskMetadata = `\n${parts.join('\n')}`;
		}
	}

	const baseContext = `
<plan_mode>
## Planning Mode

**Today:** ${todayStr}

**Task:** "${taskTitle}"${taskMetadata}

You are a planning partner helping the user break down this task into focused, manageable pieces. Your goal is to reduce their cognitive load - make planning feel effortless, not overwhelming.
</plan_mode>`;

	switch (phase) {
		case 'eliciting':
			// Generate smart opener guidance based on task metadata
			const openerGuidance = getOpenerGuidance(taskContext, today);

			// For exchanges 2+, use softer prompt that allows offering to propose
			if (exchangeCount >= 2) {
				return `${baseContext}

<understanding_rules>
## Building Understanding (Exchange ${exchangeCount})

You've had ${exchangeCount} exchange(s) with the user. You're making progress.

**Your response MUST be ONE of these two patterns:**

**Pattern A - Ask a follow-up question:**
"[One sentence acknowledging what they shared]. [One specific follow-up question]?"

**Pattern B - Offer to propose (only if you understand their angle):**
"[One sentence synthesis]. I think I have a good picture - ready for me to suggest a breakdown?"

**HARD CONSTRAINTS - THESE ARE NON-NEGOTIABLE:**
- MAXIMUM 300 CHARACTERS total
- Choose Pattern A OR Pattern B, not both
- NO numbered lists, bullet points, or tables
- NO frameworks, generic advice, or summaries
- NO lengthy explanations or caveats
- If using Pattern A: ONE follow-up question only
- If using Pattern B: End with the exact phrase "ready for me to suggest a breakdown?"

**Bad responses (will be rejected):**
- "Let me summarize what I'm hearing..." (too long, not a pattern)
- "Here are some things to consider..." (framework dump)
- "Based on the documents, I can see..." (document summary)

**Tone:** Efficient colleague who respects their time.
</understanding_rules>`;
			}

			// First 1-2 exchanges: strict elicitation prompt
			return `${baseContext}

<elicitation_rules>
## Your Role: Thoughtful Planning Partner

The user wants help planning this task. Your job is to UNDERSTAND before suggesting.

${openerGuidance}

**Your response MUST follow this exact structure:**
1. ONE sentence acknowledging what you know (reference task context, urgency, or documents if relevant)
2. ONE focused question about the user's specific angle or concern
3. A brief invitation: "What else should I know?" or similar

**HARD CONSTRAINTS - THESE ARE NON-NEGOTIABLE:**
- MAXIMUM 400 CHARACTERS total (this will be enforced)
- NO numbered lists, bullet points, or tables
- NO frameworks, proposals, or breakdowns
- NO document summaries or lengthy explanations
- ONE question only

**Good Example:**
"Q1 planning for StratTech - I can see this phase focuses on product-market fit. What's your main concern: scoping the right deliverables, or making sure the team can execute? What else should I know?"

**Bad Example (TOO LONG, proposes):**
"Let me help you with Q1 planning. Based on the 2030 strategy, here's what I'm thinking... [continues for 500+ words with tables]"

**Tone:** Capable colleague who respects their time. Warm but efficient.
</elicitation_rules>`;

		case 'proposing':
			// Adjust guidance based on deadline urgency
			let urgencyGuidance = '';
			if (taskContext?.dueDate) {
				const diffDays = Math.ceil(
					(taskContext.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
				);
				if (diffDays <= 1 && taskContext.dueDateType === 'hard') {
					urgencyGuidance = `\n**URGENT:** This is due ${diffDays <= 0 ? 'TODAY' : 'TOMORROW'} with a hard deadline. Focus on the absolute minimum viable deliverables. Suggest 2-3 critical subtasks only.`;
				} else if (diffDays <= 3) {
					urgencyGuidance = `\n**Time-sensitive:** Due in ${diffDays} days. Keep the breakdown focused and actionable. 3-4 subtasks max.`;
				} else if (diffDays > 30) {
					urgencyGuidance = `\n**Longer timeline:** You have ${diffDays} days. You can suggest a more thorough breakdown with 5-7 subtasks if the task warrants it.`;
				}
			}

			return `${baseContext}

<proposal_rules>
## Time to Propose Subtasks
${urgencyGuidance}
Based on your conversation, propose a clear breakdown. The user will see these as checkable subtasks in a panel.

**REQUIRED FORMAT - Use EXACTLY this structure:**

Based on what we've discussed, here's my suggested breakdown:

1. [Subtask title - action verb + clear outcome]
2. [Subtask title]
3. [Subtask title]

Would you like to adjust any of these?

**Subtask Guidelines:**
- Start each with an action verb (Draft, Research, Review, Create, Define, etc.)
- Keep titles under 60 characters
- Each should be completable in one focused session (30 min - 2 hours)
- Order by logical sequence or priority
- Typically 3-5 subtasks (up to 7 for complex tasks)

**For Complex/Multi-Part Tasks:**
If the task has clear phases or workstreams, you can organize as:

1. [Phase 1 focus]: [First action]
2. [Phase 1 focus]: [Second action]
3. [Phase 2 focus]: [First action]
...

**STRICT FORMAT RULES:**
- Use ONLY a simple numbered list (1. 2. 3.)
- NO tables
- NO checkboxes (- [ ])
- NO nested lists
- NO bold/italic in subtask titles
- NO explanations after each subtask (just the title)
- Maximum 7 subtasks

**Tone:** Confident but flexible. Present your best thinking, invite adjustments.
</proposal_rules>`;

		case 'confirming':
			return `${baseContext}

<confirmation_rules>
## Confirmation Phase

The user is reviewing and editing the proposed subtasks in the UI panel on the right.

**If they ask for changes:**
- Revise the list and present it again in the same numbered format
- Keep it collaborative: "Good catch - here's the updated breakdown:"

**If they confirm or say they're ready:**
- Keep it brief and encouraging
- Example: "Great, you're all set! The subtasks are ready for you to work through."

**Tone:** Supportive, minimal. The focus shifts to their execution.
</confirmation_rules>`;
	}
}

/**
 * Get the full system prompt for Plan Mode
 *
 * IMPORTANT: In Plan Mode, we restructure the prompt to ensure instructions come FIRST.
 * This prevents "lost in the middle" issues where lengthy document context causes
 * the AI to ignore the Plan Mode behavior rules.
 *
 * Structure: Platform + PLAN MODE INSTRUCTIONS + minimal context
 * (NOT: Platform + Full Focus Area Documents + Plan Mode at the end)
 */
export function getFullSystemPromptForPlanMode(
	model: string,
	space: SpaceType | null | undefined,
	taskTitle: string,
	phase: PlanModePhase,
	focusArea?: FocusAreaInfo | null,
	taskContext?: PlanModeTaskContext,
	exchangeCount: number = 0
): string {
	// Start with platform prompt only (not full focus area with documents)
	const platformPrompt = getPlatformPrompt(model);

	// Get Plan Mode instructions (these are critical and must come early)
	const planModePrompt = getPlanModePrompt(taskTitle, phase, taskContext, exchangeCount);

	// Add minimal context reference with document tool instructions
	let contextNote = '';
	if (focusArea) {
		contextNote = `\n<context_note>
Working within focus area: "${focusArea.name}"
${focusArea.context ? `Background: ${focusArea.context.slice(0, 300)}${focusArea.context.length > 300 ? '...' : ''}` : ''}`;

		// List available documents (content accessible via tool)
		if (focusArea.contextDocuments && focusArea.contextDocuments.length > 0) {
			contextNote += `\n\n**Available Reference Documents:**`;
			for (const doc of focusArea.contextDocuments) {
				const sizeKb = Math.round(doc.charCount / 1000);
				contextNote += `\n- ${doc.filename} (${sizeKb}k chars)`;
			}
			contextNote += `\n\nUse the **read_document** tool if you need specific information from these documents. During elicitation, focus on understanding the user first before consulting documents.`;
		}
		contextNote += `\n</context_note>`;
	}

	// Structure: Platform → Plan Mode Instructions → Minimal Context Note
	// Plan Mode rules come BEFORE any heavy context to prevent being ignored
	return `${platformPrompt}\n${planModePrompt}${contextNote}`;
}

/**
 * Generate the context prompt from task context
 * This formats linked documents and related tasks for injection
 */
export function getTaskContextPrompt(context: TaskContextInfo | null | undefined): string {
	if (!context) return '';

	const hasDocuments = context.documents && context.documents.length > 0;
	const hasRelatedTasks = context.relatedTasks && context.relatedTasks.length > 0;

	if (!hasDocuments && !hasRelatedTasks) {
		return '';
	}

	const contextContent = buildContextPrompt(context);

	return `
<task_context>
## Available Context

The user has provided the following context for this task. Use this information to inform your responses and make your assistance more relevant.

${contextContent}

**Instructions:**
- Reference specific documents when relevant to the discussion
- Consider related task context when suggesting approaches
- If context seems incomplete, you may ask the user for clarification
</task_context>`;
}

/**
 * Get the full system prompt for Plan Mode with task context
 *
 * IMPORTANT: In Plan Mode, we restructure the prompt to ensure instructions come FIRST.
 * This prevents "lost in the middle" issues where lengthy document context causes
 * the AI to ignore the Plan Mode behavior rules.
 *
 * Structure: Platform + PLAN MODE INSTRUCTIONS + minimal context summary
 * (NOT: Full documents + Plan Mode at the end)
 *
 * @param model - The model being used
 * @param space - The current space
 * @param taskTitle - Title of the task being planned
 * @param phase - Current plan mode phase
 * @param linkedContext - Optional linked documents and related tasks
 * @param focusArea - Optional focus area for specialized context
 * @param taskMetadata - Optional task metadata (priority, due date, etc.)
 */
export function getFullSystemPromptForPlanModeWithContext(
	model: string,
	space: SpaceType | null | undefined,
	taskTitle: string,
	phase: PlanModePhase,
	linkedContext?: TaskContextInfo | null,
	focusArea?: FocusAreaInfo | null,
	taskMetadata?: PlanModeTaskContext,
	exchangeCount: number = 0
): string {
	// Start with platform prompt only (not full focus area with documents)
	const platformPrompt = getPlatformPrompt(model);

	// Get Plan Mode instructions (these are critical and must come early)
	const planModePrompt = getPlanModePrompt(taskTitle, phase, taskMetadata, exchangeCount);

	// Build minimal context summary with document tool instructions
	let contextSummary = '';

	// Focus area summary with document listing
	if (focusArea) {
		contextSummary += `\n<context_note>
Working within focus area: "${focusArea.name}"
${focusArea.context ? `Background: ${focusArea.context.slice(0, 300)}${focusArea.context.length > 300 ? '...' : ''}` : ''}`;

		// List focus area documents (content accessible via tool)
		if (focusArea.contextDocuments && focusArea.contextDocuments.length > 0) {
			contextSummary += `\n\n**Focus Area Reference Documents:**`;
			for (const doc of focusArea.contextDocuments) {
				const sizeKb = Math.round(doc.charCount / 1000);
				contextSummary += `\n- ${doc.filename} (${sizeKb}k chars)`;
			}
		}
		contextSummary += `\n</context_note>`;
	}

	// Task-linked context summary (documents and related tasks - just list, no content)
	if (linkedContext) {
		const docCount = linkedContext.documents?.length || 0;
		const taskCount = linkedContext.relatedTasks?.length || 0;

		if (docCount > 0 || taskCount > 0) {
			contextSummary += `\n<task_materials>
**Task-Linked Materials:**`;
			if (docCount > 0) {
				contextSummary += `\nDocuments:`;
				for (const doc of linkedContext.documents!) {
					const sizeKb = Math.round(doc.charCount / 1000);
					contextSummary += `\n- ${doc.filename} (${sizeKb}k chars)`;
				}
			}
			if (taskCount > 0) {
				contextSummary += `\nRelated Tasks:`;
				for (const task of linkedContext.relatedTasks!) {
					contextSummary += `\n- ${task.title} (${task.status})`;
				}
			}
			contextSummary += `\n</task_materials>`;
		}
	}

	// Add tool instruction if any documents are available
	const hasDocuments =
		(focusArea?.contextDocuments?.length ?? 0) > 0 || (linkedContext?.documents?.length ?? 0) > 0;
	if (hasDocuments) {
		contextSummary += `\n\n**Document Access:** Use the **read_document** tool to read any listed document when you need specific information. During elicitation, focus on understanding the user first before consulting documents.`;
	}

	// Structure: Platform → Plan Mode Instructions → Minimal Context Summary
	// Plan Mode rules come BEFORE any context to prevent being ignored
	return `${platformPrompt}\n${planModePrompt}${contextSummary}`;
}

// Re-export types for convenience
export type { TaskContextInfo };
