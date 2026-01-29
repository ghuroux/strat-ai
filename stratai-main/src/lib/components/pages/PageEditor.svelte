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
	import { TableHeader as BaseTableHeader } from '@tiptap/extension-table-header';
	import { TableCell as BaseTableCell } from '@tiptap/extension-table-cell';
	import { common, createLowlight } from 'lowlight';
	import { recalculateTable, updateTableTotalsInEditor, extractTableData, type TableData } from '$lib/services/table-calculations';
	import { buildCellRef } from '$lib/services/cell-references';
	import { Lock, Save, Share2, History, MoreVertical, Clock, RotateCcw, ArrowLeft } from 'lucide-svelte';
	import MobileHeader from '$lib/components/layout/MobileHeader.svelte';
	import MobileActionsMenu from '$lib/components/layout/MobileActionsMenu.svelte';
	import type { Page, TipTapContent, PageType, PageVisibility } from '$lib/types/page';
	import type { PagePermission } from '$lib/types/page-sharing';
	import { EMPTY_TIPTAP_CONTENT, countWords, extractTextFromContent } from '$lib/types/page';
	import EditorToolbar from './EditorToolbar.svelte';
	import FormulaBar from './FormulaBar.svelte';
	import PageHeader from './PageHeader.svelte';
	import EditorChatPanel from './EditorChatPanel.svelte';
	import SharePageModal from './SharePageModal.svelte';
	import FinalizePageModal from './FinalizePageModal.svelte';
	import UnlockPageModal from './UnlockPageModal.svelte';
	import DiscardChangesModal from './DiscardChangesModal.svelte';
	import PageAuditLog from './PageAuditLog.svelte';
	import VersionHistoryPanel from './VersionHistoryPanel.svelte';
	import RestoreVersionModal from './RestoreVersionModal.svelte';
	import type { PageVersion } from '$lib/types/page';
	import { userStore } from '$lib/stores/user.svelte';
	import { pageStore } from '$lib/stores/pages.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import { SlashCommands, DiagramNode, getDefaultCommands, createSuggestionConfig } from './extensions';
	import { ExcalidrawEditor, LibraryPicker, type DiagramLibrary } from '$lib/components/diagrams';

	// Diagram editing state
	interface DiagramEditState {
		isOpen: boolean;
		id: string | null;
		elements: string;
		appState: string;
		files: string;
		pos: number | null;
	}

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

	// Custom TableHeader that supports backgroundColor attribute (like TableCell)
	const TableHeader = BaseTableHeader.extend({
		addAttributes() {
			return {
				...this.parent?.(),
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
			};
		}
	});

	// Custom CodeBlockLowlight that renders language as data attribute for CSS styling
	const CustomCodeBlockLowlight = CodeBlockLowlight.extend({
		renderHTML({ node, HTMLAttributes }) {
			const language = node.attrs.language || '';
			return [
				'pre',
				{
					...HTMLAttributes,
					'data-language': language
				},
				['code', { class: language ? `language-${language}` : '' }, 0]
			];
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
				},
				// Phase 3.8: Cell currency format (USD, EUR, GBP, ZAR, JPY)
				cellCurrency: {
					default: null,
					parseHTML: (element) => element.getAttribute('data-cell-currency'),
					renderHTML: (attributes) => {
						if (!attributes.cellCurrency) return {};
						return { 'data-cell-currency': attributes.cellCurrency };
					}
				},
				// Phase 3.8: Cell decimal places (0 or 2)
				cellDecimals: {
					default: null,
					parseHTML: (element) => {
						const val = element.getAttribute('data-cell-decimals');
						return val !== null ? parseInt(val, 10) : null;
					},
					renderHTML: (attributes) => {
						if (attributes.cellDecimals === null) return {};
						return { 'data-cell-decimals': attributes.cellDecimals.toString() };
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
	let editorWrapper: HTMLDivElement | null = $state(null);
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

	// Diagram editor modal state
	let diagramEdit = $state<DiagramEditState>({
		isOpen: false,
		id: null,
		elements: '[]',
		appState: '{}',
		files: '{}',
		pos: null
	});

	// Library loading state
	let loadedLibraries = $state<string[]>([]);
	let loadingLibrary = $state<string | null>(null);
	let libraryPanelCollapsed = $state(false);
	let excalidrawEditorRef: {
		loadLibrary: (lib: DiagramLibrary) => Promise<boolean>;
		toggleLibrary: (lib: DiagramLibrary, allLibraries: DiagramLibrary[]) => Promise<boolean>;
		openLibraryPanel: () => void;
	} | null = $state(null);

	// Sharing state
	let showShareModal = $state(false);

	// Activity panel state
	let activityPanelOpen = $state(false);

	// Version history state (Phase 3: Version Management)
	let versionHistoryOpen = $state(false);
	let previewVersion = $state<PageVersion | null>(null);
	let isPreviewMode = $derived(previewVersion !== null);
	let showRestoreModal = $state(false);
	let restoreTargetVersion = $state<number | null>(null);

	// Phase 2.5: Formula mode state for row formulas
	interface FormulaMode {
		active: boolean;
		cellPos: number;        // Position of the formula cell in the document
		tablePos: number;       // Position of the parent table (for multi-table support)
		rowIndex: number;       // Row index within table
		colIndex: number;       // Column index within row
		formula: string;        // Formula being built (e.g., "=[1]*[2]")
		previousValue: string;  // Original cell content for cancel
	}

	let formulaMode = $state<FormulaMode | null>(null);

	// Phase 3: Track selected cell formula and table data for floating FormulaBar
	let selectedCellFormula = $state<string | null>(null);
	let activeTableData = $state<TableData | null>(null);
	let currentCellPosition = $state<{ col: number; row: number } | null>(null);
	let currentTablePos = $state<number>(-1);  // ProseMirror position of current table (for multi-table support)
	let activeTableRect = $state<{ top: number; left: number; width: number; bottom: number } | null>(null);
	let isInTable = $state(false);

	// Phase 3.8: Cell formatting (currency, decimals) - keyed by "col,row"
	type CellFormat = { currency?: string; decimals?: number };
	let cellFormats = $state<Map<string, CellFormat>>(new Map());

	// Get format for current cell
	let currentCellFormat = $derived.by(() => {
		if (!currentCellPosition) return null;
		const key = `${currentCellPosition.col},${currentCellPosition.row}`;
		return cellFormats.get(key) || null;
	});

	// Handle format change from FormulaBar
	function handleFormatChange(format: CellFormat) {
		if (!currentCellPosition || !editor) return;
		const key = `${currentCellPosition.col},${currentCellPosition.row}`;
		const newFormats = new Map(cellFormats);
		newFormats.set(key, format);
		cellFormats = newFormats;

		// Also update the cell attributes in the editor immediately
		// Find the cell and update its attributes
		const { state } = editor;
		const { selection } = state;
		const selPos = selection.$from;

		for (let depth = selPos.depth; depth > 0; depth--) {
			const node = selPos.node(depth);
			if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
				const cellPos = selPos.before(depth);
				const tr = state.tr;

				// Update cell format attributes
				tr.setNodeMarkup(cellPos, undefined, {
					...node.attrs,
					cellCurrency: format.currency || null,
					cellDecimals: format.decimals ?? null
				});

				editor.view.dispatch(tr);

				// Trigger recalculation to update display
				updateTableTotalsInEditor(editor);
				break;
			}
		}
	}

	// Current user ID from store
	let currentUserId = $derived(userStore.id ?? '');

	// Permission-based derived states
	// Read-only if viewer OR if page is finalized (locked)
	let isFinalized = $derived(page?.status === 'finalized');
	let isReadOnly = $derived(userPermission === 'viewer' || isFinalized);
	let isAdmin = $derived(userPermission === 'admin');

	// Check if current user can manage sharing (owner has admin permission)
	let canManageSharing = $derived(page ? page.userId === currentUserId : false);

	// Page lifecycle (Phase 1: Page Lifecycle)
	let isOwner = $derived(page ? page.userId === currentUserId : false);
	let canFinalize = $derived(isOwner && page?.status !== 'finalized');
	let canUnlock = $derived(isOwner && page?.status === 'finalized');

	// Lifecycle modal states
	let showFinalizeModal = $state(false);
	let showUnlockModal = $state(false);
	let showDiscardModal = $state(false);

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

	// Listen for diagram:edit custom events from DiagramNode
	$effect(() => {
		if (!editorWrapper) return;

		const handleDiagramEdit = (event: Event) => {
			const customEvent = event as CustomEvent<{
				id: string;
				elements: string;
				appState: string;
				files: string;
				pos: number | null;
			}>;
			handleDiagramEditEvent(customEvent);
		};

		editorWrapper.addEventListener('diagram:edit', handleDiagramEdit);

		return () => {
			editorWrapper?.removeEventListener('diagram:edit', handleDiagramEdit);
		};
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

		// Guard against HMR double-mount (destroy existing editor if any)
		if (editor) {
			editor.destroy();
			editor = null;
		}

		editor = new Editor({
			element: editorElement,
			extensions: [
				StarterKit.configure({
					codeBlock: false, // Use CodeBlockLowlight instead
					// Disable extensions we configure separately (StarterKit v3.15+ includes these)
					link: false,
					underline: false
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
				CustomCodeBlockLowlight.configure({
					lowlight
				}),
				// Diagram embedding
				DiagramNode,
				// Slash commands (only for non-read-only editors)
				...(isReadOnly ? [] : [
					SlashCommands.configure({
						suggestion: createSuggestionConfig({
							items: getDefaultCommands(openDiagramEditor)
						})
					})
				])
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
			onTransaction: ({ editor: ed }) => {
				// Increment tick to trigger toolbar reactivity on cursor/selection changes
				editorTick++;

				// Phase 2.5: Check if selection is in a formula cell
				checkSelectedCellFormula(ed);
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
				if (!isReadOnly && !isPreviewMode) {
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
		// Don't auto-save for read-only users or in version preview mode
		if (isReadOnly || isPreviewMode) return;

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

	// Handle finalize (Phase 1: Page Lifecycle, Phase 2: Context Integration)
	async function handleFinalize(changeSummary?: string, addToContext?: boolean) {
		if (!page?.id) return;

		try {
			const response = await fetch(`/api/pages/${page.id}/finalize`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ changeSummary, addToContext })
			});

			if (!response.ok) {
				throw new Error('Failed to finalize page');
			}

			const data = await response.json();
			if (data.page) {
				// Update the store — parent route syncs via $effect
				const updatedPage = {
					...data.page,
					createdAt: new Date(data.page.createdAt),
					updatedAt: new Date(data.page.updatedAt)
				};
				pageStore.addPage(updatedPage);

				// Make editor read-only immediately
				editor?.setEditable(false);
			}
			showFinalizeModal = false;

			// Invalidate version cache so panel shows new version
			if (page?.id) {
				pageStore.clearPageCache(page.id);
			}

			const contextMsg = addToContext ? ' and added to AI context' : '';
			toastStore.success(`Page finalized${contextMsg}`);
		} catch (error) {
			console.error('Failed to finalize page:', error);
			toastStore.error('Failed to finalize page. Please try again.');
		}
	}

	// Handle unlock (Phase 4: Context-aware unlock)
	async function handleUnlock(keepInContext: boolean) {
		if (!page?.id) return;

		try {
			const updatedPage = await pageStore.unlockPage(page.id, keepInContext);
			if (updatedPage) {
				// Re-enable editing
				editor?.setEditable(true);
				showUnlockModal = false;
				const contextMsg = keepInContext
					? `. v${page.currentVersion} remains in AI context.`
					: '';
				toastStore.success(`Page unlocked for editing${contextMsg}`);
			} else {
				toastStore.error('Failed to unlock page');
			}
		} catch (error) {
			console.error('Failed to unlock page:', error);
			toastStore.error('Failed to unlock page. Please try again.');
		}
	}

	// Handle discard changes (Phase 4: Polish)
	async function handleDiscardChanges() {
		if (!page?.id || !page?.currentVersion) return;

		try {
			const restored = await pageStore.restoreVersion(page.id, page.currentVersion);
			if (restored) {
				editor?.commands.setContent(restored.content);
				content = restored.content;
				title = restored.title;
				isDirty = false;
				showDiscardModal = false;
				toastStore.success(`Reverted to v${page.currentVersion}`);
			} else {
				toastStore.error('Failed to discard changes');
			}
		} catch (error) {
			console.error('Failed to discard changes:', error);
			toastStore.error('Failed to discard changes. Please try again.');
		}
	}

	// Handle context toggle (Phase 2: Page Context)
	async function handleToggleContext() {
		if (!page?.id) return;
		const newValue = !page.inContext;
		const updated = await pageStore.setPageInContext(page.id, newValue);
		if (updated) {
			toastStore.success(newValue ? 'Added to AI context' : 'Removed from AI context');
		} else {
			toastStore.error('Failed to update context status');
		}
	}

	// Version preview handlers (Phase 3: Version Management)
	function handleViewVersion(version: PageVersion) {
		previewVersion = version;
		editor?.commands.setContent(version.content);
		editor?.setEditable(false);
	}

	function exitPreviewMode() {
		previewVersion = null;
		editor?.commands.setContent(content); // Restore actual page content
		editor?.setEditable(!isReadOnly);
	}

	function handleInitiateRestore(versionNumber: number) {
		restoreTargetVersion = versionNumber;
		showRestoreModal = true;
	}

	async function handleRestoreVersion() {
		if (!page?.id || !restoreTargetVersion) return;

		const restoredVersionNum = restoreTargetVersion;
		const restored = await pageStore.restoreVersion(page.id, restoredVersionNum);
		if (restored) {
			previewVersion = null;
			editor?.commands.setContent(restored.content);
			editor?.setEditable(true);
			content = restored.content;
			title = restored.title;
			showRestoreModal = false;
			restoreTargetVersion = null;
			versionHistoryOpen = false;
			toastStore.success(`Restored to v${restoredVersionNum}`);
		} else {
			toastStore.error('Failed to restore version');
		}
	}

	// Format version date for preview banner
	function formatVersionDate(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		if (isNaN(d.getTime())) return 'Unknown';
		const now = new Date();
		const diff = Math.floor((now.getTime() - d.getTime()) / 1000);

		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

		return d.toLocaleDateString();
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

	// Diagram editor functions

	/**
	 * Open diagram editor for a new diagram
	 */
	function openDiagramEditor() {
		diagramEdit = {
			isOpen: true,
			id: null, // New diagram
			elements: '[]',
			appState: '{}',
			files: '{}',
			pos: null
		};
	}

	/**
	 * Handle diagram:edit custom event from DiagramNode
	 */
	function handleDiagramEditEvent(event: CustomEvent<{
		id: string;
		elements: string;
		appState: string;
		files: string;
		pos: number | null;
	}>) {
		const { id, elements, appState, files, pos } = event.detail;
		diagramEdit = {
			isOpen: true,
			id,
			elements,
			appState,
			files,
			pos
		};
	}

	/**
	 * Save diagram from editor
	 */
	function saveDiagram(data: { elements: unknown[]; appState: unknown; files: unknown; svg?: string }) {
		if (!editor) return;

		const elementsJson = JSON.stringify(data.elements);
		// Clean appState - collaborators is a Map that doesn't serialize well
		const appState = data.appState as Record<string, unknown>;
		const cleanAppState = {
			...appState,
			collaborators: [] // Replace Map with empty array for serialization
		};
		const appStateJson = JSON.stringify(cleanAppState);
		const filesJson = JSON.stringify(data.files);
		const svgContent = data.svg || '';

		if (diagramEdit.id && diagramEdit.pos !== null) {
			// Update existing diagram
			const { state } = editor;
			const node = state.doc.nodeAt(diagramEdit.pos);

			if (node?.type.name === 'diagram') {
				const tr = state.tr;
				tr.setNodeMarkup(diagramEdit.pos, undefined, {
					...node.attrs,
					elements: elementsJson,
					appState: appStateJson,
					files: filesJson,
					svg: svgContent
				});
				editor.view.dispatch(tr);
			}
		} else {
			// Insert new diagram
			editor.chain().focus().insertDiagram({
				elements: elementsJson,
				svg: svgContent,
				appState: appStateJson,
				files: filesJson
			}).run();
		}

		// Mark as dirty and close modal
		isDirty = true;
		scheduleAutoSave();
		closeDiagramEditor();
	}

	/**
	 * Close diagram editor without saving
	 */
	function closeDiagramEditor() {
		diagramEdit = {
			isOpen: false,
			id: null,
			elements: '[]',
			appState: '{}',
			files: '{}',
			pos: null
		};
	}

	/**
	 * Handle library toggle request from LibraryPicker (load or unload)
	 */
	async function handleToggleLibrary(library: DiagramLibrary) {
		if (!excalidrawEditorRef || loadingLibrary) return;

		const isLoaded = loadedLibraries.includes(library.id);
		loadingLibrary = library.id;

		try {
			// Import DIAGRAM_LIBRARIES for toggle function
			const { DIAGRAM_LIBRARIES } = await import('$lib/components/diagrams/diagram-libraries');
			const success = await excalidrawEditorRef.toggleLibrary(library, DIAGRAM_LIBRARIES);

			if (isLoaded) {
				// Was loaded, now unloaded
				loadedLibraries = loadedLibraries.filter(id => id !== library.id);
			} else if (success) {
				// Was not loaded, now loaded
				loadedLibraries = [...loadedLibraries, library.id];
			}
		} finally {
			loadingLibrary = null;
		}
	}

	/**
	 * Handle library load completion callback (from ExcalidrawEditor)
	 */
	function handleLibraryLoadComplete(libraryId: string, success: boolean) {
		if (success && !loadedLibraries.includes(libraryId)) {
			loadedLibraries = [...loadedLibraries, libraryId];
		} else if (!success && loadedLibraries.includes(libraryId)) {
			// Library was unloaded
			loadedLibraries = loadedLibraries.filter(id => id !== libraryId);
		}
	}

	/**
	 * Open Excalidraw's library panel (right side)
	 */
	function openExcalidrawLibraryPanel() {
		excalidrawEditorRef?.openLibraryPanel();
	}

	/**
	 * Toggle the library picker panel collapse state
	 */
	function toggleLibraryPanelCollapse() {
		libraryPanelCollapsed = !libraryPanelCollapsed;
	}

	// Phase 2.5: Formula mode functions

	/**
	 * Enter formula mode when "=" is typed in a table cell
	 */
	function enterFormulaMode(rowIndex: number, colIndex: number, tablePos: number, previousValue: string) {
		console.log('[FormulaMode] Entering formula mode', { rowIndex, colIndex, tablePos, previousValue });
		formulaMode = {
			active: true,
			cellPos: -1, // Not used anymore - we find cell dynamically
			tablePos,    // Track which table this formula belongs to
			rowIndex,
			colIndex,
			formula: '=',
			previousValue
		};

		// Blur the editor to prevent it from capturing keyboard events
		editor?.commands.blur();
	}

	/**
	 * Add a cell reference to the formula (A1-style)
	 * Phase 3: Now supports cross-row references (B1, C2, etc.)
	 */
	function addCellReference(colIndex: number, rowIndex: number) {
		if (!formulaMode) return;

		console.log('[FormulaMode] Adding cell reference', { colIndex, rowIndex, currentFormula: formulaMode.formula });

		// Prevent self-reference (same row and column)
		if (colIndex === formulaMode.colIndex && rowIndex === formulaMode.rowIndex) {
			console.log('[FormulaMode] Blocked: self-reference attempt');
			return;
		}

		// Add operator if needed (after previous ref or number)
		const lastChar = formulaMode.formula.slice(-1);
		if (lastChar !== '=' && lastChar !== '+' && lastChar !== '-' && lastChar !== '*' && lastChar !== '/' && lastChar !== '(') {
			formulaMode.formula += '*'; // Default to multiplication
		}

		// Build A1-style cell reference (e.g., "B2", "C3")
		const cellRef = buildCellRef(colIndex, rowIndex);
		formulaMode.formula += cellRef;
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
	 * Find a table cell by row and column index within a specific table
	 * Returns the position of the cell node, or -1 if not found
	 *
	 * @param ed - TipTap editor instance
	 * @param targetTablePos - Position of the table node (required for multi-table support)
	 * @param targetRowIndex - Row index within the table
	 * @param targetColIndex - Column index within the row
	 */
	function findCellPosition(ed: Editor, targetTablePos: number, targetRowIndex: number, targetColIndex: number): number {
		const { state } = ed;
		let cellPos = -1;

		state.doc.descendants((node, pos) => {
			// Only search within the specific table
			if (node.type.name === 'table' && pos === targetTablePos) {
				let currentRowIndex = 0;
				node.forEach((row, rowOffset) => {
					if (row.type.name === 'tableRow') {
						let currentColIndex = 0;
						row.forEach((cell, cellOffset) => {
							if (cell.type.name === 'tableCell' || cell.type.name === 'tableHeader') {
								if (currentRowIndex === targetRowIndex && currentColIndex === targetColIndex) {
									// pos + 1 (table opening) + rowOffset + 1 (row opening) + cellOffset
									cellPos = pos + 1 + rowOffset + 1 + cellOffset;
									console.log('[FormulaMode] Found cell at position', { cellPos, tablePos: targetTablePos, targetRowIndex, targetColIndex });
								}
								currentColIndex++;
							}
						});
						currentRowIndex++;
					}
				});
				return false; // Stop searching - we found our table
			}
			return cellPos === -1; // Continue searching for the target table
		});

		return cellPos;
	}

	/**
	 * Complete (save) the formula
	 * Phase 3: Updated validation for A1-style cell references
	 */
	function completeFormula(save: boolean) {
		console.log('[FormulaMode] Completing formula', { save, formulaMode });

		if (!formulaMode || !editor) {
			console.log('[FormulaMode] No formula mode or editor');
			return;
		}

		if (save && formulaMode.formula.length > 1) {
			// Validate formula before saving
			const formula = formulaMode.formula;

			// Check for invalid trailing operators
			const lastChar = formula.slice(-1);
			if (['+', '-', '*', '/', '('].includes(lastChar)) {
				console.warn('[FormulaMode] Invalid formula - ends with operator:', lastChar);
				// Remove trailing operator and continue
				formulaMode.formula = formula.slice(0, -1);
				if (formulaMode.formula.length <= 1) {
					console.log('[FormulaMode] Formula too short after cleanup, cancelling');
					formulaMode = null;
					return;
				}
			}

			// Phase 3: Must have at least one A1-style cell reference OR be a valid constant expression
			// Check for cell refs (A1, B2, etc.) or pure numbers for constant formulas like =2+2
			const hasCellRef = /[A-Z]+\d+/i.test(formulaMode.formula);
			const hasNumber = /\d/.test(formulaMode.formula);
			if (!hasCellRef && !hasNumber) {
				console.warn('[FormulaMode] Invalid formula - no cell references or numbers');
				formulaMode = null;
				return;
			}

			console.log('[FormulaMode] Saving formula:', formulaMode.formula);

			// Find the cell position within the specific table (multi-table support)
			const cellPos = findCellPosition(editor, formulaMode.tablePos, formulaMode.rowIndex, formulaMode.colIndex);

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

				// Get current cell format (currency, decimals)
				const formatKey = `${formulaMode.colIndex},${formulaMode.rowIndex}`;
				const format = cellFormats.get(formatKey);

				// Update cell attributes with formula and format
				tr.setNodeMarkup(cellPos, undefined, {
					...cell.attrs,
					formula: formulaMode.formula,
					columnIndex: formulaMode.colIndex,
					cellCurrency: format?.currency || null,
					cellDecimals: format?.decimals ?? 2
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
		} else if (save && (formulaMode.formula === '=' || formulaMode.formula === '')) {
			// User cleared the formula - remove it from the cell
			console.log('[FormulaMode] Clearing cell formula');

			const cellPos = findCellPosition(editor, formulaMode.tablePos, formulaMode.rowIndex, formulaMode.colIndex);
			if (cellPos !== -1) {
				const { state } = editor;
				const cell = state.doc.nodeAt(cellPos);

				if (cell && (cell.type.name === 'tableCell' || cell.type.name === 'tableHeader')) {
					const tr = state.tr;

					// Remove formula attribute (set to null)
					tr.setNodeMarkup(cellPos, undefined, {
						...cell.attrs,
						formula: null,
						columnIndex: formulaMode.colIndex
					});

					// Clear the cell content
					const paragraphPos = cellPos + 1;
					const paragraph = state.doc.nodeAt(paragraphPos);
					if (paragraph && paragraph.type.name === 'paragraph') {
						const textStart = paragraphPos + 1;
						const textEnd = paragraphPos + paragraph.nodeSize - 1;
						// Replace with empty (or a single space to avoid empty node issues)
						if (textEnd > textStart) {
							tr.delete(textStart, textEnd);
						}
						console.log('[FormulaMode] Cleared cell content');
					}

					tr.setMeta('tableCalculation', true);
					editor.view.dispatch(tr);
					console.log('[FormulaMode] Cell formula cleared');
				}
			}
		} else {
			console.log('[FormulaMode] Cancelled or empty formula');
		}

		formulaMode = null;
		console.log('[FormulaMode] Formula mode cleared');
	}

	/**
	 * Handle clicks during formula mode (capture phase)
	 * Phase 3: Now extracts both row and column for A1-style references
	 */
	function handleEditorClick(event: MouseEvent) {
		if (!formulaMode || !editor) return;

		// Skip double-click events - let handleDoubleClick handle them
		// event.detail >= 2 means this click is part of a double-click sequence
		if (event.detail >= 2) {
			console.log('[FormulaMode] Skipping double-click event');
			return;
		}

		console.log('[FormulaMode] Click detected', { target: (event.target as HTMLElement).tagName });

		const target = event.target as HTMLElement;

		// Don't intercept clicks on the formula bar itself
		if (target.closest('.floating-formula-bar')) {
			console.log('[FormulaMode] Click on formula bar - allowing');
			return;
		}

		const cell = target.closest('td, th');

		if (!cell) {
			console.log('[FormulaMode] Clicked outside table - saving');
			completeFormula(true);
			return;
		}

		// Get column index from the cell
		const row = cell.parentElement as HTMLTableRowElement | null;
		if (!row) {
			console.log('[FormulaMode] No parent row found');
			return;
		}

		const colIndex = Array.from(row.children).indexOf(cell);

		// Get row index from the table (skip total rows)
		const table = row.closest('table');
		if (!table) {
			console.log('[FormulaMode] No parent table found');
			return;
		}

		const allRows = Array.from(table.querySelectorAll('tr'));
		let dataRowIndex = 0;
		let foundRowIndex = -1;

		for (const tableRow of allRows) {
			// Check if this is the clicked row
			if (tableRow === row) {
				foundRowIndex = dataRowIndex;
				break;
			}
			// Only count non-total rows
			if (!tableRow.hasAttribute('data-is-total')) {
				dataRowIndex++;
			}
		}

		console.log('[FormulaMode] Cell clicked', { colIndex, rowIndex: foundRowIndex });

		if (colIndex >= 0 && foundRowIndex >= 0) {
			addCellReference(colIndex, foundRowIndex);
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
	 * Handle keyboard events during formula mode
	 * Must be on capture phase to intercept before editor
	 * Blocks keys from TipTap editor but allows formula bar input to work
	 */
	function handleFormulaKeydown(event: KeyboardEvent) {
		if (!formulaMode) return;

		const target = event.target as HTMLElement;
		const isFormulaInput = target.tagName === 'INPUT' && target.closest('.floating-formula-bar');

		console.log('[FormulaMode] Keydown:', event.key, { isFormulaInput });

		// Handle Enter and Escape globally (save/cancel)
		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			console.log('[FormulaMode] Enter pressed - saving');
			completeFormula(true);
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			console.log('[FormulaMode] Escape pressed - cancelling');
			completeFormula(false);
			return;
		}

		// If typing in the formula bar input, let it handle the keystroke
		if (isFormulaInput) {
			// Don't block - let the input receive the keystroke
			return;
		}

		// Block keys from reaching TipTap editor (prevent editing document while in formula mode)
		event.preventDefault();
		event.stopPropagation();

		// Handle operators typed outside the formula bar (convenience)
		switch (event.key) {
			case '+':
			case '-':
			case '*':
			case '/':
				addFormulaOperator(event.key as '+' | '-' | '*' | '/');
				break;
		}
	}

	/**
	 * Handle formula change from FormulaBar input
	 */
	function handleFormulaChange(newFormula: string) {
		if (!formulaMode) return;
		console.log('[FormulaMode] Formula changed from bar:', newFormula);
		formulaMode.formula = newFormula;
	}

	/**
	 * Handle edit existing formula (when user clicks on formula display in bar)
	 * Uses the already-computed currentCellPosition and currentTablePos state
	 */
	function handleEditExistingFormula() {
		if (!selectedCellFormula || !editor || !currentCellPosition || currentTablePos < 0) return;

		console.log('[FormulaMode] Editing existing formula:', selectedCellFormula, currentCellPosition, { tablePos: currentTablePos });

		// Enter formula mode with the existing formula
		// currentCellPosition is already correctly calculated (skips total rows)
		formulaMode = {
			active: true,
			cellPos: -1,
			tablePos: currentTablePos,  // Track which table for multi-table support
			rowIndex: currentCellPosition.row,
			colIndex: currentCellPosition.col,
			formula: selectedCellFormula,
			previousValue: '' // Will be the calculated value
		};

		// Clear selected cell formula (we're now editing)
		selectedCellFormula = null;

		// Blur editor so FormulaBar input gets focus
		editor.commands.blur();
	}

	/**
	 * Handle double-click to start formula mode on table cells
	 * Double-click on a cell enters formula mode for that cell
	 */
	function handleDoubleClick(event: MouseEvent) {
		if (!editor || isReadOnly) return;

		const target = event.target as HTMLElement;
		const cell = target.closest('td, th');

		// Only handle double-clicks on table cells
		if (!cell) return;

		// Don't start formula mode on total rows
		const row = cell.closest('tr');
		if (row?.hasAttribute('data-is-total')) return;

		// If already in formula mode, check if clicking on same cell (do nothing)
		// or different cell (cancel current and start new)
		if (formulaMode?.active) {
			const tableRow = cell.parentElement as HTMLTableRowElement | null;
			const table = cell.closest('table');
			if (tableRow && table) {
				const newColIndex = Array.from(tableRow.children).indexOf(cell);
				const allRows = Array.from(table.querySelectorAll('tr'));
				let dataRowIndex = 0;
				let newRowIndex = -1;

				for (const tr of allRows) {
					if (tr === tableRow) {
						newRowIndex = dataRowIndex;
						break;
					}
					if (!tr.hasAttribute('data-is-total')) {
						dataRowIndex++;
					}
				}

				// If same cell, just ensure formula bar is focused
				if (newColIndex === formulaMode.colIndex && newRowIndex === formulaMode.rowIndex) {
					console.log('[FormulaMode] Double-click on same cell - focusing formula bar');
					editor.commands.blur();
					event.preventDefault();
					event.stopPropagation();
					return;
				}

				// Different cell - cancel current formula mode (don't save) and continue to start new
				console.log('[FormulaMode] Double-click on different cell - canceling current formula');
				formulaMode = null;
			}
		}

		console.log('[FormulaMode] Double-click detected on cell');

		// Get cell position
		const tableRow = cell.parentElement as HTMLTableRowElement | null;
		const table = cell.closest('table');
		if (!tableRow || !table) return;

		const colIndex = Array.from(tableRow.children).indexOf(cell);

		// Get row index (skip total rows)
		const allRows = Array.from(table.querySelectorAll('tr'));
		let dataRowIndex = 0;
		let foundRowIndex = -1;

		for (const tr of allRows) {
			if (tr === tableRow) {
				foundRowIndex = dataRowIndex;
				break;
			}
			if (!tr.hasAttribute('data-is-total')) {
				dataRowIndex++;
			}
		}

		if (colIndex < 0 || foundRowIndex < 0) return;

		// Check for existing formula on this cell
		const cellElement = cell as HTMLElement;
		const existingFormula = cellElement.getAttribute('data-formula');

		console.log('[FormulaMode] Starting formula mode via double-click', {
			colIndex,
			rowIndex: foundRowIndex,
			existingFormula
		});

		// Extract table data and position from ProseMirror for evaluation
		const { state } = editor;
		const { selection } = state;
		const selPos = selection.$from;

		let tableData: TableData | null = null;
		let tablePos = -1;
		for (let depth = selPos.depth; depth > 0; depth--) {
			const node = selPos.node(depth);
			if (node.type.name === 'table') {
				tableData = extractTableData(node.toJSON());
				tablePos = selPos.before(depth);  // Get ProseMirror position of table
				break;
			}
		}

		if (tableData) {
			activeTableData = tableData;
		}

		// Validate we found the table
		if (tablePos < 0) {
			console.error('[FormulaMode] Could not find table position');
			return;
		}

		// Get existing cell value
		const cellText = cell.textContent?.trim() || '';

		// Enter formula mode with table position for multi-table support
		formulaMode = {
			active: true,
			cellPos: -1,
			tablePos,  // Track which table for multi-table support
			rowIndex: foundRowIndex,
			colIndex,
			formula: existingFormula || '=',
			previousValue: existingFormula ? cellText : ''
		};

		currentCellPosition = { col: colIndex, row: foundRowIndex };
		currentTablePos = tablePos;  // Update tracked table position
		selectedCellFormula = null;

		// Prevent default double-click behavior (text selection)
		event.preventDefault();
		event.stopPropagation();

		// Blur editor so FormulaBar input gets focus
		editor.commands.blur();
	}

	/**
	 * Check if current selection is in a formula cell
	 * Called on transaction to update FormulaBar
	 * Phase 3: Now extracts full TableData and tracks table position for floating bar
	 */
	function checkSelectedCellFormula(ed: Editor) {
		// Don't update if in formula mode - we're building a formula
		if (formulaMode?.active) return;

		const { state } = ed;
		const { selection } = state;
		const selPos = selection.$from;

		// First, find if we're in a table and extract its data + DOM rect
		let foundTable = false;
		for (let depth = selPos.depth; depth > 0; depth--) {
			const node = selPos.node(depth);
			if (node.type.name === 'table') {
				// Extract full table data for formula evaluation
				const tableJson = node.toJSON();
				activeTableData = extractTableData(tableJson);
				foundTable = true;
				isInTable = true;

				// Get table ProseMirror position (for multi-table support)
				const tablePos = selPos.before(depth);
				currentTablePos = tablePos;  // Store for formula mode entry

				// Get table DOM element and its rect for floating bar positioning
				const domNode = ed.view.nodeDOM(tablePos);
				if (domNode && domNode instanceof HTMLElement) {
					const rect = domNode.getBoundingClientRect();
					const editorWrapper = domNode.closest('.editor-body-wrapper') as HTMLElement | null;
					const wrapperRect = editorWrapper?.getBoundingClientRect();

					// Calculate position relative to the editor wrapper (accounting for scroll)
					if (wrapperRect && editorWrapper) {
						const scrollTop = editorWrapper.scrollTop;
						activeTableRect = {
							top: rect.top - wrapperRect.top + scrollTop,
							left: rect.left - wrapperRect.left,
							width: rect.width,
							bottom: rect.bottom - wrapperRect.top + scrollTop
						};
					}
				}
				break;
			}
		}

		// If not in a table, clear data
		if (!foundTable) {
			activeTableData = null;
			currentCellPosition = null;
			currentTablePos = -1;
			selectedCellFormula = null;
			activeTableRect = null;
			isInTable = false;
			return;
		}

		// Now check if we're in a table cell and track position
		for (let depth = selPos.depth; depth > 0; depth--) {
			const node = selPos.node(depth);
			if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
				// Find cell position (col, row)
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

				// Get row index within table (skip total rows)
				const tablePos = selPos.before(depth - 2);
				let dataRowIndex = 0;
				table.forEach((r, offset, index) => {
					if (selPos.pos >= tablePos + 1 + offset && selPos.pos < tablePos + 1 + offset + r.nodeSize) {
						rowIndex = dataRowIndex;
					}
					// Only count non-total rows
					if (!r.attrs?.isTotal) {
						dataRowIndex++;
					}
				});

				// Update current cell position
				currentCellPosition = { col: colIndex, row: rowIndex };

				// Load cell format from attributes (if any)
				const cellCurrency = node.attrs?.cellCurrency as string | null;
				const cellDecimals = node.attrs?.cellDecimals as number | null;
				const formatKey = `${colIndex},${rowIndex}`;

				// Only update if the cell has format attributes set
				if (cellCurrency !== null || cellDecimals !== null) {
					const existingFormat = cellFormats.get(formatKey);
					// Only update if different from current
					if (existingFormat?.currency !== cellCurrency || existingFormat?.decimals !== cellDecimals) {
						const newFormats = new Map(cellFormats);
						newFormats.set(formatKey, {
							currency: cellCurrency || undefined,
							decimals: cellDecimals ?? undefined
						});
						cellFormats = newFormats;
					}
				}

				// Check if this cell has a formula
				const formula = node.attrs?.formula as string | undefined;
				if (formula && formula.startsWith('=')) {
					if (selectedCellFormula !== formula) {
						console.log('[FormulaMode] Selected cell with formula:', formula);
						selectedCellFormula = formula;
					}
				} else {
					selectedCellFormula = null;
				}
				return;
			}
		}

		// Not in a cell
		currentCellPosition = null;
		selectedCellFormula = null;
	}

	/**
	 * Start formula mode for the currently selected cell
	 * Called from toolbar button - explicit activation (not keystroke detection)
	 * Phase 3: Extracts full TableData for cross-row evaluation
	 */
	function startFormulaModeForCurrentCell() {
		if (!editor || formulaMode) return;

		const { state } = editor;
		const { selection } = state;
		const selPos = selection.$from;

		console.log('[FormulaMode] Starting formula mode for current cell');

		// Check if we're in a table cell
		for (let depth = selPos.depth; depth > 0; depth--) {
			const node = selPos.node(depth);
			if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
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

				// Get row index within table (skip total rows for data indexing)
				const tablePos = selPos.before(depth - 2);
				let dataRowIndex = 0;
				table.forEach((r, offset, index) => {
					if (selPos.pos >= tablePos + 1 + offset && selPos.pos < tablePos + 1 + offset + r.nodeSize) {
						rowIndex = dataRowIndex;
					}
					if (!r.attrs?.isTotal) {
						dataRowIndex++;
					}
				});

				// Get existing formula if any
				const existingFormula = node.attrs?.formula;
				const startFormula = existingFormula?.startsWith('=') ? existingFormula : '=';

				console.log('[FormulaMode] Cell location', { tablePos, rowIndex, colIndex, existingFormula });

				// Extract full table data for cross-row evaluation
				const tableJson = table.toJSON();
				activeTableData = extractTableData(tableJson);
				currentCellPosition = { col: colIndex, row: rowIndex };
				currentTablePos = tablePos;  // Update tracked table position

				// Enter formula mode with table position for multi-table support
				enterFormulaMode(rowIndex, colIndex, tablePos, startFormula === '=' ? '' : node.textContent);
				if (startFormula !== '=') {
					formulaMode!.formula = startFormula;
				}

				return;
			}
		}

		console.log('[FormulaMode] Not in a table cell - cannot start formula mode');
	}
</script>

<div class="page-editor" class:chat-open={chatPanelOpen}>
	<!-- Mobile Header -->
	<MobileHeader
		title={title || 'Untitled'}
		onBack={handleClose}
	>
		<!-- Save button (primary action) -->
		{#if !isReadOnly}
			<button
				class="mobile-header-action"
				class:primary={isDirty}
				onclick={handleSave}
				disabled={saveStatus === 'saving' || (!isDirty && saveStatus !== 'error')}
				title={isDirty ? 'Save changes' : 'Saved'}
			>
				{#if saveStatus === 'saving'}
					<svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="8" />
					</svg>
				{:else}
					<Save size={18} />
				{/if}
			</button>
		{/if}

		<!-- Actions menu -->
		<MobileActionsMenu>
			{#if canManageSharing}
				<button class="mobile-action-item" onclick={() => showShareModal = true}>
					<Share2 size={16} />
					Share
				</button>
			{/if}
			{#if isAdmin}
				<button class="mobile-action-item" onclick={() => activityPanelOpen = !activityPanelOpen}>
					<History size={16} />
					Activity
				</button>
			{/if}
		</MobileActionsMenu>
	</MobileHeader>

	<!-- Desktop Header (hidden on mobile) -->
	<PageHeader
		pageId={page?.id}
		{title}
		{pageType}
		{visibility}
		{saveStatus}
		isDirty={isReadOnly ? false : isDirty}
		{canManageSharing}
		{userPermission}
		status={page?.status ?? 'draft'}
		currentVersion={page?.currentVersion}
		{isOwner}
		inContext={page?.inContext ?? false}
		contextVersionNumber={page?.contextVersionNumber}
		onToggleContext={isOwner ? handleToggleContext : undefined}
		onTitleChange={handleTitleChange}
		onOpenShareModal={() => showShareModal = true}
		onOpenActivityLog={() => activityPanelOpen = !activityPanelOpen}
		onOpenVersionHistory={() => { versionHistoryOpen = !versionHistoryOpen; if (!versionHistoryOpen) exitPreviewMode(); }}
		onFinalize={() => showFinalizeModal = true}
		onUnlock={() => showUnlockModal = true}
		onDiscardChanges={() => showDiscardModal = true}
		onSave={handleSave}
		onClose={handleClose}
	/>

	<!-- Main content area -->
	<div class="editor-content">
		<!-- Editor main area -->
		<div class="editor-main" class:chat-open={chatPanelOpen} class:activity-open={activityPanelOpen} class:version-history-open={versionHistoryOpen}>
			<!-- Toolbar (hidden for viewers) -->
			{#if editor && !isReadOnly}
				<EditorToolbar
					{editor}
					{editorTick}
					{formulaMode}
					onStartFormula={startFormulaModeForCurrentCell}
				/>
			{/if}

			<!-- Version preview banner (Phase 3: Version Management) -->
			{#if isPreviewMode && previewVersion}
				<div class="version-preview-banner">
					<div class="preview-info">
						<Clock size={16} />
						<span>Viewing v{previewVersion.versionNumber}</span>
						<span class="preview-date">from {formatVersionDate(previewVersion.createdAt)}</span>
					</div>
					<div class="preview-actions">
						{#if isOwner && previewVersion.versionNumber !== page?.currentVersion}
							<button class="preview-restore-btn" onclick={() => { restoreTargetVersion = previewVersion!.versionNumber; showRestoreModal = true; }}>
								<RotateCcw size={14} />
								Restore
							</button>
						{/if}
						<button class="preview-back-btn" onclick={exitPreviewMode}>
							<ArrowLeft size={14} />
							Back to current
						</button>
					</div>
				</div>
			{/if}

			<!-- Read-only banner -->
			{#if !isPreviewMode && isFinalized}
				<div class="read-only-banner finalized">
					<Lock size={16} />
					<span>
						Finalized (v{page?.currentVersion ?? 1})
						{#if canUnlock}
							- Click "Unlock" above to edit
						{/if}
					</span>
				</div>
			{:else if !isPreviewMode && userPermission === 'viewer'}
				<div class="read-only-banner">
					<Lock size={16} />
					<span>Read-only - You have viewer permission</span>
				</div>
			{/if}

			<!-- Editor body -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				bind:this={editorWrapper}
				class="editor-body-wrapper"
				class:read-only={isReadOnly}
				class:formula-mode={formulaMode?.active}
				onclickcapture={handleEditorClick}
				ondblclick={handleDoubleClick}
				onkeydowncapture={handleFormulaKeydown}
			>
				<div bind:this={editorElement} class="editor-container"></div>

				<!-- Phase 3: Floating Formula Bar - positioned below active table -->
				{#if !isReadOnly && isInTable && activeTableRect}
					<div
						class="floating-formula-bar"
						style="top: {activeTableRect.bottom + 8}px; left: {activeTableRect.left}px; width: {activeTableRect.width}px;"
					>
						<FormulaBar
							{formulaMode}
							{selectedCellFormula}
							tableData={activeTableData}
							currentCell={currentCellPosition}
							cellFormat={currentCellFormat}
							onFormulaChange={handleFormulaChange}
							onSave={() => completeFormula(true)}
							onCancel={() => completeFormula(false)}
							onClear={() => {
								if (formulaMode) {
									formulaMode.formula = '=';
									completeFormula(true);
								}
							}}
							onEditExisting={handleEditExistingFormula}
							onFormatChange={handleFormatChange}
						/>
					</div>
				{/if}
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

		<!-- Version history panel (Phase 3: Version Management) -->
		{#if versionHistoryOpen && page}
			<div class="version-panel-container">
				<VersionHistoryPanel
					pageId={page.id}
					currentVersion={page.currentVersion}
					onClose={() => { versionHistoryOpen = false; exitPreviewMode(); }}
					onViewVersion={handleViewVersion}
					onRestoreVersion={handleInitiateRestore}
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

<!-- Diagram Editor Modal -->
{#if diagramEdit.isOpen}
	<div class="diagram-modal-overlay">
		<div class="diagram-modal">
			<div class="diagram-modal-header">
				<h2 class="diagram-modal-title">
					{diagramEdit.id ? 'Edit Diagram' : 'Create Diagram'}
				</h2>
				<div class="diagram-modal-actions">
					<button
						type="button"
						class="diagram-modal-cancel"
						onclick={closeDiagramEditor}
					>
						Cancel
					</button>
				</div>
			</div>
			<div class="diagram-modal-content">
				<!-- Library Picker Sidebar -->
				<div class="diagram-library-sidebar" class:collapsed={libraryPanelCollapsed}>
					<LibraryPicker
						{loadedLibraries}
						{loadingLibrary}
						onToggleLibrary={handleToggleLibrary}
						onOpenLibraryPanel={openExcalidrawLibraryPanel}
						isCollapsed={libraryPanelCollapsed}
						onToggleCollapse={toggleLibraryPanelCollapse}
					/>
				</div>

				<!-- Excalidraw Editor -->
				<div class="diagram-modal-body">
					<ExcalidrawEditor
						bind:this={excalidrawEditorRef}
						initialData={{
							elements: JSON.parse(diagramEdit.elements),
							appState: JSON.parse(diagramEdit.appState),
							files: JSON.parse(diagramEdit.files)
						}}
						onSave={saveDiagram}
						onLibraryLoad={handleLibraryLoadComplete}
					/>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Finalize Modal (Phase 1: Page Lifecycle) -->
<FinalizePageModal
	open={showFinalizeModal}
	pageTitle={title}
	contextVersionNumber={page?.contextVersionNumber}
	onClose={() => showFinalizeModal = false}
	onConfirm={handleFinalize}
/>

<!-- Unlock Modal (Phase 4: Context-aware unlock) -->
<UnlockPageModal
	open={showUnlockModal}
	pageTitle={title}
	currentVersion={page?.currentVersion ?? 1}
	isInContext={page?.inContext ?? false}
	onClose={() => showUnlockModal = false}
	onConfirm={handleUnlock}
/>

<!-- Discard Changes Modal (Phase 4: Polish) -->
<DiscardChangesModal
	open={showDiscardModal}
	pageTitle={title}
	targetVersion={page?.currentVersion ?? 1}
	onClose={() => showDiscardModal = false}
	onConfirm={handleDiscardChanges}
/>

<!-- Restore Version Modal (Phase 3: Version Management) -->
<RestoreVersionModal
	open={showRestoreModal}
	pageTitle={title}
	versionNumber={restoreTargetVersion ?? 0}
	currentVersion={page?.currentVersion ?? 1}
	onClose={() => { showRestoreModal = false; restoreTargetVersion = null; }}
	onConfirm={handleRestoreVersion}
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

	/* Hide desktop header on mobile, show on desktop */
	.page-editor :global(.page-header) {
		display: none;
	}

	@media (min-width: 768px) {
		.page-editor :global(.page-header) {
			display: flex;
		}
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

	.editor-main.activity-open,
	.editor-main.version-history-open {
		margin-right: 380px;
	}

	.editor-main.chat-open.activity-open,
	.editor-main.chat-open.version-history-open {
		margin-right: 730px; /* 350px chat + 380px activity/version */
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

	.read-only-banner.finalized {
		background: rgba(34, 197, 94, 0.1);
		border-color: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.editor-body-wrapper {
		flex: 1;
		overflow-y: auto;
		padding: 2rem;
		position: relative; /* For floating formula bar positioning */
	}

	/* Floating Formula Bar - positioned below active table */
	.floating-formula-bar {
		position: absolute;
		z-index: 100;
		pointer-events: auto;
		animation: formula-bar-appear 200ms ease-out;
		min-width: 320px;
		max-width: calc(100% - 4rem); /* Respect padding */
	}

	@keyframes formula-bar-appear {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Reduce motion for accessibility */
	@media (prefers-reduced-motion: reduce) {
		.floating-formula-bar {
			animation: none;
		}
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

	/* Version history panel container */
	.version-panel-container {
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

	/* Version preview banner */
	.version-preview-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.625rem 1.5rem;
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid rgba(245, 158, 11, 0.25);
		border-radius: 0.5rem;
		margin: 0.75rem 1.5rem 0;
	}

	.preview-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #f59e0b;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.preview-date {
		color: var(--editor-text-secondary);
		font-weight: 400;
	}

	.preview-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.preview-restore-btn,
	.preview-back-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 100ms ease;
	}

	.preview-restore-btn {
		background: rgba(245, 158, 11, 0.15);
		border-color: rgba(245, 158, 11, 0.4);
		color: #f59e0b;
	}

	.preview-restore-btn:hover {
		background: rgba(245, 158, 11, 0.25);
		border-color: rgba(245, 158, 11, 0.6);
	}

	.preview-back-btn {
		background: var(--toolbar-button-hover);
		border-color: var(--editor-border);
		color: var(--editor-text-secondary);
	}

	.preview-back-btn:hover {
		background: var(--toolbar-button-active);
		color: var(--editor-text);
	}

	/* Diagram Modal */
	.diagram-modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.diagram-modal {
		width: 95vw;
		max-width: 1400px;
		height: 85vh;
		background: var(--editor-bg);
		border-radius: 1rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.diagram-modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--editor-border);
	}

	.diagram-modal-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--editor-text);
		margin: 0;
	}

	.diagram-modal-actions {
		display: flex;
		gap: 0.5rem;
	}

	.diagram-modal-cancel {
		padding: 0.5rem 1rem;
		background: transparent;
		border: 1px solid var(--editor-border);
		border-radius: 0.5rem;
		color: var(--editor-text-secondary);
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.diagram-modal-cancel:hover {
		background: var(--editor-bg-secondary);
		color: var(--editor-text);
	}

	.diagram-modal-content {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.diagram-library-sidebar {
		width: 280px;
		flex-shrink: 0;
		border-right: 1px solid var(--editor-border);
		background: var(--editor-bg-secondary);
		overflow: hidden;
		transition: width 200ms ease;
	}

	.diagram-library-sidebar.collapsed {
		width: 48px;
	}

	.diagram-modal-body {
		flex: 1;
		overflow: hidden;
	}

	/* Diagram Node styles (rendered in editor) */
	.editor-container :global(.diagram-node) {
		margin: 1.5rem 0;
		border-radius: 0.75rem;
		border: 2px dashed var(--editor-border);
		background: var(--editor-bg-secondary);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.editor-container :global(.diagram-node:hover) {
		border-color: var(--editor-border-focus);
		background: var(--toolbar-button-hover);
	}

	.editor-container :global(.diagram-preview) {
		min-height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.editor-container :global(.diagram-empty),
	.editor-container :global(.diagram-content) {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		color: var(--editor-text-secondary);
	}

	.editor-container :global(.diagram-empty-icon),
	.editor-container :global(.diagram-content-icon) {
		font-size: 2.5rem;
		opacity: 0.6;
	}

	.editor-container :global(.diagram-empty-text),
	.editor-container :global(.diagram-content-text) {
		font-size: 0.875rem;
	}

	.editor-container :global(.diagram-edit-hint) {
		font-size: 0.75rem;
		opacity: 0.6;
	}

	.editor-container :global(.diagram-caption) {
		padding: 0.5rem 1rem 1rem;
		text-align: center;
		font-size: 0.875rem;
		color: var(--editor-text-secondary);
		font-style: italic;
	}

	.editor-container :global(.diagram-error) {
		color: #ef4444;
		font-size: 0.875rem;
	}

	/* SVG diagram preview */
	.editor-container :global(.diagram-svg-container) {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: var(--editor-bg);
		border-radius: 0.5rem;
	}

	.editor-container :global(.diagram-svg-container svg) {
		max-width: 100%;
		height: auto;
		max-height: 500px;
	}

	.editor-container :global(.diagram-edit-overlay) {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 0.5rem;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.3));
		text-align: center;
		opacity: 0;
		transition: opacity 150ms ease;
	}

	.editor-container :global(.diagram-node:hover .diagram-edit-overlay) {
		opacity: 1;
	}

	.editor-container :global(.diagram-preview) {
		position: relative;
	}
</style>
