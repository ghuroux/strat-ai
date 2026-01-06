/**
 * Task Suggestion Parser
 *
 * Parses AI responses for [TASK_SUGGEST] markers and extracts task suggestions.
 * The AI is instructed to include structured task suggestions when it detects
 * actionable items in the conversation.
 *
 * Format:
 * [TASK_SUGGEST]
 * title: Task title here
 * dueDate: Friday (or specific date)
 * priority: normal|high
 * reason: Why this was suggested
 * [/TASK_SUGGEST]
 */

export interface TaskSuggestion {
	title: string;
	dueDate?: string;
	priority: 'normal' | 'high';
	reason: string;
}

export interface ParseResult {
	cleanContent: string;
	suggestions: TaskSuggestion[];
}

const TASK_SUGGEST_PATTERN = /\[TASK_SUGGEST\]([\s\S]*?)\[\/TASK_SUGGEST\]/g;

/**
 * Parse a single task suggestion block
 */
function parseSuggestionBlock(block: string): TaskSuggestion | null {
	const lines = block.trim().split('\n');
	const suggestion: Partial<TaskSuggestion> = {
		priority: 'normal'
	};

	for (const line of lines) {
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) continue;

		const key = line.slice(0, colonIndex).trim().toLowerCase();
		const value = line.slice(colonIndex + 1).trim();

		switch (key) {
			case 'title':
				suggestion.title = value;
				break;
			case 'duedate':
			case 'due_date':
			case 'due':
				suggestion.dueDate = value;
				break;
			case 'priority':
				suggestion.priority = value.toLowerCase() === 'high' ? 'high' : 'normal';
				break;
			case 'reason':
				suggestion.reason = value;
				break;
		}
	}

	// Validate required fields
	if (!suggestion.title || !suggestion.reason) {
		return null;
	}

	return suggestion as TaskSuggestion;
}

/**
 * Parse AI response content for task suggestions
 *
 * Returns the cleaned content (with suggestion blocks removed)
 * and an array of parsed task suggestions.
 */
export function parseTaskSuggestions(content: string): ParseResult {
	const suggestions: TaskSuggestion[] = [];

	// Extract all suggestion blocks
	let match;
	while ((match = TASK_SUGGEST_PATTERN.exec(content)) !== null) {
		const suggestion = parseSuggestionBlock(match[1]);
		if (suggestion) {
			suggestions.push(suggestion);
		}
	}

	// Reset regex lastIndex for the replacement
	TASK_SUGGEST_PATTERN.lastIndex = 0;

	// Remove suggestion blocks from content
	const cleanContent = content
		.replace(TASK_SUGGEST_PATTERN, '')
		.replace(/\n{3,}/g, '\n\n') // Collapse excessive newlines
		.trim();

	return { cleanContent, suggestions };
}

/**
 * Parse a relative due date string into an actual Date
 *
 * Handles: "today", "tomorrow", "Friday", "next week", "Jan 15", etc.
 */
export function parseDueDate(dueDateStr: string): Date | null {
	if (!dueDateStr) return null;

	const lower = dueDateStr.toLowerCase().trim();
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	// Handle relative dates
	if (lower === 'today') {
		return today;
	}

	if (lower === 'tomorrow') {
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		return tomorrow;
	}

	if (lower === 'next week') {
		const nextWeek = new Date(today);
		nextWeek.setDate(nextWeek.getDate() + 7);
		return nextWeek;
	}

	// Handle day names (Monday, Tuesday, etc.)
	const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
	const dayIndex = dayNames.indexOf(lower);
	if (dayIndex !== -1) {
		const currentDay = today.getDay();
		let daysUntil = dayIndex - currentDay;
		if (daysUntil <= 0) daysUntil += 7; // Next occurrence
		const targetDate = new Date(today);
		targetDate.setDate(targetDate.getDate() + daysUntil);
		return targetDate;
	}

	// Handle "in X days"
	const inDaysMatch = lower.match(/in (\d+) days?/);
	if (inDaysMatch) {
		const days = parseInt(inDaysMatch[1], 10);
		const targetDate = new Date(today);
		targetDate.setDate(targetDate.getDate() + days);
		return targetDate;
	}

	// Try parsing as a date string
	const parsed = new Date(dueDateStr);
	if (!isNaN(parsed.getTime())) {
		return parsed;
	}

	return null;
}
