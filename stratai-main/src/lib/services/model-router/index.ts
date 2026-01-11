/**
 * Model Router Service
 *
 * Intelligent model selection for AUTO mode.
 * Analyzes query complexity and context to route to optimal LLM.
 *
 * Usage:
 * ```typescript
 * import { routeQuery, isAutoMode, getDefaultContext } from '$lib/services/model-router';
 *
 * if (isAutoMode(selectedModel)) {
 *   const context = { ...getDefaultContext(), ...yourContext };
 *   const decision = routeQuery(userMessage, context);
 *   console.log(`[Router] ${decision.reasoning} → ${decision.selectedModel}`);
 *   model = decision.selectedModel;
 * }
 * ```
 *
 * See docs/AUTO_MODEL_ROUTING.md for full specification.
 */

// Main router exports
export { routeQuery, isAutoMode, getDefaultContext } from './router';

// Analyzers (for testing/debugging)
export { analyzeQuery } from './analyzers/query-analyzer';
export { analyzeContext } from './analyzers/context-analyzer';

// Configuration
export {
	MODEL_TIERS,
	MODEL_TO_TIER,
	getTierForModel,
	DEFAULT_PROVIDER,
	THRESHOLDS,
	THRESHOLD_PRESETS
} from './config';

// Types
export type {
	ComplexityAnalysis,
	Signal,
	RoutingContext,
	RoutingDecision,
	Override,
	ProviderTiers,
	ThresholdConfig
} from './types';
