<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { FileAttachment } from '$lib/types/chat';

	interface Props {
		attachments: FileAttachment[];
		onremove?: (id: string) => void;
	}

	let { attachments, onremove }: Props = $props();

	function formatSize(bytes: number): string {
		if (bytes < 1024) {
			return `${bytes} B`;
		} else if (bytes < 1024 * 1024) {
			return `${(bytes / 1024).toFixed(1)} KB`;
		} else {
			return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		}
	}

	function isImageAttachment(attachment: FileAttachment): boolean {
		return attachment.content.type === 'image';
	}

	function getImageDataUrl(attachment: FileAttachment): string | null {
		if (attachment.content.type === 'image') {
			return `data:${attachment.content.mediaType};base64,${attachment.content.data}`;
		}
		return null;
	}

	function getFileIcon(mimeType: string): { class: string; path: string } {
		// Image types
		if (mimeType.startsWith('image/')) {
			return {
				class: 'text-emerald-400',
				path: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
			};
		}
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
		// Default text file icon
		return {
			class: 'text-surface-400',
			path: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
		};
	}
</script>

{#if attachments.length > 0}
	<div class="flex flex-wrap gap-2 mb-2 px-1">
		{#each attachments as attachment (attachment.id)}
			{@const icon = getFileIcon(attachment.mimeType)}
			{@const isImage = isImageAttachment(attachment)}
			{@const imageUrl = getImageDataUrl(attachment)}

			{#if isImage && imageUrl}
				<!-- Image attachment with thumbnail -->
				<div
					class="file-chip relative flex items-center gap-2 pr-3 pl-1 py-1 rounded-lg
						   bg-surface-700 border border-surface-600
						   text-surface-200 text-sm"
					in:fly={{ y: 10, duration: 200 }}
					out:fly={{ y: -10, duration: 150 }}
				>
					<!-- Image thumbnail -->
					<div class="w-10 h-10 rounded overflow-hidden bg-surface-800 flex-shrink-0">
						<img
							src={imageUrl}
							alt={attachment.filename}
							class="w-full h-full object-cover"
						/>
					</div>

					<!-- File info -->
					<div class="flex flex-col min-w-0">
						<span class="truncate max-w-[120px] text-xs" title={attachment.filename}>
							{attachment.filename}
						</span>
						<span class="text-xs text-surface-500">
							{formatSize(attachment.size)}
						</span>
					</div>

					<!-- Remove button -->
					<button
						type="button"
						onclick={() => onremove?.(attachment.id)}
						class="ml-1 p-0.5 rounded hover:bg-surface-600 text-surface-400 hover:text-surface-200
							   transition-colors flex-shrink-0"
						title="Remove attachment"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{:else}
				<!-- Document attachment -->
				<div
					class="file-chip flex items-center gap-2 px-3 py-1.5 rounded-lg
						   bg-surface-700 border border-surface-600
						   text-surface-200 text-sm"
					in:fly={{ y: 10, duration: 200 }}
					out:fly={{ y: -10, duration: 150 }}
				>
					<!-- File type icon -->
					<svg class="w-4 h-4 flex-shrink-0 {icon.class}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icon.path} />
					</svg>

					<!-- Filename -->
					<span class="truncate max-w-[150px]" title={attachment.filename}>
						{attachment.filename}
					</span>

					<!-- Size -->
					<span class="text-xs text-surface-500 flex-shrink-0">
						{formatSize(attachment.size)}
					</span>

					<!-- Truncation indicator -->
					{#if attachment.truncated}
						<span
							class="text-xs px-1.5 py-0.5 rounded bg-amber-600/20 text-amber-400 flex-shrink-0"
							title="Content truncated due to length"
						>
							Truncated
						</span>
					{/if}

					<!-- Remove button -->
					<button
						type="button"
						onclick={() => onremove?.(attachment.id)}
						class="ml-1 p-0.5 rounded hover:bg-surface-600 text-surface-400 hover:text-surface-200
							   transition-colors flex-shrink-0"
						title="Remove attachment"
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}
		{/each}
	</div>
{/if}
