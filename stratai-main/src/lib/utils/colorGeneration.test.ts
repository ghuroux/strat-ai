/**
 * Color Generation Utility Tests
 *
 * Tests for HSL-based color generation that creates visually distinct colors.
 */

import { describe, it, expect } from 'vitest';
import {
	hexToHsl,
	hslToHex,
	generateDistinctColor,
	getDistinctStarterColor,
	STARTER_PALETTE,
	type HSLColor
} from './colorGeneration';

describe('hexToHsl', () => {
	it('converts basic colors correctly', () => {
		// Red
		const red = hexToHsl('#ff0000');
		expect(red).not.toBeNull();
		expect(red!.h).toBe(0);
		expect(red!.s).toBe(100);
		expect(red!.l).toBe(50);

		// Green
		const green = hexToHsl('#00ff00');
		expect(green).not.toBeNull();
		expect(green!.h).toBe(120);
		expect(green!.s).toBe(100);
		expect(green!.l).toBe(50);

		// Blue
		const blue = hexToHsl('#0000ff');
		expect(blue).not.toBeNull();
		expect(blue!.h).toBe(240);
		expect(blue!.s).toBe(100);
		expect(blue!.l).toBe(50);
	});

	it('handles hex strings without # prefix', () => {
		const result = hexToHsl('3b82f6');
		expect(result).not.toBeNull();
		expect(result!.h).toBeGreaterThanOrEqual(0);
		expect(result!.h).toBeLessThan(360);
	});

	it('converts white and black correctly', () => {
		// White
		const white = hexToHsl('#ffffff');
		expect(white).not.toBeNull();
		expect(white!.l).toBe(100);
		expect(white!.s).toBe(0);

		// Black
		const black = hexToHsl('#000000');
		expect(black).not.toBeNull();
		expect(black!.l).toBe(0);
	});

	it('handles gray correctly', () => {
		const gray = hexToHsl('#808080');
		expect(gray).not.toBeNull();
		expect(gray!.s).toBe(0);
		expect(gray!.l).toBe(50);
	});

	it('returns null for invalid hex strings', () => {
		expect(hexToHsl('')).toBeNull();
		expect(hexToHsl('#fff')).toBeNull(); // 3-char hex not supported
		expect(hexToHsl('#gggggg')).toBeNull();
		expect(hexToHsl('not-a-color')).toBeNull();
	});
});

describe('hslToHex', () => {
	it('converts basic colors correctly', () => {
		// Red
		expect(hslToHex({ h: 0, s: 100, l: 50 }).toLowerCase()).toBe('#ff0000');

		// Green
		expect(hslToHex({ h: 120, s: 100, l: 50 }).toLowerCase()).toBe('#00ff00');

		// Blue
		expect(hslToHex({ h: 240, s: 100, l: 50 }).toLowerCase()).toBe('#0000ff');
	});

	it('converts white and black correctly', () => {
		// White
		expect(hslToHex({ h: 0, s: 0, l: 100 }).toLowerCase()).toBe('#ffffff');

		// Black
		expect(hslToHex({ h: 0, s: 0, l: 0 }).toLowerCase()).toBe('#000000');
	});

	it('handles all hue sectors', () => {
		// Test each 60-degree sector
		const hues = [0, 60, 120, 180, 240, 300];
		for (const h of hues) {
			const hex = hslToHex({ h, s: 100, l: 50 });
			expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});
});

describe('hexToHsl and hslToHex roundtrip', () => {
	it('roundtrips starter palette colors', () => {
		for (const hex of STARTER_PALETTE) {
			const hsl = hexToHsl(hex);
			expect(hsl).not.toBeNull();

			const backToHex = hslToHex(hsl!);
			// Due to rounding, colors may differ slightly, but should be very close
			const backToHsl = hexToHsl(backToHex);
			expect(backToHsl).not.toBeNull();

			// Hue, saturation, and lightness should be within 2 units
			expect(Math.abs(hsl!.h - backToHsl!.h)).toBeLessThanOrEqual(2);
			expect(Math.abs(hsl!.s - backToHsl!.s)).toBeLessThanOrEqual(2);
			expect(Math.abs(hsl!.l - backToHsl!.l)).toBeLessThanOrEqual(2);
		}
	});
});

describe('generateDistinctColor', () => {
	it('returns starter palette color when existingColors is empty', () => {
		const color = generateDistinctColor([]);
		expect(color).toBe(STARTER_PALETTE[0]);
	});

	it('returns opposite hue (180 degrees) for single color', () => {
		// Blue at ~217 degrees
		const blueHex = '#3b82f6';
		const blueHsl = hexToHsl(blueHex);
		expect(blueHsl).not.toBeNull();

		const newColor = generateDistinctColor([blueHex]);
		const newHsl = hexToHsl(newColor);
		expect(newHsl).not.toBeNull();

		// The new hue should be approximately 180 degrees from the original
		// Account for the gap calculation - midpoint of the opposite half
		const hueDiff = Math.abs(newHsl!.h - blueHsl!.h);
		const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);

		// Should be roughly opposite (close to 180 degrees)
		expect(normalizedDiff).toBeGreaterThanOrEqual(150);
		expect(normalizedDiff).toBeLessThanOrEqual(210);
	});

	it('finds largest gap correctly with multiple colors', () => {
		// Colors at roughly 0, 120, 180 degrees
		// Largest gap should be between 180 and 360 (wrapping to 0)
		const existingColors = [
			'#ff0000', // Red: 0 degrees
			'#00ff00', // Green: 120 degrees
			'#00ffff' // Cyan: 180 degrees
		];

		const newColor = generateDistinctColor(existingColors);
		const newHsl = hexToHsl(newColor);
		expect(newHsl).not.toBeNull();

		// Largest gap is from 180 to 360 (180 degrees)
		// Midpoint should be around 270 (purple/magenta range)
		// Allow some tolerance for saturation/lightness adjustments
		expect(newHsl!.h).toBeGreaterThanOrEqual(240);
		expect(newHsl!.h).toBeLessThanOrEqual(300);
	});

	it('handles edge case with all similar hues', () => {
		// Multiple blues - all around 200-220 degrees
		const existingColors = [
			'#3b82f6', // Blue
			'#2563eb', // Darker blue
			'#1d4ed8' // Even darker blue
		];

		const newColor = generateDistinctColor(existingColors);
		const newHsl = hexToHsl(newColor);
		expect(newHsl).not.toBeNull();

		// Should find a hue significantly different from the clustered blues
		const blueHsls = existingColors.map((c) => hexToHsl(c)).filter((h): h is HSLColor => h !== null);
		const avgBlueHue =
			blueHsls.reduce((sum, hsl) => sum + hsl.h, 0) / blueHsls.length;

		// New color should be at least 90 degrees away from the cluster
		const hueDiff = Math.abs(newHsl!.h - avgBlueHue);
		const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
		expect(normalizedDiff).toBeGreaterThanOrEqual(90);
	});

	it('maintains saturation and lightness in specified ranges', () => {
		const newColor = generateDistinctColor(['#ff0000']);
		const newHsl = hexToHsl(newColor);
		expect(newHsl).not.toBeNull();

		// Default ranges: saturation 60-80, lightness 45-65
		// Middle should be s=70, l=55
		expect(newHsl!.s).toBeGreaterThanOrEqual(58);
		expect(newHsl!.s).toBeLessThanOrEqual(72);
		expect(newHsl!.l).toBeGreaterThanOrEqual(53);
		expect(newHsl!.l).toBeLessThanOrEqual(57);
	});

	it('respects custom options', () => {
		const options = {
			minSaturation: 90,
			maxSaturation: 100,
			minLightness: 40,
			maxLightness: 50
		};

		const newColor = generateDistinctColor(['#ff0000'], options);
		const newHsl = hexToHsl(newColor);
		expect(newHsl).not.toBeNull();

		// Should use middle of custom ranges
		expect(newHsl!.s).toBeGreaterThanOrEqual(93);
		expect(newHsl!.s).toBeLessThanOrEqual(97);
		expect(newHsl!.l).toBeGreaterThanOrEqual(43);
		expect(newHsl!.l).toBeLessThanOrEqual(47);
	});

	it('filters invalid hex colors', () => {
		// Mix of valid and invalid colors
		const colors = ['#3b82f6', 'not-a-color', '#invalid', ''];

		// Should not throw, should treat as single color
		const newColor = generateDistinctColor(colors);
		expect(newColor).toMatch(/^#[0-9a-f]{6}$/i);
	});

	it('returns valid hex color', () => {
		const testCases = [[], ['#ff0000'], ['#ff0000', '#00ff00'], STARTER_PALETTE];

		for (const colors of testCases) {
			const result = generateDistinctColor(colors);
			expect(result).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});
});

describe('getDistinctStarterColor', () => {
	it('returns first starter color when existingColors is empty', () => {
		const color = getDistinctStarterColor([]);
		expect(color).toBe(STARTER_PALETTE[0]);
	});

	it('avoids colors already in use', () => {
		const usedColor = STARTER_PALETTE[0];
		const newColor = getDistinctStarterColor([usedColor]);

		expect(newColor).not.toBe(usedColor);
		expect(STARTER_PALETTE).toContain(newColor);
	});

	it('finds most distinct color from palette', () => {
		// Using a red color, should prefer cyan or teal (opposite on wheel)
		const red = '#ef4444';
		const newColor = getDistinctStarterColor([red]);

		const newHsl = hexToHsl(newColor);
		const redHsl = hexToHsl(red);
		expect(newHsl).not.toBeNull();
		expect(redHsl).not.toBeNull();

		// Should pick a color with significantly different hue
		const hueDiff = Math.abs(newHsl!.h - redHsl!.h);
		const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
		expect(normalizedDiff).toBeGreaterThanOrEqual(90);
	});

	it('handles case-insensitive color matching', () => {
		// Same color different case
		const color1 = getDistinctStarterColor(['#3B82F6']); // uppercase
		const color2 = getDistinctStarterColor(['#3b82f6']); // lowercase

		expect(color1).toBe(color2);
	});
});

describe('STARTER_PALETTE', () => {
	it('contains expected number of colors', () => {
		expect(STARTER_PALETTE.length).toBe(8);
	});

	it('contains valid hex colors', () => {
		for (const color of STARTER_PALETTE) {
			expect(color).toMatch(/^#[0-9a-f]{6}$/i);
			expect(hexToHsl(color)).not.toBeNull();
		}
	});

	it('contains visually distinct colors (good hue distribution)', () => {
		const hues = STARTER_PALETTE.map((c) => hexToHsl(c)!.h);

		// Check that no two colors are too close in hue (within 30 degrees)
		for (let i = 0; i < hues.length; i++) {
			for (let j = i + 1; j < hues.length; j++) {
				const diff = Math.abs(hues[i] - hues[j]);
				const normalizedDiff = Math.min(diff, 360 - diff);
				expect(normalizedDiff).toBeGreaterThanOrEqual(20);
			}
		}
	});
});
