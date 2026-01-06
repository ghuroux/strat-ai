/**
 * Model Display Utilities
 *
 * Shared functions for displaying model information consistently
 * across ModelSelector, ModelBadge, and other components.
 */

import { modelCapabilitiesStore } from '$lib/stores/modelCapabilities.svelte';

/**
 * Get display name from model capabilities or fallback to ID parsing
 */
export function getModelDisplayName(modelId: string): string {
	const caps = modelCapabilitiesStore.capabilities[modelId];
	if (caps?.displayName) {
		return caps.displayName;
	}
	// Fallback: parse from model ID
	const parts = modelId.split('/');
	return parts[parts.length - 1];
}

/**
 * Get provider from model capabilities or fallback to ID parsing
 */
export function getModelProvider(modelId: string): string {
	const caps = modelCapabilitiesStore.capabilities[modelId];
	if (caps?.provider) {
		return caps.provider;
	}
	// Fallback: parse from model ID
	const parts = modelId.split('/');
	if (parts.length > 1) {
		return parts[0];
	}
	if (modelId.includes('claude')) return 'anthropic';
	if (modelId.includes('gpt') || modelId.startsWith('o3') || modelId.startsWith('o4')) return 'openai';
	if (modelId.includes('gemini')) return 'google';
	return 'other';
}

/**
 * Get Tailwind color classes for a provider
 */
export function getProviderColor(provider: string): string {
	switch (provider.toLowerCase()) {
		case 'anthropic':
			return 'bg-orange-500/20 text-orange-400';
		case 'openai':
			return 'bg-green-500/20 text-green-400';
		case 'google':
			return 'bg-blue-500/20 text-blue-400';
		case 'meta':
			return 'bg-indigo-500/20 text-indigo-400';
		case 'deepseek':
			return 'bg-cyan-500/20 text-cyan-400';
		case 'mistral':
			return 'bg-purple-500/20 text-purple-400';
		case 'amazon':
			return 'bg-yellow-500/20 text-yellow-400';
		default:
			return 'bg-surface-600/50 text-surface-400';
	}
}

/**
 * Check if model supports extended thinking
 */
export function modelSupportsThinking(modelId: string): boolean {
	return modelCapabilitiesStore.supportsThinking(modelId);
}

/**
 * Check if model supports vision/image analysis
 */
export function modelSupportsVision(modelId: string): boolean {
	return modelCapabilitiesStore.supportsVision(modelId);
}
