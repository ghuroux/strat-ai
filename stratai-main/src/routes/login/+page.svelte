<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	// Svelte 5: Use $props for page data
	let { form, data }: { form: ActionData; data: PageData } = $props();

	// Svelte 5: Use $state for local reactive state
	let loading = $state(false);
	let showPassword = $state(false);

	// Build form action URL, preserving returnUrl if present
	const formAction = data.returnUrl ? `?/default&returnUrl=${encodeURIComponent(data.returnUrl)}` : '';
</script>

<svelte:head>
	<title>Login - StratAI</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="w-full max-w-md p-8 bg-gray-800 rounded-xl shadow-xl">
		<h1 class="text-2xl font-bold text-center mb-2">StratAI</h1>
		<p class="text-gray-400 text-center mb-8">Sign in to continue</p>

		<form
			method="POST"
			action={formAction}
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

			<div class="mb-4">
				<label for="username" class="block text-sm font-medium mb-2 text-gray-300">
					Username or Email
				</label>
				<input
					type="text"
					id="username"
					name="username"
					class="input-field"
					placeholder="username or email (optional for admin)"
					autocomplete="username"
				/>
			</div>

			<div class="mb-6">
				<label for="password" class="block text-sm font-medium mb-2 text-gray-300">
					Password
				</label>
				<div class="relative">
					<input
						type={showPassword ? 'text' : 'password'}
						id="password"
						name="password"
						required
						class="input-field pr-10"
						placeholder="Enter password"
						autocomplete="current-password"
					/>
					<button
						type="button"
						class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
						onclick={() => showPassword = !showPassword}
						aria-label={showPassword ? 'Hide password' : 'Show password'}
					>
						{#if showPassword}
							<!-- Eye-off icon (password visible, click to hide) -->
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
								<line x1="1" y1="1" x2="23" y2="23"/>
							</svg>
						{:else}
							<!-- Eye icon (password hidden, click to show) -->
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
								<circle cx="12" cy="12" r="3"/>
							</svg>
						{/if}
					</button>
				</div>
			</div>

			<button type="submit" class="w-full btn-primary" disabled={loading}>
				{loading ? 'Signing in...' : 'Sign In'}
			</button>

			<div class="flex justify-between items-center mt-4 text-sm">
				<a href="/forgot-password" class="text-blue-400 hover:text-blue-300">
					Forgot password?
				</a>
			</div>
		</form>
	</div>
</div>
