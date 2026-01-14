<script lang="ts">
	import { userStore } from '$lib/stores/user.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	let firstName = $state(userStore.user?.firstName ?? '');
	let lastName = $state(userStore.user?.lastName ?? '');
	let isSaving = $state(false);

	// Computed display name preview
	let displayNamePreview = $derived(() => {
		const parts = [firstName.trim(), lastName.trim()].filter(Boolean);
		return parts.length > 0 ? parts.join(' ') : 'Not set';
	});

	let hasChanges = $derived(
		firstName !== (userStore.user?.firstName ?? '') ||
			lastName !== (userStore.user?.lastName ?? '')
	);

	// Keep in sync with store
	$effect(() => {
		firstName = userStore.user?.firstName ?? '';
		lastName = userStore.user?.lastName ?? '';
	});

	async function saveProfile() {
		if (isSaving || !hasChanges) return;

		isSaving = true;

		try {
			const response = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					firstName: firstName.trim() || null,
					lastName: lastName.trim() || null
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error?.message || 'Failed to save profile');
			}

			const result = await response.json();

			// Update local store
			userStore.setUser({
				...userStore.user!,
				firstName: result.profile.firstName,
				lastName: result.profile.lastName,
				displayName: result.profile.displayName
			});

			toastStore.success('Profile updated');
		} catch (error) {
			console.error('Failed to save profile:', error);
			toastStore.error(error instanceof Error ? error.message : 'Failed to save profile');
		} finally {
			isSaving = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && hasChanges && !isSaving) {
			e.preventDefault();
			saveProfile();
		}
	}
</script>

<div class="settings-section">
	<div class="settings-section-header">
		<h2 class="settings-section-title">Profile</h2>
		<p class="settings-section-desc">Manage your account information</p>
	</div>

	<div class="name-row">
		<div class="form-group">
			<label class="form-label" for="firstName">First Name</label>
			<input
				type="text"
				id="firstName"
				class="form-input"
				placeholder="Enter your first name"
				bind:value={firstName}
				onkeydown={handleKeydown}
				maxlength={100}
			/>
		</div>

		<div class="form-group">
			<label class="form-label" for="lastName">Last Name</label>
			<input
				type="text"
				id="lastName"
				class="form-input"
				placeholder="Enter your last name"
				bind:value={lastName}
				onkeydown={handleKeydown}
				maxlength={100}
			/>
		</div>
	</div>

	<div class="display-name-preview">
		<span class="preview-label">Display Name:</span>
		<span class="preview-value">{displayNamePreview()}</span>
	</div>

	{#if hasChanges}
		<div class="action-row">
			<button
				type="button"
				class="save-button"
				onclick={saveProfile}
				disabled={isSaving}
			>
				{isSaving ? 'Saving...' : 'Save Changes'}
			</button>
		</div>
	{/if}

	<div class="form-group email-group">
		<label class="form-label">Email</label>
		<p class="form-value">{userStore.user?.email ?? 'Not available'}</p>
		<p class="form-hint-muted">Contact an administrator to change your email</p>
	</div>
</div>

<style>
	.settings-section {
		max-width: 600px;
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

	.name-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.form-group {
		margin-bottom: 0;
	}

	.email-group {
		margin-top: 1.5rem;
	}

	.form-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-200);
		margin-bottom: 0.5rem;
	}

	.form-hint-muted {
		font-size: 0.75rem;
		color: var(--color-surface-600);
		margin-top: 0.375rem;
	}

	.form-value {
		font-size: 0.9375rem;
		color: var(--color-surface-300);
		padding: 0.5rem 0;
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

	.display-name-preview {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: rgb(var(--color-surface-800) / 0.5);
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	.preview-label {
		font-size: 0.8125rem;
		color: rgb(var(--color-surface-500));
	}

	.preview-value {
		font-size: 0.875rem;
		font-weight: 500;
		color: rgb(var(--color-surface-200));
	}

	.action-row {
		margin-bottom: 1.5rem;
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
		white-space: nowrap;
	}

	.save-button:hover:not(:disabled) {
		background: rgb(var(--color-primary-500));
	}

	.save-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 480px) {
		.name-row {
			grid-template-columns: 1fr;
		}

		.form-group {
			margin-bottom: 1rem;
		}
	}
</style>
