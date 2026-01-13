# Table Implementation for Pages

## Overview

Roadmap for adding table functionality to the TipTap-based Pages editor, including optional calculation/formula support.

**Status:** Phase 2 Complete
**Created:** 2026-01-13
**Updated:** 2026-01-13
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

### Phase 2.5: Row Formulas & Styling (Proposals)

**Status:** Ready for Development
**Goal:** Enable professional pricing tables with row calculations (Qty × Rate = Total), column sums, and visual styling.

**Complexity:** Medium (1-2 weeks)
**Risk:** Medium - builds on existing Phase 2 infrastructure
**Dependencies:** Phase 2 (simple totals) ✅ Complete

**Use Case:** Proposal pricing breakdowns

#### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Formula storage | Column indices (`=[1]*[2]`) | Survives column renames; only deletion invalidates |
| Formula display | Column names (`Qty × Rate`) | User-friendly, readable in UI |
| Outside click behavior | Save partial formula | Less frustrating than losing work |
| Circular reference | Prevent in UI + validate | Better UX than error recovery after the fact |
| ∑ prefix | Optional (default: off for row formulas) | Clean professional appearance for proposals |
| Implementation order | Quick wins first | Colors → styling → parser → UX validates approach |

```
| Description        | Qty | Rate   | Line Total |
|--------------------|-----|--------|------------|
| Consulting         | 10  | 150.00 | =B×C       |  ← Row formula
| Development        | 40  | 120.00 | =B×C       |  ← Row formula
| Project Management | 8   | 100.00 | =B×C       |  ← Row formula
|--------------------|-----|--------|------------|
| **Subtotal**       |     |        | =SUM(D)    |  ← Column sum
| VAT (15%)          |     |        | =D5×0.15   |  ← Reference + constant
| **Grand Total**    |     |        | =D5+D6     |  ← Row references
```

#### Features

**2.5.1 Row Formulas (Click-to-Build)**
- User types `=` in a cell to enter formula mode
- Visual indicator shows formula mode is active
- User clicks cells to add references (cells highlight on selection)
- User types operators: `+`, `-`, `*`, `/`
- User types constants: numbers like `0.15`
- User presses Enter to evaluate and exit formula mode
- Formula stored in cell attributes, result displayed

**2.5.2 Column Formulas (Enhanced)**
- Extend existing SUM with PRODUCT, AVG, MIN, MAX
- Remove mandatory ∑ prefix (make optional via attribute)
- Clean, professional appearance

**2.5.3 Cell Background Colors**
- Muted, high-opacity color palette (subtle differentiation)
- Apply to individual cells or entire rows
- Color picker in contextual toolbar (when in table)

**2.5.4 Clean Styling**
- Optional formula prefix (∑) - off by default for row formulas
- Professional appearance suitable for client-facing documents

#### Formula UX Flow

**Step 1: Enter Formula Mode**
```
User clicks cell → types "="
Cell shows: |=|  (cursor after equals)
Cell border: Blue highlight (2px solid var(--color-primary-500))
Toolbar: Shows "Building formula..." indicator with fx icon
Tooltip: "Click cells to add references, Enter to save"
```

**Step 2: Click Cells to Build Formula**
```
User clicks cell in column 1 (Qty)
Cell shows: |=[1]|                    ← Internal: column index
Display shows: |=Qty|                 ← UI shows column name
Clicked cell: Blue background + badge showing "B" (column letter)

User types "*"
Cell shows: |=[1]*|
Display shows: |=Qty ×|

User clicks cell in column 2 (Rate)
Cell shows: |=[1]*[2]|               ← Internal storage
Display shows: |=Qty × Rate|         ← UI display
Second cell: Blue background + badge showing "C"
```

**Step 3: Constants and Operators**
```
Supported operators: + - * /
Constants: Any number (e.g., 0.15, 100, 2.5)
Parentheses: Not supported in V1 (evaluate left-to-right)

Examples:
=[1]*[2]          → displayed as "Qty × Rate"
=[3]*0.15         → displayed as "Subtotal × 0.15" (VAT)
=[4]+[5]          → displayed as "Item1 + Item2"
```

**Step 4: Confirm or Cancel**
```
Enter key     → Evaluate formula, save to cell attrs, exit formula mode
Escape key    → Cancel, restore previous value, exit formula mode
Click outside → Save partial formula (even if incomplete), exit mode
Tab key       → Save formula, move focus to next cell
```

**Step 5: Evaluation**
```
Formula evaluates: 10 × 150.00 = 1500.00
Cell displays: "1,500.00"
Formula stored in attrs.formula: "=[1]*[2]"
Display shown on hover/focus: "=Qty × Rate"
```

#### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Click outside table while building | Save partial formula, exit formula mode |
| Click current cell (self-reference) | Ignored - cell is disabled during formula mode |
| Invalid formula (e.g., `=[1]*`) | Show "Invalid" in cell, red background, allow re-edit |
| Deleted column referenced | Show "Invalid ref" in cell, red background |
| Empty referenced cell | Treat value as 0 |
| Non-numeric referenced cell | Treat value as 0, show warning icon |
| Divide by zero | Show "Error" in cell (not Infinity) |
| Column reorder | Formulas still work (indices are positions) |
| Column rename | Formulas still work (display updates automatically) |

#### Visual Design: Formula Mode

```
┌─────────────────────────────────────────────────────┐
│ Normal Cell (user types "=" to enter formula mode)  │
│ ┌─────────┬─────────┬─────────┬─────────┐          │
│ │ Desc    │ Qty     │ Rate    │ Total   │          │
│ ├─────────┼─────────┼─────────┼─────────┤          │
│ │ Item 1  │ 10      │ 150.00  │ |=|     │ ← Typing │
│ └─────────┴─────────┴─────────┴─────────┘          │
│                               ↑ Blue border        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Formula Mode (after clicking Qty cell)              │
│ ┌─────────┬─────────┬─────────┬─────────┐          │
│ │ Desc    │ Qty  [B]│ Rate    │ =Qty|   │ ← Shows  │
│ ├─────────┼─────────┼─────────┼─────────┤   name   │
│ │ Item 1  │ 10   ●  │ 150.00  │ =Qty×|  │ ← After *│
│ └─────────┴─────────┴─────────┴─────────┘          │
│                 ↑                                   │
│        Selected cell: blue bg + column badge        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Current cell disabled (prevents self-reference)     │
│ ┌─────────┬─────────┬─────────┬─────────┐          │
│ │ Desc    │ Qty     │ Rate    │ Total   │          │
│ ├─────────┼─────────┼─────────┼─────────┤          │
│ │ Item 1  │ 10      │ 150.00  │ ░░░░░░░ │ ← Gray,  │
│ └─────────┴─────────┴─────────┴─────────┘   cursor │
│                               ↑ not-allowed        │
│        Cannot click current cell                    │
└─────────────────────────────────────────────────────┘
```

#### Circular Reference Prevention

**Prevention (Primary - UI Level):**
- When in formula mode, the **current cell is disabled** and cannot be clicked
- Visual: Gray background + `cursor: not-allowed`
- This prevents direct self-reference before it happens

**Detection (Secondary - Validation):**
- Before saving, validate formula doesn't create cycles
- Build dependency graph: cell → cells it references
- Detect cycles using DFS traversal

```typescript
/**
 * Detect if adding a formula would create a circular reference
 * @param cellId - The cell being edited (e.g., "2,3" for row 2, col 3)
 * @param formula - The new formula being added
 * @param existingFormulas - Map of all existing formulas in the table
 */
function hasCircularReference(
  cellId: string,
  formula: string,
  existingFormulas: Map<string, string>
): boolean {
  const visited = new Set<string>();
  const stack = [cellId];

  // Add the new formula temporarily
  const allFormulas = new Map(existingFormulas);
  allFormulas.set(cellId, formula);

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) {
      return true; // Cycle detected!
    }
    visited.add(current);

    const currentFormula = allFormulas.get(current);
    if (currentFormula) {
      const deps = getFormulaDependencies(currentFormula);
      stack.push(...deps);
    }
  }
  return false;
}

function getFormulaDependencies(formula: string): string[] {
  // Extract column references from formula
  const matches = formula.match(/\[(\d+)\]/g) || [];
  return matches.map(m => m.replace(/[\[\]]/g, ''));
}
```

**Error Display:**
- If circular reference detected on save: Cell shows "Circular ref" with red background
- Tooltip: "This formula creates a circular reference. Please edit to fix."
- User must edit the formula to resolve

#### Color Palette (Muted, High Opacity)

**Purpose:** Subtle row/column differentiation, not overwhelming

```css
/* Muted palette - high opacity (subtle) */
--table-color-gray:    rgba(156, 163, 175, 0.15);  /* Neutral rows */
--table-color-blue:    rgba(59, 130, 246, 0.12);   /* Headers */
--table-color-green:   rgba(34, 197, 94, 0.12);    /* Positive/totals */
--table-color-amber:   rgba(245, 158, 11, 0.12);   /* Warnings/highlights */
--table-color-red:     rgba(239, 68, 68, 0.10);    /* Negative/alerts */
--table-color-purple:  rgba(168, 85, 247, 0.12);   /* Accent */
```

**Toolbar Color Picker:**
```
┌────────────────────────────────┐
│ Cell Color                     │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ │
│ │  │ │  │ │  │ │  │ │  │ │  │ │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ │
│ Gray Blue Green Amber Red None │
└────────────────────────────────┘
```

#### Data Model

**Extended TableCell Attributes:**

```typescript
interface FormulaCellAttrs {
  // Formula storage (internal - uses column indices for robustness)
  formula?: string;              // e.g., "=[1]*[2]" or "SUM"
  formulaType?: 'row' | 'column';

  // Styling
  backgroundColor?: string;      // e.g., "blue" | "green" | "amber" | null
  showFormulaPrefix?: boolean;   // Show ∑ prefix (default: false for row, true for column)

  // Existing
  columnIndex?: number;          // For column formulas (which column to aggregate)
  colspan?: number;
  rowspan?: number;
  colwidth?: number[];
}
```

**Formula String Format:**

```typescript
// INTERNAL STORAGE (column indices - survives renames)
"=[1]*[2]"        // Column 1 × Column 2 (same row)
"=[1]+[2]+[3]"    // Sum columns 1, 2, 3 (same row)
"=[2]*0.15"       // Column 2 × constant (15% VAT)
"=[0]+[1]-[2]"    // Addition and subtraction

// DISPLAY FORMAT (derived from column headers - shown in UI)
"=Qty × Rate"           // Derived from headers ["Description", "Qty", "Rate", "Total"]
"=Subtotal × 0.15"      // Shows column name + constant

// COLUMN FORMULAS (existing - unchanged)
"SUM"             // Sum all numeric values in column
"AVG"             // Average
"COUNT"           // Count numeric values
"MIN" | "MAX"     // Min/max values

// Deriving display formula from internal storage:
function getDisplayFormula(formula: string, columnHeaders: string[]): string {
  if (!formula.startsWith('=')) return formula; // Column formula (SUM, AVG, etc.)
  return formula.replace(/\[(\d+)\]/g, (_, idx) => {
    const header = columnHeaders[parseInt(idx)];
    return header || `Col${parseInt(idx) + 1}`;
  }).replace('*', ' × ').replace('/', ' ÷ ');
}
```

**Why Index-Based Storage (Key Decision):**
1. **Column renames don't break formulas** - User can rename "Qty" to "Quantity" without invalidating formulas
2. **Column reorder works correctly** - Formulas reference positions, not names
3. **Only column deletion invalidates** - Shows "Invalid reference" in affected cells
4. **Simpler parsing** - No need to match text headers, just parse `[n]` patterns
5. **No ambiguity** - Column names could have duplicates; indices are unique

#### Implementation Steps

> **Implementation Order:** Quick wins first (colors, styling), then core functionality (parser, builder), then integration (recalculation, toolbar). This validates the approach before investing in complex work.

**Step 2.5.1: Cell Background Colors (0.5 days)**

Add `backgroundColor` attribute to existing TableCell extension in `PageEditor.svelte`:

```typescript
// In PageEditor.svelte - extend existing TableCell
backgroundColor: {
  default: null,
  parseHTML: (element) => element.getAttribute('data-bg-color'),
  renderHTML: (attributes) => {
    if (!attributes.backgroundColor) return {};
    return {
      'data-bg-color': attributes.backgroundColor,
      style: `background-color: var(--table-color-${attributes.backgroundColor})`
    };
  }
}
```

Add CSS variables to `src/app.css`:

```css
/* Muted table colors - high opacity (subtle) */
:root {
  --table-color-gray:   rgba(156, 163, 175, 0.15);
  --table-color-blue:   rgba(59, 130, 246, 0.12);
  --table-color-green:  rgba(34, 197, 94, 0.12);
  --table-color-amber:  rgba(245, 158, 11, 0.12);
  --table-color-red:    rgba(239, 68, 68, 0.10);
  --table-color-purple: rgba(168, 85, 247, 0.12);
}
```

**Deliverable:** Cells can have background colors that persist on save/load.

---

**Step 2.5.2: Clean Styling - Optional ∑ Prefix (0.5 days)**

Add `showFormulaPrefix` attribute and update CSS:

```typescript
// In PageEditor.svelte - extend existing TableCell
showFormulaPrefix: {
  default: null, // null = use default based on formula type
  parseHTML: (element) => {
    const attr = element.getAttribute('data-show-prefix');
    return attr === 'true' ? true : attr === 'false' ? false : null;
  },
  renderHTML: (attributes) => {
    if (attributes.showFormulaPrefix === null) return {};
    return { 'data-show-prefix': attributes.showFormulaPrefix ? 'true' : 'false' };
  }
}
```

Update CSS to make prefix optional:

```css
/* Only show ∑ prefix when explicitly enabled */
.editor-body td[data-show-prefix="true"]::before {
  content: '∑ ';
  opacity: 0.5;
  margin-right: 0.25rem;
}

/* Remove default prefix from total rows (override Phase 2 rule) */
.editor-body tr[data-is-total="true"] td::before {
  content: none;
}
```

**Deliverable:** ∑ prefix is optional (default off), clean professional appearance.

---

**Step 2.5.3: Formula Parser Service (1-2 days)**

Create `src/lib/services/formula-parser.ts`:

```typescript
export interface FormulaToken {
  type: 'column_ref' | 'operator' | 'number';
  value: number | string;
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
 * Parse formula string into tokens
 * @example parseFormula('=[1]*[2]') → { tokens: [...], isValid: true, referencedColumns: [1, 2] }
 */
export function parseFormula(formula: string): ParsedFormula {
  // Column formulas (existing)
  if (['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'].includes(formula)) {
    return { tokens: [], type: 'column', isValid: true, referencedColumns: [] };
  }

  // Row formulas (new)
  if (!formula.startsWith('=')) {
    return { tokens: [], type: 'row', isValid: false, error: 'Formula must start with =' };
  }

  const tokens: FormulaToken[] = [];
  const referencedColumns: number[] = [];
  const expr = formula.slice(1); // Remove leading =

  // Tokenize: [n], operators (+,-,*,/), numbers
  const regex = /\[(\d+)\]|([+\-*/])|(\d+\.?\d*)/g;
  let match;

  while ((match = regex.exec(expr)) !== null) {
    if (match[1] !== undefined) {
      const colIndex = parseInt(match[1]);
      tokens.push({ type: 'column_ref', value: colIndex, columnIndex: colIndex });
      referencedColumns.push(colIndex);
    } else if (match[2]) {
      tokens.push({ type: 'operator', value: match[2] });
    } else if (match[3]) {
      tokens.push({ type: 'number', value: parseFloat(match[3]) });
    }
  }

  // Validate: must have at least one column reference or number
  const isValid = tokens.length > 0 && tokens.some(t => t.type !== 'operator');

  return { tokens, type: 'row', isValid, referencedColumns };
}

/**
 * Evaluate parsed formula against row data
 * @example evaluateFormula(parsed, [10, 150, 0]) → 1500
 */
export function evaluateFormula(
  parsed: ParsedFormula,
  rowValues: (number | null)[]
): number | null {
  if (!parsed.isValid || parsed.tokens.length === 0) return null;

  // Simple left-to-right evaluation (no operator precedence in V1)
  let result: number | null = null;
  let currentOp: string | null = null;

  for (const token of parsed.tokens) {
    let value: number | null = null;

    if (token.type === 'column_ref') {
      value = rowValues[token.columnIndex!] ?? 0;
    } else if (token.type === 'number') {
      value = token.value as number;
    } else if (token.type === 'operator') {
      currentOp = token.value as string;
      continue;
    }

    if (value === null) continue;

    if (result === null) {
      result = value;
    } else if (currentOp) {
      switch (currentOp) {
        case '+': result += value; break;
        case '-': result -= value; break;
        case '*': result *= value; break;
        case '/': result = value !== 0 ? result / value : null; break;
      }
      currentOp = null;
    }
  }

  return result;
}

/**
 * Get display version of formula (column names instead of indices)
 */
export function getDisplayFormula(
  formula: string,
  columnHeaders: string[]
): string {
  if (!formula.startsWith('=')) return formula;
  return formula
    .replace(/\[(\d+)\]/g, (_, idx) => columnHeaders[parseInt(idx)] || `Col${parseInt(idx) + 1}`)
    .replace(/\*/g, ' × ')
    .replace(/\//g, ' ÷ ');
}

/**
 * Detect circular references (see Circular Reference Prevention section)
 */
export function hasCircularReference(
  cellId: string,
  formula: string,
  existingFormulas: Map<string, string>
): boolean {
  // Implementation in Circular Reference Prevention section
  // ...
}
```

**Deliverable:** Formula parsing, evaluation, and display conversion working with unit tests.

---

**Step 2.5.4: Formula Builder Component (2-3 days)**

Create `src/lib/components/pages/FormulaBuilder.svelte`:

```svelte
<script lang="ts">
  import { parseFormula, getDisplayFormula, evaluateFormula } from '$lib/services/formula-parser';

  interface Props {
    editor: any;
    cellPosition: { row: number; col: number };
    columnHeaders: string[];
    rowValues: (number | null)[];
    onComplete: (formula: string) => void;
    onCancel: () => void;
  }

  let { editor, cellPosition, columnHeaders, rowValues, onComplete, onCancel }: Props = $props();

  let formulaText = $state('=');
  let parsed = $derived(parseFormula(formulaText));
  let displayText = $derived(getDisplayFormula(formulaText, columnHeaders));
  let previewValue = $derived(parsed.isValid ? evaluateFormula(parsed, rowValues) : null);

  // Track which cells are referenced (for highlighting)
  let referencedCells = $derived(parsed.referencedColumns.map(col => ({ row: cellPosition.row, col })));

  function addColumnReference(colIndex: number) {
    // Prevent self-reference
    if (colIndex === cellPosition.col) return;

    // Add reference to formula
    formulaText += `[${colIndex}]`;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && parsed.isValid) {
      onComplete(formulaText);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  }

  function handleOperator(op: string) {
    formulaText += op;
  }
</script>

<div class="formula-builder" onkeydown={handleKeydown}>
  <div class="formula-display">
    <span class="formula-icon">fx</span>
    <span class="formula-text">{displayText || '='}</span>
    {#if previewValue !== null}
      <span class="formula-preview">= {previewValue.toFixed(2)}</span>
    {/if}
  </div>

  <div class="formula-hint">
    Click cells to add references. Enter to save, Esc to cancel.
  </div>
</div>

<style>
  .formula-builder {
    padding: 0.5rem;
    background: var(--editor-bg-secondary);
    border-bottom: 1px solid var(--editor-border);
  }

  .formula-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'SF Mono', monospace;
  }

  .formula-icon {
    font-style: italic;
    color: var(--color-primary-500);
  }

  .formula-preview {
    color: var(--editor-text-secondary);
    margin-left: auto;
  }

  .formula-hint {
    font-size: 0.75rem;
    color: var(--editor-text-secondary);
    margin-top: 0.25rem;
  }
</style>
```

**Deliverable:** Visual formula builder component with live preview.

---

**Step 2.5.5: Cell Click Handler for Formula Mode (1 day)**

Update `PageEditor.svelte` to handle formula mode:

```typescript
// State for formula mode
let formulaMode = $state<{
  row: number;
  col: number;
  formula: string;
  previousValue: string;
} | null>(null);

// Detect when user types "=" in a cell
function handleCellInput(event: Event) {
  const target = event.target as HTMLElement;
  const cell = target.closest('td');
  if (!cell || formulaMode) return;

  const text = cell.textContent || '';
  if (text === '=') {
    // Enter formula mode
    const { row, col } = getCellPosition(cell);
    formulaMode = {
      row,
      col,
      formula: '=',
      previousValue: ''
    };
  }
}

// Handle cell clicks during formula mode
function handleTableClick(event: MouseEvent) {
  if (!formulaMode) return;

  const cell = (event.target as HTMLElement).closest('td');
  if (!cell) return;

  const { row, col } = getCellPosition(cell);

  // Prevent self-reference
  if (col === formulaMode.col && row === formulaMode.row) return;

  // Add column reference to formula
  formulaMode.formula += `[${col}]`;
}

// Complete formula mode
function completeFormula(save: boolean) {
  if (!formulaMode) return;

  if (save && formulaMode.formula.length > 1) {
    // Save formula to cell attributes
    setCellFormula(formulaMode.row, formulaMode.col, formulaMode.formula);
  } else {
    // Restore previous value
    restoreCellValue(formulaMode.row, formulaMode.col, formulaMode.previousValue);
  }

  formulaMode = null;
}

// Get cell position from DOM element
function getCellPosition(cell: HTMLElement): { row: number; col: number } {
  const row = cell.closest('tr');
  const table = cell.closest('table');
  if (!row || !table) return { row: 0, col: 0 };

  const rows = Array.from(table.querySelectorAll('tr'));
  const cells = Array.from(row.querySelectorAll('td, th'));

  return {
    row: rows.indexOf(row),
    col: cells.indexOf(cell)
  };
}
```

**Deliverable:** Click-to-build formula mode working in editor.

---

**Step 2.5.6: Real-time Row Formula Recalculation (1 day)**

Extend `updateTableTotalsInEditor()` in `table-calculations.ts`:

```typescript
import { parseFormula, evaluateFormula } from './formula-parser';

export function updateTableFormulasInEditor(editor: Editor): void {
  try {
    const { state } = editor;
    const { doc, schema } = state;

    // Collect all table data for calculations
    const tableData: Map<number, { json: any; rowValues: Map<number, (number | null)[]> }> = new Map();

    doc.descendants((node, pos) => {
      if (node.type.name === 'table') {
        const json = node.toJSON();
        const rowValues = new Map<number, (number | null)[]>();

        // Extract row values for each row
        json.content?.forEach((row: any, rowIndex: number) => {
          if (row.attrs?.isTotal) return; // Skip total rows

          const values: (number | null)[] = [];
          row.content?.forEach((cell: any) => {
            const text = extractTextFromNode(cell);
            const num = parseFloat(text.trim().replace(/[^0-9.-]/g, ''));
            values.push(isNaN(num) ? null : num);
          });
          rowValues.set(rowIndex, values);
        });

        tableData.set(pos, { json, rowValues });
      }
      return true;
    });

    // Find and update all formula cells
    const updates: Array<{ from: number; to: number; text: string }> = [];

    doc.descendants((node, pos) => {
      if (node.type.name === 'tableCell' && node.attrs?.formula) {
        const formula = node.attrs.formula as string;

        // Skip column formulas (handled by existing updateTableTotalsInEditor)
        if (['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'].includes(formula)) return true;

        // Parse row formula
        const parsed = parseFormula(formula);
        if (!parsed.isValid) return true;

        // Find row values for this cell's row
        // ... (get row values from tableData)

        const result = evaluateFormula(parsed, rowValues);
        const formatted = result !== null ? result.toFixed(2) : 'Error';

        // Queue update if different
        // ... (same pattern as existing updateTableTotalsInEditor)
      }
      return true;
    });

    // Apply updates in reverse order
    // ... (same pattern as existing code)

  } catch (error) {
    console.warn('Row formula calculation failed:', error);
  }
}
```

**Deliverable:** Row formulas recalculate in real-time when cell values change.

---

**Step 2.5.7: Color Picker in Toolbar (0.5 days)**

Add to `EditorToolbar.svelte`:

```svelte
<script lang="ts">
  // ... existing code

  let showColorPicker = $state(false);
  const colors = ['gray', 'blue', 'green', 'amber', 'red', 'purple'];

  function setCellColor(color: string | null) {
    if (!editor) return;

    // Get current cell and update its backgroundColor attribute
    const { selection } = editor.state;
    // ... update cell attribute
    showColorPicker = false;
  }
</script>

{#if isTableActive}
  <div class="toolbar-divider"></div>

  <!-- Color Picker -->
  <div class="color-picker-wrapper">
    <button
      type="button"
      class="toolbar-btn"
      onclick={() => showColorPicker = !showColorPicker}
      title="Cell Background Color"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
      </svg>
    </button>

    {#if showColorPicker}
      <div class="color-picker-dropdown">
        {#each colors as color}
          <button
            class="color-swatch"
            style="background-color: var(--table-color-{color})"
            onclick={() => setCellColor(color)}
            title={color}
          />
        {/each}
        <button
          class="color-swatch color-none"
          onclick={() => setCellColor(null)}
          title="None"
        >
          ✕
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .color-picker-wrapper {
    position: relative;
  }

  .color-picker-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    display: flex;
    gap: 4px;
    padding: 8px;
    background: var(--editor-bg);
    border: 1px solid var(--editor-border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
  }

  .color-swatch {
    width: 24px;
    height: 24px;
    border: 1px solid var(--editor-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .color-swatch:hover {
    transform: scale(1.1);
  }

  .color-none {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--editor-text-secondary);
  }
</style>
```

**Deliverable:** Color picker dropdown in toolbar when table is active.

---

**Step 2.5.8: Formula Mode Indicator in Toolbar (0.5 days)**

Add visual indicator when formula mode is active:

```svelte
{#if formulaMode}
  <div class="formula-mode-indicator">
    <span class="fx-icon">fx</span>
    <span class="formula-text">Building formula...</span>
    <span class="formula-hint">(Enter to save, Esc to cancel)</span>
  </div>
{/if}

<style>
  .formula-mode-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: var(--color-primary-50);
    border: 1px solid var(--color-primary-200);
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .fx-icon {
    font-style: italic;
    font-weight: 600;
    color: var(--color-primary-600);
  }

  .formula-hint {
    color: var(--editor-text-secondary);
    font-size: 0.75rem;
  }
</style>
```

**Deliverable:** Clear visual feedback when user is building a formula.

#### Acceptance Criteria - Phase 2.5

**Automated Tests:**

1. **Formula parser unit tests** (`src/lib/services/formula-parser.test.ts`)
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { parseFormula, evaluateFormula, getDisplayFormula } from './formula-parser';

   describe('Formula Parser', () => {
     it('parses simple multiplication', () => {
       const result = parseFormula('=[1]*[2]');
       expect(result.isValid).toBe(true);
       expect(result.referencedColumns).toEqual([1, 2]);
       expect(result.type).toBe('row');
     });

     it('parses formula with constant', () => {
       const result = parseFormula('=[2]*0.15');
       expect(result.isValid).toBe(true);
       expect(result.tokens).toHaveLength(3);
     });

     it('evaluates multiplication correctly', () => {
       const parsed = parseFormula('=[1]*[2]');
       const result = evaluateFormula(parsed, [0, 10, 150]); // Col0=0, Col1=10, Col2=150
       expect(result).toBe(1500);
     });

     it('evaluates with constant correctly', () => {
       const parsed = parseFormula('=[0]*0.15');
       const result = evaluateFormula(parsed, [1000]);
       expect(result).toBe(150);
     });

     it('handles division by zero', () => {
       const parsed = parseFormula('=[0]/[1]');
       const result = evaluateFormula(parsed, [100, 0]);
       expect(result).toBeNull();
     });

     it('generates display formula with column names', () => {
       const display = getDisplayFormula('=[1]*[2]', ['Desc', 'Qty', 'Rate', 'Total']);
       expect(display).toBe('=Qty × Rate');
     });

     it('handles missing column headers gracefully', () => {
       const display = getDisplayFormula('=[5]*[6]', ['A', 'B']);
       expect(display).toBe('=Col6 × Col7');
     });

     it('recognizes column formulas', () => {
       const result = parseFormula('SUM');
       expect(result.type).toBe('column');
       expect(result.isValid).toBe(true);
     });

     it('rejects invalid formulas', () => {
       const result = parseFormula('hello');
       expect(result.isValid).toBe(false);
     });
   });
   ```

2. **TypeScript compilation passes**
   ```bash
   npm run check  # 0 errors
   ```

**Manual Tests:**

1. **Row formula creation (click-to-build)**
   - Click empty cell in "Total" column
   - Type "=" → ✅ Blue border appears on cell
   - ✅ "Building formula..." shows in toolbar
   - Click "Qty" cell → `=[1]` stored, "=Qty" displayed
   - Type "*"
   - Click "Rate" cell → `=[1]*[2]` stored, "=Qty × Rate" displayed
   - Press Enter
   - ✅ Result displays correctly (e.g., "1,500.00")

2. **Column rename doesn't break formulas**
   - Create row formula referencing "Qty" column (as above)
   - Edit the "Qty" header cell to "Quantity"
   - ✅ Formula still calculates correctly (same result)
   - ✅ Display updates to "=Quantity × Rate"
   - Save and reload → ✅ Still works

3. **Click outside saves formula**
   - Start building formula: type "=", click Qty cell, type "*"
   - Click outside the table (anywhere else on page)
   - ✅ Partial formula saved (`=[1]*`)
   - ✅ Cell shows "Invalid" (red background)
   - Click cell again, complete the formula
   - ✅ Formula now calculates correctly

4. **Keyboard shortcuts**
   - Start formula mode
   - Press Enter with valid formula → ✅ Saves and exits
   - Start formula mode
   - Press Escape → ✅ Cancels and restores previous value
   - Start formula mode
   - Press Tab → ✅ Saves and moves to next cell

5. **Circular reference prevention**
   - Start formula mode in cell C2 (Total column)
   - ✅ Cell C2 is visually disabled (gray background, not-allowed cursor)
   - Try to click cell C2
   - ✅ Nothing happens (no self-reference added to formula)

6. **Real-time recalculation**
   - Create row formula `=[1]*[2]` (Qty × Rate)
   - Change Qty value from 10 to 20
   - ✅ Total updates immediately (without save/refresh)
   - Change Rate value
   - ✅ Total updates immediately

7. **Cell background colors**
   - Select cell in table
   - Click color picker button in toolbar
   - ✅ Dropdown shows 6 colors + "None"
   - Select "Blue"
   - ✅ Subtle blue background appears on cell
   - Save page
   - Reload page
   - ✅ Color persists

8. **Clean styling (no ∑ prefix by default)**
   - Create row formula
   - ✅ No ∑ prefix on result (clean appearance)
   - Add total row with SUM formula
   - ✅ No ∑ prefix by default (changed from Phase 2)
   - (Optional) Can enable prefix via cell attribute if desired

9. **Constants in formulas**
   - Create formula: `=[2]*0.15` (Subtotal × 15% VAT)
   - ✅ Calculates correctly (e.g., 1000 × 0.15 = 150)
   - Change referenced cell value
   - ✅ Result updates in real-time

10. **Error handling**
    - Delete a column that's referenced in a formula
    - ✅ Affected cells show "Invalid ref" (not crash)
    - Create formula `=[0]/[1]` where Col1 = 0
    - ✅ Shows "Error" (not Infinity or NaN)
    - Create incomplete formula `=[1]+`
    - ✅ Shows "Invalid" (not crash)

11. **Persistence**
    - Create table with:
      - Row formulas (e.g., Qty × Rate)
      - Column formulas (e.g., SUM in total row)
      - Cell background colors
    - Save page
    - Reload page
    - ✅ All formulas calculate correctly
    - ✅ All colors persist
    - ✅ Formula display shows column names (not indices)

**Success Criteria:**
- ✅ Row formulas calculate correctly (multiply, add, subtract, divide)
- ✅ Click-to-build UX works smoothly with visual feedback
- ✅ Formulas stored by index, displayed by column name
- ✅ Column renames don't break formulas
- ✅ Circular references prevented in UI
- ✅ Real-time recalculation on content change
- ✅ Cell colors apply and persist
- ✅ No ∑ prefix by default (clean professional appearance)
- ✅ Constants work in formulas (e.g., ×0.15 for VAT)
- ✅ Keyboard shortcuts work (Enter, Escape, Tab)
- ✅ Edge cases handled gracefully (errors, invalid refs, divide by zero)
- ✅ All data persists on save/reload

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

### Completed
✅ **Phase 1: Basic Tables**
- TipTap table extensions installed and configured
- Insert table, add/delete rows/columns, resize columns
- Table styling with header support

✅ **Phase 2: Simple Totals**
- Total row with SUM formula support
- Auto-recalculation on content change
- Read-only formula cells (contenteditable=false)
- Visual styling for total rows (bold, background, ∑ prefix)

### Future (On Demand)
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
| 2026-01-13 | Store formulas by column index, display by name | Survives column renames; only deletion breaks formulas |
| 2026-01-13 | Click-to-build over typed formulas | More intuitive UX, eliminates syntax errors |
| 2026-01-13 | Prevent circular refs in UI (disable current cell) | Better UX than error recovery after the fact |
| 2026-01-13 | Outside click saves partial formula | Less frustrating than losing work; can edit to complete |
| 2026-01-13 | ∑ prefix optional (default off) | Clean professional appearance for proposals |
| 2026-01-13 | Implementation order: colors → styling → parser → UX | Quick wins first, validates approach before complex work |

---

## Open Questions

**Resolved:**

1. ~~Should totals support multiple formula types per row?~~
   **Decision:** Yes, per-column formula selection (more flexible)

2. ~~How to handle formula UI?~~
   **Decision:** Click-to-build for row formulas (intuitive), picker modal for column formulas (SUM, AVG, etc.)

3. ~~Should formulas be visible to non-technical users?~~
   **Decision:** Show display formula (column names like "=Qty × Rate"), hide internal format (indices like "=[1]*[2]")

**Open:**

4. **What's the maximum table size we support?**
   - Recommend: 50 rows × 20 columns
   - Hard limit: 100 rows × 50 columns
   - Performance testing needed during implementation

5. **Should we support CSV import/export for tables?**
   - Useful for data transfer from spreadsheets
   - Could leverage existing export infrastructure
   - Lower priority than core formula functionality

6. **Row formula operators - parentheses support?**
   - V1: No parentheses, left-to-right evaluation (e.g., `1+2*3` = 9, not 7)
   - V2: Consider adding if user demand requires complex expressions
   - Recommendation: Keep V1 simple, document behavior

7. **Multi-cell selection for color application?**
   - V1: Single cell only (click cell, then color)
   - V2: Consider range selection (Shift+click) and "Apply to row" option
   - Recommendation: Start with single cell, add range later based on feedback

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
