/**
 * Smart Pick - Intelligent model selection for Arena battles
 *
 * Provides algorithms for selecting diverse, capable models based on:
 * - Category suitability
 * - Provider diversity
 * - Model capabilities
 */

import { MODEL_CAPABILITIES, type ModelCapabilities } from '$lib/config/model-capabilities';
import type { TemplateCategory } from '$lib/config/battle-templates';

interface ModelScore {
	modelId: string;
	provider: string;
	score: number;
	capabilities: ModelCapabilities;
}

/**
 * Top-tier models for each category
 * These are the "best of the best" for specific use cases
 */
const CATEGORY_TOP_MODELS: Record<TemplateCategory, string[]> = {
	coding: [
		'claude-sonnet-4-5',
		'gpt-5-2-pro',
		'claude-opus-4-5',
		'deepseek-v3-1',
		'gpt-5-1-codex-max'
	],
	creative: [
		'claude-opus-4-5',
		'gpt-5-2-pro',
		'gemini-3-pro',
		'claude-sonnet-4-5'
	],
	analysis: [
		'claude-opus-4-5',
		'gpt-5-2-pro',
		'gemini-3-pro',
		'o3-mini'
	],
	reasoning: [
		'o3',
		'claude-opus-4-5',
		'deepseek-r1',
		'gpt-5-2-pro',
		'o3-mini'
	],
	general: [
		'claude-sonnet-4-5',
		'gpt-5-2-pro',
		'gemini-3-pro',
		'claude-opus-4-5'
	]
};

/**
 * Get a "smart pick" of 2 models optimized for a given category
 * Ensures provider diversity (picks from different providers)
 */
export function getSmartPick(category: TemplateCategory): string[] {
	const topModels = CATEGORY_TOP_MODELS[category] || CATEGORY_TOP_MODELS.general;
	const availableModels = Object.keys(MODEL_CAPABILITIES);

	// Filter to only models that exist in our capabilities
	const validTopModels = topModels.filter(id => availableModels.includes(id));

	if (validTopModels.length === 0) {
		// Fallback: pick any two models from different providers
		return getRandomDiversePick(2);
	}

	// Pick first model
	const firstModel = validTopModels[0];
	const firstProvider = MODEL_CAPABILITIES[firstModel]?.provider;

	// Pick second model from a different provider
	const secondModel = validTopModels.find(id => {
		const provider = MODEL_CAPABILITIES[id]?.provider;
		return provider && provider !== firstProvider;
	});

	// If no different provider found, just take the second from the list
	return secondModel
		? [firstModel, secondModel]
		: [firstModel, validTopModels[1] || validTopModels[0]];
}

/**
 * Get random models with provider diversity
 * Used for "Surprise Me" feature
 */
export function getSurpriseMe(count: number = 2): string[] {
	const availableModels = Object.entries(MODEL_CAPABILITIES);
	const providersUsed = new Set<string>();
	const selectedModels: string[] = [];

	// Group models by provider
	const modelsByProvider = new Map<string, string[]>();
	for (const [modelId, caps] of availableModels) {
		const existing = modelsByProvider.get(caps.provider) || [];
		existing.push(modelId);
		modelsByProvider.set(caps.provider, existing);
	}

	// Get all providers and shuffle them
	const providers = Array.from(modelsByProvider.keys());
	shuffleArray(providers);

	// Pick one model from each provider until we have enough
	for (const provider of providers) {
		if (selectedModels.length >= count) break;

		const models = modelsByProvider.get(provider) || [];
		if (models.length > 0) {
			// Pick a random model from this provider, preferring capable ones
			const goodModels = models.filter(id => {
				const caps = MODEL_CAPABILITIES[id];
				return caps && (caps.supportsThinking || caps.contextWindow >= 100000);
			});

			const pool = goodModels.length > 0 ? goodModels : models;
			const randomIndex = Math.floor(Math.random() * pool.length);
			selectedModels.push(pool[randomIndex]);
			providersUsed.add(provider);
		}
	}

	return selectedModels;
}

/**
 * Get random models with provider diversity
 */
function getRandomDiversePick(count: number): string[] {
	return getSurpriseMe(count);
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

/**
 * Get provider color class for UI
 */
export function getProviderColor(provider: string): string {
	const colors: Record<string, string> = {
		anthropic: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
		openai: 'bg-green-500/20 text-green-400 border-green-500/30',
		google: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
		meta: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
		deepseek: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
		mistral: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
		amazon: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
	};
	return colors[provider] || 'bg-surface-500/20 text-surface-400 border-surface-500/30';
}
