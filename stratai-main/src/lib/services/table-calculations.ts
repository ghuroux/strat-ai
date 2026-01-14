/**
 * Table Calculation Service
 *
 * Computes column totals for tables with sum/average/count/min/max formulas.
 * Phase 3: Also computes row formulas with A1-style cell references.
 * See: docs/TABLE_IMPLEMENTATION.md Phase 2 & 3
 */

import type { Editor } from '@tiptap/core';
import { formatResult } from './formula-parser';
import { buildCellRef } from './cell-references';
import { evaluateFormula as evaluateFormulaEngine, type EvaluationContext } from './formula-engine';

export type FormulaType = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';

// ============================================
// TABLE DATA TYPES
// ============================================

/**
 * Table data structure for formula evaluation
 */
export interface TableData {
	/** 2D array of cell values (null for non-numeric or formula cells) */
	values: (number | null)[][];
	/** Number of rows (excluding total rows) */
	rowCount: number;
	/** Number of columns */
	colCount: number;
	/** Map of cell refs to formulas: "B2" -> "=C2*D2" */
	formulas: Map<string, string>;
}

// Column formulas that are handled by the column-based calculation
const COLUMN_FORMULAS = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];

// Currency symbols mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
	USD: '$',
	EUR: '€',
	GBP: '£',
	ZAR: 'R',
	JPY: '¥'
};

/**
 * Format a cell value with currency and decimal settings
 */
function formatCellValue(
	value: number | null,
	currency?: string | null,
	decimals?: number | null
): string {
	if (value === null) return '—';
	if (!isFinite(value)) return 'Error';

	// Default to 2 decimal places
	const decimalPlaces = decimals ?? 2;

	// Format the number
	const formatted = value.toLocaleString('en-US', {
		minimumFractionDigits: decimalPlaces,
		maximumFractionDigits: decimalPlaces
	});

	// Add currency symbol if specified
	if (currency && CURRENCY_SYMBOLS[currency]) {
		return `${CURRENCY_SYMBOLS[currency]}${formatted}`;
	}

	return formatted;
}

/**
 * Extract text content from nested TipTap nodes
 */
function extractTextFromNode(node: any): string {
	if (node.text) return node.text;
	if (!node.content) return '';

	return node.content.map((child: any) => extractTextFromNode(child)).join(' ');
}

/**
 * Extract numeric values from all cells in a row
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

// ============================================
// TABLE DATA EXTRACTION
// ============================================

/**
 * Extract entire table as a structured TableData object for formula evaluation.
 * This provides full table context for cross-row cell references.
 *
 * @param table - TipTap table JSON node
 * @returns TableData with 2D values array and formula locations
 *
 * @example
 * const tableData = extractTableData(tableNode.toJSON());
 * // tableData.values[0][1] = cell B1 value
 * // tableData.formulas.get("D2") = "=B2*C2"
 */
export function extractTableData(table: any): TableData {
	const values: (number | null)[][] = [];
	const formulas = new Map<string, string>();
	let colCount = 0;

	if (!table?.content) {
		return { values: [], rowCount: 0, colCount: 0, formulas };
	}

	// Process each row
	let dataRowIndex = 0;
	table.content.forEach((row: any) => {
		// Skip total rows
		if (row.attrs?.isTotal) return;

		const rowValues: (number | null)[] = [];

		row.content?.forEach((cell: any, cellIndex: number) => {
			const formula = cell.attrs?.formula;

			// If cell has a formula starting with =, store it and set value to null
			if (formula && formula.startsWith('=')) {
				const cellRef = buildCellRef(cellIndex, dataRowIndex);
				formulas.set(cellRef, formula);
				rowValues.push(null); // Formulas evaluate to null in raw data
				return;
			}

			// Extract numeric value
			const text = extractTextFromNode(cell);
			const cleaned = text.trim().replace(/[^0-9.-]/g, '');
			const num = parseFloat(cleaned);

			if (!isNaN(num) && cleaned !== '') {
				rowValues.push(num);
			} else {
				rowValues.push(null);
			}
		});

		// Track max column count
		if (rowValues.length > colCount) {
			colCount = rowValues.length;
		}

		values.push(rowValues);
		dataRowIndex++;
	});

	// Normalize rows to have same column count (pad with null)
	values.forEach((row) => {
		while (row.length < colCount) {
			row.push(null);
		}
	});

	return {
		values,
		rowCount: values.length,
		colCount,
		formulas
	};
}

/**
 * Get a cell value from TableData by reference
 *
 * @param tableData - The table data structure
 * @param col - 0-indexed column
 * @param row - 0-indexed row
 */
export function getCellValue(tableData: TableData, col: number, row: number): number | null {
	if (row < 0 || row >= tableData.rowCount) return null;
	if (col < 0 || col >= tableData.colCount) return null;
	return tableData.values[row]?.[col] ?? null;
}

/**
 * Get all values in a range
 *
 * @param tableData - The table data structure
 * @param startCol - Start column (0-indexed)
 * @param startRow - Start row (0-indexed)
 * @param endCol - End column (0-indexed)
 * @param endRow - End row (0-indexed)
 */
export function getRangeValues(
	tableData: TableData,
	startCol: number,
	startRow: number,
	endCol: number,
	endRow: number
): number[] {
	const values: number[] = [];

	for (let r = startRow; r <= endRow; r++) {
		for (let c = startCol; c <= endCol; c++) {
			const val = getCellValue(tableData, c, r);
			if (val !== null) {
				values.push(val);
			}
		}
	}

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

		// Create shared evaluation context per table for memoization
		// This allows formula-to-formula references to be cached across multiple cells
		const tableContexts: Map<number, EvaluationContext> = new Map();
		for (const tablePos of tableData.keys()) {
			tableContexts.set(tablePos, {
				evaluatedCache: new Map<string, number>(),
				visitedRefs: new Set<string>()
			});
		}

		// Second pass: find formula cells and their text positions
		const updates: Array<{ from: number; to: number; text: string }> = [];

		doc.descendants((node, pos, parent, index) => {
			// Look for tableCell nodes with formula attribute
			if (node.type.name === 'tableCell' && node.attrs?.formula) {
				const formula = node.attrs.formula as string;
				const colIndex = node.attrs.columnIndex as number;
				const cellCurrency = node.attrs.cellCurrency as string | null;
				const cellDecimals = node.attrs.cellDecimals as number | null;

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
					// Use cell formatting if available
					safeText = formatCellValue(result, cellCurrency, cellDecimals);
				} else if (formula.startsWith('=')) {
					// Row formula with A1-style references (e.g., =B2*C2)
					// Extract table data for cross-row evaluation
					const tableDataObj = extractTableData(tableJson);

					// Find the row index for this formula cell
					let formulaRowIndex = -1;
					let currentTablePos = -1;
					tableJson.content?.forEach((row: any, idx: number) => {
						if (row.attrs?.isTotal) return;
						const hasThisCell = row.content?.some(
							(c: any) => c.attrs?.formula === formula && c.attrs?.columnIndex === colIndex
						);
						if (hasThisCell) {
							formulaRowIndex = idx;
						}
					});

					// Find table position for shared context
					doc.nodesBetween(0, pos, (n, p) => {
						if (n.type.name === 'table' && p <= pos && p + n.nodeSize > pos) {
							currentTablePos = p;
						}
						return true;
					});

					// Get shared context for this table (enables formula-to-formula refs)
					const sharedContext = tableContexts.get(currentTablePos) || {
						evaluatedCache: new Map<string, number>(),
						visitedRefs: new Set<string>()
					};

					// Evaluate with full table context and shared evaluation context
					const evalResult = evaluateFormulaEngine(
						formula,
						tableDataObj,
						{
							col: colIndex,
							row: formulaRowIndex >= 0 ? formulaRowIndex : 0
						},
						sharedContext
					);

					if (evalResult.error) {
						safeText = 'Error';
					} else {
						// Use cell formatting if available
						safeText = formatCellValue(evalResult.value, cellCurrency, cellDecimals);
					}
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
