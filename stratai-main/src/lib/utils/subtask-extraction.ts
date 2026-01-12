/**
 * Subtask Extraction Utility
 *
 * Extracts proposed subtasks from AI responses in Plan Mode.
 * The AI is instructed to propose subtasks as a numbered list.
 */

import type { ProposedSubtask, SubtaskType } from '$lib/types/tasks';
import { generateUUID } from '$lib/utils/uuid';

/**
 * Pattern to match numbered list items (subtask proposals)
 * Matches: "1. Do something" or "1) Do something" or "1.1. Do something"
 */
const NUMBERED_LIST_PATTERN = /^(?:\s*)(\d+(?:\.\d+)?)[.)]\s+(.+)$/gm;

/**
 * Pattern to match markdown table rows with numbered subtasks
 * Matches: "| 1 | Task name |" or "| 1.1 | Task name |" or "| 2A | Task name |"
 */
const TABLE_ROW_PATTERN = /^\|\s*(\d+(?:\.\d+)?|[A-Za-z0-9]+)\s*\|\s*([^|]+)/gm;

/**
 * Pattern to match markdown checkbox items
 * Matches: "- [ ] Task name" or "- [x] Task name" or "* [ ] Task name"
 */
const CHECKBOX_PATTERN = /^[-*]\s*\[[ xX]?\]\s+(.+)$/gm;

/**
 * Detect if content contains a subtask proposal
 * Uses keyword + structure approach for robustness (not specific phrases)
 */
export function contentContainsProposal(content: string): boolean {
	// Check for task-related keywords anywhere in content (flexible)
	// Matches: subtask(s), sub-task(s), task list, tasks for, steps to, action items, breakdown, etc.
	const taskKeywords = /\b(subtasks?|sub-tasks?|tasks?\s*(?:list|for|to|are|is)|steps?\s+(?:to|for|are)|action\s*items?|breakdown|todo|to-do|checklist)\b/i;
	const hasTaskKeyword = taskKeywords.test(content);

	// Check for at least 3 numbered items (stronger signal)
	const listMatches = content.match(NUMBERED_LIST_PATTERN);
	const hasNumberedList = !!(listMatches && listMatches.length >= 3);

	// Check for at least 2 table rows with numbers
	const tableMatches = content.match(TABLE_ROW_PATTERN);
	const hasTable = !!(tableMatches && tableMatches.length >= 2);

	// Check for at least 3 checkbox items
	const checkboxMatches = content.match(CHECKBOX_PATTERN);
	const hasCheckboxes = !!(checkboxMatches && checkboxMatches.length >= 3);

	// Check if this looks like a list of questions (shouldn't extract)
	const questionIndicators = /\b(question|clarif|what\s+(?:is|are|do|does|should|would)|how\s+(?:do|does|should|would|can)|let\s+me\s+(?:know|ask))\b/i;
	const looksLikeQuestions = questionIndicators.test(content);

	// Check if more than half the list items end with "?"
	const questionItems = listMatches?.filter(m => m.trim().endsWith('?')).length ?? 0;
	const mostItemsAreQuestions = !!(listMatches && questionItems > listMatches.length / 2);

	// Has list structure + task keywords + not questions
	const hasListStructure = hasNumberedList || hasTable || hasCheckboxes;

	return hasTaskKeyword && hasListStructure && !looksLikeQuestions && !mostItemsAreQuestions;
}

/**
 * Extract proposed subtasks from AI response content
 * Returns an array of ProposedSubtask objects
 * Supports numbered lists, markdown tables, and checkbox lists
 */
export function extractProposedSubtasks(content: string): ProposedSubtask[] {
	const subtasks: ProposedSubtask[] = [];
	const seenTitles = new Set<string>();

	// Try extracting from numbered list format first
	extractFromPattern(content, NUMBERED_LIST_PATTERN, subtasks, seenTitles, 2);

	// Also try extracting from table format
	extractFromPattern(content, TABLE_ROW_PATTERN, subtasks, seenTitles, 2);

	// Also try extracting from checkbox format (title is in group 1)
	extractFromPattern(content, CHECKBOX_PATTERN, subtasks, seenTitles, 1);

	// Limit to 20 subtasks maximum (reasonable for planning)
	return subtasks.slice(0, 20);
}

/**
 * Extract subtasks from content using a given regex pattern
 * @param titleGroupIndex - which capture group contains the title (1 or 2)
 */
function extractFromPattern(
	content: string,
	pattern: RegExp,
	subtasks: ProposedSubtask[],
	seenTitles: Set<string>,
	titleGroupIndex: number = 2
): void {
	let match;
	let matchIndex = 0;

	// Reset lastIndex for global regex
	pattern.lastIndex = 0;

	while ((match = pattern.exec(content)) !== null) {
		matchIndex++;
		const rawTitle = match[titleGroupIndex]?.trim();

		if (!rawTitle) continue;

		// Skip if raw title is too short
		if (rawTitle.length < 3) continue;

		// Skip common non-subtask patterns
		if (isNonSubtaskLine(rawTitle)) continue;

		// Skip table header rows
		if (isTableHeader(rawTitle)) continue;

		// Clean the title: strip markdown and extract main title (before em-dash description)
		const cleanedTitle = cleanSubtaskTitle(rawTitle);

		// Skip if cleaned title is too short
		if (cleanedTitle.length < 3) continue;

		// Skip duplicates (same title from different formats)
		const titleKey = cleanedTitle.toLowerCase();
		if (seenTitles.has(titleKey)) continue;
		seenTitles.add(titleKey);

		subtasks.push({
			id: generateUUID(),
			title: cleanedTitle,
			type: inferSubtaskType(cleanedTitle),
			confirmed: true, // Default to confirmed, user can uncheck
		});
	}
}

/**
 * Check if text looks like a table header (e.g., "Subtask", "Task", "#")
 */
function isTableHeader(text: string): boolean {
	const trimmed = text.trim().toLowerCase();
	const headerPatterns = [
		/^#$/,
		/^subtask$/i,
		/^task$/i,
		/^description$/i,
		/^output$/i,
		/^deadline$/i,
		/^status$/i,
		/^priority$/i,
		/^purpose$/i,
		/^owner$/i,
		/^details$/i,
		/^participants$/i,
		/^timing$/i,
		/^activity$/i,
		/^section$/i,
		/^content$/i,
		/^reuse\s+value$/i,
		/^asset$/i,
		/^-+$/, // Separator row like "---"
		/^owner\/stakeholder$/i,
	];
	// Also check for common header words
	if (
		trimmed === 'stakeholder' ||
		trimmed === 'stakeholders' ||
		trimmed === 'owner' ||
		trimmed === 'owners'
	) {
		return true;
	}
	return headerPatterns.some((p) => p.test(trimmed));
}

/**
 * Clean a subtask title by stripping markdown and extracting the main title
 * Handles patterns like: "**Define the template** — description here..."
 * Returns just: "Define the template"
 */
function cleanSubtaskTitle(rawTitle: string): string {
	let title = rawTitle;

	// Strip markdown bold markers (**text**)
	title = title.replace(/\*\*/g, '');

	// Strip markdown italic markers (*text* or _text_)
	title = title.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '$1');
	title = title.replace(/(?<!_)_(?!_)([^_]+)_(?!_)/g, '$1');

	// Extract main title before em-dash (—) or regular dash with spaces ( - )
	// This separates "Task title — description" into just "Task title"
	const dashMatch = title.match(/^([^—–]+?)(?:\s*[—–]\s*.+)?$/);
	if (dashMatch && dashMatch[1]) {
		title = dashMatch[1].trim();
	}

	// Also handle " - " pattern for descriptions
	const hyphenMatch = title.match(/^([^-]+?)(?:\s+-\s+.+)?$/);
	if (hyphenMatch && hyphenMatch[1] && hyphenMatch[1].length > 5) {
		title = hyphenMatch[1].trim();
	}

	// Remove trailing periods or colons
	title = title.replace(/[.:]+$/, '');

	// Capitalize first letter if lowercase
	if (title.length > 0 && /^[a-z]/.test(title)) {
		title = title.charAt(0).toUpperCase() + title.slice(1);
	}

	return title.trim();
}

/**
 * Check if a line is likely not a subtask (e.g., introduction, conclusion)
 */
function isNonSubtaskLine(text: string): boolean {
	const nonSubtaskPatterns = [
		/^(first|next|then|finally|lastly)[,:]?\s/i,
		/would\s+you\s+like/i,
		/let\s+me\s+know/i,
		/^(here|this)\s+(is|are)/i,
		/^(step|option)\s+\d+/i, // Avoid meta-descriptions like "Step 1"
	];

	return nonSubtaskPatterns.some((pattern) => pattern.test(text));
}

/**
 * Infer the subtask type based on the title
 * Most subtasks are "conversation" (need AI help)
 * "action" types are for simple do-it-yourself tasks
 */
function inferSubtaskType(title: string): SubtaskType {
	// Action-oriented titles that suggest user does it themselves
	const actionPatterns = [
		/^send\s/i,
		/^email\s/i,
		/^call\s/i,
		/^schedule\s/i,
		/^book\s/i,
		/^submit\s/i,
		/^upload\s/i,
		/^download\s/i,
		/^install\s/i,
		/^setup\s/i, // one word setup
		/^buy\s/i,
		/^order\s/i,
		/^print\s/i,
	];

	if (actionPatterns.some((pattern) => pattern.test(title))) {
		return 'action';
	}

	// Default to conversation - most tasks benefit from AI help
	return 'conversation';
}

/**
 * Clean and normalize a subtask title
 * Removes common prefixes, trailing punctuation, etc.
 */
export function normalizeSubtaskTitle(title: string): string {
	let cleaned = title.trim();

	// Remove leading dashes or bullets
	cleaned = cleaned.replace(/^[-•*]\s*/, '');

	// Remove trailing periods
	cleaned = cleaned.replace(/\.+$/, '');

	// Capitalize first letter
	if (cleaned.length > 0) {
		cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
	}

	return cleaned;
}

/**
 * Check if content is asking for confirmation of proposed subtasks
 */
export function asksForConfirmation(content: string): boolean {
	const confirmationPatterns = [
		/would\s+you\s+like\s+(?:to\s+)?(?:adjust|change|modify)/i,
		/before\s+we\s+(?:create|proceed)/i,
		/does\s+this\s+(?:look|sound)\s+(?:good|right)/i,
		/(?:any|some)\s+(?:changes|adjustments)/i,
		/ready\s+to\s+(?:create|proceed)/i,
	];

	return confirmationPatterns.some((pattern) => pattern.test(content));
}
