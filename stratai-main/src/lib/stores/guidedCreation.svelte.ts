/**
 * Guided Creation Store
 *
 * Manages state for Phase 8: Guided Page Creation flow.
 * Tracks when user is in guided mode, the page type being created,
 * and whether AI is ready to generate.
 *
 * Usage:
 *   import { guidedCreationStore } from '$lib/stores/guidedCreation.svelte';
 *   guidedCreationStore.startGuidedMode('proposal', 'New client pitch');
 */

import type { PageType } from '$lib/types/page';

export interface GuidedCreationState {
	active: boolean;
	pageType: PageType;
	topic: string;
	conversationId: string | null;
	readyToGenerate: boolean;
	isGenerating: boolean;
}

const DEFAULT_STATE: GuidedCreationState = {
	active: false,
	pageType: 'general',
	topic: '',
	conversationId: null,
	readyToGenerate: false,
	isGenerating: false
};

class GuidedCreationStore {
	// Guided mode state
	active = $state(false);
	pageType = $state<PageType>('general');
	topic = $state('');
	conversationId = $state<string | null>(null);
	readyToGenerate = $state(false);
	isGenerating = $state(false);

	/**
	 * Start guided creation mode
	 */
	startGuidedMode(pageType: PageType, topic: string, conversationId?: string): void {
		this.active = true;
		this.pageType = pageType;
		this.topic = topic;
		this.conversationId = conversationId ?? null;
		this.readyToGenerate = false;
		this.isGenerating = false;
	}

	/**
	 * Set the conversation ID (if not provided at start)
	 */
	setConversationId(conversationId: string): void {
		this.conversationId = conversationId;
	}

	/**
	 * Mark that AI is ready to generate the document
	 */
	setReadyToGenerate(ready: boolean): void {
		this.readyToGenerate = ready;
	}

	/**
	 * Mark that generation is in progress
	 */
	setGenerating(generating: boolean): void {
		this.isGenerating = generating;
	}

	/**
	 * Update the topic (e.g., if user clarifies during Q&A)
	 */
	updateTopic(topic: string): void {
		this.topic = topic;
	}

	/**
	 * Exit guided creation mode (cancel or complete)
	 */
	exitGuidedMode(): void {
		this.active = false;
		this.pageType = 'general';
		this.topic = '';
		this.conversationId = null;
		this.readyToGenerate = false;
		this.isGenerating = false;
	}

	/**
	 * Get current state as object (useful for debugging or passing to API)
	 */
	getState(): GuidedCreationState {
		return {
			active: this.active,
			pageType: this.pageType,
			topic: this.topic,
			conversationId: this.conversationId,
			readyToGenerate: this.readyToGenerate,
			isGenerating: this.isGenerating
		};
	}

	/**
	 * Check if we're in guided mode for a specific conversation
	 */
	isActiveForConversation(conversationId: string): boolean {
		return this.active && this.conversationId === conversationId;
	}
}

export const guidedCreationStore = new GuidedCreationStore();
