/**
 * Page Intent Detection Utilities
 *
 * Detects when a user intends to create a page/document from their message.
 * Used in Phase 8: Guided Creation flow.
 *
 * Based on DOCUMENT_SYSTEM.md Phase 8 specification.
 */

import type { PageType } from '$lib/types/page';

/**
 * Result of page intent detection
 */
export interface PageIntent {
	detected: boolean;
	pageType: PageType;
	confidence: number;
	topic: string;
	triggerPhrase: string;
}

/**
 * Default result when no intent is detected
 */
const NO_INTENT: PageIntent = {
	detected: false,
	pageType: 'general',
	confidence: 0,
	topic: '',
	triggerPhrase: ''
};

/**
 * Intent patterns with associated page types
 */
interface IntentPattern {
	regex: RegExp;
	pageType: PageType | null; // null means detect from capture group
	confidence: number;
}

/**
 * Patterns for detecting document creation intent
 * Ordered by specificity (most specific first)
 */
const INTENT_PATTERNS: IntentPattern[] = [
	// Explicit document type requests
	{
		regex: /(?:meeting|notes|minutes)\s+(?:for|from|about)\s+(.+)/i,
		pageType: 'meeting_notes',
		confidence: 0.95
	},
	{
		regex: /(?:create|write|draft|prepare)\s+meeting\s+(?:notes|minutes)\s+(?:for|from|about)?\s*(.+)?/i,
		pageType: 'meeting_notes',
		confidence: 0.95
	},
	{
		regex: /(?:proposal|rfp|pitch)\s+(?:for|about|to)\s+(.+)/i,
		pageType: 'proposal',
		confidence: 0.9
	},
	{
		regex: /(?:write|create|draft|prepare)\s+(?:a\s+)?proposal\s+(?:for|about|to)?\s*(.+)?/i,
		pageType: 'proposal',
		confidence: 0.9
	},
	{
		regex: /(?:decision|decide)\s+(?:about|on|whether|if)\s+(.+)/i,
		pageType: 'decision_record',
		confidence: 0.85
	},
	{
		regex: /(?:document|record)\s+(?:this|the)\s+decision\s*(?:about|on|to)?\s*(.+)?/i,
		pageType: 'decision_record',
		confidence: 0.9
	},
	{
		regex: /(?:project|product)\s+brief\s+(?:for|about)\s+(.+)/i,
		pageType: 'project_brief',
		confidence: 0.9
	},
	{
		regex: /(?:write|create|draft)\s+(?:a\s+)?(?:project|product)\s+brief\s*(?:for|about)?\s*(.+)?/i,
		pageType: 'project_brief',
		confidence: 0.9
	},
	{
		regex: /(?:tech(?:nical)?|system)\s+spec(?:ification)?\s+(?:for|about)\s+(.+)/i,
		pageType: 'technical_spec',
		confidence: 0.9
	},
	{
		regex: /(?:write|create|draft)\s+(?:a\s+)?(?:tech(?:nical)?|system)\s+spec\s*(?:for|about)?\s*(.+)?/i,
		pageType: 'technical_spec',
		confidence: 0.9
	},
	{
		regex: /(?:weekly|status)\s+(?:update|report)\s*(?:for|about)?\s*(.+)?/i,
		pageType: 'weekly_update',
		confidence: 0.85
	},
	// Generic document creation with type inference
	{
		regex: /(?:write|create|draft|prepare)\s+(?:a|the)?\s*(proposal|brief|spec|notes|document|page)\s*(?:for|about|on)?\s*(.+)?/i,
		pageType: null, // Detect from capture group
		confidence: 0.8
	},
	// Help me create patterns
	{
		regex: /(?:help\s+(?:me\s+)?)?(?:create|write|draft)\s+(?:a|the)?\s*(proposal|brief|spec|notes|document|page)\s*(?:for|about|on)?\s*(.+)?/i,
		pageType: null,
		confidence: 0.8
	},
	// I need to write patterns
	{
		regex: /i\s+(?:need|want)\s+to\s+(?:write|create|draft)\s+(?:a|the)?\s*(proposal|brief|spec|notes|document|page)?\s*(?:for|about|on)?\s*(.+)?/i,
		pageType: null,
		confidence: 0.75
	}
];

/**
 * Map capture group terms to page types
 */
const TYPE_MAP: Record<string, PageType> = {
	proposal: 'proposal',
	brief: 'project_brief',
	spec: 'technical_spec',
	notes: 'meeting_notes',
	document: 'general',
	page: 'general',
	meeting: 'meeting_notes',
	decision: 'decision_record',
	update: 'weekly_update'
};

/**
 * Phrases that indicate the user is asking a question, not creating
 */
const QUESTION_INDICATORS = [
	/^what\s+(?:is|are|does|do|was|were)/i,
	/^how\s+(?:do|does|did|can|could|would|should)/i,
	/^why\s+(?:is|are|do|does|did|was|were)/i,
	/^when\s+(?:is|are|do|does|did|was|were)/i,
	/^where\s+(?:is|are|do|does|did|was|were)/i,
	/^who\s+(?:is|are|was|were)/i,
	/^can\s+you\s+(?:explain|tell\s+me|describe)/i,
	/^(?:explain|describe|define)\s+/i,
	/^is\s+(?:it|there|this|that)/i,
	/\?$/
];

/**
 * Detect document creation intent from user message
 *
 * Phase 8 acceptance criteria:
 * - P8-ID-01: Proposal intent detected ("Write a proposal" triggers)
 * - P8-ID-02: Meeting notes intent detected ("Meeting notes for..." triggers)
 * - P8-ID-03: Decision intent detected ("Document this decision" triggers)
 * - P8-ID-04: Topic extracted (relevant topic identified)
 * - P8-ID-05: Non-document queries ignored ("What is X?" doesn't trigger)
 */
export function detectPageIntent(userMessage: string): PageIntent {
	const trimmed = userMessage.trim();

	// P8-ID-05: Ignore obvious questions
	if (isQuestionMessage(trimmed)) {
		return NO_INTENT;
	}

	// Check each intent pattern
	for (const pattern of INTENT_PATTERNS) {
		const match = trimmed.match(pattern.regex);
		if (match) {
			// Determine page type
			let pageType: PageType = pattern.pageType || 'general';

			// If pageType is null, try to infer from capture groups
			if (pattern.pageType === null) {
				const typeHint = match[1]?.toLowerCase();
				if (typeHint && TYPE_MAP[typeHint]) {
					pageType = TYPE_MAP[typeHint];
				}
			}

			// Extract topic (usually the last capture group with content)
			const topic = extractTopic(match, trimmed);

			return {
				detected: true,
				pageType,
				confidence: pattern.confidence,
				topic,
				triggerPhrase: match[0]
			};
		}
	}

	return NO_INTENT;
}

/**
 * Check if the message is asking a question (not requesting document creation)
 */
function isQuestionMessage(message: string): boolean {
	return QUESTION_INDICATORS.some((pattern) => pattern.test(message));
}

/**
 * Extract the topic from regex match or full message
 */
function extractTopic(match: RegExpMatchArray, fullMessage: string): string {
	// Try capture groups from last to first (topic usually at end)
	for (let i = match.length - 1; i >= 1; i--) {
		if (match[i] && match[i].trim()) {
			return cleanTopic(match[i]);
		}
	}

	// Fall back to extracting from full message
	return extractTopicFromMessage(fullMessage);
}

/**
 * Clean up extracted topic text
 */
function cleanTopic(topic: string): string {
	return topic
		.trim()
		.replace(/^(?:the|a|an)\s+/i, '') // Remove leading articles
		.replace(/[.?!]+$/, '') // Remove trailing punctuation
		.trim();
}

/**
 * Extract topic from message when regex capture fails
 */
function extractTopicFromMessage(message: string): string {
	// Remove common prefixes
	let topic = message
		.replace(
			/^(?:i\s+(?:need|want)\s+to\s+)?(?:write|create|draft|prepare|help\s+me\s+(?:with)?)\s+(?:a\s+)?/i,
			''
		)
		.replace(/^(?:proposal|brief|spec|notes|document|page)\s+(?:for|about|on)\s+/i, '')
		.trim();

	// Limit length
	if (topic.length > 100) {
		topic = topic.substring(0, 97) + '...';
	}

	return cleanTopic(topic);
}

/**
 * Get the required information fields for a page type
 * Used in guided mode to know what questions to ask
 */
export function getRequiredFieldsForType(pageType: PageType): string[] {
	switch (pageType) {
		case 'meeting_notes':
			return [
				'Meeting attendees',
				'Meeting date/time',
				'Meeting agenda or topics discussed',
				'Key decisions made',
				'Action items and owners'
			];
		case 'decision_record':
			return [
				'Decision context/background',
				'Options considered',
				'Evaluation criteria',
				'Final decision',
				'Reasoning/rationale',
				'Next steps'
			];
		case 'proposal':
			return [
				'Problem/opportunity statement',
				'Proposed solution',
				'Benefits and value',
				'Required resources/budget',
				'Timeline',
				'Success metrics'
			];
		case 'project_brief':
			return [
				'Project name and overview',
				'Objectives and goals',
				'Scope and deliverables',
				'Stakeholders',
				'Timeline and milestones',
				'Success criteria'
			];
		case 'weekly_update':
			return [
				'Accomplishments this week',
				'Work in progress',
				'Blockers or challenges',
				'Plans for next week',
				'Help needed'
			];
		case 'technical_spec':
			return [
				'System/feature overview',
				'Requirements (functional and non-functional)',
				'Architecture/design',
				'Data model',
				'API endpoints (if applicable)',
				'Implementation notes'
			];
		case 'general':
		default:
			return ['Main topic or purpose', 'Key points to include', 'Target audience'];
	}
}

/**
 * Build the guided mode system prompt for a page type
 */
export function buildGuidedSystemPrompt(pageType: PageType, topic: string): string {
	const requiredFields = getRequiredFieldsForType(pageType);
	const typeLabel = getPageTypeLabel(pageType);

	return `The user wants to create a ${typeLabel} about "${topic}".

Your job is to help them create an excellent document by gathering the right information through a natural conversation.

For a ${typeLabel}, you need to gather:
${requiredFields.map((field, i) => `${i + 1}. ${field}`).join('\n')}

Instructions:
- Ask questions conversationally, one or two at a time
- Build on their responses to ask follow-up questions
- Be helpful and suggest options when they're uncertain
- When you have enough information to create a complete document, say exactly:
  "I have everything I need to create your ${typeLabel}. Ready to generate the document?"
- Wait for their confirmation before saying you're ready

Important: Do not generate the document yet. Your role is to gather information through dialogue.`;
}

/**
 * Get display label for page type
 */
function getPageTypeLabel(pageType: PageType): string {
	const labels: Record<PageType, string> = {
		general: 'document',
		meeting_notes: 'meeting notes',
		decision_record: 'decision record',
		proposal: 'proposal',
		project_brief: 'project brief',
		weekly_update: 'weekly update',
		technical_spec: 'technical specification'
	};
	return labels[pageType] || 'document';
}

/**
 * Check if an AI response indicates readiness to generate
 */
export function isReadyToGenerate(assistantMessage: string): boolean {
	const lower = assistantMessage.toLowerCase();

	// Phrases that indicate AI has gathered enough info
	const readyIndicators = [
		'i have everything i need',
		"i've got everything",
		'ready to generate',
		'ready to create',
		'shall i generate',
		'shall i create',
		'want me to generate',
		'want me to create',
		'i can now create',
		'i can now generate'
	];

	return readyIndicators.some((indicator) => lower.includes(indicator));
}

/**
 * Get the prompt for generating a document from a guided conversation
 */
export function buildGenerationPrompt(pageType: PageType, topic: string): string {
	const typeLabel = getPageTypeLabel(pageType);

	return `Based on our conversation, create a well-structured ${typeLabel} about "${topic}".

Format the document with:
- A clear title
- Appropriate sections and headings
- Bullet points where helpful
- Concise, professional language

Generate the complete document content now.`;
}
