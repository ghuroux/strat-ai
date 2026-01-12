<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let isSaving = $state(false);
	let error = $state('');

	// Validation
	let passwordsMatch = $derived(newPassword === confirmPassword);
	let isLongEnough = $derived(newPassword.length >= 8);
	let canSubmit = $derived(
		currentPassword.length > 0 &&
			newPassword.length > 0 &&
			confirmPassword.length > 0 &&
			passwordsMatch &&
			isLongEnough &&
			!isSaving
	);

	function clearForm() {
		currentPassword = '';
		newPassword = '';
		confirmPassword = '';
		error = '';
	}

	async function changePassword() {
		if (!canSubmit) return;

		isSaving = true;
		error = '';

		try {
			const response = await fetch('/api/user/password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentPassword,
					newPassword
				})
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error?.message || 'Failed to change password';
				return;
			}

			toastStore.success('Password changed successfully');
			clearForm();
		} catch (err) {
			console.error('Failed to change password:', err);
			error = 'Failed to change password. Please try again.';
		} finally {
			isSaving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && canSubmit) {
			e.preventDefault();
			changePassword();
		}
	}
</script>

<div class="settings-section">
	<div class="settings-section-header">
		<h2 class="settings-section-title">Change Password</h2>
		<p class="settings-section-desc">Update your account password</p>
	</div>

	{#if error}
		<div class="error-message">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			{error}
		</div>
	{/if}

	<div class="form-group">
		<label class="form-label" for="currentPassword">Current Password</label>
		<input
			type="password"
			id="currentPassword"
			class="form-input"
			placeholder="Enter your current password"
			bind:value={currentPassword}
			onkeydown={handleKeydown}
			autocomplete="current-password"
		/>
	</div>

	<div class="form-group">
		<label class="form-label" for="newPassword">New Password</label>
		<input
			type="password"
			id="newPassword"
			class="form-input"
			class:invalid={newPassword.length > 0 && !isLongEnough}
			placeholder="Enter a new password"
			bind:value={newPassword}
			onkeydown={handleKeydown}
			autocomplete="new-password"
		/>
		{#if newPassword.length > 0 && !isLongEnough}
			<p class="form-error">Password must be at least 8 characters</p>
		{/if}
	</div>

	<div class="form-group">
		<label class="form-label" for="confirmPassword">Confirm New Password</label>
		<input
			type="password"
			id="confirmPassword"
			class="form-input"
			class:invalid={confirmPassword.length > 0 && !passwordsMatch}
			placeholder="Confirm your new password"
			bind:value={confirmPassword}
			onkeydown={handleKeydown}
			autocomplete="new-password"
		/>
		{#if confirmPassword.length > 0 && !passwordsMatch}
			<p class="form-error">Passwords do not match</p>
		{/if}
	</div>

	<div class="form-actions">
		<button
			type="button"
			class="save-button"
			onclick={changePassword}
			disabled={!canSubmit}
		>
			{isSaving ? 'Changing...' : 'Change Password'}
		</button>
	</div>
</div>

<style>
	.settings-section {
		max-width: 400px;
	}

	.settings-section-header {
		margin-bottom: 2rem;
	}

	.settings-section-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: rgb(var(--color-surface-100));
		margin-bottom: 0.25rem;
	}

	.settings-section-desc {
		font-size: 0.875rem;
		color: rgb(var(--color-surface-500));
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		margin-bottom: 1.5rem;
		background: rgb(var(--color-error-500) / 0.1);
		border: 1px solid rgb(var(--color-error-500) / 0.3);
		border-radius: 0.5rem;
		color: rgb(var(--color-error-400));
		font-size: 0.875rem;
	}

	.error-message svg {
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.form-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-200);
		margin-bottom: 0.5rem;
	}

	.form-input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		font-size: 0.9375rem;
		background: rgb(var(--color-surface-800));
		border: 1px solid rgb(var(--color-surface-700));
		border-radius: 0.5rem;
		color: rgb(var(--color-surface-100));
		transition: all 0.15s ease;
	}

	.form-input::placeholder {
		color: rgb(var(--color-surface-500));
	}

	.form-input:hover {
		border-color: rgb(var(--color-surface-600));
	}

	.form-input:focus {
		outline: none;
		border-color: rgb(var(--color-primary-500));
		box-shadow: 0 0 0 2px rgb(var(--color-primary-500) / 0.2);
	}

	.form-input.invalid {
		border-color: rgb(var(--color-error-500));
	}

	.form-input.invalid:focus {
		box-shadow: 0 0 0 2px rgb(var(--color-error-500) / 0.2);
	}

	.form-error {
		font-size: 0.8125rem;
		color: rgb(var(--color-error-400));
		margin-top: 0.375rem;
	}

	.form-actions {
		margin-top: 1.5rem;
	}

	.save-button {
		padding: 0.625rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: rgb(var(--color-primary-600));
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.save-button:hover:not(:disabled) {
		background: rgb(var(--color-primary-500));
	}

	.save-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 480px) {
		.save-button {
			width: 100%;
		}
	}
</style>
