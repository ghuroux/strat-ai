<script lang="ts">
	/**
	 * PageHeader.svelte - Premium page header with grouped actions
	 *
	 * Layout: [Back | Title Badge]   ...   [Metadata │ Actions │ Utilities]
	 *
	 * Three logical groups separated by subtle dividers:
	 * - Metadata: Visibility pill, Status/Version pill
	 * - Actions: Context toggle, Finalize, Share (the only filled button)
	 * - Utilities: Save indicator, Overflow menu (Activity, Versions, Download, Discard)
	 */

	import { fly } from 'svelte/transition';
	import {
		Share2, Lock, Users, Globe, History, FileEdit, CheckCircle, BookOpen,
		Clock, RotateCcw, MoreHorizontal, FileText, File, Check
	} from 'lucide-svelte';
	import type { PageType, PageVisibility, PageStatus } from '$lib/types/page';
	import type { PagePermission } from '$lib/types/page-sharing';
	import { PAGE_TYPE_LABELS } from '$lib/types/page';

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
		status?: PageStatus;
		currentVersion?: number;
		isOwner?: boolean;
		inContext?: boolean;
		contextVersionNumber?: number;
		onToggleContext?: () => void;
		onTitleChange: (title: string) => void;
		onOpenShareModal?: () => void;
		onOpenActivityLog?: () => void;
		onOpenVersionHistory?: () => void;
		onFinalize?: () => void;
		onUnlock?: () => void;
		onDiscardChanges?: () => void;
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
		status = 'draft',
		currentVersion,
		isOwner = false,
		inContext = false,
		contextVersionNumber,
		onToggleContext,
		onTitleChange,
		onOpenShareModal,
		onOpenActivityLog,
		onOpenVersionHistory,
		onFinalize,
		onUnlock,
		onDiscardChanges,
		onSave,
		onClose
	}: Props = $props();

	// Derived states
	let isReadOnly = $derived(userPermission === 'viewer' || status === 'finalized');
	let isAdmin = $derived(userPermission === 'admin');
	let isFinalized = $derived(status === 'finalized');
	let canFinalize = $derived(isOwner && status !== 'finalized');
	let canUnlock = $derived(isOwner && status === 'finalized');

	// Does the "Actions" group have any content?
	let hasActionsGroup = $derived(
		!!(isFinalized && (onToggleContext || inContext)) ||
		!!(canFinalize && onFinalize) ||
		!!(canManageSharing && onOpenShareModal)
	);

	// Does the overflow menu have items?
	let hasOverflowItems = $derived(
		!!(isAdmin && onOpenActivityLog) ||
		!!(currentVersion && currentVersion >= 1 && onOpenVersionHistory) ||
		!!pageId ||
		!!(onDiscardChanges && isDirty && status === 'shared' && currentVersion && currentVersion >= 1)
	);

	// Does the "Utilities" group have any content?
	let hasUtilitiesGroup = $derived(!isFinalized || hasOverflowItems);

	// Title editing state
	let isEditingTitle = $state(false);
	let editedTitle = $state('');
	let titleInputRef: HTMLInputElement | null = $state(null);

	// Overflow menu state
	let showOverflow = $state(false);
	let overflowRef: HTMLDivElement | null = $state(null);
	let overflowBtnRef: HTMLButtonElement | null = $state(null);

	// Sync editedTitle with title prop when not editing
	$effect(() => {
		if (!isEditingTitle) {
			editedTitle = title;
		}
	});

	// Auto-focus and select title input
	$effect(() => {
		if (isEditingTitle && titleInputRef) {
			titleInputRef.focus();
			titleInputRef.select();
		}
	});

	// Click outside handler for overflow menu
	$effect(() => {
		if (!showOverflow) return;

		function handleClickOutside(event: MouseEvent) {
			if (
				overflowRef && !overflowRef.contains(event.target as Node) &&
				overflowBtnRef && !overflowBtnRef.contains(event.target as Node)
			) {
				showOverflow = false;
			}
		}

		function handleEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				showOverflow = false;
			}
		}

		document.addEventListener('click', handleClickOutside);
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('keydown', handleEscape);
		};
	});

	let visibilityLabel = $derived.by(() => {
		if (visibility === 'private' && shareCount > 0) {
			return `Shared (${shareCount})`;
		}
		switch (visibility) {
			case 'area': return 'Area';
			case 'space': return 'Space';
			default: return 'Private';
		}
	});

	const typeLabel = $derived(PAGE_TYPE_LABELS[pageType] || pageType);

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

	function exportAs(format: 'markdown' | 'docx') {
		if (pageId) {
			window.location.href = `/api/pages/export/${pageId}?format=${format}`;
		}
		showOverflow = false;
	}

	function handleOverflowAction(action: () => void) {
		action();
		showOverflow = false;
	}
</script>

<header class="page-header">
	<div class="header-left">
		<button type="button" class="back-btn" onclick={onClose} title="Back to documents">
			<svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M19 12H5M12 19l-7-7 7-7" />
			</svg>
			<span class="back-label">Back</span>
		</button>

		<div class="title-section">
			{#if isReadOnly}
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
		<!-- ═══ Group 1: Metadata ═══ -->
		<div class="header-group">
			<!-- Visibility pill -->
			<div class="meta-pill" title="Page visibility: {visibilityLabel}">
				{#if visibility === 'private'}
					<Lock size={13} strokeWidth={2} />
				{:else if visibility === 'area'}
					<Users size={13} strokeWidth={2} />
				{:else}
					<Globe size={13} strokeWidth={2} />
				{/if}
				<span>{visibilityLabel}</span>
			</div>

			<!-- Status / Version pill -->
			{#if status === 'finalized'}
				<button
					type="button"
					class="meta-pill version-pill"
					onclick={canUnlock && onUnlock ? onUnlock : undefined}
					disabled={!canUnlock || !onUnlock}
					title={canUnlock ? 'Click to unlock and edit' : `Finalized (v${currentVersion ?? 1})`}
				>
					<Lock size={12} strokeWidth={2.5} />
					<span>v{currentVersion ?? 1}</span>
				</button>
			{:else if status === 'shared' && currentVersion && currentVersion >= 1}
				<div class="meta-pill editing-pill" title="Editing (based on v{currentVersion})">
					<FileEdit size={13} strokeWidth={2} />
					<span>Editing v{currentVersion}</span>
				</div>
				{#if contextVersionNumber}
					<div class="meta-pill pinned-pill" title="v{contextVersionNumber} serving in AI context">
						<BookOpen size={13} strokeWidth={2} />
						<span>v{contextVersionNumber} pinned</span>
					</div>
				{/if}
			{:else if status === 'draft'}
				<div class="meta-pill" title="Draft - only visible to you">
					<FileEdit size={13} strokeWidth={2} />
					<span>Draft</span>
				</div>
			{:else if status === 'shared'}
				<div class="meta-pill" title="Shared - visible to members">
					<Users size={13} strokeWidth={2} />
					<span>Shared</span>
				</div>
			{/if}
		</div>

		<!-- ═══ Group 2: Primary Actions ═══ -->
		{#if hasActionsGroup}
			<div class="header-divider"></div>
			<div class="header-group">
				<!-- Context toggle (finalized pages) -->
				{#if isFinalized && onToggleContext}
					<button
						type="button"
						class="action-btn"
						class:context-active={inContext}
						onclick={onToggleContext}
						title={inContext ? 'Remove from AI context' : 'Add to AI context'}
					>
						<BookOpen size={15} strokeWidth={2} />
						<span>{inContext ? 'In Context' : 'Add to Context'}</span>
					</button>
				{:else if isFinalized && inContext}
					<div class="action-btn context-active">
						<BookOpen size={15} strokeWidth={2} />
						<span>In Context</span>
					</div>
				{/if}

				<!-- Finalize -->
				{#if canFinalize && onFinalize}
					<button
						type="button"
						class="action-btn finalize-btn"
						onclick={onFinalize}
						title="Finalize page"
					>
						<CheckCircle size={15} strokeWidth={2} />
						<span>Finalize</span>
					</button>
				{/if}

				<!-- Share — the only filled button -->
				{#if canManageSharing && onOpenShareModal}
					<button
						type="button"
						class="share-btn"
						onclick={onOpenShareModal}
						title="Share this page"
					>
						<Share2 size={15} strokeWidth={2} />
						<span>Share</span>
					</button>
				{/if}
			</div>
		{/if}

		<!-- ═══ Group 3: Save + Overflow ═══ -->
		{#if hasUtilitiesGroup}
			<div class="header-divider"></div>
			<div class="header-group">
				<!-- Save indicator (only when page is editable) -->
				{#if !isFinalized}
					{#if saveStatus === 'error'}
						<button type="button" class="save-indicator error" onclick={onSave} title="Retry save">
							<span>Failed — retry</span>
						</button>
					{:else if saveStatus === 'saving'}
						<div class="save-indicator saving">
							<svg class="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
								<circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="8" />
							</svg>
							<span>Saving</span>
						</div>
					{:else if isDirty}
						<button type="button" class="save-indicator unsaved" onclick={onSave} title="Save changes">
							<span>Save</span>
						</button>
					{:else}
						<div class="save-indicator saved">
							<Check size={12} strokeWidth={2.5} />
							<span>Saved</span>
						</div>
					{/if}
				{/if}

				<!-- Overflow menu -->
				{#if hasOverflowItems}
					<div class="overflow-wrapper">
						<button
							type="button"
							class="overflow-btn"
							bind:this={overflowBtnRef}
							onclick={() => showOverflow = !showOverflow}
							title="More options"
							aria-haspopup="true"
							aria-expanded={showOverflow}
							class:active={showOverflow}
						>
							<MoreHorizontal size={18} strokeWidth={2} />
						</button>

						{#if showOverflow}
							<div
								class="overflow-menu"
								bind:this={overflowRef}
								role="menu"
								transition:fly={{ y: -6, duration: 150 }}
							>
								{#if isAdmin && onOpenActivityLog}
									<button type="button" class="menu-item" onclick={() => handleOverflowAction(onOpenActivityLog!)} role="menuitem">
										<History size={15} />
										<span>Activity log</span>
									</button>
								{/if}

								{#if currentVersion && currentVersion >= 1 && onOpenVersionHistory}
									<button type="button" class="menu-item" onclick={() => handleOverflowAction(onOpenVersionHistory!)} role="menuitem">
										<Clock size={15} />
										<span>Version history</span>
									</button>
								{/if}

								<!-- Separator before downloads -->
								{#if ((isAdmin && onOpenActivityLog) || (currentVersion && currentVersion >= 1 && onOpenVersionHistory)) && pageId}
									<div class="menu-divider"></div>
								{/if}

								{#if pageId}
									<button type="button" class="menu-item" onclick={() => exportAs('markdown')} role="menuitem">
										<FileText size={15} />
										<span>Download as Markdown</span>
									</button>
									<button type="button" class="menu-item" onclick={() => exportAs('docx')} role="menuitem">
										<File size={15} />
										<span>Download as Word</span>
									</button>
								{/if}

								<!-- Discard — destructive, at the bottom -->
								{#if onDiscardChanges && isDirty && status === 'shared' && currentVersion && currentVersion >= 1}
									<div class="menu-divider"></div>
									<button type="button" class="menu-item destructive" onclick={() => handleOverflowAction(onDiscardChanges!)} role="menuitem">
										<RotateCcw size={15} />
										<span>Discard changes</span>
									</button>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</header>


<style>
	/* ───────────────────────────────────────────────
	   Header container
	   ─────────────────────────────────────────────── */
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1.25rem;
		background: var(--editor-bg);
		border-bottom: 1px solid var(--editor-border);
	}

	/* ───────────────────────────────────────────────
	   Left side: Back + Title + Badge
	   ─────────────────────────────────────────────── */
	.header-left {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-width: 0;
		flex: 1;
	}

	.back-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.3125rem 0.5rem;
		border: none;
		background: transparent;
		color: var(--editor-text-secondary);
		border-radius: 6px;
		cursor: pointer;
		transition: all 100ms ease;
		font-size: 0.8125rem;
	}

	.back-btn:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	.back-icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.back-label {
		display: none;
	}

	@media (min-width: 640px) {
		.back-label {
			display: inline;
		}
	}

	/* Title */
	.title-section {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		flex: 1;
	}

	.title-display {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--editor-text);
		background: transparent;
		border: 1px solid transparent;
		border-radius: 4px;
		padding: 0.125rem 0.375rem;
		margin: -0.125rem -0.375rem;
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
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--editor-text);
		background: var(--editor-bg-secondary);
		border: 1px solid var(--editor-border-focus);
		border-radius: 4px;
		padding: 0.125rem 0.375rem;
		margin: -0.125rem -0.375rem;
		outline: none;
		width: 300px;
		max-width: 100%;
	}

	.title-readonly {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--editor-text);
		padding: 0.125rem 0.375rem;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.type-badge {
		padding: 0.125rem 0.4375rem;
		background: var(--toolbar-button-hover);
		border-radius: 4px;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--editor-text-secondary);
		white-space: nowrap;
		letter-spacing: 0.01em;
	}

	/* ───────────────────────────────────────────────
	   Right side: Grouped actions
	   ─────────────────────────────────────────────── */
	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.header-group {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.header-divider {
		width: 1px;
		height: 16px;
		background: var(--editor-border);
		opacity: 0.5;
		flex-shrink: 0;
	}

	/* ───────────────────────────────────────────────
	   Metadata pills (Group 1)
	   ─────────────────────────────────────────────── */
	.meta-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.1875rem 0.4375rem;
		border-radius: 5px;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--editor-text-secondary);
		background: transparent;
		border: none;
		white-space: nowrap;
		cursor: default;
		transition: all 100ms ease;
	}

	/* Finalized version pill — green, clickable to unlock */
	.meta-pill.version-pill {
		color: #22c55e;
		cursor: pointer;
	}

	.meta-pill.version-pill:hover:not(:disabled) {
		background: rgba(34, 197, 94, 0.1);
	}

	.meta-pill.version-pill:disabled {
		cursor: default;
	}

	/* Editing state — amber */
	.meta-pill.editing-pill {
		color: #f59e0b;
	}

	/* Pinned context version — purple */
	.meta-pill.pinned-pill {
		color: #a78bfa;
	}

	/* ───────────────────────────────────────────────
	   Action buttons (Group 2)
	   ─────────────────────────────────────────────── */
	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3125rem;
		padding: 0.3125rem 0.5rem;
		border: none;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 100ms ease;
		background: transparent;
		color: var(--editor-text-secondary);
		white-space: nowrap;
	}

	.action-btn:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	/* Context active — purple accent */
	.action-btn.context-active {
		color: #a78bfa;
	}

	.action-btn.context-active:hover {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	/* Finalize — green accent */
	.action-btn.finalize-btn {
		color: #22c55e;
	}

	.action-btn.finalize-btn:hover {
		background: rgba(34, 197, 94, 0.1);
	}

	/* Share — the ONLY filled button, stands out as primary CTA */
	.share-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3125rem;
		padding: 0.3125rem 0.625rem;
		border: none;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 100ms ease;
		background: var(--editor-border-focus);
		color: white;
	}

	.share-btn:hover {
		filter: brightness(1.1);
	}

	/* ───────────────────────────────────────────────
	   Save indicator (Group 3)
	   ─────────────────────────────────────────────── */
	.save-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
		border: none;
		background: none;
		padding: 0.1875rem 0.375rem;
		border-radius: 4px;
		transition: all 100ms ease;
	}

	.save-indicator.saved {
		color: var(--editor-text-secondary);
		opacity: 0.6;
	}

	.save-indicator.saving {
		color: var(--editor-text-secondary);
	}

	.save-indicator.unsaved {
		color: var(--editor-border-focus);
		cursor: pointer;
		font-weight: 600;
	}

	.save-indicator.unsaved:hover {
		background: rgba(59, 130, 246, 0.1);
	}

	.save-indicator.error {
		color: #ef4444;
		cursor: pointer;
	}

	.save-indicator.error:hover {
		background: rgba(239, 68, 68, 0.1);
	}

	.spin-icon {
		width: 13px;
		height: 13px;
		flex-shrink: 0;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* ───────────────────────────────────────────────
	   Overflow menu (Group 3)
	   ─────────────────────────────────────────────── */
	.overflow-wrapper {
		position: relative;
	}

	.overflow-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--editor-text-secondary);
		cursor: pointer;
		transition: all 100ms ease;
	}

	.overflow-btn:hover,
	.overflow-btn.active {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	.overflow-menu {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		min-width: 210px;
		background: var(--editor-bg);
		border: 1px solid var(--editor-border);
		border-radius: 10px;
		box-shadow:
			0 4px 24px rgba(0, 0, 0, 0.16),
			0 1px 4px rgba(0, 0, 0, 0.08);
		padding: 0.3125rem;
		z-index: 100;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.4375rem 0.625rem;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--editor-text-secondary);
		font-size: 0.8125rem;
		font-weight: 400;
		text-align: left;
		cursor: pointer;
		transition: all 80ms ease;
		white-space: nowrap;
	}

	.menu-item:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	.menu-item.destructive {
		color: rgba(239, 68, 68, 0.85);
	}

	.menu-item.destructive:hover {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.menu-divider {
		height: 1px;
		background: var(--editor-border);
		margin: 0.25rem 0.5rem;
		opacity: 0.5;
	}
</style>
