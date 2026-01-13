# Table Implementation for Pages

## Overview

Roadmap for adding table functionality to the TipTap-based Pages editor, including optional calculation/formula support.

**Status:** Not started
**Created:** 2026-01-13
**Owner:** Product/Engineering

---

## Background

The Pages system uses **TipTap editor** (ProseMirror-based) with rich text support but currently **lacks table functionality**. This document outlines a phased approach to add tables with optional calculation features.

### Current Editor State

**Installed Extensions:**
- StarterKit (headings, lists, bold/italic, blockquote, code block)
- Underline, Link, Placeholder
- TaskList, TaskItem (nested checklists)
- CodeBlockLowlight (syntax highlighting)

**Missing:** Table support

**Storage Format:** TipTap JSON (ProseMirror document model) stored as JSONB in PostgreSQL

**Location:** `src/lib/components/pages/PageEditor.svelte`

---

## Use Cases

### Primary Use Cases
1. **Meeting Notes** - Attendees list, agenda items, action items
2. **Project Briefs** - Timeline tables, resource allocation, budget breakdowns
3. **Decision Records** - Pros/cons tables, stakeholder matrix
4. **Weekly Updates** - Task status tables, metrics dashboards
5. **Technical Specs** - API endpoint tables, configuration matrices

### Calculation Use Cases
1. **Budget Tables** - Sum expenses, calculate totals
2. **Time Tracking** - Sum hours per person/project
3. **Scorecards** - Average ratings, weighted scores
4. **Resource Planning** - Sum allocations, calculate capacity
5. **Financial Reports** - Revenue totals, cost summaries

---

## Architecture

### TipTap Table Node Structure

Tables in TipTap follow a nested node model:

```json
{
  "type": "table",
  "content": [
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableHeader",
          "attrs": { "colspan": 1, "rowspan": 1, "colwidth": null },
          "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Name" }] }]
        },
        {
          "type": "tableHeader",
          "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Amount" }] }]
        }
      ]
    },
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Item 1" }] }]
        },
        {
          "type": "tableCell",
          "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "100" }] }]
        }
      ]
    }
  ]
}
```

**Key Properties:**
- **Nested structure:** Table → Row → Cell → Content
- **Cell attributes:** `colspan`, `rowspan`, `colwidth` for layout
- **Header cells:** Separate `tableHeader` node type
- **Content flexibility:** Cells can contain paragraphs, lists, or any block content

### Storage & Persistence

**Already supported:**
- ✅ PostgreSQL JSONB column (`pages.content`)
- ✅ Plain text extraction (recursively walks nodes)
- ✅ Full-text search on extracted content
- ✅ Word counting on extracted text
- ✅ Version history (stores complete JSON snapshots)

**No schema changes needed** - the existing architecture is content-agnostic.

---

## Implementation Phases

### Phase 1: Basic Tables (MVP)

**Goal:** Enable users to create, edit, and format tables in Pages.

**Complexity:** Low (1-2 hours)
**Risk:** Low - well-documented TipTap extension
**Dependencies:** None

#### Features

- Insert 3×3 table with header row
- Add/delete rows before/after
- Add/delete columns before/after
- Toggle header row
- Toggle header column
- Merge cells (horizontal/vertical)
- Split merged cells
- Tab navigation between cells
- Resize columns (drag handles)
- Delete entire table

#### Implementation Steps

**Step 1.1: Install Dependencies**

```bash
cd stratai-main
npm install @tiptap/extension-table@^3.15.3 \
            @tiptap/extension-table-row@^3.15.3 \
            @tiptap/extension-table-header@^3.15.3 \
            @tiptap/extension-table-cell@^3.15.3
```

**Step 1.2: Update PageEditor.svelte**

Add imports (after line 4):
```typescript
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
```

Add to extensions array (after TaskItem, around line 125):
```typescript
Table.configure({
  resizable: true,
  cellMinWidth: 50,
  lastColumnResizable: true,
  allowTableNodeSelection: false
}),
TableRow,
TableHeader,
TableCell,
```

**Step 1.3: Update EditorToolbar.svelte**

Add table button group (new section after "Insert" group):

```svelte
<!-- Table -->
{#if editor}
  <div class="toolbar-divider"></div>
  <div class="toolbar-group">
    <button
      type="button"
      class="toolbar-button"
      onclick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      title="Insert Table"
      disabled={!editor.can().insertTable()}
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
      </svg>
    </button>

    <!-- Contextual table buttons (show when cursor in table) -->
    {#if editor.isActive('table')}
      <button
        type="button"
        class="toolbar-button"
        onclick={() => editor.chain().focus().addColumnBefore().run()}
        title="Add Column Before"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
      </button>

      <button
        type="button"
        class="toolbar-button"
        onclick={() => editor.chain().focus().addRowBefore().run()}
        title="Add Row Before"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
      </button>

      <button
        type="button"
        class="toolbar-button"
        onclick={() => editor.chain().focus().deleteTable().run()}
        title="Delete Table"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
      </button>
    {/if}
  </div>
{/if}
```

**Step 1.4: Add Table Styling**

Add to `src/app.css` (in editor styles section):

```css
/* Tables */
.editor-body table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 1rem 0;
  overflow: hidden;
}

.editor-body th,
.editor-body td {
  min-width: 1em;
  border: 2px solid var(--editor-border);
  padding: 0.5rem 0.75rem;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
}

.editor-body th {
  font-weight: 600;
  text-align: left;
  background-color: var(--editor-bg-secondary);
  color: var(--editor-text);
}

.editor-body td {
  background-color: var(--editor-bg);
}

.editor-body .selectedCell {
  background-color: var(--editor-selection);
}

/* Column resize handle */
.editor-body .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: var(--editor-border-focus);
  cursor: col-resize;
  z-index: 10;
}

.editor-body .column-resize-handle:hover {
  background-color: var(--editor-border-focus);
}
```

#### Acceptance Criteria - Phase 1

**Automated Tests:**

1. **TypeScript compilation passes**
   ```bash
   cd stratai-main && npm run check
   ```
   Expected: 0 errors

2. **Table extension installed**
   ```bash
   npm list @tiptap/extension-table
   ```
   Expected: ^3.15.3

3. **Editor imports table extensions**
   ```bash
   grep "import.*Table.*from '@tiptap/extension-table" src/lib/components/pages/PageEditor.svelte
   ```
   Expected: 4 import statements

**Manual Tests:**

1. **Insert table**
   - Navigate to any page
   - Click "Insert Table" button in toolbar
   - Verify 3×3 table appears with header row
   - Verify table has borders and proper styling

2. **Edit table content**
   - Click into any cell
   - Type text
   - Verify content appears and saves

3. **Add row**
   - Click into table
   - Verify "Add Row" button appears in toolbar
   - Click button
   - Verify new row added below current row

4. **Add column**
   - Click into table
   - Click "Add Column" button
   - Verify new column added after current column

5. **Delete table**
   - Click into table
   - Click "Delete Table" button
   - Verify entire table removed

6. **Tab navigation**
   - Click first cell
   - Press Tab key
   - Verify cursor moves to next cell
   - Press Tab in last cell of row → moves to first cell of next row
   - Press Tab in last cell of table → creates new row

7. **Column resize**
   - Hover over column border
   - Verify resize cursor appears
   - Drag to resize
   - Verify column width changes

8. **Auto-save**
   - Insert table, add content
   - Wait 30 seconds
   - Verify "Saved" indicator appears
   - Refresh page
   - Verify table persists

9. **Version history**
   - Create page with table
   - Edit table
   - Save
   - View version history
   - Verify table appears in previous version

**Success Criteria:**
- ✅ All manual tests pass
- ✅ TypeScript compiles without errors
- ✅ Tables render correctly on page load
- ✅ Auto-save includes table content
- ✅ Version history preserves tables
- ✅ No regression in existing editor features

---

### Phase 2: Simple Calculations (Total Rows)

**Goal:** Add column sum/average rows to tables for basic calculations.

**Complexity:** Medium (3-5 hours)
**Risk:** Medium - custom extension work
**Dependencies:** Phase 1 (basic tables)

**When to implement:** After Phase 1 is stable and user demand for calculations is confirmed.

#### Features

- Add "Total Row" button to table toolbar (when table selected)
- Automatically sum numeric columns
- Display totals in footer row with different styling
- Support SUM, AVERAGE, COUNT, MIN, MAX
- Read-only total cells (users can't edit calculated values)
- Update totals on content change

#### Implementation Approach

**Option A: Custom TipTap Extension (Recommended)**

Create `TotalRow` extension that:
- Extends TableRow with `isTotal` attribute
- Marks cells as `formula` cells with type: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX"
- Recalculates on editor update
- Stores computed value in text content

**Option B: Custom TableCell Attributes**

Extend TableCell with:
- `formula` attribute storing calculation type
- `columnIndex` attribute for targeting
- Calculation logic in editor update handler

#### Implementation Steps

**Step 2.1: Create TotalRow Extension**

Create new file: `src/lib/components/pages/extensions/TotalRow.ts`

```typescript
import { Node, mergeAttributes } from '@tiptap/core';
import TableRow from '@tiptap/extension-table-row';

export interface TotalRowOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const TotalRow = Node.create<TotalRowOptions>({
  name: 'totalRow',

  content: 'tableCell+',

  tableRole: 'row',

  addAttributes() {
    return {
      isTotal: {
        default: true,
        parseHTML: element => element.getAttribute('data-total') === 'true',
        renderHTML: attributes => {
          if (!attributes.isTotal) return {};
          return { 'data-total': 'true', class: 'total-row' };
        }
      }
    };
  },

  parseHTML() {
    return [{ tag: 'tr[data-total="true"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['tr', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  }
});
```

**Step 2.2: Create FormulaCell Extension**

Create new file: `src/lib/components/pages/extensions/FormulaCell.ts`

```typescript
import TableCell from '@tiptap/extension-table-cell';
import { mergeAttributes } from '@tiptap/core';

export type FormulaType = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';

export const FormulaCell = TableCell.extend({
  name: 'formulaCell',

  addAttributes() {
    return {
      ...this.parent?.(),
      formula: {
        default: null,
        parseHTML: element => element.getAttribute('data-formula'),
        renderHTML: attributes => {
          if (!attributes.formula) return {};
          return {
            'data-formula': attributes.formula,
            class: 'formula-cell'
          };
        }
      },
      columnIndex: {
        default: null,
        parseHTML: element => parseInt(element.getAttribute('data-col-index') || '0'),
        renderHTML: attributes => {
          if (attributes.columnIndex === null) return {};
          return { 'data-col-index': attributes.columnIndex };
        }
      }
    };
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
    return ['td', attrs, 0];
  }
});
```

**Step 2.3: Create Calculation Service**

Create new file: `src/lib/services/table-calculations.ts`

```typescript
/**
 * Table Calculation Service
 *
 * Computes totals for table columns based on formula type.
 */

export type FormulaType = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';

/**
 * Extract numeric values from cells in a column
 */
function extractColumnValues(table: any, columnIndex: number): number[] {
  const values: number[] = [];

  // Walk table rows (skip total row)
  table.content?.forEach((row: any, rowIndex: number) => {
    if (row.attrs?.isTotal) return; // Skip total rows

    const cell = row.content?.[columnIndex];
    if (!cell) return;

    // Extract text from cell (walk nested paragraphs)
    const text = extractTextFromNode(cell);
    const num = parseFloat(text.trim().replace(/[^0-9.-]/g, ''));

    if (!isNaN(num)) {
      values.push(num);
    }
  });

  return values;
}

/**
 * Extract text from nested TipTap nodes
 */
function extractTextFromNode(node: any): string {
  if (node.text) return node.text;
  if (!node.content) return '';

  return node.content
    .map((child: any) => extractTextFromNode(child))
    .join(' ');
}

/**
 * Calculate formula result for a column
 */
export function calculateFormula(table: any, columnIndex: number, formula: FormulaType): number | null {
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
 * Format number for display
 */
export function formatCalculatedValue(value: number | null, formula: FormulaType): string {
  if (value === null) return '—';

  if (formula === 'COUNT') {
    return value.toString();
  }

  // Format with 2 decimal places for monetary values
  return value.toFixed(2);
}

/**
 * Recalculate all formulas in a table
 */
export function recalculateTable(tableNode: any): void {
  if (!tableNode || tableNode.type !== 'table') return;

  tableNode.content?.forEach((row: any) => {
    if (!row.attrs?.isTotal) return;

    row.content?.forEach((cell: any, colIndex: number) => {
      if (!cell.attrs?.formula) return;

      const result = calculateFormula(tableNode, colIndex, cell.attrs.formula);
      const formatted = formatCalculatedValue(result, cell.attrs.formula);

      // Update cell content (text node)
      if (cell.content?.[0]?.content?.[0]) {
        cell.content[0].content[0].text = formatted;
      }
    });
  });
}
```

**Step 2.4: Add Total Row Command**

Add to PageEditor.svelte extensions:

```typescript
import { Extension } from '@tiptap/core';
import { recalculateTable } from '$lib/services/table-calculations';

const TableCalculations = Extension.create({
  name: 'tableCalculations',

  addCommands() {
    return {
      addTotalRow: (formulas: FormulaType[]) => ({ commands, editor }) => {
        // Get current table
        const { $from } = editor.state.selection;
        const table = $from.node(-1);

        if (!table || table.type.name !== 'table') return false;

        const columnCount = table.firstChild?.childCount || 0;

        // Create total row cells
        const cells = Array.from({ length: columnCount }, (_, i) => ({
          type: 'formulaCell',
          attrs: {
            formula: formulas[i] || null,
            columnIndex: i
          },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '—' }]
            }
          ]
        }));

        // Insert total row
        return commands.insertContentAt(
          $from.end(-1),
          {
            type: 'totalRow',
            content: cells
          }
        );
      }
    };
  },

  // Recalculate on update
  onUpdate() {
    const { editor } = this;
    const { doc } = editor.state;

    doc.descendants((node) => {
      if (node.type.name === 'table') {
        recalculateTable(node);
      }
    });
  }
});
```

**Step 2.5: Update Toolbar with Total Row Button**

Add to EditorToolbar.svelte (in table section):

```svelte
{#if editor.isActive('table')}
  <!-- ... existing row/column buttons ... -->

  <div class="toolbar-divider"></div>

  <button
    type="button"
    class="toolbar-button"
    onclick={() => {
      // Default: sum all numeric columns
      const columnCount = getTableColumnCount(editor);
      const formulas = Array(columnCount).fill('SUM');
      editor.chain().focus().addTotalRow(formulas).run();
    }}
    title="Add Total Row"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
    </svg>
  </button>
{/if}
```

**Step 2.6: Add Styling for Total Rows**

Add to app.css:

```css
/* Total row styling */
.editor-body tr[data-total="true"] td {
  font-weight: 600;
  background-color: var(--editor-bg-secondary);
  border-top: 3px solid var(--editor-border-focus);
  color: var(--editor-text);
}

.editor-body .formula-cell {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  color: var(--color-primary-400);
  font-variant-numeric: tabular-nums;
}

.editor-body .formula-cell::before {
  content: '∑ ';
  opacity: 0.5;
  margin-right: 0.25rem;
}
```

#### Acceptance Criteria - Phase 2

**Automated Tests:**

1. **Calculation service exists**
   ```bash
   ls src/lib/services/table-calculations.ts
   ```

2. **TypeScript compilation passes**
   ```bash
   cd stratai-main && npm run check
   ```

**Manual Tests:**

1. **Insert table with data**
   - Create table with 3 rows
   - Add numeric data to columns (e.g., "100", "200", "300")
   - Add text to first column (labels)

2. **Add total row**
   - Click "Add Total Row" button
   - Verify new row appears at bottom
   - Verify totals calculated correctly
   - Example: Column with [100, 200, 300] shows 600

3. **Totals update on edit**
   - Change a cell value (e.g., 100 → 150)
   - Verify total updates automatically (600 → 650)

4. **Mixed content handling**
   - Add text to numeric column ("N/A")
   - Verify total ignores non-numeric values
   - Verify no errors thrown

5. **Empty cells**
   - Leave cells empty
   - Verify total still calculates correctly
   - Verify empty cells treated as zero

6. **Total row styling**
   - Verify total row has different background color
   - Verify bold text
   - Verify top border is thicker
   - Verify sum symbol (∑) appears before values

7. **Total row is read-only**
   - Click into total cell
   - Try to type
   - Verify content doesn't change (or shows formula instead)

8. **Save and reload**
   - Create table with totals
   - Save page
   - Reload page
   - Verify totals persist and recalculate correctly

**Success Criteria:**
- ✅ All Phase 1 features still work
- ✅ Total rows calculate correctly (SUM)
- ✅ Totals update automatically on content change
- ✅ Total rows visually distinguished from data rows
- ✅ Non-numeric values handled gracefully
- ✅ Persistence works (save/load preserves formulas)

---

### Phase 3: Advanced Formulas (Excel-like)

**Goal:** Full spreadsheet formula support with cell references.

**Complexity:** High (2-4 weeks)
**Risk:** High - significant custom development
**Dependencies:** Phase 1 (basic tables)

**When to implement:** Only if strong user demand for complex calculations. Most users satisfied with Phase 2 totals.

#### Features

- Excel-like formula syntax: `=SUM(A1:A5)`, `=B2*C2`, `=IF(A1>100, "High", "Low")`
- 100+ functions (SUM, AVERAGE, COUNT, IF, VLOOKUP, CONCATENATE, etc.)
- Cell reference notation (A1, B2, C3:D10 ranges)
- Formula bar above table (like Excel)
- Auto-recalculation on dependencies
- Circular reference detection and warning
- Formula error handling (e.g., #DIV/0!, #REF!, #VALUE!)

#### Implementation Approach

**Use HyperFormula** (headless spreadsheet engine):

```bash
npm install hyperformula@^2.8.0
```

**Architecture:**

```typescript
// 1. Create cell registry (position → ID mapping)
const cellRegistry = new Map<string, CellPosition>();
// A1 → { row: 0, col: 0 }

// 2. Initialize HyperFormula instance
const hf = HyperFormula.buildFromArray([
  ['100', '200', '=A1+B1'],
  ['150', '250', '=SUM(A1:B2)']
]);

// 3. On cell edit → update HyperFormula → get results → update TipTap content
hf.setCellContents({ col: 0, row: 0, sheet: 0 }, [['150']]);
const result = hf.getCellValue({ col: 2, row: 0, sheet: 0 });

// 4. Sync TipTap content with calculated results
```

**Custom Extension:** Create `FormulaTableCell` that:
- Stores formula in `formula` attribute
- Displays result in text content
- Shows formula in UI when selected
- Updates on recalculation events

#### Implementation Steps

**Step 3.1: Install HyperFormula**
```bash
npm install hyperformula@^2.8.0
```

**Step 3.2: Create Formula Service**

Create `src/lib/services/formula-engine.ts` (wrapper around HyperFormula):

```typescript
import { HyperFormula, SimpleCellAddress } from 'hyperformula';

export class FormulaEngine {
  private hf: HyperFormula;
  private cellMap: Map<string, SimpleCellAddress>;

  constructor() {
    this.hf = HyperFormula.buildEmpty();
    this.cellMap = new Map();
  }

  // Convert table JSON to HyperFormula 2D array
  loadTable(tableNode: any): void { ... }

  // Update cell formula
  setFormula(cellRef: string, formula: string): void { ... }

  // Get calculated value
  getValue(cellRef: string): any { ... }

  // Recalculate all formulas
  recalculate(): void { ... }

  // Check for errors
  hasError(cellRef: string): boolean { ... }
}
```

**Step 3.3: Create FormulaBar Component**

Create `src/lib/components/pages/FormulaBar.svelte`:

```svelte
<script lang="ts">
  let { editor, selectedCell } = $props<{
    editor: Editor;
    selectedCell: { row: number; col: number } | null;
  }>();

  let formula = $state('');
  let cellRef = $derived(selectedCell ? `${getColumnLetter(selectedCell.col)}${selectedCell.row + 1}` : null);

  // Sync formula when cell selected
  $effect(() => {
    if (selectedCell) {
      formula = getCellFormula(editor, selectedCell) || '';
    }
  });

  function handleFormulaChange() {
    if (!selectedCell) return;
    updateCellFormula(editor, selectedCell, formula);
  }
</script>

<div class="formula-bar">
  <span class="cell-ref">{cellRef || '—'}</span>
  <input
    type="text"
    class="formula-input"
    bind:value={formula}
    onchange={handleFormulaChange}
    placeholder={selectedCell ? "Enter value or =formula" : "Select a cell"}
    disabled={!selectedCell}
  />
</div>
```

**Step 3.4: Integrate into PageEditor**

- Add FormulaBar above editor
- Track selected cell position
- Sync formula on cell selection
- Recalculate on content update
- Display errors in cell (red background, #VALUE! text)

**Step 3.5: Add Formula Button Dropdown**

Add to toolbar: Dropdown with common formulas:
- SUM
- AVERAGE
- COUNT
- MIN
- MAX
- IF
- CONCATENATE

#### Acceptance Criteria - Phase 3

**Automated Tests:**

1. **HyperFormula installed**
   ```bash
   npm list hyperformula
   ```
   Expected: ^2.8.0

2. **Formula service exists**
   ```bash
   ls src/lib/services/formula-engine.ts
   ```

3. **TypeScript compilation passes**
   ```bash
   cd stratai-main && npm run check
   ```

**Unit Tests** (create in `src/lib/services/formula-engine.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import { calculateFormula } from './table-calculations';

describe('Table Calculations', () => {
  it('calculates SUM correctly', () => {
    const table = createMockTable([['100'], ['200'], ['300']]);
    expect(calculateFormula(table, 0, 'SUM')).toBe(600);
  });

  it('calculates AVERAGE correctly', () => {
    const table = createMockTable([['100'], ['200'], ['300']]);
    expect(calculateFormula(table, 0, 'AVG')).toBe(200);
  });

  it('ignores non-numeric values', () => {
    const table = createMockTable([['100'], ['N/A'], ['200']]);
    expect(calculateFormula(table, 0, 'SUM')).toBe(300);
  });

  it('handles empty cells', () => {
    const table = createMockTable([['100'], [''], ['200']]);
    expect(calculateFormula(table, 0, 'SUM')).toBe(300);
  });
});
```

**Manual Tests:**

1. **Cell reference formulas**
   - Create 3×3 table
   - Enter "100" in A1
   - Enter "200" in A2
   - Enter "=A1+A2" in A3
   - Verify A3 shows "300"

2. **Range formulas**
   - Enter values in A1:A5
   - Enter "=SUM(A1:A5)" in A6
   - Verify sum is correct
   - Change value in A3
   - Verify A6 updates automatically

3. **Cross-column formulas**
   - Enter "100" in A1, "2" in B1
   - Enter "=A1*B1" in C1
   - Verify C1 shows "200"

4. **IF function**
   - Enter "150" in A1
   - Enter "=IF(A1>100, 'High', 'Low')" in B1
   - Verify B1 shows "High"
   - Change A1 to "50"
   - Verify B1 updates to "Low"

5. **Error handling**
   - Enter "=A1/0" (divide by zero)
   - Verify shows "#DIV/0!" error
   - Enter "=XYZ123" (invalid reference)
   - Verify shows "#REF!" error

6. **Formula bar**
   - Click cell with formula
   - Verify formula bar shows formula (not result)
   - Click cell with value
   - Verify formula bar shows value

7. **Circular references**
   - Enter "=B1" in A1
   - Enter "=A1" in B1
   - Verify circular reference detected
   - Verify error message shown

8. **Performance**
   - Create 20×20 table with formulas
   - Edit values
   - Verify recalculation happens quickly (<100ms)
   - Verify no UI lag

**Success Criteria:**
- ✅ All Phase 1 & 2 features work
- ✅ Cell reference formulas calculate correctly
- ✅ Range formulas (A1:A5) work
- ✅ Auto-recalculation on dependencies
- ✅ Formula bar shows formulas when cell selected
- ✅ Errors handled gracefully (#DIV/0!, #REF!, etc.)
- ✅ Circular references detected
- ✅ Performance acceptable (<100ms recalculation)
- ✅ Formulas persist on save/reload

---

## Technical Considerations

### Bundle Size Impact

| Phase | Package | Size (gzipped) | Total Added |
|-------|---------|----------------|-------------|
| Phase 1 | @tiptap/extension-table* (×4) | ~15 KB | ~15 KB |
| Phase 2 | Custom extensions | ~5 KB | ~20 KB |
| Phase 3 | HyperFormula | ~150 KB | ~170 KB |

**Impact:**
- Phase 1: Negligible (~1% of typical bundle)
- Phase 2: Minimal
- Phase 3: Moderate (~10% increase) - consider code splitting

**Mitigation for Phase 3:**
- Lazy load HyperFormula only when table with formulas is present
- Dynamic import: `const { HyperFormula } = await import('hyperformula')`

### Database Schema Changes

**None required!** The current schema already supports:
- ✅ JSONB content storage (any node structure)
- ✅ Plain text extraction (recursively walks nodes)
- ✅ Version history (stores complete snapshots)
- ✅ Full-text search indexing

Tables (with or without formulas) serialize naturally into TipTap JSON.

### Backward Compatibility

All phases are **additive only**:
- Phase 1: Adds table nodes (existing content unaffected)
- Phase 2: Adds total row nodes (regular tables unaffected)
- Phase 3: Adds formula attributes (regular cells unaffected)

**Migration:** None needed - content gracefully upgrades as users edit.

### Performance Considerations

**Phase 1 (Basic Tables):**
- ✅ No performance impact - TipTap handles efficiently
- Tables with 100s of cells render fine

**Phase 2 (Totals):**
- ⚠️ Recalculation on every keystroke
- Mitigation: Debounce recalculation (only on blur or 500ms idle)
- Should handle tables with <50 rows easily

**Phase 3 (Formulas):**
- ⚠️ Complex formula graphs can be slow
- HyperFormula is optimized but has limits (~10k cells)
- Mitigation: Async recalculation, loading indicator
- Consider limiting table size (e.g., 100×100 max)

---

## Alternative Approaches

### If Calculations Are Critical from Day 1

Instead of extending TipTap tables, consider:

**Option A: Embed Handsontable**
- Commercial spreadsheet component ($890/dev license)
- Full Excel-like features out of the box
- Proven reliability
- Heavier integration

**Option B: Separate Spreadsheet Feature**
- Create dedicated "Spreadsheet" page type
- Use ReactGrid or Handsontable for calculations
- Keep TipTap for narrative documents
- Clear separation of concerns

**Option C: Notion-like Databases**
- Structured data tables (separate from documents)
- Calculated columns, filters, views
- More powerful than inline tables
- Bigger architectural shift

---

## Recommended Path Forward

### Immediate (This Week)
✅ **Phase 1: Basic Tables**
- Low effort, high value
- Enables 90% of table use cases
- Foundation for future enhancements
- No risk to existing features

### Near-term (Next Month)
⏸️ **Phase 2: Simple Totals**
- Wait for user feedback on Phase 1
- Only implement if users ask for calculations
- Quick to add once Phase 1 is stable

### Future (3+ Months)
⏸️ **Phase 3: Advanced Formulas**
- Only if Phase 2 proves insufficient
- Consider if users need complex calculations
- Evaluate Handsontable alternative at this point

---

## Success Metrics

**Phase 1:**
- % of pages that include tables
- Average table size (rows × cols)
- User feedback on table UX

**Phase 2:**
- % of tables that use total rows
- Types of calculations used (sum vs avg vs count)
- Performance of recalculation

**Phase 3:**
- % of tables that use formulas
- Complexity of formulas (simple vs nested)
- Support burden (formula errors, circular refs)

---

## References

### TipTap Table Documentation
- [Table Extension](https://tiptap.dev/docs/editor/extensions/nodes/table) - Official docs
- [ProseMirror Tables](https://github.com/ProseMirror/prosemirror-tables) - Foundation library
- [TableKit](https://tiptap.dev/docs/editor/extensions/functionality/table-kit) - All-in-one bundle

### Formula Engines
- [HyperFormula](https://hyperformula.handsontable.com/) - 386 functions, Excel-compatible
- [Formula.js](https://formulajs.info/) - JavaScript Excel functions
- [hot-formula-parser](https://github.com/handsontable/formula-parser) - Excel parser

### Alternative Solutions
- [Handsontable](https://handsontable.com/) - Commercial spreadsheet ($890/dev)
- [ReactGrid](https://reactgrid.com/) - OSS spreadsheet for React
- [react-spreadsheet](https://github.com/iddan/react-spreadsheet) - Lightweight formulas

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-13 | Phased approach (basic → totals → formulas) | Incremental value delivery, validate demand before complexity |
| 2026-01-13 | Start with TipTap extension (not separate component) | Maintains unified editing experience |
| 2026-01-13 | Use HyperFormula for Phase 3 | Most complete formula engine, Excel-compatible |

---

## Open Questions

1. **Should totals support multiple formula types per row?**
   - Single formula type per row (simpler UX)
   - Or per-column formula selection (more flexible)

2. **How to handle formula UI?**
   - Show formulas inline when editing
   - Or separate formula bar (Excel-style)

3. **Should formulas be visible to non-technical users?**
   - Hide formula syntax, just show results
   - Or expose for power users with toggle

4. **What's the maximum table size we support?**
   - Recommend: 50 rows × 20 columns
   - Hard limit: 100 rows × 50 columns

5. **Should we support CSV import/export for tables?**
   - Useful for data transfer
   - Could leverage existing export infrastructure

---

## Notes

- **Y.js compatibility:** TipTap tables work with Y.js for future real-time collaboration
- **Mobile editing:** Tables can be challenging on mobile - consider read-only on small screens
- **Accessibility:** Table headers must have proper ARIA labels
- **Print/Export:** Tables should export cleanly to DOCX and PDF (test this)
- **Copy/paste:** TipTap tables support copying from Excel/Google Sheets

---

## File Locations

**Editor Components:**
- `src/lib/components/pages/PageEditor.svelte` - Main editor
- `src/lib/components/pages/EditorToolbar.svelte` - Formatting toolbar
- `src/lib/types/page.ts` - TipTap content types

**Future Files (to create):**
- `src/lib/components/pages/extensions/TotalRow.ts` (Phase 2)
- `src/lib/components/pages/extensions/FormulaCell.ts` (Phase 2)
- `src/lib/services/table-calculations.ts` (Phase 2)
- `src/lib/services/formula-engine.ts` (Phase 3)
- `src/lib/components/pages/FormulaBar.svelte` (Phase 3)

**Documentation:**
- `docs/DOCUMENT_SYSTEM.md` - Pages architecture (renamed from Documents)
- `docs/GUIDED_CREATION.md` - Template system
- `ENTITY_MODEL.md` - Data model reference
