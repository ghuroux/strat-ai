/**
 * Table Calculation Service
 *
 * Computes column totals for tables with sum/average/count/min/max formulas.
 * Phase 2.5: Also computes row formulas (e.g., =[1]*[2])
 * See: docs/TABLE_IMPLEMENTATION.md Phase 2 & 2.5
 */

import type { Editor } from '@tiptap/core';
import { parseFormula, evaluateFormula, formatResult } from './formula-parser';

export type FormulaType = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';

// Column formulas that are handled by the column-based calculation
const COLUMN_FORMULAS = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];

/**
 * Extract text content from nested TipTap nodes
 */
function extractTextFromNode(node: any): string {
	if (node.text) return node.text;
	if (!node.content) return '';

	return node.content.map((child: any) => extractTextFromNode(child)).join(' ');
}

/**
 * Phase 2.5: Extract numeric values from all cells in a row
 * Used for row formula evaluation
 */
function extractRowValues(row: any): (number | null)[] {
	const values: (number | null)[] = [];

	row.content?.forEach((cell: any) => {
		// Skip cells with row formulas (prevent circular references)
		if (cell.attrs?.formula && cell.attrs.formula.startsWith('=')) {
			values.push(null);
			return;
		}

		const text = extractTextFromNode(cell);
		const cleaned = text.trim().replace(/[^0-9.-]/g, '');
		const num = parseFloat(cleaned);

		values.push(!isNaN(num) && cleaned !== '' ? num : null);
	});

	return values;
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
 * Always returns a non-empty string (TipTap doesn't allow empty text nodes)
 */
export function formatCalculatedValue(value: number | null, formula: FormulaType): string {
	if (value === null) return '—';

	if (formula === 'COUNT') {
		return value.toString() || '0';
	}

	// Format with 2 decimal places for monetary/numeric values
	const formatted = value.toFixed(2);
	return formatted || '0.00';
}

/**
 * Recalculate all formulas in a table
 * Mutates the table node's cell content
 * Ensures no empty text nodes are created (TipTap doesn't allow them)
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

			// Guard: ensure we never set empty text
			const safeText = formatted || '—';

			// Update cell text content
			if (cell.content?.[0]?.content?.[0]) {
				// Cell → Paragraph → Text
				cell.content[0].content[0].text = safeText;
			} else if (cell.content?.[0]) {
				// Create text node if doesn't exist
				cell.content[0].content = [{ type: 'text', text: safeText }];
			}
		});
	});
}

/**
 * Update table totals in the editor in real-time
 * Uses nodesBetween for reliable position finding
 */
export function updateTableTotalsInEditor(editor: Editor): void {
	try {
		const { state } = editor;
		const { doc, schema } = state;

		// First pass: collect table data for calculations
		const tableData: Map<number, any> = new Map(); // tablePos -> tableJson

		doc.descendants((node, pos) => {
			if (node.type.name === 'table') {
				tableData.set(pos, node.toJSON());
			}
			return true;
		});

		if (tableData.size === 0) return;

		// Second pass: find formula cells and their text positions
		const updates: Array<{ from: number; to: number; text: string }> = [];

		doc.descendants((node, pos, parent, index) => {
			// Look for tableCell nodes with formula attribute
			if (node.type.name === 'tableCell' && node.attrs?.formula) {
				const formula = node.attrs.formula as string;
				const colIndex = node.attrs.columnIndex as number;

				// Find the parent table and row to get data for calculation
				let tableJson: any = null;
				let rowJson: any = null;
				let rowIndex = -1;

				// Walk up to find table and row
				doc.nodesBetween(0, pos, (n, p) => {
					if (n.type.name === 'table' && p <= pos && p + n.nodeSize > pos) {
						tableJson = tableData.get(p);
					}
					if (n.type.name === 'tableRow' && p <= pos && p + n.nodeSize > pos) {
						// Find row in table JSON
						if (tableJson) {
							tableJson.content?.forEach((row: any, idx: number) => {
								// Estimate row position
								if (rowJson === null) {
									rowJson = row;
									rowIndex = idx;
								}
							});
							// More accurate: find the row containing this cell
							tableJson.content?.forEach((row: any, idx: number) => {
								if (row.content?.some((c: any) => c.attrs?.columnIndex === colIndex && c.attrs?.formula === formula)) {
									rowJson = row;
									rowIndex = idx;
								}
							});
						}
					}
					return true;
				});

				if (!tableJson) return true;

				let safeText: string;

				// Check if this is a column formula or row formula
				if (COLUMN_FORMULAS.includes(formula)) {
					// Column formula (SUM, AVG, COUNT, MIN, MAX)
					if (colIndex === null) return true;
					const result = calculateFormula(tableJson, colIndex, formula as FormulaType);
					const formatted = formatCalculatedValue(result, formula as FormulaType);
					safeText = formatted || '—';
				} else if (formula.startsWith('=')) {
					// Row formula (e.g., =[1]*[2])
					// Get row values from the current row
					let rowValues: (number | null)[] = [];

					// Find the row containing this cell in tableJson
					tableJson.content?.forEach((row: any) => {
						const hasThisCell = row.content?.some((c: any) =>
							c.attrs?.formula === formula && c.attrs?.columnIndex === colIndex
						);
						if (hasThisCell) {
							rowValues = extractRowValues(row);
						}
					});

					const parsed = parseFormula(formula);
					const result = evaluateFormula(parsed, rowValues);
					safeText = formatResult(result);
				} else {
					// Unknown formula type
					return true;
				}

				// Find the text node within this cell
				let textPos = -1;
				let textEnd = -1;
				let currentText = '';

				// Cell structure: tableCell > paragraph > text
				node.forEach((child, offset) => {
					if (child.type.name === 'paragraph') {
						const pStart = pos + 1 + offset; // +1 for cell opening
						child.forEach((pChild, pOffset) => {
							if (pChild.isText) {
								textPos = pStart + 1 + pOffset; // +1 for paragraph opening
								currentText = pChild.text || '';
								textEnd = textPos + currentText.length;
							}
						});
					}
				});

				// Only update if different
				if (textPos >= 0 && currentText !== safeText) {
					updates.push({
						from: textPos,
						to: textEnd > textPos ? textEnd : textPos,
						text: safeText
					});
				}
			}
			return true;
		});

		// Apply updates in reverse position order
		if (updates.length > 0) {
			const tr = state.tr;
			updates.sort((a, b) => b.from - a.from);

			for (const update of updates) {
				if (update.to > update.from) {
					tr.replaceWith(update.from, update.to, schema.text(update.text));
				} else {
					tr.insertText(update.text, update.from);
				}
			}

			tr.setMeta('tableCalculation', true);
			editor.view.dispatch(tr);
		}
	} catch (error) {
		console.warn('Table calculation update failed:', error);
	}
}
