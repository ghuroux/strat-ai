<script lang="ts">
	/**
	 * NewPageModal.svelte - Modal for creating a new page
	 *
	 * Three-step flow:
	 * 1. Select template
	 * 2a. Enter title (for non-guided templates)
	 * 2b. Guided creation flow (for guided templates like meeting_notes)
	 *
	 * Based on DOCUMENT_SYSTEM.md Phase 4 and GUIDED_CREATION.md Phase 6.
	 */

	import type { PageType, TipTapContent } from '$lib/types/page';
	import type { GuidedCreationData } from '$lib/types/guided-creation';
	import { getPageTypeInfo, getDefaultTitle, getTemplateContent, hasGuidedCreation, getTemplateSchema } from '$lib/config/page-templates';
	import { renderTemplate } from '$lib/services/template-renderers';
	import TemplateSelector from './TemplateSelector.svelte';
	import GuidedCreationFlow from '../guided-creation/GuidedCreationFlow.svelte';

	// Props
	interface Props {
		isOpen: boolean;
		spaceId: string;
		areaId: string | null;
		areaContext?: string;
		onClose: () => void;
		onCreate: (data: {
			title: string;
			pageType: PageType;
			template: TipTapContent | null;
			guidedData?: GuidedCreationData;
		}) => void;
	}

	let { isOpen, spaceId, areaId, areaContext, onClose, onCreate }: Props = $props();

	// State
	type StepMode = 'template-select' | 'title-input' | 'guided-flow';
	let step = $state<StepMode>('template-select');
	let selectedType = $state<PageType | null>(null);
	let title = $state('');

	// Derived
	let selectedTypeInfo = $derived(selectedType ? getPageTypeInfo(selectedType) : null);
	let selectedSchema = $derived(selectedType ? getTemplateSchema(selectedType) : null);
	let canProceed = $derived(
		step === 'template-select' ? selectedType !== null : title.trim().length > 0
	);

	// Reset state when modal opens
	$effect(() => {
		if (isOpen) {
			step = 'template-select';
			selectedType = null;
			title = '';
		}
	});

	function handleTemplateSelect(type: PageType) {
		selectedType = type;
	}

	function handleNext() {
		if (step === 'template-select' && selectedType) {
			if (hasGuidedCreation(selectedType)) {
				step = 'guided-flow';
			} else {
				step = 'title-input';
				title = getDefaultTitle(selectedType);
			}
		}
	}

	function handleBack() {
		if (step === 'title-input' || step === 'guided-flow') {
			step = 'template-select';
		}
	}

	function handleCreate() {
		if (!selectedType || !title.trim()) return;

		const template = getTemplateContent(selectedType);
		onCreate({
			title: title.trim(),
			pageType: selectedType,
			template
		});
	}

	function handleGuidedComplete(data: GuidedCreationData) {
		if (!selectedType) return;

		const result = renderTemplate(data, areaContext);
		onCreate({
			title: (data.data.title as string) || 'Untitled',
			pageType: selectedType,
			template: result.content,
			guidedData: data
		});
	}

	function handleKeydown(event: KeyboardEvent) {
		// Don't handle keyboard in guided flow - it has its own handlers
		if (step === 'guided-flow') return;

		if (event.key === 'Escape') {
			onClose();
		} else if (event.key === 'Enter' && !event.shiftKey) {
			if (step === 'template-select' && canProceed) {
				event.preventDefault();
				handleNext();
			} else if (step === 'title-input' && canProceed) {
				event.preventDefault();
				handleCreate();
			}
		}
	}

	// Get SVG icon based on type
	function getIcon(iconName: string): string {
		switch (iconName) {
			case 'FileText':
				return 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8';
			case 'Users':
				return 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75';
			case 'Scale':
				return 'M3 6l9 3 9-3 M12 9v12 M3 18l9-3 9 3 M3 6v12 M21 6v12';
			case 'Lightbulb':
				return 'M12 2a7 7 0 0 1 4 12.7V18a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-3.3A7 7 0 0 1 12 2z M9 21h6';
			case 'Briefcase':
				return 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z M12 12v5';
			case 'Calendar':
				return 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M16 2v4 M8 2v4 M3 10h18';
			case 'Code':
				return 'M16 18l6-6-6-6 M8 6l-6 6 6 6';
			default:
				return 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6';
		}
	}

	// Get modal title based on step
	function getModalTitle(): string {
		switch (step) {
			case 'template-select':
				return 'Choose a template';
			case 'title-input':
				return 'Name your page';
			case 'guided-flow':
				return ''; // GuidedCreationFlow has its own header
			default:
				return 'New Page';
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<div class="modal-backdrop" onclick={onClose} role="presentation">
		<div
			class="modal"
			class:modal-guided={step === 'guided-flow'}
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			tabindex="-1"
		>
			{#if step === 'guided-flow' && selectedSchema}
				<!-- Guided Creation Flow (full takeover) -->
				<GuidedCreationFlow
					schema={selectedSchema}
					{spaceId}
					{areaId}
					onComplete={handleGuidedComplete}
					onCancel={onClose}
				/>
			{:else}
				<!-- Standard modal layout -->
				<!-- Header -->
				<div class="modal-header">
					<div class="header-content">
						{#if step === 'title-input'}
							<button type="button" class="back-button" onclick={handleBack} title="Back to templates">
								<svg viewBox="0 0 20 20" fill="currentColor">
									<path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/>
								</svg>
							</button>
						{/if}
						<h2 id="modal-title">
							{getModalTitle()}
						</h2>
					</div>
					<button type="button" class="close-button" onclick={onClose} title="Close">
						<svg viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
						</svg>
					</button>
				</div>

				<!-- Content -->
				<div class="modal-content">
					{#if step === 'template-select'}
						<!-- Step 1: Template selection -->
						<TemplateSelector selected={selectedType} onSelect={handleTemplateSelect} />
					{:else if step === 'title-input'}
						<!-- Step 2a: Title input -->
						<div class="title-step">
							{#if selectedTypeInfo}
								<div class="selected-type">
									<div class="type-icon">
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
											<path d={getIcon(selectedTypeInfo.icon)} />
										</svg>
									</div>
									<div class="type-info">
										<span class="type-label">{selectedTypeInfo.label}</span>
										<span class="type-description">{selectedTypeInfo.description}</span>
									</div>
								</div>
							{/if}

							<div class="title-input-wrapper">
								<label for="page-title">Page title</label>
								<input
									id="page-title"
									type="text"
									bind:value={title}
									placeholder="Enter a title for your page"
									autofocus
								/>
							</div>
						</div>
					{/if}
				</div>

				<!-- Footer -->
				<div class="modal-footer">
					<button type="button" class="cancel-button" onclick={onClose}>
						Cancel
					</button>
					{#if step === 'template-select'}
						<button
							type="button"
							class="primary-button"
							onclick={handleNext}
							disabled={!canProceed}
						>
							Next
						</button>
					{:else if step === 'title-input'}
						<button
							type="button"
							class="primary-button"
							onclick={handleCreate}
							disabled={!canProceed}
						>
							Create Page
						</button>
					{/if}
				</div>
			{/if}
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
		max-width: 640px;
		max-height: calc(100vh - 4rem);
		background: var(--editor-bg);
		border: 1px solid var(--editor-border);
		border-radius: 16px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		overflow: hidden;
	}

	/* Wider modal for guided flow */
	.modal-guided {
		max-width: 800px;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--editor-border);
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.modal-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--editor-text);
		margin: 0;
	}

	.back-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: none;
		background: transparent;
		border-radius: 6px;
		color: var(--editor-text-secondary);
		cursor: pointer;
		transition: background-color 100ms ease, color 100ms ease;
	}

	.back-button:hover {
		background: var(--toolbar-button-hover);
		color: var(--editor-text);
	}

	.back-button svg {
		width: 18px;
		height: 18px;
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
	}

	/* Title step styles */
	.title-step {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.selected-type {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--toolbar-button-hover);
		border-radius: 12px;
	}

	.type-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: color-mix(in srgb, var(--editor-border-focus) 20%, transparent);
		border-radius: 10px;
		color: var(--editor-border-focus);
	}

	.type-icon svg {
		width: 22px;
		height: 22px;
	}

	.type-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.type-label {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--editor-text);
	}

	.type-description {
		font-size: 0.8125rem;
		color: var(--editor-text-secondary);
	}

	.title-input-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.title-input-wrapper label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--editor-text);
	}

	.title-input-wrapper input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid var(--editor-border);
		border-radius: 10px;
		background: var(--editor-bg);
		color: var(--editor-text);
		font-size: 1rem;
		transition: border-color 150ms ease;
	}

	.title-input-wrapper input:focus {
		outline: none;
		border-color: var(--editor-border-focus);
	}

	.title-input-wrapper input::placeholder {
		color: var(--editor-text-muted);
	}

	/* Footer */
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
</style>
