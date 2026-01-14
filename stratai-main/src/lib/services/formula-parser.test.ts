/**
 * Formula Parser Tests
 *
 * Tests for A1-style formula parsing.
 * Run with: npx vitest run formula-parser
 */

import { describe, it, expect } from 'vitest';
import {
	parseFormula,
	getDisplayFormula,
	hasCircularReference,
	validateFormula,
	formatResult
} from './formula-parser';

describe('parseFormula', () => {
	describe('cell references', () => {
		it('parses simple cell reference', () => {
			const result = parseFormula('=A1');
			expect(result.isValid).toBe(true);
			expect(result.type).toBe('expression');
			expect(result.cellRefs).toEqual(['A1']);
			expect(result.tokens).toHaveLength(1);
			expect(result.tokens[0].type).toBe('cell_ref');
			expect(result.tokens[0].col).toBe(0);
			expect(result.tokens[0].row).toBe(0);
		});

		it('parses multi-letter column reference', () => {
			const result = parseFormula('=AA10');
			expect(result.isValid).toBe(true);
			expect(result.cellRefs).toEqual(['AA10']);
			expect(result.tokens[0].col).toBe(26);
			expect(result.tokens[0].row).toBe(9);
		});

		it('parses multiple cell references', () => {
			const result = parseFormula('=B1*C2');
			expect(result.isValid).toBe(true);
			expect(result.cellRefs).toEqual(['B1', 'C2']);
			expect(result.tokens).toHaveLength(3);
		});

		it('is case-insensitive', () => {
			const result = parseFormula('=b1*c2');
			expect(result.isValid).toBe(true);
			expect(result.cellRefs).toEqual(['B1', 'C2']);
		});
	});

	describe('range references', () => {
		it('parses simple range', () => {
			const result = parseFormula('=SUM(A1:A5)');
			expect(result.isValid).toBe(true);
			expect(result.rangeRefs).toEqual(['A1:A5']);
		});

		it('parses rectangular range', () => {
			const result = parseFormula('=SUM(B2:D4)');
			expect(result.isValid).toBe(true);
			expect(result.rangeRefs).toEqual(['B2:D4']);
			// Check the range token
			const rangeToken = result.tokens.find((t) => t.type === 'range_ref');
			expect(rangeToken).toBeDefined();
			expect(rangeToken?.startCol).toBe(1);
			expect(rangeToken?.startRow).toBe(1);
			expect(rangeToken?.endCol).toBe(3);
			expect(rangeToken?.endRow).toBe(3);
		});

		it('normalizes reversed ranges', () => {
			const result = parseFormula('=SUM(A5:A1)');
			expect(result.isValid).toBe(true);
			const rangeToken = result.tokens.find((t) => t.type === 'range_ref');
			// Should be normalized so start <= end
			expect(rangeToken?.startRow).toBeLessThanOrEqual(rangeToken?.endRow ?? -1);
		});
	});

	describe('functions', () => {
		it('parses SUM function', () => {
			const result = parseFormula('=SUM(A1:A5)');
			expect(result.isValid).toBe(true);
			expect(result.type).toBe('function');
			expect(result.tokens.some((t) => t.type === 'function' && t.value === 'SUM')).toBe(true);
		});

		it('parses AVG function', () => {
			const result = parseFormula('=AVG(B1:B10)');
			expect(result.isValid).toBe(true);
			expect(result.type).toBe('function');
		});

		it('parses COUNT function', () => {
			const result = parseFormula('=COUNT(A1:A100)');
			expect(result.isValid).toBe(true);
			expect(result.type).toBe('function');
		});

		it('parses MIN function', () => {
			const result = parseFormula('=MIN(C1:C5)');
			expect(result.isValid).toBe(true);
			expect(result.type).toBe('function');
		});

		it('parses MAX function', () => {
			const result = parseFormula('=MAX(D1:D5)');
			expect(result.isValid).toBe(true);
			expect(result.type).toBe('function');
		});

		it('is case-insensitive for functions', () => {
			const result = parseFormula('=sum(A1:A5)');
			expect(result.isValid).toBe(true);
			expect(result.type).toBe('function');
		});
	});

	describe('constants', () => {
		it('parses pure math expression', () => {
			const result = parseFormula('=2+2');
			expect(result.isValid).toBe(true);
			expect(result.type).toBe('constant');
			expect(result.cellRefs).toEqual([]);
		});

		it('parses decimal numbers', () => {
			const result = parseFormula('=100*0.15');
			expect(result.isValid).toBe(true);
			expect(result.tokens.some((t) => t.type === 'number' && t.value === 0.15)).toBe(true);
		});
	});

	describe('operators', () => {
		it('parses addition', () => {
			const result = parseFormula('=A1+B1');
			expect(result.isValid).toBe(true);
			expect(result.tokens.some((t) => t.type === 'operator' && t.value === '+')).toBe(true);
		});

		it('parses subtraction', () => {
			const result = parseFormula('=A1-B1');
			expect(result.isValid).toBe(true);
			expect(result.tokens.some((t) => t.type === 'operator' && t.value === '-')).toBe(true);
		});

		it('parses multiplication', () => {
			const result = parseFormula('=A1*B1');
			expect(result.isValid).toBe(true);
			expect(result.tokens.some((t) => t.type === 'operator' && t.value === '*')).toBe(true);
		});

		it('parses division', () => {
			const result = parseFormula('=A1/B1');
			expect(result.isValid).toBe(true);
			expect(result.tokens.some((t) => t.type === 'operator' && t.value === '/')).toBe(true);
		});
	});

	describe('parentheses', () => {
		it('parses grouped expressions', () => {
			const result = parseFormula('=(A1+B1)*C1');
			expect(result.isValid).toBe(true);
			expect(result.tokens.filter((t) => t.type === 'lparen')).toHaveLength(1);
			expect(result.tokens.filter((t) => t.type === 'rparen')).toHaveLength(1);
		});

		it('parses nested parentheses', () => {
			const result = parseFormula('=((A1+B1)*C1)/D1');
			expect(result.isValid).toBe(true);
			expect(result.tokens.filter((t) => t.type === 'lparen')).toHaveLength(2);
			expect(result.tokens.filter((t) => t.type === 'rparen')).toHaveLength(2);
		});

		it('rejects unmatched opening parenthesis', () => {
			const result = parseFormula('=(A1+B1');
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('parenthesis');
		});

		it('rejects unmatched closing parenthesis', () => {
			const result = parseFormula('=A1+B1)');
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('parenthesis');
		});
	});

	describe('complex formulas', () => {
		it('parses cross-row references', () => {
			const result = parseFormula('=B1+C2');
			expect(result.isValid).toBe(true);
			expect(result.cellRefs).toEqual(['B1', 'C2']);
		});

		it('parses mixed cell refs and constants', () => {
			const result = parseFormula('=B2*0.15');
			expect(result.isValid).toBe(true);
			expect(result.cellRefs).toEqual(['B2']);
			expect(result.tokens.some((t) => t.type === 'number')).toBe(true);
		});

		it('parses formula with function and additional ops', () => {
			const result = parseFormula('=SUM(A1:A5)+B1');
			expect(result.isValid).toBe(true);
			expect(result.type).toBe('function');
			expect(result.rangeRefs).toEqual(['A1:A5']);
			expect(result.cellRefs).toContain('B1');
		});
	});

	describe('error handling', () => {
		it('rejects empty formula', () => {
			expect(parseFormula('').isValid).toBe(false);
			expect(parseFormula('=').isValid).toBe(false);
			expect(parseFormula('= ').isValid).toBe(false);
		});

		it('rejects formula without leading =', () => {
			const result = parseFormula('A1+B1');
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('must start with =');
		});

		it('rejects unknown characters', () => {
			const result = parseFormula('=A1@B1');
			expect(result.isValid).toBe(false);
			expect(result.error).toContain('Unexpected character');
		});
	});
});

describe('getDisplayFormula', () => {
	it('converts multiplication to ×', () => {
		expect(getDisplayFormula('=B1*C2')).toBe('B1 × C2');
	});

	it('converts division to ÷', () => {
		expect(getDisplayFormula('=A1/B1')).toBe('A1 ÷ B1');
	});

	it('handles complex formulas', () => {
		expect(getDisplayFormula('=B1*C2+D3/E4')).toBe('B1 × C2+D3 ÷ E4');
	});

	it('returns non-formulas unchanged', () => {
		expect(getDisplayFormula('SUM')).toBe('SUM');
		expect(getDisplayFormula('')).toBe('');
	});
});

describe('hasCircularReference', () => {
	it('detects self-reference', () => {
		expect(hasCircularReference('=A1+B1', { col: 0, row: 0 })).toBe(true); // A1 refs itself
		expect(hasCircularReference('=B2+C2', { col: 1, row: 1 })).toBe(true); // B2 refs itself
	});

	it('allows references to other cells', () => {
		expect(hasCircularReference('=A1+B1', { col: 2, row: 0 })).toBe(false); // C1 refs A1 and B1
		expect(hasCircularReference('=B2*C2', { col: 3, row: 1 })).toBe(false); // D2 refs B2 and C2
	});

	it('handles invalid formulas', () => {
		expect(hasCircularReference('invalid', { col: 0, row: 0 })).toBe(false);
	});
});

describe('validateFormula', () => {
	it('validates correct formulas', () => {
		expect(validateFormula('=B2*C2', { col: 3, row: 1 }, { cols: 5, rows: 5 })).toBeNull();
	});

	it('rejects circular references', () => {
		const error = validateFormula('=A1+B1', { col: 0, row: 0 }, { cols: 5, rows: 5 });
		expect(error).toContain('own cell');
	});

	it('rejects out-of-range columns', () => {
		const error = validateFormula('=Z1', { col: 0, row: 0 }, { cols: 5, rows: 5 });
		expect(error).toContain('outside the table');
	});

	it('rejects out-of-range rows', () => {
		const error = validateFormula('=A100', { col: 0, row: 0 }, { cols: 5, rows: 5 });
		expect(error).toContain('outside the table');
	});

	it('rejects invalid syntax', () => {
		const error = validateFormula('invalid', { col: 0, row: 0 }, { cols: 5, rows: 5 });
		expect(error).not.toBeNull();
	});
});

describe('formatResult', () => {
	it('formats positive numbers', () => {
		expect(formatResult(1500)).toBe('1,500.00');
		expect(formatResult(42)).toBe('42.00');
	});

	it('formats decimal numbers', () => {
		expect(formatResult(3.14159)).toBe('3.14');
		expect(formatResult(0.5)).toBe('0.50');
	});

	it('formats null as em dash', () => {
		expect(formatResult(null)).toBe('—');
	});

	it('formats Infinity as Error', () => {
		expect(formatResult(Infinity)).toBe('Error');
		expect(formatResult(-Infinity)).toBe('Error');
	});

	it('formats NaN as Error', () => {
		expect(formatResult(NaN)).toBe('Error');
	});

	it('formats large numbers with commas', () => {
		expect(formatResult(1000000)).toBe('1,000,000.00');
	});

	it('formats negative numbers', () => {
		expect(formatResult(-500)).toBe('-500.00');
	});
});
