/**
 * Theme Utility
 *
 * Centralized theme management to ensure consistent behavior across the app.
 * Handles light/dark/system themes AND exits easter egg themes (like hacker mode).
 */

export type ThemePreference = 'dark' | 'light' | 'system';

/**
 * Apply theme to the document.
 *
 * This function:
 * 1. Sets light/dark classes on documentElement based on preference
 * 2. Exits any easter egg themes (like hacker mode) - this is the "escape hatch"
 *
 * Call this whenever the user changes their theme preference via any UI.
 */
export function applyTheme(theme: ThemePreference): void {
	// Safety check for SSR
	if (typeof document === 'undefined') return;

	const root = document.documentElement;

	// Apply light/dark based on preference
	if (theme === 'system') {
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		root.classList.toggle('light', !prefersDark);
		root.classList.toggle('dark', prefersDark);
	} else {
		root.classList.toggle('light', theme === 'light');
		root.classList.toggle('dark', theme === 'dark');
	}

	// Exit any easter egg themes - changing theme is the natural "escape hatch"
	// Users expect theme picker to reset appearance to normal
	exitEasterEggThemes();
}

/**
 * Exit all easter egg themes.
 *
 * Called automatically by applyTheme() so users can exit easter egg themes
 * by simply changing their theme preference.
 */
export function exitEasterEggThemes(): void {
	if (typeof document === 'undefined') return;

	// Remove hacker/matrix theme
	document.body.classList.remove('theme-hacker');

	// Future easter egg themes can be added here:
	// document.body.classList.remove('theme-retro');
	// document.body.classList.remove('theme-ocean');
	// etc.
}

/**
 * Check if any easter egg theme is currently active.
 */
export function isEasterEggThemeActive(): boolean {
	if (typeof document === 'undefined') return false;

	return document.body.classList.contains('theme-hacker');
	// Future: || document.body.classList.contains('theme-retro') etc.
}
