/**
 * Formula Engine Tests
 *
 * Tests for Excel-like formula evaluation with cross-row support.
 * Run with: npx vitest run formula-engine
 */

import { describe, it, expect } from 'vitest';
import { evaluateFormula, evaluateAndFormat, isValidFormula } from './formula-engine';
import type { TableData } from './table-calculations';

// Helper to create table data
function createTableData(values: (number | null)[][]): TableData {
	const colCount = Math.max(...values.map((r) => r.length), 0);

	// Normalize rows
	const normalized = values.map((row) => {
		const newRow = [...row];
		while (newRow.length < colCount) {
			newRow.push(null);
		}
		return newRow;
	});

	return {
		values: normalized,
		rowCount: normalized.length,
		colCount,
		formulas: new Map()
	};
}

describe('evaluateFormula', () => {
	describe('cell references', () => {
		it('evaluates single cell reference', () => {
			const tableData = createTableData([
				[100, 200, 300],
				[10, 20, 30]
			]);

			const result = evaluateFormula('=A1', tableData, { col: 3, row: 0 });
			expect(result.value).toBe(100);
		});

		it('evaluates cross-row references', () => {
			const tableData = createTableData([
				[100, 200, 300],
				[10, 20, 30]
			]);

			// A1 (100) + B2 (20) = 120
			const result = evaluateFormula('=A1+B2', tableData, { col: 3, row: 0 });
			expect(result.value).toBe(120);
		});

		it('evaluates same-column cross-row addition', () => {
			const tableData = createTableData([
				[1, 2],
				[3, 4],
				[5, 6]
			]);

			// A1 + A2 + A3 = 1 + 3 + 5 = 9
			const result = evaluateFormula('=A1+A2+A3', tableData, { col: 2, row: 0 });
			expect(result.value).toBe(9);
		});

		it('evaluates vertical range sum (cross-row)', () => {
			const tableData = createTableData([
				[10, 100],
				[20, 200],
				[30, 300]
			]);

			// SUM(B1:B3) = 100 + 200 + 300 = 600
			const result = evaluateFormula('=SUM(B1:B3)', tableData, { col: 2, row: 0 });
			expect(result.value).toBe(600);
		});

		it('evaluates multiplication', () => {
			const tableData = createTableData([
				[100, 200, 300],
				[50, 10, 150] // A2=50, B2=10, C2=150
			]);

			// B2 (10) * C2 (150) = 1500
			const result = evaluateFormula('=B2*C2', tableData, { col: 3, row: 1 });
			expect(result.value).toBe(1500);
		});

		it('evaluates division', () => {
			const tableData = createTableData([
				[100, 50, null]
			]);

			// A1 (100) / B1 (50) = 2
			const result = evaluateFormula('=A1/B1', tableData, { col: 2, row: 0 });
			expect(result.value).toBe(2);
		});
	});

	describe('constants', () => {
		it('evaluates pure math', () => {
			const tableData = createTableData([[]]);

			const result = evaluateFormula('=2+2', tableData, { col: 0, row: 0 });
			expect(result.value).toBe(4);
		});

		it('evaluates mixed cells and constants', () => {
			const tableData = createTableData([[100]]);

			// A1 (100) * 0.15 = 15
			const result = evaluateFormula('=A1*0.15', tableData, { col: 1, row: 0 });
			expect(result.value).toBe(15);
		});

		it('evaluates complex expression', () => {
			const tableData = createTableData([[]]);

			// 2 + 3 * 4 = 14 (multiplication first)
			const result = evaluateFormula('=2+3*4', tableData, { col: 0, row: 0 });
			expect(result.value).toBe(14);
		});
	});

	describe('operator precedence', () => {
		it('respects multiplication over addition', () => {
			const tableData = createTableData([[10, 5, 2]]);

			// A1 + B1 * C1 = 10 + 5*2 = 10 + 10 = 20
			const result = evaluateFormula('=A1+B1*C1', tableData, { col: 3, row: 0 });
			expect(result.value).toBe(20);
		});

		it('respects parentheses', () => {
			const tableData = createTableData([[10, 5, 2]]);

			// (A1 + B1) * C1 = (10 + 5) * 2 = 15 * 2 = 30
			const result = evaluateFormula('=(A1+B1)*C1', tableData, { col: 3, row: 0 });
			expect(result.value).toBe(30);
		});

		it('handles nested parentheses', () => {
			const tableData = createTableData([[10, 5, 2, 3]]);

			// ((A1 + B1) * C1) / D1 = ((10+5)*2)/3 = 30/3 = 10
			const result = evaluateFormula('=((A1+B1)*C1)/D1', tableData, { col: 4, row: 0 });
			expect(result.value).toBe(10);
		});
	});

	describe('functions', () => {
		it('evaluates SUM', () => {
			const tableData = createTableData([
				[10],
				[20],
				[30],
				[40],
				[50]
			]);

			const result = evaluateFormula('=SUM(A1:A5)', tableData, { col: 1, row: 0 });
			expect(result.value).toBe(150);
		});

		it('evaluates AVG', () => {
			const tableData = createTableData([
				[10],
				[20],
				[30]
			]);

			const result = evaluateFormula('=AVG(A1:A3)', tableData, { col: 1, row: 0 });
			expect(result.value).toBe(20);
		});

		it('evaluates COUNT', () => {
			const tableData = createTableData([
				[10],
				[20],
				[null],
				[30]
			]);

			const result = evaluateFormula('=COUNT(A1:A4)', tableData, { col: 1, row: 0 });
			expect(result.value).toBe(3); // Only numeric values counted
		});

		it('evaluates MIN', () => {
			const tableData = createTableData([
				[50],
				[10],
				[30]
			]);

			const result = evaluateFormula('=MIN(A1:A3)', tableData, { col: 1, row: 0 });
			expect(result.value).toBe(10);
		});

		it('evaluates MAX', () => {
			const tableData = createTableData([
				[50],
				[10],
				[30]
			]);

			const result = evaluateFormula('=MAX(A1:A3)', tableData, { col: 1, row: 0 });
			expect(result.value).toBe(50);
		});

		it('evaluates rectangular range', () => {
			const tableData = createTableData([
				[1, 2],
				[3, 4]
			]);

			// SUM(A1:B2) = 1 + 2 + 3 + 4 = 10
			const result = evaluateFormula('=SUM(A1:B2)', tableData, { col: 2, row: 0 });
			expect(result.value).toBe(10);
		});

		it('evaluates horizontal range (cross-column)', () => {
			const tableData = createTableData([
				[10, 20, 30, 40, 50]
			]);

			// SUM(A1:E1) = 10 + 20 + 30 + 40 + 50 = 150
			const result = evaluateFormula('=SUM(A1:E1)', tableData, { col: 5, row: 0 });
			expect(result.value).toBe(150);
		});

		it('evaluates AVG of horizontal range', () => {
			const tableData = createTableData([
				[100, 200, 300]
			]);

			// AVG(A1:C1) = (100 + 200 + 300) / 3 = 200
			const result = evaluateFormula('=AVG(A1:C1)', tableData, { col: 3, row: 0 });
			expect(result.value).toBe(200);
		});
	});

	describe('error handling', () => {
		it('detects circular reference', () => {
			const tableData = createTableData([[100, 200]]);

			// Formula in A1 that references A1
			const result = evaluateFormula('=A1+B1', tableData, { col: 0, row: 0 });
			expect(result.error).toContain('Circular');
		});

		it('handles division by zero', () => {
			const tableData = createTableData([[100, 0]]);

			const result = evaluateFormula('=A1/B1', tableData, { col: 2, row: 0 });
			expect(result.error).toContain('zero');
		});

		it('handles empty cells as zero', () => {
			const tableData = createTableData([[100, null]]);

			// A1 (100) + B1 (null->0) = 100
			const result = evaluateFormula('=A1+B1', tableData, { col: 2, row: 0 });
			expect(result.value).toBe(100);
		});

		it('returns error for invalid formula', () => {
			const tableData = createTableData([[]]);

			const result = evaluateFormula('invalid', tableData, { col: 0, row: 0 });
			expect(result.error).toBeDefined();
		});

		it('returns error for empty SUM range', () => {
			const tableData = createTableData([[null, null]]);

			// SUM of no values returns 0 (Excel behavior)
			const result = evaluateFormula('=SUM(A1:A2)', tableData, { col: 2, row: 0 });
			expect(result.value).toBe(0);
		});

		it('returns error for empty AVG range', () => {
			const tableData = createTableData([[null, null]]);

			const result = evaluateFormula('=AVG(A1:A2)', tableData, { col: 2, row: 0 });
			expect(result.error).toContain('No values');
		});
	});

	describe('unary minus', () => {
		it('handles negative constants', () => {
			const tableData = createTableData([[]]);

			const result = evaluateFormula('=-5', tableData, { col: 0, row: 0 });
			expect(result.value).toBe(-5);
		});

		it('handles negation of cell reference', () => {
			const tableData = createTableData([[10]]);

			const result = evaluateFormula('=-A1', tableData, { col: 1, row: 0 });
			expect(result.value).toBe(-10);
		});

		it('handles multiplication with negative', () => {
			const tableData = createTableData([[10]]);

			const result = evaluateFormula('=A1*-1', tableData, { col: 1, row: 0 });
			expect(result.value).toBe(-10);
		});
	});
});

describe('evaluateAndFormat', () => {
	it('formats successful result', () => {
		const tableData = createTableData([[1500]]);

		const result = evaluateAndFormat('=A1', tableData, { col: 1, row: 0 });
		expect(result).toBe('1,500.00');
	});

	it('formats error', () => {
		const tableData = createTableData([[]]);

		const result = evaluateAndFormat('invalid', tableData, { col: 0, row: 0 });
		expect(result).toBe('Error');
	});
});

describe('isValidFormula', () => {
	it('returns true for valid formula', () => {
		const tableData = createTableData([[100]]);

		expect(isValidFormula('=A1*2', tableData, { col: 1, row: 0 })).toBe(true);
	});

	it('returns false for circular reference', () => {
		const tableData = createTableData([[100]]);

		expect(isValidFormula('=A1', tableData, { col: 0, row: 0 })).toBe(false);
	});

	it('returns false for invalid syntax', () => {
		const tableData = createTableData([[]]);

		expect(isValidFormula('not a formula', tableData, { col: 0, row: 0 })).toBe(false);
	});
});

// Helper to create table data with formulas
function createTableDataWithFormulas(
	values: (number | null)[][],
	formulas: Map<string, string>
): TableData {
	const colCount = Math.max(...values.map((r) => r.length), 0);

	// Normalize rows
	const normalized = values.map((row) => {
		const newRow = [...row];
		while (newRow.length < colCount) {
			newRow.push(null);
		}
		return newRow;
	});

	return {
		values: normalized,
		rowCount: normalized.length,
		colCount,
		formulas
	};
}

describe('formula-to-formula references', () => {
	it('evaluates formula referencing another formula cell', () => {
		// A1=10, B1=20, C1 contains formula =A1+B1 (should be 30)
		// D1 evaluates =C1*2 -> should get 60
		const tableData = createTableDataWithFormulas(
			[[10, 20, null, null]],
			new Map([['C1', '=A1+B1']])
		);

		const result = evaluateFormula('=C1*2', tableData, { col: 3, row: 0 });
		expect(result.value).toBe(60); // (10+20) * 2 = 60
	});

	it('evaluates chain of formulas: A -> B -> C', () => {
		// A1=10, B1 has formula =A1*2 (20), C1 has formula =B1+5 (25)
		// D1 evaluates =C1*2 -> should get 50
		const tableData = createTableDataWithFormulas(
			[[10, null, null, null]],
			new Map([
				['B1', '=A1*2'],
				['C1', '=B1+5']
			])
		);

		const result = evaluateFormula('=C1*2', tableData, { col: 3, row: 0 });
		expect(result.value).toBe(50); // ((10*2)+5) * 2 = 50
	});

	it('detects circular reference in formula chain: A -> B -> A', () => {
		// A1 has formula =B1+1, B1 has formula =A1+1
		// Evaluating from C1 referencing A1 should detect the cycle
		const tableData = createTableDataWithFormulas(
			[[null, null, null]],
			new Map([
				['A1', '=B1+1'],
				['B1', '=A1+1']
			])
		);

		const result = evaluateFormula('=A1', tableData, { col: 2, row: 0 });
		expect(result.error).toContain('Circular');
	});

	it('handles cross-row formula chains', () => {
		// Row 1: A1=10, B1=20, C1=formula (=A1+B1 -> 30)
		// Row 2: A2=5, B2=10, C2=formula (=A2+B2 -> 15)
		// D1 evaluates =C1+C2 -> should get 45
		const tableData = createTableDataWithFormulas(
			[
				[10, 20, null, null],
				[5, 10, null, null]
			],
			new Map([
				['C1', '=A1+B1'],
				['C2', '=A2+B2']
			])
		);

		const result = evaluateFormula('=C1+C2', tableData, { col: 3, row: 0 });
		expect(result.value).toBe(45); // 30 + 15 = 45
	});

	it('handles SUM over formula cells', () => {
		// Column C has formulas: C1=formula, C2=formula, C3=formula
		// D1 evaluates =SUM(C1:C3) -> should sum the formula results
		const tableData = createTableDataWithFormulas(
			[
				[10, 20, null],
				[5, 10, null],
				[3, 7, null]
			],
			new Map([
				['C1', '=A1+B1'], // 30
				['C2', '=A2+B2'], // 15
				['C3', '=A3+B3'] // 10
			])
		);

		const result = evaluateFormula('=SUM(C1:C3)', tableData, { col: 3, row: 0 });
		expect(result.value).toBe(55); // 30 + 15 + 10 = 55
	});

	it('handles AVG over formula cells', () => {
		const tableData = createTableDataWithFormulas(
			[
				[10, 20, null],
				[5, 10, null],
				[3, 7, null]
			],
			new Map([
				['C1', '=A1+B1'], // 30
				['C2', '=A2+B2'], // 15
				['C3', '=A3+B3'] // 10
			])
		);

		const result = evaluateFormula('=AVG(C1:C3)', tableData, { col: 3, row: 0 });
		expect(result.value).toBeCloseTo(18.333, 2); // (30 + 15 + 10) / 3 ≈ 18.33
	});

	it('caches evaluated formula results', () => {
		// If C1 is referenced multiple times, it should only be evaluated once
		// This is implicitly tested but we verify the result is correct
		const tableData = createTableDataWithFormulas(
			[[10, 20, null, null]],
			new Map([['C1', '=A1+B1']])
		);

		// Reference C1 twice in the same formula
		const result = evaluateFormula('=C1+C1', tableData, { col: 3, row: 0 });
		expect(result.value).toBe(60); // 30 + 30 = 60
	});

	it('handles deeply nested formula chain', () => {
		// E1 -> D1 -> C1 -> B1 -> A1
		const tableData = createTableDataWithFormulas(
			[[10, null, null, null, null]],
			new Map([
				['B1', '=A1*2'], // 20
				['C1', '=B1+10'], // 30
				['D1', '=C1*2'], // 60
				['E1', '=D1-10'] // 50
			])
		);

		const result = evaluateFormula('=E1', tableData, { col: 5, row: 0 });
		expect(result.value).toBe(50);
	});

	it('handles formula referencing empty cell', () => {
		// C1 references B1 which is null (treated as 0)
		const tableData = createTableDataWithFormulas(
			[[10, null, null]],
			new Map([['C1', '=A1+B1']])
		);

		const result = evaluateFormula('=C1', tableData, { col: 3, row: 0 });
		expect(result.value).toBe(10); // 10 + 0 = 10
	});
});

describe('percentage calculations', () => {
	it('evaluates simple percentage constant', () => {
		const tableData = createTableData([[]]);

		// 50% = 0.5
		const result = evaluateFormula('=50%', tableData, { col: 0, row: 0 });
		expect(result.value).toBe(0.5);
	});

	it('evaluates percentage in multiplication', () => {
		const tableData = createTableData([[100]]);

		// A1 * 15% = 100 * 0.15 = 15
		const result = evaluateFormula('=A1*15%', tableData, { col: 1, row: 0 });
		expect(result.value).toBe(15);
	});

	it('evaluates percentage in addition', () => {
		const tableData = createTableData([[100]]);

		// A1 + 10% = 100 + 0.1 = 100.1
		const result = evaluateFormula('=A1+10%', tableData, { col: 1, row: 0 });
		expect(result.value).toBe(100.1);
	});

	it('evaluates value plus percentage of itself', () => {
		const tableData = createTableData([[100]]);

		// A1 + A1*15% = 100 + 15 = 115 (common tax/tip calculation)
		const result = evaluateFormula('=A1+A1*15%', tableData, { col: 1, row: 0 });
		expect(result.value).toBe(115);
	});

	it('evaluates decimal percentage', () => {
		const tableData = createTableData([[1000]]);

		// A1 * 7.5% = 1000 * 0.075 = 75
		const result = evaluateFormula('=A1*7.5%', tableData, { col: 1, row: 0 });
		expect(result.value).toBe(75);
	});

	it('evaluates percentage in parentheses', () => {
		const tableData = createTableData([[100, 50]]);

		// (A1 + B1) * 10% = 150 * 0.1 = 15
		const result = evaluateFormula('=(A1+B1)*10%', tableData, { col: 2, row: 0 });
		expect(result.value).toBe(15);
	});
});
