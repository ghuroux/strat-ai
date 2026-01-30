<script lang="ts">
	/**
	 * SkillEditorModal - Create/Edit Skill Modal
	 *
	 * Following AreaModal pattern — fly+fade transitions, form state with $state() runes.
	 *
	 * Form fields:
	 * 1. Name — text input, required
	 * 2. Description — text input, required (one-line for AI context)
	 * 3. Content — textarea, required (markdown skill body)
	 * 4. Activation Mode — radio card group (Always / Trigger / Manual)
	 * 5. Trigger Keywords — text input, comma-separated (visible only when mode="trigger")
	 */
	import { fly, fade } from 'svelte/transition';
	import { Zap } from 'lucide-svelte';
	import type { Skill, CreateSkillInput, UpdateSkillInput, SkillActivationMode } from '$lib/types/skills';
	import { skillStore } from '$lib/stores/skills.svelte';

	interface Props {
		open: boolean;
		skill?: Skill | null;
		spaceId: string;
		onClose: () => void;
		onSave: (skill: Skill) => void;
	}

	let {
		open,
		skill = null,
		spaceId,
		onClose,
		onSave
	}: Props = $props();

	// Form state
	let name = $state('');
	let description = $state('');
	let content = $state('');
	let activationMode = $state<SkillActivationMode>('manual');
	let triggersText = $state('');
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);
	let showDeleteConfirm = $state(false);

	// Derived
	let isEditMode = $derived(skill !== null);
	let modalTitle = $derived(isEditMode ? 'Edit Skill' : 'New Skill');
	let submitLabel = $derived(isEditMode ? 'Save Changes' : 'Create Skill');
	let tokenEstimate = $derived(Math.ceil(content.length / 4));
	let canSubmit = $derived(name.trim() && description.trim() && content.trim() && !isSubmitting);

	// Reset form when modal opens/closes or skill changes
	$effect(() => {
		if (open) {
			if (skill) {
				name = skill.name;
				description = skill.description;
				content = skill.content;
				activationMode = skill.activationMode;
				triggersText = (skill.triggers ?? []).join(', ');
			} else {
				name = '';
				description = '';
				content = '';
				activationMode = 'manual';
				triggersText = '';
			}
			error = null;
			showDeleteConfirm = false;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (showDeleteConfirm) {
				showDeleteConfirm = false;
			} else {
				onClose();
			}
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function parseTriggers(text: string): string[] {
		return text
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
	}

	async function handleSubmit() {
		if (isSubmitting) return;

		const trimmedName = name.trim();
		const trimmedDesc = description.trim();
		const trimmedContent = content.trim();

		if (!trimmedName) {
			error = 'Name is required';
			return;
		}
		if (!trimmedDesc) {
			error = 'Description is required';
			return;
		}
		if (!trimmedContent) {
			error = 'Content is required';
			return;
		}

		isSubmitting = true;
		error = null;

		try {
			const triggers = activationMode === 'trigger' ? parseTriggers(triggersText) : undefined;

			if (isEditMode && skill) {
				const updates: UpdateSkillInput = {
					name: trimmedName,
					description: trimmedDesc,
					content: trimmedContent,
					activationMode,
					triggers
				};
				const updated = await skillStore.updateSkill(skill.id, updates);
				if (updated) {
					onSave(updated);
					onClose();
				}
			} else {
				const input: CreateSkillInput = {
					spaceId,
					name: trimmedName,
					description: trimmedDesc,
					content: trimmedContent,
					activationMode,
					triggers
				};
				const created = await skillStore.createSkill(input);
				if (created) {
					onSave(created);
					onClose();
				}
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save skill';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDelete() {
		if (!skill) return;

		isSubmitting = true;
		error = null;

		try {
			const success = await skillStore.deleteSkill(skill.id, spaceId);
			if (success) {
				onClose();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete skill';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
	>
		<!-- Modal -->
		<div
			class="modal-container"
			role="dialog"
			aria-modal="true"
			aria-labelledby="skill-modal-title"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<!-- Header -->
			<header class="modal-header">
				<div class="header-left">
					<div class="header-icon">
						<Zap size={16} strokeWidth={2} />
					</div>
					<h2 id="skill-modal-title" class="modal-title">{modalTitle}</h2>
				</div>
				<button type="button" onclick={onClose} class="close-button" aria-label="Close">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</header>

			<!-- Content -->
			<div class="modal-content">
				{#if showDeleteConfirm}
					<div class="delete-confirm">
						<p class="delete-message">
							Are you sure you want to delete <strong>"{skill?.name}"</strong>?
						</p>
						<p class="delete-warning">This skill will be deactivated from all areas.</p>
						<div class="delete-actions">
							<button
								type="button"
								class="btn-secondary"
								onclick={() => (showDeleteConfirm = false)}
								disabled={isSubmitting}
							>
								Cancel
							</button>
							<button
								type="button"
								class="btn-danger"
								onclick={handleDelete}
								disabled={isSubmitting}
							>
								{isSubmitting ? 'Deleting...' : 'Delete'}
							</button>
						</div>
					</div>
				{:else}
					<form
						onsubmit={(e) => {
							e.preventDefault();
							handleSubmit();
						}}
					>
						{#if error}
							<div class="error-message">{error}</div>
						{/if}

						<!-- Name -->
						<div class="field">
							<label for="skill-name" class="field-label">Name</label>
							<!-- svelte-ignore a11y_autofocus -->
							<input
								id="skill-name"
								type="text"
								class="field-input"
								placeholder="e.g., Financial Analysis, Code Review"
								bind:value={name}
								disabled={isSubmitting}
								autofocus={!isEditMode}
							/>
						</div>

						<!-- Description -->
						<div class="field">
							<label for="skill-desc" class="field-label">Description</label>
							<input
								id="skill-desc"
								type="text"
								class="field-input"
								placeholder="Brief one-line description for AI context"
								bind:value={description}
								disabled={isSubmitting}
							/>
							<p class="field-hint">Helps the AI understand when to apply this skill</p>
						</div>

						<!-- Content -->
						<div class="field">
							<label for="skill-content" class="field-label">
								Content
								{#if content.length > 0}
									<span class="token-estimate">~{tokenEstimate} tokens</span>
								{/if}
							</label>
							<textarea
								id="skill-content"
								class="field-textarea"
								placeholder="Write the skill instructions in markdown. This is what gets injected into the AI's system prompt..."
								bind:value={content}
								disabled={isSubmitting}
								rows="8"
							></textarea>
						</div>

						<!-- Activation Mode -->
						<div class="field">
							<span class="field-label">Activation Mode</span>
							<div class="mode-options">
								<label class="mode-option" class:selected={activationMode === 'always'}>
									<input
										type="radio"
										name="activation-mode"
										value="always"
										bind:group={activationMode}
										disabled={isSubmitting}
										class="sr-only"
									/>
									<div class="option-radio" class:checked={activationMode === 'always'}></div>
									<div class="option-content">
										<span class="option-label">Always</span>
										<span class="option-desc">Active in every conversation</span>
									</div>
								</label>
								<label class="mode-option" class:selected={activationMode === 'trigger'}>
									<input
										type="radio"
										name="activation-mode"
										value="trigger"
										bind:group={activationMode}
										disabled={isSubmitting}
										class="sr-only"
									/>
									<div class="option-radio" class:checked={activationMode === 'trigger'}></div>
									<div class="option-content">
										<span class="option-label">Trigger</span>
										<span class="option-desc">Activated when keywords match</span>
									</div>
								</label>
								<label class="mode-option" class:selected={activationMode === 'manual'}>
									<input
										type="radio"
										name="activation-mode"
										value="manual"
										bind:group={activationMode}
										disabled={isSubmitting}
										class="sr-only"
									/>
									<div class="option-radio" class:checked={activationMode === 'manual'}></div>
									<div class="option-content">
										<span class="option-label">Manual</span>
										<span class="option-desc">User toggles per-area in Context Panel</span>
									</div>
								</label>
							</div>
						</div>

						<!-- Trigger Keywords (only when trigger mode) -->
						{#if activationMode === 'trigger'}
							<div class="field">
								<label for="skill-triggers" class="field-label">Trigger Keywords</label>
								<input
									id="skill-triggers"
									type="text"
									class="field-input"
									placeholder="valuation, DCF, financial model"
									bind:value={triggersText}
									disabled={isSubmitting}
								/>
								<p class="field-hint">Comma-separated keywords that activate this skill</p>
							</div>
						{/if}

						<!-- Actions -->
						<div class="modal-actions">
							{#if isEditMode}
								<button
									type="button"
									class="btn-danger-outline"
									onclick={() => (showDeleteConfirm = true)}
									disabled={isSubmitting}
								>
									Delete
								</button>
							{/if}
							<div class="actions-right">
								<button
									type="button"
									class="btn-secondary"
									onclick={onClose}
									disabled={isSubmitting}
								>
									Cancel
								</button>
								<button
									type="submit"
									class="btn-primary"
									disabled={!canSubmit}
								>
									{#if isSubmitting}
										Saving...
									{:else}
										{submitLabel}
									{/if}
								</button>
							</div>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-container {
		width: 100%;
		max-width: 32rem;
		max-height: 90vh;
		overflow-y: auto;
		background: rgb(23, 23, 23);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem 0.75rem 0 0;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		padding-bottom: env(safe-area-inset-bottom);
	}

	@media (min-width: 768px) {
		.modal-container {
			border-radius: 0.75rem;
			padding-bottom: 0;
		}
	}

	@media (prefers-color-scheme: light) {
		.modal-container {
			background: white;
			border-color: rgb(228 228 231);
			box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	@media (prefers-color-scheme: light) {
		.modal-header {
			border-bottom-color: rgb(228 228 231);
		}
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		background: rgba(245, 158, 11, 0.15);
		border-radius: 0.375rem;
		color: #f59e0b;
	}

	.modal-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #fff;
		margin: 0;
	}

	@media (prefers-color-scheme: light) {
		.modal-title {
			color: rgb(24 24 27);
		}
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		color: rgba(255, 255, 255, 0.5);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.close-button:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	@media (prefers-color-scheme: light) {
		.close-button {
			color: rgb(161 161 170);
		}

		.close-button:hover {
			background: rgb(244 244 245);
			color: rgb(24 24 27);
		}
	}

	.modal-content {
		padding: 1.5rem;
	}

	.error-message {
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 0.5rem;
		color: #fca5a5;
		font-size: 0.875rem;
	}

	@media (prefers-color-scheme: light) {
		.error-message {
			background: rgb(254 242 242);
			border-color: rgb(254 202 202);
			color: rgb(185 28 28);
		}
	}

	.field {
		margin-bottom: 1.25rem;
	}

	.field-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	@media (prefers-color-scheme: light) {
		.field-label {
			color: rgb(24 24 27);
		}
	}

	.token-estimate {
		font-size: 0.6875rem;
		font-weight: 400;
		padding: 0.0625rem 0.375rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 0.25rem;
		color: rgba(255, 255, 255, 0.5);
	}

	@media (prefers-color-scheme: light) {
		.token-estimate {
			background: rgb(244 244 245);
			color: rgb(113 113 122);
		}
	}

	.field-input,
	.field-textarea {
		width: 100%;
		padding: 0.625rem 0.875rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 0.9375rem;
		transition: all 0.15s ease;
	}

	@media (prefers-color-scheme: light) {
		.field-input,
		.field-textarea {
			background: white;
			border-color: rgb(212 212 216);
			color: rgb(24 24 27);
		}
	}

	.field-input:focus,
	.field-textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
	}

	.field-input::placeholder,
	.field-textarea::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	@media (prefers-color-scheme: light) {
		.field-input::placeholder,
		.field-textarea::placeholder {
			color: rgb(161 161 170);
		}
	}

	.field-input:disabled,
	.field-textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.field-textarea {
		resize: vertical;
		min-height: 8rem;
		font-family: 'SF Mono', 'Fira Code', monospace;
		font-size: 0.8125rem;
		line-height: 1.6;
	}

	.field-hint {
		margin-top: 0.375rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.4);
	}

	@media (prefers-color-scheme: light) {
		.field-hint {
			color: rgb(161 161 170);
		}
	}

	/* Activation Mode Radio Cards */
	.mode-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.mode-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.mode-option:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.mode-option.selected {
		background: rgba(59, 130, 246, 0.08);
		border-color: rgba(59, 130, 246, 0.4);
	}

	@media (prefers-color-scheme: light) {
		.mode-option {
			background: white;
			border-color: rgb(228 228 231);
		}

		.mode-option:hover {
			background: rgb(250 250 250);
			border-color: rgb(212 212 216);
		}

		.mode-option.selected {
			background: rgba(59, 130, 246, 0.05);
			border-color: rgba(59, 130, 246, 0.4);
		}
	}

	.option-radio {
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		border: 2px solid rgba(255, 255, 255, 0.3);
		flex-shrink: 0;
		transition: all 0.15s ease;
		position: relative;
	}

	@media (prefers-color-scheme: light) {
		.option-radio {
			border-color: rgb(212 212 216);
		}
	}

	.option-radio.checked {
		border-color: #3b82f6;
	}

	.option-radio.checked::after {
		content: '';
		position: absolute;
		inset: 2px;
		border-radius: 50%;
		background: #3b82f6;
	}

	.option-content {
		display: flex;
		flex-direction: column;
		gap: 0.0625rem;
	}

	.option-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	@media (prefers-color-scheme: light) {
		.option-label {
			color: rgb(24 24 27);
		}
	}

	.option-desc {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.45);
	}

	@media (prefers-color-scheme: light) {
		.option-desc {
			color: rgb(161 161 170);
		}
	}

	/* Actions */
	.modal-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	@media (prefers-color-scheme: light) {
		.modal-actions {
			border-top-color: rgb(228 228 231);
		}
	}

	.actions-right {
		display: flex;
		gap: 0.75rem;
		margin-left: auto;
	}

	.btn-primary,
	.btn-secondary,
	.btn-danger,
	.btn-danger-outline {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: #3b82f6;
		color: #fff;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
	}

	.btn-secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
	}

	@media (prefers-color-scheme: light) {
		.btn-secondary {
			background: rgb(244 244 245);
			color: rgb(63 63 70);
		}

		.btn-secondary:hover:not(:disabled) {
			background: rgb(228 228 231);
			color: rgb(24 24 27);
		}
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-danger {
		background: #ef4444;
		color: #fff;
	}

	.btn-danger:hover:not(:disabled) {
		background: #dc2626;
	}

	.btn-danger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-danger-outline {
		background: transparent;
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	.btn-danger-outline:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.5);
	}

	.btn-danger-outline:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Delete confirmation */
	.delete-confirm {
		text-align: center;
		padding: 1rem 0;
	}

	.delete-message {
		font-size: 1rem;
		color: #fff;
		margin-bottom: 0.5rem;
	}

	@media (prefers-color-scheme: light) {
		.delete-message {
			color: rgb(24 24 27);
		}
	}

	.delete-warning {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
		margin-bottom: 1.5rem;
	}

	@media (prefers-color-scheme: light) {
		.delete-warning {
			color: rgb(113 113 122);
		}
	}

	.delete-actions {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
	}
</style>
