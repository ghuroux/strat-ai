/**
 * Formula Parser Service
 *
 * Parses Excel-like formulas with A1-style cell references.
 * Supports: cell refs (B1), ranges (A1:A5), functions (SUM, AVG), operators, numbers.
 *
 * See: docs/TABLE_IMPLEMENTATION.md Phase 3
 */

import {
	parseCellRef,
	extractCellRefs,
	extractRangeRefs,
	columnLetterToIndex
} from './cell-references';

// ============================================
// TYPES
// ============================================

export type FormulaTokenType =
	| 'cell_ref' // A1, B2, AA10
	| 'range_ref' // A1:A5
	| 'function' // SUM, AVG, COUNT, MIN, MAX
	| 'operator' // +, -, *, /
	| 'number' // 123, 45.67
	| 'lparen' // (
	| 'rparen'; // )

export interface FormulaToken {
	type: FormulaTokenType;
	value: string | number;
	// For cell_ref tokens
	col?: number;
	row?: number;
	// For range_ref tokens
	startCol?: number;
	startRow?: number;
	endCol?: number;
	endRow?: number;
}

export interface ParsedFormula {
	tokens: FormulaToken[];
	type: 'expression' | 'function' | 'constant';
	isValid: boolean;
	error?: string;
	cellRefs: string[]; // All cell references found (["B1", "C2"])
	rangeRefs: string[]; // All range references found (["A1:A5"])
}

// Supported functions
export const FORMULA_FUNCTIONS = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'] as const;
export type FormulaFunction = (typeof FORMULA_FUNCTIONS)[number];

// ============================================
// TOKENIZER
// ============================================

/**
 * Parse a formula string into tokens
 * Formulas must start with "=" for expressions
 *
 * @example parseFormula('=B1*C2') → { tokens: [...], cellRefs: ['B1', 'C2'], isValid: true }
 * @example parseFormula('=SUM(A1:A5)') → { tokens: [...], rangeRefs: ['A1:A5'], isValid: true }
 * @example parseFormula('=2+2') → { tokens: [...], type: 'constant', isValid: true }
 */
export function parseFormula(formula: string): ParsedFormula {
	// Empty formula
	if (!formula || formula.trim() === '') {
		return createInvalidResult('Empty formula');
	}

	// Must start with =
	if (!formula.startsWith('=')) {
		return createInvalidResult('Formula must start with =');
	}

	const expr = formula.slice(1).trim(); // Remove leading =

	// Empty after =
	if (expr === '') {
		return createInvalidResult('Empty formula after =');
	}

	// Extract all references for the result
	const cellRefs = extractCellRefs(formula);
	const rangeRefs = extractRangeRefs(formula);

	// Tokenize
	const tokens: FormulaToken[] = [];
	let pos = 0;

	while (pos < expr.length) {
		const char = expr[pos];

		// Skip whitespace
		if (/\s/.test(char)) {
			pos++;
			continue;
		}

		// Check for function names first (SUM, AVG, etc.)
		const funcMatch = expr.slice(pos).match(/^(SUM|AVG|COUNT|MIN|MAX)\s*\(/i);
		if (funcMatch) {
			tokens.push({
				type: 'function',
				value: funcMatch[1].toUpperCase()
			});
			pos += funcMatch[1].length;
			// Skip whitespace before (
			while (pos < expr.length && /\s/.test(expr[pos])) pos++;
			continue;
		}

		// Check for range reference (A1:B5) - must check before cell ref
		const rangeMatch = expr.slice(pos).match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)/i);
		if (rangeMatch) {
			const startCol = columnLetterToIndex(rangeMatch[1]);
			const startRow = parseInt(rangeMatch[2], 10) - 1;
			const endCol = columnLetterToIndex(rangeMatch[3]);
			const endRow = parseInt(rangeMatch[4], 10) - 1;

			if (startCol < 0 || startRow < 0 || endCol < 0 || endRow < 0) {
				return createInvalidResult(`Invalid range reference: ${rangeMatch[0]}`);
			}

			tokens.push({
				type: 'range_ref',
				value: rangeMatch[0].toUpperCase(),
				startCol: Math.min(startCol, endCol),
				startRow: Math.min(startRow, endRow),
				endCol: Math.max(startCol, endCol),
				endRow: Math.max(startRow, endRow)
			});
			pos += rangeMatch[0].length;
			continue;
		}

		// Check for cell reference (A1, B23, AA100)
		const cellMatch = expr.slice(pos).match(/^([A-Z]+)(\d+)/i);
		if (cellMatch) {
			const col = columnLetterToIndex(cellMatch[1]);
			const row = parseInt(cellMatch[2], 10) - 1;

			if (col < 0 || row < 0) {
				return createInvalidResult(`Invalid cell reference: ${cellMatch[0]}`);
			}

			tokens.push({
				type: 'cell_ref',
				value: cellMatch[0].toUpperCase(),
				col,
				row
			});
			pos += cellMatch[0].length;
			continue;
		}

		// Operators
		if (['+', '-', '*', '/'].includes(char)) {
			tokens.push({ type: 'operator', value: char });
			pos++;
			continue;
		}

		// Parentheses
		if (char === '(') {
			tokens.push({ type: 'lparen', value: '(' });
			pos++;
			continue;
		}

		if (char === ')') {
			tokens.push({ type: 'rparen', value: ')' });
			pos++;
			continue;
		}

		// Numbers (including decimals and percentages)
		if (/[0-9.]/.test(char)) {
			let numStr = '';
			let hasDecimal = false;

			while (pos < expr.length) {
				const c = expr[pos];
				if (c === '.' && !hasDecimal) {
					hasDecimal = true;
					numStr += c;
					pos++;
				} else if (/[0-9]/.test(c)) {
					numStr += c;
					pos++;
				} else {
					break;
				}
			}

			let num = parseFloat(numStr);
			if (isNaN(num)) {
				return createInvalidResult(`Invalid number: ${numStr}`);
			}

			// Check for percentage suffix - 10% becomes 0.1
			if (pos < expr.length && expr[pos] === '%') {
				num = num / 100;
				pos++; // Consume the %
			}

			tokens.push({ type: 'number', value: num });
			continue;
		}

		// Comma (for function arguments) - skip it
		if (char === ',') {
			pos++;
			continue;
		}

		// Unknown character
		return createInvalidResult(`Unexpected character: ${char}`);
	}

	// Check for empty tokens
	if (tokens.length === 0) {
		return createInvalidResult('Empty formula');
	}

	// Determine formula type
	let type: ParsedFormula['type'] = 'expression';
	if (tokens.some((t) => t.type === 'function')) {
		type = 'function';
	} else if (cellRefs.length === 0 && rangeRefs.length === 0) {
		type = 'constant';
	}

	// Validate parentheses matching
	let parenDepth = 0;
	for (const token of tokens) {
		if (token.type === 'lparen') parenDepth++;
		if (token.type === 'rparen') parenDepth--;
		if (parenDepth < 0) {
			return createInvalidResult('Unmatched closing parenthesis');
		}
	}
	if (parenDepth !== 0) {
		return createInvalidResult('Unmatched opening parenthesis');
	}

	return {
		tokens,
		type,
		isValid: true,
		cellRefs,
		rangeRefs
	};
}

/**
 * Create an invalid ParsedFormula result
 */
function createInvalidResult(error: string): ParsedFormula {
	return {
		tokens: [],
		type: 'expression',
		isValid: false,
		error,
		cellRefs: [],
		rangeRefs: []
	};
}

// ============================================
// DISPLAY FORMATTING
// ============================================

/**
 * Convert formula to display format with nicer symbols
 * e.g., "=B1*C2" becomes "B1 × C2"
 */
export function getDisplayFormula(formula: string): string {
	if (!formula || !formula.startsWith('=')) return formula;

	let display = formula.slice(1); // Remove leading =

	// Replace operators with nicer symbols
	display = display.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ');

	return display;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Check if a formula would create a circular reference
 *
 * @param formula - The formula to check
 * @param currentCell - The cell where this formula is being entered
 */
export function hasCircularReference(
	formula: string,
	currentCell: { col: number; row: number }
): boolean {
	const parsed = parseFormula(formula);

	if (!parsed.isValid) return false;

	// Build current cell reference string for comparison
	const currentRef = `${columnIndexToLetter(currentCell.col)}${currentCell.row + 1}`;

	// Check direct self-reference
	return parsed.cellRefs.some((ref) => ref.toUpperCase() === currentRef.toUpperCase());
}

// Helper for circular reference check
function columnIndexToLetter(index: number): string {
	let letter = '';
	let remaining = index;

	while (remaining >= 0) {
		letter = String.fromCharCode((remaining % 26) + 65) + letter;
		remaining = Math.floor(remaining / 26) - 1;
	}

	return letter;
}

/**
 * Validate a formula and return an error message if invalid
 *
 * @param formula - The formula to validate
 * @param currentCell - The cell where this formula is being entered
 * @param tableSize - The size of the table { cols, rows }
 */
export function validateFormula(
	formula: string,
	currentCell: { col: number; row: number },
	tableSize: { cols: number; rows: number }
): string | null {
	const parsed = parseFormula(formula);

	if (!parsed.isValid) {
		return parsed.error || 'Invalid formula';
	}

	// Check for circular reference
	if (hasCircularReference(formula, currentCell)) {
		return 'Formula cannot reference its own cell';
	}

	// Check for out-of-range cell references
	for (const ref of parsed.cellRefs) {
		const pos = parseCellRef(ref);
		if (pos) {
			if (pos.col >= tableSize.cols) {
				return `Column ${ref.match(/[A-Z]+/i)?.[0]} is outside the table`;
			}
			if (pos.row >= tableSize.rows) {
				return `Row ${pos.row + 1} is outside the table`;
			}
		}
	}

	return null;
}

// ============================================
// RESULT FORMATTING
// ============================================

/**
 * Format a calculated result for display
 */
export function formatResult(value: number | null): string {
	if (value === null) return '—';
	if (!isFinite(value)) return 'Error';

	// Format with 2 decimal places, add thousands separator
	return value.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

// ============================================
// LEGACY COMPATIBILITY (DEPRECATED)
// ============================================

/**
 * @deprecated Use formula-engine.ts evaluateFormula instead
 * This is kept temporarily for backward compatibility during migration
 */
export function evaluateFormula(
	_parsed: ParsedFormula,
	_rowValues: (number | null)[]
): number | null {
	console.warn(
		'formula-parser.evaluateFormula is deprecated. Use formula-engine.ts evaluateFormula instead.'
	);
	return null;
}
