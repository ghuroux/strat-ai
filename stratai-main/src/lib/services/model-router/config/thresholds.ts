/**
 * Routing Thresholds Configuration
 *
 * These values control how aggressive the routing is.
 * Start conservative (high confidence required for Haiku),
 * then adjust based on quality metrics.
 *
 * Phase 1 (Launch): Conservative - simpleConfidence: 0.85
 * Phase 2 (Validated): Moderate - simpleConfidence: 0.70
 * Phase 3 (Aggressive): Optimized - simpleConfidence: 0.50
 */

import type { ThresholdConfig } from '../types';

/**
 * Current threshold configuration
 * Phase 1: Conservative
 */
export const THRESHOLDS: ThresholdConfig = {
	// Minimum confidence to route to simple tier (Haiku)
	// Higher = more conservative (more queries go to Sonnet)
	simpleConfidence: 0.85,

	// Score thresholds for tier classification
	simpleMax: 25, // 0-25 = simple
	mediumMax: 65, // 26-65 = medium, 66-100 = complex

	// Cache coherence threshold
	// Only downgrade if confidence above this AND savings significant
	cacheCoherenceConfidence: 0.8
};

/**
 * Future threshold presets for easy iteration
 */
export const THRESHOLD_PRESETS = {
	conservative: {
		simpleConfidence: 0.85,
		simpleMax: 25,
		mediumMax: 65,
		cacheCoherenceConfidence: 0.8
	},
	moderate: {
		simpleConfidence: 0.7,
		simpleMax: 30,
		mediumMax: 65,
		cacheCoherenceConfidence: 0.75
	},
	aggressive: {
		simpleConfidence: 0.5,
		simpleMax: 35,
		mediumMax: 60,
		cacheCoherenceConfidence: 0.7
	}
} as const;
