/**
 * Focus Mode Utilities
 *
 * Manages CSS custom properties for task focus mode.
 * When a task is focused, its color becomes the accent color
 * with a smooth 300ms transition.
 */

import { getMutedColor } from '$lib/config/task-colors';

/**
 * Apply task focus color as CSS custom property
 * This enables smooth color transitions across the UI
 */
export function applyFocusColor(color: string | null): void {
	if (typeof document === 'undefined') return;

	const root = document.documentElement;

	if (color) {
		root.style.setProperty('--task-accent', color);
		root.style.setProperty('--task-accent-muted', getMutedColor(color, 0.15));
		root.style.setProperty('--task-accent-ring', getMutedColor(color, 0.4));
		root.classList.add('task-focus-mode');
	} else {
		root.style.removeProperty('--task-accent');
		root.style.removeProperty('--task-accent-muted');
		root.style.removeProperty('--task-accent-ring');
		root.classList.remove('task-focus-mode');
	}
}

/**
 * Check if focus mode is active
 */
export function isFocusModeActive(): boolean {
	if (typeof document === 'undefined') return false;
	return document.documentElement.classList.contains('task-focus-mode');
}

/**
 * Get current focus color
 */
export function getFocusColor(): string | null {
	if (typeof document === 'undefined') return null;
	return document.documentElement.style.getPropertyValue('--task-accent') || null;
}
