/**
 * Client-side error handler for SvelteKit
 *
 * Catches unhandled client errors (rendering, hydration, JS runtime)
 * and shows user-friendly toast notifications.
 */
import type { HandleClientError } from '@sveltejs/kit';
import { toastStore } from '$lib/stores/toast.svelte';

export const handleError: HandleClientError = async ({ error, status, message }) => {
	const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

	console.error('[Client Error]', { error, status, message });

	// Show toast for non-navigation errors (404s handled by +error.svelte)
	if (status !== 404) {
		toastStore.error(errorMessage);
	}

	return { message: errorMessage };
};
