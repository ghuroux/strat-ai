<script lang="ts">
	/**
	 * PageEditor.svelte - Main TipTap editor wrapper
	 *
	 * Features:
	 * - TipTap rich text editing with full extension suite
	 * - Auto-save with 30-second debounce
	 * - Manual save via Cmd+S / Ctrl+S
	 * - Dirty state tracking
	 * - Word count
	 * - Light/dark mode support
	 *
	 * Based on DOCUMENT_SYSTEM.md Section 4.1 specification
	 */

	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';
	import Underline from '@tiptap/extension-underline';
	import Link from '@tiptap/extension-link';
	import TaskList from '@tiptap/extension-task-list';
	import TaskItem from '@tiptap/extension-task-item';
	import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
	import { Table } from '@tiptap/extension-table';
	import { TableRow as BaseTableRow } from '@tiptap/extension-table-row';
	import { TableHeader } from '@tiptap/extension-table-header';
	import { TableCell as BaseTableCell } from '@tiptap/extension-table-cell';
	import { common, createLowlight } from 'lowlight';
	import { recalculateTable, updateTableTotalsInEditor } from '$lib/services/table-calculations';
	import { Lock } from 'lucide-svelte';
	import type { Page, TipTapContent, PageType, PageVisibility } from '$lib/types/page';
	import type { PagePermission } from '$lib/types/page-sharing';
	import { EMPTY_TIPTAP_CONTENT, countWords, extractTextFromContent } from '$lib/types/page';
	import EditorToolbar from './EditorToolbar.svelte';
	import PageHeader from './PageHeader.svelte';
	import EditorChatPanel from './EditorChatPanel.svelte';
	import SharePageModal from './SharePageModal.svelte';
	import PageAuditLog from './PageAuditLog.svelte';
	import { userStore } from '$lib/stores/user.svelte';

	// Custom TableRow that supports isTotal attribute for total rows
	const TableRow = BaseTableRow.extend({
		addAttributes() {
			return {
				...this.parent?.(),
				isTotal: {
					default: false,
					parseHTML: (element) => element.getAttribute('data-is-total') === 'true',
					renderHTML: (attributes) => {
						if (!attributes.isTotal) return {};
						return { 'data-is-total': 'true' };
					}
				}
			};
		}
	});

	// Custom TableCell that supports formula attributes for calculated cells
	// Formula cells are read-only (contenteditable=false)
	const TableCell = BaseTableCell.extend({
		addAttributes() {
			return {
				...this.parent?.(),
				formula: {
					default: null,
					parseHTML: (element) => element.getAttribute('data-formula'),
					renderHTML: (attributes) => {
						if (!attributes.formula) return {};
						// Formula cells are read-only
						return {
							'data-formula': attributes.formula,
							'class': 'formula-cell',
							'contenteditable': 'false'
						};
					}
				},
				columnIndex: {
					default: null,
					parseHTML: (element) => {
						const val = element.getAttribute('data-col-index');
						return val ? parseInt(val, 10) : null;
					},
					renderHTML: (attributes) => {
						if (attributes.columnIndex === null) return {};
						return { 'data-col-index': attributes.columnIndex };
					}
				},
				// Phase 2.5: Cell background color
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
				},
				// Phase 2.5: Optional formula prefix display
				showFormulaPrefix: {
					default: null,
					parseHTML: (element) => {
						const attr = element.getAttribute('data-show-prefix');
						return attr === 'true' ? true : attr === 'false' ? false : null;
					},
					renderHTML: (attributes) => {
						if (attributes.showFormulaPrefix === null) return {};
						return { 'data-show-prefix': attributes.showFormulaPrefix ? 'true' : 'false' };
					}
				}
			};
		}
	});

	// Props
	interface Props {
		page?: Page | null;
		areaId: string;
		areaName?: string;
		spaceName?: string;
		userPermission?: PagePermission | null;
		taskId?: string;
		initialContent?: TipTapContent;
		initialTitle?: string;
		initialType?: PageType;
		sourceConversationId?: string;
		onSave: (content: TipTapContent, title: string, visibility: PageVisibility) => Promise<void>;
		onClose: () => void;
	}

	let {
		page = null,
		areaId,
		areaName = 'Area',
		spaceName = 'Space',
		userPermission,
		taskId,
		initialContent,
		initialTitle = 'Untitled',
		initialType = 'general',
		sourceConversationId,
		onSave,
		onClose
	}: Props = $props();

	// State
	let editorElement: HTMLDivElement | null = $state(null);
	let editor: Editor | null = $state(null);
	let title = $state('');
	let content = $state<TipTapContent>(EMPTY_TIPTAP_CONTENT);
	let pageType = $state<PageType>('general');
	let visibility = $state<PageVisibility>('private');
	let isDirty = $state(false);
	let isSaving = $state(false);
	let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let lastSavedAt = $state<Date | null>(null);
	let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
	let chatPanelOpen = $state(false);
	let editorTick = $state(0); // Increments on each transaction to force toolbar reactivity

	// Sharing state
	let showShareModal = $state(false);

	// Activity panel state
	let activityPanelOpen = $state(false);

	// Phase 2.5: Formula mode state for row formulas
	interface FormulaMode {
		active: boolean;
		cellPos: number;        // Position of the formula cell in the document
		rowIndex: number;       // Row index within table
		colIndex: number;       // Column index within row
		formula: string;        // Formula being built (e.g., "=[1]*[2]")
		previousValue: string;  // Original cell content for cancel
	}

	let formulaMode = $state<FormulaMode | null>(null);

	// Current user ID from store
	let currentUserId = $derived(userStore.id ?? '');

	// Permission-based derived states
	let isReadOnly = $derived(userPermission === 'viewer');
	let isAdmin = $derived(userPermission === 'admin');

	// Check if current user can manage sharing (owner has admin permission)
	let canManageSharing = $derived(page ? page.userId === currentUserId : false);

	// Sync state with props when page or initial values change
	$effect(() => {
		title = page?.title ?? initialTitle;
	});
	$effect(() => {
		content = page?.content ?? initialContent ?? EMPTY_TIPTAP_CONTENT;
	});
	$effect(() => {
		pageType = page?.pageType ?? initialType;
	});
	$effect(() => {
		visibility = page?.visibility ?? 'private';
	});
	$effect(() => {
		lastSavedAt = page?.updatedAt ?? null;
	});

	// Create lowlight instance with common languages
	const lowlight = createLowlight(common);

	// Word count derived from content
	let wordCount = $derived(countWords(content));

	// Character count derived from content
	let charCount = $derived.by(() => {
		const text = extractTextFromContent(content);
		return text.length;
	});

	// Initialize TipTap editor
	onMount(() => {
		if (!editorElement) return;

		editor = new Editor({
			element: editorElement,
			extensions: [
				StarterKit.configure({
					codeBlock: false // Use CodeBlockLowlight instead
				}),
				Placeholder.configure({
					placeholder: isReadOnly ? '' : 'Start typing your content...'
				}),
				Underline,
				Link.configure({
					openOnClick: false,
					HTMLAttributes: {
						class: 'editor-link'
					}
				}),
				TaskList,
				TaskItem.configure({
					nested: true
				}),
				Table.configure({
					resizable: !isReadOnly,
					cellMinWidth: 50,
					lastColumnResizable: !isReadOnly,
					allowTableNodeSelection: false
				}),
				TableRow,
				TableHeader,
				TableCell,
				CodeBlockLowlight.configure({
					lowlight
				})
			],
			content: content,
			editable: !isReadOnly, // Disable editing for viewers
			onUpdate: ({ editor: ed, transaction }) => {
				// Skip updates for read-only users
				if (isReadOnly) return;
				// Skip if this update was triggered by our table calculation
				if (transaction.getMeta('tableCalculation')) {
					// Still update content for saving, but don't trigger auto-save again
					content = ed.getJSON() as TipTapContent;
					return;
				}

				// Phase 2.5: Check for formula mode entry
				checkForFormulaEntry(ed);

				// Update table totals in real-time (uses transactions, not JSON mutation)
				updateTableTotalsInEditor(ed);

				// Get updated content for state/saving
				const json = ed.getJSON() as TipTapContent;

				// Also update the JSON for persistence (recalculateTable ensures totals in saved content)
				json.content?.forEach((node) => {
					if (node.type === 'table') {
						recalculateTable(node);
					}
				});

				content = json;
				isDirty = true;
				saveStatus = 'idle';
				scheduleAutoSave();
			},
			onTransaction: () => {
				// Increment tick to trigger toolbar reactivity on cursor/selection changes
				editorTick++;
			},
			editorProps: {
				attributes: {
					class: 'editor-body prose'
				}
			}
		});

		// Add keyboard shortcut for save (disabled for viewers)
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 's') {
				e.preventDefault();
				if (!isReadOnly) {
					handleSave();
				}
			}
		};
		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (autoSaveTimer) {
			clearTimeout(autoSaveTimer);
		}
		if (editor) {
			editor.destroy();
		}
	});

	// Auto-save with 30-second debounce (disabled for viewers)
	function scheduleAutoSave() {
		// Don't auto-save for read-only users
		if (isReadOnly) return;

		if (autoSaveTimer) {
			clearTimeout(autoSaveTimer);
		}
		autoSaveTimer = setTimeout(() => {
			if (isDirty) {
				handleSave();
			}
		}, 30000); // 30 seconds
	}

	// Handle save (disabled for viewers)
	async function handleSave() {
		if (isSaving || isReadOnly) return;

		isSaving = true;
		saveStatus = 'saving';

		try {
			await onSave(content, title, visibility);
			isDirty = false;
			saveStatus = 'saved';
			lastSavedAt = new Date();

			// Reset to idle after 3 seconds
			setTimeout(() => {
				if (saveStatus === 'saved') {
					saveStatus = 'idle';
				}
			}, 3000);
		} catch (error) {
			console.error('Failed to save:', error);
			saveStatus = 'error';
		} finally {
			isSaving = false;
		}
	}

	// Handle title change
	function handleTitleChange(newTitle: string) {
		title = newTitle;
		isDirty = true;
		scheduleAutoSave();
	}

	// Handle visibility change (P9-VT-03)
	function handleVisibilityChange(newVisibility: PageVisibility) {
		visibility = newVisibility;
		isDirty = true;
		scheduleAutoSave();
	}

	// Handle close with unsaved changes warning
	function handleClose() {
		if (isDirty) {
			const confirmed = confirm('You have unsaved changes. Are you sure you want to leave?');
			if (!confirmed) return;
		}
		onClose();
	}

	// Format last saved time
	function formatLastSaved(date: Date | null): string {
		if (!date) return '';
		const now = new Date();
		const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diff < 60) return 'Just now';
		if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
		return date.toLocaleDateString();
	}

	// Handle applying a change from chat panel
	function handleApplyChange(original: string, replacement: string) {
		if (!editor) return;

		// Get current editor content as text
		const editorText = editor.state.doc.textContent;

		// Find the index of the original text in the concatenated content
		const textIndex = editorText.indexOf(original);
		if (textIndex === -1) {
			console.warn('Could not find text to replace:', original);
			return;
		}

		// Map text position to document position
		// Text spans may cross multiple nodes (e.g., "plain **bold** plain")
		// We need to track cumulative text length to find the document positions
		let cumulativeTextLength = 0;
		let fromPos: number | null = null;
		let toPos: number | null = null;

		editor.state.doc.descendants((node, pos) => {
			if (toPos !== null) return false; // Stop if we found both positions

			if (node.isText && node.text) {
				const nodeStart = cumulativeTextLength;
				const nodeEnd = cumulativeTextLength + node.text.length;

				// Check if 'from' position falls within this node
				if (fromPos === null && textIndex >= nodeStart && textIndex < nodeEnd) {
					const offsetInNode = textIndex - nodeStart;
					fromPos = pos + offsetInNode;
				}

				// Check if 'to' position falls within this node
				const textEndIndex = textIndex + original.length;
				if (fromPos !== null && toPos === null && textEndIndex > nodeStart && textEndIndex <= nodeEnd) {
					const offsetInNode = textEndIndex - nodeStart;
					toPos = pos + offsetInNode;
				}

				cumulativeTextLength = nodeEnd;
			}
			return true;
		});

		if (fromPos !== null && toPos !== null) {
			// Replace the text
			editor
				.chain()
				.focus()
				.setTextSelection({ from: fromPos, to: toPos })
				.insertContent(replacement)
				.run();

			isDirty = true;
			scheduleAutoSave();
		} else {
			console.warn('Could not determine document positions for replacement');
		}
	}

	// Handle chat panel open state change
	function handleChatPanelOpenChange(isOpen: boolean) {
		chatPanelOpen = isOpen;
	}

	// Phase 2.5: Formula mode functions

	/**
	 * Enter formula mode when "=" is typed in a table cell
	 */
	function enterFormulaMode(rowIndex: number, colIndex: number, previousValue: string) {
		console.log('[FormulaMode] Entering formula mode', { rowIndex, colIndex, previousValue });
		formulaMode = {
			active: true,
			cellPos: -1, // Not used anymore - we find cell dynamically
			rowIndex,
			colIndex,
			formula: '=',
			previousValue
		};

		// Blur the editor to prevent it from capturing keyboard events
		editor?.commands.blur();
	}

	/**
	 * Add a column reference to the formula
	 */
	function addColumnReference(colIndex: number) {
		if (!formulaMode) return;

		console.log('[FormulaMode] Adding column reference', { colIndex, currentFormula: formulaMode.formula });

		// Prevent self-reference
		if (colIndex === formulaMode.colIndex) {
			console.log('[FormulaMode] Blocked: self-reference attempt');
			return;
		}

		// Add operator if needed (after previous ref or number)
		const lastChar = formulaMode.formula.slice(-1);
		if (lastChar !== '=' && lastChar !== '+' && lastChar !== '-' && lastChar !== '*' && lastChar !== '/' && lastChar !== '(') {
			formulaMode.formula += '*'; // Default to multiplication
		}

		formulaMode.formula += `[${colIndex}]`;
		console.log('[FormulaMode] Updated formula', { formula: formulaMode.formula });
	}

	/**
	 * Add an operator to the formula
	 */
	function addFormulaOperator(op: '+' | '-' | '*' | '/') {
		if (!formulaMode) return;
		console.log('[FormulaMode] Adding operator', { op });
		formulaMode.formula += op;
	}

	/**
	 * Find a table cell by row and column index in the document
	 * Returns the position of the cell node, or -1 if not found
	 */
	function findCellPosition(ed: Editor, targetRowIndex: number, targetColIndex: number): number {
		const { state } = ed;
		let cellPos = -1;

		state.doc.descendants((node, pos) => {
			if (node.type.name === 'table') {
				let currentRowIndex = 0;
				node.forEach((row, rowOffset) => {
					if (row.type.name === 'tableRow') {
						let currentColIndex = 0;
						row.forEach((cell, cellOffset) => {
							if (cell.type.name === 'tableCell' || cell.type.name === 'tableHeader') {
								if (currentRowIndex === targetRowIndex && currentColIndex === targetColIndex) {
									// pos + 1 (table opening) + rowOffset + 1 (row opening) + cellOffset
									cellPos = pos + 1 + rowOffset + 1 + cellOffset;
									console.log('[FormulaMode] Found cell at position', { cellPos, targetRowIndex, targetColIndex });
								}
								currentColIndex++;
							}
						});
						currentRowIndex++;
					}
				});
			}
			return cellPos === -1; // Stop searching once found
		});

		return cellPos;
	}

	/**
	 * Complete (save) the formula
	 */
	function completeFormula(save: boolean) {
		console.log('[FormulaMode] Completing formula', { save, formulaMode });

		if (!formulaMode || !editor) {
			console.log('[FormulaMode] No formula mode or editor');
			return;
		}

		if (save && formulaMode.formula.length > 1) {
			console.log('[FormulaMode] Saving formula:', formulaMode.formula);

			// Find the cell position dynamically (not using stale cellPos)
			const cellPos = findCellPosition(editor, formulaMode.rowIndex, formulaMode.colIndex);

			if (cellPos === -1) {
				console.error('[FormulaMode] Could not find cell position');
				formulaMode = null;
				return;
			}

			const { state } = editor;
			const cell = state.doc.nodeAt(cellPos);

			console.log('[FormulaMode] Cell at position:', { cellPos, cell: cell?.type.name, attrs: cell?.attrs });

			if (cell && (cell.type.name === 'tableCell' || cell.type.name === 'tableHeader')) {
				// Create transaction to update cell attributes AND set cell content
				const tr = state.tr;

				// Update cell attributes with formula
				tr.setNodeMarkup(cellPos, undefined, {
					...cell.attrs,
					formula: formulaMode.formula,
					columnIndex: formulaMode.colIndex
				});

				// Also set the cell content to show the formula result placeholder
				// Find the paragraph inside the cell and replace its content
				const paragraphPos = cellPos + 1; // tableCell > paragraph
				const paragraph = state.doc.nodeAt(paragraphPos);
				if (paragraph && paragraph.type.name === 'paragraph') {
					const textStart = paragraphPos + 1;
					const textEnd = paragraphPos + paragraph.nodeSize - 1;
					// Replace with placeholder (calculation will update it)
					tr.replaceWith(textStart, textEnd, state.schema.text('...'));
					console.log('[FormulaMode] Replaced cell content', { textStart, textEnd });
				}

				tr.setMeta('tableCalculation', true);
				editor.view.dispatch(tr);
				console.log('[FormulaMode] Transaction dispatched');

				// Trigger recalculation
				setTimeout(() => {
					if (editor) {
						updateTableTotalsInEditor(editor);
						console.log('[FormulaMode] Triggered recalculation');
					}
				}, 50);
			} else {
				console.error('[FormulaMode] Invalid cell node', { cell });
			}
		} else {
			console.log('[FormulaMode] Cancelled or empty formula');
		}

		formulaMode = null;
		console.log('[FormulaMode] Formula mode cleared');
	}

	/**
	 * Handle clicks during formula mode (capture phase)
	 */
	function handleEditorClick(event: MouseEvent) {
		if (!formulaMode || !editor) return;

		console.log('[FormulaMode] Click detected', { target: (event.target as HTMLElement).tagName });

		const target = event.target as HTMLElement;
		const cell = target.closest('td, th');

		if (!cell) {
			console.log('[FormulaMode] Clicked outside table - saving');
			completeFormula(true);
			return;
		}

		// Get column index from the cell
		const row = cell.parentElement;
		if (!row) {
			console.log('[FormulaMode] No parent row found');
			return;
		}

		const colIndex = Array.from(row.children).indexOf(cell);
		console.log('[FormulaMode] Cell clicked', { colIndex });

		if (colIndex >= 0) {
			addColumnReference(colIndex);
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
	 * Handle keyboard events during formula mode
	 * Must be on capture phase to intercept before editor
	 */
	function handleFormulaKeydown(event: KeyboardEvent) {
		if (!formulaMode) return;

		console.log('[FormulaMode] Keydown:', event.key);

		switch (event.key) {
			case 'Enter':
				console.log('[FormulaMode] Enter pressed - saving');
				completeFormula(true);
				event.preventDefault();
				event.stopPropagation();
				break;
			case 'Escape':
				console.log('[FormulaMode] Escape pressed - cancelling');
				completeFormula(false);
				event.preventDefault();
				event.stopPropagation();
				break;
			case '+':
			case '-':
			case '*':
			case '/':
				addFormulaOperator(event.key as '+' | '-' | '*' | '/');
				event.preventDefault();
				event.stopPropagation();
				break;
		}
	}

	/**
	 * Check if user typed "=" to enter formula mode (called in onUpdate)
	 */
	function checkForFormulaEntry(ed: Editor) {
		// Skip if already in formula mode
		if (formulaMode) return;

		const { state } = ed;
		const { selection } = state;
		const selPos = selection.$from;

		// Check if we're in a table cell
		for (let depth = selPos.depth; depth > 0; depth--) {
			const node = selPos.node(depth);
			if (node.type.name === 'tableCell') {
				const text = node.textContent;

				// If cell contains only "=", enter formula mode
				if (text === '=') {
					console.log('[FormulaMode] Detected "=" in cell');

					// Find row and column indices
					const row = selPos.node(depth - 1);
					const table = selPos.node(depth - 2);
					let rowIndex = 0;
					let colIndex = 0;

					// Get column index within row
					const rowPos = selPos.before(depth - 1);
					row.forEach((cell, offset, index) => {
						if (selPos.pos >= rowPos + 1 + offset && selPos.pos < rowPos + 1 + offset + cell.nodeSize) {
							colIndex = index;
						}
					});

					// Get row index within table
					const tablePos = selPos.before(depth - 2);
					table.forEach((r, offset, index) => {
						if (selPos.pos >= tablePos + 1 + offset && selPos.pos < tablePos + 1 + offset + r.nodeSize) {
							rowIndex = index;
						}
					});

					console.log('[FormulaMode] Cell location', { rowIndex, colIndex });

					// Clear the "=" from the cell first
					ed.commands.deleteRange({ from: selPos.pos - 1, to: selPos.pos });

					// Enter formula mode (after clearing, so we don't track stale position)
					enterFormulaMode(rowIndex, colIndex, '');
				}
				break;
			}
		}
	}
</script>

<div class="page-editor" class:chat-open={chatPanelOpen}>
	<!-- Header -->
	<PageHeader
		pageId={page?.id}
		{title}
		{pageType}
		{visibility}
		{saveStatus}
		isDirty={isReadOnly ? false : isDirty}
		{canManageSharing}
		{userPermission}
		onTitleChange={handleTitleChange}
		onOpenShareModal={() => showShareModal = true}
		onOpenActivityLog={() => activityPanelOpen = !activityPanelOpen}
		onSave={handleSave}
		onClose={handleClose}
	/>

	<!-- Main content area -->
	<div class="editor-content">
		<!-- Editor main area -->
		<div class="editor-main" class:chat-open={chatPanelOpen} class:activity-open={activityPanelOpen}>
			<!-- Toolbar (hidden for viewers) -->
			{#if editor && !isReadOnly}
				<EditorToolbar {editor} {editorTick} {formulaMode} />
			{/if}

			<!-- Read-only banner -->
			{#if isReadOnly}
				<div class="read-only-banner">
					<Lock size={16} />
					<span>Read-only - You have viewer permission</span>
				</div>
			{/if}

			<!-- Editor body -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="editor-body-wrapper"
				class:read-only={isReadOnly}
				class:formula-mode={formulaMode?.active}
				onclickcapture={handleEditorClick}
				onkeydowncapture={handleFormulaKeydown}
			>
				<div bind:this={editorElement} class="editor-container"></div>
			</div>
		</div>

		<!-- Chat panel (manages its own open/close state) -->
		{#if page}
			<div class="chat-panel-container">
				<EditorChatPanel
					{page}
					onApplyChange={handleApplyChange}
					onOpenChange={handleChatPanelOpenChange}
				/>
			</div>
		{/if}

		<!-- Activity panel (admin only) -->
		{#if activityPanelOpen && page}
			<div class="activity-panel-container">
				<PageAuditLog
					pageId={page.id}
					onClose={() => activityPanelOpen = false}
				/>
			</div>
		{/if}
	</div>

	<!-- Footer -->
	<div class="editor-footer">
		<span class="word-count">{wordCount} words · {charCount} chars</span>

		<!-- Auto-save indicator -->
		<div class="save-indicator">
			{#if saveStatus === 'saving'}
				<span class="save-status saving">
					<svg class="save-icon spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="8" />
					</svg>
					Saving...
				</span>
			{:else if isDirty}
				<span class="save-status unsaved">
					<span class="unsaved-dot"></span>
					Unsaved changes
				</span>
			{:else if saveStatus === 'saved'}
				<span class="save-status saved">
					<svg class="save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="20 6 9 17 4 12" />
					</svg>
					Saved
				</span>
			{:else if lastSavedAt}
				<span class="save-status last-saved">Last saved {formatLastSaved(lastSavedAt)}</span>
			{/if}
		</div>

		<span class="visibility-badge">{page?.visibility ?? 'private'}</span>
	</div>
</div>

<!-- Share Modal -->
<SharePageModal
	open={showShareModal}
	{page}
	{areaId}
	{areaName}
	{spaceName}
	{currentUserId}
	onClose={() => showShareModal = false}
	onVisibilityChange={(newVisibility) => {
		visibility = newVisibility;
	}}
/>

<style>
	.page-editor {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--editor-bg);
		color: var(--editor-text);
	}

	.editor-content {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.editor-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		transition: margin-right 200ms ease;
	}

	.editor-main.chat-open {
		margin-right: 350px;
	}

	.editor-main.activity-open {
		margin-right: 380px;
	}

	.editor-main.chat-open.activity-open {
		margin-right: 730px; /* 350px chat + 380px activity */
	}

	/* Read-only banner */
	.read-only-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(107, 114, 128, 0.1);
		border: 1px solid rgba(107, 114, 128, 0.2);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		color: #6b7280;
		margin: 1rem 1.5rem 0;
	}

	.editor-body-wrapper {
		flex: 1;
		overflow-y: auto;
		padding: 2rem;
	}

	.editor-body-wrapper.read-only {
		cursor: default;
		user-select: text;
	}

	.editor-body-wrapper.read-only :global(.ProseMirror) {
		opacity: 0.9;
		background: rgba(0, 0, 0, 0.02);
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.editor-container {
		max-width: 800px;
		margin: 0 auto;
	}

	/* TipTap editor styles */
	.editor-container :global(.ProseMirror) {
		outline: none;
		min-height: 400px;
	}

	.editor-container :global(.ProseMirror p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: var(--editor-text-muted);
		pointer-events: none;
		height: 0;
	}

	/* Footer */
	.editor-footer {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1.5rem;
		border-top: 1px solid var(--editor-border);
		background: var(--editor-bg-secondary);
		font-size: 0.875rem;
		color: var(--editor-text-secondary);
	}

	.word-count {
		font-weight: 500;
	}

	/* Auto-save indicator */
	.save-indicator {
		display: flex;
		align-items: center;
	}

	.save-status {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
	}

	.save-status.unsaved {
		color: var(--editor-text-secondary);
	}

	.unsaved-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #f59e0b;
		animation: pulse-dot 2s ease-in-out infinite;
	}

	@keyframes pulse-dot {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.save-status.saving {
		color: var(--editor-border-focus);
	}

	.save-status.saved {
		color: #16a34a;
	}

	.save-status.last-saved {
		color: var(--editor-text-secondary);
		opacity: 0.7;
	}

	.save-icon {
		width: 14px;
		height: 14px;
	}

	.save-icon.spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.visibility-badge {
		margin-left: auto;
		padding: 0.25rem 0.5rem;
		background: var(--toolbar-button-hover);
		border-radius: 4px;
		font-size: 0.75rem;
		text-transform: capitalize;
	}

	/* Chat panel container */
	.chat-panel-container {
		position: absolute;
		bottom: 4rem;
		right: 1.5rem;
		z-index: 10;
	}

	/* Activity panel container */
	.activity-panel-container {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 380px;
		background: var(--editor-bg);
		border-left: 1px solid var(--editor-border);
		z-index: 20;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
</style>
