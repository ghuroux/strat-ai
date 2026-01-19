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

<div class="max-w-xl">
	<!-- Header -->
	<div class="mb-8">
		<h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Profile</h2>
		<p class="text-sm text-zinc-600 dark:text-zinc-400">Manage your account information</p>
	</div>

	<!-- Name Fields -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
		<div>
			<label class="block text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2" for="firstName">
				First Name
			</label>
			<input
				type="text"
				id="firstName"
				class="w-full px-3 py-2.5 rounded-lg
					   bg-zinc-100 dark:bg-zinc-800
					   border border-zinc-300 dark:border-zinc-600
					   text-sm text-zinc-900 dark:text-zinc-100
					   placeholder:text-zinc-400 dark:placeholder:text-zinc-500
					   hover:border-zinc-400 dark:hover:border-zinc-500
					   focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20
					   transition-colors duration-150"
				placeholder="Enter your first name"
				bind:value={firstName}
				onkeydown={handleKeydown}
				maxlength={100}
			/>
		</div>

		<div>
			<label class="block text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2" for="lastName">
				Last Name
			</label>
			<input
				type="text"
				id="lastName"
				class="w-full px-3 py-2.5 rounded-lg
					   bg-zinc-100 dark:bg-zinc-800
					   border border-zinc-300 dark:border-zinc-600
					   text-sm text-zinc-900 dark:text-zinc-100
					   placeholder:text-zinc-400 dark:placeholder:text-zinc-500
					   hover:border-zinc-400 dark:hover:border-zinc-500
					   focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20
					   transition-colors duration-150"
				placeholder="Enter your last name"
				bind:value={lastName}
				onkeydown={handleKeydown}
				maxlength={100}
			/>
		</div>
	</div>

	<!-- Display Name Preview -->
	<div class="flex items-center gap-2 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 mb-4">
		<span class="text-xs text-zinc-500 dark:text-zinc-500">Display Name:</span>
		<span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{displayNamePreview()}</span>
	</div>

	<!-- Save Button -->
	{#if hasChanges}
		<div class="mb-6">
			<button
				type="button"
				class="px-5 py-2.5 rounded-lg text-sm font-medium text-white
					   bg-primary-500 hover:bg-primary-600
					   disabled:opacity-50 disabled:cursor-not-allowed
					   transition-colors duration-150"
				onclick={saveProfile}
				disabled={isSaving}
			>
				{isSaving ? 'Saving...' : 'Save Changes'}
			</button>
		</div>
	{/if}

	<!-- Email (read-only) -->
	<div class="mt-6">
		<label class="block text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-2">Email</label>
		<p class="text-sm text-zinc-700 dark:text-zinc-300 py-1">{userStore.user?.email ?? 'Not available'}</p>
		<p class="text-xs text-zinc-500 dark:text-zinc-500 mt-1">Contact an administrator to change your email</p>
	</div>
</div>
