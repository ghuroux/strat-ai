/**
 * Page Detection Utilities
 *
 * Detects page-worthy content in chat conversations
 * and suggests appropriate page types and titles.
 *
 * Based on DOCUMENT_SYSTEM.md Phase 5 specification.
 */

import type { Message } from '$lib/types/chat';
import type { PageType } from '$lib/types/page';

/**
 * Result of page type detection
 */
export interface PageTypeDetection {
	pageType: PageType;
	confidence: number;
	reason: string;
}

/**
 * Keywords and phrases that indicate specific page types
 */
const DECISION_INDICATORS = [
	'i recommend',
	'i suggest',
	'decided',
	'decision',
	'we should',
	'the best option',
	'option a',
	'option b',
	'pros and cons',
	'trade-off',
	'tradeoff',
	'weighing',
	'considering the options',
	'after evaluating',
	'my recommendation'
];

const MEETING_INDICATORS = [
	'meeting',
	'attendees',
	'agenda',
	'minutes',
	'discussed',
	'action items',
	'follow up',
	'follow-up',
	'sync',
	'standup',
	'stand-up',
	'retrospective',
	'kickoff',
	'kick-off'
];

const PROPOSAL_INDICATORS = [
	'proposal',
	'propose',
	'proposing',
	'initiative',
	'budget',
	'funding',
	'investment',
	'roi',
	'return on investment',
	'business case',
	'project plan',
	'roadmap'
];

const PROJECT_BRIEF_INDICATORS = [
	'project brief',
	'project overview',
	'scope',
	'objectives',
	'deliverables',
	'milestones',
	'stakeholders',
	'requirements',
	'success criteria',
	'project goals'
];

const WEEKLY_UPDATE_INDICATORS = [
	'weekly update',
	'status update',
	'progress report',
	'this week',
	'last week',
	'next week',
	'blockers',
	'accomplishments',
	'highlights'
];

const TECHNICAL_SPEC_INDICATORS = [
	'technical specification',
	'tech spec',
	'architecture',
	'api design',
	'data model',
	'implementation',
	'system design',
	'database schema',
	'interface',
	'endpoint'
];

/**
 * Detect the most appropriate page type based on conversation content
 */
export function detectPageType(messages: Message[]): PageTypeDetection {
	// Combine all message content for analysis
	const content = messages.map((m) => m.content).join(' ').toLowerCase();
	const wordCount = content.split(/\s+/).length;

	// Score each page type
	const scores: Record<PageType, number> = {
		general: 0,
		meeting_notes: 0,
		decision_record: 0,
		proposal: 0,
		project_brief: 0,
		weekly_update: 0,
		technical_spec: 0
	};

	// Count indicator matches
	for (const indicator of DECISION_INDICATORS) {
		if (content.includes(indicator)) {
			scores.decision_record += 2;
		}
	}

	for (const indicator of MEETING_INDICATORS) {
		if (content.includes(indicator)) {
			scores.meeting_notes += 2;
		}
	}

	for (const indicator of PROPOSAL_INDICATORS) {
		if (content.includes(indicator)) {
			scores.proposal += 2;
		}
	}

	for (const indicator of PROJECT_BRIEF_INDICATORS) {
		if (content.includes(indicator)) {
			scores.project_brief += 2;
		}
	}

	for (const indicator of WEEKLY_UPDATE_INDICATORS) {
		if (content.includes(indicator)) {
			scores.weekly_update += 2;
		}
	}

	for (const indicator of TECHNICAL_SPEC_INDICATORS) {
		if (content.includes(indicator)) {
			scores.technical_spec += 2;
		}
	}

	// Find highest scoring type
	let bestType: PageType = 'general';
	let bestScore = 0;

	for (const [type, score] of Object.entries(scores)) {
		if (score > bestScore) {
			bestScore = score;
			bestType = type as PageType;
		}
	}

	// Calculate confidence (0-1 based on score and word count)
	const maxPossibleScore = 20; // Rough estimate
	let confidence = Math.min(bestScore / maxPossibleScore, 1);

	// Boost confidence if content is substantial
	if (wordCount > 500) {
		confidence = Math.min(confidence + 0.1, 1);
	}

	// Reduce confidence if very short
	if (wordCount < 100) {
		confidence = confidence * 0.5;
	}

	// Determine reason
	let reason = 'general_content';
	if (bestType !== 'general') {
		reason = `${bestType.replace('_', ' ')}_indicators_detected`;
	}

	return {
		pageType: bestType,
		confidence: Math.round(confidence * 100) / 100,
		reason
	};
}

/**
 * Suggest a title based on conversation content
 */
export function suggestTitle(messages: Message[]): string {
	// Look for the first user message as the likely topic
	const userMessages = messages.filter((m) => m.role === 'user');
	if (userMessages.length === 0) {
		return 'Untitled Page';
	}

	const firstUserMessage = userMessages[0].content;

	// Take first line or first 60 characters
	let title = firstUserMessage.split('\n')[0];
	if (title.length > 60) {
		title = title.substring(0, 57) + '...';
	}

	// Clean up common prefixes
	title = title.replace(/^(can you|please|help me|i need to|i want to|how do i|what is)/i, '').trim();

	// Capitalize first letter
	if (title.length > 0) {
		title = title.charAt(0).toUpperCase() + title.slice(1);
	}

	return title || 'Untitled Page';
}

/**
 * Get the last assistant message content
 */
export function getLastAssistantMessage(messages: Message[]): string {
	const assistantMessages = messages.filter((m) => m.role === 'assistant');
	if (assistantMessages.length === 0) {
		return '';
	}
	return assistantMessages[assistantMessages.length - 1].content;
}

/**
 * Convert messages to a simple text format for the "Full conversation" option
 */
export function messagesToText(messages: Message[]): string {
	return messages
		.map((m) => {
			const role = m.role === 'user' ? 'User' : 'Assistant';
			return `**${role}:**\n${m.content}`;
		})
		.join('\n\n---\n\n');
}

/**
 * Result of page suggestion detection for a single message
 */
export interface PageSuggestion {
	shouldSuggest: boolean;
	pageType: PageType;
	confidence: number;
	reason: string;
}

/**
 * Conclusion/summary indicators for proactive suggestions
 */
const CONCLUSION_INDICATORS = [
	'in summary',
	'to summarize',
	'in conclusion',
	'the key points are',
	'to recap',
	'overall',
	'to sum up',
	'in short'
];

/**
 * Action item indicators for proactive suggestions
 */
const ACTION_ITEM_INDICATORS = [
	'action items',
	'next steps',
	'to do',
	'you should',
	'tasks:',
	'follow up',
	'follow-up',
	'here are the steps',
	'recommended actions'
];

/**
 * Strong decision indicators for proactive suggestions
 */
const STRONG_DECISION_INDICATORS = [
	'i recommend',
	'the decision is',
	'we should go with',
	'based on this analysis',
	'the best option',
	'my recommendation',
	'therefore',
	'after careful consideration'
];

/**
 * Check if text contains decision indicators
 */
function hasDecisionIndicators(text: string): boolean {
	return STRONG_DECISION_INDICATORS.some((i) => text.includes(i));
}

/**
 * Check if text contains conclusion indicators
 */
function hasConclusionIndicators(text: string): boolean {
	return CONCLUSION_INDICATORS.some((i) => text.includes(i));
}

/**
 * Check if text contains action item indicators
 */
function hasActionItems(text: string): boolean {
	return ACTION_ITEM_INDICATORS.some((i) => text.includes(i));
}

/**
 * Determine if a single message should trigger a page creation suggestion
 * Used for proactive inline suggestions in chat
 *
 * Phase 6 acceptance criteria:
 * - P6-DL-01: Detects decision content
 * - P6-DL-02: Detects conclusion content
 * - P6-DL-03: Detects action items
 * - P6-DL-04: Ignores short responses (<100 words)
 * - P6-DL-05: Ignores user messages
 * - P6-DL-06: Returns correct page type
 * - P6-DL-07: Returns confidence score (0-1)
 */
export function shouldSuggestPage(message: Message): PageSuggestion {
	// P6-DL-05: Only suggest for assistant messages
	if (message.role !== 'assistant') {
		return { shouldSuggest: false, pageType: 'general', confidence: 0, reason: 'user_message' };
	}

	const content = message.content.toLowerCase();
	const wordCount = message.content.split(/\s+/).length;

	// P6-DL-04: Minimum length threshold (100 words)
	if (wordCount < 100) {
		return { shouldSuggest: false, pageType: 'general', confidence: 0, reason: 'too_short' };
	}

	// P6-DL-01: Decision indicators -> decision_record
	if (hasDecisionIndicators(content)) {
		// Higher confidence for longer, more detailed decisions
		const baseConfidence = 0.8;
		const lengthBonus = Math.min((wordCount - 100) / 500, 0.15);
		return {
			shouldSuggest: true,
			pageType: 'decision_record',
			confidence: Math.round((baseConfidence + lengthBonus) * 100) / 100,
			reason: 'decision_detected'
		};
	}

	// P6-DL-03: Action items -> general (don't assume meeting notes)
	// The page type should be determined by context, not just action items
	if (hasActionItems(content)) {
		const baseConfidence = 0.75;
		const lengthBonus = Math.min((wordCount - 100) / 500, 0.15);
		return {
			shouldSuggest: true,
			pageType: 'general',
			confidence: Math.round((baseConfidence + lengthBonus) * 100) / 100,
			reason: 'action_items_detected'
		};
	}

	// P6-DL-02: Conclusion/summary indicators -> general
	if (hasConclusionIndicators(content)) {
		const baseConfidence = 0.7;
		const lengthBonus = Math.min((wordCount - 100) / 500, 0.15);
		return {
			shouldSuggest: true,
			pageType: 'general',
			confidence: Math.round((baseConfidence + lengthBonus) * 100) / 100,
			reason: 'conclusion_detected'
		};
	}

	// No indicators detected
	return { shouldSuggest: false, pageType: 'general', confidence: 0, reason: 'no_indicators' };
}

/**
 * Extraction types for creating pages from conversations
 */
export type ExtractionType = 'summary' | 'last_response' | 'full_conversation' | 'custom';

/**
 * Content extraction options
 */
export const EXTRACTION_OPTIONS: { type: ExtractionType; label: string; description: string }[] = [
	{
		type: 'summary',
		label: 'Summary & key points',
		description: 'AI extracts and structures the main points'
	},
	{
		type: 'last_response',
		label: 'Last AI response only',
		description: 'Use the most recent assistant message'
	},
	{
		type: 'full_conversation',
		label: 'Full conversation',
		description: 'Include all messages in the document'
	},
	{
		type: 'custom',
		label: 'Let me specify...',
		description: 'Provide custom extraction instructions'
	}
];
