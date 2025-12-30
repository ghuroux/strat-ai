/**
 * Plan Mode Validation Utilities
 *
 * Provides structural enforcement for Plan Mode elicitation responses
 * and user readiness detection.
 */

export interface ValidationResult {
	valid: boolean;
	reason?: 'too_long' | 'has_list' | 'has_table';
	charCount: number;
}

/**
 * Validate an elicitation response to ensure it follows constraints
 *
 * @param response - The AI response text
 * @param maxChars - Maximum character count (default 500)
 * @returns ValidationResult with validity and reason if invalid
 */
export function validateElicitationResponse(
	response: string,
	maxChars: number = 500
): ValidationResult {
	const charCount = response.length;

	// Check length
	if (charCount > maxChars) {
		return { valid: false, reason: 'too_long', charCount };
	}

	// Check for numbered lists (1. or 1) at start of line)
	if (/^\s*\d+[.)]\s/m.test(response)) {
		return { valid: false, reason: 'has_list', charCount };
	}

	// Check for bullet lists
	if (/^\s*[-*]\s/m.test(response)) {
		return { valid: false, reason: 'has_list', charCount };
	}

	// Check for markdown tables
	if (/\|.*\|.*\|/m.test(response)) {
		return { valid: false, reason: 'has_table', charCount };
	}

	return { valid: true, charCount };
}

/**
 * Additional prompt text for stricter retry
 * Used when the initial response violated constraints
 */
export const STRICTER_ELICITATION_ADDENDUM = `

**CRITICAL OVERRIDE - READ THIS:**
Your previous response was too long or contained lists. This time you MUST:
- Keep to 2-3 sentences MAXIMUM (under 400 characters)
- Ask ONE question only
- NO lists, NO tables, NO frameworks
- Be conversational and brief

This constraint is non-negotiable.
`;

/**
 * Detect if user message signals readiness for proposal
 *
 * @param message - The user's message
 * @returns true if user is signaling they're ready for a breakdown
 */
export function detectUserReadiness(message: string): boolean {
	const lower = message.toLowerCase().trim();

	// Short affirmative responses (when AI asks "ready for me to suggest a breakdown?")
	const shortAffirmatives = [
		'yes',
		'yep',
		'yeah',
		'yup',
		'sure',
		'ok',
		'okay',
		'do it',
		'please',
		'go',
		'yes please',
		'sure thing',
		'sounds good',
		'let\'s do it',
		'absolutely',
		'definitely'
	];

	// For very short messages, check if it's a simple affirmative
	if (lower.length < 20 && shortAffirmatives.some((aff) => lower === aff || lower.startsWith(aff + ' ') || lower.endsWith(' ' + aff))) {
		return true;
	}

	// Longer phrases that indicate readiness
	const readyPhrases = [
		'go ahead',
		"that's everything",
		"that's all",
		"that's it",
		'what do you think',
		'what do you suggest',
		'suggest a breakdown',
		'ready',
		'propose',
		'break it down',
		'i think you have enough',
		"let's see",
		'show me',
		'you have enough',
		'enough context',
		'create the breakdown',
		'suggest subtasks',
		'create subtasks',
		'make the subtasks'
	];

	return readyPhrases.some((phrase) => lower.includes(phrase));
}
