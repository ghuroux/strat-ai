/**
 * Formula Parser Service
 *
 * Parses and evaluates row formulas for table cells.
 * Formulas use column indices (e.g., =[1]*[2]) for robustness.
 * See: docs/TABLE_IMPLEMENTATION.md Phase 2.5
 */

export type FormulaTokenType = 'column_ref' | 'operator' | 'number' | 'lparen' | 'rparen';

export interface FormulaToken {
	type: FormulaTokenType;
	value: string | number;
	columnIndex?: number;
}

export interface ParsedFormula {
	tokens: FormulaToken[];
	type: 'row' | 'column';
	isValid: boolean;
	error?: string;
	referencedColumns: number[];
}

/**
 * Parse a formula string into tokens
 * Formulas must start with "=" for row formulas
 * Column references use [n] syntax where n is 0-based column index
 */
export function parseFormula(formula: string): ParsedFormula {
	// Check if this is a column formula (SUM, AVG, etc.)
	const columnFormulas = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];
	if (columnFormulas.includes(formula)) {
		return {
			tokens: [],
			type: 'column',
			isValid: true,
			referencedColumns: []
		};
	}

	// Row formulas must start with =
	if (!formula.startsWith('=')) {
		return {
			tokens: [],
			type: 'row',
			isValid: false,
			error: 'Formula must start with =',
			referencedColumns: []
		};
	}

	const tokens: FormulaToken[] = [];
	const referencedColumns: number[] = [];
	let pos = 1; // Skip the leading =
	const expr = formula.slice(1);

	while (pos <= expr.length) {
		const char = expr[pos - 1];

		// Skip whitespace
		if (/\s/.test(char)) {
			pos++;
			continue;
		}

		// Column reference: [n]
		if (char === '[') {
			const endBracket = expr.indexOf(']', pos);
			if (endBracket === -1) {
				return {
					tokens,
					type: 'row',
					isValid: false,
					error: 'Unclosed column reference',
					referencedColumns
				};
			}

			const colIndexStr = expr.slice(pos, endBracket);
			const colIndex = parseInt(colIndexStr, 10);

			if (isNaN(colIndex) || colIndex < 0) {
				return {
					tokens,
					type: 'row',
					isValid: false,
					error: `Invalid column index: ${colIndexStr}`,
					referencedColumns
				};
			}

			tokens.push({
				type: 'column_ref',
				value: `[${colIndex}]`,
				columnIndex: colIndex
			});
			referencedColumns.push(colIndex);
			pos = endBracket + 2; // Move past ]
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

		// Numbers (including decimals)
		if (/[0-9.]/.test(char)) {
			let numStr = '';
			let hasDecimal = false;

			while (pos <= expr.length) {
				const c = expr[pos - 1];
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

			const num = parseFloat(numStr);
			if (isNaN(num)) {
				return {
					tokens,
					type: 'row',
					isValid: false,
					error: `Invalid number: ${numStr}`,
					referencedColumns
				};
			}

			tokens.push({ type: 'number', value: num });
			continue;
		}

		// Unknown character
		return {
			tokens,
			type: 'row',
			isValid: false,
			error: `Unexpected character: ${char}`,
			referencedColumns
		};
	}

	// Check for empty formula
	if (tokens.length === 0) {
		return {
			tokens,
			type: 'row',
			isValid: false,
			error: 'Empty formula',
			referencedColumns
		};
	}

	return {
		tokens,
		type: 'row',
		isValid: true,
		referencedColumns
	};
}

/**
 * Evaluate a parsed formula with actual row values
 * Returns null if evaluation fails (e.g., division by zero, missing values)
 */
export function evaluateFormula(parsed: ParsedFormula, rowValues: (number | null)[]): number | null {
	if (!parsed.isValid || parsed.type === 'column') {
		return null;
	}

	// Convert tokens to expression and evaluate
	// Uses a simple recursive descent parser for operator precedence

	let pos = 0;
	const tokens = parsed.tokens;

	function getValue(token: FormulaToken): number | null {
		if (token.type === 'number') {
			return token.value as number;
		}
		if (token.type === 'column_ref' && token.columnIndex !== undefined) {
			const val = rowValues[token.columnIndex];
			return val;
		}
		return null;
	}

	function parseExpression(): number | null {
		return parseAddSub();
	}

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
					if (right === 0) return null;
					left = left / right;
				}
			} else {
				break;
			}
		}

		return left;
	}

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

		// Handle numbers and column refs
		if (token.type === 'number' || token.type === 'column_ref') {
			pos++;
			return getValue(token);
		}

		return null;
	}

	try {
		const result = parseExpression();
		// Check for any unparsed tokens
		if (pos < tokens.length) {
			return null; // Invalid expression
		}
		return result;
	} catch {
		return null;
	}
}

/**
 * Convert formula with indices to display format with column names
 * e.g., "=[1]*[2]" with headers ["Item", "Qty", "Rate"] becomes "Qty × Rate"
 */
export function getDisplayFormula(formula: string, columnHeaders: string[]): string {
	if (!formula.startsWith('=')) return formula;

	let display = formula.slice(1); // Remove leading =

	// Replace column references with names
	// Sort by index descending to avoid replacing [1] before [10]
	const refs = [...display.matchAll(/\[(\d+)\]/g)].map((match) => ({
		full: match[0],
		index: parseInt(match[1], 10),
		pos: match.index!
	}));

	refs.sort((a, b) => b.pos - a.pos);

	for (const ref of refs) {
		const name = columnHeaders[ref.index] || `Col ${ref.index + 1}`;
		display = display.slice(0, ref.pos) + name + display.slice(ref.pos + ref.full.length);
	}

	// Replace operators with nicer symbols
	display = display.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ');

	return display;
}

/**
 * Check if a formula would create a circular reference
 * For row formulas, prevents self-reference to the current cell's column
 */
export function hasCircularReference(
	currentColumnIndex: number,
	formula: string,
	_allFormulas?: Map<string, string>
): boolean {
	const parsed = parseFormula(formula);

	if (!parsed.isValid) return false;

	// Check if the formula references its own column
	return parsed.referencedColumns.includes(currentColumnIndex);
}

/**
 * Validate a formula and return an error message if invalid
 */
export function validateFormula(
	formula: string,
	currentColumnIndex: number,
	totalColumns: number
): string | null {
	const parsed = parseFormula(formula);

	if (!parsed.isValid) {
		return parsed.error || 'Invalid formula';
	}

	// Check for circular reference
	if (hasCircularReference(currentColumnIndex, formula)) {
		return 'Formula cannot reference its own column';
	}

	// Check for out-of-range column references
	for (const colIndex of parsed.referencedColumns) {
		if (colIndex >= totalColumns) {
			return `Column [${colIndex}] does not exist`;
		}
	}

	return null;
}

/**
 * Format a calculated result for display
 */
export function formatResult(value: number | null): string {
	if (value === null) return '—';
	if (!isFinite(value)) return 'Error';

	// Format with 2 decimal places
	return value.toFixed(2);
}
