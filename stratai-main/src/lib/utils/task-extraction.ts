/**
 * Task Extraction Utility
 *
 * Extracts task items from AI responses.
 * Looks for numbered lists in various formats.
 */

export interface ExtractedTaskItem {
	id: string;
	text: string;
}

/**
 * Extract tasks from AI response content
 * Looks for numbered list patterns like:
 * - "1. Task name"
 * - "1) Task name"
 * - "1 - Task name"
 */
export function extractTasksFromContent(content: string): ExtractedTaskItem[] {
	const tasks: ExtractedTaskItem[] = [];

	// Split into lines and look for numbered items
	const lines = content.split('\n');

	for (const line of lines) {
		// Match various numbered list patterns
		// Patterns: "1. text", "1) text", "1 - text", "1: text"
		const match = line.match(/^\s*(\d+)[.)\-:\s]+\s*(.+)$/);

		if (match) {
			const taskText = match[2].trim();

			// Skip if it looks like a sub-point or explanation (starts with lowercase, too short, etc.)
			if (taskText.length < 3) continue;

			// Skip if it's just a question or header
			if (taskText.endsWith('?') || taskText.endsWith(':')) continue;

			// Clean up task text
			const cleanedText = cleanTaskText(taskText);

			if (cleanedText) {
				tasks.push({
					id: crypto.randomUUID(),
					text: cleanedText
				});
			}
		}
	}

	return tasks;
}

/**
 * Clean up extracted task text
 * Removes markdown formatting, trailing punctuation, etc.
 */
function cleanTaskText(text: string): string {
	let cleaned = text;

	// Remove bold markers
	cleaned = cleaned.replace(/\*\*/g, '');
	cleaned = cleaned.replace(/__/g, '');

	// Remove trailing dash or hyphen with explanation
	// e.g., "Task name - some description" -> "Task name"
	const dashMatch = cleaned.match(/^([^-–]+)\s*[-–]\s*.+$/);
	if (dashMatch) {
		cleaned = dashMatch[1].trim();
	}

	// Capitalize first letter if lowercase
	if (cleaned.length > 0 && cleaned[0] === cleaned[0].toLowerCase()) {
		cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
	}

	return cleaned.trim();
}

/**
 * Check if content contains what looks like a task list
 * Used to determine if we should try extraction
 */
export function contentLooksLikeTaskList(content: string): boolean {
	// Look for at least 2 numbered items
	const numberedItems = content.match(/^\s*\d+[.)\-:\s]/gm);
	return numberedItems !== null && numberedItems.length >= 2;
}

/**
 * Check if content contains confirmation language
 * Used to determine if AI is asking for confirmation
 */
export function contentAsksForConfirmation(content: string): boolean {
	const confirmationPhrases = [
		'does this look right',
		'look right',
		'look correct',
		'sound right',
		'did i miss',
		'anything missing',
		'let me know if',
		'confirm',
		'got something wrong'
	];

	const lowerContent = content.toLowerCase();
	return confirmationPhrases.some((phrase) => lowerContent.includes(phrase));
}
