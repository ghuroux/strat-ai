/**
 * Color Generation Utility
 *
 * Generates visually distinct colors based on existing colors in HSL color space.
 * Used for auto-assigning colors to areas while maintaining visual distinction.
 */

/**
 * Options for color generation (for future extensibility)
 */
export interface ColorGenerationOptions {
	/** Minimum saturation (0-100), default 60 */
	minSaturation?: number;
	/** Maximum saturation (0-100), default 80 */
	maxSaturation?: number;
	/** Minimum lightness (0-100), default 45 */
	minLightness?: number;
	/** Maximum lightness (0-100), default 65 */
	maxLightness?: number;
}

/**
 * HSL color representation
 */
export interface HSLColor {
	/** Hue (0-360) */
	h: number;
	/** Saturation (0-100) */
	s: number;
	/** Lightness (0-100) */
	l: number;
}

/**
 * Default starter palette - vibrant, distinct colors
 * These match the color options in AreaModal.svelte
 */
export const STARTER_PALETTE = [
	'#3b82f6', // Blue
	'#8b5cf6', // Purple
	'#10b981', // Green
	'#f59e0b', // Amber
	'#ef4444', // Red
	'#ec4899', // Pink
	'#06b6d4', // Cyan
	'#84cc16' // Lime
];

/**
 * Default options for color generation
 */
const DEFAULT_OPTIONS: Required<ColorGenerationOptions> = {
	minSaturation: 60,
	maxSaturation: 80,
	minLightness: 45,
	maxLightness: 65
};

/**
 * Convert hex color string to HSL
 *
 * @param hex - Hex color string (e.g., "#3b82f6" or "3b82f6")
 * @returns HSL color object or null if invalid
 */
export function hexToHsl(hex: string): HSLColor | null {
	// Remove # if present
	const cleanHex = hex.replace(/^#/, '');

	// Validate hex format
	if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
		return null;
	}

	// Parse RGB values
	const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
	const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
	const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;

	// Calculate lightness
	const l = (max + min) / 2;

	// Calculate saturation
	let s = 0;
	if (delta !== 0) {
		s = delta / (1 - Math.abs(2 * l - 1));
	}

	// Calculate hue
	let h = 0;
	if (delta !== 0) {
		if (max === r) {
			h = ((g - b) / delta) % 6;
		} else if (max === g) {
			h = (b - r) / delta + 2;
		} else {
			h = (r - g) / delta + 4;
		}
		h *= 60;
		if (h < 0) h += 360;
	}

	return {
		h: Math.round(h),
		s: Math.round(s * 100),
		l: Math.round(l * 100)
	};
}

/**
 * Convert HSL color to hex string
 *
 * @param hsl - HSL color object
 * @returns Hex color string (e.g., "#3b82f6")
 */
export function hslToHex(hsl: HSLColor): string {
	const { h, s, l } = hsl;

	// Convert to 0-1 range
	const sNorm = s / 100;
	const lNorm = l / 100;

	const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = lNorm - c / 2;

	let r = 0,
		g = 0,
		b = 0;

	if (h >= 0 && h < 60) {
		r = c;
		g = x;
		b = 0;
	} else if (h >= 60 && h < 120) {
		r = x;
		g = c;
		b = 0;
	} else if (h >= 120 && h < 180) {
		r = 0;
		g = c;
		b = x;
	} else if (h >= 180 && h < 240) {
		r = 0;
		g = x;
		b = c;
	} else if (h >= 240 && h < 300) {
		r = x;
		g = 0;
		b = c;
	} else {
		r = c;
		g = 0;
		b = x;
	}

	// Convert to 0-255 and add offset
	const toHex = (n: number) => {
		const hex = Math.round((n + m) * 255).toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	};

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Normalize hue to 0-360 range
 */
function normalizeHue(h: number): number {
	while (h < 0) h += 360;
	while (h >= 360) h -= 360;
	return h;
}

/**
 * Calculate angular distance between two hues on the color wheel
 * Returns value between 0 and 180
 */
function hueDistance(h1: number, h2: number): number {
	const diff = Math.abs(normalizeHue(h1) - normalizeHue(h2));
	return Math.min(diff, 360 - diff);
}

/**
 * Find the largest gap in the hue circle from existing colors
 *
 * @param hues - Array of existing hue values (0-360)
 * @returns Object with start and end hue of the largest gap
 */
function findLargestHueGap(hues: number[]): { start: number; end: number; size: number } {
	if (hues.length === 0) {
		return { start: 0, end: 360, size: 360 };
	}

	if (hues.length === 1) {
		// Single color - the gap spans the full circle (360 degrees)
		// Start from the existing hue, end at the same point (wrapping around)
		// Midpoint will be calculated as start + size/2 = hue + 180 = opposite
		return { start: hues[0], end: hues[0], size: 360 };
	}

	// Sort hues
	const sortedHues = [...hues].sort((a, b) => a - b);

	// Find largest gap
	let maxGap = 0;
	let gapStart = 0;
	let gapEnd = 0;

	for (let i = 0; i < sortedHues.length; i++) {
		const current = sortedHues[i];
		const next = sortedHues[(i + 1) % sortedHues.length];

		// Calculate gap (handle wrap-around)
		let gap: number;
		if (i === sortedHues.length - 1) {
			// Gap from last to first (wrapping around 360)
			gap = 360 - current + next;
		} else {
			gap = next - current;
		}

		if (gap > maxGap) {
			maxGap = gap;
			gapStart = current;
			gapEnd = next;
		}
	}

	return { start: gapStart, end: gapEnd, size: maxGap };
}

/**
 * Generate a visually distinct color based on existing colors
 *
 * Uses HSL color space to find the largest gap in the hue circle
 * and picks a color at the midpoint of that gap.
 *
 * @param existingColors - Array of existing hex color strings
 * @param options - Optional configuration for saturation/lightness ranges
 * @returns Hex color string (e.g., "#3b82f6")
 */
export function generateDistinctColor(
	existingColors: string[],
	options: ColorGenerationOptions = {}
): string {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	// Filter out invalid colors and convert to HSL
	const validHsls = existingColors
		.map((c) => hexToHsl(c))
		.filter((hsl): hsl is HSLColor => hsl !== null);

	// If no existing colors, return first from starter palette
	if (validHsls.length === 0) {
		return STARTER_PALETTE[0];
	}

	// Extract hues from existing colors
	const existingHues = validHsls.map((hsl) => hsl.h);

	// Find largest gap
	const gap = findLargestHueGap(existingHues);

	// Calculate midpoint of the gap
	let newHue: number;
	if (gap.end < gap.start) {
		// Gap wraps around 360
		newHue = normalizeHue(gap.start + gap.size / 2);
	} else {
		newHue = gap.start + gap.size / 2;
	}

	// Calculate saturation and lightness (use middle of range)
	const saturation = (opts.minSaturation + opts.maxSaturation) / 2;
	const lightness = (opts.minLightness + opts.maxLightness) / 2;

	return hslToHex({
		h: Math.round(normalizeHue(newHue)),
		s: Math.round(saturation),
		l: Math.round(lightness)
	});
}

/**
 * Get a color from the starter palette that's most distinct from existing colors
 *
 * @param existingColors - Array of existing hex color strings
 * @returns Hex color string from STARTER_PALETTE
 */
export function getDistinctStarterColor(existingColors: string[]): string {
	if (existingColors.length === 0) {
		return STARTER_PALETTE[0];
	}

	// Convert existing colors to HSL
	const existingHsls = existingColors
		.map((c) => hexToHsl(c))
		.filter((hsl): hsl is HSLColor => hsl !== null);

	if (existingHsls.length === 0) {
		return STARTER_PALETTE[0];
	}

	// Find the starter color with maximum minimum distance from existing colors
	let bestColor = STARTER_PALETTE[0];
	let bestMinDistance = -1;

	for (const paletteColor of STARTER_PALETTE) {
		// Skip if this color is already in use
		if (existingColors.some((c) => c.toLowerCase() === paletteColor.toLowerCase())) {
			continue;
		}

		const paletteHsl = hexToHsl(paletteColor);
		if (!paletteHsl) continue;

		// Find minimum distance to any existing color
		let minDistance = Infinity;
		for (const existingHsl of existingHsls) {
			const distance = hueDistance(paletteHsl.h, existingHsl.h);
			minDistance = Math.min(minDistance, distance);
		}

		// Update best if this color has larger minimum distance
		if (minDistance > bestMinDistance) {
			bestMinDistance = minDistance;
			bestColor = paletteColor;
		}
	}

	return bestColor;
}
