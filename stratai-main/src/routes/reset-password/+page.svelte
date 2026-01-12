<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state(false);

	// Get token from URL query parameter
	const token = $derived($page.url.searchParams.get('token') || '');

	// Real-time password validation
	const passwordValid = $derived(password.length >= 8);
	const passwordsMatch = $derived(password === confirmPassword);
	const canSubmit = $derived(passwordValid && passwordsMatch && !loading);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!canSubmit) return;

		error = '';
		loading = true;

		try {
			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, password })
			});

			const data = await response.json();

			if (!response.ok) {
				error = data.error || 'Failed to reset password';
				return;
			}

			success = true;
			// Redirect to login after 2 seconds
			setTimeout(() => goto('/login'), 2000);
		} catch (err) {
			error = 'An unexpected error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Reset Password - StratAI</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="w-full max-w-md p-8 bg-gray-800 rounded-xl shadow-xl">
		<h1 class="text-2xl font-bold text-center mb-2">Create New Password</h1>

		{#if !token}
			<!-- Missing token in URL -->
			<div class="text-center">
				<div class="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
					<p class="text-red-200">Invalid reset link. Please request a new one.</p>
				</div>
				<a href="/forgot-password" class="text-blue-400 hover:text-blue-300">
					Request new reset link
				</a>
			</div>
		{:else if success}
			<!-- Success state -->
			<div class="text-center">
				<div class="mb-4 p-4 bg-green-900/50 border border-green-700 rounded-lg">
					<p class="text-green-200">
						Password reset successfully! Redirecting to login...
					</p>
				</div>
			</div>
		{:else}
			<!-- Password reset form -->
			<p class="text-gray-400 text-center mb-6">
				Enter your new password below.
			</p>

			{#if error}
				<div class="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
					{error}
				</div>
			{/if}

			<form onsubmit={handleSubmit}>
				<div class="mb-4">
					<label for="password" class="block text-sm font-medium mb-2 text-gray-300">
						New Password
					</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						required
						minlength="8"
						class="input-field"
						placeholder="At least 8 characters"
						autocomplete="new-password"
					/>
					{#if password && !passwordValid}
						<p class="text-red-400 text-xs mt-1">Password must be at least 8 characters</p>
					{/if}
				</div>

				<div class="mb-6">
					<label for="confirmPassword" class="block text-sm font-medium mb-2 text-gray-300">
						Confirm Password
					</label>
					<input
						type="password"
						id="confirmPassword"
						bind:value={confirmPassword}
						required
						class="input-field"
						placeholder="Confirm your password"
						autocomplete="new-password"
					/>
					{#if confirmPassword && !passwordsMatch}
						<p class="text-red-400 text-xs mt-1">Passwords don't match</p>
					{/if}
				</div>

				<button type="submit" class="w-full btn-primary" disabled={!canSubmit}>
					{loading ? 'Resetting...' : 'Reset Password'}
				</button>
			</form>

			<p class="text-center mt-4">
				<a href="/login" class="text-blue-400 hover:text-blue-300 text-sm">
					Back to login
				</a>
			</p>
		{/if}
	</div>
</div>
