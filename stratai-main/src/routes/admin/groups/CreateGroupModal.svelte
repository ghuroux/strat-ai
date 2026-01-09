<script lang="ts">
	interface Props {
		onclose: () => void;
		oncreated: () => void;
	}

	let { onclose, oncreated }: Props = $props();

	let name = $state('');
	let description = $state('');
	let systemPrompt = $state('');
	let monthlyBudget = $state('');
	let noLimit = $state(true);
	let allowedTiers = $state<string[]>(['basic', 'standard', 'premium']);

	let isSubmitting = $state(false);
	let error = $state('');

	const SYSTEM_PROMPT_MAX = 2000;

	function toggleTier(tier: string) {
		if (allowedTiers.includes(tier)) {
			allowedTiers = allowedTiers.filter(t => t !== tier);
		} else {
			allowedTiers = [...allowedTiers, tier];
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (!name.trim()) {
			error = 'Group name is required';
			return;
		}

		if (systemPrompt.length > SYSTEM_PROMPT_MAX) {
			error = `System prompt must be ${SYSTEM_PROMPT_MAX} characters or less`;
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch('/api/admin/groups', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					description: description.trim() || null,
					systemPrompt: systemPrompt.trim() || null,
					allowedTiers: allowedTiers.length > 0 ? allowedTiers : null,
					monthlyBudget: noLimit ? null : parseFloat(monthlyBudget) || null
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to create group');
			}

			oncreated();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create group';
		} finally {
			isSubmitting = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="modal-backdrop" onclick={handleBackdropClick} role="dialog" aria-modal="true" aria-labelledby="modal-title">
	<div class="modal">
		<header class="modal-header">
			<h2 id="modal-title">Create Group</h2>
			<button class="btn-close" onclick={onclose} aria-label="Close">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</header>

		<form onsubmit={handleSubmit}>
			<div class="modal-body">
				{#if error}
					<div class="error-message">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						{error}
					</div>
				{/if}

				<div class="form-group">
					<label for="name">Group Name <span class="required">*</span></label>
					<input
						type="text"
						id="name"
						bind:value={name}
						placeholder="e.g., Engineering, Marketing, Leadership"
						required
					/>
				</div>

				<div class="form-group">
					<label for="description">Description</label>
					<input
						type="text"
						id="description"
						bind:value={description}
						placeholder="Brief description of this group"
					/>
				</div>

				<div class="form-group">
					<label>Model Access</label>
					<p class="form-hint">Select which model tiers this group can access</p>
					<div class="tier-options">
						<label class="tier-option">
							<input
								type="checkbox"
								checked={allowedTiers.includes('basic')}
								onchange={() => toggleTier('basic')}
							/>
							<span class="tier-label">
								<span class="tier-name">Basic</span>
								<span class="tier-desc">Fast, cost-effective models</span>
							</span>
						</label>
						<label class="tier-option">
							<input
								type="checkbox"
								checked={allowedTiers.includes('standard')}
								onchange={() => toggleTier('standard')}
							/>
							<span class="tier-label">
								<span class="tier-name">Standard</span>
								<span class="tier-desc">Balanced performance</span>
							</span>
						</label>
						<label class="tier-option">
							<input
								type="checkbox"
								checked={allowedTiers.includes('premium')}
								onchange={() => toggleTier('premium')}
							/>
							<span class="tier-label">
								<span class="tier-name">Premium</span>
								<span class="tier-desc">Most capable models</span>
							</span>
						</label>
					</div>
				</div>

				<div class="form-group">
					<label for="budget">Monthly Budget</label>
					<div class="budget-input-wrapper">
						<div class="budget-input" class:disabled={noLimit}>
							<span class="currency">$</span>
							<input
								type="number"
								id="budget"
								bind:value={monthlyBudget}
								placeholder="0.00"
								min="0"
								step="0.01"
								disabled={noLimit}
							/>
							<span class="suffix">USD</span>
						</div>
						<label class="no-limit-option">
							<input type="checkbox" bind:checked={noLimit} />
							<span>No limit</span>
						</label>
					</div>
				</div>

				<div class="form-group">
					<label for="prompt">Team System Prompt</label>
					<p class="form-hint">
						Context included in AI conversations for this group, in addition to the organization-wide prompt.
					</p>
					<textarea
						id="prompt"
						bind:value={systemPrompt}
						placeholder="e.g., When helping Engineering team members, follow our TypeScript style guide..."
						rows="4"
					></textarea>
					<div class="char-count" class:warning={systemPrompt.length > SYSTEM_PROMPT_MAX * 0.9}>
						{systemPrompt.length} / {SYSTEM_PROMPT_MAX}
					</div>
				</div>
			</div>

			<footer class="modal-footer">
				<button type="button" class="btn-secondary" onclick={onclose} disabled={isSubmitting}>
					Cancel
				</button>
				<button type="submit" class="btn-primary" disabled={isSubmitting}>
					{#if isSubmitting}
						<svg class="spinner" viewBox="0 0 24 24">
							<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="60" stroke-linecap="round" />
						</svg>
						Creating...
					{:else}
						Create Group
					{/if}
				</button>
			</footer>
		</form>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgb(0 0 0 / 0.6);
		backdrop-filter: blur(4px);
	}

	.modal {
		width: 100%;
		max-width: 520px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.75rem;
		box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.5);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-surface-800);
	}

	.modal-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-surface-100);
	}

	.btn-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		color: var(--color-surface-400);
		background: transparent;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-close:hover {
		color: var(--color-surface-200);
		background: var(--color-surface-800);
	}

	.modal-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		color: var(--color-error-300);
		background: color-mix(in srgb, var(--color-error-500) 15%, transparent);
		border: 1px solid var(--color-error-500);
		border-radius: 0.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group > label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-200);
	}

	.required {
		color: var(--color-error-400);
	}

	.form-hint {
		font-size: 0.8125rem;
		color: var(--color-surface-400);
		margin-top: -0.25rem;
	}

	input[type="text"],
	input[type="number"],
	textarea {
		padding: 0.625rem 0.75rem;
		font-size: 0.875rem;
		color: var(--color-surface-100);
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		outline: none;
		transition: border-color 0.15s ease;
	}

	input[type="text"]:focus,
	input[type="number"]:focus,
	textarea:focus {
		border-color: var(--color-primary-500);
	}

	input::placeholder,
	textarea::placeholder {
		color: var(--color-surface-500);
	}

	textarea {
		resize: vertical;
		min-height: 100px;
	}

	.tier-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.tier-option {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tier-option:hover {
		border-color: var(--color-surface-600);
	}

	.tier-option:has(input:checked) {
		border-color: var(--color-primary-500);
		background: color-mix(in srgb, var(--color-primary-500) 10%, transparent);
	}

	.tier-option input[type="checkbox"] {
		margin-top: 0.125rem;
		accent-color: var(--color-primary-500);
	}

	.tier-label {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.tier-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-100);
	}

	.tier-desc {
		font-size: 0.8125rem;
		color: var(--color-surface-400);
	}

	.budget-input-wrapper {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.budget-input {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		transition: all 0.15s ease;
	}

	.budget-input.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.budget-input:focus-within {
		border-color: var(--color-primary-500);
	}

	.currency {
		font-size: 0.875rem;
		color: var(--color-surface-400);
	}

	.budget-input input {
		flex: 1;
		padding: 0;
		font-size: 0.875rem;
		color: var(--color-surface-100);
		background: transparent;
		border: none;
		outline: none;
	}

	.suffix {
		font-size: 0.75rem;
		color: var(--color-surface-400);
	}

	.no-limit-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-surface-300);
		white-space: nowrap;
		cursor: pointer;
	}

	.no-limit-option input {
		accent-color: var(--color-primary-500);
	}

	.char-count {
		align-self: flex-end;
		font-size: 0.75rem;
		color: var(--color-surface-500);
	}

	.char-count.warning {
		color: var(--color-warning-400);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--color-surface-800);
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-300);
		background: transparent;
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary:hover:not(:disabled) {
		color: var(--color-surface-100);
		border-color: var(--color-surface-600);
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: var(--color-primary-500);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-primary-600);
	}

	.btn-primary:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
