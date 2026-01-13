<script lang="ts">
	/**
	 * PageHeader.svelte - Header with title, type badge, and actions
	 *
	 * Features:
	 * - Editable title
	 * - Page type badge
	 * - Save button with status indicator
	 * - Back navigation
	 * - Share button (opens SharePageModal)
	 * - Visibility indicator
	 * - Export menu (P9-EM-*)
	 *
	 * Based on DOCUMENT_SYSTEM.md Section 4.1 specification
	 * Updated for Phase 2 Page Sharing
	 */

	import { Share2, Lock, Users, Globe, History } from 'lucide-svelte';
	import type { PageType, PageVisibility } from '$lib/types/page';
	import type { PagePermission } from '$lib/types/page-sharing';
	import { PAGE_TYPE_LABELS } from '$lib/types/page';
	import ExportMenu from './ExportMenu.svelte';

	// Props
	interface Props {
		pageId?: string;
		title: string;
		pageType: PageType;
		visibility?: PageVisibility;
		shareCount?: number;
		canManageSharing?: boolean;
		userPermission?: PagePermission | null;
		saveStatus: 'idle' | 'saving' | 'saved' | 'error';
		isDirty: boolean;
		onTitleChange: (title: string) => void;
		onOpenShareModal?: () => void;
		onOpenActivityLog?: () => void;
		onSave: () => void;
		onClose: () => void;
	}

	let {
		pageId,
		title,
		pageType,
		visibility = 'private',
		shareCount = 0,
		canManageSharing = false,
		userPermission,
		saveStatus,
		isDirty,
		onTitleChange,
		onOpenShareModal,
		onOpenActivityLog,
		onSave,
		onClose
	}: Props = $props();

	// Derived: Check if user has read-only access (viewer permission)
	let isReadOnly = $derived(userPermission === 'viewer');
	// Derived: Check if user is admin (can view activity log)
	let isAdmin = $derived(userPermission === 'admin');

	// Local state for title editing
	let isEditingTitle = $state(false);
	let editedTitle = $state('');
	let titleInputRef: HTMLInputElement | null = $state(null);

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

	// Visibility indicator text
	let visibilityLabel = $derived.by(() => {
		if (visibility === 'private' && shareCount > 0) {
			return `Shared with ${shareCount}`;
		}
		switch (visibility) {
			case 'area':
				return 'Area';
			case 'space':
				return 'Space';
			default:
				return 'Private';
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
			{#if isReadOnly}
				<!-- Read-only: Show title as text, not editable -->
				<span class="title-readonly">{title}</span>
			{:else if isEditingTitle}
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
		<!-- Visibility indicator -->
		<div class="visibility-indicator" title="Page visibility: {visibilityLabel}">
			{#if visibility === 'private'}
				<Lock size={14} strokeWidth={2} />
			{:else if visibility === 'area'}
				<Users size={14} strokeWidth={2} />
			{:else}
				<Globe size={14} strokeWidth={2} />
			{/if}
			<span class="visibility-text">{visibilityLabel}</span>
		</div>

		<!-- Share button -->
		{#if canManageSharing && onOpenShareModal}
			<button
				type="button"
				class="share-btn"
				onclick={onOpenShareModal}
				title="Share this page"
			>
				<Share2 size={16} strokeWidth={2} />
				<span>Share</span>
			</button>
		{/if}

		<!-- Activity button (admin only) -->
		{#if isAdmin && onOpenActivityLog}
			<button
				type="button"
				class="activity-btn"
				onclick={onOpenActivityLog}
				title="View activity log"
				aria-label="View activity log"
			>
				<History size={16} strokeWidth={2} />
				<span>Activity</span>
			</button>
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

	/* Visibility indicator */
	.visibility-indicator {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		background: var(--toolbar-button-hover);
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--editor-text-secondary);
	}

	.visibility-text {
		white-space: nowrap;
	}

	/* Share button */
	.share-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border: none;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 100ms ease, color 100ms ease;
		background: var(--editor-border-focus);
		color: white;
	}

	.share-btn:hover {
		filter: brightness(1.1);
	}

	/* Activity button */
	.activity-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border: none;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 100ms ease, color 100ms ease;
		background: var(--toolbar-button-hover);
		color: var(--editor-text-secondary);
	}

	.activity-btn:hover {
		background: var(--toolbar-button-active);
		color: var(--editor-text);
	}

	/* Read-only title */
	.title-readonly {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--editor-text);
		padding: 0.25rem 0.5rem;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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

</style>
