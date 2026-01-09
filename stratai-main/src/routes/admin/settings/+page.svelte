<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Form state
	let orgName = $state(data.organization?.name || '');
	let orgSlug = $state(data.organization?.slug || '');
	let systemPrompt = $state(data.organization?.systemPrompt || '');
	let isSaving = $state(false);
	let saveMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	const maxPromptLength = 4000;
	let promptLength = $derived(systemPrompt.length);

	async function handleSave() {
		isSaving = true;
		saveMessage = null;

		try {
			const response = await fetch('/api/admin/settings', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: orgName,
					slug: orgSlug,
					systemPrompt
				})
			});

			if (response.ok) {
				saveMessage = { type: 'success', text: 'Settings saved successfully' };
			} else {
				const data = await response.json();
				saveMessage = { type: 'error', text: data.error || 'Failed to save settings' };
			}
		} catch {
			saveMessage = { type: 'error', text: 'Failed to save settings' };
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Settings | Admin | StratAI</title>
</svelte:head>

<div class="settings-page">
	<header class="page-header">
		<h1 class="page-title">Settings</h1>
	</header>

	{#if saveMessage}
		<div class="alert alert-{saveMessage.type}">
			{saveMessage.text}
		</div>
	{/if}

	<!-- Organization Details -->
	<section class="settings-section">
		<h2 class="section-title">Organization Details</h2>

		<div class="form-group">
			<label for="org-name">Organization Name</label>
			<input
				type="text"
				id="org-name"
				bind:value={orgName}
				placeholder="Your Organization"
			/>
		</div>

		<div class="form-group">
			<label for="org-slug">Slug (used in URLs)</label>
			<input
				type="text"
				id="org-slug"
				bind:value={orgSlug}
				placeholder="your-org"
				pattern="[a-z0-9-]+"
			/>
			<span class="input-hint">Lowercase letters, numbers, and hyphens only</span>
		</div>
	</section>

	<!-- System Prompt -->
	<section class="settings-section">
		<h2 class="section-title">Organization System Prompt</h2>
		<p class="section-description">
			This context is included in ALL AI conversations for users in this organization.
			Use it for company-wide instructions, guidelines, and context.
		</p>

		<div class="form-group">
			<textarea
				id="system-prompt"
				bind:value={systemPrompt}
				placeholder="You are an AI assistant for [Your Organization]...

Guidelines:
- Maintain a professional tone
- Follow company policies
- Reference internal documentation when relevant"
				rows="10"
				maxlength={maxPromptLength}
			></textarea>
			<div class="char-count" class:warning={promptLength > maxPromptLength * 0.9}>
				{promptLength.toLocaleString()} / {maxPromptLength.toLocaleString()} characters
			</div>
		</div>
	</section>

	<!-- Default Settings -->
	<section class="settings-section">
		<h2 class="section-title">Default Settings</h2>

		<div class="form-group">
			<label for="default-tier">Default model tier for new users</label>
			<select id="default-tier" disabled>
				<option value="basic">Basic</option>
				<option value="standard" selected>Standard</option>
				<option value="premium">Premium</option>
			</select>
			<span class="input-hint">Coming soon - currently all tiers are available</span>
		</div>
	</section>

	<!-- Save Button -->
	<div class="actions">
		<button class="btn-primary" onclick={handleSave} disabled={isSaving}>
			{#if isSaving}
				Saving...
			{:else}
				Save Changes
			{/if}
		</button>
	</div>
</div>

<style>
	.settings-page {
		max-width: 800px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 1.5rem;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-surface-100);
	}

	.settings-section {
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-800);
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.section-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-surface-100);
		margin-bottom: 0.25rem;
	}

	.section-description {
		font-size: 0.875rem;
		color: var(--color-surface-400);
		margin-bottom: 1.25rem;
		line-height: 1.5;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.375rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-surface-300);
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		color: var(--color-surface-100);
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.form-group input:focus,
	.form-group select:focus,
	.form-group textarea:focus {
		border-color: var(--color-primary-500);
	}

	.form-group input::placeholder,
	.form-group textarea::placeholder {
		color: var(--color-surface-500);
	}

	.form-group textarea {
		resize: vertical;
		min-height: 150px;
		font-family: ui-monospace, monospace;
		line-height: 1.5;
	}

	.form-group select:disabled,
	.form-group input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.input-hint {
		display: block;
		margin-top: 0.375rem;
		font-size: 0.75rem;
		color: var(--color-surface-500);
	}

	.char-count {
		text-align: right;
		margin-top: 0.375rem;
		font-size: 0.75rem;
		color: var(--color-surface-500);
	}

	.char-count.warning {
		color: var(--color-warning-400);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
	}

	.btn-primary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: var(--color-primary-500);
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-primary:hover {
		background: var(--color-primary-600);
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.alert {
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.alert-success {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		color: #86efac;
	}

	.alert-error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #fca5a5;
	}
</style>
