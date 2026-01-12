<script lang="ts">
	import { goto } from '$app/navigation';

	let email = $state('');
	let loading = $state(false);
	let submitted = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;

		try {
			await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			// Always show success (security - don't reveal if email exists)
			submitted = true;
		} catch (err) {
			// Still show success for security
			submitted = true;
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Forgot Password - StratAI</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="w-full max-w-md p-8 bg-gray-800 rounded-xl shadow-xl">
		<h1 class="text-2xl font-bold text-center mb-2">Reset Password</h1>

		{#if submitted}
			<div class="text-center">
				<div class="mb-4 p-4 bg-green-900/50 border border-green-700 rounded-lg">
					<p class="text-green-200">
						If an account exists with that email, you'll receive a password reset link shortly.
					</p>
				</div>
				<p class="text-gray-400 text-sm mb-4">
					Check your email and click the link to reset your password.
				</p>
				<a href="/login" class="text-blue-400 hover:text-blue-300">
					Back to login
				</a>
			</div>
		{:else}
			<p class="text-gray-400 text-center mb-6">
				Enter your email and we'll send you a reset link.
			</p>

			<form onsubmit={handleSubmit}>
				<div class="mb-4">
					<label for="email" class="block text-sm font-medium mb-2 text-gray-300">
						Email Address
					</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						required
						class="input-field"
						placeholder="you@example.com"
						autocomplete="email"
					/>
				</div>

				<button type="submit" class="w-full btn-primary" disabled={loading}>
					{loading ? 'Sending...' : 'Send Reset Link'}
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
