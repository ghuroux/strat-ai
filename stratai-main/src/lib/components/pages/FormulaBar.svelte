<script lang="ts">
	/**
	 * FormulaBar.svelte - Excel-style formula bar for table cells
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
	 */

	import { slide } from 'svelte/transition';
	import { parseFormula, evaluateFormula, formatResult } from '$lib/services/formula-parser';

	interface FormulaMode {
		active: boolean;
		cellPos: number;
		rowIndex: number;
		colIndex: number;
		formula: string;
		previousValue: string;
	}

	interface Props {
		formulaMode: FormulaMode | null;
		selectedCellFormula?: string | null; // Formula from currently selected cell (if any)
		rowValues?: (number | null)[]; // Current row values for preview
		onFormulaChange?: (formula: string) => void;
		onSave?: () => void;
		onCancel?: () => void;
		onEditExisting?: () => void; // Called when user wants to edit an existing formula
	}

	let {
		formulaMode,
		selectedCellFormula = null,
		rowValues = [],
		onFormulaChange,
		onSave,
		onCancel,
		onEditExisting
	}: Props = $props();

	// Determine if we should show the bar
	let isVisible = $derived(formulaMode?.active || selectedCellFormula !== null);

	// The formula to display
	let displayFormula = $derived(formulaMode?.formula || selectedCellFormula || '');

	// Is this an editable state?
	let isEditing = $derived(formulaMode?.active === true);

	// Calculate preview result
	let previewResult = $derived.by(() => {
		if (!displayFormula || displayFormula === '=') return null;

		const parsed = parseFormula(displayFormula);
		if (!parsed.isValid) return 'Invalid';

		if (rowValues.length === 0) return '...';

		const result = evaluateFormula(parsed, rowValues);
		return formatResult(result);
	});

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

	// Format formula for display with syntax highlighting
	function formatFormulaDisplay(formula: string): string {
		if (!formula) return '';

		// Highlight column references [n]
		return formula.replace(/\[(\d+)\]/g, '<span class="col-ref">[$1]</span>');
	}
</script>

{#if isVisible}
	<div class="formula-bar" transition:slide={{ duration: 200 }}>
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
				<button type="button" class="action-btn save" onclick={() => onSave?.()} title="Save (Enter)">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="20 6 9 17 4 12" />
					</svg>
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.formula-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--editor-bg-secondary, #f8fafc);
		border-bottom: 1px solid var(--editor-border, #e2e8f0);
		font-size: 0.875rem;
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

	.formula-text :global(.col-ref) {
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

	.action-btn.save {
		background: rgba(34, 197, 94, 0.1);
		color: #16a34a;
	}

	.action-btn.save:hover {
		background: rgba(34, 197, 94, 0.2);
	}
</style>
