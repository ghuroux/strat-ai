/**
 * Model Router Types
 *
 * Core interfaces for the AUTO model routing system.
 * See docs/AUTO_MODEL_ROUTING.md for full specification.
 */

/**
 * Complexity classification result from query analysis
 */
export interface ComplexityAnalysis {
	score: number; // 0-100
	tier: 'simple' | 'medium' | 'complex';
	confidence: number; // 0-1
	signals: Signal[]; // Which signals fired
	reasoning: string; // Human-readable explanation
}

/**
 * Individual signal that contributed to complexity score
 */
export interface Signal {
	name: string;
	weight: number; // Contribution to score (negative = simpler, positive = complex)
	matched: boolean;
	matchedValue?: string; // What matched (for debugging)
}

/**
 * Context from StratAI (spaces, areas, etc.)
 */
export interface RoutingContext {
	// Provider & preferences
	provider: 'anthropic' | 'openai' | 'google';
	thinkingEnabled: boolean;
	userTier: 'free' | 'pro' | 'team' | 'enterprise';

	// StratAI context
	spaceType: 'work' | 'research' | 'random' | 'personal' | null;
	spaceSlug: string | null;
	areaId: string | null;
	areaHasDocs: boolean;
	isTaskPlanMode: boolean;
	planModePhase: 'eliciting' | 'proposing' | 'confirming' | null;

	// Conversation context
	conversationTurn: number;
	currentModel: string | null;
	recentComplexityScores: number[]; // Last 3 turns
}

/**
 * Routing decision result
 */
export interface RoutingDecision {
	selectedModel: string; // e.g., 'claude-sonnet-4'
	tier: 'simple' | 'medium' | 'complex';
	complexity: ComplexityAnalysis;
	overrides: Override[]; // Any overrides applied
	reasoning: string; // Why this model was selected
	routingTimeMs: number; // Performance tracking
}

/**
 * Override that affected the decision
 */
export interface Override {
	type: 'thinking' | 'cache_coherence' | 'user_preference' | 'minimum_tier';
	description: string;
	originalModel: string;
	overriddenTo: string;
}

/**
 * Model tier configuration for a provider
 */
export interface ProviderTiers {
	simple: string;
	medium: string;
	complex: string;
}

/**
 * Threshold configuration (tunable)
 */
export interface ThresholdConfig {
	// Minimum confidence to route to simple tier
	simpleConfidence: number;
	// Score thresholds
	simpleMax: number;
	mediumMax: number;
	// Cache coherence threshold
	cacheCoherenceConfidence: number;
}
