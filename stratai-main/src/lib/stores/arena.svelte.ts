/**
 * Arena Store - Model comparison battle management with localStorage persistence
 * Uses Svelte 5 runes for reactivity with SvelteMap for proper tracking
 */

import { SvelteMap } from 'svelte/reactivity';

const STORAGE_KEY = 'strathost-arena-battles';
const MAX_BATTLES = 20;

function generateId(): string {
	return crypto.randomUUID();
}

// Debounce utility for persistence
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
	let timeoutId: ReturnType<typeof setTimeout>;
	return ((...args: unknown[]) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), ms);
	}) as T;
}

// Types
export interface ArenaModel {
	id: string;
	displayName: string;
	provider: string;
}

export interface SearchSource {
	title: string;
	url: string;
	snippet: string;
}

export interface ArenaResponse {
	id: string;
	modelId: string;
	content: string;
	thinking?: string;
	isStreaming: boolean;
	isThinking: boolean;
	error?: string;
	sources?: SearchSource[];
	searchStatus?: 'searching' | 'complete';
	searchQuery?: string;
	startedAt: number;
	completedAt?: number;
	durationMs?: number;
	firstTokenAt?: number;
	metrics?: ResponseMetrics;
}

export interface ArenaJudgment {
	winnerId: string | null;
	analysis: string;
	scores: Record<string, number>;
	criteria: string[];
	timestamp: number;
}

export interface BattleSettings {
	webSearchEnabled: boolean;
	extendedThinkingEnabled: boolean;
	thinkingBudgetTokens: number;
	temperature: number;
	reasoningEffort: 'low' | 'medium' | 'high';
	blindMode: boolean;
}

export interface ResponseMetrics {
	inputTokens?: number;
	outputTokens?: number;
	reasoningTokens?: number;
	estimatedCost?: number;
	timeToFirstToken?: number;
}

export type BattleStatus = 'pending' | 'streaming' | 'complete' | 'judging' | 'judged';

export interface ArenaBattle {
	id: string;
	prompt: string;
	models: ArenaModel[];
	responses: ArenaResponse[];
	userVote?: string;
	aiJudgment?: ArenaJudgment;
	settings: BattleSettings;
	status: BattleStatus;
	createdAt: number;
}

// Svelte 5 reactive state using $state rune in a class
class ArenaStore {
	// Use SvelteMap for automatic reactivity tracking
	battles = $state<SvelteMap<string, ArenaBattle>>(new SvelteMap());
	activeBattleId = $state<string | null>(null);
	selectedModels = $state<string[]>([]);
	isJudging = $state(false);
	abortControllers = $state<Map<string, AbortController>>(new Map());

	// Version counter for fine-grained updates
	_version = $state(0);

	private initialized = false;
	private persistDebounced: () => void;

	constructor() {
		this.persistDebounced = debounce(() => this.persist(), 500);

		if (typeof window !== 'undefined') {
			this.hydrate();
		}
	}

	// Hydrate state from localStorage
	private hydrate(): void {
		if (this.initialized) return;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const { battles, activeId, selectedModels } = JSON.parse(stored);
				this.battles = new SvelteMap(battles);
				if (activeId && this.battles.has(activeId)) {
					this.activeBattleId = activeId;
				}
				if (selectedModels && Array.isArray(selectedModels)) {
					this.selectedModels = selectedModels;
				}
			}
		} catch (e) {
			console.warn('Failed to hydrate arena store:', e);
		}

		this.initialized = true;
	}

	// Persist state to localStorage
	private persist(): void {
		if (typeof window === 'undefined') return;

		try {
			const sorted = Array.from(this.battles.values())
				.sort((a, b) => b.createdAt - a.createdAt)
				.slice(0, MAX_BATTLES);

			const data = {
				battles: sorted.map((b) => [b.id, b]),
				activeId: this.activeBattleId,
				selectedModels: this.selectedModels
			};

			localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		} catch (e) {
			console.warn('Failed to persist arena store:', e);
		}
	}

	private schedulePersist(): void {
		this.persistDebounced();
	}

	// Derived values
	activeBattle = $derived.by(() => {
		const _ = this._version;
		if (!this.activeBattleId) return null;
		return this.battles.get(this.activeBattleId) || null;
	});

	battleList = $derived.by(() => {
		return Array.from(this.battles.values()).sort((a, b) => b.createdAt - a.createdAt);
	});

	hasBattles = $derived.by(() => {
		return this.battles.size > 0;
	});

	battleCount = $derived.by(() => {
		return this.battles.size;
	});

	isStreaming = $derived.by(() => {
		const battle = this.activeBattle;
		return battle?.status === 'streaming';
	});

	// Create a new battle
	createBattle(prompt: string, models: ArenaModel[], settings: BattleSettings): string {
		const id = generateId();

		const responses: ArenaResponse[] = models.map((model) => ({
			id: generateId(),
			modelId: model.id,
			content: '',
			isStreaming: true,
			isThinking: false,
			startedAt: Date.now()
		}));

		const battle: ArenaBattle = {
			id,
			prompt,
			models,
			responses,
			settings,
			status: 'streaming',
			createdAt: Date.now()
		};

		this.battles.set(id, battle);
		this.activeBattleId = id;
		this._version++;
		this.schedulePersist();
		return id;
	}

	// Update a response
	updateResponse(battleId: string, modelId: string, updates: Partial<ArenaResponse>): void {
		const battle = this.battles.get(battleId);
		if (!battle) return;

		const responseIndex = battle.responses.findIndex((r) => r.modelId === modelId);
		if (responseIndex === -1) return;

		const updatedResponse = { ...battle.responses[responseIndex], ...updates };
		battle.responses = [
			...battle.responses.slice(0, responseIndex),
			updatedResponse,
			...battle.responses.slice(responseIndex + 1)
		];

		this.battles.set(battleId, { ...battle });
		this._version++;
	}

	// Append content to a response (for streaming)
	appendToResponse(battleId: string, modelId: string, content: string): void {
		const battle = this.battles.get(battleId);
		if (!battle) return;

		const responseIndex = battle.responses.findIndex((r) => r.modelId === modelId);
		if (responseIndex === -1) return;

		const response = battle.responses[responseIndex];
		const updatedResponse = {
			...response,
			content: response.content + content
		};

		battle.responses = [
			...battle.responses.slice(0, responseIndex),
			updatedResponse,
			...battle.responses.slice(responseIndex + 1)
		];

		this.battles.set(battleId, { ...battle });
		this._version++;
	}

	// Append to thinking content
	appendToThinking(battleId: string, modelId: string, thinking: string): void {
		const battle = this.battles.get(battleId);
		if (!battle) return;

		const responseIndex = battle.responses.findIndex((r) => r.modelId === modelId);
		if (responseIndex === -1) return;

		const response = battle.responses[responseIndex];
		const updatedResponse = {
			...response,
			thinking: (response.thinking || '') + thinking,
			isThinking: true
		};

		battle.responses = [
			...battle.responses.slice(0, responseIndex),
			updatedResponse,
			...battle.responses.slice(responseIndex + 1)
		];

		this.battles.set(battleId, { ...battle });
		this._version++;
	}

	// Mark a response as complete
	completeResponse(battleId: string, modelId: string): void {
		const battle = this.battles.get(battleId);
		if (!battle) return;

		const responseIndex = battle.responses.findIndex((r) => r.modelId === modelId);
		if (responseIndex === -1) return;

		const response = battle.responses[responseIndex];
		const completedAt = Date.now();
		const updatedResponse = {
			...response,
			isStreaming: false,
			isThinking: false,
			completedAt,
			durationMs: completedAt - response.startedAt
		};

		battle.responses = [
			...battle.responses.slice(0, responseIndex),
			updatedResponse,
			...battle.responses.slice(responseIndex + 1)
		];

		// Check if all responses are complete
		const allComplete = battle.responses.every((r) => !r.isStreaming);
		if (allComplete) {
			battle.status = 'complete';
		}

		this.battles.set(battleId, { ...battle });
		this._version++;
		this.schedulePersist();
	}

	// Mark a response as errored
	errorResponse(battleId: string, modelId: string, error: string): void {
		const battle = this.battles.get(battleId);
		if (!battle) return;

		const responseIndex = battle.responses.findIndex((r) => r.modelId === modelId);
		if (responseIndex === -1) return;

		const response = battle.responses[responseIndex];
		const completedAt = Date.now();
		const updatedResponse = {
			...response,
			isStreaming: false,
			isThinking: false,
			error,
			completedAt,
			durationMs: completedAt - response.startedAt
		};

		battle.responses = [
			...battle.responses.slice(0, responseIndex),
			updatedResponse,
			...battle.responses.slice(responseIndex + 1)
		];

		// Check if all responses are complete (including errors)
		const allComplete = battle.responses.every((r) => !r.isStreaming);
		if (allComplete) {
			battle.status = 'complete';
		}

		this.battles.set(battleId, { ...battle });
		this._version++;
		this.schedulePersist();
	}

	// Set user vote
	setUserVote(battleId: string, modelId: string): void {
		const battle = this.battles.get(battleId);
		if (!battle) return;

		this.battles.set(battleId, {
			...battle,
			userVote: modelId
		});
		this._version++;
		this.schedulePersist();
	}

	// Clear user vote
	clearUserVote(battleId: string): void {
		const battle = this.battles.get(battleId);
		if (!battle) return;

		const { userVote: _, ...rest } = battle;
		this.battles.set(battleId, rest as ArenaBattle);
		this._version++;
		this.schedulePersist();
	}

	// Set AI judgment
	setAiJudgment(battleId: string, judgment: ArenaJudgment): void {
		const battle = this.battles.get(battleId);
		if (!battle) return;

		this.battles.set(battleId, {
			...battle,
			aiJudgment: judgment,
			status: 'judged'
		});
		this.isJudging = false;
		this._version++;
		this.schedulePersist();
	}

	// Set battle status
	setBattleStatus(battleId: string, status: BattleStatus): void {
		const battle = this.battles.get(battleId);
		if (!battle) return;

		this.battles.set(battleId, {
			...battle,
			status
		});
		this._version++;
		this.schedulePersist();
	}

	// Set selected models for next battle
	setSelectedModels(modelIds: string[]): void {
		this.selectedModels = modelIds.slice(0, 4); // Max 4 models
		this.schedulePersist();
	}

	// Add a model to selection
	addSelectedModel(modelId: string): void {
		if (this.selectedModels.length >= 4) return;
		if (this.selectedModels.includes(modelId)) return;
		this.selectedModels = [...this.selectedModels, modelId];
		this.schedulePersist();
	}

	// Remove a model from selection
	removeSelectedModel(modelId: string): void {
		this.selectedModels = this.selectedModels.filter((id) => id !== modelId);
		this.schedulePersist();
	}

	// Toggle model selection
	toggleSelectedModel(modelId: string): void {
		if (this.selectedModels.includes(modelId)) {
			this.removeSelectedModel(modelId);
		} else {
			this.addSelectedModel(modelId);
		}
	}

	// Clear model selection
	clearSelectedModels(): void {
		this.selectedModels = [];
		this.schedulePersist();
	}

	// Set active battle
	setActiveBattle(id: string | null): void {
		if (id === null || this.battles.has(id)) {
			this.activeBattleId = id;
			this.schedulePersist();
		}
	}

	// Get battle by ID
	getBattle(id: string): ArenaBattle | undefined {
		return this.battles.get(id);
	}

	// Delete a battle
	deleteBattle(id: string): void {
		this.battles.delete(id);
		if (this.activeBattleId === id) {
			const remaining = Array.from(this.battles.keys());
			this.activeBattleId = remaining[0] || null;
		}
		this.schedulePersist();
	}

	// Store abort controller for a model
	setAbortController(modelId: string, controller: AbortController): void {
		this.abortControllers.set(modelId, controller);
	}

	// Get abort controller for a model
	getAbortController(modelId: string): AbortController | undefined {
		return this.abortControllers.get(modelId);
	}

	// Abort a specific model's request
	abortModel(modelId: string): void {
		const controller = this.abortControllers.get(modelId);
		if (controller) {
			controller.abort();
			this.abortControllers.delete(modelId);
		}
	}

	// Abort all model requests
	abortAll(): void {
		for (const controller of this.abortControllers.values()) {
			controller.abort();
		}
		this.abortControllers.clear();
	}

	// Clear abort controllers
	clearAbortControllers(): void {
		this.abortControllers.clear();
	}

	// Clear all battles (complete reset)
	clearAll(): void {
		this.abortAll();
		this.battles = new SvelteMap();
		this.activeBattleId = null;
		this.selectedModels = [];
		this.isJudging = false;
		this._version = 0;

		if (typeof window !== 'undefined') {
			localStorage.removeItem(STORAGE_KEY);
		}
	}

	// Clear battle history but keep selected models
	clearHistory(): void {
		this.abortAll();
		this.battles = new SvelteMap();
		this.activeBattleId = null;
		this.isJudging = false;
		this._version++;
		this.schedulePersist();
	}
}

// Export singleton instance
export const arenaStore = new ArenaStore();
