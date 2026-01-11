<script lang="ts">
	import { userStore } from '$lib/stores/user.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	let displayName = $state(userStore.user?.displayName ?? '');
	let isSaving = $state(false);
	let hasChanges = $derived(displayName !== (userStore.user?.displayName ?? ''));

	// Keep in sync with store
	$effect(() => {
		displayName = userStore.user?.displayName ?? '';
	});

	async function saveProfile() {
		if (isSaving || !hasChanges) return;

		isSaving = true;

		try {
			const response = await fetch('/api/user/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ displayName: displayName.trim() || null })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error?.message || 'Failed to save profile');
			}

			const result = await response.json();

			// Update local store
			userStore.setUser({
				...userStore.user!,
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

	<div class="form-group">
		<label class="form-label" for="displayName">Display Name</label>
		<p class="form-hint">This is how your name appears in the app</p>
		<div class="input-with-button">
			<input
				type="text"
				id="displayName"
				class="form-input"
				placeholder="Enter your display name"
				bind:value={displayName}
				onkeydown={handleKeydown}
				maxlength={100}
			/>
			<button
				type="button"
				class="save-button"
				onclick={saveProfile}
				disabled={!hasChanges || isSaving}
			>
				{isSaving ? 'Saving...' : 'Save'}
			</button>
		</div>
	</div>

	<div class="form-group">
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

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-surface-200);
		margin-bottom: 0.25rem;
	}

	.form-hint {
		font-size: 0.8125rem;
		color: var(--color-surface-500);
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

	.input-with-button {
		display: flex;
		gap: 0.75rem;
	}

	.form-input {
		flex: 1;
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
		.input-with-button {
			flex-direction: column;
		}

		.save-button {
			width: 100%;
		}
	}
</style>
