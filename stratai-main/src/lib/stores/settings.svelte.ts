/**
 * Settings Store - Persisted user preferences
 * Uses Svelte 5 runes with localStorage persistence
 */

const STORAGE_KEY = 'strathost-settings';

export interface UserSettings {
	selectedModel: string;
	sidebarOpen: boolean;
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

	// Setters
	setSelectedModel(model: string): void {
		this.settings.selectedModel = model;
		this.persist();
	}

	setSidebarOpen(open: boolean): void {
		this.settings.sidebarOpen = open;
		this.persist();
	}

	toggleSidebar(): void {
		this.settings.sidebarOpen = !this.settings.sidebarOpen;
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
		// Clamp to valid range, integer only
		this.settings.maxTokens = Math.max(256, Math.min(32000, Math.floor(value)));
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
		this.settings.extendedThinkingEnabled = value;
		this.persist();
	}

	toggleExtendedThinking(): void {
		this.settings.extendedThinkingEnabled = !this.settings.extendedThinkingEnabled;
		this.persist();
	}

	setThinkingBudgetTokens(value: number): void {
		// Clamp to valid range: min 1024, max should be less than maxTokens
		const minBudget = 1024;
		const maxBudget = Math.max(minBudget, this.settings.maxTokens - 1000);
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
