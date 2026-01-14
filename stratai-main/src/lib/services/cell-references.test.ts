/**
 * Cell Reference Utilities Tests
 *
 * Tests for A1-style cell reference parsing and manipulation.
 */

import { describe, it, expect } from 'vitest';
import {
	columnIndexToLetter,
	columnLetterToIndex,
	parseCellRef,
	buildCellRef,
	parseRangeRef,
	expandRange,
	isCellRef,
	isRangeRef,
	extractCellRefs,
	extractRangeRefs,
	shiftReferences
} from './cell-references';

describe('columnIndexToLetter', () => {
	it('converts single-letter columns', () => {
		expect(columnIndexToLetter(0)).toBe('A');
		expect(columnIndexToLetter(1)).toBe('B');
		expect(columnIndexToLetter(25)).toBe('Z');
	});

	it('converts double-letter columns', () => {
		expect(columnIndexToLetter(26)).toBe('AA');
		expect(columnIndexToLetter(27)).toBe('AB');
		expect(columnIndexToLetter(51)).toBe('AZ');
		expect(columnIndexToLetter(52)).toBe('BA');
	});

	it('converts triple-letter columns', () => {
		expect(columnIndexToLetter(702)).toBe('AAA');
	});

	it('handles edge cases', () => {
		expect(columnIndexToLetter(-1)).toBe('');
	});
});

describe('columnLetterToIndex', () => {
	it('converts single-letter columns', () => {
		expect(columnLetterToIndex('A')).toBe(0);
		expect(columnLetterToIndex('B')).toBe(1);
		expect(columnLetterToIndex('Z')).toBe(25);
	});

	it('converts double-letter columns', () => {
		expect(columnLetterToIndex('AA')).toBe(26);
		expect(columnLetterToIndex('AB')).toBe(27);
		expect(columnLetterToIndex('AZ')).toBe(51);
		expect(columnLetterToIndex('BA')).toBe(52);
	});

	it('is case-insensitive', () => {
		expect(columnLetterToIndex('a')).toBe(0);
		expect(columnLetterToIndex('aa')).toBe(26);
	});

	it('handles invalid input', () => {
		expect(columnLetterToIndex('')).toBe(-1);
		expect(columnLetterToIndex('1')).toBe(-1);
		expect(columnLetterToIndex('A1')).toBe(-1);
	});
});

describe('parseCellRef', () => {
	it('parses simple cell references', () => {
		expect(parseCellRef('A1')).toEqual({ col: 0, row: 0 });
		expect(parseCellRef('B3')).toEqual({ col: 1, row: 2 });
		expect(parseCellRef('Z10')).toEqual({ col: 25, row: 9 });
	});

	it('parses multi-letter columns', () => {
		expect(parseCellRef('AA1')).toEqual({ col: 26, row: 0 });
		expect(parseCellRef('AB10')).toEqual({ col: 27, row: 9 });
	});

	it('is case-insensitive', () => {
		expect(parseCellRef('a1')).toEqual({ col: 0, row: 0 });
		expect(parseCellRef('b3')).toEqual({ col: 1, row: 2 });
	});

	it('returns null for invalid references', () => {
		expect(parseCellRef('')).toBeNull();
		expect(parseCellRef('A')).toBeNull();
		expect(parseCellRef('1')).toBeNull();
		expect(parseCellRef('A0')).toBeNull(); // Row 0 is invalid
		expect(parseCellRef('1A')).toBeNull();
		expect(parseCellRef('A-1')).toBeNull();
	});
});

describe('buildCellRef', () => {
	it('builds simple cell references', () => {
		expect(buildCellRef(0, 0)).toBe('A1');
		expect(buildCellRef(1, 2)).toBe('B3');
		expect(buildCellRef(25, 9)).toBe('Z10');
	});

	it('builds multi-letter column references', () => {
		expect(buildCellRef(26, 0)).toBe('AA1');
		expect(buildCellRef(27, 9)).toBe('AB10');
	});

	it('handles invalid inputs', () => {
		expect(buildCellRef(-1, 0)).toBe('');
		expect(buildCellRef(0, -1)).toBe('');
	});
});

describe('parseRangeRef', () => {
	it('parses simple ranges', () => {
		expect(parseRangeRef('A1:A5')).toEqual({
			start: { col: 0, row: 0 },
			end: { col: 0, row: 4 }
		});
		expect(parseRangeRef('B2:D4')).toEqual({
			start: { col: 1, row: 1 },
			end: { col: 3, row: 3 }
		});
	});

	it('normalizes reversed ranges', () => {
		// End before start should be normalized
		expect(parseRangeRef('A5:A1')).toEqual({
			start: { col: 0, row: 0 },
			end: { col: 0, row: 4 }
		});
		expect(parseRangeRef('D4:B2')).toEqual({
			start: { col: 1, row: 1 },
			end: { col: 3, row: 3 }
		});
	});

	it('is case-insensitive', () => {
		expect(parseRangeRef('a1:a5')).toEqual({
			start: { col: 0, row: 0 },
			end: { col: 0, row: 4 }
		});
	});

	it('returns null for invalid ranges', () => {
		expect(parseRangeRef('')).toBeNull();
		expect(parseRangeRef('A1')).toBeNull();
		expect(parseRangeRef('A1:B')).toBeNull();
		expect(parseRangeRef('A1:B:C')).toBeNull();
	});
});

describe('expandRange', () => {
	it('expands single-column range', () => {
		expect(expandRange('A1:A3')).toEqual(['A1', 'A2', 'A3']);
	});

	it('expands single-row range', () => {
		expect(expandRange('A1:C1')).toEqual(['A1', 'B1', 'C1']);
	});

	it('expands rectangular range', () => {
		const result = expandRange('A1:B2');
		expect(result).toEqual(['A1', 'B1', 'A2', 'B2']);
	});

	it('handles single cell range', () => {
		expect(expandRange('B2:B2')).toEqual(['B2']);
	});

	it('returns empty array for invalid range', () => {
		expect(expandRange('')).toEqual([]);
		expect(expandRange('invalid')).toEqual([]);
	});
});

describe('isCellRef', () => {
	it('identifies valid cell references', () => {
		expect(isCellRef('A1')).toBe(true);
		expect(isCellRef('B23')).toBe(true);
		expect(isCellRef('AA100')).toBe(true);
		expect(isCellRef('z1')).toBe(true);
	});

	it('rejects invalid strings', () => {
		expect(isCellRef('')).toBe(false);
		expect(isCellRef('A')).toBe(false);
		expect(isCellRef('1')).toBe(false);
		expect(isCellRef('SUM')).toBe(false);
		expect(isCellRef('A1:B2')).toBe(false);
	});
});

describe('isRangeRef', () => {
	it('identifies valid range references', () => {
		expect(isRangeRef('A1:A5')).toBe(true);
		expect(isRangeRef('B2:D10')).toBe(true);
		expect(isRangeRef('aa1:zz100')).toBe(true);
	});

	it('rejects invalid strings', () => {
		expect(isRangeRef('')).toBe(false);
		expect(isRangeRef('A1')).toBe(false);
		expect(isRangeRef('A1:')).toBe(false);
		expect(isRangeRef(':A5')).toBe(false);
	});
});

describe('extractCellRefs', () => {
	it('extracts cell references from formulas', () => {
		expect(extractCellRefs('=B1*C2')).toEqual(['B1', 'C2']);
		expect(extractCellRefs('=A1+B1-C1')).toEqual(['A1', 'B1', 'C1']);
	});

	it('handles formulas with ranges (extracts individual refs)', () => {
		// Note: A1:A5 contains A1 and A5 as cell refs
		const result = extractCellRefs('=SUM(A1:A5)+B1');
		expect(result).toContain('A1');
		expect(result).toContain('A5');
		expect(result).toContain('B1');
	});

	it('removes duplicates', () => {
		expect(extractCellRefs('=A1+A1+A1')).toEqual(['A1']);
	});

	it('handles empty or invalid input', () => {
		expect(extractCellRefs('')).toEqual([]);
		expect(extractCellRefs('=2+2')).toEqual([]);
	});

	it('is case-insensitive but returns uppercase', () => {
		expect(extractCellRefs('=b1*c2')).toEqual(['B1', 'C2']);
	});
});

describe('extractRangeRefs', () => {
	it('extracts range references from formulas', () => {
		expect(extractRangeRefs('=SUM(A1:A5)')).toEqual(['A1:A5']);
		expect(extractRangeRefs('=SUM(A1:A5)+AVG(B1:B10)')).toEqual(['A1:A5', 'B1:B10']);
	});

	it('removes duplicates', () => {
		expect(extractRangeRefs('=SUM(A1:A5)+SUM(A1:A5)')).toEqual(['A1:A5']);
	});

	it('handles formulas without ranges', () => {
		expect(extractRangeRefs('=B1*C2')).toEqual([]);
		expect(extractRangeRefs('=2+2')).toEqual([]);
	});

	it('is case-insensitive but returns uppercase', () => {
		expect(extractRangeRefs('=sum(a1:a5)')).toEqual(['A1:A5']);
	});
});

describe('shiftReferences', () => {
	it('shifts all row references when afterRow is -1', () => {
		expect(shiftReferences('=A1+B1', 0, 1, -1, -1)).toBe('=A2+B2');
		expect(shiftReferences('=A2+B2', 0, -1, -1, -1)).toBe('=A1+B1');
	});

	it('shifts all column references when afterCol is -1', () => {
		expect(shiftReferences('=A1+B1', 1, 0, -1, -1)).toBe('=B1+C1');
		expect(shiftReferences('=B1+C1', -1, 0, -1, -1)).toBe('=A1+B1');
	});

	it('only shifts references after specified position', () => {
		// Insert column after A (afterCol=0): A stays, B becomes C
		expect(shiftReferences('=A1+B1', 1, 0, 0, -1)).toBe('=A1+C1');

		// Insert row after row 1 (afterRow=0): row 1 (A1) stays, row 2 (A2) becomes row 3 (A3)
		expect(shiftReferences('=A1+A2', 0, 1, -1, 0)).toBe('=A1+A3');
	});

	it('returns #REF! for invalid shifts', () => {
		// Deleting column A when formula references A
		expect(shiftReferences('=A1', -1, 0, -1, -1)).toBe('=#REF!');
	});

	it('handles complex formulas', () => {
		const formula = '=B2*C2+SUM(A1:A5)';
		// Shift all rows down by 1
		const shifted = shiftReferences(formula, 0, 1, -1, -1);
		expect(shifted).toBe('=B3*C3+SUM(A2:A6)');
	});

	it('preserves formulas with no references', () => {
		expect(shiftReferences('=2+2', 1, 1, -1, -1)).toBe('=2+2');
	});
});

describe('roundtrip conversions', () => {
	it('column letter <-> index roundtrip', () => {
		for (let i = 0; i < 100; i++) {
			const letter = columnIndexToLetter(i);
			const index = columnLetterToIndex(letter);
			expect(index).toBe(i);
		}
	});

	it('cell ref parse <-> build roundtrip', () => {
		const refs = ['A1', 'B3', 'Z10', 'AA1', 'AB99', 'ZZ100'];
		for (const ref of refs) {
			const parsed = parseCellRef(ref);
			expect(parsed).not.toBeNull();
			const built = buildCellRef(parsed!.col, parsed!.row);
			expect(built).toBe(ref);
		}
	});
});
