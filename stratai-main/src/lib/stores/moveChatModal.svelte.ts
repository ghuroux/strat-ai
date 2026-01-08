/**
 * Move Chat Modal Store
 *
 * Global store for managing the "Move Chat" modal state.
 * Allows any component to trigger the modal without prop drilling.
 *
 * Usage:
 *   import { moveChatModalStore } from '$lib/stores/moveChatModal.svelte';
 *   moveChatModalStore.open(conversation);
 */

import type { Conversation } from '$lib/types/chat';
import { chatStore } from './chat.svelte';
import { spacesStore } from './spaces.svelte';
import { toastStore } from './toast.svelte';

class MoveChatModalStore {
	// Modal state
	isOpen = $state(false);
	conversation = $state<Conversation | null>(null);

	/**
	 * Open the move modal for a conversation
	 */
	open(conversation: Conversation): void {
		this.conversation = conversation;
		this.isOpen = true;
	}

	/**
	 * Close the modal
	 */
	close(): void {
		this.isOpen = false;
		this.conversation = null;
	}

	/**
	 * Move the conversation to a new space/area
	 */
	move(spaceId: string | null, areaId: string | null): void {
		if (!this.conversation) return;

		const conv = this.conversation;

		// Update conversation context
		chatStore.updateConversationContext(conv.id, {
			spaceId,
			areaId,
			taskId: null // Clear task association when moving
		});

		// Show success toast
		if (spaceId) {
			const space = spacesStore.getSpaceById(spaceId);
			toastStore.success(`Moved to ${space?.name || 'space'}`);
		} else {
			toastStore.success('Moved to Main Chat');
		}

		// Close modal
		this.close();
	}
}

export const moveChatModalStore = new MoveChatModalStore();
