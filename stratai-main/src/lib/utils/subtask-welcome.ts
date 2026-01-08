/**
 * Subtask Welcome Message Generator
 *
 * Generates contextual welcome messages for subtask chat views.
 * Uses parent task context and planning conversation to create
 * helpful, actionable opening messages.
 *
 * Note: Quick start actions are now handled by $lib/utils/quick-starts.ts
 */

import type { Task } from '$lib/types/tasks';

export interface SubtaskWelcomeData {
	greeting: string;
	contextHint: string;
	suggestedStart: string;
	parentTaskTitle: string;
}

/**
 * Get encouraging opener based on subtask type
 */
function getSubtaskOpener(subtaskType: 'conversation' | 'action' | undefined): string {
	if (subtaskType === 'action') {
		return "Let's check this off the list.";
	}
	return "Let's work through this together.";
}

/**
 * Extract key focus from subtask title
 * Makes suggestions more specific
 */
function extractFocus(title: string): string {
	const lowerTitle = title.toLowerCase();

	// Common action verbs to preserve
	const actionVerbs = ['define', 'research', 'design', 'implement', 'build', 'create', 'test', 'review', 'analyze', 'write', 'set up', 'configure'];

	for (const verb of actionVerbs) {
		if (lowerTitle.startsWith(verb)) {
			return title; // Title already describes the action well
		}
	}

	// Otherwise, make it more conversational
	return `working on "${title}"`;
}

/**
 * Generate contextual welcome for a subtask
 */
export function generateSubtaskWelcome(
	subtask: Task,
	parentTask: Task,
	planningContext?: string
): SubtaskWelcomeData {
	const opener = getSubtaskOpener(subtask.subtaskType);
	const focus = extractFocus(subtask.title);

	// Build greeting
	let greeting: string;
	let contextHint: string;
	let suggestedStart: string;

	if (planningContext && planningContext.length > 50) {
		// We have planning context - use it
		greeting = `${opener} This is part of "${parentTask.title}".`;
		contextHint = 'Based on our planning conversation, this involves:';
		suggestedStart = `Ready to start ${focus}? What aspect should we tackle first?`;
	} else if (subtask.contextSummary) {
		// Use subtask's own context summary if available
		greeting = `${opener} This is part of "${parentTask.title}".`;
		contextHint = subtask.contextSummary;
		suggestedStart = `Where would you like to begin with ${focus}?`;
	} else {
		// No context - provide helpful generic guidance
		greeting = `${opener}`;
		contextHint = `This is one of the subtasks for "${parentTask.title}".`;

		if (subtask.subtaskType === 'action') {
			suggestedStart = 'Need any help completing this? I can assist with research, drafting, or just thinking it through.';
		} else {
			suggestedStart = `What would you like to explore about ${focus}?`;
		}
	}

	return {
		greeting,
		contextHint,
		suggestedStart,
		parentTaskTitle: parentTask.title
	};
}

/**
 * Format welcome message for display in chat
 */
export function formatSubtaskWelcomeForChat(welcome: SubtaskWelcomeData): string {
	return `${welcome.greeting}\n\n${welcome.contextHint}\n\n${welcome.suggestedStart}`;
}
