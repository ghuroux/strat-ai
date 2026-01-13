<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Form state
	let orgName = $state(data.organization?.name || '');
	let orgSlug = $state(data.organization?.slug || '');
	let orgIcon = $state(data.organization?.icon || '');
	let systemPrompt = $state(data.organization?.systemPrompt || '');
	let isSaving = $state(false);
	let saveMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let showIconPicker = $state(false);

	const maxPromptLength = 4000;
	let promptLength = $derived(systemPrompt.length);

	// SVG icon options for organizations
	// Each has a name and SVG path data
	const iconOptions: { name: string; label: string; path: string }[] = [
		{ name: 'building', label: 'Building', path: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21' },
		{ name: 'globe', label: 'Globe', path: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418' },
		{ name: 'rocket', label: 'Rocket', path: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z' },
		{ name: 'star', label: 'Star', path: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z' },
		{ name: 'chart', label: 'Chart', path: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
		{ name: 'briefcase', label: 'Briefcase', path: 'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0' },
		{ name: 'lightbulb', label: 'Lightbulb', path: 'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18' },
		{ name: 'users', label: 'Users', path: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
		{ name: 'cog', label: 'Settings', path: 'M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495' },
		{ name: 'cube', label: 'Cube', path: 'm21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9' },
		{ name: 'puzzle', label: 'Puzzle', path: 'M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z' },
		{ name: 'target', label: 'Target', path: 'M12 12m-1.5 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0 -3 0M12 12m-5.5 0a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0 -11 0M12 12m-9.5 0a9.5 9.5 0 1 0 19 0 9.5 9.5 0 1 0 -19 0' }
	];

	function selectIcon(iconName: string) {
		orgIcon = iconName;
		showIconPicker = false;
	}

	function clearIcon() {
		orgIcon = '';
		showIconPicker = false;
	}

	function getIconPath(iconName: string): string {
		return iconOptions.find(i => i.name === iconName)?.path || '';
	}

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
					icon: orgIcon,
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

		<div class="form-group">
			<label>Organization Icon</label>
			<div class="icon-picker-wrapper">
				<button
					type="button"
					class="icon-preview"
					onclick={() => showIconPicker = !showIconPicker}
				>
					{#if orgIcon && getIconPath(orgIcon)}
						<span class="icon-svg">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d={getIconPath(orgIcon)} />
							</svg>
						</span>
					{:else}
						<span class="icon-placeholder">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
							</svg>
						</span>
					{/if}
					<span class="icon-label">{orgIcon ? 'Change icon' : 'Add icon'}</span>
				</button>

				{#if showIconPicker}
					<div class="icon-picker-dropdown">
						<div class="icon-picker-header">
							<span>Choose an icon</span>
							{#if orgIcon}
								<button type="button" class="clear-icon" onclick={clearIcon}>
									Remove
								</button>
							{/if}
						</div>
						<div class="icon-grid">
							{#each iconOptions as icon}
								<button
									type="button"
									class="icon-option"
									class:selected={orgIcon === icon.name}
									onclick={() => selectIcon(icon.name)}
									title={icon.label}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
										<path stroke-linecap="round" stroke-linejoin="round" d={icon.path} />
									</svg>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
			<span class="input-hint">Displayed in the space picker and dashboard</span>
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

	/* Icon Picker Styles */
	.icon-picker-wrapper {
		position: relative;
	}

	.icon-preview {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: border-color 0.15s ease;
	}

	.icon-preview:hover {
		border-color: var(--color-surface-600);
	}

	.icon-svg,
	.icon-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: var(--color-surface-700);
		border-radius: 0.375rem;
	}

	.icon-svg {
		color: var(--color-primary-400);
	}

	.icon-placeholder {
		color: var(--color-surface-500);
	}

	.icon-svg svg,
	.icon-placeholder svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.icon-label {
		font-size: 0.875rem;
		color: var(--color-surface-300);
	}

	.icon-picker-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		z-index: 50;
		width: 320px;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-700);
		border-radius: 0.75rem;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
		overflow: hidden;
	}

	.icon-picker-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-surface-700);
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-surface-300);
	}

	.clear-icon {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		color: var(--color-surface-400);
		background: transparent;
		border: 1px solid var(--color-surface-600);
		border-radius: 0.25rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.clear-icon:hover {
		color: #fca5a5;
		border-color: #fca5a5;
	}

	.icon-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.375rem;
		padding: 0.75rem;
		max-height: 200px;
		overflow-y: auto;
	}

	.icon-option {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		aspect-ratio: 1;
		padding: 0.5rem;
		background: var(--color-surface-700);
		border: 2px solid transparent;
		border-radius: 0.5rem;
		color: var(--color-surface-300);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.icon-option:hover {
		background: var(--color-surface-600);
		color: var(--color-surface-100);
	}

	.icon-option.selected {
		background: color-mix(in srgb, var(--color-primary-500) 20%, transparent);
		border-color: var(--color-primary-500);
		color: var(--color-primary-400);
	}

	.icon-option svg {
		width: 1.25rem;
		height: 1.25rem;
	}
</style>
