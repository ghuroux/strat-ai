<!--
	DocumentCard.svelte

	Reusable card component for displaying a document with actions.
	Used in Space documents page and Area document lists.
-->
<script lang="ts">
	import type { Document } from '$lib/types/documents';

	interface Props {
		document: Document;
		showVisibilityBadge?: boolean;
		showOwner?: boolean;
		showActivation?: boolean;
		isActivated?: boolean;
		isOwner?: boolean;
		areaColor?: string;
		onShare?: () => void;
		onToggleActivation?: () => void;
		onDelete?: () => void;
	}

	let {
		document,
		showVisibilityBadge = true,
		showOwner = false,
		showActivation = false,
		isActivated = false,
		isOwner = true,
		areaColor = '#3b82f6',
		onShare,
		onToggleActivation,
		onDelete
	}: Props = $props();

	let deleteConfirm = $state(false);

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Format character count
	function formatCharCount(count: number): string {
		if (count < 1000) return `${count}`;
		return `${(count / 1000).toFixed(1)}k`;
	}

	// Format date
	function formatDate(date: Date): string {
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days} days ago`;

		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		});
	}

	// Get file icon based on mime type
	function getFileIcon(mimeType: string): 'pdf' | 'word' | 'text' | 'image' | 'generic' {
		if (mimeType === 'application/pdf') return 'pdf';
		if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
			return 'word';
		if (mimeType.startsWith('text/')) return 'text';
		if (mimeType.startsWith('image/')) return 'image';
		return 'generic';
	}

	// Check if document is an image
	const isImage = $derived(document.mimeType?.startsWith('image/'));

	// Get visibility label
	function getVisibilityLabel(visibility: string): string {
		switch (visibility) {
			case 'space':
				return 'Space';
			case 'areas':
				return 'Shared';
			default:
				return 'Private';
		}
	}

	function handleDelete() {
		if (onDelete) {
			onDelete();
		}
		deleteConfirm = false;
	}

	const icon = $derived(getFileIcon(document.mimeType));
</script>

<div
	class="document-card"
	class:activated={isActivated}
	style="--area-color: {areaColor}"
>
	<!-- Activation toggle (if enabled) -->
	{#if showActivation}
		<button
			type="button"
			class="activation-toggle"
			class:checked={isActivated}
			onclick={onToggleActivation}
			title={isActivated ? 'Remove from context' : 'Add to context'}
		>
			{#if isActivated}
				<svg viewBox="0 0 24 24" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
						clip-rule="evenodd"
					/>
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			{/if}
		</button>
	{/if}

	<!-- File icon / Image thumbnail -->
	<div class="doc-icon" class:pdf={icon === 'pdf'} class:word={icon === 'word'} class:text={icon === 'text'} class:image={icon === 'image'}>
		{#if icon === 'pdf'}
			<svg viewBox="0 0 24 24" fill="currentColor">
				<path
					d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9c.55 0 1-.45 1-1s-.45-1-1-1H7v4h1v-1h2c.55 0 1-.45 1-1zM8 10h2v1H8v-1zm6 4c.55 0 1-.45 1-1v-2c0-.55-.45-1-1-1h-3v4h3zm-2-3h1v2h-1v-2zm5 3c.55 0 1-.45 1-1v-2c0-.55-.45-1-1-1h-1c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h1zm0-3v2h-1v-2h1z"
				/>
			</svg>
		{:else if icon === 'word'}
			<svg viewBox="0 0 24 24" fill="currentColor">
				<path
					d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-4.5-8.5l-1.5 6-1.5-6H9l2.25 7.5h1.5L14.5 13l1.75 6h1.5L20 11.5h-1.5l-1.5 6-1.5-6h-1.5z"
				/>
			</svg>
		{:else if icon === 'image'}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
				/>
			</svg>
		{:else}
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
				/>
			</svg>
		{/if}
	</div>

	<!-- Document info -->
	<div class="doc-info">
		<span class="doc-name" title={document.filename}>{document.title || document.filename}</span>
		<div class="doc-meta-row">
			{#if isImage}
				<span class="doc-meta">{formatFileSize(document.fileSize)}</span>
			{:else}
				<span class="doc-meta">{formatCharCount(document.charCount)} chars</span>
			{/if}
			<span class="doc-meta-separator">·</span>
			<span class="doc-meta">{formatDate(document.updatedAt)}</span>
			{#if showVisibilityBadge}
				<span
					class="visibility-badge"
					class:space={document.visibility === 'space'}
					class:shared={document.visibility === 'areas'}
					class:private={document.visibility === 'private'}
				>
					{getVisibilityLabel(document.visibility)}
				</span>
			{/if}
		</div>
		{#if showOwner && !isOwner}
			<span class="doc-owner">Shared with you</span>
		{/if}
	</div>

	<!-- Actions -->
	<div class="doc-actions">
		{#if isOwner && onShare}
			<button type="button" class="doc-action" onclick={onShare} title="Share settings">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
					/>
				</svg>
			</button>
		{/if}

		{#if isOwner && onDelete}
			{#if deleteConfirm}
				<div class="delete-confirm">
					<button type="button" class="confirm-yes" onclick={handleDelete}> Delete </button>
					<button type="button" class="confirm-no" onclick={() => (deleteConfirm = false)}>
						Cancel
					</button>
				</div>
			{:else}
				<button
					type="button"
					class="doc-action doc-delete"
					onclick={() => (deleteConfirm = true)}
					title="Delete"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
						/>
					</svg>
				</button>
			{/if}
		{/if}
	</div>
</div>

<style>
	.document-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.document-card:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.document-card.activated {
		background: color-mix(in srgb, var(--area-color) 8%, transparent);
		border-color: color-mix(in srgb, var(--area-color) 20%, transparent);
	}

	/* Activation toggle */
	.activation-toggle {
		flex-shrink: 0;
		width: 1.5rem;
		height: 1.5rem;
		color: rgba(255, 255, 255, 0.3);
		transition: all 0.15s ease;
	}

	.activation-toggle:hover {
		color: rgba(255, 255, 255, 0.6);
	}

	.activation-toggle.checked {
		color: var(--area-color);
	}

	.activation-toggle svg {
		width: 100%;
		height: 100%;
	}

	/* File icon */
	.doc-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		flex-shrink: 0;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 0.375rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.doc-icon.pdf {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.doc-icon.word {
		background: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
	}

	.doc-icon.text {
		background: color-mix(in srgb, var(--area-color) 15%, transparent);
		color: var(--area-color);
	}

	.doc-icon.image {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
	}

	.doc-icon svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	/* Document info */
	.doc-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.doc-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.95);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.doc-meta-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: wrap;
	}

	.doc-meta {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	.doc-meta-separator {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.25);
	}

	.doc-owner {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.4);
		font-style: italic;
	}

	/* Visibility badge */
	.visibility-badge {
		font-size: 0.625rem;
		font-weight: 600;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.visibility-badge.space {
		background: rgba(139, 92, 246, 0.2);
		color: rgb(167, 139, 250);
	}

	.visibility-badge.shared {
		background: rgba(59, 130, 246, 0.2);
		color: rgb(96, 165, 250);
	}

	.visibility-badge.private {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.5);
	}

	/* Document actions */
	.doc-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.document-card:hover .doc-actions {
		opacity: 1;
	}

	.doc-action {
		width: 1.75rem;
		height: 1.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.4);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.doc-action:hover {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.doc-action.doc-delete:hover {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.doc-action svg {
		width: 1rem;
		height: 1rem;
	}

	/* Delete confirmation */
	.delete-confirm {
		display: flex;
		gap: 0.25rem;
	}

	.confirm-yes,
	.confirm-no {
		font-size: 0.6875rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-weight: 500;
	}

	.confirm-yes {
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
	}

	.confirm-yes:hover {
		background: rgba(239, 68, 68, 0.25);
	}

	.confirm-no {
		color: rgba(255, 255, 255, 0.5);
	}

	.confirm-no:hover {
		background: rgba(255, 255, 255, 0.08);
	}
</style>
