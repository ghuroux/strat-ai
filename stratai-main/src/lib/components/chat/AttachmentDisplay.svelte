<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { FileAttachment } from '$lib/types/chat';

	interface Props {
		attachments: FileAttachment[];
	}

	let { attachments }: Props = $props();

	let expandedId = $state<string | null>(null);

	function formatSize(bytes: number): string {
		if (bytes < 1024) {
			return `${bytes} B`;
		} else if (bytes < 1024 * 1024) {
			return `${(bytes / 1024).toFixed(1)} KB`;
		} else {
			return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		}
	}

	function getFileIcon(mimeType: string): { class: string; path: string } {
		if (mimeType === 'application/pdf' || mimeType === 'application/x-pdf') {
			return {
				class: 'text-red-400',
				path: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
			};
		}
		if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
			return {
				class: 'text-blue-400',
				path: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z'
			};
		}
		if (mimeType === 'application/json') {
			return {
				class: 'text-yellow-400',
				path: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
			};
		}
		return {
			class: 'text-surface-400',
			path: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
		};
	}

	function toggleExpanded(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	function getPreviewContent(content: string): string {
		// Show first 500 chars as preview
		if (content.length <= 500) return content;
		return content.slice(0, 500) + '...';
	}
</script>

{#if attachments.length > 0}
	<div class="attachment-display space-y-2 mb-2">
		{#each attachments as attachment (attachment.id)}
			{@const icon = getFileIcon(attachment.mimeType)}
			{@const isExpanded = expandedId === attachment.id}

			<div class="attachment-item rounded-lg bg-surface-800/50 border border-surface-700 overflow-hidden">
				<!-- Clickable header -->
				<button
					type="button"
					onclick={() => toggleExpanded(attachment.id)}
					class="w-full flex items-center gap-2 px-3 py-2 text-left
						   hover:bg-surface-700/50 transition-colors"
				>
					<!-- File icon -->
					<svg class="w-4 h-4 flex-shrink-0 {icon.class}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icon.path} />
					</svg>

					<!-- Filename -->
					<span class="flex-1 truncate text-sm text-surface-200">
						{attachment.filename}
					</span>

					<!-- Meta info -->
					<span class="text-xs text-surface-500 flex-shrink-0">
						{formatSize(attachment.size)}
						{#if attachment.pageCount}
							<span class="ml-1">({attachment.pageCount} pages)</span>
						{/if}
					</span>

					<!-- Truncation badge -->
					{#if attachment.truncated}
						<span class="text-xs px-1.5 py-0.5 rounded bg-amber-600/20 text-amber-400 flex-shrink-0">
							Truncated
						</span>
					{/if}

					<!-- Expand chevron -->
					<svg
						class="w-4 h-4 text-surface-500 flex-shrink-0 transition-transform duration-200"
						class:rotate-180={isExpanded}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				<!-- Expandable content preview -->
				{#if isExpanded}
					<div
						class="px-3 pb-3 pt-1 border-t border-surface-700"
						transition:slide={{ duration: 200 }}
					>
						<div class="text-xs text-surface-500 mb-1">
							Content preview ({attachment.charCount?.toLocaleString() || attachment.content.length.toLocaleString()} chars)
						</div>
						<pre class="text-xs text-surface-400 whitespace-pre-wrap break-words max-h-48 overflow-y-auto
								   bg-surface-900 rounded p-2 font-mono">{getPreviewContent(attachment.content)}</pre>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
