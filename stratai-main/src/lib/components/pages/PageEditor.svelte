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
	import { common, createLowlight } from 'lowlight';
	import type { Page, TipTapContent, PageType, PageVisibility } from '$lib/types/page';
	import { EMPTY_TIPTAP_CONTENT, countWords, extractTextFromContent } from '$lib/types/page';
	import EditorToolbar from './EditorToolbar.svelte';
	import PageHeader from './PageHeader.svelte';
	import EditorChatPanel from './EditorChatPanel.svelte';

	// Props
	interface Props {
		page?: Page | null;
		areaId: string;
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
					placeholder: 'Start typing your content...'
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
				CodeBlockLowlight.configure({
					lowlight
				})
			],
			content: content,
			onUpdate: ({ editor: ed }) => {
				content = ed.getJSON() as TipTapContent;
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

		// Add keyboard shortcut for save
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 's') {
				e.preventDefault();
				handleSave();
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

	// Auto-save with 30-second debounce
	function scheduleAutoSave() {
		if (autoSaveTimer) {
			clearTimeout(autoSaveTimer);
		}
		autoSaveTimer = setTimeout(() => {
			if (isDirty) {
				handleSave();
			}
		}, 30000); // 30 seconds
	}

	// Handle save
	async function handleSave() {
		if (isSaving) return;

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
</script>

<div class="page-editor" class:chat-open={chatPanelOpen}>
	<!-- Header -->
	<PageHeader
		pageId={page?.id}
		{title}
		{pageType}
		{visibility}
		{saveStatus}
		{isDirty}
		onTitleChange={handleTitleChange}
		onVisibilityChange={handleVisibilityChange}
		onSave={handleSave}
		onClose={handleClose}
	/>

	<!-- Main content area -->
	<div class="editor-content">
		<!-- Editor main area -->
		<div class="editor-main" class:chat-open={chatPanelOpen}>
			<!-- Toolbar -->
			{#if editor}
				<EditorToolbar {editor} {editorTick} />
			{/if}

			<!-- Editor body -->
			<div class="editor-body-wrapper">
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

	.editor-body-wrapper {
		flex: 1;
		overflow-y: auto;
		padding: 2rem;
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
</style>
