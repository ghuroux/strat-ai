/**
 * Model Tiers Configuration
 *
 * Defines which models to use for each complexity tier per provider.
 * Update this as new models become available or pricing changes.
 */

import type { ProviderTiers } from '../types';

export const MODEL_TIERS: Record<string, ProviderTiers> = {
	anthropic: {
		simple: 'claude-haiku-4-5',
		medium: 'claude-sonnet-4',
		complex: 'claude-opus-4-5'
	},
	openai: {
		simple: 'gpt-4o-mini',
		medium: 'gpt-4o',
		complex: 'gpt-5'
	},
	google: {
		simple: 'gemini-2.0-flash-lite',
		medium: 'gemini-2.5-flash',
		complex: 'gemini-pro'
	}
};

/**
 * Map model IDs to their complexity tier
 * Used for cache coherence decisions
 */
export const MODEL_TO_TIER: Record<string, 'simple' | 'medium' | 'complex'> = {
	// Anthropic
	'claude-haiku-4-5': 'simple',
	'claude-3-5-haiku-latest': 'simple',
	'claude-sonnet-4': 'medium',
	'claude-3-7-sonnet-latest': 'medium',
	'claude-opus-4-5': 'complex',
	'claude-opus-4-5-20251101': 'complex',

	// OpenAI
	'gpt-4o-mini': 'simple',
	'gpt-4o': 'medium',
	'gpt-4.1': 'medium',
	'gpt-5': 'complex',
	o3: 'complex',
	'o3-mini': 'medium',
	'o4-mini': 'medium',

	// Google
	'gemini-2.0-flash-lite': 'simple',
	'gemini-2.5-flash': 'medium',
	'gemini-pro': 'complex'
};

/**
 * Get the tier for a model ID
 * Returns 'medium' for unknown models (safe default)
 */
export function getTierForModel(model: string): 'simple' | 'medium' | 'complex' {
	return MODEL_TO_TIER[model] || 'medium';
}

/**
 * Get the default provider
 * Anthropic is preferred due to best prompt caching (90% discount)
 */
export const DEFAULT_PROVIDER = 'anthropic';
