/**
 * Assists Registry
 *
 * Defines available assists and their configurations.
 * Each assist includes prompts, metadata, and space filtering.
 */

import type { Assist, AssistCategory } from '$lib/types/assists';
import type { SpaceType } from '$lib/types/chat';

/**
 * All available assists
 */
export const ASSISTS: Record<string, Assist> = {
	'task-breakdown': {
		id: 'task-breakdown',
		name: "What's on your plate?",
		description: 'Break down what you need to do into clear, actionable tasks',
		icon: 'tasks',
		spaces: [], // Available in all spaces
		category: 'productivity',
		pattern: 'dump',
		systemPromptAddition: `<assist_context>
## Task Capture Mode

You are helping the user capture what's on their plate. Your ONLY job right now is to:
1. LISTEN to their brain dump (tasks, projects, things on their mind)
2. EXTRACT clear, actionable items
3. PRESENT them as a numbered list
4. ASK for confirmation

**CRITICAL RULES:**
- DO NOT ask multiple follow-up questions
- DO NOT try to prioritize, schedule, or give advice yet
- DO NOT overwhelm with options
- JUST extract and confirm

**Response format (follow exactly):**
"I captured [N] items from what you shared:

1. [Task name - concise but clear]
2. [Task name]
3. [Task name]
...

Does this look right? Let me know if I missed anything or got something wrong."

**Guidelines:**
- Keep task names concise (2-6 words ideal)
- Start with action verbs when possible (Review, Draft, Schedule, Follow up)
- If something is vague, make a reasonable interpretation
- Combine related micro-items into single tasks
- Separate distinct projects into separate items

**Example:**
User: "I've got the loyalty platform thing going on, need to set up workos, that split payments spec is hanging over me, and I should probably work on the food for the hungry proposal"

You: "I captured 4 items from what you shared:

1. Loyalty platform implementation
2. WorkOS setup/integration
3. Split payments spec
4. Food for the Hungry proposal

Does this look right? Let me know if I missed anything or got something wrong."
</assist_context>`,
		outputLabel: 'Your Tasks',
		estimatedTime: '2-3 minutes',
		isNew: true
	}

	// Future assists (placeholders - not implemented in POC)
	// 'meeting-prep': { ... }
	// 'email-draft': { ... }
	// 'status-update': { ... }
};

/**
 * Get assists available for a specific space
 */
export function getAssistsForSpace(space: SpaceType): Assist[] {
	return Object.values(ASSISTS).filter(
		(assist) => assist.spaces.length === 0 || assist.spaces.includes(space)
	);
}

/**
 * Get assists grouped by category for a space
 */
export function getAssistsByCategory(space: SpaceType): Record<AssistCategory, Assist[]> {
	const assists = getAssistsForSpace(space);
	return assists.reduce(
		(acc, assist) => {
			if (!acc[assist.category]) acc[assist.category] = [];
			acc[assist.category].push(assist);
			return acc;
		},
		{} as Record<AssistCategory, Assist[]>
	);
}

/**
 * Get a single assist by ID
 */
export function getAssistById(id: string): Assist | undefined {
	return ASSISTS[id];
}

/**
 * POC: Only these assists are fully implemented
 * Others will show as disabled in the dropdown
 */
export const POC_ASSIST_IDS = ['task-breakdown'];

/**
 * Check if an assist is implemented in the POC
 */
export function isPocAssist(id: string): boolean {
	return POC_ASSIST_IDS.includes(id);
}

/**
 * Phase-specific prompt additions for task-breakdown assist
 * These are injected based on the current phase of the assist flow
 */
export const TASK_BREAKDOWN_PHASE_PROMPTS = {
	prioritizing: `<phase_context>
## Priority Check

The user has confirmed their task list. Now ask ONE simple question about priority:

"Great! Quick check - which one is most pressing, or do any have hard deadlines?"

Wait for their response. If they indicate a priority or deadline:
- Acknowledge it briefly
- Tell them they can click any task in the panel to dive in

Keep it simple - just one question, one acknowledgment. Don't ask follow-ups.
</phase_context>`,

	focused: (taskName: string, allTasks: string[]) => `<phase_context>
## Focused Mode

The user is now focused on: "${taskName}"

Their full task list: ${allTasks.map((t, i) => `${i + 1}. ${t}`).join(', ')}

**Your role:**
- Help them make progress on "${taskName}" specifically
- Ask ONE helpful question to move them forward
- Keep responses concise and actionable
- If they seem stuck, offer a concrete next step

**DO NOT:**
- Ask about their other tasks
- Overwhelm with multiple questions
- Give lengthy explanations

**Example first message:**
"Let's tackle ${taskName}. What's the current status - just starting, partway through, or almost done?"
</phase_context>`
};

/**
 * Icon paths for assist icons (SVG path data)
 * Using Heroicons-style paths
 */
export const ASSIST_ICONS: Record<string, string> = {
	tasks: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
	calendar:
		'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
	mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
	document:
		'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
	lightbulb:
		'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
	chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
};
