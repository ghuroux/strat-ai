<script lang="ts">
	import {
		extractCodeBlocks,
		downloadCodeBlock,
		downloadAllCodeBlocks,
		generateFilename,
		getLanguageDisplayName,
		type CodeBlock
	} from '$lib/utils/codeBlocks';

	interface Props {
		content: string;
		showDownloadAll?: boolean;
	}

	let { content, showDownloadAll = true }: Props = $props();

	let codeBlocks = $derived(extractCodeBlocks(content));
	let hasMultipleBlocks = $derived(codeBlocks.length > 1);
	let isDownloading = $state(false);

	async function handleDownloadAll() {
		if (codeBlocks.length === 0) return;
		isDownloading = true;
		try {
			await downloadAllCodeBlocks(codeBlocks, 'code-files.zip');
		} finally {
			isDownloading = false;
		}
	}

	function handleDownloadSingle(block: CodeBlock) {
		downloadCodeBlock(block);
	}
</script>

{#if codeBlocks.length > 0}
	<div class="code-block-downloader">
		<!-- Individual code block buttons -->
		<div class="code-blocks-list">
			{#each codeBlocks as block, index (index)}
				{@const filename = generateFilename(block)}
				<button
					type="button"
					onclick={() => handleDownloadSingle(block)}
					class="code-block-item"
					title="Download {filename}"
				>
					<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
					<span class="filename">{filename}</span>
					<span class="language-badge">{getLanguageDisplayName(block.language)}</span>
				</button>
			{/each}
		</div>

		<!-- Download All button -->
		{#if showDownloadAll && hasMultipleBlocks}
			<button
				type="button"
				onclick={handleDownloadAll}
				disabled={isDownloading}
				class="download-all-btn"
			>
				{#if isDownloading}
					<svg class="icon animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<span>Creating ZIP...</span>
				{:else}
					<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<span>Download All ({codeBlocks.length} files)</span>
				{/if}
			</button>
		{/if}
	</div>
{/if}

<style>
	.code-block-downloader {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: var(--surface-800, #1e293b);
		border: 1px solid var(--surface-700, #334155);
		border-radius: 0.5rem;
	}

	.code-blocks-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.code-block-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--surface-700, #334155);
		border: 1px solid var(--surface-600, #475569);
		border-radius: 0.375rem;
		color: var(--surface-200, #e2e8f0);
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.code-block-item:hover {
		background: var(--surface-600, #475569);
		border-color: var(--primary-500, #3b82f6);
		color: var(--primary-300, #93c5fd);
	}

	.icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.filename {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.language-badge {
		padding: 0.125rem 0.375rem;
		background: var(--surface-800, #1e293b);
		border-radius: 0.25rem;
		font-size: 0.6875rem;
		color: var(--surface-400, #94a3b8);
		text-transform: uppercase;
		font-weight: 500;
	}

	.download-all-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: var(--primary-600, #2563eb);
		border: none;
		border-radius: 0.375rem;
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.download-all-btn:hover:not(:disabled) {
		background: var(--primary-500, #3b82f6);
	}

	.download-all-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Light mode overrides */
	:global(html.light) .code-block-downloader {
		background: #f4f4f5;
		border-color: #e4e4e7;
	}

	:global(html.light) .code-block-item {
		background: #e4e4e7;
		border-color: #d4d4d8;
		color: #18181b;
	}

	:global(html.light) .code-block-item:hover {
		background: #d4d4d8;
		color: #2563eb;
	}

	:global(html.light) .language-badge {
		background: #fafafa;
		color: #71717a;
	}
</style>
