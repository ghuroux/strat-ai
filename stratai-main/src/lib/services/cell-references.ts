/**
 * Cell Reference Utilities
 *
 * Handles A1-style cell references for Excel-like table formulas.
 * - Column letters: A, B, C, ... Z, AA, AB, ...
 * - Row numbers: 1-indexed (matches Excel)
 * - Internal storage: 0-indexed
 *
 * See: docs/TABLE_IMPLEMENTATION.md Phase 3
 */

/**
 * Convert 0-based column index to Excel-style letter(s)
 * 0 -> A, 25 -> Z, 26 -> AA, 27 -> AB, etc.
 */
export function columnIndexToLetter(index: number): string {
	if (index < 0) return '';

	let letter = '';
	let remaining = index;

	while (remaining >= 0) {
		letter = String.fromCharCode((remaining % 26) + 65) + letter;
		remaining = Math.floor(remaining / 26) - 1;
	}

	return letter;
}

/**
 * Convert Excel-style column letter(s) to 0-based index
 * A -> 0, Z -> 25, AA -> 26, AB -> 27, etc.
 */
export function columnLetterToIndex(letter: string): number {
	if (!letter || !/^[A-Z]+$/i.test(letter)) return -1;

	const upper = letter.toUpperCase();
	let index = 0;

	for (let i = 0; i < upper.length; i++) {
		index = index * 26 + (upper.charCodeAt(i) - 64);
	}

	return index - 1;
}

/**
 * Parse a cell reference string into column and row indices (0-based internally)
 * "B3" -> { col: 1, row: 2 }
 * "AA10" -> { col: 26, row: 9 }
 */
export function parseCellRef(ref: string): { col: number; row: number } | null {
	if (!ref) return null;

	const match = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/);
	if (!match) return null;

	const col = columnLetterToIndex(match[1]);
	const row = parseInt(match[2], 10) - 1; // Convert to 0-indexed

	if (col < 0 || row < 0 || isNaN(row)) return null;

	return { col, row };
}

/**
 * Build a cell reference string from column and row indices (0-based)
 * { col: 1, row: 2 } -> "B3"
 */
export function buildCellRef(col: number, row: number): string {
	if (col < 0 || row < 0) return '';
	return `${columnIndexToLetter(col)}${row + 1}`;
}

/**
 * Parse a range reference into start and end positions
 * "A1:A5" -> { start: { col: 0, row: 0 }, end: { col: 0, row: 4 } }
 * "B2:D4" -> { start: { col: 1, row: 1 }, end: { col: 3, row: 3 } }
 */
export function parseRangeRef(
	range: string
): { start: { col: number; row: number }; end: { col: number; row: number } } | null {
	if (!range) return null;

	const parts = range.toUpperCase().split(':');
	if (parts.length !== 2) return null;

	const start = parseCellRef(parts[0]);
	const end = parseCellRef(parts[1]);

	if (!start || !end) return null;

	// Normalize: ensure start <= end
	return {
		start: {
			col: Math.min(start.col, end.col),
			row: Math.min(start.row, end.row)
		},
		end: {
			col: Math.max(start.col, end.col),
			row: Math.max(start.row, end.row)
		}
	};
}

/**
 * Expand a range into individual cell references
 * "A1:A3" -> ["A1", "A2", "A3"]
 * "A1:B2" -> ["A1", "A2", "B1", "B2"]
 */
export function expandRange(range: string): string[] {
	const parsed = parseRangeRef(range);
	if (!parsed) return [];

	const cells: string[] = [];

	for (let row = parsed.start.row; row <= parsed.end.row; row++) {
		for (let col = parsed.start.col; col <= parsed.end.col; col++) {
			cells.push(buildCellRef(col, row));
		}
	}

	return cells;
}

/**
 * Check if a string looks like a cell reference
 * "B3" -> true
 * "SUM" -> false
 * "123" -> false
 */
export function isCellRef(str: string): boolean {
	return /^[A-Z]+\d+$/i.test(str);
}

/**
 * Check if a string looks like a range reference
 * "A1:A5" -> true
 * "B3" -> false
 */
export function isRangeRef(str: string): boolean {
	return /^[A-Z]+\d+:[A-Z]+\d+$/i.test(str);
}

/**
 * Extract all cell references from a formula string
 * "=B1*C2+D3" -> ["B1", "C2", "D3"]
 */
export function extractCellRefs(formula: string): string[] {
	if (!formula) return [];

	const matches = formula.toUpperCase().match(/\b([A-Z]+\d+)\b/g);
	if (!matches) return [];

	// Filter out duplicates
	return [...new Set(matches)];
}

/**
 * Extract all range references from a formula string
 * "=SUM(A1:A5)+B1:B3" -> ["A1:A5", "B1:B3"]
 */
export function extractRangeRefs(formula: string): string[] {
	if (!formula) return [];

	const matches = formula.toUpperCase().match(/([A-Z]+\d+:[A-Z]+\d+)/g);
	if (!matches) return [];

	return [...new Set(matches)];
}

/**
 * Update cell references in a formula when rows/columns are inserted/deleted
 * This shifts references similar to Excel behavior.
 *
 * @param formula - The formula string
 * @param shiftCol - Column shift amount (+1 for insert, -1 for delete)
 * @param shiftRow - Row shift amount (+1 for insert, -1 for delete)
 * @param afterCol - Only shift refs after this column (0-indexed, -1 for all)
 * @param afterRow - Only shift refs after this row (0-indexed, -1 for all)
 */
export function shiftReferences(
	formula: string,
	shiftCol: number,
	shiftRow: number,
	afterCol: number = -1,
	afterRow: number = -1
): string {
	if (!formula) return formula;

	// Replace cell references with shifted versions
	return formula.replace(/\b([A-Z]+)(\d+)\b/gi, (match, colLetter, rowNum) => {
		const col = columnLetterToIndex(colLetter);
		const row = parseInt(rowNum, 10) - 1;

		let newCol = col;
		let newRow = row;

		// Apply column shift
		if (shiftCol !== 0 && (afterCol === -1 || col > afterCol)) {
			newCol = col + shiftCol;
		}

		// Apply row shift
		if (shiftRow !== 0 && (afterRow === -1 || row > afterRow)) {
			newRow = row + shiftRow;
		}

		// Check if reference is now invalid
		if (newCol < 0 || newRow < 0) {
			return '#REF!';
		}

		return buildCellRef(newCol, newRow);
	});
}
