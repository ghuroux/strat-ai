<script lang="ts">
	/**
	 * FormulaBar.svelte - Excel-style formula bar for table cells
	 *
	 * Phase 3: Updated to use A1-style cell references (B2, C3) instead of [n] indices.
	 * Phase 3.8: Added currency and decimal formatting controls.
	 *
	 * Appears when:
	 * 1. Building a new formula (formula mode active)
	 * 2. Selecting a cell with an existing formula
	 *
	 * Features:
	 * - Shows formula being built with live preview
	 * - Allows direct text input of formulas
	 * - Shows calculated result
	 * - Enter to save, Escape to cancel
	 * - Displays cell reference (e.g., "D2") when cell selected
	 * - Currency selection (USD, EUR, GBP, ZAR, etc.)
	 * - Decimal places toggle (0 or 2)
	 */

	import { slide } from 'svelte/transition';
	import { evaluateFormula } from '$lib/services/formula-engine';
	import { buildCellRef } from '$lib/services/cell-references';
	import { getDisplayFormula } from '$lib/services/formula-parser';
	import type { TableData } from '$lib/services/table-calculations';

	// Supported currencies
	const CURRENCIES = [
		{ code: '', symbol: '', label: 'None' },
		{ code: 'USD', symbol: '$', label: '$ USD' },
		{ code: 'EUR', symbol: '€', label: '€ EUR' },
		{ code: 'GBP', symbol: '£', label: '£ GBP' },
		{ code: 'ZAR', symbol: 'R', label: 'R ZAR' },
		{ code: 'JPY', symbol: '¥', label: '¥ JPY' }
	];

	interface FormulaMode {
		active: boolean;
		cellPos: number;
		rowIndex: number;
		colIndex: number;
		formula: string;
		previousValue: string;
	}

	interface CellFormat {
		currency?: string; // Currency code like 'USD', 'EUR', etc.
		decimals?: number; // 0 or 2
	}

	interface Props {
		formulaMode: FormulaMode | null;
		selectedCellFormula?: string | null; // Formula from currently selected cell (if any)
		tableData?: TableData | null; // Full table data for cross-row evaluation
		currentCell?: { col: number; row: number } | null; // Current cell position
		cellFormat?: CellFormat | null; // Current cell format
		onFormulaChange?: (formula: string) => void;
		onSave?: () => void;
		onCancel?: () => void;
		onClear?: () => void; // Called when user wants to clear the formula
		onEditExisting?: () => void; // Called when user wants to edit an existing formula
		onFormatChange?: (format: CellFormat) => void; // Called when format changes
	}

	let {
		formulaMode,
		selectedCellFormula = null,
		tableData = null,
		currentCell = null,
		cellFormat = null,
		onFormulaChange,
		onSave,
		onCancel,
		onClear,
		onEditExisting,
		onFormatChange
	}: Props = $props();

	// Currency dropdown state
	let showCurrencyDropdown = $state(false);

	// Determine if we should show the bar
	let isVisible = $derived(formulaMode?.active || selectedCellFormula !== null);

	// The formula to display
	let displayFormula = $derived(formulaMode?.formula || selectedCellFormula || '');

	// Is this an editable state?
	let isEditing = $derived(formulaMode?.active === true);

	// Build cell reference string (e.g., "D2")
	let cellRefDisplay = $derived.by(() => {
		if (formulaMode?.active) {
			return buildCellRef(formulaMode.colIndex, formulaMode.rowIndex);
		}
		if (currentCell) {
			return buildCellRef(currentCell.col, currentCell.row);
		}
		return '';
	});

	// Get current format values with defaults
	let currentCurrency = $derived(cellFormat?.currency || '');
	let currentDecimals = $derived(cellFormat?.decimals ?? 2);

	// Calculate preview result using new formula engine with TableData
	let previewResult = $derived.by(() => {
		if (!displayFormula || displayFormula === '=') return null;

		// Need table data and current cell for evaluation
		if (!tableData) return '...';

		const evalCell = formulaMode?.active
			? { col: formulaMode.colIndex, row: formulaMode.rowIndex }
			: currentCell;

		if (!evalCell) return '...';

		const result = evaluateFormula(displayFormula, tableData, evalCell);

		if (result.error) {
			return result.error === 'Circular reference' ? 'Circular!' : 'Invalid';
		}

		if (result.value === null) return '—';

		// Format with current format settings
		return formatValue(result.value, currentCurrency, currentDecimals);
	});

	// Format a value with currency and decimals
	function formatValue(value: number, currency: string, decimals: number): string {
		const currencyInfo = CURRENCIES.find((c) => c.code === currency);
		const symbol = currencyInfo?.symbol || '';

		const formatted = value.toLocaleString('en-US', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		});

		return symbol ? `${symbol}${formatted}` : formatted;
	}

	// Handle currency change
	function handleCurrencyChange(code: string) {
		showCurrencyDropdown = false;
		onFormatChange?.({ currency: code, decimals: currentDecimals });
	}

	// Toggle decimals between 0 and 2
	function handleDecimalsToggle() {
		const newDecimals = currentDecimals === 0 ? 2 : 0;
		onFormatChange?.({ currency: currentCurrency, decimals: newDecimals });
	}

	// Handle input changes
	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		let value = input.value;

		// Ensure formula starts with =
		if (!value.startsWith('=')) {
			value = '=' + value;
		}

		onFormulaChange?.(value);
	}

	// Handle keyboard in the input
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			onSave?.();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			onCancel?.();
		}
	}

	// Format formula for display with syntax highlighting (A1-style refs)
	function formatFormulaDisplay(formula: string): string {
		if (!formula) return '';

		// Highlight A1-style cell references (B2, C3, AA10, etc.)
		return formula.replace(/\b([A-Z]+)(\d+)\b/g, '<span class="cell-ref">$1$2</span>');
	}
</script>

{#if isVisible}
	<div class="formula-bar" transition:slide={{ duration: 200 }}>
		<!-- Cell reference (e.g., "D2") -->
		{#if cellRefDisplay}
			<div class="cell-ref-label">
				<span class="cell-ref-text">{cellRefDisplay}</span>
			</div>
		{/if}

		<div class="formula-bar-label">
			<span class="fx">fx</span>
		</div>

		<div class="formula-bar-content">
			{#if isEditing}
				<!-- Editable input when building formula -->
				<input
					type="text"
					class="formula-input"
					value={displayFormula}
					oninput={handleInput}
					onkeydown={handleKeydown}
					placeholder="Type formula or click cells..."
					autofocus
				/>
			{:else}
				<!-- Read-only display for existing formula -->
				<div class="formula-display" onclick={() => onEditExisting?.()}>
					<span class="formula-text">{@html formatFormulaDisplay(displayFormula)}</span>
					<span class="edit-hint">Click to edit</span>
				</div>
			{/if}
		</div>

		{#if previewResult}
			<div class="formula-preview">
				<span class="preview-label">=</span>
				<span class="preview-value" class:error={previewResult === 'Invalid' || previewResult === 'Error'}>
					{previewResult}
				</span>
			</div>
		{/if}

		{#if isEditing}
			<div class="formula-actions">
				<button type="button" class="action-btn cancel" onclick={() => onCancel?.()} title="Cancel (Esc)">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
				<button type="button" class="action-btn clear" onclick={() => onClear?.()} title="Clear cell">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="3 6 5 6 21 6" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					</svg>
				</button>
				<button type="button" class="action-btn save" onclick={() => onSave?.()} title="Save (Enter)">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="20 6 9 17 4 12" />
					</svg>
				</button>
			</div>
		{/if}

		<!-- Format controls (always visible when bar is shown) -->
		<div class="format-controls">
			<!-- Currency selector -->
			<div class="currency-selector">
				<button
					type="button"
					class="format-btn"
					class:active={currentCurrency !== ''}
					onclick={() => (showCurrencyDropdown = !showCurrencyDropdown)}
					title="Currency format"
				>
					{currentCurrency ? CURRENCIES.find((c) => c.code === currentCurrency)?.symbol : '$'}
				</button>
				{#if showCurrencyDropdown}
					<div class="currency-dropdown">
						{#each CURRENCIES as currency}
							<button
								type="button"
								class="currency-option"
								class:selected={currentCurrency === currency.code}
								onclick={() => handleCurrencyChange(currency.code)}
							>
								{currency.label}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Decimals toggle -->
			<button
				type="button"
				class="format-btn"
				class:active={currentDecimals === 0}
				onclick={handleDecimalsToggle}
				title={currentDecimals === 0 ? 'Show decimals' : 'Hide decimals'}
			>
				.{currentDecimals === 0 ? '0' : '00'}
			</button>
		</div>
	</div>
{/if}

<style>
	.formula-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: var(--editor-bg, white);
		border: 1px solid var(--editor-border, #e2e8f0);
		border-radius: 8px;
		font-size: 0.875rem;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -2px rgba(0, 0, 0, 0.1);
		backdrop-filter: blur(8px);
		transition:
			box-shadow 200ms ease,
			transform 200ms ease;
	}

	/* Subtle lift effect on hover */
	.formula-bar:hover {
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -4px rgba(0, 0, 0, 0.1);
	}

	/* Dark mode adjustments */
	:global(.dark) .formula-bar {
		background: var(--editor-bg, #1e293b);
		border-color: var(--editor-border, #334155);
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.3),
			0 2px 4px -2px rgba(0, 0, 0, 0.3);
	}

	/* Cell reference label (e.g., "D2") */
	.cell-ref-label {
		display: flex;
		align-items: center;
		padding: 0.25rem 0.5rem;
		background: var(--toolbar-button-hover, rgba(0, 0, 0, 0.05));
		border-radius: 4px;
		border: 1px solid var(--editor-border, #e2e8f0);
	}

	.cell-ref-text {
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
		font-weight: 600;
		color: var(--editor-text, #1e293b);
		font-size: 0.8125rem;
	}

	.formula-bar-label {
		display: flex;
		align-items: center;
		padding: 0.25rem 0.5rem;
		background: var(--toolbar-button-hover, rgba(0, 0, 0, 0.05));
		border-radius: 4px;
	}

	.fx {
		font-style: italic;
		font-weight: 600;
		color: #3b82f6;
		font-size: 0.8125rem;
	}

	.formula-bar-content {
		flex: 1;
		min-width: 0;
	}

	.formula-input {
		width: 100%;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--editor-border, #e2e8f0);
		border-radius: 4px;
		background: var(--editor-bg, white);
		color: var(--editor-text, #1e293b);
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
		font-size: 0.875rem;
	}

	.formula-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}

	.formula-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		background: var(--editor-bg, white);
		border: 1px solid transparent;
		border-radius: 4px;
		cursor: pointer;
		transition: border-color 150ms ease;
	}

	.formula-display:hover {
		border-color: var(--editor-border, #e2e8f0);
	}

	.formula-text {
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
		color: var(--editor-text, #1e293b);
	}

	.formula-text :global(.cell-ref) {
		color: #3b82f6;
		font-weight: 500;
	}

	.edit-hint {
		color: var(--editor-text-secondary, #64748b);
		font-size: 0.75rem;
		opacity: 0;
		transition: opacity 150ms ease;
	}

	.formula-display:hover .edit-hint {
		opacity: 1;
	}

	.formula-preview {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.75rem;
		background: rgba(34, 197, 94, 0.1);
		border-radius: 4px;
		color: #16a34a;
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
	}

	.preview-label {
		opacity: 0.6;
	}

	.preview-value {
		font-weight: 500;
	}

	.preview-value.error {
		color: #dc2626;
		background: rgba(239, 68, 68, 0.1);
	}

	.formula-actions {
		display: flex;
		gap: 0.25rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 150ms ease;
	}

	.action-btn svg {
		width: 16px;
		height: 16px;
	}

	.action-btn.cancel {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
	}

	.action-btn.cancel:hover {
		background: rgba(239, 68, 68, 0.2);
	}

	.action-btn.clear {
		background: rgba(107, 114, 128, 0.1);
		color: #6b7280;
	}

	.action-btn.clear:hover {
		background: rgba(107, 114, 128, 0.2);
	}

	.action-btn.save {
		background: rgba(34, 197, 94, 0.1);
		color: #16a34a;
	}

	.action-btn.save:hover {
		background: rgba(34, 197, 94, 0.2);
	}

	/* Format controls */
	.format-controls {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding-left: 0.5rem;
		border-left: 1px solid var(--editor-border, #e2e8f0);
		margin-left: 0.25rem;
	}

	.currency-selector {
		position: relative;
	}

	.format-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 32px;
		height: 28px;
		padding: 0 0.5rem;
		border: 1px solid var(--editor-border, #e2e8f0);
		border-radius: 4px;
		background: var(--editor-bg, white);
		color: var(--editor-text, #1e293b);
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.format-btn:hover {
		background: var(--toolbar-button-hover, rgba(0, 0, 0, 0.05));
		border-color: #3b82f6;
	}

	.format-btn.active {
		background: rgba(59, 130, 246, 0.1);
		border-color: #3b82f6;
		color: #3b82f6;
	}

	.currency-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 4px;
		min-width: 100px;
		background: var(--editor-bg, white);
		border: 1px solid var(--editor-border, #e2e8f0);
		border-radius: 6px;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -2px rgba(0, 0, 0, 0.1);
		z-index: 100;
		overflow: hidden;
	}

	.currency-option {
		display: block;
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: none;
		background: transparent;
		color: var(--editor-text, #1e293b);
		font-size: 0.8125rem;
		text-align: left;
		cursor: pointer;
		transition: background 150ms ease;
	}

	.currency-option:hover {
		background: var(--toolbar-button-hover, rgba(0, 0, 0, 0.05));
	}

	.currency-option.selected {
		background: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
		font-weight: 500;
	}

	/* Dark mode */
	:global(.dark) .format-btn {
		background: var(--editor-bg, #1e293b);
		border-color: var(--editor-border, #334155);
		color: var(--editor-text, #e2e8f0);
	}

	:global(.dark) .currency-dropdown {
		background: var(--editor-bg, #1e293b);
		border-color: var(--editor-border, #334155);
	}

	:global(.dark) .currency-option {
		color: var(--editor-text, #e2e8f0);
	}
</style>
