/**
 * Model Capabilities Store - Fetches and caches model capabilities from API
 * Uses Svelte 5 runes for reactivity
 */

import type { ModelCapabilities } from '$lib/config/model-capabilities';
import { settingsStore } from './settings.svelte';

// Default capabilities for unknown models (permissive fallback)
const DEFAULT_CAPABILITIES: ModelCapabilities = {
	displayName: 'Unknown Model',
	provider: 'openai',
	contextWindow: 128000,
	maxOutputTokens: 4096,
	supportsThinking: false,
	supportsVision: true,
	supportsTools: true
};

interface CapabilitiesResponse {
	capabilities: Record<string, ModelCapabilities>;
	byProvider: Record<string, string[]>;
}

class ModelCapabilitiesStore {
	capabilities = $state<Record<string, ModelCapabilities>>({});
	byProvider = $state<Record<string, string[]>>({ anthropic: [], openai: [], meta: [], amazon: [], deepseek: [], mistral: [], google: [] });
	loading = $state(false);
	error = $state<string | null>(null);
	private initialized = false;

	constructor() {
		// Fetch capabilities on client initialization
		if (typeof window !== 'undefined') {
			this.fetch();
		}
	}

	/**
	 * Fetch model capabilities from API
	 */
	async fetch(): Promise<void> {
		if (this.loading) return;

		this.loading = true;
		this.error = null;

		try {
			const response = await fetch('/api/models/capabilities');

			if (!response.ok) {
				throw new Error(`Failed to fetch capabilities: ${response.status}`);
			}

			const data: CapabilitiesResponse = await response.json();
			this.capabilities = data.capabilities;
			this.byProvider = data.byProvider;
			this.initialized = true;
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : 'Failed to load model capabilities';
			this.error = errorMessage;
			console.warn('Failed to fetch model capabilities:', e);
			// Keep any previously loaded capabilities
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Check if capabilities have been loaded
	 */
	get isLoaded(): boolean {
		return this.initialized && Object.keys(this.capabilities).length > 0;
	}

	/**
	 * Get capabilities for a specific model
	 */
	getCapabilities(modelId: string): ModelCapabilities {
		return this.capabilities[modelId] ?? DEFAULT_CAPABILITIES;
	}

	/**
	 * Get capabilities for the currently selected model
	 */
	get currentCapabilities(): ModelCapabilities {
		const modelId = settingsStore.selectedModel;
		return this.getCapabilities(modelId);
	}

	/**
	 * Check if a model supports extended thinking
	 */
	supportsThinking(modelId: string): boolean {
		return this.getCapabilities(modelId).supportsThinking;
	}

	/**
	 * Check if the current model supports extended thinking
	 */
	get currentSupportsThinking(): boolean {
		return this.currentCapabilities.supportsThinking;
	}

	/**
	 * Check if a model supports vision/images
	 */
	supportsVision(modelId: string): boolean {
		return this.getCapabilities(modelId).supportsVision;
	}

	/**
	 * Check if the current model supports vision/images
	 */
	get currentSupportsVision(): boolean {
		return this.currentCapabilities.supportsVision;
	}

	/**
	 * Check if a model supports tool use
	 */
	supportsTools(modelId: string): boolean {
		return this.getCapabilities(modelId).supportsTools;
	}

	/**
	 * Check if the current model supports tool use
	 */
	get currentSupportsTools(): boolean {
		return this.currentCapabilities.supportsTools;
	}

	/**
	 * Get context window size for a model
	 */
	getContextWindow(modelId: string): number {
		return this.getCapabilities(modelId).contextWindow;
	}

	/**
	 * Get context window for the current model
	 */
	get currentContextWindow(): number {
		return this.currentCapabilities.contextWindow;
	}

	/**
	 * Get max output tokens for a model
	 */
	getMaxOutputTokens(modelId: string): number {
		return this.getCapabilities(modelId).maxOutputTokens;
	}

	/**
	 * Get max output tokens for the current model
	 */
	get currentMaxOutputTokens(): number {
		return this.currentCapabilities.maxOutputTokens;
	}

	/**
	 * Get display name for a model
	 */
	getDisplayName(modelId: string): string {
		return this.capabilities[modelId]?.displayName ?? modelId;
	}

	/**
	 * Get display name for the current model
	 */
	get currentDisplayName(): string {
		const modelId = settingsStore.selectedModel;
		return this.getDisplayName(modelId);
	}

	/**
	 * Get provider for a model
	 */
	getProvider(modelId: string): 'anthropic' | 'openai' | 'meta' | 'amazon' | 'deepseek' | 'mistral' | 'google' | 'minimax' | 'moonshot' {
		return this.getCapabilities(modelId).provider;
	}

	/**
	 * Get description for a model
	 */
	getDescription(modelId: string): string | undefined {
		return this.capabilities[modelId]?.description;
	}

	/**
	 * Get reasoning effort levels for a model (OpenAI o-series)
	 */
	getReasoningEffortLevels(modelId: string): ('low' | 'medium' | 'high' | 'xhigh')[] | undefined {
		return this.capabilities[modelId]?.reasoningEffortLevels;
	}

	/**
	 * Format context window for display (e.g., "200K", "1M")
	 */
	formatContextWindow(tokens: number): string {
		if (tokens >= 1000000) {
			return `${(tokens / 1000000).toFixed(tokens % 1000000 === 0 ? 0 : 1)}M`;
		}
		return `${Math.round(tokens / 1000)}K`;
	}

	/**
	 * Get all model IDs that support a specific capability
	 */
	getModelsWithCapability(capability: 'supportsThinking' | 'supportsVision' | 'supportsTools'): string[] {
		return Object.entries(this.capabilities)
			.filter(([_, caps]) => caps[capability])
			.map(([id]) => id);
	}
}

// Export singleton instance
export const modelCapabilitiesStore = new ModelCapabilitiesStore();
