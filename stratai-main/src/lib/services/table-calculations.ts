/**
 * Table Calculation Service
 *
 * Computes column totals for tables with sum/average/count/min/max formulas.
 * See: docs/TABLE_IMPLEMENTATION.md Phase 2
 */

export type FormulaType = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';

/**
 * Extract text content from nested TipTap nodes
 */
function extractTextFromNode(node: any): string {
	if (node.text) return node.text;
	if (!node.content) return '';

	return node.content.map((child: any) => extractTextFromNode(child)).join(' ');
}

/**
 * Extract numeric values from cells in a column
 * Skips total rows and non-numeric content
 */
function extractColumnValues(table: any, columnIndex: number): number[] {
	const values: number[] = [];

	// Walk table rows (skip total rows)
	table.content?.forEach((row: any) => {
		// Skip total rows
		if (row.attrs?.isTotal) return;

		const cell = row.content?.[columnIndex];
		if (!cell) return;

		// Extract text from cell (walk nested paragraphs)
		const text = extractTextFromNode(cell);
		const cleaned = text.trim().replace(/[^0-9.-]/g, '');
		const num = parseFloat(cleaned);

		if (!isNaN(num) && cleaned !== '') {
			values.push(num);
		}
	});

	return values;
}

/**
 * Calculate formula result for a column
 * Returns null if no valid numeric values found
 */
export function calculateFormula(
	table: any,
	columnIndex: number,
	formula: FormulaType
): number | null {
	const values = extractColumnValues(table, columnIndex);

	if (values.length === 0) return null;

	switch (formula) {
		case 'SUM':
			return values.reduce((sum, val) => sum + val, 0);

		case 'AVG':
			return values.reduce((sum, val) => sum + val, 0) / values.length;

		case 'COUNT':
			return values.length;

		case 'MIN':
			return Math.min(...values);

		case 'MAX':
			return Math.max(...values);

		default:
			return null;
	}
}

/**
 * Format calculated value for display
 */
export function formatCalculatedValue(value: number | null, formula: FormulaType): string {
	if (value === null) return '—';

	if (formula === 'COUNT') {
		return value.toString();
	}

	// Format with 2 decimal places for monetary/numeric values
	return value.toFixed(2);
}

/**
 * Recalculate all formulas in a table
 * Mutates the table node's cell content
 */
export function recalculateTable(tableNode: any): void {
	if (!tableNode || tableNode.type !== 'table') return;

	tableNode.content?.forEach((row: any) => {
		// Only process total rows
		if (!row.attrs?.isTotal) return;

		row.content?.forEach((cell: any, colIndex: number) => {
			// Only process cells with formulas
			if (!cell.attrs?.formula) return;

			const result = calculateFormula(tableNode, colIndex, cell.attrs.formula);
			const formatted = formatCalculatedValue(result, cell.attrs.formula);

			// Update cell text content
			if (cell.content?.[0]?.content?.[0]) {
				// Cell → Paragraph → Text
				cell.content[0].content[0].text = formatted;
			} else if (cell.content?.[0]) {
				// Create text node if doesn't exist
				cell.content[0].content = [{ type: 'text', text: formatted }];
			}
		});
	});
}
