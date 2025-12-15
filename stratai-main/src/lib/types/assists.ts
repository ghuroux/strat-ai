/**
 * Assists Framework Types
 *
 * Assists are contextual AI helpers that guide users through specific tasks.
 * They appear in the "Help me with..." dropdown and activate focused work modes.
 */

import type { SpaceType } from './chat';

/**
 * UX patterns for assists (aligned with template patterns)
 * - guided: Multi-turn conversation with questions
 * - form: Structured input fields
 * - dump: Paste/type unstructured content, get organized output
 * - quick: Single action with minimal input
 */
export type AssistPattern = 'guided' | 'form' | 'dump' | 'quick';

/**
 * Categories for organizing assists in the dropdown
 */
export type AssistCategory = 'productivity' | 'communication' | 'analysis' | 'creative';

/**
 * Assist definition - what an assist can do
 */
export interface Assist {
	id: string;
	name: string; // User-facing name (e.g., "What's on your plate?")
	description: string; // Short description for dropdown
	icon: string; // Icon name for visual representation

	// Categorization
	spaces: SpaceType[]; // Which spaces show this assist (empty = all spaces)
	category: AssistCategory;

	// UX pattern
	pattern: AssistPattern;

	// AI configuration
	systemPromptAddition: string; // Added to base prompt during assist
	outputLabel: string; // Label for WorkingPanel header (e.g., "Your Tasks")

	// Optional metadata
	estimatedTime?: string; // "2-3 minutes"
	isNew?: boolean; // Show "New" badge
}

/**
 * Phases of the task-breakdown assist flow
 * - collecting: User is brain dumping, AI will extract tasks
 * - confirming: Tasks extracted, waiting for user confirmation
 * - prioritizing: Tasks confirmed, asking about priority
 * - focused: User has selected a task to work on
 */
export type AssistPhase = 'collecting' | 'confirming' | 'prioritizing' | 'focused';

/**
 * A task extracted from user input
 */
export interface ExtractedTask {
	id: string;
	text: string;
	status: 'pending' | 'confirmed' | 'in_progress' | 'done';
	priority?: number; // 1 = highest priority
}

/**
 * Assist execution state - ephemeral, not persisted
 * Follows the same pattern as SecondOpinionState
 */
export interface AssistState {
	isActive: boolean;
	assistId: string | null;
	assist: Assist | null;

	// Phase tracking for task-breakdown flow
	phase: AssistPhase;

	// Task state (for task-breakdown assist)
	tasks: ExtractedTask[];
	selectedTaskId: string | null;

	// Streaming state
	isStreaming: boolean;
	content: string;
	thinking: string;
	error: string | null;

	// Source context
	sourceConversationId: string | null;
}

/**
 * Initial/empty assist state
 */
export const EMPTY_ASSIST_STATE: AssistState = {
	isActive: false,
	assistId: null,
	assist: null,
	phase: 'collecting',
	tasks: [],
	selectedTaskId: null,
	isStreaming: false,
	content: '',
	thinking: '',
	error: null,
	sourceConversationId: null
};
