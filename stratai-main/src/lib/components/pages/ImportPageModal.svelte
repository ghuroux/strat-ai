<script lang="ts">
	/**
	 * ImportPageModal.svelte - Import a .md or .docx file as a new Page
	 *
	 * Flow:
	 * 1. User picks a file (.md or .docx)
	 * 2. Title auto-populates from filename (editable)
	 * 3. User clicks Import
	 * 4. File sent to /api/pages/import → creates draft page
	 * 5. onSuccess callback navigates to the new page
	 */

	import { Upload } from 'lucide-svelte';
	import type { Page as PageType } from '$lib/types/page';

	interface Props {
		isOpen: boolean;
		areaId: string | null;
		onClose: () => void;
		onSuccess: (page: PageType) => void;
	}

	let { isOpen, areaId, onClose, onSuccess }: Props = $props();

	// State
	let file = $state<File | null>(null);
	let title = $state('');
	let isImporting = $state(false);
	let error = $state('');
	let fileInputEl = $state<HTMLInputElement | null>(null);

	// Derived
	let canImport = $derived(file !== null && title.trim().length > 0 && !isImporting);

	// Reset state when modal opens
	$effect(() => {
		if (isOpen) {
			file = null;
			title = '';
			isImporting = false;
			error = '';
			if (fileInputEl) {
				fileInputEl.value = '';
			}
		}
	});

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const selected = input.files?.[0] ?? null;

		if (!selected) {
			file = null;
			return;
		}

		const ext = selected.name.slice(selected.name.lastIndexOf('.')).toLowerCase();
		if (ext !== '.md' && ext !== '.docx') {
			error = 'Only .md and .docx files are supported.';
			file = null;
			input.value = '';
			return;
		}

		file = selected;
		error = '';

		// Auto-populate title from filename (without extension)
		if (!title.trim()) {
			const nameWithoutExt = selected.name.replace(/\.(md|docx)$/i, '');
			title = nameWithoutExt.replace(/[-_]/g, ' ');
		}
	}

	async function handleImport() {
		if (!canImport || !file || !areaId) return;

		isImporting = true;
		error = '';

		try {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('areaId', areaId);
			formData.append('title', title.trim());

			const response = await fetch('/api/pages/import', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (response.ok && result.page) {
				onSuccess(result.page);
			} else {
				error = result.error || 'Failed to import file';
			}
		} catch (err) {
			console.error('Import failed:', err);
			error = 'Failed to import file. Please try again.';
		} finally {
			isImporting = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !isImporting) {
			onClose();
		} else if (event.key === 'Enter' && !event.shiftKey && canImport) {
			event.preventDefault();
			handleImport();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div class="modal-backdrop" onclick={onClose} role="presentation">
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="import-modal-title"
		>
			<!-- Header -->
			<div class="modal-header">
				<div class="header-icon">
					<Upload size={20} />
				</div>
				<h2 id="import-modal-title">Import a file</h2>
				<p class="subtitle">Import a Markdown or Word document as a new page.</p>
			</div>

			<!-- File picker -->
			<div class="form-group">
				<label for="import-file" class="label">File</label>
				<div class="file-input-wrapper">
					<input
						bind:this={fileInputEl}
						id="import-file"
						type="file"
						accept=".md,.docx"
						onchange={handleFileChange}
						disabled={isImporting}
						class="file-input"
					/>
					{#if file}
						<div class="file-selected">
							<span class="file-name">{file.name}</span>
							<span class="file-size">{(file.size / 1024).toFixed(0)} KB</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Title input -->
			<div class="form-group">
				<label for="import-title" class="label">Page title</label>
				<input
					id="import-title"
					type="text"
					bind:value={title}
					placeholder="Enter a title for the page"
					disabled={isImporting}
					class="text-input"
				/>
			</div>

			<!-- Error -->
			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<!-- Actions -->
			<div class="actions">
				<button
					type="button"
					class="cancel-button"
					onclick={onClose}
					disabled={isImporting}
				>
					Cancel
				</button>
				<button
					type="button"
					class="import-button"
					onclick={handleImport}
					disabled={!canImport}
				>
					{#if isImporting}
						<span class="spinner"></span>
						Importing...
					{:else}
						Import
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
		max-width: 440px;
		background: var(--editor-bg);
		border: 1px solid var(--editor-border);
		border-radius: 16px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		padding: 1.5rem;
	}

	.modal-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		margin-bottom: 1.25rem;
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: var(--space-accent-muted, rgba(59, 130, 246, 0.1));
		border-radius: 12px;
		color: var(--space-accent, #3b82f6);
		margin-bottom: 0.75rem;
	}

	h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--editor-text);
		margin: 0 0 0.25rem 0;
	}

	.subtitle {
		font-size: 0.8125rem;
		color: var(--editor-text-secondary);
		margin: 0;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.label {
		display: block;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--editor-text-secondary);
		margin-bottom: 0.375rem;
	}

	.file-input-wrapper {
		position: relative;
	}

	.file-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: var(--toolbar-button-hover);
		border: 1px solid var(--editor-border);
		border-radius: 8px;
		color: var(--editor-text);
		font-size: 0.875rem;
		cursor: pointer;
		transition: border-color 100ms ease;
	}

	.file-input:hover:not(:disabled) {
		border-color: var(--editor-border-focus);
	}

	.file-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.file-input::file-selector-button {
		padding: 0.25rem 0.75rem;
		margin-right: 0.75rem;
		background: var(--editor-bg);
		border: 1px solid var(--editor-border);
		border-radius: 6px;
		color: var(--editor-text);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 100ms ease;
	}

	.file-input::file-selector-button:hover {
		background: var(--toolbar-button-hover);
	}

	.file-selected {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0.375rem;
		font-size: 0.75rem;
		color: var(--editor-text-secondary);
	}

	.file-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-size {
		flex-shrink: 0;
		margin-left: 0.5rem;
		color: var(--editor-text-muted);
	}

	.text-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: var(--toolbar-button-hover);
		border: 1px solid var(--editor-border);
		border-radius: 8px;
		color: var(--editor-text);
		font-size: 0.875rem;
		outline: none;
		transition: border-color 100ms ease;
	}

	.text-input:focus {
		border-color: var(--editor-border-focus);
	}

	.text-input:disabled {
		opacity: 0.5;
	}

	.text-input::placeholder {
		color: var(--editor-text-muted);
	}

	.error-message {
		padding: 0.5rem 0.75rem;
		margin-bottom: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 8px;
		color: #ef4444;
		font-size: 0.8125rem;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
	}

	.cancel-button,
	.import-button {
		flex: 1;
		padding: 0.625rem 1rem;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 100ms ease, opacity 100ms ease;
	}

	.cancel-button {
		border: 1px solid var(--editor-border);
		background: transparent;
		color: var(--editor-text);
	}

	.cancel-button:hover:not(:disabled) {
		background: var(--toolbar-button-hover);
	}

	.import-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border: none;
		background: var(--space-accent, #3b82f6);
		color: white;
	}

	.import-button:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.cancel-button:disabled,
	.import-button:disabled {
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
