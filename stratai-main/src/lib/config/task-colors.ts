/**
 * Task Color Palette
 *
 * 8-color rotating palette for task assignment.
 * Colors are carefully selected to:
 * - Work well as CSS accent colors
 * - Be distinguishable from each other
 * - Feel vibrant but not overwhelming
 * - Work in both light and dark contexts
 */

export const TASK_COLORS = [
	'#6366f1', // Indigo - calm, professional
	'#14b8a6', // Teal - fresh, balanced
	'#f59e0b', // Amber - warm, energetic
	'#f43f5e', // Rose - urgent, important
	'#8b5cf6', // Violet - creative, thoughtful
	'#10b981', // Emerald - growth, progress
	'#06b6d4', // Cyan - clarity, focus
	'#f97316' // Orange - action, momentum
] as const;

export type TaskColor = (typeof TASK_COLORS)[number];

/**
 * Index tracker for rotating color assignment
 * Resets on app restart (intentional - variation is good)
 */
let colorIndex = 0;

/**
 * Get the next color in rotation
 * Used when creating new tasks to ensure visual variety
 */
export function getNextTaskColor(): TaskColor {
	const color = TASK_COLORS[colorIndex];
	colorIndex = (colorIndex + 1) % TASK_COLORS.length;
	return color;
}

/**
 * Reset color rotation (useful for testing)
 */
export function resetColorRotation(): void {
	colorIndex = 0;
}

/**
 * Get a muted version of a task color for backgrounds
 * Used for focus mode accents
 */
export function getMutedColor(color: string, opacity: number = 0.15): string {
	return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}

/**
 * Color names for accessibility/display
 */
export const TASK_COLOR_NAMES: Record<TaskColor, string> = {
	'#6366f1': 'Indigo',
	'#14b8a6': 'Teal',
	'#f59e0b': 'Amber',
	'#f43f5e': 'Rose',
	'#8b5cf6': 'Violet',
	'#10b981': 'Emerald',
	'#06b6d4': 'Cyan',
	'#f97316': 'Orange'
};

/**
 * Get color name for display
 */
export function getColorName(color: string): string {
	return TASK_COLOR_NAMES[color as TaskColor] ?? 'Custom';
}
