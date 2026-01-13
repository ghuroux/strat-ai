/**
 * Formula Parser Tests
 *
 * Run with: npx vitest run formula-parser
 */

import { describe, it, expect } from 'vitest';
import {
	parseFormula,
	evaluateFormula,
	getDisplayFormula,
	hasCircularReference,
	validateFormula,
	formatResult
} from './formula-parser';

describe('parseFormula', () => {
	it('parses simple column reference', () => {
		const result = parseFormula('=[1]');
		expect(result.isValid).toBe(true);
		expect(result.type).toBe('row');
		expect(result.referencedColumns).toEqual([1]);
		expect(result.tokens).toHaveLength(1);
		expect(result.tokens[0].type).toBe('column_ref');
	});

	it('parses multiplication formula', () => {
		const result = parseFormula('=[1]*[2]');
		expect(result.isValid).toBe(true);
		expect(result.referencedColumns).toEqual([1, 2]);
		expect(result.tokens).toHaveLength(3);
	});

	it('parses formula with numbers', () => {
		const result = parseFormula('=[2]*0.15');
		expect(result.isValid).toBe(true);
		expect(result.tokens).toHaveLength(3);
		expect(result.tokens[2].type).toBe('number');
		expect(result.tokens[2].value).toBe(0.15);
	});

	it('parses complex formula with parentheses', () => {
		const result = parseFormula('=([1]+[2])*[3]');
		expect(result.isValid).toBe(true);
		expect(result.referencedColumns).toEqual([1, 2, 3]);
	});

	it('recognizes column formulas', () => {
		expect(parseFormula('SUM').type).toBe('column');
		expect(parseFormula('AVG').type).toBe('column');
		expect(parseFormula('COUNT').type).toBe('column');
		expect(parseFormula('MIN').type).toBe('column');
		expect(parseFormula('MAX').type).toBe('column');
	});

	it('rejects formula without leading =', () => {
		const result = parseFormula('[1]*[2]');
		expect(result.isValid).toBe(false);
		expect(result.error).toContain('must start with =');
	});

	it('rejects unclosed bracket', () => {
		const result = parseFormula('=[1');
		expect(result.isValid).toBe(false);
		expect(result.error).toContain('Unclosed');
	});

	it('rejects invalid column index', () => {
		const result = parseFormula('=[abc]');
		expect(result.isValid).toBe(false);
		expect(result.error).toContain('Invalid column index');
	});

	it('rejects empty formula', () => {
		const result = parseFormula('=');
		expect(result.isValid).toBe(false);
		expect(result.error).toContain('Empty formula');
	});
});

describe('evaluateFormula', () => {
	it('evaluates simple multiplication', () => {
		const parsed = parseFormula('=[1]*[2]');
		const result = evaluateFormula(parsed, [null, 5, 10]);
		expect(result).toBe(50);
	});

	it('evaluates addition', () => {
		const parsed = parseFormula('=[0]+[1]+[2]');
		const result = evaluateFormula(parsed, [10, 20, 30]);
		expect(result).toBe(60);
	});

	it('evaluates with constants', () => {
		const parsed = parseFormula('=[1]*0.15');
		const result = evaluateFormula(parsed, [null, 100]);
		expect(result).toBe(15);
	});

	it('respects operator precedence', () => {
		const parsed = parseFormula('=[0]+[1]*[2]');
		const result = evaluateFormula(parsed, [5, 3, 4]); // 5 + (3*4) = 17
		expect(result).toBe(17);
	});

	it('handles parentheses', () => {
		const parsed = parseFormula('=([0]+[1])*[2]');
		const result = evaluateFormula(parsed, [5, 3, 4]); // (5+3)*4 = 32
		expect(result).toBe(32);
	});

	it('returns null for division by zero', () => {
		const parsed = parseFormula('=[0]/[1]');
		const result = evaluateFormula(parsed, [10, 0]);
		expect(result).toBe(null);
	});

	it('returns null for missing column value', () => {
		const parsed = parseFormula('=[0]*[1]');
		const result = evaluateFormula(parsed, [10, null]);
		expect(result).toBe(null);
	});

	it('handles subtraction', () => {
		const parsed = parseFormula('=[0]-[1]');
		const result = evaluateFormula(parsed, [100, 25]);
		expect(result).toBe(75);
	});

	it('handles unary minus', () => {
		const parsed = parseFormula('=-[0]');
		const result = evaluateFormula(parsed, [50]);
		expect(result).toBe(-50);
	});
});

describe('getDisplayFormula', () => {
	it('converts indices to column names', () => {
		const headers = ['Item', 'Qty', 'Rate', 'Total'];
		const display = getDisplayFormula('=[1]*[2]', headers);
		expect(display).toBe('Qty × Rate');
	});

	it('handles missing column names', () => {
		const headers = ['A', 'B'];
		const display = getDisplayFormula('=[1]*[5]', headers);
		expect(display).toContain('Col 6');
	});

	it('converts division operator', () => {
		const headers = ['Total', 'Count'];
		const display = getDisplayFormula('=[0]/[1]', headers);
		expect(display).toBe('Total ÷ Count');
	});

	it('returns non-formulas unchanged', () => {
		expect(getDisplayFormula('SUM', [])).toBe('SUM');
	});
});

describe('hasCircularReference', () => {
	it('detects self-reference', () => {
		expect(hasCircularReference(1, '=[1]*[2]')).toBe(true);
		expect(hasCircularReference(2, '=[1]*[2]')).toBe(true);
	});

	it('allows non-self-referencing formulas', () => {
		expect(hasCircularReference(0, '=[1]*[2]')).toBe(false);
		expect(hasCircularReference(3, '=[1]*[2]')).toBe(false);
	});
});

describe('validateFormula', () => {
	it('validates correct formula', () => {
		expect(validateFormula('=[1]*[2]', 3, 4)).toBe(null);
	});

	it('rejects circular reference', () => {
		const error = validateFormula('=[1]*[2]', 1, 4);
		expect(error).toContain('own column');
	});

	it('rejects out-of-range column', () => {
		const error = validateFormula('=[1]*[5]', 3, 4);
		expect(error).toContain('does not exist');
	});
});

describe('formatResult', () => {
	it('formats numbers with 2 decimal places', () => {
		expect(formatResult(123.456)).toBe('123.46');
		expect(formatResult(100)).toBe('100.00');
	});

	it('handles null', () => {
		expect(formatResult(null)).toBe('—');
	});

	it('handles infinity', () => {
		expect(formatResult(Infinity)).toBe('Error');
		expect(formatResult(-Infinity)).toBe('Error');
	});
});
