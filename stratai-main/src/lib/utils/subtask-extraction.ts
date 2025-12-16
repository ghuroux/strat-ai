/**
 * Subtask Extraction Utility
 *
 * Extracts proposed subtasks from AI responses in Plan Mode.
 * The AI is instructed to propose subtasks as a numbered list.
 */

import type { ProposedSubtask, SubtaskType } from '$lib/types/tasks';

/**
 * Pattern to match numbered list items (subtask proposals)
 * Matches: "1. Do something" or "1) Do something"
 */
const NUMBERED_LIST_PATTERN = /^(?:\s*)(\d+)[.)]\s+(.+)$/gm;

/**
 * Detect if content contains a subtask proposal
 * Used to trigger the "confirming" phase
 */
export function contentContainsProposal(content: string): boolean {
	// Look for patterns like "here's how I'd break this down" or numbered lists
	const proposalIndicators = [
		/here'?s?\s+how\s+(?:I'?d?|we\s+(?:can|could))\s+break\s+(?:this|it)\s+down/i,
		/proposed\s+(?:breakdown|subtasks)/i,
		/break(?:ing)?\s+(?:this|it)\s+down\s+(?:into|as)/i,
		/suggested\s+subtasks/i,
	];

	// Check for proposal indicators
	const hasIndicator = proposalIndicators.some((pattern) => pattern.test(content));

	// Check for at least 2 numbered items
	const matches = content.match(NUMBERED_LIST_PATTERN);
	const hasNumberedList = matches && matches.length >= 2;

	return hasIndicator && Boolean(hasNumberedList);
}

/**
 * Extract proposed subtasks from AI response content
 * Returns an array of ProposedSubtask objects
 */
export function extractProposedSubtasks(content: string): ProposedSubtask[] {
	const subtasks: ProposedSubtask[] = [];
	let match;

	// Reset lastIndex for global regex
	NUMBERED_LIST_PATTERN.lastIndex = 0;

	while ((match = NUMBERED_LIST_PATTERN.exec(content)) !== null) {
		const title = match[2].trim();

		// Skip if title is too short or too long
		if (title.length < 3 || title.length > 100) continue;

		// Skip common non-subtask patterns
		if (isNonSubtaskLine(title)) continue;

		subtasks.push({
			id: crypto.randomUUID(),
			title,
			type: inferSubtaskType(title),
			confirmed: true, // Default to confirmed, user can uncheck
		});
	}

	// Limit to 5 subtasks maximum
	return subtasks.slice(0, 5);
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
