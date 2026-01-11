<script lang="ts">
	const shortcuts = [
		{
			category: 'Navigation',
			items: [
				{ keys: ['Cmd', 'K'], description: 'Open command palette' },
				{ keys: ['Cmd', 'Shift', 'H'], description: 'Go to home page' },
				{ keys: ['Cmd', 'Shift', 'A'], description: 'Open Model Arena' },
				{ keys: ['Esc'], description: 'Close modals & panels' }
			]
		},
		{
			category: 'Chat',
			items: [
				{ keys: ['Cmd', 'N'], description: 'New conversation' },
				{ keys: ['Enter'], description: 'Send message' },
				{ keys: ['Shift', 'Enter'], description: 'New line in message' },
				{ keys: ['Cmd', '\\'], description: 'Toggle sidebar' }
			]
		},
		{
			category: 'Secrets',
			items: [
				{ keys: ['Konami Code'], description: 'Try it and see...' },
				{ keys: ['Cmd', 'K'], description: 'Type "hacker" in command palette' },
				{ keys: ['7x'], description: 'Click the logo rapidly' }
			]
		}
	];
</script>

<div class="settings-section">
	<div class="settings-section-header">
		<h2 class="settings-section-title">Keyboard Shortcuts</h2>
		<p class="settings-section-desc">Navigate the app like a pro with these shortcuts</p>
	</div>

	<div class="shortcuts-list">
		{#each shortcuts as section}
			<div class="shortcut-section">
				<h3 class="shortcut-category">{section.category}</h3>
				<div class="shortcut-items">
					{#each section.items as shortcut}
						<div class="shortcut-item">
							<span class="shortcut-description">{shortcut.description}</span>
							<div class="shortcut-keys">
								{#each shortcut.keys as key}
									<kbd class="key">{key}</kbd>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<div class="tips-section">
		<h3 class="tips-title">Tips</h3>
		<ul class="tips-list">
			<li>Press <kbd class="inline-key">?</kbd> anywhere to show the shortcuts modal</li>
			<li>The command palette (<kbd class="inline-key">Cmd+K</kbd>) lets you quickly navigate and search</li>
			<li>On Windows/Linux, use <kbd class="inline-key">Ctrl</kbd> instead of <kbd class="inline-key">Cmd</kbd></li>
		</ul>
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

	.shortcuts-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.shortcut-section {
		/* Section spacing */
	}

	.shortcut-category {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-surface-500);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.shortcut-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.shortcut-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: rgb(var(--color-surface-800) / 0.5);
		border-radius: 0.5rem;
		transition: background 0.15s ease;
	}

	.shortcut-item:hover {
		background: rgb(var(--color-surface-800));
	}

	.shortcut-description {
		font-size: 0.875rem;
		color: var(--color-surface-300);
	}

	.shortcut-keys {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.key {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.75rem;
		padding: 0.25rem 0.5rem;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, 'Cascadia Code', monospace;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-surface-200);
		background: var(--color-surface-700);
		border: 1px solid var(--color-surface-600);
		border-radius: 0.375rem;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.tips-section {
		margin-top: 2rem;
		padding: 1rem;
		background: rgb(var(--color-surface-800) / 0.3);
		border-radius: 0.75rem;
		border: 1px solid rgb(var(--color-surface-700) / 0.5);
	}

	.tips-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-surface-300);
		margin-bottom: 0.75rem;
	}

	.tips-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.tips-list li {
		font-size: 0.8125rem;
		color: var(--color-surface-400);
		padding-left: 1rem;
		position: relative;
	}

	.tips-list li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--color-surface-600);
	}

	.inline-key {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.125rem 0.375rem;
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, monospace;
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--color-surface-300);
		background: var(--color-surface-700);
		border: 1px solid var(--color-surface-600);
		border-radius: 0.25rem;
		vertical-align: baseline;
	}
</style>
