/**
 * Settings Store - Persisted user preferences
 * Uses Svelte 5 runes with localStorage persistence
 */

import {
	getMaxOutputTokens,
	modelSupportsThinking,
	modelSupportsVision
} from '$lib/config/model-capabilities';

const STORAGE_KEY = 'strathost-settings';

export interface UserSettings {
	selectedModel: string;
	sidebarOpen: boolean;
	spaceConversationsOpen: boolean; // Space dashboard conversations panel
	theme: 'dark' | 'light' | 'system';
	sendOnEnter: boolean;
	showTimestamps: boolean;
	// LLM Parameters
	temperature: number;
	maxTokens: number;
	systemPrompt: string;
	// Web Search
	webSearchFeatureEnabled: boolean; // Admin-level: whether web search is available at all
	webSearchEnabled: boolean; // User-level: whether to use web search for current session
	// Extended Thinking (Claude models)
	extendedThinkingEnabled: boolean;
	thinkingBudgetTokens: number; // Min 1024, must be less than maxTokens
	// Context Window Management
	contextThresholdPercent: 0 | 25 | 50 | 75; // When to show context indicator (0 = always)
}

const defaultSettings: UserSettings = {
	selectedModel: '',
	sidebarOpen: true,
	spaceConversationsOpen: false, // Default: collapsed on page load
	theme: 'dark',
	sendOnEnter: true,
	showTimestamps: true,
	// LLM Parameter defaults
	temperature: 0.7,
	maxTokens: 16000,
	systemPrompt: '',
	// Web Search defaults
	webSearchFeatureEnabled: true, // Admin can disable this
	webSearchEnabled: false, // User toggle for each session
	// Extended Thinking defaults
	extendedThinkingEnabled: false,
	thinkingBudgetTokens: 10000, // Default budget for thinking
	// Context Window defaults
	contextThresholdPercent: 50 // Show indicator at 50% usage
};

class SettingsStore {
	private settings = $state<UserSettings>(defaultSettings);
	private initialized = false;

	constructor() {
		// Hydrate from localStorage on client
		if (typeof window !== 'undefined') {
			this.hydrate();
		}
	}

	private hydrate(): void {
		if (this.initialized) return;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				// Merge with defaults to handle new settings
				this.settings = { ...defaultSettings, ...parsed };
			}
		} catch (e) {
			console.warn('Failed to hydrate settings:', e);
		}

		this.initialized = true;
	}

	private persist(): void {
		if (typeof window === 'undefined') return;

		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
		} catch (e) {
			console.warn('Failed to persist settings:', e);
		}
	}

	// Getters
	get selectedModel(): string {
		return this.settings.selectedModel;
	}

	get sidebarOpen(): boolean {
		return this.settings.sidebarOpen;
	}

	get spaceConversationsOpen(): boolean {
		return this.settings.spaceConversationsOpen;
	}

	get theme(): 'dark' | 'light' | 'system' {
		return this.settings.theme;
	}

	get sendOnEnter(): boolean {
		return this.settings.sendOnEnter;
	}

	get showTimestamps(): boolean {
		return this.settings.showTimestamps;
	}

	get temperature(): number {
		return this.settings.temperature;
	}

	get maxTokens(): number {
		return this.settings.maxTokens;
	}

	get systemPrompt(): string {
		return this.settings.systemPrompt;
	}

	get webSearchFeatureEnabled(): boolean {
		return this.settings.webSearchFeatureEnabled;
	}

	get webSearchEnabled(): boolean {
		return this.settings.webSearchEnabled;
	}

	get extendedThinkingEnabled(): boolean {
		return this.settings.extendedThinkingEnabled;
	}

	get thinkingBudgetTokens(): number {
		return this.settings.thinkingBudgetTokens;
	}

	get contextThresholdPercent(): 0 | 25 | 50 | 75 {
		return this.settings.contextThresholdPercent;
	}

	get all(): UserSettings {
		return { ...this.settings };
	}

	// Check if AUTO mode is enabled
	get isAutoMode(): boolean {
		return this.settings.selectedModel.toLowerCase() === 'auto';
	}

	// Capability-aware derived properties
	/**
	 * Check if the current model supports extended thinking
	 * In AUTO mode, thinking is supported (router will pick appropriate model)
	 */
	get canUseExtendedThinking(): boolean {
		if (this.isAutoMode) return true; // Router handles model selection
		return modelSupportsThinking(this.settings.selectedModel);
	}

	/**
	 * Check if the current model supports vision/images
	 * In AUTO mode, vision is supported (router will pick appropriate model)
	 */
	get canUseVision(): boolean {
		if (this.isAutoMode) return true; // Router handles model selection
		return modelSupportsVision(this.settings.selectedModel);
	}

	/**
	 * Get the effective max tokens (minimum of setting and model limit)
	 * In AUTO mode, use default limit (router will adjust based on selected model)
	 */
	get effectiveMaxTokens(): number {
		if (this.isAutoMode) return this.settings.maxTokens; // Use user setting, router handles limits
		const modelMax = getMaxOutputTokens(this.settings.selectedModel);
		return Math.min(this.settings.maxTokens, modelMax);
	}

	/**
	 * Get the max output tokens for the current model
	 * In AUTO mode, return a high limit (router will pick appropriate model)
	 */
	get modelMaxOutputTokens(): number {
		if (this.isAutoMode) return 64000; // Conservative high limit for AUTO mode
		return getMaxOutputTokens(this.settings.selectedModel);
	}

	// Setters
	setSelectedModel(model: string): void {
		const previousModel = this.settings.selectedModel;
		this.settings.selectedModel = model;

		// Silently adjust settings for new model's capabilities
		if (model !== previousModel) {
			this.adjustSettingsForModel(model);
		}

		this.persist();
	}

	/**
	 * Silently adjust settings when model changes to ensure compatibility
	 */
	private adjustSettingsForModel(model: string): void {
		// Skip adjustments for AUTO mode - router handles compatibility
		if (model.toLowerCase() === 'auto') return;

		// Adjust max tokens if current value exceeds new model's limit
		const newModelMaxTokens = getMaxOutputTokens(model);
		if (this.settings.maxTokens > newModelMaxTokens) {
			this.settings.maxTokens = newModelMaxTokens;
		}

		// Disable extended thinking if new model doesn't support it
		if (this.settings.extendedThinkingEnabled && !modelSupportsThinking(model)) {
			this.settings.extendedThinkingEnabled = false;
		}

		// Adjust thinking budget if it exceeds new limits
		if (this.settings.thinkingBudgetTokens > newModelMaxTokens - 1000) {
			this.settings.thinkingBudgetTokens = Math.max(1024, newModelMaxTokens - 1000);
		}
	}

	setSidebarOpen(open: boolean): void {
		this.settings.sidebarOpen = open;
		this.persist();
	}

	toggleSidebar(): void {
		this.settings.sidebarOpen = !this.settings.sidebarOpen;
		this.persist();
	}

	setSpaceConversationsOpen(open: boolean): void {
		this.settings.spaceConversationsOpen = open;
		this.persist();
	}

	toggleSpaceConversations(): void {
		this.settings.spaceConversationsOpen = !this.settings.spaceConversationsOpen;
		this.persist();
	}

	setTheme(theme: 'dark' | 'light' | 'system'): void {
		this.settings.theme = theme;
		this.persist();
	}

	setSendOnEnter(value: boolean): void {
		this.settings.sendOnEnter = value;
		this.persist();
	}

	setShowTimestamps(value: boolean): void {
		this.settings.showTimestamps = value;
		this.persist();
	}

	setTemperature(value: number): void {
		// Clamp to valid range and round to 2 decimals
		this.settings.temperature = Math.round(Math.max(0, Math.min(2, value)) * 100) / 100;
		this.persist();
	}

	setMaxTokens(value: number): void {
		// Clamp to valid range based on model capabilities
		const modelMax = getMaxOutputTokens(this.settings.selectedModel);
		this.settings.maxTokens = Math.max(256, Math.min(modelMax, Math.floor(value)));
		this.persist();
	}

	setSystemPrompt(value: string): void {
		// Trim and limit length
		this.settings.systemPrompt = value.trim().slice(0, 2000);
		this.persist();
	}

	setWebSearchFeatureEnabled(value: boolean): void {
		this.settings.webSearchFeatureEnabled = value;
		// If disabling the feature, also disable the user toggle
		if (!value) {
			this.settings.webSearchEnabled = false;
		}
		this.persist();
	}

	setWebSearchEnabled(value: boolean): void {
		// Only allow enabling if the feature is enabled
		if (value && !this.settings.webSearchFeatureEnabled) {
			return;
		}
		this.settings.webSearchEnabled = value;
		this.persist();
	}

	toggleWebSearch(): void {
		// Only allow toggling if the feature is enabled
		if (!this.settings.webSearchFeatureEnabled) {
			return;
		}
		this.settings.webSearchEnabled = !this.settings.webSearchEnabled;
		this.persist();
	}

	setExtendedThinkingEnabled(value: boolean): void {
		// Only allow enabling if the current model supports thinking
		// In AUTO mode, allow it - router will select appropriate model
		if (value && !this.isAutoMode && !modelSupportsThinking(this.settings.selectedModel)) {
			return;
		}
		this.settings.extendedThinkingEnabled = value;
		this.persist();
	}

	toggleExtendedThinking(): void {
		// Only allow toggling on if the model supports thinking
		// In AUTO mode, allow it - router will select appropriate model
		const newValue = !this.settings.extendedThinkingEnabled;
		if (newValue && !this.isAutoMode && !modelSupportsThinking(this.settings.selectedModel)) {
			return;
		}
		this.settings.extendedThinkingEnabled = newValue;
		this.persist();
	}

	setThinkingBudgetTokens(value: number): void {
		// Clamp to valid range: min 1024, max should be less than model's max output
		const minBudget = 1024;
		const modelMax = getMaxOutputTokens(this.settings.selectedModel);
		const maxBudget = Math.max(minBudget, modelMax - 1000);
		this.settings.thinkingBudgetTokens = Math.max(minBudget, Math.min(maxBudget, Math.floor(value)));
		this.persist();
	}

	setContextThresholdPercent(value: 0 | 25 | 50 | 75): void {
		this.settings.contextThresholdPercent = value;
		this.persist();
	}

	resetLLMSettings(): void {
		this.settings.temperature = defaultSettings.temperature;
		this.settings.maxTokens = defaultSettings.maxTokens;
		this.settings.systemPrompt = defaultSettings.systemPrompt;
		this.persist();
	}

	// Update multiple settings at once
	update(updates: Partial<UserSettings>): void {
		this.settings = { ...this.settings, ...updates };
		this.persist();
	}

	// Reset to defaults
	reset(): void {
		this.settings = { ...defaultSettings };
		this.persist();
	}
}

// Export singleton instance
export const settingsStore = new SettingsStore();
