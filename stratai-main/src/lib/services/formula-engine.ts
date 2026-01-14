/**
 * Formula Evaluation Engine
 *
 * Evaluates Excel-like formulas with A1-style cell references.
 * Supports cross-row references, functions, and constants.
 *
 * See: docs/TABLE_IMPLEMENTATION.md Phase 3
 */

import { parseFormula, type ParsedFormula, type FormulaToken } from './formula-parser';
import { buildCellRef, parseCellRef } from './cell-references';
import type { TableData } from './table-calculations';

// ============================================
// TYPES
// ============================================

export interface EvaluationResult {
	value: number | null;
	error?: string;
}

/**
 * Context for recursive formula evaluation
 * Tracks visited cells (cycle detection) and caches results (memoization)
 */
export interface EvaluationContext {
	/** Cache of already-evaluated formula cells: cellRef -> value */
	evaluatedCache: Map<string, number>;
	/** Set of cell refs currently being evaluated (for cycle detection) */
	visitedRefs: Set<string>;
}

// ============================================
// CONTEXT-AWARE CELL VALUE GETTER
// ============================================

/**
 * Get cell value with recursive formula evaluation
 * If the cell contains a formula, evaluates it (with cycle detection)
 *
 * @param tableData - The table data structure
 * @param col - Column index (0-based)
 * @param row - Row index (0-based)
 * @param context - Evaluation context for memoization and cycle detection
 * @returns The numeric value, or null if not evaluable
 */
function getCellValueWithContext(
	tableData: TableData,
	col: number,
	row: number,
	context: EvaluationContext
): number | null {
	const cellRef = buildCellRef(col, row);

	// 1. Check memoization cache first
	if (context.evaluatedCache.has(cellRef)) {
		return context.evaluatedCache.get(cellRef) ?? null;
	}

	// 2. Check for circular reference (this cell already being evaluated)
	if (context.visitedRefs.has(cellRef)) {
		throw new Error(`Circular reference: ${cellRef}`);
	}

	// 3. Check bounds
	if (row < 0 || row >= tableData.rowCount) return null;
	if (col < 0 || col >= tableData.colCount) return null;

	// 4. Return raw value if it exists (non-formula cell)
	const rawValue = tableData.values[row]?.[col];
	if (rawValue !== null) {
		return rawValue;
	}

	// 5. Check if this cell has a formula to evaluate
	const formula = tableData.formulas.get(cellRef);
	if (formula) {
		// Mark this cell as being visited (cycle detection)
		const newVisited = new Set(context.visitedRefs);
		newVisited.add(cellRef);

		const newContext: EvaluationContext = {
			evaluatedCache: context.evaluatedCache,
			visitedRefs: newVisited
		};

		// Recursively evaluate the formula
		const result = evaluateFormulaWithContext(formula, tableData, { col, row }, newContext);

		if (!result.error && result.value !== null) {
			// Cache the result for future lookups
			context.evaluatedCache.set(cellRef, result.value);
			return result.value;
		}

		// Formula evaluation failed - propagate error
		if (result.error) {
			throw new Error(result.error);
		}
	}

	// Cell is empty or contains non-numeric data
	return null;
}

// ============================================
// MAIN EVALUATION FUNCTION
// ============================================

/**
 * Evaluate a formula against table data (public API - creates context automatically)
 *
 * @param formula - The formula string (e.g., "=B1*C2", "=SUM(A1:A5)")
 * @param tableData - The table data structure from extractTableData()
 * @param currentCell - The cell where this formula is entered (for circular ref check)
 * @param context - Optional evaluation context (for recursive calls)
 *
 * @example
 * const result = evaluateFormula('=B2*C2', tableData, { col: 3, row: 1 });
 * if (result.error) console.error(result.error);
 * else console.log(result.value); // e.g., 1500
 */
export function evaluateFormula(
	formula: string,
	tableData: TableData,
	currentCell: { col: number; row: number },
	context?: EvaluationContext
): EvaluationResult {
	// Create context if not provided (entry point)
	const ctx = context || {
		evaluatedCache: new Map<string, number>(),
		visitedRefs: new Set<string>([buildCellRef(currentCell.col, currentCell.row)])
	};

	return evaluateFormulaWithContext(formula, tableData, currentCell, ctx);
}

/**
 * Internal evaluation function with context threading
 */
function evaluateFormulaWithContext(
	formula: string,
	tableData: TableData,
	currentCell: { col: number; row: number },
	context: EvaluationContext
): EvaluationResult {
	// Parse the formula
	const parsed = parseFormula(formula);

	if (!parsed.isValid) {
		return { value: null, error: parsed.error || 'Invalid formula' };
	}

	// Check for direct self-reference in parsed refs
	const currentRef = buildCellRef(currentCell.col, currentCell.row);
	if (parsed.cellRefs.some((ref) => ref.toUpperCase() === currentRef.toUpperCase())) {
		return { value: null, error: 'Circular reference' };
	}

	// Evaluate based on formula type
	try {
		if (parsed.type === 'function') {
			return evaluateFunctionFormula(parsed, tableData, context);
		} else {
			return evaluateExpressionFormula(parsed, tableData, context);
		}
	} catch (e) {
		return { value: null, error: e instanceof Error ? e.message : 'Evaluation error' };
	}
}

// ============================================
// FUNCTION EVALUATION (SUM, AVG, etc.)
// ============================================

/**
 * Get values from a range with context-aware evaluation
 * Evaluates formula cells recursively
 */
function getRangeValuesWithContext(
	tableData: TableData,
	startCol: number,
	startRow: number,
	endCol: number,
	endRow: number,
	context: EvaluationContext
): number[] {
	const values: number[] = [];

	for (let r = startRow; r <= endRow; r++) {
		for (let c = startCol; c <= endCol; c++) {
			const val = getCellValueWithContext(tableData, c, r, context);
			if (val !== null) {
				values.push(val);
			}
		}
	}

	return values;
}

/**
 * Evaluate function formulas like =SUM(A1:A5)
 */
function evaluateFunctionFormula(
	parsed: ParsedFormula,
	tableData: TableData,
	context: EvaluationContext
): EvaluationResult {
	// Find the function token
	const funcToken = parsed.tokens.find((t) => t.type === 'function');
	if (!funcToken) {
		return { value: null, error: 'No function found' };
	}

	const funcName = funcToken.value as string;

	// Find the range token
	const rangeToken = parsed.tokens.find((t) => t.type === 'range_ref');

	// Collect values from range or individual cell refs
	let values: number[] = [];

	if (rangeToken) {
		// Range reference (e.g., A1:A5) - use context-aware getter
		values = getRangeValuesWithContext(
			tableData,
			rangeToken.startCol!,
			rangeToken.startRow!,
			rangeToken.endCol!,
			rangeToken.endRow!,
			context
		);
	} else {
		// Individual cell references - use context-aware getter
		for (const ref of parsed.cellRefs) {
			const pos = parseCellRef(ref);
			if (pos) {
				const val = getCellValueWithContext(tableData, pos.col, pos.row, context);
				if (val !== null) {
					values.push(val);
				}
			}
		}
	}

	// Apply function
	switch (funcName.toUpperCase()) {
		case 'SUM':
			if (values.length === 0) return { value: 0 };
			return { value: values.reduce((sum, v) => sum + v, 0) };

		case 'AVG':
			if (values.length === 0) return { value: null, error: 'No values for AVG' };
			return { value: values.reduce((sum, v) => sum + v, 0) / values.length };

		case 'COUNT':
			return { value: values.length };

		case 'MIN':
			if (values.length === 0) return { value: null, error: 'No values for MIN' };
			return { value: Math.min(...values) };

		case 'MAX':
			if (values.length === 0) return { value: null, error: 'No values for MAX' };
			return { value: Math.max(...values) };

		default:
			return { value: null, error: `Unknown function: ${funcName}` };
	}
}

// ============================================
// EXPRESSION EVALUATION (=B1*C2, =2+2)
// ============================================

/**
 * Evaluate expression formulas like =B1*C2, =2+2, =(A1+B1)*C1
 * Uses recursive descent parser for proper operator precedence
 */
function evaluateExpressionFormula(
	parsed: ParsedFormula,
	tableData: TableData,
	context: EvaluationContext
): EvaluationResult {
	const tokens = parsed.tokens;
	let pos = 0;

	/**
	 * Get the value for a token (number or cell reference)
	 * Uses context-aware getter for recursive formula evaluation
	 */
	function getTokenValue(token: FormulaToken): number | null {
		if (token.type === 'number') {
			return token.value as number;
		}

		if (token.type === 'cell_ref') {
			// Cell reference - look up with context (handles formula cells)
			const col = token.col;
			const row = token.row;
			if (col === undefined || row === undefined) return null;

			// Use context-aware getter for recursive formula evaluation
			const value = getCellValueWithContext(tableData, col, row, context);
			return value ?? 0;
		}

		return null;
	}

	/**
	 * Parse full expression (lowest precedence)
	 */
	function parseExpression(): number | null {
		return parseAddSub();
	}

	/**
	 * Parse addition and subtraction (lower precedence)
	 */
	function parseAddSub(): number | null {
		let left = parseMulDiv();
		if (left === null) return null;

		while (pos < tokens.length) {
			const token = tokens[pos];
			if (token.type === 'operator' && (token.value === '+' || token.value === '-')) {
				pos++;
				const right = parseMulDiv();
				if (right === null) return null;

				if (token.value === '+') {
					left = left + right;
				} else {
					left = left - right;
				}
			} else {
				break;
			}
		}

		return left;
	}

	/**
	 * Parse multiplication and division (higher precedence)
	 */
	function parseMulDiv(): number | null {
		let left = parsePrimary();
		if (left === null) return null;

		while (pos < tokens.length) {
			const token = tokens[pos];
			if (token.type === 'operator' && (token.value === '*' || token.value === '/')) {
				pos++;
				const right = parsePrimary();
				if (right === null) return null;

				if (token.value === '*') {
					left = left * right;
				} else {
					// Division by zero check
					if (right === 0) {
						throw new Error('Division by zero');
					}
					left = left / right;
				}
			} else {
				break;
			}
		}

		return left;
	}

	/**
	 * Parse primary (numbers, cell refs, parentheses, unary minus)
	 */
	function parsePrimary(): number | null {
		if (pos >= tokens.length) return null;

		const token = tokens[pos];

		// Handle parentheses
		if (token.type === 'lparen') {
			pos++; // Skip (
			const result = parseExpression();
			if (pos < tokens.length && tokens[pos].type === 'rparen') {
				pos++; // Skip )
			}
			return result;
		}

		// Handle unary minus
		if (token.type === 'operator' && token.value === '-') {
			pos++;
			const val = parsePrimary();
			return val !== null ? -val : null;
		}

		// Handle numbers and cell references
		if (token.type === 'number' || token.type === 'cell_ref') {
			pos++;
			return getTokenValue(token);
		}

		return null;
	}

	// Execute the parser
	const result = parseExpression();

	// Check for unparsed tokens (invalid expression)
	if (pos < tokens.length) {
		return { value: null, error: 'Invalid expression' };
	}

	if (result === null) {
		return { value: null, error: 'Could not evaluate' };
	}

	// Check for special values
	if (!isFinite(result)) {
		return { value: null, error: 'Result is infinite' };
	}

	return { value: result };
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Evaluate a formula and return just the formatted result
 * Convenience function for quick evaluation without error details
 */
export function evaluateAndFormat(
	formula: string,
	tableData: TableData,
	currentCell: { col: number; row: number }
): string {
	const result = evaluateFormula(formula, tableData, currentCell);

	if (result.error) {
		return 'Error';
	}

	if (result.value === null) {
		return '—';
	}

	// Format with 2 decimal places
	return result.value.toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}

/**
 * Check if a formula can be evaluated (no errors)
 */
export function isValidFormula(
	formula: string,
	tableData: TableData,
	currentCell: { col: number; row: number }
): boolean {
	const result = evaluateFormula(formula, tableData, currentCell);
	return result.error === undefined && result.value !== null;
}
