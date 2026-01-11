/**
 * Query Analyzer
 *
 * Analyzes query text to determine complexity.
 * Target: <2ms execution time
 *
 * Scoring: Start at 50 (medium baseline)
 * - Simple signals decrease score (negative weights)
 * - Complex signals increase score (positive weights)
 * - Final score clamped to 0-100
 */

import type { Signal, ComplexityAnalysis } from '../types';
import { THRESHOLDS } from '../config';

interface SignalPattern {
	pattern: RegExp;
	name: string;
	weight: number;
}

// ============================================
// SIMPLE SIGNALS (decrease score)
// ============================================

const SIMPLE_PATTERNS: SignalPattern[] = [
	// Question patterns
	{ pattern: /^what (is|are) /i, name: 'what_is', weight: -15 },
	{ pattern: /^who (is|are|was) /i, name: 'who_is', weight: -15 },
	{ pattern: /^when (did|was|is) /i, name: 'when', weight: -15 },
	{ pattern: /^where (is|are|do) /i, name: 'where', weight: -15 },
	{ pattern: /^how (do|can) I /i, name: 'how_do_i', weight: -10 },
	{ pattern: /^(list|name|give me) /i, name: 'list_request', weight: -10 },
	{ pattern: /^define /i, name: 'definition', weight: -15 },
	{ pattern: /\?$/, name: 'ends_with_question', weight: -5 },

	// Conversational
	{ pattern: /^(yes|no|sure|okay|ok|yep|nope|agreed)\b/i, name: 'confirmation', weight: -20 },
	{ pattern: /^(can you|could you|please) /i, name: 'polite_request', weight: -5 },

	// Translation/conversion
	{ pattern: /^translate /i, name: 'translate', weight: -10 },
	{ pattern: /^convert /i, name: 'convert', weight: -10 },
	{ pattern: /^summarize /i, name: 'summarize', weight: -5 } // summaries can be complex
];

const GREETING_PATTERN = /^(hi|hello|hey|thanks|thank you|ok|okay|good morning|good afternoon|good evening|morning|afternoon|evening)\b/i;

// ============================================
// COMPLEX SIGNALS (increase score)
// ============================================

const COMPLEX_PATTERNS: SignalPattern[] = [
	// Analysis & reasoning
	{ pattern: /\b(analyze|analyse)\b/i, name: 'analyze', weight: 20 },
	{ pattern: /\b(compare|contrast)\b/i, name: 'compare', weight: 15 },
	{ pattern: /\b(evaluate|assess)\b/i, name: 'evaluate', weight: 15 },
	{ pattern: /\b(design|architect)\b/i, name: 'design', weight: 20 },
	{ pattern: /\b(strategy|strategic)\b/i, name: 'strategy', weight: 20 },
	{ pattern: /\b(research|report)\b/i, name: 'research', weight: 20 },
	{ pattern: /\b(in-depth|comprehensive|thorough)\b/i, name: 'depth_request', weight: 15 },
	{ pattern: /\b(trade-?offs?|pros and cons|implications)\b/i, name: 'tradeoffs', weight: 15 },

	// Technical depth
	{ pattern: /\b(refactor|optimize|improve)\b/i, name: 'refactor', weight: 15 },
	{ pattern: /\b(debug|troubleshoot|diagnose)\b/i, name: 'debug', weight: 10 },
	{ pattern: /\b(explain why|explain how|how does .* work)\b/i, name: 'deep_explanation', weight: 10 },
	{ pattern: /\b(implement|build|create) .{20,}/i, name: 'implementation_request', weight: 10 },

	// Planning & structure
	{ pattern: /\b(plan|roadmap|timeline)\b/i, name: 'planning', weight: 15 },
	{ pattern: /\b(review|audit|assess)\b/i, name: 'review', weight: 10 },

	// Multi-step indicators
	{ pattern: /\d+\.\s/g, name: 'numbered_steps', weight: 10 },
	{ pattern: /\b(first|second|third|finally|then|next)\b/i, name: 'sequential_language', weight: 5 }
];

// ============================================
// CODE SIGNALS (increase score moderately)
// ============================================

const CODE_PATTERNS: SignalPattern[] = [
	{
		pattern: /\b(function|class|import|export|const|let|var|async|await)\b/,
		name: 'code_keywords',
		weight: 5
	},
	{ pattern: /\.(ts|js|py|go|rs|java|cpp|c|rb|php|svelte|vue|jsx|tsx)\b/, name: 'file_extension', weight: 5 },
	{ pattern: /\b(API|REST|GraphQL|endpoint|route)\b/i, name: 'api_mention', weight: 5 },
	{ pattern: /\b(error|exception|bug|issue|crash)\b/i, name: 'error_mention', weight: 5 },
	{ pattern: /```/, name: 'code_block', weight: 10 }
];

/**
 * Analyze query text to determine complexity
 * @param query The user's query text
 * @returns ComplexityAnalysis with score, tier, confidence, and signals
 */
export function analyzeQuery(query: string): ComplexityAnalysis {
	const signals: Signal[] = [];
	let score = 50; // Start at medium baseline

	// ============================================
	// TOKEN COUNT ANALYSIS
	// ============================================

	const tokenEstimate = query.split(/\s+/).length;

	// Short queries are usually simple
	if (tokenEstimate < 15) {
		score -= 20;
		signals.push({
			name: 'short_query',
			weight: -20,
			matched: true,
			matchedValue: `${tokenEstimate} tokens`
		});
	} else if (tokenEstimate < 30) {
		score -= 10;
		signals.push({
			name: 'medium_short_query',
			weight: -10,
			matched: true,
			matchedValue: `${tokenEstimate} tokens`
		});
	} else if (tokenEstimate > 200) {
		score += 25;
		signals.push({
			name: 'very_long_query',
			weight: 25,
			matched: true,
			matchedValue: `${tokenEstimate} tokens`
		});
	} else if (tokenEstimate > 100) {
		score += 15;
		signals.push({
			name: 'long_query',
			weight: 15,
			matched: true,
			matchedValue: `${tokenEstimate} tokens`
		});
	}

	// ============================================
	// GREETING CHECK
	// ============================================

	if (GREETING_PATTERN.test(query)) {
		score -= 25;
		signals.push({ name: 'greeting', weight: -25, matched: true });
	}

	// ============================================
	// SIMPLE PATTERNS
	// ============================================

	for (const { pattern, name, weight } of SIMPLE_PATTERNS) {
		if (pattern.test(query)) {
			score += weight; // weight is negative
			signals.push({ name, weight, matched: true });
		}
	}

	// ============================================
	// COMPLEX PATTERNS
	// ============================================

	for (const { pattern, name, weight } of COMPLEX_PATTERNS) {
		if (pattern.test(query)) {
			score += weight;
			signals.push({ name, weight, matched: true });
		}
	}

	// Multiple questions suggest complexity
	const questionCount = (query.match(/\?/g) || []).length;
	if (questionCount > 2) {
		score += 15;
		signals.push({
			name: 'multiple_questions',
			weight: 15,
			matched: true,
			matchedValue: `${questionCount} questions`
		});
	}

	// ============================================
	// CODE PATTERNS
	// ============================================

	for (const { pattern, name, weight } of CODE_PATTERNS) {
		if (pattern.test(query)) {
			score += weight;
			signals.push({ name, weight, matched: true });
		}
	}

	// ============================================
	// CALCULATE FINAL RESULT
	// ============================================

	// Clamp score to 0-100
	score = Math.max(0, Math.min(100, score));

	// Determine tier based on thresholds
	let tier: 'simple' | 'medium' | 'complex';
	if (score <= THRESHOLDS.simpleMax) {
		tier = 'simple';
	} else if (score <= THRESHOLDS.mediumMax) {
		tier = 'medium';
	} else {
		tier = 'complex';
	}

	// Calculate confidence based on signal strength
	// More signals that match = higher confidence in the assessment
	const matchedSignals = signals.filter((s) => s.matched);
	const totalWeight = matchedSignals.reduce((sum, s) => sum + Math.abs(s.weight), 0);
	const confidence = Math.min(1, totalWeight / 50); // Normalize: 50 total weight = 100% confidence

	// Generate human-readable reasoning
	const topSignals = matchedSignals
		.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
		.slice(0, 3);

	const reasoning =
		topSignals.length > 0
			? `${tier} (${score}/100): ${topSignals.map((s) => s.name).join(', ')}`
			: `${tier} (${score}/100): baseline assessment`;

	return {
		score,
		tier,
		confidence,
		signals,
		reasoning
	};
}
