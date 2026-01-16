/**
 * Context Analyzer
 *
 * Analyzes StratAI context (spaces, areas, plan mode, etc.)
 * to adjust the complexity score from query analysis.
 *
 * Returns an adjustment value to add to the base query score.
 */

import type { RoutingContext, Signal } from '../types';

interface ContextAnalysisResult {
	adjustment: number;
	signals: Signal[];
}

/**
 * Analyze StratAI context to adjust complexity
 * @param context The routing context from StratAI
 * @returns Adjustment to add to query complexity score, and signals
 */
export function analyzeContext(context: RoutingContext): ContextAnalysisResult {
	const signals: Signal[] = [];
	let adjustment = 0;

	// ============================================
	// SPACE TYPE INFLUENCE
	// ============================================

	// Space type influence - all spaces now treated neutrally
	// (Future: could use space context or custom space settings to influence routing)
	if (context.spaceType) {
		signals.push({ name: 'space_context', weight: 0, matched: true });
	}

	// ============================================
	// PLAN MODE PHASES
	// ============================================

	if (context.isTaskPlanMode) {
		switch (context.planModePhase) {
			case 'eliciting':
				// Gathering info - medium is fine
				signals.push({ name: 'plan_eliciting', weight: 0, matched: true });
				break;
			case 'proposing':
				// Proposing solutions - needs good reasoning
				adjustment += 15;
				signals.push({ name: 'plan_proposing', weight: 15, matched: true });
				break;
			case 'confirming':
				// Confirming details - medium is fine
				signals.push({ name: 'plan_confirming', weight: 0, matched: true });
				break;
		}
	}

	// ============================================
	// DOCUMENT CONTEXT
	// ============================================

	if (context.areaHasDocs) {
		// Large document context suggests analysis work
		adjustment += 5;
		signals.push({ name: 'has_documents', weight: 5, matched: true });
	}

	// ============================================
	// CONVERSATION DEPTH
	// ============================================

	if (context.conversationTurn > 10) {
		// Deep conversations may be building on complexity
		adjustment += 5;
		signals.push({
			name: 'deep_conversation',
			weight: 5,
			matched: true,
			matchedValue: `turn ${context.conversationTurn}`
		});
	}

	// ============================================
	// RECENT COMPLEXITY TRAJECTORY
	// ============================================

	if (context.recentComplexityScores.length >= 2) {
		const avgRecent =
			context.recentComplexityScores.reduce((a, b) => a + b, 0) /
			context.recentComplexityScores.length;

		// If recent messages have been complex, this one might continue the pattern
		if (avgRecent > 60) {
			adjustment += 5;
			signals.push({
				name: 'complex_trajectory',
				weight: 5,
				matched: true,
				matchedValue: `avg ${avgRecent.toFixed(0)}`
			});
		}
	}

	// ============================================
	// USER TIER INFLUENCE
	// ============================================

	// Enterprise users might have stricter quality requirements
	if (context.userTier === 'enterprise') {
		adjustment += 5;
		signals.push({ name: 'enterprise_user', weight: 5, matched: true });
	}

	return { adjustment, signals };
}
