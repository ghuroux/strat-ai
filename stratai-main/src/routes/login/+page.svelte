<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	// Svelte 5: Use $props for page data
	let { form }: { form: ActionData } = $props();

	// Svelte 5: Use $state for local reactive state
	let loading = $state(false);
</script>

<svelte:head>
	<title>Login - StratHost Chat</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="w-full max-w-md p-8 bg-gray-800 rounded-xl shadow-xl">
		<h1 class="text-2xl font-bold text-center mb-2">StratHost Chat</h1>
		<p class="text-gray-400 text-center mb-8">Sign in to continue</p>

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			{#if form?.error}
				<div class="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
					{form.error}
				</div>
			{/if}

			<div class="mb-6">
				<label for="password" class="block text-sm font-medium mb-2 text-gray-300">
					Password
				</label>
				<input
					type="password"
					id="password"
					name="password"
					required
					class="input-field"
					placeholder="Enter admin password"
					autocomplete="current-password"
				/>
			</div>

			<button type="submit" class="w-full btn-primary" disabled={loading}>
				{loading ? 'Signing in...' : 'Sign In'}
			</button>
		</form>
	</div>
</div>
