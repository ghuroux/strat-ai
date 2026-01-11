/**
 * Model Router
 *
 * Main routing function that selects the optimal LLM for a query
 * based on complexity analysis and context.
 *
 * Target: <5ms total execution time
 */

import { analyzeQuery } from './analyzers/query-analyzer';
import { analyzeContext } from './analyzers/context-analyzer';
import { MODEL_TIERS, getTierForModel, DEFAULT_PROVIDER } from './config/model-tiers';
import { THRESHOLDS } from './config/thresholds';
import type { RoutingContext, RoutingDecision, Override, ComplexityAnalysis } from './types';

/**
 * Convert complexity score to tier
 */
function scoreToTier(score: number): 'simple' | 'medium' | 'complex' {
	if (score <= THRESHOLDS.simpleMax) return 'simple';
	if (score <= THRESHOLDS.mediumMax) return 'medium';
	return 'complex';
}

/**
 * Get numeric rank for tier comparison
 */
function tierRank(tier: 'simple' | 'medium' | 'complex'): number {
	return { simple: 1, medium: 2, complex: 3 }[tier];
}

/**
 * Generate human-readable reasoning for the routing decision
 */
function generateReasoning(analysis: ComplexityAnalysis, overrides: Override[]): string {
	let reasoning = analysis.reasoning;
	if (overrides.length > 0) {
		reasoning += ` | Overrides: ${overrides.map((o) => o.type).join(', ')}`;
	}
	return reasoning;
}

/**
 * Main routing function - selects optimal model for a query
 *
 * @param query The user's message text
 * @param context StratAI context (space, area, thinking, etc.)
 * @returns RoutingDecision with selected model and reasoning
 */
export function routeQuery(query: string, context: RoutingContext): RoutingDecision {
	const startTime = performance.now();
	const overrides: Override[] = [];

	// Validate provider
	const provider = context.provider || DEFAULT_PROVIDER;
	const modelTiers = MODEL_TIERS[provider];

	if (!modelTiers) {
		// Unknown provider - fallback to anthropic
		console.warn(`[Router] Unknown provider "${provider}", falling back to anthropic`);
		return routeQuery(query, { ...context, provider: 'anthropic' });
	}

	// Step 1: Analyze query complexity
	const queryAnalysis = analyzeQuery(query);

	// Step 2: Adjust for StratAI context
	const contextAnalysis = analyzeContext(context);

	// Step 3: Calculate final complexity score
	const finalScore = Math.max(0, Math.min(100, queryAnalysis.score + contextAnalysis.adjustment));

	const finalAnalysis: ComplexityAnalysis = {
		...queryAnalysis,
		score: finalScore,
		tier: scoreToTier(finalScore),
		signals: [...queryAnalysis.signals, ...contextAnalysis.signals],
		reasoning: queryAnalysis.reasoning + (contextAnalysis.adjustment !== 0 ? ' + context' : '')
	};

	// Step 4: Select model based on tier
	let selectedModel = modelTiers[finalAnalysis.tier];
	let selectedTier = finalAnalysis.tier;

	// ============================================
	// OVERRIDE CHECKS
	// ============================================

	// Override 1: Extended thinking requires minimum Sonnet
	// Never route thinking queries to Haiku
	if (context.thinkingEnabled && selectedTier === 'simple') {
		const originalModel = selectedModel;
		selectedModel = modelTiers.medium;
		selectedTier = 'medium';
		overrides.push({
			type: 'thinking',
			description: 'Extended thinking enabled - minimum Sonnet required',
			originalModel,
			overriddenTo: selectedModel
		});
	}

	// Override 2: Conservative threshold for simple tier
	// Only use Haiku if confidence is high enough
	if (selectedTier === 'simple' && finalAnalysis.confidence < THRESHOLDS.simpleConfidence) {
		const originalModel = selectedModel;
		selectedModel = modelTiers.medium;
		selectedTier = 'medium';
		overrides.push({
			type: 'minimum_tier',
			description: `Low confidence (${finalAnalysis.confidence.toFixed(2)}) - using Sonnet`,
			originalModel,
			overriddenTo: selectedModel
		});
	}

	// Override 3: Cache coherence - avoid downgrade in ongoing conversation
	// If we're already using a model, don't downgrade unless very confident
	if (context.currentModel && context.conversationTurn > 1) {
		const currentTier = getTierForModel(context.currentModel);

		// Check if we're trying to downgrade
		if (tierRank(selectedTier) < tierRank(currentTier)) {
			// Only downgrade if high confidence AND we're not in a complex trajectory
			const shouldDowngrade =
				finalAnalysis.confidence >= THRESHOLDS.cacheCoherenceConfidence &&
				!context.recentComplexityScores.some((s) => s > 60);

			if (!shouldDowngrade) {
				const originalModel = selectedModel;
				selectedModel = context.currentModel;
				selectedTier = currentTier;
				overrides.push({
					type: 'cache_coherence',
					description: 'Staying on current model for cache coherence',
					originalModel,
					overriddenTo: selectedModel
				});
			}
		}
	}

	// Calculate routing time
	const routingTimeMs = performance.now() - startTime;

	return {
		selectedModel,
		tier: selectedTier,
		complexity: finalAnalysis,
		overrides,
		reasoning: generateReasoning(finalAnalysis, overrides),
		routingTimeMs
	};
}

/**
 * Check if a model ID represents AUTO mode
 */
export function isAutoMode(model: string | null | undefined): boolean {
	return model === 'auto' || model === 'AUTO';
}

/**
 * Get default routing context with sensible defaults
 * Useful for creating context when some values are unknown
 */
export function getDefaultContext(): RoutingContext {
	return {
		provider: 'anthropic',
		thinkingEnabled: false,
		userTier: 'pro',
		spaceType: null,
		spaceSlug: null,
		areaId: null,
		areaHasDocs: false,
		isTaskPlanMode: false,
		planModePhase: null,
		conversationTurn: 1,
		currentModel: null,
		recentComplexityScores: []
	};
}
