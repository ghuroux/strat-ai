<script lang="ts">
	/**
	 * TaskModal - Create Task Modal
	 *
	 * Centered modal for creating tasks with full field options:
	 * - Title (required)
	 * - Due date (optional)
	 * - Due date type (hard/soft deadline)
	 * - Priority (normal/high)
	 * - Area (optional - link to specific area)
	 */
	import { fly, fade } from 'svelte/transition';
	import type { Area } from '$lib/types/areas';
	import type { CreateTaskInput, TaskPriority, DueDateType } from '$lib/types/tasks';

	interface Props {
		open: boolean;
		spaceId: string;
		areas: Area[];
		spaceColor?: string;
		onClose: () => void;
		onCreate: (input: CreateTaskInput) => Promise<void>;
	}

	let {
		open,
		spaceId,
		areas,
		spaceColor = '#3b82f6',
		onClose,
		onCreate
	}: Props = $props();

	// Form state
	let title = $state('');
	let dueDate = $state('');
	let dueDateType = $state<DueDateType>('soft');
	let priority = $state<TaskPriority>('normal');
	let areaId = $state<string>('');
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	// Reset form when modal opens
	$effect(() => {
		if (open) {
			title = '';
			dueDate = '';
			dueDateType = 'soft';
			priority = 'normal';
			areaId = '';
			error = null;
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	async function handleSubmit() {
		const trimmedTitle = title.trim();
		if (!trimmedTitle) {
			error = 'Title is required';
			return;
		}

		isSubmitting = true;
		error = null;

		try {
			const input: CreateTaskInput = {
				title: trimmedTitle,
				spaceId,
				priority,
				dueDateType,
				source: { type: 'manual' }
			};

			// Add optional fields
			if (dueDate) {
				input.dueDate = new Date(dueDate);
			}
			if (areaId) {
				input.areaId = areaId;
			}

			await onCreate(input);
			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create task';
		} finally {
			isSubmitting = false;
		}
	}

	// Format today's date for min attribute
	let today = $derived(new Date().toISOString().split('T')[0]);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
	>
		<!-- Modal -->
		<div
			class="modal-container"
			style="--space-color: {spaceColor}"
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<!-- Header -->
			<header class="modal-header">
				<h2 id="modal-title" class="modal-title">Add Task</h2>
				<button type="button" onclick={onClose} class="close-button" aria-label="Close">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</header>

			<!-- Content -->
			<div class="modal-content">
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
					{#if error}
						<div class="error-message">{error}</div>
					{/if}

					<!-- Title field -->
					<div class="field">
						<label for="title" class="field-label">Title</label>
						<input
							id="title"
							type="text"
							class="field-input"
							placeholder="What needs to be done?"
							bind:value={title}
							disabled={isSubmitting}
							autofocus
						/>
					</div>

					<!-- Due date row -->
					<div class="field-row">
						<!-- Due date field -->
						<div class="field flex-1">
							<label for="due-date" class="field-label">
								Due Date
								<span class="field-hint">(optional)</span>
							</label>
							<input
								id="due-date"
								type="date"
								class="field-input"
								bind:value={dueDate}
								min={today}
								disabled={isSubmitting}
							/>
						</div>

						<!-- Due date type -->
						<div class="field">
							<label class="field-label">Deadline Type</label>
							<div class="toggle-group">
								<button
									type="button"
									class="toggle-option"
									class:selected={dueDateType === 'soft'}
									onclick={() => (dueDateType = 'soft')}
									disabled={isSubmitting}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									Soft
								</button>
								<button
									type="button"
									class="toggle-option"
									class:selected={dueDateType === 'hard'}
									onclick={() => (dueDateType = 'hard')}
									disabled={isSubmitting}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
									</svg>
									Hard
								</button>
							</div>
						</div>
					</div>

					<!-- Priority field -->
					<div class="field">
						<label class="field-label">Priority</label>
						<div class="toggle-group">
							<button
								type="button"
								class="toggle-option"
								class:selected={priority === 'normal'}
								onclick={() => (priority = 'normal')}
								disabled={isSubmitting}
							>
								Normal
							</button>
							<button
								type="button"
								class="toggle-option high-priority"
								class:selected={priority === 'high'}
								onclick={() => (priority = 'high')}
								disabled={isSubmitting}
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
								</svg>
								High
							</button>
						</div>
					</div>

					<!-- Area field -->
					{#if areas.length > 0}
						<div class="field">
							<label for="area" class="field-label">
								Area
								<span class="field-hint">(optional)</span>
							</label>
							<select
								id="area"
								class="field-input"
								bind:value={areaId}
								disabled={isSubmitting}
							>
								<option value="">No specific area</option>
								{#each areas as area (area.id)}
									<option value={area.id}>
										{area.name}
										{#if area.isGeneral}(General){/if}
									</option>
								{/each}
							</select>
						</div>
					{/if}

					<!-- Actions -->
					<div class="modal-actions">
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
							disabled={isSubmitting || !title.trim()}
						>
							{isSubmitting ? 'Creating...' : 'Create Task'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-container {
		width: 100%;
		max-width: 28rem;
		background: rgb(23, 23, 23);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.75rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #fff;
		margin: 0;
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

	.field {
		margin-bottom: 1.25rem;
	}

	.field-row {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.flex-1 {
		flex: 1;
	}

	.field-row .field {
		margin-bottom: 0;
	}

	.field-label {
		display: block;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
	}

	.field-hint {
		font-weight: 400;
		color: rgba(255, 255, 255, 0.4);
	}

	.field-input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.5rem;
		color: #fff;
		font-size: 0.9375rem;
		transition: all 0.15s ease;
	}

	.field-input:focus {
		outline: none;
		border-color: var(--space-color, #3b82f6);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--space-color, #3b82f6) 20%, transparent);
	}

	.field-input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.field-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Date input styling */
	input[type="date"] {
		color-scheme: dark;
	}

	input[type="date"]::-webkit-calendar-picker-indicator {
		filter: invert(0.7);
		cursor: pointer;
	}

	/* Select styling */
	select.field-input {
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff50'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.75rem center;
		background-size: 1rem;
		padding-right: 2.5rem;
	}

	/* Toggle group */
	.toggle-group {
		display: flex;
		gap: 0.5rem;
	}

	.toggle-option {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.6);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.toggle-option:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.9);
	}

	.toggle-option.selected {
		background: color-mix(in srgb, var(--space-color, #3b82f6) 20%, transparent);
		border-color: color-mix(in srgb, var(--space-color, #3b82f6) 50%, transparent);
		color: var(--space-color, #3b82f6);
	}

	.toggle-option.high-priority.selected {
		background: rgba(239, 68, 68, 0.15);
		border-color: rgba(239, 68, 68, 0.4);
		color: #ef4444;
	}

	.toggle-option:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-option svg {
		width: 1rem;
		height: 1rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.btn-primary,
	.btn-secondary {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: var(--space-color, #3b82f6);
		color: #fff;
	}

	.btn-primary:hover:not(:disabled) {
		background: color-mix(in srgb, var(--space-color, #3b82f6) 80%, #fff);
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

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
