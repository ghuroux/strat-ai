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

// localStorage keys used by the app
const LOCAL_STORAGE_KEYS = [
	'strathost-conversations',
	'strathost-settings',
	// Add any other localStorage keys your app uses
	'strathost-arena-history',
	'strathost-planning-model-preference'
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
