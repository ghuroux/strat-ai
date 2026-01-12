<script lang="ts">
	/**
	 * EditorToolbar.svelte - Formatting toolbar with Word-like appearance
	 *
	 * Toolbar Groups (per DOCUMENT_SYSTEM.md Section 4.2):
	 * 1. Text Formatting: Bold, Italic, Underline, Strikethrough
	 * 2. Headings: H1, H2, H3
	 * 3. Lists: Bullet, Numbered, Checklist
	 * 4. Blocks: Quote, Code Block
	 * 5. Insert: Link, Horizontal Rule
	 *
	 * Keyboard shortcuts displayed in tooltips.
	 */

	import type { Editor } from '@tiptap/core';

	// Props
	interface Props {
		editor: Editor;
		editorTick?: number; // Increments on each transaction to trigger reactivity
	}

	let { editor, editorTick = 0 }: Props = $props();

	// Link modal state
	let showLinkModal = $state(false);
	let linkUrl = $state('');
	let selectedText = $state('');

	// Reactive format states - depend on editorTick to re-evaluate on cursor changes
	// The `editorTick >= 0` check ensures Svelte tracks editorTick as a dependency
	let canUndo = $derived(editorTick >= 0 && editor.can().undo());
	let canRedo = $derived(editorTick >= 0 && editor.can().redo());
	let isBoldActive = $derived(editorTick >= 0 && editor.isActive('bold'));
	let isItalicActive = $derived(editorTick >= 0 && editor.isActive('italic'));
	let isUnderlineActive = $derived(editorTick >= 0 && editor.isActive('underline'));
	let isStrikeActive = $derived(editorTick >= 0 && editor.isActive('strike'));
	let isParagraphActive = $derived(
		editorTick >= 0 &&
		editor.isActive('paragraph') &&
		!editor.isActive('heading')
	);
	let isH1Active = $derived(editorTick >= 0 && editor.isActive('heading', { level: 1 }));
	let isH2Active = $derived(editorTick >= 0 && editor.isActive('heading', { level: 2 }));
	let isH3Active = $derived(editorTick >= 0 && editor.isActive('heading', { level: 3 }));
	let isBulletListActive = $derived(editorTick >= 0 && editor.isActive('bulletList'));
	let isOrderedListActive = $derived(editorTick >= 0 && editor.isActive('orderedList'));
	let isTaskListActive = $derived(editorTick >= 0 && editor.isActive('taskList'));
	let isBlockquoteActive = $derived(editorTick >= 0 && editor.isActive('blockquote'));
	let isCodeBlockActive = $derived(editorTick >= 0 && editor.isActive('codeBlock'));
	let isLinkActive = $derived(editorTick >= 0 && editor.isActive('link'));

	// Check if OS is Mac for shortcut display
	const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	const modKey = isMac ? '⌘' : 'Ctrl';

	// Handle link insertion
	function handleSetLink() {
		if (linkUrl) {
			editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
		} else {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
		}
		showLinkModal = false;
		linkUrl = '';
	}

	function openLinkModal() {
		// Get existing link URL if any
		const previousUrl = editor.getAttributes('link').href;
		linkUrl = previousUrl || '';

		// Get selected text for display
		const { from, to } = editor.state.selection;
		selectedText = editor.state.doc.textBetween(from, to, ' ');

		showLinkModal = true;

		// Auto-focus input after modal renders
		setTimeout(() => {
			const input = document.querySelector('.link-input') as HTMLInputElement;
			input?.focus();
			input?.select();
		}, 50);
	}

	function handleLinkKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSetLink();
		} else if (e.key === 'Escape') {
			showLinkModal = false;
			linkUrl = '';
		}
	}
</script>

<div class="editor-toolbar">
	<!-- Group 0: History (Undo/Redo) -->
	<div class="toolbar-group">
		<button
			type="button"
			class="toolbar-btn"
			onclick={() => editor.chain().focus().undo().run()}
			disabled={!canUndo}
			title="Undo ({modKey}+Z)"
		>
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M3 7v6h6" />
				<path d="M3 13c0-4.97 4.03-9 9-9a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-7.5-4" />
			</svg>
		</button>

		<button
			type="button"
			class="toolbar-btn"
			onclick={() => editor.chain().focus().redo().run()}
			disabled={!canRedo}
			title="Redo ({modKey}+Shift+Z)"
		>
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 7v6h-6" />
				<path d="M21 13c0-4.97-4.03-9-9-9a9 9 0 0 0-9 9 9 9 0 0 0 9 9 9 9 0 0 0 7.5-4" />
			</svg>
		</button>
	</div>

	<div class="toolbar-divider"></div>

	<!-- Group 1: Text Formatting -->
	<div class="toolbar-group">
		<button
			type="button"
			class="toolbar-btn"
			class:active={isBoldActive}
			onclick={() => editor.chain().focus().toggleBold().run()}
			title="Bold ({modKey}+B)"
		>
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
				<path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
			</svg>
		</button>

		<button
			type="button"
			class="toolbar-btn"
			class:active={isItalicActive}
			onclick={() => editor.chain().focus().toggleItalic().run()}
			title="Italic ({modKey}+I)"
		>
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="19" y1="4" x2="10" y2="4" />
				<line x1="14" y1="20" x2="5" y2="20" />
				<line x1="15" y1="4" x2="9" y2="20" />
			</svg>
		</button>

		<button
			type="button"
			class="toolbar-btn"
			class:active={isUnderlineActive}
			onclick={() => editor.chain().focus().toggleUnderline().run()}
			title="Underline ({modKey}+U)"
		>
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
				<line x1="4" y1="21" x2="20" y2="21" />
			</svg>
		</button>

		<button
			type="button"
			class="toolbar-btn"
			class:active={isStrikeActive}
			onclick={() => editor.chain().focus().toggleStrike().run()}
			title="Strikethrough"
		>
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M16 4H9a3 3 0 0 0-2.83 4" />
				<path d="M14 12a4 4 0 0 1 0 8H6" />
				<line x1="4" y1="12" x2="20" y2="12" />
			</svg>
		</button>

		<button
			type="button"
			class="toolbar-btn"
			onclick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
			title="Clear formatting"
		>
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M4 7h16" />
				<path d="M10 11l-6 6" />
				<path d="M14 4l-9 9" />
				<path d="M14 4l3 3" />
				<path d="M14 11h6" />
				<path d="M14 15h6" />
				<path d="M14 19h6" />
			</svg>
		</button>
	</div>

	<div class="toolbar-divider"></div>

	<!-- Group 2: Headings -->
	<div class="toolbar-group">
		<button
			type="button"
			class="toolbar-btn"
			class:active={isParagraphActive}
			onclick={() => editor.chain().focus().setParagraph().run()}
			title="Normal text ({modKey}+Alt+0)"
		>
			<span class="text-label">P</span>
		</button>

		<button
			type="button"
			class="toolbar-btn"
			class:active={isH1Active}
			onclick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
			title="Heading 1 ({modKey}+Alt+1)"
		>
			<span class="text-label">H1</span>
		</button>

		<button
			type="button"
			class="toolbar-btn"
			class:active={isH2Active}
			onclick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
			title="Heading 2 ({modKey}+Alt+2)"
		>
			<span class="text-label">H2</span>
		</button>

		<button
			type="button"
			class="toolbar-btn"
			class:active={isH3Active}
			onclick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
			title="Heading 3 ({modKey}+Alt+3)"
		>
			<span class="text-label">H3</span>
		</button>
	</div>

	<div class="toolbar-divider"></div>

	<!-- Group 3: Lists -->
	<div class="toolbar-group">
		<button
			type="button"
			class="toolbar-btn"
			class:active={isBulletListActive}
			onclick={() => editor.chain().focus().toggleBulletList().run()}
			title="Bullet List ({modKey}+Shift+8)"
		>
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="8" y1="6" x2="21" y2="6" />
				<line x1="8" y1="12" x2="21" y2="12" />
				<line x1="8" y1="18" x2="21" y2="18" />
				<circle cx="4" cy="6" r="1" fill="currentColor" />
				<circle cx="4" cy="12" r="1" fill="currentColor" />
				<circle cx="4" cy="18" r="1" fill="currentColor" />
			</svg>
		</button>

		<button
			type="button"
			class="toolbar-btn"
			class:active={isOrderedListActive}
			onclick={() => editor.chain().focus().toggleOrderedList().run()}
			title="Numbered List ({modKey}+Shift+7)"
		>
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="10" y1="6" x2="21" y2="6" />
				<line x1="10" y1="12" x2="21" y2="12" />
				<line x1="10" y1="18" x2="21" y2="18" />
				<text x="3" y="8" font-size="6" fill="currentColor">1</text>
				<text x="3" y="14" font-size="6" fill="currentColor">2</text>
				<text x="3" y="20" font-size="6" fill="currentColor">3</text>
			</svg>
		</button>

		<button
			type="button"
			class="toolbar-btn"
			class:active={isTaskListActive}
			onclick={() => editor.chain().focus().toggleTaskList().run()}
			title="Checklist"
		>
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="3" y="5" width="6" height="6" rx="1" />
				<path d="M5 11l1 1 2-2" />
				<line x1="12" y1="8" x2="21" y2="8" />
				<rect x="3" y="13" width="6" height="6" rx="1" />
				<line x1="12" y1="16" x2="21" y2="16" />
			</svg>
		</button>
	</div>

	<div class="toolbar-divider"></div>

	<!-- Group 4: Blocks -->
	<div class="toolbar-group">
		<button
			type="button"
			class="toolbar-btn"
			class:active={isBlockquoteActive}
			onclick={() => editor.chain().focus().toggleBlockquote().run()}
			title="Quote ({modKey}+Shift+B)"
		>
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
				<path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
			</svg>
		</button>

		<button
			type="button"
			class="toolbar-btn"
			class:active={isCodeBlockActive}
			onclick={() => editor.chain().focus().toggleCodeBlock().run()}
			title="Code Block ({modKey}+Alt+C)"
		>
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="16 18 22 12 16 6" />
				<polyline points="8 6 2 12 8 18" />
			</svg>
		</button>
	</div>

	<div class="toolbar-divider"></div>

	<!-- Group 5: Insert -->
	<div class="toolbar-group">
		<button
			type="button"
			class="toolbar-btn"
			class:active={isLinkActive}
			onclick={openLinkModal}
			title="Link ({modKey}+K)"
		>
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
				<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
			</svg>
		</button>

		<button
			type="button"
			class="toolbar-btn"
			onclick={() => editor.chain().focus().setHorizontalRule().run()}
			title="Horizontal Rule"
		>
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="3" y1="12" x2="21" y2="12" />
			</svg>
		</button>
	</div>
</div>

<!-- Link Modal -->
{#if showLinkModal}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="link-modal-overlay" onclick={() => (showLinkModal = false)} onkeydown={handleLinkKeydown}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="link-modal" onclick={(e) => e.stopPropagation()}>
			<div class="link-modal-header">
				<span>Insert Link</span>
				<button type="button" class="link-modal-close" onclick={() => (showLinkModal = false)} aria-label="Close">
					<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
			<div class="link-modal-body">
				{#if selectedText}
					<div class="link-selected-text">
						<span class="link-selected-label">Link text:</span>
						<span class="link-selected-value">{selectedText}</span>
					</div>
				{/if}
				<input
					type="url"
					bind:value={linkUrl}
					placeholder="https://example.com"
					class="link-input"
					onkeydown={handleLinkKeydown}
				/>
			</div>
			<div class="link-modal-footer">
				{#if isLinkActive}
					<button
						type="button"
						class="btn-remove"
						onclick={() => {
							editor.chain().focus().unsetLink().run();
							showLinkModal = false;
							linkUrl = '';
							selectedText = '';
						}}
					>
						Remove link
					</button>
				{/if}
				<div class="link-modal-actions">
					<button type="button" class="btn-cancel" onclick={() => (showLinkModal = false)}>Cancel</button>
					<button type="button" class="btn-apply" onclick={handleSetLink}>Apply</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.editor-toolbar {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 1rem;
		background: var(--toolbar-bg);
		border-bottom: 1px solid var(--toolbar-border);
		flex-wrap: wrap;
	}

	.toolbar-group {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.toolbar-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: transparent;
		border-radius: 4px;
		color: var(--editor-text-secondary);
		cursor: pointer;
		transition: background-color 100ms ease, color 100ms ease;
	}

	.toolbar-btn:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	.toolbar-btn.active {
		background: var(--toolbar-button-active);
		color: var(--editor-text);
	}

	.toolbar-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.toolbar-btn:disabled:hover {
		background: transparent;
		color: var(--editor-text-secondary);
	}

	.toolbar-divider {
		width: 1px;
		height: 24px;
		background: var(--toolbar-border);
		margin: 0 0.5rem;
	}

	.icon {
		width: 18px;
		height: 18px;
	}

	.icon-sm {
		width: 16px;
		height: 16px;
	}

	.text-label {
		font-size: 0.75rem;
		font-weight: 600;
	}

	/* Link Modal */
	.link-modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.link-modal {
		background: var(--editor-bg);
		border: 1px solid var(--editor-border);
		border-radius: 8px;
		width: 100%;
		max-width: 400px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}

	.link-modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid var(--editor-border);
		font-weight: 500;
	}

	.link-modal-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: none;
		background: transparent;
		border-radius: 4px;
		color: var(--editor-text-secondary);
		cursor: pointer;
	}

	.link-modal-close:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	.link-modal-body {
		padding: 1rem;
	}

	/* Selected text display */
	.link-selected-text {
		margin-bottom: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: var(--toolbar-button-hover);
		border-radius: 4px;
		font-size: 0.8125rem;
	}

	.link-selected-label {
		color: var(--editor-text-secondary);
		margin-right: 0.5rem;
	}

	.link-selected-value {
		color: var(--editor-text);
		font-weight: 500;
	}

	.link-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--editor-border);
		border-radius: 6px;
		background: var(--editor-bg-secondary);
		color: var(--editor-text);
		font-size: 0.875rem;
	}

	.link-input:focus {
		outline: none;
		border-color: var(--editor-border-focus);
	}

	.link-modal-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		border-top: 1px solid var(--editor-border);
	}

	.link-modal-actions {
		display: flex;
		gap: 0.5rem;
		margin-left: auto;
	}

	/* Remove link button */
	.btn-remove {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		transition: background-color 100ms ease;
	}

	.btn-remove:hover {
		background: rgba(239, 68, 68, 0.2);
	}

	.btn-cancel,
	.btn-apply {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 100ms ease;
	}

	.btn-cancel {
		background: transparent;
		color: var(--editor-text-secondary);
	}

	.btn-cancel:hover {
		background: var(--toolbar-button-hover);
	}

	.btn-apply {
		background: var(--editor-border-focus);
		color: white;
	}

	.btn-apply:hover {
		filter: brightness(1.1);
	}
</style>
