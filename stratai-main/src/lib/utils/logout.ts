/**
 * Logout Utility
 *
 * Clears all client-side state before server-side session cleanup.
 * This prevents data leakage when a different user logs in on the same browser.
 */

import { userStore } from '$lib/stores/user.svelte';
import { chatStore } from '$lib/stores/chat.svelte';
import { spacesStore } from '$lib/stores/spaces.svelte';
import { areaStore } from '$lib/stores/areas.svelte';
import { taskStore } from '$lib/stores/tasks.svelte';
import { documentStore } from '$lib/stores/documents.svelte';
import { arenaStore } from '$lib/stores/arena.svelte';
import { pageStore } from '$lib/stores/pages.svelte';

// localStorage keys used by the app
// These are cleared to prevent data leakage between user sessions
const LOCAL_STORAGE_KEYS = [
	// Core stores
	'strathost-conversations', // chatStore
	'strathost-settings', // settingsStore
	'strathost-arena-battles', // arenaStore
	// User preferences
	'stratai-task-planning-model', // TaskPlanningModelModal
	'stratai-task-planning-skip-modal', // TaskPlanningModelModal
	'stratai-tasks-lastVisit', // temporal-context
	// Optional (non-sensitive but good to clear)
	'stratai-easter-eggs' // easter-eggs store
];

/**
 * Clear all client-side state (stores and localStorage)
 * Call this before navigating to /logout
 */
export function clearClientState(): void {
	// Clear Svelte stores
	try {
		userStore.clear();
	} catch (e) {
		console.warn('Failed to clear userStore:', e);
	}

	try {
		chatStore.clearAll();
	} catch (e) {
		console.warn('Failed to clear chatStore:', e);
	}

	try {
		spacesStore.clearCache();
	} catch (e) {
		console.warn('Failed to clear spacesStore:', e);
	}

	try {
		areaStore.clearCache();
	} catch (e) {
		console.warn('Failed to clear areaStore:', e);
	}

	try {
		taskStore.clearAll();
	} catch (e) {
		console.warn('Failed to clear taskStore:', e);
	}

	try {
		documentStore.clearAll();
	} catch (e) {
		console.warn('Failed to clear documentStore:', e);
	}

	try {
		arenaStore.clearAll();
	} catch (e) {
		console.warn('Failed to clear arenaStore:', e);
	}

	try {
		pageStore.clearAll();
	} catch (e) {
		console.warn('Failed to clear pageStore:', e);
	}

	// Clear localStorage
	if (typeof window !== 'undefined') {
		for (const key of LOCAL_STORAGE_KEYS) {
			try {
				localStorage.removeItem(key);
			} catch (e) {
				console.warn(`Failed to remove localStorage key ${key}:`, e);
			}
		}
	}
}

/**
 * Perform full logout: clear client state and navigate to server logout
 */
export function performLogout(): void {
	clearClientState();

	// Navigate to server logout endpoint
	if (typeof window !== 'undefined') {
		window.location.href = '/logout';
	}
}
