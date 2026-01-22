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
	console.log('[LOGOUT] Step 3: clearClientState() called');
	console.log('[LOGOUT] Clearing Svelte stores...');

	// Clear Svelte stores
	try {
		userStore.clear();
		console.log('[LOGOUT] ✓ userStore cleared');
	} catch (e) {
		console.warn('[LOGOUT] ✗ Failed to clear userStore:', e);
	}

	try {
		chatStore.clearCache(); // CRITICAL: Use clearCache(), NOT clearAll() which deletes from DB!
		console.log('[LOGOUT] ✓ chatStore cache cleared');
	} catch (e) {
		console.warn('[LOGOUT] ✗ Failed to clear chatStore:', e);
	}

	try {
		spacesStore.clearCache();
		console.log('[LOGOUT] ✓ spacesStore cleared');
	} catch (e) {
		console.warn('[LOGOUT] ✗ Failed to clear spacesStore:', e);
	}

	try {
		areaStore.clearCache();
		console.log('[LOGOUT] ✓ areaStore cleared');
	} catch (e) {
		console.warn('[LOGOUT] ✗ Failed to clear areaStore:', e);
	}

	try {
		taskStore.clearAll();
		console.log('[LOGOUT] ✓ taskStore cleared');
	} catch (e) {
		console.warn('[LOGOUT] ✗ Failed to clear taskStore:', e);
	}

	try {
		documentStore.clearAll();
		console.log('[LOGOUT] ✓ documentStore cleared');
	} catch (e) {
		console.warn('[LOGOUT] ✗ Failed to clear documentStore:', e);
	}

	try {
		arenaStore.clearAll();
		console.log('[LOGOUT] ✓ arenaStore cleared');
	} catch (e) {
		console.warn('[LOGOUT] ✗ Failed to clear arenaStore:', e);
	}

	try {
		pageStore.clearAll();
		console.log('[LOGOUT] ✓ pageStore cleared');
	} catch (e) {
		console.warn('[LOGOUT] ✗ Failed to clear pageStore:', e);
	}

	// Clear localStorage
	console.log('[LOGOUT] Clearing localStorage keys...');
	if (typeof window !== 'undefined') {
		for (const key of LOCAL_STORAGE_KEYS) {
			try {
				localStorage.removeItem(key);
				console.log(`[LOGOUT] ✓ localStorage key "${key}" removed`);
			} catch (e) {
				console.warn(`[LOGOUT] ✗ Failed to remove localStorage key ${key}:`, e);
			}
		}
	} else {
		console.warn('[LOGOUT] ✗ window is undefined, cannot clear localStorage');
	}

	console.log('[LOGOUT] Step 3 complete: Client state cleared');
}

/**
 * Handle session expiry - redirect to login with a message
 * Call this when a 401 Unauthorized response is received
 */
export function handleSessionExpiry(): void {
	if (typeof window === 'undefined') return;

	console.log('[AUTH] Session expired - redirecting to login');

	// Clear client state to ensure clean re-authentication
	clearClientState();

	// Redirect to login with session_expired flag
	// The login page will show a friendly message
	window.location.href = '/login?session_expired=true';
}

/**
 * Check if a response indicates session expiry and handle it
 * Returns true if session expired (and redirect was triggered), false otherwise
 *
 * Usage:
 *   if (!response.ok) {
 *     if (handleUnauthorizedResponse(response)) return; // Session expired, redirecting
 *     // Handle other errors...
 *   }
 */
export function handleUnauthorizedResponse(response: Response): boolean {
	if (response.status === 401) {
		handleSessionExpiry();
		return true;
	}
	return false;
}

/**
 * Perform full logout: clear client state and navigate to server logout
 */
export function performLogout(): void {
	console.log('[LOGOUT] performLogout() called');

	clearClientState();

	// Navigate to server logout endpoint
	console.log('[LOGOUT] Step 4: Navigating to /logout');
	if (typeof window !== 'undefined') {
		console.log('[LOGOUT] Current location:', window.location.href);
		console.log('[LOGOUT] Setting window.location.href = "/logout"');

		// Log cookies before navigation (for debugging)
		console.log('[LOGOUT] Current cookies:', document.cookie || '(none visible to JS - httpOnly)');

		window.location.href = '/logout';
		console.log('[LOGOUT] Navigation initiated - browser should redirect now');
	} else {
		console.error('[LOGOUT] ✗ window is undefined, cannot navigate');
	}
}
