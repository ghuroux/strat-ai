<script lang="ts">
	/**
	 * PageHeader.svelte - Header with title, type badge, and actions
	 *
	 * Features:
	 * - Editable title
	 * - Page type badge
	 * - Save button with status indicator
	 * - Back navigation
	 * - Visibility toggle (P9-VT-*)
	 * - Export menu (P9-EM-*)
	 *
	 * Based on DOCUMENT_SYSTEM.md Section 4.1 specification
	 */

	import type { PageType, PageVisibility } from '$lib/types/page';
	import { PAGE_TYPE_LABELS } from '$lib/types/page';
	import ExportMenu from './ExportMenu.svelte';

	// Props
	interface Props {
		pageId?: string;
		title: string;
		pageType: PageType;
		visibility?: PageVisibility;
		saveStatus: 'idle' | 'saving' | 'saved' | 'error';
		isDirty: boolean;
		onTitleChange: (title: string) => void;
		onVisibilityChange?: (visibility: PageVisibility) => void;
		onSave: () => void;
		onClose: () => void;
	}

	let {
		pageId,
		title,
		pageType,
		visibility = 'private',
		saveStatus,
		isDirty,
		onTitleChange,
		onVisibilityChange,
		onSave,
		onClose
	}: Props = $props();

	// Local state for title editing
	let isEditingTitle = $state(false);
	let editedTitle = $state('');
	let titleInputRef: HTMLInputElement | null = $state(null);

	// Visibility confirmation modal state
	let showVisibilityModal = $state(false);
	let pendingVisibility = $state<PageVisibility | null>(null);

	// Sync editedTitle with title prop when it changes (and not currently editing)
	$effect(() => {
		if (!isEditingTitle) {
			editedTitle = title;
		}
	});

	// Auto-focus and select title input when editing starts
	$effect(() => {
		if (isEditingTitle && titleInputRef) {
			titleInputRef.focus();
			titleInputRef.select();
		}
	});

	// Derived save button text
	let saveButtonText = $derived.by(() => {
		switch (saveStatus) {
			case 'saving':
				return 'Saving...';
			case 'saved':
				return 'Saved';
			case 'error':
				return 'Error';
			default:
				return isDirty ? 'Save' : 'Saved';
		}
	});

	function handleTitleBlur() {
		isEditingTitle = false;
		if (editedTitle.trim() && editedTitle !== title) {
			onTitleChange(editedTitle.trim());
		} else {
			editedTitle = title;
		}
	}

	function handleTitleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			(e.target as HTMLInputElement).blur();
		} else if (e.key === 'Escape') {
			editedTitle = title;
			isEditingTitle = false;
		}
	}

	function startEditingTitle() {
		editedTitle = title;
		isEditingTitle = true;
	}

	/**
	 * Handle visibility change
	 * P9-VT-03: Clicking updates visibility
	 * P2-VC-01: Show confirmation when changing to shared
	 */
	function handleVisibilityChange(newVisibility: PageVisibility) {
		if (!onVisibilityChange || newVisibility === visibility) return;

		// Confirmation only needed when making public (private → area)
		if (newVisibility === 'area' && visibility === 'private') {
			pendingVisibility = newVisibility;
			showVisibilityModal = true;
		} else {
			// No confirmation needed for area → private (reducing access)
			onVisibilityChange(newVisibility);
		}
	}

	function confirmVisibilityChange() {
		if (pendingVisibility && onVisibilityChange) {
			onVisibilityChange(pendingVisibility);
		}
		showVisibilityModal = false;
		pendingVisibility = null;
	}

	function cancelVisibilityChange() {
		showVisibilityModal = false;
		pendingVisibility = null;
	}

	// Get type label
	const typeLabel = $derived(PAGE_TYPE_LABELS[pageType] || pageType);
</script>

<header class="page-header">
	<div class="header-left">
		<button type="button" class="back-btn" onclick={onClose} title="Back to documents">
			<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M19 12H5M12 19l-7-7 7-7" />
			</svg>
			<span class="back-text">Back</span>
		</button>

		<div class="title-section">
			{#if isEditingTitle}
				<input
					type="text"
					class="title-input"
					bind:this={titleInputRef}
					bind:value={editedTitle}
					onblur={handleTitleBlur}
					onkeydown={handleTitleKeydown}
				/>
			{:else}
				<button type="button" class="title-display" onclick={startEditingTitle}>
					{title}
				</button>
			{/if}

			<span class="type-badge">{typeLabel}</span>
		</div>
	</div>

	<div class="header-right">
		<!-- P9-VT-01: Visibility toggle visible in header -->
		{#if onVisibilityChange}
			<div class="visibility-toggle" role="group" aria-label="Page visibility">
				<button
					type="button"
					class="visibility-btn"
					class:active={visibility === 'private'}
					onclick={() => handleVisibilityChange('private')}
					title="Only you can see this page"
				>
					<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
						<path d="M7 11V7a5 5 0 0 1 10 0v4" />
					</svg>
					<span>Private</span>
				</button>
				<button
					type="button"
					class="visibility-btn"
					class:active={visibility === 'area'}
					onclick={() => handleVisibilityChange('area')}
					title="Area members can see this page"
				>
					<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
						<circle cx="9" cy="7" r="4" />
						<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
						<path d="M16 3.13a4 4 0 0 1 0 7.75" />
					</svg>
					<span>Shared</span>
				</button>
			</div>
		{/if}

		{#if saveStatus === 'error'}
			<span class="save-error">Failed to save</span>
		{/if}

		<button
			type="button"
			class="save-btn"
			class:saving={saveStatus === 'saving'}
			class:saved={saveStatus === 'saved'}
			class:dirty={isDirty && saveStatus === 'idle'}
			onclick={onSave}
			disabled={saveStatus === 'saving' || (!isDirty && saveStatus !== 'error')}
		>
			{#if saveStatus === 'saving'}
				<svg class="icon spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="8" />
				</svg>
			{:else if saveStatus === 'saved'}
				<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="20 6 9 17 4 12" />
				</svg>
			{:else}
				<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
					<polyline points="17 21 17 13 7 13 7 21" />
					<polyline points="7 3 7 8 15 8" />
				</svg>
			{/if}
			<span>{saveButtonText}</span>
		</button>

		<!-- P9-EM-01: Download button visible -->
		{#if pageId}
			<ExportMenu {pageId} />
		{/if}
	</div>
</header>

<!-- Visibility Confirmation Modal -->
{#if showVisibilityModal}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="visibility-modal-overlay" onclick={cancelVisibilityChange}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="visibility-modal" onclick={(e) => e.stopPropagation()}>
			<div class="visibility-modal-header">
				<svg class="visibility-modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
					<circle cx="9" cy="7" r="4" />
					<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
					<path d="M16 3.13a4 4 0 0 1 0 7.75" />
				</svg>
				<span>Share this page?</span>
			</div>
			<div class="visibility-modal-body">
				<p>This will make the page visible to <strong>all members of this Area</strong>.</p>
				<p class="visibility-modal-hint">You can change it back to private at any time.</p>
			</div>
			<div class="visibility-modal-footer">
				<button type="button" class="btn-cancel" onclick={cancelVisibilityChange}>Cancel</button>
				<button type="button" class="btn-confirm" onclick={confirmVisibilityChange}>Share Page</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		background: var(--editor-bg);
		border-bottom: 1px solid var(--editor-border);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
		min-width: 0;
		flex: 1;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	/* Back button */
	.back-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border: none;
		background: transparent;
		color: var(--editor-text-secondary);
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 100ms ease, color 100ms ease;
		font-size: 0.875rem;
	}

	.back-btn:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	.back-text {
		display: none;
	}

	@media (min-width: 640px) {
		.back-text {
			display: inline;
		}
	}

	/* Title section */
	.title-section {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
		flex: 1;
	}

	.title-display {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--editor-text);
		background: transparent;
		border: 1px solid transparent;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		margin: -0.25rem -0.5rem;
		cursor: pointer;
		text-align: left;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		transition: border-color 100ms ease;
	}

	.title-display:hover {
		border-color: var(--editor-border);
	}

	.title-input {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--editor-text);
		background: var(--editor-bg-secondary);
		border: 1px solid var(--editor-border-focus);
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		margin: -0.25rem -0.5rem;
		outline: none;
		width: 300px;
		max-width: 100%;
	}

	.type-badge {
		padding: 0.25rem 0.5rem;
		background: var(--toolbar-button-hover);
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--editor-text-secondary);
		white-space: nowrap;
	}

	/* Save button */
	.save-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 100ms ease, opacity 100ms ease;
		background: var(--toolbar-button-active);
		color: var(--editor-text);
	}

	.save-btn:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.save-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.save-btn.dirty {
		background: var(--editor-border-focus);
		color: white;
	}

	.save-btn.saving {
		background: var(--editor-border-focus);
		color: white;
		opacity: 0.8;
	}

	.save-btn.saved {
		background: #16a34a;
		color: white;
	}

	.save-error {
		color: #ef4444;
		font-size: 0.875rem;
	}

	/* Visibility toggle - P9-VT-02 */
	.visibility-toggle {
		display: flex;
		background: var(--toolbar-button-hover);
		border-radius: 6px;
		padding: 2px;
		gap: 2px;
	}

	.visibility-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.625rem;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--editor-text-secondary);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 100ms ease, color 100ms ease;
	}

	.visibility-btn:hover {
		background: var(--toolbar-button-active);
		color: var(--editor-text);
	}

	.visibility-btn.active {
		background: var(--editor-bg);
		color: var(--editor-text);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.visibility-btn .icon {
		width: 14px;
		height: 14px;
	}

	.icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.spin {
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

	/* Visibility Confirmation Modal */
	.visibility-modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.visibility-modal {
		background: var(--editor-bg);
		border: 1px solid var(--editor-border);
		border-radius: 12px;
		width: 100%;
		max-width: 400px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}

	.visibility-modal-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--editor-border);
		font-weight: 600;
		font-size: 1rem;
	}

	.visibility-modal-icon {
		width: 24px;
		height: 24px;
		color: var(--editor-border-focus);
	}

	.visibility-modal-body {
		padding: 1.25rem 1.5rem;
	}

	.visibility-modal-body p {
		margin: 0;
		color: var(--editor-text);
		font-size: 0.9375rem;
		line-height: 1.5;
	}

	.visibility-modal-body p + p {
		margin-top: 0.75rem;
	}

	.visibility-modal-hint {
		color: var(--editor-text-secondary);
		font-size: 0.8125rem;
	}

	.visibility-modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--editor-border);
	}

	.visibility-modal-footer .btn-cancel {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		background: transparent;
		color: var(--editor-text-secondary);
		transition: background-color 100ms ease;
	}

	.visibility-modal-footer .btn-cancel:hover {
		background: var(--toolbar-button-hover);
	}

	.visibility-modal-footer .btn-confirm {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		background: var(--editor-border-focus);
		color: white;
		transition: filter 100ms ease;
	}

	.visibility-modal-footer .btn-confirm:hover {
		filter: brightness(1.1);
	}
</style>
