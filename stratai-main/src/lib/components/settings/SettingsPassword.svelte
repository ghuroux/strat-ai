<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';

	const MAX_PASSWORD_LENGTH = 128;

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let isSaving = $state(false);
	let error = $state('');

	// Validation
	let passwordsMatch = $derived(newPassword === confirmPassword);
	let isLongEnough = $derived(newPassword.length >= 8);
	let isTooLong = $derived(newPassword.length > MAX_PASSWORD_LENGTH);
	let canSubmit = $derived(
		currentPassword.length > 0 &&
			newPassword.length > 0 &&
			confirmPassword.length > 0 &&
			passwordsMatch &&
			isLongEnough &&
			!isTooLong &&
			!isSaving
	);

	// Clear API error when user starts typing
	function handleInput() {
		if (error) {
			error = '';
		}
	}

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

<div class="max-w-md">
	<!-- Header -->
	<div class="mb-8">
		<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Change Password</h2>
		<p class="text-sm text-zinc-600 dark:text-zinc-400">Update your account password</p>
	</div>

	<!-- Error message -->
	{#if error}
		<div class="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/20" role="alert" aria-live="polite">
			<svg class="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			<span class="text-sm text-red-600 dark:text-red-400">{error}</span>
		</div>
	{/if}

	<!-- Current Password -->
	<div class="mb-5">
		<label class="block text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2" for="currentPassword">
			Current Password
		</label>
		<input
			type="password"
			id="currentPassword"
			class="w-full px-3 py-2.5 rounded-lg
				   bg-zinc-100 dark:bg-zinc-800
				   border border-zinc-300 dark:border-zinc-600
				   text-sm text-zinc-900 dark:text-zinc-100
				   placeholder:text-zinc-400 dark:placeholder:text-zinc-500
				   hover:border-zinc-400 dark:hover:border-zinc-500
				   focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20
				   transition-colors duration-150"
			placeholder="Enter your current password"
			bind:value={currentPassword}
			oninput={handleInput}
			onkeydown={handleKeydown}
			autocomplete="current-password"
		/>
	</div>

	<!-- New Password -->
	<div class="mb-5">
		<label class="block text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2" for="newPassword">
			New Password
		</label>
		<input
			type="password"
			id="newPassword"
			class="w-full px-3 py-2.5 rounded-lg
				   bg-zinc-100 dark:bg-zinc-800
				   border text-sm text-zinc-900 dark:text-zinc-100
				   placeholder:text-zinc-400 dark:placeholder:text-zinc-500
				   focus:outline-none focus:ring-2
				   transition-colors duration-150
				   {(newPassword.length > 0 && !isLongEnough) || isTooLong
				     ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
				     : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 focus:border-primary-500 focus:ring-primary-500/20'}"
			placeholder="Enter a new password"
			bind:value={newPassword}
			oninput={handleInput}
			onkeydown={handleKeydown}
			autocomplete="new-password"
			aria-describedby={newPassword.length > 0 && (!isLongEnough || isTooLong) ? 'newPassword-error' : undefined}
		/>
		{#if newPassword.length > 0 && !isLongEnough}
			<p class="text-xs text-red-600 dark:text-red-400 mt-1.5" id="newPassword-error">Password must be at least 8 characters</p>
		{:else if isTooLong}
			<p class="text-xs text-red-600 dark:text-red-400 mt-1.5" id="newPassword-error">Password must be less than {MAX_PASSWORD_LENGTH} characters</p>
		{/if}
	</div>

	<!-- Confirm New Password -->
	<div class="mb-6">
		<label class="block text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2" for="confirmPassword">
			Confirm New Password
		</label>
		<input
			type="password"
			id="confirmPassword"
			class="w-full px-3 py-2.5 rounded-lg
				   bg-zinc-100 dark:bg-zinc-800
				   border text-sm text-zinc-900 dark:text-zinc-100
				   placeholder:text-zinc-400 dark:placeholder:text-zinc-500
				   focus:outline-none focus:ring-2
				   transition-colors duration-150
				   {confirmPassword.length > 0 && !passwordsMatch
				     ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
				     : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 focus:border-primary-500 focus:ring-primary-500/20'}"
			placeholder="Confirm your new password"
			bind:value={confirmPassword}
			oninput={handleInput}
			onkeydown={handleKeydown}
			autocomplete="new-password"
			aria-describedby={confirmPassword.length > 0 && !passwordsMatch ? 'confirmPassword-error' : undefined}
		/>
		{#if confirmPassword.length > 0 && !passwordsMatch}
			<p class="text-xs text-red-600 dark:text-red-400 mt-1.5" id="confirmPassword-error">Passwords do not match</p>
		{/if}
	</div>

	<!-- Submit Button -->
	<button
		type="button"
		class="px-5 py-2.5 rounded-lg text-sm font-medium text-white
			   bg-primary-500 hover:bg-primary-600
			   disabled:opacity-50 disabled:cursor-not-allowed
			   transition-colors duration-150
			   max-sm:w-full"
		onclick={changePassword}
		disabled={!canSubmit}
	>
		{isSaving ? 'Changing...' : 'Change Password'}
	</button>
</div>
