<script lang="ts">
	/**
	 * CreatePageModal.svelte - Create page from chat conversation
	 *
	 * Features:
	 * - "What to capture" options (4 radio buttons)
	 * - Page type dropdown with AI suggestion
	 * - Title input with AI suggestion
	 * - Preview panel showing extracted content
	 * - Loading state during extraction
	 *
	 * Based on DOCUMENT_SYSTEM.md Phase 5 specification.
	 */

	import type { Message } from '$lib/types/chat';
	import type { PageType, TipTapContent } from '$lib/types/page';
	import { PAGE_TYPE_LABELS } from '$lib/types/page';
	import {
		detectPageType,
		suggestTitle,
		EXTRACTION_OPTIONS,
		type ExtractionType
	} from '$lib/utils/page-detection';
	import { getAllPageTypes } from '$lib/config/page-templates';

	// Props
	interface Props {
		isOpen: boolean;
		conversationId: string;
		messages: Message[];
		areaId: string;
		suggestedPageType?: PageType; // Optional pre-selected type from page suggestion (P6-IN-01)
		sourceMessageId?: string | null; // Optional: specific message to create page from (when clicking "create page" on a message)
		onClose: () => void;
		onCreated: (pageId: string) => void;
	}

	let { isOpen, conversationId, messages, areaId, suggestedPageType, sourceMessageId = null, onClose, onCreated }: Props = $props();

	// When sourceMessageId is provided, filter messages to include only up to that message
	// This ensures we create a page from the specific response the user clicked, not the last one
	let effectiveMessages = $derived.by(() => {
		if (!sourceMessageId) return messages;

		const messageIndex = messages.findIndex(m => m.id === sourceMessageId);
		if (messageIndex === -1) return messages;

		// Include all messages up to and including the source message
		return messages.slice(0, messageIndex + 1);
	});

	// Get all page types for dropdown
	const pageTypes = getAllPageTypes();

	// State
	let extractionType = $state<ExtractionType>('summary');
	let customInstructions = $state('');
	let selectedPageType = $state<PageType>('general');
	let title = $state('');
	let extractedContent = $state<TipTapContent | null>(null);
	let isExtracting = $state(false);
	let isCreating = $state(false);
	let error = $state<string | null>(null);

	// AI suggestions
	let suggestedType = $state<PageType>('general');
	let suggestedTitle = $state('');

	// Initialize with AI suggestions when modal opens
	$effect(() => {
		if (isOpen && effectiveMessages.length > 0) {
			// Use suggested page type if provided (P6-IN-01), otherwise detect
			if (suggestedPageType) {
				suggestedType = suggestedPageType;
				selectedPageType = suggestedPageType;
			} else {
				const detection = detectPageType(effectiveMessages);
				suggestedType = detection.pageType;
				selectedPageType = detection.pageType;
			}

			// Suggest title based on effective messages (may be filtered to specific message)
			suggestedTitle = suggestTitle(effectiveMessages);
			title = suggestedTitle;

			// Reset state
			extractionType = 'summary';
			customInstructions = '';
			extractedContent = null;
			error = null;
		}
	});

	/**
	 * Validate TipTap content structure
	 */
	function isValidTipTapContent(content: TipTapContent | null): content is TipTapContent {
		if (!content) return false;
		if (content.type !== 'doc') return false;
		if (!Array.isArray(content.content)) return false;
		if (content.content.length === 0) return false;

		// Check for raw JSON in text content (indicates failed parsing)
		for (const node of content.content) {
			if (node.type === 'paragraph' && node.content?.[0]?.text) {
				const text = node.content[0].text;
				if (text.trim().startsWith('{"type":') || text.trim().startsWith('{ "type":')) {
					console.error('[CreatePageModal] Invalid content - raw JSON detected');
					return false;
				}
			}
		}

		return true;
	}

	// Extract content when extraction type or page type changes
	// Returns true if extraction succeeded, false otherwise
	async function handleExtract(): Promise<boolean> {
		if (!effectiveMessages.length) {
			error = 'No messages to extract from';
			return false;
		}

		isExtracting = true;
		error = null;

		try {
			console.log('[CreatePageModal] Calling extract API with extractionType:', extractionType);
			console.log('[CreatePageModal] Using', effectiveMessages.length, 'messages (sourceMessageId:', sourceMessageId, ')');
			const response = await fetch('/api/pages/extract', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: effectiveMessages,
					extractionType,
					pageType: selectedPageType,
					customInstructions: extractionType === 'custom' ? customInstructions : undefined
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || data.details || 'Extraction failed');
			}

			const data = await response.json();
			console.log('[CreatePageModal] Extract API response:', JSON.stringify(data).substring(0, 500));
			console.log('[CreatePageModal] Content type:', data.content?.type);
			console.log('[CreatePageModal] First node:', JSON.stringify(data.content?.content?.[0]).substring(0, 200));

			// Log retry metadata for debugging
			if (data.meta?.attempts > 1) {
				console.log('[CreatePageModal] Extraction succeeded after retry:', data.meta.retryReason);
			}

			// Validate the extracted content
			if (!isValidTipTapContent(data.content)) {
				throw new Error('Extraction returned invalid content. Please try again.');
			}

			extractedContent = data.content;
			return true;
		} catch (err) {
			console.error('Extraction error:', err);
			error = err instanceof Error ? err.message : 'Failed to extract content';
			extractedContent = null;
			return false;
		} finally {
			isExtracting = false;
		}
	}

	// Create the page
	async function handleCreate() {
		if (!title.trim() || isCreating) return;

		isCreating = true;
		error = null;

		try {
			// If no content extracted yet, do it now
			let contentToSave = extractedContent;
			if (!isValidTipTapContent(contentToSave)) {
				// Need to extract content first
				const extractionSucceeded = await handleExtract();

				if (!extractionSucceeded) {
					// handleExtract already set the error state
					isCreating = false;
					return;
				}

				// After successful extraction, get the content
				contentToSave = extractedContent;
			}

			// Final validation - ensure we have valid content
			if (!isValidTipTapContent(contentToSave)) {
				throw new Error('Failed to extract valid content from conversation. Please try generating a preview first.');
			}

			console.log('[CreatePageModal] Content to save:', JSON.stringify(contentToSave).substring(0, 200));

			const response = await fetch('/api/pages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					areaId,
					title: title.trim(),
					content: contentToSave,
					pageType: selectedPageType,
					visibility: 'private',
					sourceConversationId: conversationId
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to create page');
			}

			const data = await response.json();
			onCreated(data.page.id);
		} catch (err) {
			console.error('Create error:', err);
			error = err instanceof Error ? err.message : 'Failed to create page';
		} finally {
			isCreating = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	// Convert TipTap content to readable preview text
	function contentToPreview(content: TipTapContent | null): string {
		if (!content) return '';

		function nodeToText(node: { type: string; text?: string; content?: unknown[] }): string {
			if (node.text) return node.text;
			if (node.content && Array.isArray(node.content)) {
				return node.content.map((n) => nodeToText(n as { type: string; text?: string; content?: unknown[] })).join('');
			}
			if (node.type === 'paragraph' || node.type === 'heading') {
				return '\n';
			}
			if (node.type === 'bulletList' || node.type === 'orderedList') {
				return '\n';
			}
			if (node.type === 'listItem') {
				return '• ';
			}
			return '';
		}

		return content.content
			.map((n) => nodeToText(n as { type: string; text?: string; content?: unknown[] }))
			.join('')
			.trim();
	}

	let previewText = $derived(contentToPreview(extractedContent));
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<div class="modal-backdrop" onclick={onClose} role="presentation">
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			tabindex="-1"
		>
			<!-- Header -->
			<div class="modal-header">
				<h2 id="modal-title">Create Page</h2>
				<button type="button" class="close-button" onclick={onClose} title="Close">
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
					</svg>
				</button>
			</div>

			<!-- Content -->
			<div class="modal-content">
				<!-- What to capture -->
				<div class="field">
					<label class="field-label">What to capture:</label>
					<div class="radio-group">
						{#each EXTRACTION_OPTIONS as option (option.type)}
							<label class="radio-option">
								<input
									type="radio"
									name="extraction-type"
									value={option.type}
									bind:group={extractionType}
								/>
								<div class="radio-content">
									<span class="radio-label">
										{option.label}
										{#if option.type === 'summary'}
											<span class="recommended">(Recommended)</span>
										{/if}
									</span>
									<span class="radio-description">{option.description}</span>
								</div>
							</label>
						{/each}
					</div>

					<!-- Custom instructions input -->
					{#if extractionType === 'custom'}
						<div class="custom-instructions">
							<textarea
								bind:value={customInstructions}
								placeholder="Enter your extraction instructions..."
								rows="3"
							></textarea>
						</div>
					{/if}
				</div>

				<!-- Page type -->
				<div class="field">
					<label class="field-label" for="page-type">
						Page type:
						{#if selectedPageType === suggestedType && suggestedType !== 'general'}
							<span class="ai-suggested">AI suggested</span>
						{/if}
					</label>
					<select id="page-type" bind:value={selectedPageType}>
						{#each pageTypes as pt (pt.type)}
							<option value={pt.type}>{pt.label}</option>
						{/each}
					</select>
				</div>

				<!-- Title -->
				<div class="field">
					<label class="field-label" for="page-title">
						Title:
						{#if title === suggestedTitle && suggestedTitle !== 'Untitled Page'}
							<span class="ai-suggested">AI suggested</span>
						{/if}
					</label>
					<input
						id="page-title"
						type="text"
						bind:value={title}
						placeholder="Enter page title"
					/>
				</div>

				<!-- Preview -->
				<div class="field">
					<div class="preview-header">
						<label class="field-label">Preview:</label>
						<button
							type="button"
							class="extract-button"
							onclick={handleExtract}
							disabled={isExtracting}
						>
							{#if isExtracting}
								<span class="spinner"></span>
								Extracting...
							{:else}
								<svg viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
								</svg>
								Generate Preview
							{/if}
						</button>
					</div>
					<div class="preview-panel">
						{#if isExtracting}
							<div class="preview-loading">
								<div class="spinner"></div>
								<span>Extracting content...</span>
							</div>
						{:else if previewText}
							<div class="preview-content">{previewText}</div>
						{:else}
							<div class="preview-empty">
								Click "Generate Preview" to see extracted content
							</div>
						{/if}
					</div>
				</div>

				<!-- Error message with suggestions -->
				{#if error}
					<div class="error-message">
						<span class="error-text">{error}</span>
						{#if error.includes('invalid content') || error.includes('failed') || error.includes('Extraction')}
							<div class="error-suggestions">
								<strong>Try:</strong>
								<ul>
									<li>Select a different extraction type (e.g., "Summary" instead of "Last AI response")</li>
									<li>Shorten the conversation before extracting</li>
									<li>Use "Custom" extraction with specific instructions</li>
								</ul>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="modal-footer">
				<button type="button" class="cancel-button" onclick={onClose}>
					Cancel
				</button>
				<button
					type="button"
					class="primary-button"
					onclick={handleCreate}
					disabled={!title.trim() || isCreating}
				>
					{#if isCreating}
						<span class="spinner"></span>
						Creating...
					{:else}
						Create Page
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		z-index: 100;
		padding: 1rem;
	}

	.modal {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 560px;
		max-height: calc(100vh - 4rem);
		background: var(--editor-bg);
		border: 1px solid var(--editor-border);
		border-radius: 16px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--editor-border);
	}

	.modal-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--editor-text);
		margin: 0;
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: transparent;
		border-radius: 8px;
		color: var(--editor-text-secondary);
		cursor: pointer;
		transition: background-color 100ms ease, color 100ms ease;
	}

	.close-button:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	.close-button svg {
		width: 18px;
		height: 18px;
	}

	.modal-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--editor-text);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.ai-suggested {
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--editor-border-focus);
		background: color-mix(in srgb, var(--editor-border-focus) 15%, transparent);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
	}

	.radio-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.radio-option {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--card-bg);
		border: 1px solid var(--card-border);
		border-radius: 8px;
		cursor: pointer;
		transition: border-color 150ms ease;
	}

	.radio-option:hover {
		border-color: var(--editor-border-focus);
	}

	.radio-option:has(input:checked) {
		border-color: var(--editor-border-focus);
		background: color-mix(in srgb, var(--card-bg) 90%, var(--editor-border-focus));
	}

	.radio-option input {
		margin: 0.125rem 0 0 0;
		accent-color: var(--editor-border-focus);
	}

	.radio-content {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.radio-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--editor-text);
	}

	.recommended {
		font-weight: 400;
		color: var(--editor-border-focus);
	}

	.radio-description {
		font-size: 0.75rem;
		color: var(--editor-text-secondary);
	}

	.custom-instructions {
		margin-top: 0.5rem;
	}

	.custom-instructions textarea {
		width: 100%;
		padding: 0.625rem;
		border: 1px solid var(--editor-border);
		border-radius: 8px;
		background: var(--editor-bg);
		color: var(--editor-text);
		font-size: 0.875rem;
		resize: vertical;
	}

	.custom-instructions textarea:focus {
		outline: none;
		border-color: var(--editor-border-focus);
	}

	select,
	input[type="text"] {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--editor-border);
		border-radius: 8px;
		background: var(--editor-bg);
		color: var(--editor-text);
		font-size: 0.875rem;
	}

	select:focus,
	input[type="text"]:focus {
		outline: none;
		border-color: var(--editor-border-focus);
	}

	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.extract-button {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		border: 1px solid var(--editor-border);
		background: transparent;
		color: var(--editor-text-secondary);
		border-radius: 6px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: border-color 150ms ease, color 150ms ease;
	}

	.extract-button:hover:not(:disabled) {
		border-color: var(--editor-border-focus);
		color: var(--editor-text);
	}

	.extract-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.extract-button svg {
		width: 14px;
		height: 14px;
	}

	.preview-panel {
		min-height: 120px;
		max-height: 200px;
		overflow-y: auto;
		padding: 0.75rem;
		border: 1px solid var(--editor-border);
		border-radius: 8px;
		background: var(--card-bg);
	}

	.preview-loading,
	.preview-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		height: 100px;
		color: var(--editor-text-muted);
		font-size: 0.875rem;
	}

	.preview-content {
		font-size: 0.8125rem;
		color: var(--editor-text-secondary);
		white-space: pre-wrap;
		line-height: 1.5;
	}

	.error-message {
		padding: 0.75rem;
		background: color-mix(in srgb, #ef4444 15%, transparent);
		border: 1px solid #ef4444;
		border-radius: 8px;
		color: #ef4444;
		font-size: 0.875rem;
	}

	.error-text {
		display: block;
	}

	.error-suggestions {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
		font-size: 0.8125rem;
	}

	.error-suggestions strong {
		display: block;
		margin-bottom: 0.375rem;
		color: var(--editor-text-secondary);
	}

	.error-suggestions ul {
		margin: 0;
		padding-left: 1.25rem;
		color: var(--editor-text-secondary);
	}

	.error-suggestions li {
		margin-bottom: 0.25rem;
	}

	.error-suggestions li:last-child {
		margin-bottom: 0;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--editor-border);
	}

	.cancel-button {
		padding: 0.625rem 1rem;
		border: 1px solid var(--editor-border);
		background: transparent;
		color: var(--editor-text);
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 100ms ease;
	}

	.cancel-button:hover {
		background: var(--toolbar-button-hover);
	}

	.primary-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		border: none;
		background: var(--editor-border-focus);
		color: white;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: filter 150ms ease, opacity 150ms ease;
	}

	.primary-button:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.primary-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
